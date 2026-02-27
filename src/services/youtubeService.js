// // src/services/youtubeService.js - This is our YouTube chef!
// const ytdl = require('@distube/ytdl-core');
// const fs = require('fs-extra');
// const path = require('path');
// const ffmpeg = require('fluent-ffmpeg');
// const ffmpegStatic = require('ffmpeg-static');
// const { v4: uuidv4 } = require('uuid');

// // Tell ffmpeg where to find the conversion tool
// ffmpeg.setFfmpegPath(ffmpegStatic);

// class YouTubeService {
//   constructor() {
//     // Our kitchen folders
//     this.downloadsDir = path.join(__dirname, '../../downloads');
//     this.uploadsDir = path.join(__dirname, '../../uploads');
    
//     // Create folders if they don't exist
//     this.ensureDirectories();
//   }

//   // Make sure our kitchen has all needed folders
//   async ensureDirectories() {
//     await fs.ensureDir(this.downloadsDir);
//     await fs.ensureDir(this.uploadsDir);
//     console.log('📁 Kitchen folders ready!');
//   }

//   // Get video information (like reading the recipe)
//   async getVideoInfo(url) {
//     try {
//       console.log('📖 Getting video info for:', url);
      
//       // Validate URL
//       if (!ytdl.validateURL(url)) {
//         throw new Error('Invalid YouTube URL');
//       }

//       // Get video info from YouTube
//       const info = await ytdl.getInfo(url);
      
//       // Find the best audio format
//       const audioFormat = ytdl.chooseFormat(info.formats, { 
//         quality: 'highestaudio',
//         filter: 'audioonly'
//       });

//       return {
//         title: info.videoDetails.title,
//         duration: parseInt(info.videoDetails.lengthSeconds),
//         author: info.videoDetails.author.name,
//         thumbnail: info.videoDetails.thumbnails.pop().url,
//         audioUrl: audioFormat.url,
//         videoId: info.videoDetails.videoId,
//       };
//     } catch (error) {
//       console.error('❌ Failed to get video info:', error);
//       throw error;
//     }
//   }

//   // Download and convert to MP3 (cook the recipe!)
//   async downloadAsMp3(url, options = {}) {
//     const {
//       quality = 'highestaudio', // Audio quality
//       format = 'mp3',            // Output format
//     } = options;

//     // Create unique IDs for this order
//     const orderId = uuidv4();
//     const videoId = ytdl.getURLVideoID(url);
    
//     // File paths
//     const tempVideoPath = path.join(this.downloadsDir, `${orderId}_${videoId}.mp4`);
//     const outputPath = path.join(this.uploadsDir, `${orderId}_${videoId}.mp3`);

//     console.log('🎵 Starting download for order:', orderId);

//     try {
//       // Validate URL
//       if (!ytdl.validateURL(url)) {
//         throw new Error('Invalid YouTube URL');
//       }

//       // STEP 1: Download video from YouTube
//       console.log('⬇️ Downloading video...');
//       const videoStream = ytdl(url, { 
//         quality: quality,
//         filter: 'audioandvideo' 
//       });

//       // Save video to temp file
//       await new Promise((resolve, reject) => {
//         const writeStream = fs.createWriteStream(tempVideoPath);
//         videoStream.pipe(writeStream);
        
//         videoStream.on('end', resolve);
//         videoStream.on('error', reject);
//       });

//       console.log('✅ Video downloaded');

//       // STEP 2: Convert to MP3
//       console.log('🔄 Converting to MP3...');
//       await new Promise((resolve, reject) => {
//         ffmpeg(tempVideoPath)
//           .toFormat('mp3')
//           .on('end', resolve)
//           .on('error', reject)
//           .save(outputPath);
//       });

//       console.log('✅ Conversion complete');

//       // STEP 3: Clean up temp file
//       await fs.remove(tempVideoPath);
//       console.log('🧹 Cleaned up temp files');

//       // Get file size
//       const stats = await fs.stat(outputPath);
      
//       return {
//         success: true,
//         filePath: outputPath,
//         fileName: path.basename(outputPath),
//         fileSize: stats.size,
//         orderId,
//         videoId,
//       };

//     } catch (error) {
//       console.error('❌ Download failed:', error);
      
//       // Clean up on error
//       try {
//         await fs.remove(tempVideoPath);
//         await fs.remove(outputPath);
//       } catch (cleanupError) {
//         console.error('Cleanup failed:', cleanupError);
//       }
      
//       throw error;
//     }
//   }

//   // Clean up old files (like closing the kitchen at night)
//   async cleanupOldFiles(maxAgeHours = 24) {
//     try {
//       const files = await fs.readdir(this.uploadsDir);
//       const now = Date.now();
      
//       for (const file of files) {
//         const filePath = path.join(this.uploadsDir, file);
//         const stats = await fs.stat(filePath);
//         const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60); // Age in hours
        
