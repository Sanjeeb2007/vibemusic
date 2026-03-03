// src/routes/downloadRoutes.js - This is our menu!
console.log("🚀 Loading downloadRoutes module");
const express = require("express");
const router = express.Router();
console.log("✅ downloadRoutes router created");
const downloadController = require("../controllers/downloadController");

// Route to get video info (GET request - like looking at menu)
router.get("/info", (req, res) => downloadController.getInfo(req, res));

router.get("/test", (req, res) => {
  res.json({ message: "Route test working" });
});

// Route to download (POST request - like placing an order)
router.post("/download", (req, res) => downloadController.download(req, res));

// Route to stream file (GET request - like picking up your order)
router.get("/stream/:filename", (req, res) =>
  downloadController.stream(req, res),
);

// Remove this if you don't have proxyDownload method
// router.get("/proxy", (req, res) => downloadController.proxyDownload(req, res));

try {
  console.log("✅ Routes defined in downloadRoutes");
} catch (err) {
  console.error("❌ Error defining routes:", err);
}

console.log("🚀 downloadRoutes module loaded successfully");

module.exports = router;