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
  try {
    const result = await youtubeService.getStreamUrl(url);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Stream URL error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

console.log("✅ Routes loaded: /test, /info, /stream-url");

module.exports = router;
