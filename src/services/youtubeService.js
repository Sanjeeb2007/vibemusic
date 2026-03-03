const { exec } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

const execPromise = util.promisify(exec);

class YoutubeService {
  constructor() {
    this.uploadsDir = path.join(__dirname, "../../uploads");
    this.initPromise = this.initialize();
  }

  async initialize() {
    await this.ensureDirectories();
    await this.checkYtDlp();
  }

  async ensureDirectories() {
    await fs.ensureDir(this.uploadsDir);
    console.log("📁 Uploads folder ready:", this.uploadsDir);
  }

  async checkYtDlp() {
    try {
      const { stdout } = await execPromise('yt-dlp --version');
      console.log(`✅ yt-dlp version ${stdout.trim()} installed`);
    } catch (error) {
      console.error('❌ yt-dlp not found. Please install with: pip3 install yt-dlp');
      // Don't throw - let the app continue but downloads will fail
    }
  }

  async getVideoInfo(url) {
    try {
      console.log("📖 Getting info for:", url);

      // Clean URL - remove query parameters that might cause issues
      const cleanUrl = url.split('?')[0];
      
      const command = `yt-dlp --dump-json --no-playlist "${cleanUrl}"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && !stderr.includes("WARNING")) {
        console.log("yt-dlp stderr:", stderr);
      }

      const info = JSON.parse(stdout);
      
      return {
        title: info.title,
        duration: parseInt(info.duration),
        author: info.uploader,
        thumbnail: info.thumbnail,
        videoId: info.id,
      };
    } catch (error) {
      console.error("❌ getVideoInfo error:", error.message);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  async downloadAudio(url) {
    const orderId = uuidv4();
    
    try {
      console.log("🎵 Starting download:", orderId);

      // Clean URL
      const cleanUrl = url.split('?')[0];
      
      // First get video info
      const info = await this.getVideoInfo(cleanUrl);
      
      const outputPath = path.join(this.uploadsDir, `${orderId}.%(ext)s`);
      
      // Download and convert in one step
      const command = [
        "yt-dlp",
        `"${cleanUrl}"`,
        "-f", "bestaudio",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--no-playlist",
        "--output", `"${outputPath}"`
      ].join(" ");

      console.log("🎬 Running download command...");
      
      const { stderr } = await execPromise(command);
      
      if (stderr && !stderr.includes("WARNING") && !stderr.includes("Destination")) {
        console.log("yt-dlp stderr:", stderr);
      }

      // Find the downloaded file
      const files = await fs.readdir(this.uploadsDir);
      const downloadedFile = files.find(f => f.startsWith(orderId));
      
      if (!downloadedFile) {
        throw new Error("File not found after download");
      }

      const filePath = path.join(this.uploadsDir, downloadedFile);
      const stats = await fs.stat(filePath);
      
      console.log("✅ Download complete:", downloadedFile);
      
      return {
        success: true,
        fileName: downloadedFile,
        fileSize: stats.size,
        title: info.title,
        orderId,
      };
      
    } catch (error) {
      console.error("❌ Download error:", error.message);
      throw error;
    }
  }

  async cleanupOldFiles(maxAgeHours = 1) {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);
        const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          await fs.remove(filePath);
          console.log("🧹 Cleaned:", file);
          cleaned++;
        }
      }

      if (cleaned > 0) console.log(`🧹 Total cleaned: ${cleaned} files`);
    } catch (error) {
      console.error("Cleanup error:", error.message);
    }
  }
}

module.exports = new YoutubeService();