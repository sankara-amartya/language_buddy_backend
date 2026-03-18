var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var notificationsRouter = require('./routes/notifications');
var webhooksRouter = require('./routes/webhooks');
var healthRouter = require('./routes/health');
var requestContext = require('./middleware/requestContext');
var buildBackendErrorPayload = require('./services/notifications/dispatcher').buildBackendErrorPayload;
var publishNotification = require('./services/notifications/dispatcher').publishNotification;
var log = require('./services/notifications/logger');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(requestContext);
logger.token('request-id', function(req) {
  return req.requestId || '-';
});
app.use(logger(':method :url :status :response-time ms req_id=:request-id'));
app.use(express.json({
  verify: function(req, res, buf) {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/health', healthRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/notifications', notificationsRouter);
app.use('/webhooks', webhooksRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if ((err.status || 500) >= 500 && process.env.ENABLE_ERROR_NOTIFICATIONS === 'true') {
    var payload = buildBackendErrorPayload(err, req);

    if (payload) {
      publishNotification(payload).catch(function(notificationError) {
        log.error('notification.enqueue.backend_error_failed', {
          requestId: req.requestId || null,
          message: notificationError.message
        });
      });
    }
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
