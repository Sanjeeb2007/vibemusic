// src/controllers/downloadController.js - This handles customer orders!
const ytDlpService = require("../services/ytDlpService");
const path = require("path");
const config = require("../config");

class DownloadController {
  // Get video info (customer asks: "What's this video about?")
  async getInfo(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          error: "Please provide a YouTube URL",
        });
      }

      console.log("📝 Getting info for:", url);
      const info = await ytDlpService.getVideoInfo(url);

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error("Info error:", error);
      res.status(500).json({
        error: "Failed to get video info",
        details: error.message,
      });
    }
  }

  // Download video as MP3 (customer orders: "Make this an MP3!")
  async download(req, res) {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          error: "Please provide a YouTube URL",
        });
      }

      console.log("⬇️ Download request for:", url);
      console.log("📦 Request body:", req.body);

      // Start the download process
      const result = await ytDlpService.downloadAudio(url);
      console.log("✅ Download successful:", result.fileName);

      const encodedFilename = encodeURIComponent(result.fileName);
      const downloadUrl = `${config.API_URL}/uploads/${encodedFilename}`;

      console.log("📤 Sending download URL:", downloadUrl);

      // Send success response
      res.json({
        success: true,
        message: "Download complete!",
        data: {
          ...result,
          downloadUrl,
        },
      });
    } catch (error) {
      console.error("Download error:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        error: "Download failed",
        details: error.message,
      });
    }
  }

  // Stream the file directly (like serving food immediately)
  async stream(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, "../../uploads", filename);

      res.download(filePath, (err) => {
        if (err) {
          console.error("Stream error:", err);
          res.status(404).json({ error: "File not found" });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Stream failed" });
    }
  }
}

module.exports = new DownloadController();
