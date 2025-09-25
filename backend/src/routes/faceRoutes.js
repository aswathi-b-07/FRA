const express = require('express');
const faceController = require('../controllers/faceController');

const router = express.Router();

// Face recognition routes
router.post('/verify', faceController.verifyFace);
router.post('/store', faceController.storeFaceEmbedding);
router.post('/similar', faceController.findSimilarFaces);
router.get('/stats', faceController.getFaceStats);

module.exports = router;
