const TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed'
});

const VALID_TASK_STATUSES = Object.values(TASK_STATUS);

const EVENT_TYPES = Object.freeze({
  TASK_CREATED: 'TaskCreatedEvent',
  TASK_UPDATED: 'TaskUpdatedEvent'
});

const QUEUE_CONFIG = Object.freeze({
  EXCHANGE_NAME: 'task_events_exchange',
  EXCHANGE_TYPE: 'topic',
  QUEUE_NAME: 'task_events_queue',
  ROUTING_KEY_CREATED: 'task.created',
  ROUTING_KEY_UPDATED: 'task.updated',
  ROUTING_KEY_ALL: 'task.*'
});

module.exports = {
  TASK_STATUS,
  VALID_TASK_STATUSES,
  EVENT_TYPES,
  QUEUE_CONFIG
};
