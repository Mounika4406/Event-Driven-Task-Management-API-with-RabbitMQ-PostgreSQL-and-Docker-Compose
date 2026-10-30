const express = require('express');
const UserController = require('../controllers/UserController');

function createUserRouter(userController = new UserController()) {
  const router = express.Router();

  // POST /api/users - Create a new user
  router.post('/', userController.create);

  // GET /api/users - List users with pagination (?page=1&limit=10)
  router.get('/', userController.list);

  // GET /api/users/:id - Retrieve user by ID
  router.get('/:id', userController.getById);

  return router;
}

module.exports = createUserRouter;
