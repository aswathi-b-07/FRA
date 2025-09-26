import faceEmbeddingUtils from './faceEmbeddingUtils'
import faceEmbeddingService from '../services/faceEmbeddingService'
import faceDetectionDebugger from './faceDetectionDebugger'

class OpenCVFaceProcessor {
  constructor() {
    this.isInitialized = false
    this.classifier = null
    this.videoCapture = null
    this.mats = {
      src: null,
      dst: null,
      gray: null,
      faces: null
    }
    this.processingActive = false
    this.faceDetectedCallback = null
    this.embeddingExtractedCallback = null
    this.errorCallback = null
    
    // Detection state
    this.consecutiveDetections = 0
    this.lastDetectionTime = 0
    this.detectionHistory = []
    this.autoCapture = {
      enabled: true,
      delay: 5000, // 5 seconds
      startTime: null
    }
  }

  /**
   * Initialize OpenCV and load Haar cascade
   * @param {string} cascadeUrl - URL to Haar cascade XML
   * @returns {Promise<boolean>}
   */
  async initialize(cascadeUrl = 'https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml') {
    try {
      if (this.isInitialized) return true

      faceDetectionDebugger.log('info', 'Starting OpenCV Face Processor initialization...')
      
      // Wait for OpenCV to be ready
      if (!window.cv) {
        faceDetectionDebugger.logOpenCVInit(false, new Error('OpenCV.js not loaded'))
        throw new Error('OpenCV.js not loaded')
      }

      await new Promise((resolve) => {
        if (window.cv.Mat) {
          resolve()
        } else {
          window.cv.onRuntimeInitialized = resolve
        }
      })

      // Load Haar cascade
      const response = await fetch(cascadeUrl)
      const cascadeData = await response.arrayBuffer()
      const data8 = new Uint8Array(cascadeData)
      
      try {
        window.cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data8, true, false, false)
      } catch (e) {
        // File might already exist
      }

      this.classifier = new window.cv.CascadeClassifier()
      if (!this.classifier.load('haarcascade_frontalface_default.xml')) {
        throw new Error('Failed to load Haar cascade')
      }

      // Initialize face embedding utils
      await faceEmbeddingUtils.loadModels()

      this.isInitialized = true
      console.log('OpenCV Face Processor initialized successfully')
      return true
    } catch (error) {
      console.error('OpenCV Face Processor initialization failed:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Start processing video stream
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {HTMLCanvasElement} outputCanvas - Canvas for output
   * @param {Object} callbacks - Event callbacks
   */
  async startProcessing(videoElement, outputCanvas, callbacks = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Processor not initialized')
      }

      this.faceDetectedCallback = callbacks.onFaceDetected
      this.embeddingExtractedCallback = callbacks.onEmbeddingExtracted
      this.errorCallback = callbacks.onError

      // Initialize OpenCV objects
      const cv = window.cv
      const vw = videoElement.videoWidth
      const vh = videoElement.videoHeight

      this.videoCapture = new cv.VideoCapture(videoElement)
      this.mats.src = new cv.Mat(vh, vw, cv.CV_8UC4)
      this.mats.dst = new cv.Mat(vh, vw, cv.CV_8UC4)
      this.mats.gray = new cv.Mat()
      this.mats.faces = new cv.RectVector()

      // Set canvas size
      outputCanvas.width = vw
      outputCanvas.height = vh

      this.processingActive = true
      this.processVideoFrame(outputCanvas)

      console.log('Video processing started')
    } catch (error) {
      console.error('Failed to start processing:', error)
      if (this.errorCallback) this.errorCallback(error)
      throw error
    }
  }

  /**
   * Stop video processing and cleanup
   */
  stopProcessing() {
    this.processingActive = false
    this.consecutiveDetections = 0
    this.autoCapture.startTime = null
    this.detectionHistory = []
    
    this.cleanupMats()
    console.log('Video processing stopped')
  }

