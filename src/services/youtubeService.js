const ytDlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

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
    const result = await ytDlp('--version');
    console.log(`✅ yt-dlp ready`);
  } catch (error) {
    console.error('❌ yt-dlp-exec error:', error.message);
  }
}

  async getVideoInfo(url) {
    try {
      console.log("📖 Getting info for:", url);

      const info = await ytDlp(url, {
        dumpJson: true,
        noPlaylist: true,
      });

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

      const info = await this.getVideoInfo(url);

      const outputPath = path.join(this.uploadsDir, `${orderId}.mp3`);

      await ytDlp(url, {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: 0,
        noPlaylist: true,
        output: outputPath,
      });

      const stats = await fs.stat(outputPath);
      const fileName = `${orderId}.mp3`;

      console.log("✅ Download complete:", fileName);

      return {
        success: true,
        fileName,
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
