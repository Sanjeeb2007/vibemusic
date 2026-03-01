const path = require('path');

module.exports = {
  // In production, use environment variable or default to 0.0.0.0
  API_URL: process.env.API_URL || (process.env.NODE_ENV === 'production' 
    ? 'https://musicvibe.zeabur.app'  // Your actual live URL
    : `http://localhost:${process.env.PORT || 3000}`),
  
  PORT: process.env.PORT || 3000,
  
  UPLOAD_DIR: path.join(__dirname, '../uploads'),
  
  // For debugging
  isDev: process.env.NODE_ENV !== 'production',
};