  /**
   * Main video processing loop
   * @param {HTMLCanvasElement} outputCanvas 
   */
  processVideoFrame(outputCanvas) {
    const cv = window.cv
    const FPS = 30

    try {
      if (!this.processingActive || !this.videoCapture) {
        this.cleanupMats()
        return
      }

      const begin = Date.now()

      // Read frame from video
      this.videoCapture.read(this.mats.src)
      this.mats.src.copyTo(this.mats.dst)
      cv.cvtColor(this.mats.dst, this.mats.gray, cv.COLOR_RGBA2GRAY, 0)

      // Detect faces
      this.classifier.detectMultiScale(this.mats.gray, this.mats.faces, 1.1, 3, 0)
      
      const faceCount = this.mats.faces.size()
      const detectedFaces = []

      // Process detected faces
      for (let i = 0; i < faceCount; i++) {
        const face = this.mats.faces.get(i)
        const faceRect = {
          x: face.x,
          y: face.y,
          width: face.width,
          height: face.height
        }

        // Draw detection rectangle
        const p1 = new cv.Point(face.x, face.y)
        const p2 = new cv.Point(face.x + face.width, face.y + face.height)
        cv.rectangle(this.mats.dst, p1, p2, [34, 197, 94, 255], 2)

        // Add face quality score
        const qualityScore = this.calculateFaceQuality(faceRect, this.mats.src)
        
        detectedFaces.push({
          rect: faceRect,
          quality: qualityScore,
          timestamp: Date.now()
        })

        // Draw quality indicator
        const qualityText = `Quality: ${(qualityScore * 100).toFixed(0)}%`
        cv.putText(
          this.mats.dst,
          qualityText,
          new cv.Point(face.x, face.y - 10),
          cv.FONT_HERSHEY_SIMPLEX,
          0.5,
          [34, 197, 94, 255],
          1
        )
      }

      // Display processed frame
      cv.imshow(outputCanvas, this.mats.dst)

      // Update detection state
      this.updateDetectionState(detectedFaces)

      // Handle callbacks
      if (this.faceDetectedCallback && faceCount > 0) {
        this.faceDetectedCallback(detectedFaces)
      }

      // Auto-capture logic
      this.handleAutoCapture(detectedFaces, outputCanvas)

      // Schedule next frame
      const delay = Math.max(0, (1000 / FPS) - (Date.now() - begin))
      setTimeout(() => this.processVideoFrame(outputCanvas), delay)

    } catch (error) {
      console.error('Video processing error:', error)
      if (this.errorCallback) this.errorCallback(error)
      
      // Try to recover by continuing processing
      setTimeout(() => this.processVideoFrame(outputCanvas), 100)
    }
  }

  /**
   * Update detection state and history
   * @param {Array} detectedFaces 
   */
  updateDetectionState(detectedFaces) {
    const now = Date.now()
    
    if (detectedFaces.length > 0) {
      this.consecutiveDetections++
      this.lastDetectionTime = now
      
      // Add to history (keep last 30 detections)
      this.detectionHistory.push({
        timestamp: now,
        faceCount: detectedFaces.length,
        averageQuality: detectedFaces.reduce((sum, f) => sum + f.quality, 0) / detectedFaces.length
      })
      
      if (this.detectionHistory.length > 30) {
        this.detectionHistory.shift()
      }
    } else {
      this.consecutiveDetections = 0
      this.autoCapture.startTime = null
    }
  }

  /**
   * Handle automatic capture after stable detection
   * @param {Array} detectedFaces 
   * @param {HTMLCanvasElement} outputCanvas 
   */
  async handleAutoCapture(detectedFaces, outputCanvas) {
    if (!this.autoCapture.enabled || detectedFaces.length === 0) return

    const now = Date.now()
    const stableDetectionThreshold = 10 // 10 consecutive detections
    const qualityThreshold = 0.7

    // Check if we have stable, good quality detection
    const hasStableDetection = this.consecutiveDetections >= stableDetectionThreshold
    const hasGoodQuality = detectedFaces.some(f => f.quality >= qualityThreshold)

    if (hasStableDetection && hasGoodQuality) {
      if (!this.autoCapture.startTime) {
        this.autoCapture.startTime = now
        console.log('Auto-capture countdown started...')
      } else if (now - this.autoCapture.startTime >= this.autoCapture.delay) {
        // Trigger auto-capture
        await this.captureAndExtractEmbedding(detectedFaces[0], outputCanvas)
        this.autoCapture.startTime = null // Reset
      }
    } else {
      this.autoCapture.startTime = null
    }
  }

  /**
   * Capture face and extract embedding
   * @param {Object} bestFace - Best quality detected face
   * @param {HTMLCanvasElement} outputCanvas 
   */
  async captureAndExtractEmbedding(bestFace, outputCanvas) {
    try {
      console.log('Capturing face and extracting embedding...')

      // Get video element from capture
      const videoElement = this.getVideoElement()
      if (!videoElement) {
        throw new Error('Video element not available')
      }

      // Extract embedding from the detected face region
      const embedding = await faceEmbeddingUtils.extractEmbeddingFromRegion(
        videoElement,
        bestFace.rect
      )

      // Validate embedding
      if (!faceEmbeddingUtils.validateEmbedding(embedding)) {
        throw new Error('Invalid embedding extracted')
      }

      // Capture image blob
      const imageBlob = await this.captureImageBlob(videoElement)

      const result = {
        embedding: Array.from(embedding),
        imageBlob,
        faceRect: bestFace.rect,
        quality: bestFace.quality,
        detectionHistory: [...this.detectionHistory],
        timestamp: Date.now()
      }

      console.log('Embedding extracted successfully, quality:', bestFace.quality)

      if (this.embeddingExtractedCallback) {
        this.embeddingExtractedCallback(result)
      }

      return result

    } catch (error) {
      console.error('Failed to capture and extract embedding:', error)
      if (this.errorCallback) this.errorCallback(error)
      throw error
    }
  }

