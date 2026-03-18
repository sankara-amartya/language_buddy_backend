var timingSafeEqual = require('crypto').timingSafeEqual;

function secureTokenEqual(expected, actual) {
  var expectedBuffer = Buffer.from(expected || '');
  var actualBuffer = Buffer.from(actual || '');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function notificationAuth(req, res, next) {
  var authHeader = req.get('authorization') || '';
  var token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  var expected = process.env.NOTIFICATION_AUTH_TOKEN || '';

  if (!expected) {
    return res.status(500).json({
      error: 'notification_auth_not_configured',
      requestId: req.requestId || null
    });
  }

  if (!token || !secureTokenEqual(expected, token)) {
    return res.status(401).json({
      error: 'unauthorized',
      requestId: req.requestId || null
    });
  }

  next();
}

module.exports = notificationAuth;
