const express = require("express");
const router = express.Router();
const downloadController = require("../controllers/downloadController");

// Test route - MUST be first
router.get("/test", (req, res) => {
  console.log("✅ /api/test hit");
  res.json({ 
    message: "API test working!", 
    time: new Date().toISOString(),
    endpoints: ["/api/info", "/api/download", "/api/stream"]
  });
});

// Get video info
router.get("/info", async (req, res) => {
  try {
    await downloadController.getInfo(req, res);
  } catch (err) {
    console.error("Info error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Download audio (POST)
router.post("/download", async (req, res) => {
  try {
    await downloadController.download(req, res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Stream file
router.get("/stream/:filename", async (req, res) => {
  try {
    await downloadController.stream(req, res);
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).json({ error: err.message });
  }
});

console.log("✅ Routes loaded: /test, /info, /download, /stream");

module.exports = router;