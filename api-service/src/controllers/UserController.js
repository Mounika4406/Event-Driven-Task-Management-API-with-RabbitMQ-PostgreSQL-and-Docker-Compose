const UserService = require('../services/UserService');

class UserController {
  constructor(userService = new UserService()) {
    this.userService = userService;
  }

  create = async (req, res, next) => {
    try {
      const user = await this.userService.createUser(req.body);
      return res.status(201).json(user.toJSON ? user.toJSON() : user);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      return res.status(200).json(user.toJSON ? user.toJSON() : user);
    } catch (err) {
      next(err);
    }
  };

  list = async (req, res, next) => {
    try {
      const result = await this.userService.getUsers(req.query);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = UserController;
