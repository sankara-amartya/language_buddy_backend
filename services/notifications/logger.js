function baseLog(level, message, meta) {
  var payload = {
    ts: new Date().toISOString(),
    level: level,
    message: message,
    meta: meta || {}
  };

  var line = JSON.stringify(payload);

  if (level === 'error' || level === 'warn') {
    console.error(line);
    return;
  }

  console.log(line);
}

function info(message, meta) {
  baseLog('info', message, meta);
}

function warn(message, meta) {
  baseLog('warn', message, meta);
}

function error(message, meta) {
  baseLog('error', message, meta);
}

module.exports = {
  info: info,
  warn: warn,
  error: error
};
