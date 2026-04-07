// vibemusic-backend/src/utils/fileCleanup.js
const youtubeService = require("../services/youtubeService");

// Run cleanup every 2 hours with 2-hour retention policy
console.log("🧹 Initializing automatic file cleanup...");

setInterval(
  () => {
    setImmediate(() => {
      console.log("🧹 Running scheduled file cleanup...");
      youtubeService.cleanupOldFiles(2).catch(err => {
        console.error("❌ Cleanup error:", err.message);
      });
    });
  },
  2 * 60 * 60 * 1000,
);

// Run once immediately on startup
setTimeout(() => {
  youtubeService.cleanupOldFiles(2).catch(err => {
    console.error("❌ Initial cleanup error:", err.message);
  });
}, 5000);
