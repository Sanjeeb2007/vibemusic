const path = require('path');

module.exports = {
  API_URL: 'https://musicvibe.zeabur.app',
  PORT: process.env.PORT || 3000, 
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  isDev: false,
};