var express = require('express');
var router = express.Router();
var findUserById = require('../services/notifications/userRepository').findUserById;
var upsertUser = require('../services/notifications/userRepository').upsertUser;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/:id', function(req, res) {
  var user = findUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: 'user_not_found'
    });
  }

  return res.json(user);
});

router.post('/upsert', function(req, res) {
  var body = req.body || {};

  if (!body.id) {
    return res.status(400).json({
      error: 'missing_id'
    });
  }

  var user = upsertUser({
    id: body.id,
    name: body.name || null,
    phoneE164: body.phoneE164 || null,
    whatsappOptIn: body.whatsappOptIn === true,
    whatsappOptInAt: body.whatsappOptInAt || null
  });

  return res.status(200).json({
    status: 'ok',
    user: user
  });
});

module.exports = router;
