const { exec } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const util = require("util");
const { v4: uuidv4 } = require("uuid");

const execPromise = util.promisify(exec);

class YtDlpService {
  constructor() {
    // Detect platform and set appropriate yt-dlp binary
    this.isWindows = process.platform === 'win32';
    this.ytDlpPath = this.isWindows 
      ? path.join(__dirname, "../../bin/yt-dlp.exe")
      : "yt-dlp"; // On Linux, use system yt-dlp
    
    this.uploadsDir = path.join(__dirname, "../../uploads");
    this.ensureDirectories();
    
    console.log(`🖥️ Platform: ${process.platform}`);
    console.log(`📁 yt-dlp path: ${this.ytDlpPath}`);
  }

  async ensureDirectories() {
    await fs.ensureDir(this.uploadsDir);
    console.log("📁 Uploads folder ready at:", this.uploadsDir);
  }

  async checkYtDlp() {
    try {
      const command = this.isWindows 
        ? `"${this.ytDlpPath}" --version`
        : "yt-dlp --version";
      
      const { stdout } = await execPromise(command);
      console.log(`✅ yt-dlp version: ${stdout.trim()}`);
      return true;
    } catch (error) {
      console.error("❌ yt-dlp not available:", error.message);
      return false;
    }
  }

  async getVideoInfo(url) {
    try {
      console.log("📖 Getting video info for:", url);

      const cleanUrl = url.split("?")[0];

      // Build command based on platform
      let command;
      if (this.isWindows) {
        command = `"${this.ytDlpPath}" --dump-json --no-playlist "${cleanUrl}"`;
      } else {
        command = `yt-dlp --dump-json --no-playlist "${cleanUrl}"`;
      }
      
      console.log("🎬 Running:", command);

      const { stdout, stderr } = await execPromise(command);

      if (stderr) console.log("yt-dlp stderr:", stderr);

      const info = JSON.parse(stdout);

      return {
        title: info.title,
        duration: info.duration,
        author: info.uploader,
        thumbnail: info.thumbnail,
        videoId: info.id,
      };
    } catch (error) {
      console.error("❌ getVideoInfo error:", error);
      throw error;
    }
  }

  async downloadAudio(url) {
    const orderId = uuidv4();

    try {
      console.log("🎵 Starting download for order:", orderId);

      const cleanUrl = url.split("?")[0];
      const outputTemplate = path.join(
        this.uploadsDir,
        `${orderId}_%(title)s.%(ext)s`,
      );

      // Build command based on platform
      let command;
      if (this.isWindows) {
        // Windows command with proper quoting
        command = [
          `"${this.ytDlpPath}"`,
          `"${cleanUrl}"`,
          "-f",
          "bestaudio[ext=m4a]",
          "--no-playlist",
          "--no-check-certificate",
          "--add-header",
          '"Referer:https://www.youtube.com/"',
          "--add-header",
          '"User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
          "-o",
          `"${outputTemplate}"`,
        ].join(" ");
      } else {
        // Linux command - simpler
        command = [
          "yt-dlp",
          `"${cleanUrl}"`,
          "-f",
          "bestaudio",
          "--extract-audio",
          "--audio-format",
          "mp3",
          "--no-playlist",
          "--no-check-certificate",
          "--add-header",
          "Referer:https://www.youtube.com/",
          "--add-header",
          "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "-o",
          `"${outputTemplate}"`,
        ].join(" ");
      }

      console.log("🎬 Running download command...");
      console.log("📋 Command:", command);

      const { stdout, stderr } = await execPromise(command);

      if (stderr) console.log("yt-dlp stderr:", stderr);
      if (stdout) console.log("yt-dlp stdout:", stdout);

      // Wait a moment for file to be written
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Find the downloaded file
      const files = await fs.readdir(this.uploadsDir);
      const downloadedFile = files.find((f) => f.startsWith(orderId));

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
        orderId,
      };
    } catch (error) {
      console.error("❌ Download error:", error);
      throw error;
    }
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
          console.log("🧹 Removed old file:", file);
        }
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }
}

module.exports = new YtDlpService();