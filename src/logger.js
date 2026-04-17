export const logger = {
  info(message, meta = {}) {
    log('INFO', message, meta);
  },
  warn(message, meta = {}) {
    log('WARN', message, meta);
  },
  error(message, meta = {}) {
    log('ERROR', message, meta);
  },
  debug(message, meta = {}) {
    if (process.env.LOG_LEVEL === 'debug') {
      log('DEBUG', message, meta);
    }
  }
};

function log(level, message, meta) {
  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(payload));
}
