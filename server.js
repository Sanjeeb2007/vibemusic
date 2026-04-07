const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
require("dotenv").config();

const app = express();

// Middleware FIRST
app.use(cors({ origin: "*" }));
app.use(express.json());

// Create uploads directory
const uploadsDir = path.join(__dirname, "uploads");
fs.ensureDirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Routes FIRST (before slow services)
const downloadRoutes = require("./src/routes/downloadRoutes");
app.use("/api", downloadRoutes);

// Quick health check (must respond fast!)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.json({
    message: "VibeMusic API is running",
    version: "1.0.0",
    status: "healthy",
    endpoints: [
      "/health",
      "/api/test",
      "/api/info",
      "/api/download",
      "/api/stream",
    ],
  });
});

app.get("/api/check-ytdlp", async (req, res) => {
  const { exec } = require("child_process");
  const util = require("util");
  const execPromise = util.promisify(exec);

  try {
    const { stdout } = await execPromise("yt-dlp --version");
    res.json({
      success: true,
      version: stdout.trim(),
      message: "✅ yt-dlp is installed",
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      message: "❌ yt-dlp not installed",
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ error: err.message });
});

// START SERVER IMMEDIATELY
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ VibeMusic API running on port ${PORT}`);
  console.log(`🌐 Server ready on 0.0.0.0:${PORT}`);
});

// Write YouTube cookies from env var to temp file (for yt-dlp bot bypass)
const COOKIES_PATH = '/tmp/yt-cookies.txt';
if (process.env.YOUTUBE_COOKIES_BASE64) {
  try {
    const cookiesContent = Buffer.from(process.env.YOUTUBE_COOKIES_BASE64, 'base64').toString('utf8');
    require('fs').writeFileSync(COOKIES_PATH, cookiesContent);
    console.log('🍪 YouTube cookies loaded from environment');
  } catch (e) {
    console.warn('⚠️ Failed to write YouTube cookies:', e.message);
  }
} else {
  console.warn('⚠️ YOUTUBE_COOKIES_BASE64 not set — downloads may fail bot detection');
}

// Load slow services AFTER server starts (background)
setTimeout(() => {
  console.log("🚀 Loading background services...");
  require("./src/utils/fileCleanup");

  // Auto-update yt-dlp binary so it stays current with YouTube's algorithm changes
  const YTDLP_BIN = process.platform === 'linux'
    ? path.join(__dirname, 'bin/yt-dlp')
    : 'yt-dlp';

  const { spawn } = require('child_process');
  const updateProc = spawn(YTDLP_BIN, ['--update-to', 'stable'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let updateOut = '';
  updateProc.stdout.on('data', d => { updateOut += d; });
  updateProc.stderr.on('data', d => { updateOut += d; });
  updateProc.on('close', code => {
    const line = updateOut.trim().split('\n').pop() || '';
    console.log(`🔄 yt-dlp update: ${line}`);
  });
  updateProc.on('error', err => {
    console.warn('⚠️ yt-dlp update failed:', err.message);
  });

  // Pre-load youtube service in background
  const youtubeService = require("./src/services/youtubeService");
  console.log("✅ Background services loaded");
}, 1000);
