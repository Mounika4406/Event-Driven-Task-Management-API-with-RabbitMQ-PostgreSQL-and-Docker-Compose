const amqp = require('amqplib');
const logger = require('../utils/logger');
const { QUEUE_CONFIG } = require('../../../common/models/constants');

class MessageQueueClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
  }

  getMqUrl() {
    const user = encodeURIComponent(process.env.MQ_USER || 'guest');
    const password = encodeURIComponent(process.env.MQ_PASSWORD || 'guest');
    const host = process.env.MQ_HOST || 'message_queue';
    const port = process.env.MQ_PORT || '5672';
    return `amqp://${user}:${password}@${host}:${port}`;
  }

  async connectWithRetry(maxRetries = 10, delayMs = 3000) {
    if (this.channel) {
      return this.channel;
    }

    const mqUrl = this.getMqUrl();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting RabbitMQ connection (attempt ${attempt}/${maxRetries})...`);
        this.connection = await amqp.connect(mqUrl);

        this.connection.on('error', (err) => {
          logger.error('RabbitMQ connection error occurred', { error: err.message });
          this.channel = null;
          this.connection = null;
        });

        this.connection.on('close', () => {
          logger.warn('RabbitMQ connection closed');
          this.channel = null;
          this.connection = null;
        });

        this.channel = await this.connection.createChannel();

        // Assert the events exchange
        await this.channel.assertExchange(QUEUE_CONFIG.EXCHANGE_NAME, QUEUE_CONFIG.EXCHANGE_TYPE, {
          durable: true
        });

        logger.info('Connected to RabbitMQ and asserted exchange successfully', {
          exchange: QUEUE_CONFIG.EXCHANGE_NAME,
          type: QUEUE_CONFIG.EXCHANGE_TYPE
        });

        return this.channel;
      } catch (err) {
        logger.warn(`RabbitMQ connection failed on attempt ${attempt}: ${err.message}`);
        if (attempt === maxRetries) {
          throw new Error(`Could not connect to RabbitMQ after ${maxRetries} attempts: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async publish(exchange, routingKey, payload) {
    try {
      if (!this.channel) {
        await this.connectWithRetry(3, 1000);
      }

      const content = Buffer.from(JSON.stringify(payload));
      const published = this.channel.publish(exchange, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now()
      });

      logger.info('Event published to message queue', {
        exchange,
        routing_key: routingKey,
        event_type: payload.event_type,
        event_id: payload.event_id
      });

      return published;
    } catch (err) {
      logger.error('Failed to publish message to queue', {
        exchange,
        routingKey,
        error: err.message
      });
      throw err;
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
      logger.info('RabbitMQ connection closed cleanly');
    } catch (err) {
      logger.warn('Error while closing RabbitMQ connection', { error: err.message });
    }
  }
}

const mqClient = new MessageQueueClient();
module.exports = mqClient;
module.exports.MessageQueueClient = MessageQueueClient;
