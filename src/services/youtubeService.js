const path = require("path");
const fs = require("fs-extra");

// Use local yt-dlp binary on Linux (downloaded during Render.com build), fallback on Windows
const YTDLP_BIN = path.join(__dirname, '../../bin/yt-dlp');
const ytDlp = process.platform === 'linux'
  ? require('youtube-dl-exec').create(YTDLP_BIN)
  : require('youtube-dl-exec');

// ffmpeg-static provides a bundled ffmpeg binary for all platforms
const ffmpegPath = require('ffmpeg-static');
const FFMPEG_DIR = ffmpegPath ? path.dirname(ffmpegPath) : null;
const { v4: uuidv4 } = require("uuid");

const jobs = {}; // 👈 ADD THIS

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
    console.log("📖 Getting info for:", url);

    // Node.js path so yt-dlp can use it as a JS runtime (fixes "No JS runtime" warning)
    const nodeRuntime = `node[${process.execPath}]`;

    const fallbackStrategies = [
      { extractorArgs: "youtube:player_client=tv_embedded", jsRuntimes: nodeRuntime },
      { extractorArgs: "youtube:player_client=ios", jsRuntimes: nodeRuntime },
      { extractorArgs: "youtube:player_client=android_music", jsRuntimes: nodeRuntime },
      { extractorArgs: "youtube:player_client=mweb", jsRuntimes: nodeRuntime },
      { jsRuntimes: nodeRuntime },
    ];

    let lastError;
    for (const strategy of fallbackStrategies) {
      try {
        const info = await ytDlp(url, {
          dumpJson: true,
          noPlaylist: true,
          sleepRequests: '1',
          ...(FFMPEG_DIR ? { ffmpegLocation: FFMPEG_DIR } : {}),
          ...strategy
        });

        return {
          title: info.title,
          duration: parseInt(info.duration) || 0,
          author: info.uploader,
          thumbnail: info.thumbnail,
          videoId: info.id,
        };
      } catch (error) {
        console.log(`⚠️ Info strategy failed: ${error.message.substring(0, 100)}`);
        lastError = error;
      }
    }
    console.error("❌ All getVideoInfo strategies failed.");
    throw new Error(`Failed to get video info: ${lastError.message}`);
  }

  async downloadAudio(url) {
    const orderId = uuidv4();

    try {
      console.log("🎵 Starting download:", orderId);

      const info = await this.getVideoInfo(url);
      const outputPath = path.join(this.uploadsDir, `${orderId}.mp3`);

      const nodeRuntime = `node[${process.execPath}]`;
      const fallbackStrategies = [
        { extractorArgs: "youtube:player_client=tv_embedded", jsRuntimes: nodeRuntime },
        { extractorArgs: "youtube:player_client=ios", jsRuntimes: nodeRuntime },
        { extractorArgs: "youtube:player_client=android_music", jsRuntimes: nodeRuntime },
        { extractorArgs: "youtube:player_client=mweb", jsRuntimes: nodeRuntime },
        { jsRuntimes: nodeRuntime },
      ];

      let success = false;
      let lastError;

      for (const strategy of fallbackStrategies) {
        try {
          console.log("🚀 Attempting download with strategy:", JSON.stringify(strategy));
          await ytDlp(url, {
            extractAudio: true,
            audioFormat: "mp3",
            audioQuality: 0,
            noPlaylist: true,
            output: outputPath,
            sleepRequests: '1',
            ...(FFMPEG_DIR ? { ffmpegLocation: FFMPEG_DIR } : {}),
            ...strategy
          });
          success = true;
          break;
        } catch (err) {
          console.log(`⚠️ Download strategy failed: ${err.message.substring(0, 100)}`);
          lastError = err;
          // Short delay before next strategy to avoid rate limiting
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!success) {
        throw new Error(`All download strategies failed: ${lastError.message}`);
      }

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

  // 👇 ADD THIS METHOD
  async startDownloadJob(url) {
    const orderId = uuidv4();
    jobs[orderId] = { status: 'processing', fileName: null, error: null };

    console.log("🚀 Job started:", orderId);

    this.downloadAudio(url).then(result => {
      jobs[orderId] = { status: 'done', fileName: result.fileName, title: result.title };
      console.log(`✅ [Job ${orderId}] Success! File: ${result.fileName}`);
    }).catch(err => {
      jobs[orderId] = { status: 'error', error: err.message };
      console.error(`❌ [Job ${orderId}] Failed: ${err.message}`);
    });

    return orderId;
  }

  // 👇 ADD THIS METHOD
  getJobStatus(orderId) {
    return jobs[orderId] || null;
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

        if (ageHours > maxAgeHours && file !== '.gitkeep') {
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