// src/config.js
const os = require('os');
const path = require('path');

// Get your local IP address automatically
const getLocalIp = () => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (error) {
    console.log('Could not detect IP, using localhost');
  }
  return 'localhost';
};

module.exports = {
  // Use environment variable, or auto-detect IP, or fallback to localhost
  API_URL: process.env.API_URL || `http://${getLocalIp()}:3000`,
  PORT: process.env.PORT || 3000,
  UPLOAD_DIR: path.join(__dirname, '../uploads'),
  
  // For debugging
  isDev: process.env.NODE_ENV !== 'production',
};