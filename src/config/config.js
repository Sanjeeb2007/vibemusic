const path = require('path');

module.exports = {
  API_URL: 'https://musicvibe.zeabur.app',
  PORT: 8080,  // Force 8080
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  isDev: false,
};