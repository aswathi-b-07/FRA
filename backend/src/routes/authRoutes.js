const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Authentication routes
router.post('/signup', authController.signup);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);

module.exports = router;
