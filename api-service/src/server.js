require('dotenv').config();
const createApp = require('./app');
const db = require('./config/db');
const mqClient = require('./config/mq');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3000', 10);

async function startServer() {
  try {
    logger.info('Initializing API Service...');

    // Connect to database with retry mechanism
    await db.connectWithRetry();

    // Connect to RabbitMQ message broker with retry mechanism
    await mqClient.connectWithRetry();

    const app = createApp();

    const server = app.listen(PORT, () => {
      logger.info(`API Service is up and listening on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development'
      });
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully shutting down API service...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await mqClient.close();
          await db.close();
          logger.info('API Service terminated cleanly.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown', { error: err.message });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to initialize API Service', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
