const supabase = require('../utils/supabaseClient');

const mapController = {
  // Get GeoJSON data for a state
  getStateGeoJSON: async (req, res) => {
    try {
      const { state } = req.params;
      
      const validStates = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana'];
      if (!validStates.includes(state)) {
        return res.status(400).json({ error: 'Invalid state' });
      }

      // In a real implementation, this would fetch actual GeoJSON data
      // For now, return mock boundary data
      const mockGeoJSON = getMockStateGeoJSON(state);

      res.json({
        type: 'FeatureCollection',
        features: [mockGeoJSON]
      });

    } catch (error) {
      console.error('Get state GeoJSON error:', error);
      res.status(500).json({ error: 'Failed to get state boundaries' });
    }
  },

  // Get FRA areas with records
  getFRAreas: async (req, res) => {
    try {
      const { state, district, landType } = req.query;

      let query = supabase
        .from('records')
        .select('id, patta_id, name, village, district, state, coordinates, land_area, land_type')
        .not('coordinates', 'is', null);

      if (state) query = query.eq('state', state);
      if (district) query = query.eq('district', district);
      if (landType) query = query.eq('land_type', landType);

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Convert records to GeoJSON format
      const features = data.map(record => ({
        type: 'Feature',
        properties: {
          id: record.id,
          pattaId: record.patta_id,
          name: record.name,
          village: record.village,
          district: record.district,
          state: record.state,
          landArea: record.land_area,
          landType: record.land_type
        },
        geometry: {
          type: 'Point',
          coordinates: [record.coordinates.lng, record.coordinates.lat]
        }
      }));

      res.json({
        type: 'FeatureCollection',
        features: features
      });

    } catch (error) {
      console.error('Get FRA areas error:', error);
      res.status(500).json({ error: 'Failed to get FRA areas' });
    }
  },

  // AI-powered asset detection (mock implementation)
  detectAssets: async (req, res) => {
    try {
      const { imageData, coordinates, analysisType = 'comprehensive' } = req.body;

      if (!imageData || !coordinates) {
        return res.status(400).json({ 
          error: 'Image data and coordinates are required' 
        });
      }

      // Mock asset detection results
      const detectedAssets = getMockAssetDetection(coordinates, analysisType);

      res.json({
        success: true,
        coordinates: coordinates,
        analysisType: analysisType,
        detectedAssets: detectedAssets,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Asset detection error:', error);
      res.status(500).json({ error: 'Failed to detect assets' });
    }
  },

  // Get available map layers
  getMapLayers: async (req, res) => {
    try {
      const layers = [
        {
          id: 'fra_records',
          name: 'FRA Records',
          type: 'point',
          description: 'Individual and community forest rights records',
          visible: true,
          color: '#2563eb'
        },
        {
          id: 'forest_boundaries',
          name: 'Forest Boundaries',
          type: 'polygon',
          description: 'Official forest area boundaries',
          visible: true,
          color: '#059669'
        },
        {
          id: 'village_boundaries',
          name: 'Village Boundaries',
          type: 'polygon',
          description: 'Administrative village boundaries',
          visible: false,
          color: '#7c3aed'
        },
        {
          id: 'protected_areas',
          name: 'Protected Areas',
          type: 'polygon',
          description: 'National parks, wildlife sanctuaries',
          visible: false,
          color: '#dc2626'
        },
        {
          id: 'water_bodies',
          name: 'Water Bodies',
          type: 'polygon',
          description: 'Rivers, lakes, reservoirs',
          visible: false,
          color: '#0891b2'
        },
        {
          id: 'land_use',
          name: 'Land Use Classification',
          type: 'raster',
          description: 'Agricultural, forest, barren land classification',
          visible: false,
          opacity: 0.7
        }
      ];

      res.json({ layers });

    } catch (error) {
      console.error('Get map layers error:', error);
      res.status(500).json({ error: 'Failed to get map layers' });
    }
  }
};

// Helper functions for mock data
function getMockStateGeoJSON(state) {
  const stateCoordinates = {
    'Madhya Pradesh': {
      center: [78.6569, 22.9734],
      bounds: [[74.0, 21.0], [82.0, 26.0]]
    },
    'Tripura': {
      center: [91.9882, 23.9408],
      bounds: [[91.0, 22.9], [92.5, 24.5]]
    },
    'Odisha': {
      center: [85.0985, 20.9517],
      bounds: [[81.0, 17.8], [87.5, 22.6]]
    },
    'Telangana': {
      center: [79.0193, 18.1124],
      bounds: [[77.0, 15.8], [81.3, 19.9]]
    }
  };

  const stateData = stateCoordinates[state];
  
  // Create a simple rectangular boundary (in real app, use actual state boundaries)
  const [[minLng, minLat], [maxLng, maxLat]] = stateData.bounds;
  
  return {
    type: 'Feature',
    properties: {
      name: state,
      type: 'state_boundary'
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ]]
    }
  };
}

function getMockAssetDetection(coordinates, analysisType) {
  const assets = [];
  
  // Mock forest coverage
  assets.push({
    type: 'forest',
    coverage: Math.random() * 0.6 + 0.2, // 20-80% coverage
    confidence: 0.88,
    area: Math.random() * 50 + 10, // 10-60 hectares
    health: ['dense', 'moderate', 'sparse'][Math.floor(Math.random() * 3)]
  });

  // Mock water bodies
  if (Math.random() > 0.6) {
    assets.push({
      type: 'water',
      coverage: Math.random() * 0.3 + 0.05, // 5-35% coverage
      confidence: 0.92,
      area: Math.random() * 20 + 2, // 2-22 hectares
      source: ['river', 'pond', 'reservoir'][Math.floor(Math.random() * 3)]
    });
  }

  // Mock agricultural land
  assets.push({
    type: 'agriculture',
    coverage: Math.random() * 0.4 + 0.1, // 10-50% coverage
    confidence: 0.85,
    area: Math.random() * 30 + 5, // 5-35 hectares
    cropType: ['rice', 'wheat', 'cotton', 'sugarcane'][Math.floor(Math.random() * 4)]
  });

  // Mock built-up areas
  if (Math.random() > 0.7) {
    assets.push({
      type: 'built_up',
      coverage: Math.random() * 0.2 + 0.02, // 2-22% coverage
      confidence: 0.90,
      area: Math.random() * 10 + 1, // 1-11 hectares
      density: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
  }

  return assets;
}

module.exports = mapController;
