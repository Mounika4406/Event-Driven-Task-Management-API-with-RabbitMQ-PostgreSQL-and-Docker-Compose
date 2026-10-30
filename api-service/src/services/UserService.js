const UserRepository = require('../repositories/UserRepository');
const { validateUserCreate, parsePaginationParams } = require('../utils/validator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class UserService {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async createUser(payload) {
    const validatedData = validateUserCreate(payload);
    logger.info('Creating new user', { username: validatedData.username, email: validatedData.email });
    const user = await this.userRepository.create(validatedData);
    logger.info('User created successfully', { userId: user.id, username: user.username });
    return user;
  }

  async getUserById(id) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new ValidationError("User ID must be a valid positive integer.");
    }

    const user = await this.userRepository.findById(numId);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }
    return user;
  }

  async getUsers(query = {}) {
    const { page, limit, offset } = parsePaginationParams(query);
    const { users, total } = await this.userRepository.findAll({ limit, offset });
    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages
      }
    };
  }
}

module.exports = UserService;
