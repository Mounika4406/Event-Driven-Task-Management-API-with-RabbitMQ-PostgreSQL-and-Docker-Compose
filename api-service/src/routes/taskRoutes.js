const express = require('express');
const TaskController = require('../controllers/TaskController');
const { requireAuth } = require('../middleware/auth');

function createTaskRouter(taskController = new TaskController()) {
  const router = express.Router();

  // GET /api/tasks - List tasks with pagination and filters
  router.get('/', taskController.list);

  // GET /api/tasks/:id - Retrieve task by ID
  router.get('/:id', taskController.getById);

  // POST /api/tasks - Create task (Protected via X-User-ID)
  router.post('/', requireAuth, taskController.create);

  // PUT /api/tasks/:id - Update task (Protected via X-User-ID)
  router.put('/:id', requireAuth, taskController.update);

  // DELETE /api/tasks/:id - Delete task (Protected via X-User-ID)
  router.delete('/:id', requireAuth, taskController.delete);

  return router;
}

module.exports = createTaskRouter;
