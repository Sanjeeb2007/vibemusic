const express = require("express");
const router = express.Router();
const youtubeService = require("../services/youtubeService");

router.get("/test", (req, res) => {
  res.json({ message: "API test working!", time: new Date().toISOString() });
});

// Get video metadata only
router.get("/info", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url query param required" });
  try {
    const info = await youtubeService.getVideoInfo(url);
    res.json({ success: true, data: info });
  } catch (err) {
    console.error("Info error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW: Return direct audio stream URL — phone downloads directly, server uses ~50MB RAM
router.get("/stream-url", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url query param required" });

  // Ensure we respond before Render's 55s proxy timeout kills the connection
  const deadline = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: "Stream URL extraction timed out — please retry" });
    }
  }, 50000);

  try {
    const result = await youtubeService.getStreamUrl(url);
    clearTimeout(deadline);
    if (!res.headersSent) res.json({ success: true, data: result });
  } catch (err) {
    clearTimeout(deadline);
    console.error("Stream URL error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

console.log("✅ Routes loaded: /test, /info, /stream-url");

module.exports = router;
