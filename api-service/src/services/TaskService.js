const TaskRepository = require('../repositories/TaskRepository');
const mqClient = require('../config/mq');
const { validateTaskCreate, validateTaskUpdate, parsePaginationParams } = require('../utils/validator');
const { NotFoundError, ValidationError } = require('../utils/errors');
const TaskCreatedEvent = require('../../../common/events/TaskCreatedEvent');
const TaskUpdatedEvent = require('../../../common/events/TaskUpdatedEvent');
const { QUEUE_CONFIG, VALID_TASK_STATUSES } = require('../../../common/models/constants');
const logger = require('../utils/logger');

class TaskService {
  constructor(taskRepository = new TaskRepository(), messageQueue = mqClient) {
    this.taskRepository = taskRepository;
    this.mq = messageQueue;
  }

  async createTask(payload, requestingUserId) {
    const validatedData = validateTaskCreate(payload);

    logger.info('Creating task in database', {
      title: validatedData.title,
      assigned_to_user_id: validatedData.assigned_to_user_id,
      requesting_user_id: requestingUserId
    });

    const newTask = await this.taskRepository.create(validatedData);

    // Asynchronously publish TaskCreatedEvent
    try {
      const event = new TaskCreatedEvent({
        taskId: newTask.id,
        title: newTask.title,
        assignedToUserId: newTask.assigned_to_user_id,
        taskData: {
          description: newTask.description,
          status: newTask.status
        }
      });

      await this.mq.publish(
        QUEUE_CONFIG.EXCHANGE_NAME,
        QUEUE_CONFIG.ROUTING_KEY_CREATED,
        event.toJSON()
      );
    } catch (err) {
      logger.error('Failed to publish TaskCreatedEvent to message queue', {
        taskId: newTask.id,
        error: err.message
      });
      // In enterprise systems, event publishing can use an outbox pattern;
      // here we log the error and allow the HTTP response to succeed
    }

    return newTask;
  }

  async updateTask(taskId, payload, requestingUserId) {
    const numId = Number(taskId);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new ValidationError("Task ID must be a valid positive integer.");
    }

    const validatedData = validateTaskUpdate(payload);

    // Check if task exists before updating
    const existingTask = await this.taskRepository.findById(numId);
    if (!existingTask) {
      throw new NotFoundError(`Task with ID ${taskId} not found.`);
    }

    logger.info('Updating task in database', {
      taskId: numId,
      updates: validatedData,
      requesting_user_id: requestingUserId
    });

    const updatedTask = await this.taskRepository.update(numId, validatedData);

    // Asynchronously publish TaskUpdatedEvent
    try {
      const event = new TaskUpdatedEvent({
        taskId: updatedTask.id,
        newStatus: updatedTask.status,
        taskData: {
          title: updatedTask.title,
          assigned_to_user_id: updatedTask.assigned_to_user_id
        }
      });

      await this.mq.publish(
        QUEUE_CONFIG.EXCHANGE_NAME,
        QUEUE_CONFIG.ROUTING_KEY_UPDATED,
        event.toJSON()
      );
    } catch (err) {
      logger.error('Failed to publish TaskUpdatedEvent to message queue', {
        taskId: updatedTask.id,
        error: err.message
      });
    }

    return updatedTask;
  }

  async deleteTask(taskId, requestingUserId) {
    const numId = Number(taskId);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new ValidationError("Task ID must be a valid positive integer.");
    }

    const existingTask = await this.taskRepository.findById(numId);
    if (!existingTask) {
      throw new NotFoundError(`Task with ID ${taskId} not found.`);
    }

    logger.info('Deleting task', { taskId: numId, requesting_user_id: requestingUserId });
    await this.taskRepository.delete(numId);
    return true;
  }

  async getTaskById(taskId) {
    const numId = Number(taskId);
    if (!Number.isInteger(numId) || numId <= 0) {
      throw new ValidationError("Task ID must be a valid positive integer.");
    }

    const task = await this.taskRepository.findById(numId);
    if (!task) {
      throw new NotFoundError(`Task with ID ${taskId} not found.`);
    }
    return task;
  }

  async getTasks(query = {}) {
    const { page, limit, offset } = parsePaginationParams(query);

    let statusFilter = null;
    if (query.status) {
      const sanitizedStatus = query.status.trim().toLowerCase();
      if (!VALID_TASK_STATUSES.includes(sanitizedStatus)) {
        throw new ValidationError(`Filter 'status' must be one of: ${VALID_TASK_STATUSES.join(', ')}.`);
      }
      statusFilter = sanitizedStatus;
    }

    let assignedToFilter = null;
    const rawAssignedTo = query.assigned_to !== undefined ? query.assigned_to : query.assigned_to_user_id;
    if (rawAssignedTo !== undefined) {
      const numAssigned = Number(rawAssignedTo);
      if (!Number.isInteger(numAssigned) || numAssigned <= 0) {
        throw new ValidationError("Filter 'assigned_to' must be a valid positive integer.");
      }
      assignedToFilter = numAssigned;
    }

    const { tasks, total } = await this.taskRepository.findAll({
      status: statusFilter,
      assigned_to: assignedToFilter,
      limit,
      offset
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages
      }
    };
  }
}

module.exports = TaskService;
