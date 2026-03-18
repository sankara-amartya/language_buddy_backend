var path = require('path');

var readJson = require('./jsonStore').readJson;
var writeJson = require('./jsonStore').writeJson;

var USERS_FILE_PATH = path.join(__dirname, '../../data/users.json');

function readUsers() {
  return readJson(USERS_FILE_PATH, []);
}

function writeUsers(users) {
  writeJson(USERS_FILE_PATH, users);
}

function findUserById(userId) {
  var users = readUsers();

  var user = users.find(function(item) {
    return item.id === userId;
  });

  if (user) {
    return user;
  }

  if (userId === 'system-admin' && process.env.ALERT_ADMIN_PHONE_E164) {
    return {
      id: 'system-admin',
      name: 'System Admin',
      phoneE164: process.env.ALERT_ADMIN_PHONE_E164,
      whatsappOptIn: true,
      whatsappOptInAt: new Date().toISOString()
    };
  }

  return null;
}

function upsertUser(input) {
  var users = readUsers();

  var existingIndex = users.findIndex(function(item) {
    return item.id === input.id;
  });

  var normalized = {
    id: input.id,
    name: input.name || null,
    phoneE164: input.phoneE164 || null,
    whatsappOptIn: input.whatsappOptIn === true,
    whatsappOptInAt: input.whatsappOptIn === true
      ? (input.whatsappOptInAt || new Date().toISOString())
      : null
  };

  if (existingIndex >= 0) {
    users[existingIndex] = normalized;
  } else {
    users.push(normalized);
  }

  writeUsers(users);
  return normalized;
}

module.exports = {
  findUserById: findUserById,
  upsertUser: upsertUser
};
