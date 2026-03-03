const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Create uploads directory
const uploadsDir = path.join(__dirname, "uploads");
fs.ensureDirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Import routes
const downloadRoutes = require("./src/routes/downloadRoutes");
app.use("/api", downloadRoutes);

// Start cleanup service
require("./src/utils/fileCleanup");

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "online", 
    time: new Date().toISOString(),
    server: "VibeMusic API",
    endpoints: {
      info: "/api/info?url=YOUTUBE_URL",
      download: "POST /api/download",
      stream: "/api/stream/:filename",
      test: "/api/test"
    }
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🎵 VibeMusic Backend API",
    status: "running",
    docs: "/health for endpoints"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ error: err.message });
});

// IMPORTANT: Use PORT from environment variable (Zeabur sets this)
const PORT = process.env.PORT || 8080;

// IMPORTANT: Bind to 0.0.0.0 (required for Zeabur)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ VibeMusic API running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});