var randomUUID = require('crypto').randomUUID;

function requestContext(req, res, next) {
  var headerId = req.get('x-request-id');
  var requestId = headerId || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}

module.exports = requestContext;
