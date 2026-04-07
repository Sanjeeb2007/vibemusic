const path = require("path");

// Use local yt-dlp binary on Linux (Render), fallback on Windows
const YTDLP_BIN = path.join(__dirname, '../../bin/yt-dlp');
const ytDlp = process.platform === 'linux'
  ? require('youtube-dl-exec').create(YTDLP_BIN)
  : require('youtube-dl-exec');

const COOKIES_PATH = '/tmp/yt-cookies.txt';

class YoutubeService {
  constructor() {
    this.checkYtDlp();
  }

  async checkYtDlp() {
    try {
      await ytDlp('--version');
      console.log('✅ yt-dlp ready');
    } catch (error) {
      console.error('❌ yt-dlp error:', error.message);
    }
  }

  _baseOptions() {
    const hasCookies = require('fs').existsSync(COOKIES_PATH);
    return {
      noPlaylist: true,
      noCheckCertificates: true,
      jsRuntimes: 'node',
      ...(hasCookies ? { cookies: COOKIES_PATH } : {}),
    };
  }

  // Lightweight: only fetches metadata — no audio bytes, no ffmpeg, ~50MB RAM
  async getVideoInfo(url) {
    console.log("📖 Getting info for:", url);

    const strategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_embedded" },
      { extractorArgs: "youtube:player_client=ios" },
      { extractorArgs: "youtube:player_client=android_music" },
      {},
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        const info = await ytDlp(url, {
          dumpJson: true,
          ...this._baseOptions(),
          ...strategy,
        });

        return {
          title: info.title,
          duration: parseInt(info.duration) || 0,
          author: info.uploader || info.channel,
          thumbnail: info.thumbnail,
          videoId: info.id,
        };
      } catch (err) {
        console.log(`⚠️ Info strategy failed: ${err.message.substring(0, 100)}`);
        lastError = err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error(`Failed to get video info: ${lastError.message}`);
  }

  // Returns a direct audio stream URL — phone downloads it directly (no server bandwidth)
  async getStreamUrl(url) {
    console.log("🔗 Getting stream URL for:", url);

    const strategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_embedded" },
      { extractorArgs: "youtube:player_client=ios" },
      { extractorArgs: "youtube:player_client=android_music" },
      {},
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        const info = await ytDlp(url, {
          dumpJson: true,
          // Request best audio-only: prefer m4a (native on Android/iOS), fallback to any audio
          format: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
          ...this._baseOptions(),
          ...strategy,
        });

        // Find the selected format's direct URL
        const audioUrl = info.url
          || info.formats?.find(f => f.url && (f.ext === 'm4a' || f.acodec !== 'none' && f.vcodec === 'none'))?.url
          || info.formats?.find(f => f.url)?.url;

        if (!audioUrl) throw new Error('No audio URL found in response');

        const ext = info.ext || 'm4a';
        console.log(`✅ Got stream URL (${ext}), title: ${info.title}`);

        return {
          streamUrl: audioUrl,
          title: info.title,
          author: info.uploader || info.channel,
          thumbnail: info.thumbnail,
          duration: parseInt(info.duration) || 0,
          ext,
          videoId: info.id,
        };
      } catch (err) {
        console.log(`⚠️ Stream URL strategy failed: ${err.message.substring(0, 100)}`);
        lastError = err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error(`Failed to get stream URL: ${lastError.message}`);
  }
}

module.exports = new YoutubeService();
