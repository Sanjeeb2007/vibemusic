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

const COOKIES_PATH = '/tmp/yt-cookies.txt';
const jobs = {};

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

  _baseOptions() {
    const hasCookies = require('fs').existsSync(COOKIES_PATH);
    return {
      noPlaylist: true,
      sleepRequests: '3',
      noCheckCertificates: true,
      jsRuntimes: 'node',
      ...(hasCookies ? { cookies: COOKIES_PATH } : {}),
      ...(FFMPEG_DIR ? { ffmpegLocation: FFMPEG_DIR } : {}),
    };
  }

  async getVideoInfo(url) {
    console.log("📖 Getting info for:", url);

    const fallbackStrategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_embedded" },
      { extractorArgs: "youtube:player_client=ios" },
      { extractorArgs: "youtube:player_client=android_music" },
      { extractorArgs: "youtube:player_client=web_embedded" },
      {},
    ];

    let lastError;
    for (const strategy of fallbackStrategies) {
      try {
        const info = await ytDlp(url, {
          dumpJson: true,
          ...this._baseOptions(),
          ...strategy,
        });

        return {
          title: info.title,
          duration: parseInt(info.duration) || 0,
          author: info.uploader,
          thumbnail: info.thumbnail,
          videoId: info.id,
        };
      } catch (error) {
        console.log(`⚠️ Info strategy failed: ${error.message.substring(0, 120)}`);
        lastError = error;
        await new Promise(r => setTimeout(r, 3000));
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

      const fallbackStrategies = [
        { extractorArgs: "youtube:player_client=tv_embedded" },
        { extractorArgs: "youtube:player_client=android_embedded" },
        { extractorArgs: "youtube:player_client=ios" },
        { extractorArgs: "youtube:player_client=android_music" },
        { extractorArgs: "youtube:player_client=web_embedded" },
        {},
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
            output: outputPath,
            ...this._baseOptions(),
            ...strategy,
          });
          success = true;
          break;
        } catch (err) {
          console.log(`⚠️ Download strategy failed: ${err.message.substring(0, 120)}`);
          lastError = err;
          await new Promise(r => setTimeout(r, 3000));
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
      jobs[orderId] = { status: 'done', fileName: result.fileName, title: result.title, completedAt: Date.now() };
      console.log(`✅ [Job ${orderId}] Success! File: ${result.fileName}`);
      setTimeout(() => { delete jobs[orderId]; }, 10 * 60 * 1000);
    }).catch(err => {
      jobs[orderId] = { status: 'error', error: err.message, completedAt: Date.now() };
      console.error(`❌ [Job ${orderId}] Failed: ${err.message}`);
      setTimeout(() => { delete jobs[orderId]; }, 10 * 60 * 1000);
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

      // Purge orphaned job entries whose completedAt is older than maxAgeHours
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let prunedJobs = 0;
      for (const [id, job] of Object.entries(jobs)) {
        if (job.completedAt && (now - job.completedAt) > maxAgeMs) {
          delete jobs[id];
          prunedJobs++;
        }
      }

      if (cleaned > 0) console.log(`🧹 Total cleaned: ${cleaned} files`);
      if (prunedJobs > 0) console.log(`🧹 Pruned ${prunedJobs} stale job entries`);
    } catch (error) {
      console.error("Cleanup error:", error.message);
    }
  }
}

module.exports = new YoutubeService();