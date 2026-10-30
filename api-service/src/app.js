const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const createUserRouter = require('./routes/userRoutes');
const createTaskRouter = require('./routes/taskRoutes');
const UserController = require('./controllers/UserController');
const TaskController = require('./controllers/TaskController');
const db = require('./config/db');
const mqClient = require('./config/mq');

function createApp({ userService, taskService } = {}) {
  const app = express();

  // Core middlewares
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Healthcheck endpoint for Docker Compose and monitoring
  app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let mqStatus = 'disconnected';

    try {
      if (db.getPool()) {
        await db.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (e) {
      dbStatus = 'unhealthy: ' + e.message;
    }

    if (mqClient.channel) {
      mqStatus = 'connected';
    }

    const isHealthy = dbStatus === 'connected';
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DOWN',
      service: 'api-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        message_queue: mqStatus
      }
    });
  });

  // API Routes
  const userController = userService ? new UserController(userService) : new UserController();
  const taskController = taskService ? new TaskController(taskService) : new TaskController();

  app.use('/api/users', createUserRouter(userController));
  app.use('/api/tasks', createTaskRouter(taskController));

  // 404 & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
