// src/routes/downloadRoutes.js - This is our menu!
const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

// Route to get video info (GET request - like looking at menu)
router.get('/info', (req, res) => downloadController.getInfo(req, res));

// Route to download (POST request - like placing an order)
router.post('/download', (req, res) => downloadController.download(req, res));

// Route to stream file (GET request - like picking up your order)
router.get('/stream/:filename', (req, res) => downloadController.stream(req, res));

router.get('/proxy', (req, res) => downloadController.proxyDownload(req, res));

module.exports = router;