//         if (fileAge > maxAgeHours) {
//           await fs.remove(filePath);
//           console.log('🧹 Removed old file:', file);
//         }
//       }
//     } catch (error) {
//       console.error('Cleanup failed:', error);
//     }
//   }
// }

// // Export a single instance (one kitchen for all orders)
// module.exports = new YouTubeService();


// src/services/youtubeService.js - Fixed for YouTube blocking!
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

class YouTubeService {
  constructor() {
    this.downloadsDir = path.join(__dirname, '../../downloads');
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.ensureDirectories();
    
    // Cookie jar to store YouTube cookies
    this.cookieJar = new Map();
  }

  async ensureDirectories() {
    await fs.ensureDir(this.downloadsDir);
    await fs.ensureDir(this.uploadsDir);
    console.log('📁 Kitchen folders ready!');
  }

  // Get video info with anti-detection
  async getVideoInfo(url) {
    try {
      console.log('📖 Getting video info for:', url);
      
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Use agent with headers to avoid 403
      const agent = ytdl.createAgent(this.cookieJar, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com',
        }
      });

      const info = await ytdl.getInfo(url, { agent });
      
      // Find best audio format
      const audioFormat = ytdl.chooseFormat(info.formats, { 
        quality: 'highestaudio',
        filter: 'audioonly'
      });

      return {
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds),
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        audioUrl: audioFormat.url,
        videoId: info.videoDetails.videoId,
        formats: info.formats,
      };
    } catch (error) {
      console.error('❌ Failed to get video info:', error);
      throw error;
    }
  }

  // Download with retry logic and better headers
  async downloadAsMp3(url, options = {}) {
    const {
      quality = 'highestaudio',
      format = 'mp3',
    } = options;

    const orderId = uuidv4();
    const videoId = ytdl.getURLVideoID(url);
    
    const tempVideoPath = path.join(this.downloadsDir, `${orderId}_${videoId}.mp4`);
    const outputPath = path.join(this.uploadsDir, `${orderId}_${videoId}.mp3`);

    console.log('🎵 Starting download for order:', orderId);

    try {
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Create agent with cookies and headers
      const agent = ytdl.createAgent(this.cookieJar, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': '*/*',
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com',
        }
      });

      // STEP 1: Download with retry
      console.log('⬇️ Downloading video...');
      
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          const videoStream = ytdl(url, { 
            quality: quality,
            filter: 'audioandvideo',
            agent: agent,
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              }
            }
          });

          await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(tempVideoPath);
            videoStream.pipe(writeStream);
            
            let downloadedBytes = 0;
            videoStream.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              console.log(`📥 Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
            });
            
            videoStream.on('end', resolve);
            videoStream.on('error', (err) => {
              console.error('Stream error:', err.message);
              reject(err);
            });
          });
          
          // Success! Break out of retry loop
          break;
          
        } catch (error) {
          lastError = error;
          retries--;
          console.log(`❌ Download failed, retries left: ${retries}`);
          if (retries > 0) {
            console.log('⏳ Waiting 2 seconds before retry...');
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      if (retries === 0) {
        throw new Error(`Download failed after 3 attempts: ${lastError.message}`);
      }

      console.log('✅ Video downloaded');

      // STEP 2: Convert to MP3
      console.log('🔄 Converting to MP3...');
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .audioBitrate(192)
          .toFormat('mp3')
          .on('progress', (progress) => {
            console.log(`🎵 Converting: ${progress.percent}% done`);
          })
          .on('end', () => {
            console.log('✅ Conversion complete');
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ Conversion error:', err);
            reject(err);
          })
          .save(outputPath);
      });

      // STEP 3: Clean up
      await fs.remove(tempVideoPath);
      console.log('🧹 Cleaned up temp files');

      const stats = await fs.stat(outputPath);
      
      return {
        success: true,
        filePath: outputPath,
        fileName: path.basename(outputPath),
        fileSize: stats.size,
        orderId,
        videoId,
      };

    } catch (error) {
      console.error('❌ Download failed:', error);
      
      // Cleanup
      try {
        await fs.remove(tempVideoPath);
        await fs.remove(outputPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  // Proxy download method (alternative if direct download fails)
  async proxyDownload(audioUrl, outputPath) {
    return new Promise((resolve, reject) => {
      const client = audioUrl.startsWith('https') ? https : http;
      
      const request = client.get(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/',
          'Range': 'bytes=0-',
        },
        timeout: 60000,
      }, (response) => {
        if (response.statusCode === 403) {
          reject(new Error('YouTube returned 403 Forbidden - Video may be restricted'));
          return;
        }
        
        if (response.statusCode !== 200 && response.statusCode !== 206) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const writeStream = fs.createWriteStream(outputPath);
        response.pipe(writeStream);
        
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async cleanupOldFiles(maxAgeHours = 1) {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60);
        
        if (fileAge > maxAgeHours) {
          await fs.remove(filePath);
          console.log('🧹 Removed old file:', file);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = new YouTubeService();