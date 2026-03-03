const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); // You need this for POST requests

// Create uploads directory
const uploadsDir = path.join(__dirname, "uploads");
fs.ensureDirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Import YOUR routes
const downloadRoutes = require("./src/routes/downloadRoutes");
app.use("/api", downloadRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "online", server: "VibeMusic API" });
});

// Keep your streaming endpoint if needed, or remove if using controller
app.get("/stream", async (req, res) => {
  try {
    const ytdl = require("@distube/ytdl-core");
    const ffmpeg = require("fluent-ffmpeg");
    const ffmpegStatic = require("ffmpeg-static");
    
    ffmpeg.setFfmpegPath(ffmpegStatic);
    
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL required" });

    const info = await ytdl.getInfo(url, {
      agent: ytdl.createAgent([{
        domain: ".youtube.com",
        name: "CONSENT",
        value: "YES+cb.20210328-17-p0.en+FX+{}",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "no_restriction",
        hostOnly: false,
        expirationDate: 9999999999
      }])
    });

    const safeTitle = info.videoDetails.title
      .replace(/[^\w\s]/gi, '')
      .substring(0, 50);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    
    console.log(`🎵 Streaming: ${info.videoDetails.title}`);

    const stream = ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
      agent: ytdl.createAgent([{
        domain: ".youtube.com",
        name: "CONSENT",
        value: "YES+cb.20210328-17-p0.en+FX+{}",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "no_restriction",
        hostOnly: false,
        expirationDate: 9999999999
      }])
    });

    ffmpeg(stream)
      .audioBitrate(128)
      .format("mp3")
      .on("error", (err) => {
        console.error("❌ Error:", err.message);
      })
      .pipe(res);

  } catch (error) {
    console.error("❌ Stream error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ VibeMusic API running on port ${PORT}`);
});