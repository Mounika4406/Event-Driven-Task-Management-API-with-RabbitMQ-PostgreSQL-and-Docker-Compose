const BaseEvent = require('./BaseEvent');
const { EVENT_TYPES } = require('../models/constants');

class TaskUpdatedEvent extends BaseEvent {
  constructor({ taskId, newStatus, taskData = {} }) {
    super(EVENT_TYPES.TASK_UPDATED, {
      task_id: taskId,
      new_status: newStatus,
      ...taskData
    });
    this.task_id = taskId;
    this.new_status = newStatus;
  }

  toJSON() {
    return {
      event_id: this.event_id,
      event_type: this.event_type,
      timestamp: this.timestamp,
      task_id: this.task_id,
      new_status: this.new_status,
      data: this.data
    };
  }
}

module.exports = TaskUpdatedEvent;
