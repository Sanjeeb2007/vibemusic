// Change this:
setInterval(() => {
  setImmediate(() => {
    youtubeService.cleanupOldFiles(1).catch(console.error);
  });
}, 30 * 60 * 1000);

// To this:
setInterval(() => {
  setImmediate(() => {
    youtubeService.cleanupOldFiles(2).catch(console.error);
  });
}, 2 * 60 * 60 * 1000); // every 2 hours