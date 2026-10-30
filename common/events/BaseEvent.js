const { randomUUID } = require('crypto');

class BaseEvent {
  constructor(eventType, data = {}) {
    this.event_id = randomUUID();
    this.event_type = eventType;
    this.timestamp = new Date().toISOString();
    this.data = data;
  }

  toJSON() {
    return {
      event_id: this.event_id,
      event_type: this.event_type,
      timestamp: this.timestamp,
      data: this.data
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

module.exports = BaseEvent;
