// server.js - This is our main kitchen!
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const config = require("./src/config");

// Import our routes (like different counters in the kitchen)
const downloadRoutes = require("./src/routes/downloadRoutes");

// Create the express app (set up our kitchen)
const app = express();

// Middleware (like kitchen rules)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
); // Allow anyone to order from our kitchen
app.use(express.json()); // Understand JSON orders
app.use(express.urlencoded({ extended: true })); // Understand form data

// Serve static files (make downloaded files available)
app.use("/downloads", express.static(path.join(__dirname, "downloads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Use our routes (direct customers to the right counter)
app.use("/api", downloadRoutes);

// Home route (welcome message)
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to VibeMusic Backend!",
    endpoints: {
      download: "POST /api/download",
      info: "GET /api/info?url=YOUTUBE_URL",
    },
  });
});

// Error handling (when something goes wrong in kitchen)
app.use((err, req, res, next) => {
  console.error("Kitchen Error:", err);
  res.status(500).json({
    error: "Something went wrong in our kitchen!",
    details: err.message,
  });
});

// Start the server (open our restaurant)
const PORT = config.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Uploads folder: ${config.UPLOAD_DIR}`);
  // Don't log API_URL here - it's for frontend use
});