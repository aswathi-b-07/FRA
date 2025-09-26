import * as faceapi from '@vladmandic/face-api'
import { createHash } from 'crypto-browserify'

class FaceEmbeddingUtils {
  constructor() {
    this.modelsLoaded = false
    this.modelPath = '/models'
  }

  async loadModels() {
    if (this.modelsLoaded) return

    try {
      console.log('Loading face embedding models...')
      
      // Load required models for embeddings
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath)
      ])

      this.modelsLoaded = true
      console.log('Face embedding models loaded successfully')
    } catch (error) {
      console.error('Failed to load face embedding models:', error)
      throw new Error('Face embedding models failed to load')
    }
  }

  /**
   * Extract face embedding from a canvas region (detected face)
   * @param {HTMLVideoElement} video - Source video element
   * @param {Object} faceRect - Face rectangle {x, y, width, height}
   * @returns {Promise<Float32Array>} - 128D face embedding
   */
  async extractEmbeddingFromRegion(video, faceRect) {
    if (!this.modelsLoaded) {
      await this.loadModels()
    }

    try {
      // Create canvas from video frame
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Crop face region with padding
      const padding = 20
      const faceCanvas = document.createElement('canvas')
      const faceCtx = faceCanvas.getContext('2d')
      
      const cropX = Math.max(0, faceRect.x - padding)
      const cropY = Math.max(0, faceRect.y - padding)
      const cropWidth = Math.min(canvas.width - cropX, faceRect.width + 2 * padding)
      const cropHeight = Math.min(canvas.height - cropY, faceRect.height + 2 * padding)
      
      faceCanvas.width = cropWidth
      faceCanvas.height = cropHeight
      
      faceCtx.drawImage(
        canvas, 
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      // Extract embedding using face-api.js
      const detection = await faceapi
        .detectSingleFace(faceCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        throw new Error('No face detected in cropped region')
      }

      return detection.descriptor
    } catch (error) {
      console.error('Embedding extraction error:', error)
      throw error
    }
  }

  /**
   * Generate multiple embeddings from different angles/crops for robustness
   * @param {HTMLVideoElement} video 
   * @param {Object} faceRect 
   * @returns {Promise<Array<Float32Array>>}
   */
  async extractMultipleEmbeddings(video, faceRect) {
    const embeddings = []
    const variations = [
      { padding: 10, scale: 1.0 },
      { padding: 20, scale: 1.1 },
      { padding: 30, scale: 0.9 }
    ]

    for (const variation of variations) {
      try {
        const embedding = await this.extractEmbeddingFromRegion(video, {
          x: faceRect.x - variation.padding,
          y: faceRect.y - variation.padding,
          width: faceRect.width * variation.scale,
          height: faceRect.height * variation.scale
        })
        embeddings.push(embedding)
      } catch (error) {
        console.debug('Failed to extract embedding variation:', error)
      }
    }

    return embeddings
  }

  /**
   * Convert embedding to secure hash for privacy
   * @param {Float32Array} embedding 
   * @returns {string} - SHA-256 hash of embedding
   */
  hashEmbedding(embedding) {
    const embeddingArray = Array.from(embedding)
    const embeddingString = embeddingArray.join(',')
    return createHash('sha256').update(embeddingString).digest('hex')
  }

  /**
   * Normalize embedding for consistent storage
   * @param {Float32Array} embedding 
   * @returns {Array<number>}
   */
  normalizeEmbedding(embedding) {
    const array = Array.from(embedding)
    const magnitude = Math.sqrt(array.reduce((sum, val) => sum + val * val, 0))
    return magnitude > 0 ? array.map(val => val / magnitude) : array
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array<number>} embedding1 
   * @param {Array<number>} embedding2 
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    norm1 = Math.sqrt(norm1)
    norm2 = Math.sqrt(norm2)

    if (norm1 === 0 || norm2 === 0) return 0
    return dotProduct / (norm1 * norm2)
  }

  /**
   * Validate embedding quality
   * @param {Float32Array} embedding 
   * @returns {boolean}
   */
  validateEmbedding(embedding) {
    if (!embedding || embedding.length !== 128) return false
    
    const array = Array.from(embedding)
    const isAllZeros = array.every(val => val === 0)
    const hasNaN = array.some(val => isNaN(val))
    const hasInfinite = array.some(val => !isFinite(val))
    
    return !isAllZeros && !hasNaN && !hasInfinite
  }
}

export default new FaceEmbeddingUtils()
