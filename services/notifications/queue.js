var Queue = require('bullmq').Queue;
var QueueEvents = require('bullmq').QueueEvents;
var IORedis = require('ioredis');

var QUEUE_NAME = 'notifications';

function createNotificationQueue(config) {
  var connection = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  var queue = new Queue(QUEUE_NAME, {
    connection: connection,
    defaultJobOptions: {
      attempts: config.behavior.retryAttempts,
      backoff: {
        type: 'exponential',
        delay: config.behavior.backoffMs
      },
      removeOnComplete: 100,
      removeOnFail: false
    }
  });

  var queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: connection
  });

  async function enqueueNotification(payload) {
    var jobOptions = {};

    if (payload.idempotencyKey) {
      jobOptions.jobId = payload.idempotencyKey;
    }

    return queue.add('send-notification', payload, jobOptions);
  }

  async function close() {
    await queue.close();
    await queueEvents.close();
    await connection.quit();
  }

  return {
    queue: queue,
    queueEvents: queueEvents,
    enqueueNotification: enqueueNotification,
    close: close
  };
}

module.exports = {
  QUEUE_NAME: QUEUE_NAME,
  createNotificationQueue: createNotificationQueue
};
