const request = require('supertest');
const createApp = require('../../api-service/src/app');
const UserService = require('../../api-service/src/services/UserService');
const TaskService = require('../../api-service/src/services/TaskService');
const { InMemoryUserRepository, InMemoryTaskRepository } = require('../mockDatabase');

describe('Integration Tests: API HTTP Lifecycle & Endpoints', () => {
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

    // Seed 3 test users
    await userRepo.create({ username: 'alice', email: 'alice@example.com' });
    await userRepo.create({ username: 'bob', email: 'bob@example.com' });
    await userRepo.create({ username: 'charlie', email: 'charlie@example.com' });
  });

  describe('User Endpoints', () => {
    test('POST /api/users should create user and return 201', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'diana', email: 'diana@example.com' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.username).toBe('diana');
      expect(res.body.email).toBe('diana@example.com');
      expect(res.body).toHaveProperty('created_at');
    });

    test('POST /api/users should return 400 with standardized error on validation failure', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'ab', email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error_code: 'VALIDATION_FAILED',
        message: expect.stringContaining('username')
      });
    });

    test('POST /api/users should return 409 Conflict when username or email already exists', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'alice', email: 'different@example.com' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error_code: 'RESOURCE_CONFLICT',
        message: expect.any(String)
      });
    });

    test('GET /api/users should support pagination and return user list', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        total_pages: 2
      });
    });

    test('GET /api/users/:id should return 200 for existing user and 404 for non-existent', async () => {
      const foundRes = await request(app).get('/api/users/1');
      expect(foundRes.status).toBe(200);
      expect(foundRes.body.username).toBe('alice');

      const notFoundRes = await request(app).get('/api/users/999');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body).toEqual({
        error_code: 'NOT_FOUND',
        message: expect.stringContaining('999')
      });
    });
  });

  describe('Task Authorization (X-User-ID)', () => {
    test('POST /api/tasks without X-User-ID should return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Important Task', assigned_to: 1 });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error_code: 'UNAUTHORIZED',
        message: expect.any(String)
      });
    });

    test('PUT /api/tasks/:id without X-User-ID should return 401 Unauthorized', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .send({ status: 'completed' });

      expect(res.status).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    test('DELETE /api/tasks/:id without X-User-ID should return 401 Unauthorized', async () => {
      const res = await request(app).delete('/api/tasks/1');

      expect(res.status).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });
  });

  describe('Task Endpoints', () => {
    test('POST /api/tasks should create task and return 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({
          title: 'Implement Event Bus',
          description: 'RabbitMQ integration',
          status: 'pending',
          assigned_to: 1
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Implement Event Bus');
      expect(res.body.status).toBe('pending');
      expect(res.body.assigned_to_user_id).toBe(1);
    });

    test('POST /api/tasks should return 400 when assigned user does not exist', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({
          title: 'Implement Event Bus',
          assigned_to: 999
        });

      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('VALIDATION_FAILED');
    });

    test('GET /api/tasks should support filtering and pagination', async () => {
      // Create tasks
      await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Task One Pending', status: 'pending', assigned_to: 1 });

      await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Task Two In Progress', status: 'in-progress', assigned_to: 1 });

      await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Task Three Pending', status: 'pending', assigned_to: 2 });

      // Filter by status=pending
      const pendingRes = await request(app).get('/api/tasks?status=pending');
      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.data.length).toBe(2);
      expect(pendingRes.body.data.every((t) => t.status === 'pending')).toBe(true);

      // Filter by assigned_to=2
      const assignedRes = await request(app).get('/api/tasks?assigned_to=2');
      expect(assignedRes.status).toBe(200);
      expect(assignedRes.body.data.length).toBe(1);
      expect(assignedRes.body.data[0].assigned_to_user_id).toBe(2);
    });

    test('GET /api/tasks/:id should return 200 when found and 404 when not found', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Find Me Task', assigned_to: 1 });

      const taskId = createRes.body.id;

      const getRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.title).toBe('Find Me Task');

      const notFoundRes = await request(app).get('/api/tasks/8888');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error_code).toBe('NOT_FOUND');
    });

    test('PUT /api/tasks/:id should update task and return 200', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Task To Update', status: 'pending', assigned_to: 1 });

      const taskId = createRes.body.id;

      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('X-User-ID', '1')
        .send({ status: 'completed' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe('completed');
    });

    test('DELETE /api/tasks/:id should remove task and return 204 No Content', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('X-User-ID', '1')
        .send({ title: 'Task To Delete', assigned_to: 1 });

      const taskId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('X-User-ID', '1');

      expect(deleteRes.status).toBe(204);
      expect(deleteRes.body).toEqual({});

      // Verify task no longer exists
      const getRes = await request(app).get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(404);
    });
  });
});
