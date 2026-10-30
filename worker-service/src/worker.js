require('dotenv').config();
const workerQueueClient = require('./config/mq');
const logger = require('./utils/logger');
const { EVENT_TYPES } = require('../../common/models/constants');

async function handleMessage(message, channel) {
  if (!message) return;

  try {
    const rawContent = message.content.toString();
    const payload = JSON.parse(rawContent);

    if (payload.event_type === EVENT_TYPES.TASK_CREATED) {
      const taskId = payload.task_id || (payload.data && payload.data.task_id);
      const userId = payload.assigned_to_user_id || (payload.data && payload.data.assigned_to_user_id);

      // Requirement 13 & 14: Emit structured JSON log
      logger.info('New task assigned', {
        task_id: taskId,
        user_id: userId,
        event_id: payload.event_id,
        title: payload.title || (payload.data && payload.data.title)
      });
    } else if (payload.event_type === EVENT_TYPES.TASK_UPDATED) {
      const taskId = payload.task_id || (payload.data && payload.data.task_id);
      const newStatus = payload.new_status || (payload.data && payload.data.new_status);

      // Requirement 13 & 14: Emit structured JSON log
      logger.info('Task status updated', {
        task_id: taskId,
        new_status: newStatus,
        event_id: payload.event_id
      });
    } else {
      logger.warn('Unknown event type received', {
        event_type: payload.event_type,
        event_id: payload.event_id
      });
    }

    // Acknowledge the message so it is removed from the queue
    if (channel && typeof channel.ack === 'function') {
      channel.ack(message);
    }
  } catch (error) {
    logger.error(`Failed to process message: ${error.message}`, {
      rawContent: message.content ? message.content.toString() : null
    });

    if (channel && typeof channel.nack === 'function') {
      // Discard malformed message to prevent infinite poison loops
      channel.nack(message, false, false);
    }
  }
}

async function startWorker() {
  try {
    logger.info('Starting Background Worker Service...');

    const { channel, queue } = await workerQueueClient.connectAndSetup();

    logger.info('Worker actively listening for task events on queue', { queue });

    channel.consume(queue, async (message) => {
      await handleMessage(message, channel);
    }, {
      noAck: false
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully stopping Worker Service...`);
      try {
        await workerQueueClient.close();
        logger.info('Worker Service terminated cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during worker shutdown', { error: err.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Fatal error in Background Worker Service', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
}

if (require.main === module) {
  startWorker();
}

module.exports = {
  startWorker,
  handleMessage
};
