var fs = require('fs');
var path = require('path');

function ensureJsonFile(filePath, defaultValue) {
  var dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson(filePath, defaultValue) {
  ensureJsonFile(filePath, defaultValue);

  var raw = fs.readFileSync(filePath, 'utf8');
  return raw ? JSON.parse(raw) : defaultValue;
}

function writeJson(filePath, value) {
  ensureJsonFile(filePath, value);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = {
  readJson: readJson,
  writeJson: writeJson,
  ensureJsonFile: ensureJsonFile
};
