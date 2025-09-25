const supabase = require('../utils/supabaseClient');

const faceController = {
  // Verify face against stored embeddings
  verifyFace: async (req, res) => {
    try {
      const { faceEmbedding, name, threshold = 0.8 } = req.body;

      if (!faceEmbedding) {
        return res.status(400).json({ error: 'Face embedding is required' });
      }

      // Convert embedding to vector format for database query
      const embeddingVector = `[${faceEmbedding.join(',')}]`;

      let query = `
        SELECT *, 
        (face_embedding <=> '${embeddingVector}'::vector) as distance
        FROM records 
        WHERE face_embedding IS NOT NULL
      `;

      if (name) {
        query += ` AND name ILIKE '%${name}%'`;
      }

      query += ` ORDER BY face_embedding <=> '${embeddingVector}'::vector LIMIT 10`;

      const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: query 
      });

      if (error) {
        console.error('Face verification query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }

      // Filter results by similarity threshold
      const matches = data.filter(record => {
        const similarity = 1 - record.distance; // Convert distance to similarity
        return similarity >= threshold;
      });

      if (matches.length === 0) {
        return res.json({
          success: false,
          message: 'No matching face found',
          matches: []
        });
      }

      // Return best match with similarity score
      const bestMatch = matches[0];
      const similarity = 1 - bestMatch.distance;

      res.json({
        success: true,
        message: 'Face verified successfully',
        similarity: similarity,
        record: {
          id: bestMatch.id,
          patta_id: bestMatch.patta_id,
          name: bestMatch.name,
          father_name: bestMatch.father_name,
          village: bestMatch.village,
          district: bestMatch.district,
          state: bestMatch.state,
          photo_url: bestMatch.photo_url,
          blockchain_token_id: bestMatch.blockchain_token_id
        },
        allMatches: matches.map(match => ({
          id: match.id,
          name: match.name,
          similarity: 1 - match.distance,
          patta_id: match.patta_id
        }))
      });

    } catch (error) {
      console.error('Face verification error:', error);
      res.status(500).json({ 
        error: 'Face verification failed',
        details: error.message 
      });
    }
  },

  // Store face embedding for a record
  storeFaceEmbedding: async (req, res) => {
    try {
      const { recordId, faceEmbedding } = req.body;

      if (!recordId || !faceEmbedding) {
        return res.status(400).json({ 
          error: 'Record ID and face embedding are required' 
        });
      }

      // Convert embedding to vector format
      const embeddingVector = `[${faceEmbedding.join(',')}]`;

      const { data, error } = await supabase
        .from('records')
        .update({ face_embedding: embeddingVector })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        success: true,
        message: 'Face embedding stored successfully',
        record: data
      });

    } catch (error) {
      console.error('Store face embedding error:', error);
      res.status(500).json({ 
        error: 'Failed to store face embedding',
        details: error.message 
      });
    }
  },

  // Find similar faces (for duplicate detection)
  findSimilarFaces: async (req, res) => {
    try {
      const { faceEmbedding, threshold = 0.9, excludeRecordId } = req.body;

      if (!faceEmbedding) {
        return res.status(400).json({ error: 'Face embedding is required' });
      }

      const embeddingVector = `[${faceEmbedding.join(',')}]`;

      let query = `
        SELECT id, patta_id, name, village, district, state, photo_url,
        (face_embedding <=> '${embeddingVector}'::vector) as distance
        FROM records 
        WHERE face_embedding IS NOT NULL
      `;

      if (excludeRecordId) {
        query += ` AND id != '${excludeRecordId}'`;
      }

      query += ` ORDER BY face_embedding <=> '${embeddingVector}'::vector LIMIT 20`;

      const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: query 
      });

      if (error) {
        console.error('Similar faces query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }

      // Filter by similarity threshold
      const similarFaces = data
        .filter(record => (1 - record.distance) >= threshold)
        .map(record => ({
          id: record.id,
          patta_id: record.patta_id,
          name: record.name,
          village: record.village,
          district: record.district,
          state: record.state,
          photo_url: record.photo_url,
          similarity: 1 - record.distance
        }));

      res.json({
        success: true,
        similarFaces: similarFaces,
        count: similarFaces.length
      });

    } catch (error) {
      console.error('Find similar faces error:', error);
      res.status(500).json({ 
        error: 'Failed to find similar faces',
        details: error.message 
      });
    }
  },

  // Get face recognition statistics
  getFaceStats: async (req, res) => {
    try {
      // Count records with face embeddings
      const { data: withFaces, error: withFacesError } = await supabase
        .from('records')
        .select('id', { count: 'exact' })
        .not('face_embedding', 'is', null);

      // Count total records
      const { data: totalRecords, error: totalError } = await supabase
        .from('records')
        .select('id', { count: 'exact' });

      if (withFacesError || totalError) {
        return res.status(500).json({ error: 'Failed to get statistics' });
      }

      const withFacesCount = withFaces?.length || 0;
      const totalCount = totalRecords?.length || 0;
      const withoutFacesCount = totalCount - withFacesCount;

      res.json({
        totalRecords: totalCount,
        recordsWithFaces: withFacesCount,
        recordsWithoutFaces: withoutFacesCount,
        faceRecognitionCoverage: totalCount > 0 ? (withFacesCount / totalCount * 100).toFixed(2) : 0
      });

    } catch (error) {
      console.error('Get face stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get face recognition statistics',
        details: error.message 
      });
    }
  }
};

module.exports = faceController;
