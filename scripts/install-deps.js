// const { exec } = require('child_process');
// const util = require('util');
// const execPromise = util.promisify(exec);
// const fs = require('fs-extra');
// const path = require('path');

// async function installDependencies() {
//   console.log('📦 Installing yt-dlp...');
  
//   const binDir = path.join(__dirname, '../bin');
//   await fs.ensureDir(binDir);
  
//   const ytDlpPath = path.join(binDir, 'yt-dlp');
  
//   try {
//     // Download yt-dlp binary
//     console.log('⬇️ Downloading yt-dlp...');
//     await execPromise(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${ytDlpPath}`);
//     await execPromise(`chmod +x ${ytDlpPath}`);
    
//     // Test it
//     const { stdout } = await execPromise(`${ytDlpPath} --version`);
//     console.log(`✅ yt-dlp installed: ${stdout.trim()}`);
    
//   } catch (error) {
//     console.error('❌ Failed to install yt-dlp:', error.message);
//     console.log('⚠️ Will try to use system yt-dlp if available');
//   }
// }

// installDependencies().catch(console.error);