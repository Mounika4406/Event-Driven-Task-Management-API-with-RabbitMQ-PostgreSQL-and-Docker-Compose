class Logger {
  constructor(serviceName = 'worker-service') {
    this.serviceName = serviceName;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta
    };
    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  info(message, meta) {
    this._log('info', message, meta);
  }

  warn(message, meta) {
    this._log('warn', message, meta);
  }

  error(message, meta) {
    if (message instanceof Error) {
      this._log('error', message.message, {
        stack: message.stack,
        ...meta
      });
    } else {
      this._log('error', message, meta);
    }
  }
}

module.exports = new Logger(process.env.SERVICE_NAME || 'worker-service');
module.exports.Logger = Logger;
