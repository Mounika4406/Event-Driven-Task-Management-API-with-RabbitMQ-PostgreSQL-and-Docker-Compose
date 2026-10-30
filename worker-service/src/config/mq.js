const amqp = require('amqplib');
const logger = require('../utils/logger');
const { QUEUE_CONFIG } = require('../../../common/models/constants');

class WorkerQueueClient {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  getMqUrl() {
    const user = encodeURIComponent(process.env.MQ_USER || 'guest');
    const password = encodeURIComponent(process.env.MQ_PASSWORD || 'guest');
    const host = process.env.MQ_HOST || 'message_queue';
    const port = process.env.MQ_PORT || '5672';
    return `amqp://${user}:${password}@${host}:${port}`;
  }

  async connectAndSetup(maxRetries = 15, delayMs = 3000) {
    const mqUrl = this.getMqUrl();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Worker attempting RabbitMQ connection (attempt ${attempt}/${maxRetries})...`);
        this.connection = await amqp.connect(mqUrl);

        this.connection.on('error', (err) => {
          logger.error('RabbitMQ connection error in worker', { error: err.message });
          this.channel = null;
          this.connection = null;
        });

        this.connection.on('close', () => {
          logger.warn('RabbitMQ connection closed in worker');
          this.channel = null;
          this.connection = null;
        });

        this.channel = await this.connection.createChannel();

        // 1. Assert Topic Exchange
        await this.channel.assertExchange(QUEUE_CONFIG.EXCHANGE_NAME, QUEUE_CONFIG.EXCHANGE_TYPE, {
          durable: true
        });

        // 2. Assert Durable Queue
        const q = await this.channel.assertQueue(QUEUE_CONFIG.QUEUE_NAME, {
          durable: true
        });

        // 3. Bind Queue to routing keys (task.created, task.updated, and wildcard task.*)
        await this.channel.bindQueue(q.queue, QUEUE_CONFIG.EXCHANGE_NAME, QUEUE_CONFIG.ROUTING_KEY_CREATED);
        await this.channel.bindQueue(q.queue, QUEUE_CONFIG.EXCHANGE_NAME, QUEUE_CONFIG.ROUTING_KEY_UPDATED);
        await this.channel.bindQueue(q.queue, QUEUE_CONFIG.EXCHANGE_NAME, QUEUE_CONFIG.ROUTING_KEY_ALL);

        // Fair dispatch: process 1 unacknowledged message at a time
        await this.channel.prefetch(1);

        logger.info('Worker successfully connected to RabbitMQ, declared queue, and bound routing keys', {
          exchange: QUEUE_CONFIG.EXCHANGE_NAME,
          queue: QUEUE_CONFIG.QUEUE_NAME,
          routingKeys: [QUEUE_CONFIG.ROUTING_KEY_CREATED, QUEUE_CONFIG.ROUTING_KEY_UPDATED]
        });

        return { channel: this.channel, queue: q.queue };
      } catch (err) {
        logger.warn(`Worker RabbitMQ connection failed on attempt ${attempt}: ${err.message}`);
        if (attempt === maxRetries) {
          throw new Error(`Worker could not connect to RabbitMQ after ${maxRetries} attempts: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('Worker RabbitMQ connection closed cleanly');
    } catch (err) {
      logger.warn('Error while closing Worker RabbitMQ connection', { error: err.message });
    }
  }
}

const workerQueueClient = new WorkerQueueClient();
module.exports = workerQueueClient;
module.exports.WorkerQueueClient = WorkerQueueClient;
