const youtubeService = require("../services/youtubeService");
const path = require("path");
const fs = require("fs-extra"); // Added missing import
const config = require("../config/config");

class DownloadController {
  async getInfo(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ error: "Please provide a YouTube URL" });
      }

      console.log("📝 Getting info for:", url);
      const info = await youtubeService.getVideoInfo(url);

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error("Info error:", error.message);
      res.status(500).json({
        error: "Failed to get video info",
        details: error.message,
      });
    }
  }

async download(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Please provide a YouTube URL" });
    }

    console.log("⬇️ Download request:", url);
    
    // Pass the response object to the service
    // The service will handle streaming directly
    await youtubeService.downloadAudio(url, res);
    
    // Note: We don't send JSON here because we're streaming audio
    // The response is handled by the service
    
  } catch (error) {
    console.error("Download error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Download failed",
        details: error.message,
      });
    }
  }
}

  async stream(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, "../../uploads", filename);

      if (!await fs.pathExists(filePath)) {
        return res.status(404).json({ error: "File not found or expired" });
      }

      res.download(filePath, (err) => {
        if (err) {
          console.error("Stream error:", err);
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Stream failed" });
    }
  }
}

module.exports = new DownloadController();