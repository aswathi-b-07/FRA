const supabase = require('../utils/supabaseClient');

// Helper function to calculate cosine similarity between two vectors
function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

const faceController = {
  // Verify face against stored embeddings
  verifyFace: async (req, res) => {
    try {
      const { faceEmbedding, name, threshold = 0.5 } = req.body;

      console.log('🔍 Face verification request:', { 
        embeddingLength: faceEmbedding?.length, 
        embeddingType: typeof faceEmbedding,
        isArray: Array.isArray(faceEmbedding),
        name, 
        threshold 
      });

      if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
        return res.status(400).json({ error: 'Valid face embedding array is required' });
      }

      // Get all records with face embeddings
      const { data: records, error: fetchError } = await supabase
        .from('records')
        .select('*')
        .not('face_embedding', 'is', null);

      if (fetchError) {
        console.error('❌ Failed to fetch records:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch records for verification' });
      }

      if (!records || records.length === 0) {
        console.log('❌ No records with face embeddings found');
        return res.json({
          success: false,
          message: 'No records with face data found in database',
          matches: [],
          totalRecordsChecked: 0
        });
      }

      console.log(`📊 Found ${records.length} records with face embeddings`);

      // Calculate similarities using cosine similarity
      const allComparisons = [];

      for (const record of records) {
        try {
          // Parse stored face embedding
          let storedEmbedding;
          if (typeof record.face_embedding === 'string') {
            try {
              storedEmbedding = JSON.parse(record.face_embedding);
            } catch (parseError) {
              console.warn(`⚠️ Failed to parse JSON embedding for ${record.patta_id}:`, parseError);
              continue;
            }
          } else if (Array.isArray(record.face_embedding)) {
            storedEmbedding = record.face_embedding;
          } else {
            console.warn(`⚠️ Invalid face embedding format for record ${record.patta_id}:`, typeof record.face_embedding);
            continue;
          }

          if (!Array.isArray(storedEmbedding) || storedEmbedding.length === 0) {
            console.warn(`⚠️ Invalid stored embedding array for ${record.patta_id}`);
            continue;
          }

          // Calculate cosine similarity
          const similarity = calculateCosineSimilarity(faceEmbedding, storedEmbedding);
          
          console.log(`👤 ${record.name} (${record.patta_id}): similarity = ${(similarity * 100).toFixed(2)}% (${similarity >= threshold ? 'MATCH' : 'no match'})`);

          allComparisons.push({
            ...record,
            similarity: similarity,
            distance: 1 - similarity
          });

        } catch (embeddingError) {
          console.warn(`⚠️ Error processing embedding for ${record.patta_id}:`, embeddingError);
        }
      }

      // Sort by similarity (highest first)
      allComparisons.sort((a, b) => b.similarity - a.similarity);

      // Filter by name if provided
      let filteredComparisons = allComparisons;
      if (name) {
        filteredComparisons = allComparisons.filter(record => 
          record.name.toLowerCase().includes(name.toLowerCase())
        );
        console.log(`🔍 Filtered by name "${name}": ${filteredComparisons.length} records`);
      }

      // Apply threshold filter
      const matches = filteredComparisons.filter(record => record.similarity >= threshold);

      console.log(`🎯 Matches above ${(threshold * 100).toFixed(0)}% threshold: ${matches.length}`);
      console.log('📊 Top 5 similarities:', allComparisons.slice(0, 5).map(r => 
        `${r.name} (${r.patta_id}): ${(r.similarity * 100).toFixed(2)}%`
      ));

      if (matches.length === 0) {
        const topMatch = allComparisons[0];
        return res.json({
          success: false,
          message: `No matching face found above ${(threshold * 100).toFixed(0)}% similarity threshold`,
          matches: [],
          totalRecordsChecked: records.length,
          topSimilarity: topMatch ? {
            name: topMatch.name,
            patta_id: topMatch.patta_id,
            similarity: (topMatch.similarity * 100).toFixed(2) + '%'
          } : null,
          allSimilarities: allComparisons.slice(0, 5).map(r => ({
            name: r.name,
            patta_id: r.patta_id,
            similarity: (r.similarity * 100).toFixed(2) + '%'
          }))
        });
      }

      // Return best match with similarity score
      const bestMatch = matches[0];
      const similarity = bestMatch.similarity;

      console.log(`✅ Best match: ${bestMatch.name} (${bestMatch.patta_id}) with ${(similarity * 100).toFixed(2)}% similarity`);

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
          photo_url: bestMatch.photo_url
        },
        matches: matches.slice(0, 3).map(match => ({
          patta_id: match.patta_id,
          name: match.name,
          similarity: (match.similarity * 100).toFixed(1) + '%'
        })),
        totalRecordsChecked: records.length
      });

    } catch (error) {
      console.error('💥 Face verification error:', error);
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

      console.log('💾 Storing face embedding for record:', recordId);
      console.log('🧠 Embedding details:', {
        type: typeof faceEmbedding,
        length: faceEmbedding?.length,
        isArray: Array.isArray(faceEmbedding)
      });

      if (!recordId || !faceEmbedding) {
        return res.status(400).json({ 
          error: 'Record ID and face embedding are required' 
        });
      }

      if (!Array.isArray(faceEmbedding)) {
        return res.status(400).json({ 
          error: 'Face embedding must be an array' 
        });
      }

      // Store as JSON array
      const { data, error } = await supabase
        .from('records')
        .update({ face_embedding: faceEmbedding })
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to store face embedding:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('✅ Face embedding stored successfully for:', data.name);

      res.json({
        success: true,
        message: 'Face embedding stored successfully',
        record: data
      });

    } catch (error) {
      console.error('💥 Store face embedding error:', error);
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

      if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
        return res.status(400).json({ 
          error: 'Valid face embedding array is required' 
        });
      }

      let query = supabase
        .from('records')
        .select('*')
        .not('face_embedding', 'is', null);

      if (excludeRecordId) {
        query = query.neq('id', excludeRecordId);
      }

      const { data: records, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const similarFaces = [];

      for (const record of records) {
        try {
          let storedEmbedding;
          if (typeof record.face_embedding === 'string') {
            storedEmbedding = JSON.parse(record.face_embedding);
          } else if (Array.isArray(record.face_embedding)) {
            storedEmbedding = record.face_embedding;
          } else {
            continue;
          }

          const similarity = calculateCosineSimilarity(faceEmbedding, storedEmbedding);
          
          if (similarity >= threshold) {
            similarFaces.push({
              record,
              similarity,
              confidence: similarity >= 0.9 ? 'high' : 'medium'
            });
          }
        } catch (err) {
          console.warn(`Error processing record ${record.id}:`, err);
        }
      }

      // Sort by similarity (highest first)
      similarFaces.sort((a, b) => b.similarity - a.similarity);

      res.json({
        success: true,
        similarFaces: similarFaces.map(sf => ({
          record: {
            id: sf.record.id,
            patta_id: sf.record.patta_id,
            name: sf.record.name,
            village: sf.record.village,
            district: sf.record.district
          },
          similarity: sf.similarity,
          confidence: sf.confidence
        })),
        totalFound: similarFaces.length
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
      // Get total records
      const { count: totalRecords, error: totalError } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw totalError;
      }

      // Get records with face embeddings
      const { count: recordsWithFaces, error: facesError } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .not('face_embedding', 'is', null);

      if (facesError) {
        throw facesError;
      }

      // Calculate percentage
      const facePercentage = totalRecords > 0 ? (recordsWithFaces / totalRecords * 100).toFixed(1) : 0;

      res.json({
        success: true,
        stats: {
          totalRecords: totalRecords || 0,
          recordsWithFaces: recordsWithFaces || 0,
          facePercentage: parseFloat(facePercentage),
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get face stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get face statistics',
        details: error.message 
      });
    }
  }
};

module.exports = faceController;