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
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'VibeMusic API is running',
    version: '1.0.0',
    status: 'healthy',
    endpoints: ['/health', '/api/test', '/api/info', '/api/download', '/api/stream']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ error: err.message });
});

// START SERVER IMMEDIATELY
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ VibeMusic API running on port ${PORT}`);
  console.log(`🌐 Server ready on 0.0.0.0:${PORT}`);
});

// Load slow services AFTER server starts (background)
setTimeout(() => {
  console.log("🚀 Loading background services...");
  require("./src/utils/fileCleanup");
  // Pre-load youtube service in background
  const youtubeService = require("./src/services/youtubeService");
  console.log("✅ Background services loaded");
}, 1000);