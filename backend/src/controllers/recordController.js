const supabase = require('../utils/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const blockchainService = require('../services/blockchainService');

const recordController = {
  // Get all records with pagination
  getAllRecords: async (req, res) => {
    try {
      const { page = 1, limit = 20, state, district, village } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('records')
        .select('*')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Apply filters
      if (state) query = query.eq('state', state);
      if (district) query = query.eq('district', district);
      if (village) query = query.eq('village', village);

      const { data, error, count } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        records: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single record by ID
  getRecordById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json(data);
    } catch (error) {
      console.error('Get record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create new record
  createRecord: async (req, res) => {
    try {
      const {
        pattaId,
        name,
        fatherName,
        village,
        district,
        state,
        landArea,
        landType,
        surveyNumber,
        coordinates,
        detailsJson,
        faceEmbedding,
        photoUrl,
        documentUrl
      } = req.body;

      // Validate required fields
      if (!pattaId || !name || !village || !district || !state) {
        return res.status(400).json({ 
          error: 'Patta ID, name, village, district, and state are required' 
        });
      }

      // Check if patta_id already exists
      const { data: existingRecord } = await supabase
        .from('records')
        .select('id')
        .eq('patta_id', pattaId)
        .single();

      if (existingRecord) {
        return res.status(409).json({ 
          error: 'Record with this Patta ID already exists' 
        });
      }

      const recordData = {
        id: uuidv4(),
        patta_id: pattaId,
        name,
        father_name: fatherName,
        village,
        district,
        state,
        land_area: landArea,
        land_type: landType,
        survey_number: surveyNumber,
        coordinates: coordinates || null,
        details_json: detailsJson || {},
        face_embedding: faceEmbedding,
        photo_url: photoUrl,
        document_url: documentUrl,
        verification_status: 'pending'
      };

      const { data, error } = await supabase
        .from('records')
        .insert([recordData])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Mint NFT on blockchain (async)
      try {
        const tokenId = await blockchainService.mintNFT(data.id, {
          pattaId: data.patta_id,
          name: data.name,
          coordinates: data.coordinates,
          landArea: data.land_area
        });

        // Update record with blockchain token ID
        await supabase
          .from('records')
          .update({ blockchain_token_id: tokenId })
          .eq('id', data.id);

        data.blockchain_token_id = tokenId;
      } catch (blockchainError) {
        console.error('Blockchain minting error:', blockchainError);
        // Continue without blockchain - record is still created
      }

      res.status(201).json({
        message: 'Record created successfully',
        record: data
      });
    } catch (error) {
      console.error('Create record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update record
  updateRecord: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Remove id from update data
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.blockchain_token_id; // Don't allow updating blockchain ID

      const { data, error } = await supabase
        .from('records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        message: 'Record updated successfully',
        record: data
      });
    } catch (error) {
      console.error('Update record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete record
  deleteRecord: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Record deleted successfully' });
    } catch (error) {
      console.error('Delete record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Search records by name or patta ID
  searchRecords: async (req, res) => {
    try {
      const { query: searchQuery, state } = req.query;

      if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      let query = supabase
        .from('records')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,patta_id.ilike.%${searchQuery}%`)
        .limit(20);

      if (state) {
        query = query.eq('state', state);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ records: data });
    } catch (error) {
      console.error('Search records error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get records by coordinates (for map view)
  getRecordsByArea: async (req, res) => {
    try {
      const { 
        minLat, 
        maxLat, 
        minLng, 
        maxLng, 
        state 
      } = req.query;

      if (!minLat || !maxLat || !minLng || !maxLng) {
        return res.status(400).json({ 
          error: 'Bounding box coordinates are required' 
        });
      }

      let query = supabase
        .from('records')
        .select('id, patta_id, name, village, district, state, coordinates, land_area, land_type')
        .not('coordinates', 'is', null);

      if (state) {
        query = query.eq('state', state);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Filter records within bounding box
      const filteredRecords = data.filter(record => {
        if (!record.coordinates || !record.coordinates.lat || !record.coordinates.lng) {
          return false;
        }
        
        const lat = parseFloat(record.coordinates.lat);
        const lng = parseFloat(record.coordinates.lng);
        
        return lat >= parseFloat(minLat) && 
               lat <= parseFloat(maxLat) && 
               lng >= parseFloat(minLng) && 
               lng <= parseFloat(maxLng);
      });

      res.json({ records: filteredRecords });
    } catch (error) {
      console.error('Get records by area error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = recordController;
