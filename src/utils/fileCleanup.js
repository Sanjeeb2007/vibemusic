// src/utils/fileCleanup.js - This is our cleaning service!
const youtubeService = require('../services/youtubeService');

// Run cleanup every hour
setInterval(async () => {
  console.log('🧹 Running scheduled cleanup...');
  await youtubeService.cleanupOldFiles(24); // Remove files older than 24 hours
}, 60 * 60 * 1000); // Every hour

console.log('⏰ Cleanup scheduler started');