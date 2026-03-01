const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log("🚀 Starting server...");
console.log("Current directory:", __dirname);
console.log("Node version:", process.version);

try {
  // Try to load dependencies with error handling
  const modules = {
    express: () => require("express"),
    cors: () => require("cors"),
    dotenv: () => require("dotenv"),
    // Add others as needed
  };

  for (const [name, loader] of Object.entries(modules)) {
    try {
      loader();
      console.log(`✅ Module ${name} loaded`);
    } catch (err) {
      console.error(`❌ Failed to load ${name}:`, err.message);
    }
  }
} catch (err) {
  console.error("❌ Dependency check failed:", err);
}

// Add process-level error handlers
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
});

try {
  console.log("🚀 Starting server initialization...");

  const config = require("./src/config");
  console.log("✅ Config loaded:", {
    port: config.PORT,
    isDev: config.isDev,
    uploadDir: config.UPLOAD_DIR,
  });

  const downloadRoutes = require("./src/routes/downloadRoutes");
  console.log("✅ Routes loaded");

  const app = express();
  console.log("✅ Express app created");

  // Middleware
  app.use(cors({ origin: "*" }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  console.log("✅ Middleware configured");

  // Static folders
  app.use("/downloads", express.static(path.join(__dirname, "downloads")));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  console.log("✅ Static folders configured");

  // Routes
  app.use("/api", downloadRoutes);
  console.log("✅ API routes mounted");

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", time: Date.now() });
  });

  app.get("/", (req, res) => {
    res.json({ message: "VibeMusic Backend Running" });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("❌ App error:", err);
    res.status(500).json({ error: err.message });
  });

  const PORT = config.PORT || 3000;

  // Start server with error handling
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅✅✅ SERVER STARTED SUCCESSFULLY on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  });

  server.on("error", (err) => {
    console.error("❌ Server failed to start:", err);
  });
} catch (err) {
  console.error("❌ CRITICAL ERROR DURING STARTUP:", err);
  console.error(err.stack);
  process.exit(1);
}
