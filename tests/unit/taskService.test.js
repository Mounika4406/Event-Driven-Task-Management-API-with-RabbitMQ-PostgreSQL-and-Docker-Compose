const TaskService = require('../../api-service/src/services/TaskService');
const { NotFoundError, ValidationError } = require('../../api-service/src/utils/errors');
const { EVENT_TYPES, QUEUE_CONFIG } = require('../../common/models/constants');

describe('Unit Tests: TaskService', () => {
  let mockTaskRepo;
  let mockMq;
  let taskService;

  beforeEach(() => {
    mockTaskRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };
    mockMq = {
      publish: jest.fn().mockResolvedValue(true)
    };
    taskService = new TaskService(mockTaskRepo, mockMq);
  });

  describe('createTask', () => {
    test('should persist task and publish TaskCreatedEvent', async () => {
      const payload = {
        title: 'Implement unit testing',
        description: 'Write comprehensive tests',
        status: 'pending',
        assigned_to: 2
      };
      const createdTask = {
        id: 10,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        assigned_to_user_id: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockTaskRepo.create.mockResolvedValue(createdTask);

      const result = await taskService.createTask(payload, 'user-123');

      expect(mockTaskRepo.create).toHaveBeenCalledWith({
        title: 'Implement unit testing',
        description: 'Write comprehensive tests',
        status: 'pending',
        assigned_to_user_id: 2
      });

      expect(mockMq.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, eventPayload] = mockMq.publish.mock.calls[0];

      expect(exchange).toBe(QUEUE_CONFIG.EXCHANGE_NAME);
      expect(routingKey).toBe(QUEUE_CONFIG.ROUTING_KEY_CREATED);
      expect(eventPayload.event_type).toBe(EVENT_TYPES.TASK_CREATED);
      expect(eventPayload.task_id).toBe(10);
      expect(eventPayload.title).toBe('Implement unit testing');
      expect(eventPayload.assigned_to_user_id).toBe(2);
      expect(eventPayload.timestamp).toBeDefined();

      expect(result).toEqual(createdTask);
    });

    test('should reject invalid input without calling repository', async () => {
      await expect(taskService.createTask({ title: 'Abc' }, 'user-123')).rejects.toThrow(ValidationError);
      expect(mockTaskRepo.create).not.toHaveBeenCalled();
      expect(mockMq.publish).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    test('should update task and publish TaskUpdatedEvent', async () => {
      const existingTask = {
        id: 10,
        title: 'Original Title',
        description: 'Desc',
        status: 'pending',
        assigned_to_user_id: 2
      };
      const updatedTask = {
        ...existingTask,
        status: 'completed',
        updated_at: new Date().toISOString()
      };

      mockTaskRepo.findById.mockResolvedValue(existingTask);
      mockTaskRepo.update.mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(10, { status: 'completed' }, 'user-123');

      expect(mockTaskRepo.findById).toHaveBeenCalledWith(10);
      expect(mockTaskRepo.update).toHaveBeenCalledWith(10, { status: 'completed' });

      expect(mockMq.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, eventPayload] = mockMq.publish.mock.calls[0];

      expect(exchange).toBe(QUEUE_CONFIG.EXCHANGE_NAME);
      expect(routingKey).toBe(QUEUE_CONFIG.ROUTING_KEY_UPDATED);
      expect(eventPayload.event_type).toBe(EVENT_TYPES.TASK_UPDATED);
      expect(eventPayload.task_id).toBe(10);
      expect(eventPayload.new_status).toBe('completed');
      expect(eventPayload.timestamp).toBeDefined();

      expect(result).toEqual(updatedTask);
    });

    test('should throw NotFoundError if task does not exist', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(taskService.updateTask(999, { status: 'completed' }, 'user-123')).rejects.toThrow(NotFoundError);
      expect(mockTaskRepo.update).not.toHaveBeenCalled();
      expect(mockMq.publish).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    test('should delete task when exists', async () => {
      mockTaskRepo.findById.mockResolvedValue({ id: 5 });
      mockTaskRepo.delete.mockResolvedValue(true);

      const result = await taskService.deleteTask(5, 'user-123');
      expect(result).toBe(true);
      expect(mockTaskRepo.delete).toHaveBeenCalledWith(5);
    });

    test('should throw NotFoundError if task to delete does not exist', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(taskService.deleteTask(999, 'user-123')).rejects.toThrow(NotFoundError);
      expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTasks', () => {
    test('should filter by status and assigned_to', async () => {
      mockTaskRepo.findAll.mockResolvedValue({ tasks: [], total: 0 });

      const query = { status: 'in-progress', assigned_to: '3', page: '2', limit: '5' };
      await taskService.getTasks(query);

      expect(mockTaskRepo.findAll).toHaveBeenCalledWith({
        status: 'in-progress',
        assigned_to: 3,
        limit: 5,
        offset: 5
      });
    });

    test('should throw ValidationError on invalid status filter', async () => {
      await expect(taskService.getTasks({ status: 'unknown' })).rejects.toThrow(ValidationError);
    });
  });
});
