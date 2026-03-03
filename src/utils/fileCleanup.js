// src/utils/fileCleanup.js
const ytDlpService = require('../services/ytDlpService'); // Fixed import name

setInterval(async () => {
  console.log('🧹 Running scheduled cleanup...');
  await ytDlpService.cleanupOldFiles(1);
}, 60 * 60 * 1000);

console.log('⏰ Cleanup scheduler started');