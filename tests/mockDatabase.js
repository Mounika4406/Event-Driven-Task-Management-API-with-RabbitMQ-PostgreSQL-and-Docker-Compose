const { ConflictError, ValidationError, NotFoundError } = require('../api-service/src/utils/errors');

class InMemoryUserRepository {
  constructor() {
    this.users = [];
    this.nextId = 1;
  }

  async create({ username, email }) {
    const existing = this.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      throw new ConflictError('A user with the specified username or email already exists.');
    }
    const user = {
      id: this.nextId++,
      username,
      email,
      created_at: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  async findById(id) {
    const user = this.users.find((u) => u.id === Number(id));
    return user || null;
  }

  async findByUsername(username) {
    const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    return user || null;
  }

  async findByEmail(email) {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async findAll({ limit = 10, offset = 0 } = {}) {
    const total = this.users.length;
    const users = this.users.slice(offset, offset + limit);
    return { users, total };
  }
}

class InMemoryTaskRepository {
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.tasks = [];
    this.nextId = 1;
  }

  async create({ title, description, status, assigned_to_user_id }) {
    const user = await this.userRepository.findById(assigned_to_user_id);
    if (!user) {
      throw new ValidationError(`Assigned user with ID ${assigned_to_user_id} does not exist.`);
    }

    const task = {
      id: this.nextId++,
      title,
      description: description || null,
      status: status || 'pending',
      assigned_to_user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.push(task);
    return task;
  }

  async findById(taskId) {
    const task = this.tasks.find((t) => t.id === Number(taskId));
    return task || null;
  }

  async update(taskId, updateData) {
    const task = this.tasks.find((t) => t.id === Number(taskId));
    if (!task) {
      return null;
    }

    if (updateData.assigned_to_user_id !== undefined) {
      const user = await this.userRepository.findById(updateData.assigned_to_user_id);
      if (!user) {
        throw new ValidationError(`Assigned user with ID ${updateData.assigned_to_user_id} does not exist.`);
      }
      task.assigned_to_user_id = updateData.assigned_to_user_id;
    }

    if (updateData.title !== undefined) task.title = updateData.title;
    if (updateData.description !== undefined) task.description = updateData.description;
    if (updateData.status !== undefined) task.status = updateData.status;

    task.updated_at = new Date().toISOString();
    return task;
  }

  async delete(taskId) {
    const index = this.tasks.findIndex((t) => t.id === Number(taskId));
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    return true;
  }

  async findAll({ status, assigned_to, limit = 10, offset = 0 } = {}) {
    let filtered = [...this.tasks];

    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (assigned_to !== undefined && assigned_to !== null) {
      filtered = filtered.filter((t) => t.assigned_to_user_id === Number(assigned_to));
    }

    const total = filtered.length;
    const tasks = filtered.slice(offset, offset + limit);
    return { tasks, total };
  }
}

module.exports = {
  InMemoryUserRepository,
  InMemoryTaskRepository
};
