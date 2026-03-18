var path = require('path');

var readJson = require('./jsonStore').readJson;
var writeJson = require('./jsonStore').writeJson;

var DELIVERY_FILE_PATH = path.join(__dirname, '../../data/notification-deliveries.json');

function readDeliveries() {
  return readJson(DELIVERY_FILE_PATH, []);
}

function writeDeliveries(deliveries) {
  writeJson(DELIVERY_FILE_PATH, deliveries);
}

function getByQueueJobId(queueJobId) {
  var deliveries = readDeliveries();
  return deliveries.find(function(item) {
    return item.queueJobId === queueJobId;
  }) || null;
}

function upsertQueued(input) {
  var deliveries = readDeliveries();
  var now = new Date().toISOString();

  var existingIndex = deliveries.findIndex(function(item) {
    return item.queueJobId === input.queueJobId;
  });

  var base = {
    queueJobId: input.queueJobId,
    eventType: input.eventType,
    userId: input.userId,
    destination: input.destination,
    status: 'queued',
    providerStatus: null,
    providerMessageId: null,
    errorCode: null,
    errorMessage: null,
    attempts: input.attempts,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata || {}
  };

  if (existingIndex >= 0) {
    var previous = deliveries[existingIndex];
    deliveries[existingIndex] = {
      queueJobId: previous.queueJobId,
      eventType: previous.eventType,
      userId: previous.userId,
      destination: previous.destination,
      status: 'queued',
      providerStatus: previous.providerStatus,
      providerMessageId: previous.providerMessageId,
      errorCode: null,
      errorMessage: null,
      attempts: input.attempts,
      createdAt: previous.createdAt,
      updatedAt: now,
      metadata: previous.metadata || base.metadata
    };
  } else {
    deliveries.push(base);
  }

  writeDeliveries(deliveries);
}

function markBlocked(queueJobId, reason, attempts) {
  updateByQueueJobId(queueJobId, {
    status: 'blocked',
    errorCode: reason,
    attempts: attempts
  });
}

function markSent(queueJobId, providerMessageId, attempts) {
  updateByQueueJobId(queueJobId, {
    status: 'sent',
    providerStatus: 'accepted',
    providerMessageId: providerMessageId || null,
    errorCode: null,
    errorMessage: null,
    attempts: attempts
  });
}

function markFailed(queueJobId, errorCode, errorMessage, attempts) {
  updateByQueueJobId(queueJobId, {
    status: 'failed',
    errorCode: errorCode,
    errorMessage: errorMessage,
    attempts: attempts
  });
}

function updateByQueueJobId(queueJobId, patch) {
  var deliveries = readDeliveries();
  var index = deliveries.findIndex(function(item) {
    return item.queueJobId === queueJobId;
  });

  if (index < 0) {
    return null;
  }

  deliveries[index] = Object.assign({}, deliveries[index], patch, {
    updatedAt: new Date().toISOString()
  });

  writeDeliveries(deliveries);
  return deliveries[index];
}

function updateByProviderMessageId(providerMessageId, patch) {
  var deliveries = readDeliveries();
  var index = deliveries.findIndex(function(item) {
    return item.providerMessageId === providerMessageId;
  });

  if (index < 0) {
    return null;
  }

  deliveries[index] = Object.assign({}, deliveries[index], patch, {
    updatedAt: new Date().toISOString()
  });

  writeDeliveries(deliveries);
  return deliveries[index];
}

module.exports = {
  getByQueueJobId: getByQueueJobId,
  upsertQueued: upsertQueued,
  markBlocked: markBlocked,
  markSent: markSent,
  markFailed: markFailed,
  updateByProviderMessageId: updateByProviderMessageId
};
