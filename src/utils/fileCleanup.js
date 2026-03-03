const youtubeService = require('../services/youtubeService');

// Run cleanup every 30 minutes
setInterval(async () => {
  console.log('🧹 Running scheduled cleanup...');
  await youtubeService.cleanupOldFiles(1);
}, 30 * 60 * 1000);

console.log('⏰ Cleanup scheduler started (30min intervals)');