  /**
   * Calculate face quality score
   * @param {Object} faceRect - Face rectangle
   * @param {cv.Mat} srcMat - Source image matrix
   * @returns {number} - Quality score (0-1)
   */
  calculateFaceQuality(faceRect, srcMat) {
    try {
      const cv = window.cv
      
      // Extract face region
      const faceROI = srcMat.roi(new cv.Rect(
        faceRect.x, faceRect.y, faceRect.width, faceRect.height
      ))

      // Convert to grayscale for analysis
      const grayFace = new cv.Mat()
      cv.cvtColor(faceROI, grayFace, cv.COLOR_RGBA2GRAY)

      // Calculate sharpness (Laplacian variance)
      const laplacian = new cv.Mat()
      cv.Laplacian(grayFace, laplacian, cv.CV_64F)
      
      const mean = new cv.Mat()
      const stddev = new cv.Mat()
      cv.meanStdDev(laplacian, mean, stddev)
      
      const sharpness = Math.pow(stddev.doubleAt(0, 0), 2)
      
      // Calculate brightness
      const meanBrightness = cv.mean(grayFace)[0]
      const brightnessScore = 1 - Math.abs(meanBrightness - 128) / 128
      
      // Size score (larger faces are generally better)
      const sizeScore = Math.min(1, (faceRect.width * faceRect.height) / (100 * 100))
      
      // Combine scores
      const sharpnessScore = Math.min(1, sharpness / 1000) // Normalize sharpness
      const qualityScore = (sharpnessScore * 0.4 + brightnessScore * 0.3 + sizeScore * 0.3)

      // Cleanup
      faceROI.delete()
      grayFace.delete()
      laplacian.delete()
      mean.delete()
      stddev.delete()

      return Math.max(0, Math.min(1, qualityScore))
    } catch (error) {
      console.warn('Quality calculation failed:', error)
      return 0.5 // Default quality
    }
  }

  /**
   * Get video element from VideoCapture
   * @returns {HTMLVideoElement}
   */
  getVideoElement() {
    // This is a workaround since OpenCV VideoCapture doesn't expose the source element
    // In practice, you'd pass the video element reference or find it by ID
    return document.querySelector('video[autoplay]') || document.querySelector('video')
  }

  /**
   * Capture image blob from video
   * @param {HTMLVideoElement} videoElement 
   * @returns {Promise<Blob>}
   */
  async captureImageBlob(videoElement) {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement, 0, 0)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create image blob'))
        }
      }, 'image/jpeg', 0.8)
    })
  }

  /**
   * Cleanup OpenCV matrices
   */
  cleanupMats() {
    const matsToClean = ['src', 'dst', 'gray', 'faces']
    matsToClean.forEach(matName => {
      try {
        if (this.mats[matName] && this.mats[matName].delete) {
          this.mats[matName].delete()
          this.mats[matName] = null
        }
      } catch (error) {
        console.warn(`Failed to cleanup mat ${matName}:`, error)
      }
    })

    if (this.videoCapture) {
      this.videoCapture = null
    }
  }

  /**
   * Configure auto-capture settings
   * @param {Object} settings 
   */
  configureAutoCapture(settings) {
    this.autoCapture = {
      ...this.autoCapture,
      ...settings
    }
  }

  /**
   * Get current detection statistics
   * @returns {Object}
   */
  getDetectionStats() {
    const recentHistory = this.detectionHistory.slice(-10)
    return {
      consecutiveDetections: this.consecutiveDetections,
      lastDetectionTime: this.lastDetectionTime,
      averageQuality: recentHistory.length > 0 
        ? recentHistory.reduce((sum, h) => sum + h.averageQuality, 0) / recentHistory.length 
        : 0,
      detectionRate: recentHistory.length,
      isStable: this.consecutiveDetections >= 10
    }
  }

  /**
   * Manual capture trigger
   * @param {HTMLCanvasElement} outputCanvas 
   */
  async manualCapture(outputCanvas) {
    const currentFaces = []
    
    // Get current faces from the last detection
    for (let i = 0; i < this.mats.faces.size(); i++) {
      const face = this.mats.faces.get(i)
      const faceRect = {
        x: face.x,
        y: face.y,
        width: face.width,
        height: face.height
      }
      const quality = this.calculateFaceQuality(faceRect, this.mats.src)
      
      currentFaces.push({ rect: faceRect, quality, timestamp: Date.now() })
    }

    if (currentFaces.length === 0) {
      throw new Error('No faces detected for manual capture')
    }

    // Use the best quality face
    const bestFace = currentFaces.reduce((best, current) => 
      current.quality > best.quality ? current : best
    )

    return await this.captureAndExtractEmbedding(bestFace, outputCanvas)
  }
}

export default OpenCVFaceProcessor
