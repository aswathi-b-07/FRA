const express = require('express');
const ocrController = require('../controllers/ocrController');

const router = express.Router();

// OCR processing routes
router.post('/process', ocrController.processDocument);
router.post('/process-text', ocrController.processText);

module.exports = router;
