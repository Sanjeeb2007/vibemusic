const youtubeService = require('../services/youtubeService');

// Run cleanup every 30 minutes
setInterval(() => {
  // Run in next tick to avoid blocking
  setImmediate(() => {
    youtubeService.cleanupOldFiles(1).catch(console.error);
  });
}, 30 * 60 * 1000);

console.log('⏰ Cleanup scheduler started (30min intervals)');