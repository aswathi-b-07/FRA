const express = require('express');
const mapController = require('../controllers/mapController');

const router = express.Router();

// Map and GIS routes
router.get('/geojson/:state', mapController.getStateGeoJSON);
router.get('/fra-areas', mapController.getFRAreas);
router.post('/asset-detection', mapController.detectAssets);
router.get('/layers', mapController.getMapLayers);

module.exports = router;
