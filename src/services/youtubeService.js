const path = require("path");
const { spawn } = require("child_process");

// Use local yt-dlp binary on Linux (Render), fallback on Windows
const YTDLP_BIN = process.platform === 'linux'
  ? path.join(__dirname, '../../bin/yt-dlp')
  : null;

const COOKIES_PATH = '/tmp/yt-cookies.txt';

// Fast URL-only extraction using --print (skips fetching all format metadata)
// Returns { url, ext } — much faster than --dump-json for stream URL lookups
function ytDlpPrint(url, args, timeoutMs = 18000) {
  return new Promise((resolve, reject) => {
    const bin = YTDLP_BIN || 'yt-dlp';
    const cliArgs = [url];

    // Convert option object → CLI flags
    for (const [key, val] of Object.entries(args)) {
      const flag = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (val === true) {
        cliArgs.push(flag);
      } else if (val !== false && val != null) {
        cliArgs.push(flag, String(val));
      }
    }

    // Use --print to get only the fields we need (fast, no full metadata fetch)
    cliArgs.push('--print', '%(url)s\t%(ext)s\t%(id)s');

    const proc = spawn(bin, cliArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`yt-dlp timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        const [url, ext, id] = stdout.trim().split('\t');
        if (url && url.startsWith('http')) {
          resolve({ url, ext: ext || 'm4a', id: id || '' });
        } else {
          reject(new Error('yt-dlp returned empty or invalid URL'));
        }
      } else {
        reject(new Error(stderr.trim().split('\n').pop() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Hard timeout wrapper: kills the yt-dlp child process if it hangs
function ytDlpWithTimeout(url, args, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const bin = YTDLP_BIN || 'yt-dlp';
    const cliArgs = [url];

    // Convert option object → CLI flags
    for (const [key, val] of Object.entries(args)) {
      const flag = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (val === true) {
        cliArgs.push(flag);
      } else if (val !== false && val != null) {
        cliArgs.push(flag, String(val));
      }
    }

    const proc = spawn(bin, cliArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`yt-dlp timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Failed to parse yt-dlp JSON output'));
        }
      } else {
        reject(new Error(stderr.trim().split('\n').pop() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

class YoutubeService {
  constructor() {
    this.checkYtDlp();
  }

  async checkYtDlp() {
    try {
      const bin = YTDLP_BIN || 'yt-dlp';
      const proc = spawn(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      proc.stdout.on('data', d => console.log('✅ yt-dlp version:', d.toString().trim()));
      proc.on('error', err => console.error('❌ yt-dlp error:', err.message));
    } catch (error) {
      console.error('❌ yt-dlp check failed:', error.message);
    }
  }

  _baseArgs() {
    const hasCookies = require('fs').existsSync(COOKIES_PATH);
    return {
      dumpJson: true,
      noPlaylist: true,
      noCheckCertificates: true,
      jsRuntimes: 'node',
      socketTimeout: 8,
      ...(hasCookies ? { cookies: COOKIES_PATH } : {}),
    };
  }

  // Lightweight: only fetches metadata — no audio bytes, no ffmpeg
  async getVideoInfo(url) {
    console.log("📖 Getting info for:", url);

    const strategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_music" },
      { extractorArgs: "youtube:player_client=ios" },
      {},
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        const info = await ytDlpWithTimeout(url, { ...this._baseArgs(), ...strategy }, 18000);
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
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error(`Failed to get video info: ${lastError.message}`);
  }

  // Returns a direct audio stream URL — phone downloads it directly (no server bandwidth)
  // Uses --print instead of --dump-json: only fetches the URL, ~3x faster
  async getStreamUrl(url) {
    console.log("🔗 Getting stream URL for:", url);

    const strategies = [
      { extractorArgs: "youtube:player_client=tv_embedded" },
      { extractorArgs: "youtube:player_client=android_music" },
      { extractorArgs: "youtube:player_client=ios" },
      {},
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        const result = await ytDlpPrint(url, {
          format: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
          ...this._baseArgs(),
          ...strategy,
        }, 18000);

        if (!result.url) throw new Error('No audio URL in yt-dlp output');

        const ext = result.ext || 'm4a';
        console.log(`✅ Got stream URL (${ext})`);

        return {
          streamUrl: result.url,
          ext,
          // Title etc. are already known by the app from the initial info fetch
          title: result.title || '',
          author: result.uploader || result.channel || '',
          thumbnail: result.thumbnail || '',
          duration: parseInt(result.duration) || 0,
          videoId: result.id || '',
        };
      } catch (err) {
        console.log(`⚠️ Stream URL strategy failed: ${err.message.substring(0, 100)}`);
        lastError = err;
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error(`Failed to get stream URL: ${lastError.message}`);
  }
}

module.exports = new YoutubeService();
