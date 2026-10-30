const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'database',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'taskadmin',
      password: process.env.DB_PASSWORD || 'secretpassword',
      database: process.env.DB_NAME || 'task_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', { error: err.message });
    });
  }
  return pool;
}

async function query(text, params) {
  const currentPool = getPool();
  return currentPool.query(text, params);
}

async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting database connection (attempt ${attempt}/${maxRetries})...`);
      const currentPool = getPool();
      const client = await currentPool.connect();
      const res = await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection successfully established', { serverTime: res.rows[0].now });
      return currentPool;
    } catch (err) {
      logger.warn(`Database connection failed on attempt ${attempt}: ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Could not connect to database after ${maxRetries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

module.exports = {
  getPool,
  query,
  connectWithRetry,
  close
};
