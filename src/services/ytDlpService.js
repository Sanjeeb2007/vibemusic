// const { exec } = require("child_process");
// const path = require("path");
// const fs = require("fs-extra");
// const util = require("util");
// const { v4: uuidv4 } = require("uuid");

// const execPromise = util.promisify(exec);

// class YtDlpService {
//   constructor() {
//     this.isWindows = process.platform === 'win32';
//     this.uploadsDir = path.join(__dirname, "../../uploads");
//     this.ytDlpAvailable = false;
    
//     // Check multiple paths for yt-dlp
//     this.ytDlpPaths = this.isWindows 
//       ? [path.join(__dirname, "../../bin/yt-dlp.exe")]
//       : [
//           '/usr/local/bin/yt-dlp',
//           '/usr/bin/yt-dlp', 
//           path.join(__dirname, "../../bin/yt-dlp"),
//           'yt-dlp'
//         ];
    
//     this.ytDlpPath = null;
    
//     this.ensureDirectories();
//     this.checkYtDlp();
    
//     console.log(`🖥️ Platform: ${process.platform}`);
//   }

//   async ensureDirectories() {
//     try {
//       await fs.ensureDir(this.uploadsDir);
//       console.log("📁 Uploads folder ready at:", this.uploadsDir);
//     } catch (err) {
//       console.error("❌ Failed to create uploads directory:", err.message);
//     }
//   }

//   async checkYtDlp() {
//     for (const testPath of this.ytDlpPaths) {
//       try {
//         const command = this.isWindows ? `"${testPath}" --version` : `${testPath} --version`;
//         const { stdout } = await execPromise(command);
//         console.log(`✅ yt-dlp found at ${testPath}: ${stdout.trim()}`);
//         this.ytDlpPath = testPath;
//         this.ytDlpAvailable = true;
//         return true;
//       } catch (error) {
//         console.log(`❌ Not found at: ${testPath}`);
//       }
//     }
    
//     console.error("❌ yt-dlp not available! Will use fallback.");
//     this.ytDlpAvailable = false;
//     return false;
//   }

//   getYtDlpCommand() {
//     if (!this.ytDlpPath) throw new Error("yt-dlp not initialized");
//     return this.isWindows ? `"${this.ytDlpPath}"` : this.ytDlpPath;
//   }

//   async getVideoInfo(url) {
//     try {
//       console.log("📖 Getting video info for:", url);

//       if (!this.ytDlpAvailable) {
//         console.log("📝 Using MOCK data");
//         return {
//           title: "Sample Video (Mock Mode)",
//           duration: 180,
//           author: "Sample Artist",
//           thumbnail: "https://via.placeholder.com/150",
//           videoId: "mock123",
//         };
//       }

//       const cleanUrl = url.split("?")[0];
//       const command = `${this.getYtDlpCommand()} --dump-json --no-playlist "${cleanUrl}"`;
      
//       console.log("🎬 Running:", command);

//       const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
//       if (stderr) console.log("yt-dlp stderr:", stderr);

//       const info = JSON.parse(stdout);

//       return {
//         title: info.title,
//         duration: info.duration,
//         author: info.uploader,
//         thumbnail: info.thumbnail,
//         videoId: info.id,
//       };
//     } catch (error) {
//       console.error("❌ getVideoInfo error:", error);
//       return {
//         title: "Error: " + error.message,
//         duration: 0,
//         author: "Unknown",
//         thumbnail: "https://via.placeholder.com/150",
//         videoId: "error",
//       };
//     }
//   }

//   async downloadAudio(url) {
//     const orderId = uuidv4();

//     try {
//       console.log("🎵 Starting download for order:", orderId);

//       if (!this.ytDlpAvailable) {
//         throw new Error("yt-dlp not available - cannot download");
//       }

//       const cleanUrl = url.split("?")[0];
//       const outputTemplate = path.join(this.uploadsDir, `${orderId}_%(title)s.%(ext)s`);

//       const command = [
//         this.getYtDlpCommand(),
//         `"${cleanUrl}"`,
//         "-f",
//         "bestaudio[ext=m4a]/bestaudio",
//         "--extract-audio",
//         "--audio-format",
//         "mp3",
//         "--audio-quality",
//         "0",
//         "--no-playlist",
//         "--no-check-certificate",
//         "--no-warnings",
//         "--add-header",
//         "Referer:https://www.youtube.com/",
//         "--add-header",
//         "User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
//         "-o",
//         `"${outputTemplate}"`
//       ].join(" ");

//       console.log("🎬 Running download command...");
//       console.log("📋 Command:", command.substring(0, 200));

//       const { stdout, stderr } = await execPromise(command, { timeout: 120000 });
//       if (stderr) console.log("yt-dlp stderr:", stderr);
//       if (stdout) console.log("yt-dlp stdout:", stdout);

//       await new Promise((resolve) => setTimeout(resolve, 2000));

//       const files = await fs.readdir(this.uploadsDir);
//       const downloadedFile = files.find((f) => f.startsWith(orderId));

//       if (!downloadedFile) {
//         throw new Error("File not found after download");
//       }

//       const filePath = path.join(this.uploadsDir, downloadedFile);
//       const stats = await fs.stat(filePath);

//       console.log("✅ Download complete:", downloadedFile);

//       return {
//         success: true,
//         fileName: downloadedFile,
//         fileSize: stats.size,
//         orderId,
//       };
//     } catch (error) {
//       console.error("❌ Download error:", error);
//       throw error;
//     }
//   }

//   async cleanupOldFiles(maxAgeHours = 1) {
//     try {
//       const files = await fs.readdir(this.uploadsDir);
//       const now = Date.now();

//       for (const file of files) {
//         const filePath = path.join(this.uploadsDir, file);
//         const stats = await fs.stat(filePath);
//         const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60);

//         if (fileAge > maxAgeHours) {
//           await fs.remove(filePath);
//           console.log("🧹 Removed old file:", file);
//         }
//       }
//     } catch (error) {
//       console.error("Cleanup failed:", error);
//     }
//   }
// }

// module.exports = new YtDlpService();