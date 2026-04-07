const path = require("path");
const fs = require("fs-extra");

// Find absolute path to node for yt-dlp's JS runtime (crucial for YouTube signature deciphering)
const NODE_BIN = process.execPath;
const YTDLP_BIN = path.join(__dirname, '../../bin/yt-dlp');
const ytDlp = process.platform === 'linux'
  ? require('youtube-dl-exec').create(YTDLP_BIN)
  : require('youtube-dl-exec');

const COOKIES_PATH = '/tmp/yt-cookies.txt';

class YoutubeService {
  constructor() {
    this.checkStatus();
  }

  async checkStatus() {
    try {
      const version = await ytDlp('--version');
      console.log(`✅ yt-dlp ready: ${version}`);
    } catch (error) {
      console.warn('⚠️ yt-dlp error:', error.message);
    }
  }

  _baseOptions() {
    const hasCookies = fs.existsSync(COOKIES_PATH);
    return {
      noPlaylist: true,
      noCheckCertificates: true,
      // Force yt-dlp to use our current Node process as its JS runtime
      jsRuntimes: `node[${NODE_BIN}]`,
      ...(hasCookies ? { cookies: COOKIES_PATH } : {}),
      // Increase sleep between requests slightly to stay under the radar
      sleepRequests: '2',
    };
  }

  /**
   * Lightweight metadata extractor
   */
  async getVideoInfo(url) {
    console.log("📖 Extracting metadata for:", url);
    try {
      const info = await ytDlp(url, {
        dumpJson: true,
        ...this._baseOptions(),
      });

      return {
        title: info.title,
        duration: parseInt(info.duration) || 0,
        author: info.uploader || info.channel,
        thumbnail: info.thumbnail,
        videoId: info.id,
      };
    } catch (err) {
      console.error("❌ Metadata extraction failed:", err.message);
      throw err;
    }
  }

  /**
   * Returns a direct YouTube audio stream URL.
   * This is $0 cost — server just finds the link, phone does the heavy downloading.
   */
  async getStreamUrl(url) {
    console.log("🔗 Extracting direct stream URL for:", url);

    const strategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_embedded" },
      { extractorArgs: "youtube:player_client=ios" },
      { extractorArgs: "youtube:player_client=android_music" },
      {}, // Default fallback
    ];

    let lastError;
    // Iterate through player clients to find one that isn't rate-limited (429)
    for (const strategy of strategies) {
      try {
        const info = await ytDlp(url, {
          dumpJson: true,
          // Request best audio-only (m4a is best for mobile playback)
          format: 'bestaudio[ext=m4a]/bestaudio',
          ...this._baseOptions(),
          ...strategy,
        });

        // Pull the direct URL from formats
        const audioUrl = info.url || info.formats?.find(f => f.url && f.acodec !== 'none' && f.vcodec === 'none')?.url;
        
        if (!audioUrl) throw new Error('Could not find audio format in YouTube response');

        console.log(`✅ Success! Found stream for: ${info.title} (${strategy.extractorArgs || 'default'})`);
        
        return {
          streamUrl: audioUrl,
          title: info.title,
          author: info.uploader || info.channel,
          thumbnail: info.thumbnail,
          duration: parseInt(info.duration) || 0,
          ext: info.ext || 'm4a',
        };
      } catch (err) {
        console.log(`⚠️ Strategy failed (${strategy.extractorArgs || 'default'}): ${err.message.substring(0, 100)}`);
        lastError = err;
        // Wait 3 seconds before next strategy to let the YouTube rate-limiter cool down
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    throw new Error(`YouTube blocked all extraction attempts: ${lastError.message}`);
  }
}

module.exports = new YoutubeService();
