const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

// AI service routes
router.post('/policy-recommendations', aiController.generatePolicyRecommendations);
router.post('/conflict-analysis', aiController.analyzeConflict);
router.post('/gram-sabha-assistant', aiController.gramSabhaAssistant);
router.post('/fraud-detection', aiController.detectFraud);
router.get('/insights', aiController.getAIInsights);

module.exports = router;
