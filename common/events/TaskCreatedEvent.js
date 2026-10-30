const BaseEvent = require('./BaseEvent');
const { EVENT_TYPES } = require('../models/constants');

class TaskCreatedEvent extends BaseEvent {
  constructor({ taskId, title, assignedToUserId, taskData = {} }) {
    super(EVENT_TYPES.TASK_CREATED, {
      task_id: taskId,
      title,
      assigned_to_user_id: assignedToUserId,
      ...taskData
    });
    this.task_id = taskId;
    this.title = title;
    this.assigned_to_user_id = assignedToUserId;
  }

  toJSON() {
    return {
      event_id: this.event_id,
      event_type: this.event_type,
      timestamp: this.timestamp,
      task_id: this.task_id,
      title: this.title,
      assigned_to_user_id: this.assigned_to_user_id,
      data: this.data
    };
  }
}

module.exports = TaskCreatedEvent;
