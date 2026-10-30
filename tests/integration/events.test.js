const request = require('supertest');
const createApp = require('../../api-service/src/app');
const UserService = require('../../api-service/src/services/UserService');
const TaskService = require('../../api-service/src/services/TaskService');
const { InMemoryUserRepository, InMemoryTaskRepository } = require('../mockDatabase');
const { handleMessage } = require('../../worker-service/src/worker');
const workerLogger = require('../../worker-service/src/utils/logger');
const { EVENT_TYPES, QUEUE_CONFIG } = require('../../common/models/constants');

describe('Integration Tests: Event-Driven Architecture (Producer & Consumer)', () => {
  let app;
  let userRepo;
  let taskRepo;
  let mockMq;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    taskRepo = new InMemoryTaskRepository(userRepo);

    mockMq = {
      publish: jest.fn().mockResolvedValue(true)
    };

    const userService = new UserService(userRepo);
    const taskService = new TaskService(taskRepo, mockMq);

    app = createApp({ userService, taskService });

    // Seed test user
    await userRepo.create({ username: 'eventuser', email: 'eventuser@example.com' });
  });

  describe('API as Event Producer', () => {
    test('POST /api/tasks should publish TaskCreatedEvent to message queue', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({
          title: 'Asynchronous Task Creation',
          description: 'Testing event publication on queue',
          status: 'pending',
          assigned_to: 1
        });

      expect(res.status).toBe(201);
      const createdTaskId = res.body.id;

      // Assert publish was invoked on the message broker
      expect(mockMq.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, payload] = mockMq.publish.mock.calls[0];

      expect(exchange).toBe(QUEUE_CONFIG.EXCHANGE_NAME);
      expect(routingKey).toBe(QUEUE_CONFIG.ROUTING_KEY_CREATED);

      // Verify payload schema
      expect(payload.event_type).toBe(EVENT_TYPES.TASK_CREATED);
      expect(payload.task_id).toBe(createdTaskId);
      expect(payload.title).toBe('Asynchronous Task Creation');
      expect(payload.assigned_to_user_id).toBe(1);
      expect(payload.timestamp).toBeDefined();
      expect(payload.event_id).toBeDefined();
    });

    test('PUT /api/tasks/:id should publish TaskUpdatedEvent to message queue', async () => {
      // Create task first
      const createRes = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({
          title: 'Task For State Transition',
          status: 'pending',
          assigned_to: 1
        });

      const taskId = createRes.body.id;
      mockMq.publish.mockClear();

      // Update task status
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('X-User-ID', '1')
        .send({ status: 'completed' });

      expect(updateRes.status).toBe(200);

      // Assert publish was invoked for update
      expect(mockMq.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, payload] = mockMq.publish.mock.calls[0];

      expect(exchange).toBe(QUEUE_CONFIG.EXCHANGE_NAME);
      expect(routingKey).toBe(QUEUE_CONFIG.ROUTING_KEY_UPDATED);

      // Verify payload schema
      expect(payload.event_type).toBe(EVENT_TYPES.TASK_UPDATED);
      expect(payload.task_id).toBe(taskId);
      expect(payload.new_status).toBe('completed');
      expect(payload.timestamp).toBeDefined();
      expect(payload.event_id).toBeDefined();
    });
  });

  describe('Worker as Event Consumer', () => {
    let mockChannel;
    let loggerInfoSpy;
    let loggerErrorSpy;

    beforeEach(() => {
      mockChannel = {
        ack: jest.fn(),
        nack: jest.fn()
      };
      loggerInfoSpy = jest.spyOn(workerLogger, 'info').mockImplementation(() => {});
      loggerErrorSpy = jest.spyOn(workerLogger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    test('should consume TaskCreatedEvent, emit structured log, and acknowledge message', async () => {
      const eventPayload = {
        event_id: 'evt-001',
        event_type: EVENT_TYPES.TASK_CREATED,
        timestamp: new Date().toISOString(),
        task_id: 101,
        title: 'Background Process Task',
        assigned_to_user_id: 42
      };

      const rawMessage = {
        content: Buffer.from(JSON.stringify(eventPayload))
      };

      await handleMessage(rawMessage, mockChannel);

      // Verify structured logger received correct fields
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        'New task assigned',
        expect.objectContaining({
          task_id: 101,
          user_id: 42,
          event_id: 'evt-001'
        })
      );

      // Verify message was acknowledged
      expect(mockChannel.ack).toHaveBeenCalledWith(rawMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    test('should consume TaskUpdatedEvent, emit structured log, and acknowledge message', async () => {
      const eventPayload = {
        event_id: 'evt-002',
        event_type: EVENT_TYPES.TASK_UPDATED,
        timestamp: new Date().toISOString(),
        task_id: 101,
        new_status: 'completed'
      };

      const rawMessage = {
        content: Buffer.from(JSON.stringify(eventPayload))
      };

      await handleMessage(rawMessage, mockChannel);

      expect(loggerInfoSpy).toHaveBeenCalledWith(
        'Task status updated',
        expect.objectContaining({
          task_id: 101,
          new_status: 'completed',
          event_id: 'evt-002'
        })
      );

      expect(mockChannel.ack).toHaveBeenCalledWith(rawMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    test('should handle corrupted JSON gracefully and reject message with nack', async () => {
      const corruptedMessage = {
        content: Buffer.from('NOT_VALID_JSON{{{')
      };

      await handleMessage(corruptedMessage, mockChannel);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(corruptedMessage, false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });
  });
});
