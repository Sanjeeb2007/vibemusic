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
      const { stdout } = await execPromise("yt-dlp --version");
      console.log(`✅ yt-dlp version ${stdout.trim()} installed`);
    } catch (error) {
      console.error(
        "❌ yt-dlp not found. Please install with: pip3 install yt-dlp",
      );
      // Don't throw - let the app continue but downloads will fail
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
async downloadAudio(url, res) {
  const orderId = uuidv4();

  try {
    console.log("🎵 Streaming download for order:", orderId);

    // First get video info (for metadata/title)
    const info = await this.getVideoInfo(url);

    // Set headers for file download
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vibemusic-${orderId}.mp3"`,
    );

    // Stream directly to client - NO FILE SAVED ON SERVER
    const stream = await ytDlp.exec(url, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: 0,
      noPlaylist: true,
      output: "-",
    });

    // Log progress (optional)
    stream.stderr.on("data", (data) => {
      console.log("yt-dlp progress:", data.toString());
    });

    // Handle errors
    stream.on("error", (error) => {
      console.error("❌ yt-dlp error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed" });
      }
    });

    // When download completes
    stream.on("close", (code) => {
      if (code !== 0) {
        console.error(`❌ yt-dlp exited with code ${code}`);
      } else {
        console.log("✅ Streaming complete for order:", orderId);
      }
      res.end();
    });

    // PIPE THE AUDIO STREAM DIRECTLY TO THE RESPONSE
    stream.stdout.pipe(res);

    // Return metadata (but not file info since we didn't save it)
    return {
      success: true,
      title: info.title,
      orderId,
      message: "Streaming started",
    };
  } catch (error) {
    console.error("❌ Download error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
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
