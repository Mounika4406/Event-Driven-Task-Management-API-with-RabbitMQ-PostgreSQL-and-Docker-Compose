const TaskService = require('../services/TaskService');

class TaskController {
  constructor(taskService = new TaskService()) {
    this.taskService = taskService;
  }

  create = async (req, res, next) => {
    try {
      const task = await this.taskService.createTask(req.body, req.userId);
      return res.status(201).json(task.toJSON ? task.toJSON() : task);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const task = await this.taskService.getTaskById(req.params.id);
      return res.status(200).json(task.toJSON ? task.toJSON() : task);
    } catch (err) {
      next(err);
    }
  };

  list = async (req, res, next) => {
    try {
      const result = await this.taskService.getTasks(req.query);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const task = await this.taskService.updateTask(req.params.id, req.body, req.userId);
      return res.status(200).json(task.toJSON ? task.toJSON() : task);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.taskService.deleteTask(req.params.id, req.userId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = TaskController;
