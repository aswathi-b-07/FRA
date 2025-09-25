const express = require('express');
const recordController = require('../controllers/recordController');

const router = express.Router();

// Record CRUD routes
router.get('/', recordController.getAllRecords);
router.get('/search', recordController.searchRecords);
router.get('/area', recordController.getRecordsByArea);
router.get('/:id', recordController.getRecordById);
router.post('/', recordController.createRecord);
router.put('/:id', recordController.updateRecord);
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
