import { supabase } from './supabaseService'
import faceEmbeddingUtils from '../utils/faceEmbeddingUtils'

class FaceEmbeddingService {
  constructor() {
    this.encryptionKey = null
  }

  /**
   * Initialize encryption key (derived from user session)
   * @param {string} sessionToken - User session token
   */
  async initializeEncryption(sessionToken) {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(sessionToken + 'face_embedding_salt')
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = new Uint8Array(hashBuffer)
      this.encryptionKey = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
      throw new Error('Encryption initialization failed')
    }
  }

  /**
   * Store face embedding securely in Supabase
   * @param {string} recordId - Record UUID
   * @param {Float32Array} embedding - Face embedding vector
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} - Embedding ID
   */
  async storeEmbedding(recordId, embedding, metadata = {}) {
    try {
      // Validate embedding
      if (!faceEmbeddingUtils.validateEmbedding(embedding)) {
        throw new Error('Invalid embedding provided')
      }

      // Normalize embedding
      const normalizedEmbedding = faceEmbeddingUtils.normalizeEmbedding(embedding)
      
      // Check for consent
      if (!metadata.consentGiven) {
        console.warn('Storing embedding without explicit consent')
      }

      // Call secure storage function
      const { data, error } = await supabase.rpc('store_face_embedding', {
        p_record_id: recordId,
        p_embedding: normalizedEmbedding,
        p_quality_score: metadata.qualityScore || null,
        p_detection_confidence: metadata.detectionConfidence || null,
        p_consent_given: metadata.consentGiven || false
      })

      if (error) throw error

      // Log successful storage
      await this.logAccess(data, 'store', true)

      return data
    } catch (error) {
      console.error('Failed to store embedding:', error)
      await this.logAccess(null, 'store', false, error.message)
      throw error
    }
  }

  /**
   * Find similar faces using vector similarity
   * @param {Float32Array} queryEmbedding - Query embedding
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar faces
   */
  async findSimilarFaces(queryEmbedding, options = {}) {
    try {
      const {
        threshold = 0.8,
        limit = 10,
        includeMetadata = false
      } = options

      // Validate query embedding
      if (!faceEmbeddingUtils.validateEmbedding(queryEmbedding)) {
        throw new Error('Invalid query embedding')
      }

      const normalizedEmbedding = faceEmbeddingUtils.normalizeEmbedding(queryEmbedding)

      // Search for similar faces
      const { data, error } = await supabase.rpc('find_similar_faces', {
        p_query_embedding: normalizedEmbedding,
        p_similarity_threshold: threshold,
        p_limit: limit
      })

      if (error) throw error

      // Enrich results with metadata if requested
      if (includeMetadata && data.length > 0) {
        const recordIds = data.map(item => item.record_id)
        const { data: records, error: recordError } = await supabase
          .from('records')
          .select('id, name, patta_id, village, district, state')
          .in('id', recordIds)

        if (!recordError) {
          data.forEach(item => {
            const record = records.find(r => r.id === item.record_id)
            if (record) {
              item.recordMetadata = record
            }
          })
        }
      }

      return data
    } catch (error) {
      console.error('Similar faces search failed:', error)
      throw error
    }
  }

  /**
   * Verify face against stored embeddings
   * @param {Float32Array} queryEmbedding - Query embedding
   * @param {string} recordId - Specific record to verify against
   * @param {number} threshold - Similarity threshold
   * @returns {Promise<Object>} - Verification result
   */
  async verifyFace(queryEmbedding, recordId, threshold = 0.85) {
    try {
      // Get stored embedding for the record
      const { data: storedEmbeddings, error } = await supabase
        .from('face_embeddings')
        .select('id, embedding_vector, quality_score, detection_confidence')
        .eq('record_id', recordId)
        .eq('consent_given', true)
        .order('quality_score', { ascending: false })
        .limit(1)

      if (error) throw error

      if (!storedEmbeddings || storedEmbeddings.length === 0) {
        return {
          verified: false,
          reason: 'No stored embedding found',
          similarity: 0
        }
      }

      const storedEmbedding = storedEmbeddings[0].embedding_vector
      const similarity = faceEmbeddingUtils.calculateSimilarity(
        Array.from(queryEmbedding),
        storedEmbedding
      )

      const verified = similarity >= threshold

      // Log verification attempt
      await this.logAccess(storedEmbeddings[0].id, 'verify', verified)

      return {
        verified,
        similarity,
        confidence: storedEmbeddings[0].detection_confidence,
        quality: storedEmbeddings[0].quality_score,
        embeddingId: storedEmbeddings[0].id
      }
    } catch (error) {
      console.error('Face verification failed:', error)
      await this.logAccess(null, 'verify', false, error.message)
      throw error
    }
  }

  /**
   * Update embedding metadata
   * @param {string} embeddingId - Embedding UUID
   * @param {Object} updates - Fields to update
   */
  async updateEmbedding(embeddingId, updates) {
    try {
      const allowedFields = [
        'quality_score',
        'detection_confidence',
        'consent_given',
        'retention_expires'
      ]

      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key]
          return obj
        }, {})

      const { error } = await supabase
        .from('face_embeddings')
        .update(filteredUpdates)
        .eq('id', embeddingId)

      if (error) throw error

      await this.logAccess(embeddingId, 'update', true)
    } catch (error) {
      console.error('Failed to update embedding:', error)
      await this.logAccess(embeddingId, 'update', false, error.message)
      throw error
    }
  }

  /**
   * Delete embedding (GDPR compliance)
   * @param {string} embeddingId - Embedding UUID
   */
  async deleteEmbedding(embeddingId) {
    try {
      const { error } = await supabase
        .from('face_embeddings')
        .delete()
        .eq('id', embeddingId)

      if (error) throw error

      await this.logAccess(embeddingId, 'delete', true)
    } catch (error) {
      console.error('Failed to delete embedding:', error)
      await this.logAccess(embeddingId, 'delete', false, error.message)
      throw error
    }
  }

  /**
   * Get embedding statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    try {
      const { data, error } = await supabase
        .from('face_embeddings')
        .select('id, quality_score, detection_confidence, created_at, consent_given')

      if (error) throw error

      const stats = {
        total: data.length,
        withConsent: data.filter(e => e.consent_given).length,
        averageQuality: data.reduce((sum, e) => sum + (e.quality_score || 0), 0) / data.length,
        averageConfidence: data.reduce((sum, e) => sum + (e.detection_confidence || 0), 0) / data.length,
        recentCount: data.filter(e => {
          const createdAt = new Date(e.created_at)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return createdAt > dayAgo
        }).length
      }

      return stats
    } catch (error) {
      console.error('Failed to get statistics:', error)
      throw error
    }
  }

  /**
   * Log access for audit trail
   * @param {string} embeddingId - Embedding ID
   * @param {string} accessType - Type of access
   * @param {boolean} success - Whether operation succeeded
   * @param {string} errorMessage - Error message if failed
   */
  async logAccess(embeddingId, accessType, success, errorMessage = null) {
    try {
      await supabase
        .from('face_embedding_access_log')
        .insert({
          embedding_id: embeddingId,
          access_type: accessType,
          success,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          error_message: errorMessage
        })
    } catch (error) {
      console.error('Failed to log access:', error)
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Get client IP address for logging
   * @returns {Promise<string>}
   */
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Batch process multiple embeddings
   * @param {Array} embeddingData - Array of {recordId, embedding, metadata}
   * @returns {Promise<Array>} - Results
   */
  async batchStoreEmbeddings(embeddingData) {
    const results = []
    const batchSize = 10

    for (let i = 0; i < embeddingData.length; i += batchSize) {
      const batch = embeddingData.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (item) => {
        try {
          const embeddingId = await this.storeEmbedding(
            item.recordId,
            item.embedding,
            item.metadata
          )
          return { success: true, embeddingId, recordId: item.recordId }
        } catch (error) {
          return { success: false, error: error.message, recordId: item.recordId }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < embeddingData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }
}

export default new FaceEmbeddingService()
