class Logger {
  constructor(serviceName = 'api-service') {
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
        errorCode: message.errorCode,
        ...meta
      });
    } else {
      this._log('error', message, meta);
    }
  }

  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      this._log('debug', message, meta);
    }
  }
}

module.exports = new Logger(process.env.SERVICE_NAME || 'api-service');
module.exports.Logger = Logger;
