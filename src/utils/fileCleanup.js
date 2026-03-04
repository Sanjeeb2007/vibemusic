// Change this:
setInterval(
  () => {
    setImmediate(() => {
      const youtubeService = require("../services/youtubeService");
      youtubeService.cleanupOldFiles(1).catch(console.error);
    });
  },
  30 * 60 * 1000,
);

// To this:
setInterval(
  () => {
    setImmediate(() => {
      const youtubeService = require("../services/youtubeService");
      youtubeService.cleanupOldFiles(2).catch(console.error);
    });
  },
  2 * 60 * 60 * 1000,
); // every 2 hours
