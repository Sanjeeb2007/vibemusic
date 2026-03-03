const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(ffmpegStatic);

class YoutubeService {
  constructor() {
    this.uploadsDir = path.join(__dirname, "../../uploads");
    // Don't block - run async
    this.initPromise = this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.ensureDir(this.uploadsDir);
      console.log("📁 Uploads folder ready:", this.uploadsDir);
    } catch (err) {
      console.error("❌ Failed to create uploads:", err.message);
    }
  }

  getAgent() {
    return ytdl.createAgent([
      {
        domain: ".youtube.com",
        expirationDate: 9999999999,
        hostOnly: false,
        httpOnly: true,
        name: "CONSENT",
        path: "/",
        sameSite: "no_restriction",
        secure: true,
        value: "YES+cb.20210328-17-p0.en+FX+{}",
      },
    ]);
  }

  async getVideoInfo(url) {
     await this.initPromise;
    try {
      console.log("📖 Getting info for:", url);

      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL");
      }

      const info = await ytdl.getInfo(url, { agent: this.getAgent() });

      return {
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds),
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        videoId: info.videoDetails.videoId,
      };
    } catch (error) {
      console.error("❌ getVideoInfo error:", error.message);
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  async downloadAudio(url) {
     await this.initPromise; 
    const orderId = uuidv4();
    const outputFileName = `${orderId}.mp3`;
    const outputPath = path.join(this.uploadsDir, outputFileName);

    return new Promise(async (resolve, reject) => {
      try {
        console.log("🎵 Starting download:", orderId);

        if (!ytdl.validateURL(url)) {
          return reject(new Error("Invalid YouTube URL"));
        }

        const info = await ytdl.getInfo(url, { agent: this.getAgent() });

        const stream = ytdl(url, {
          quality: "highestaudio",
          filter: "audioonly",
          agent: this.getAgent(),
          highWaterMark: 1 << 25,
        });

        ffmpeg(stream)
          .audioBitrate(128)
          .format("mp3")
          .on("start", (cmd) => {
            console.log("🎬 FFmpeg started");
          })
          .on("error", (err) => {
            console.error("❌ FFmpeg error:", err.message);
            reject(new Error(`Conversion failed: ${err.message}`));
          })
          .on("end", async () => {
            try {
              const stats = await fs.stat(outputPath);
              console.log("✅ Download complete:", outputFileName);

              resolve({
                success: true,
                fileName: outputFileName,
                fileSize: stats.size,
                title: info.videoDetails.title,
                orderId,
              });
            } catch (err) {
              reject(err);
            }
          })
          .save(outputPath);
      } catch (error) {
        console.error("❌ Download error:", error.message);
        reject(error);
      }
    });
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
