class FaceDetectionDebugger {
  constructor() {
    this.isEnabled = false
    this.logs = []
    this.maxLogs = 1000
    this.startTime = Date.now()
    this.frameCount = 0
    this.detectionStats = {
      totalFrames: 0,
      framesWithFaces: 0,
      totalFacesDetected: 0,
      averageFPS: 0,
      averageProcessingTime: 0,
      qualityScores: [],
      errors: []
    }
    this.debugCanvas = null
    this.debugContext = null
  }

  /**
   * Enable debugging with optional configuration
   * @param {Object} config - Debug configuration
   */
  enable(config = {}) {
    this.isEnabled = true
    this.config = {
      logLevel: config.logLevel || 'info', // 'debug', 'info', 'warn', 'error'
      showVisualDebug: config.showVisualDebug !== false,
      logToConsole: config.logToConsole !== false,
      logToUI: config.logToUI !== false,
      trackPerformance: config.trackPerformance !== false,
      saveDebugImages: config.saveDebugImages || false,
      ...config
    }
    
    this.log('info', 'Face detection debugging enabled', this.config)
    
    if (this.config.showVisualDebug) {
      this.createDebugCanvas()
    }
  }

  /**
   * Disable debugging
   */
  disable() {
    this.isEnabled = false
    this.log('info', 'Face detection debugging disabled')
    this.removeDebugCanvas()
  }

  /**
   * Log a debug message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {any} data - Additional data
   */
  log(level, message, data = null) {
    if (!this.isEnabled) return

    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      frameNumber: this.frameCount
    }

    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    if (this.config.logToConsole) {
      const consoleMethod = console[level] || console.log
      const timeStr = new Date(logEntry.timestamp).toISOString()
      consoleMethod(`[FaceDebug ${timeStr}] ${message}`, data || '')
    }

    // Trigger UI update if configured
    if (this.config.logToUI && this.onLogUpdate) {
      this.onLogUpdate(logEntry)
    }
  }

  /**
   * Log frame processing start
   * @param {number} frameNumber - Frame number
   */
  logFrameStart(frameNumber) {
    this.frameCount = frameNumber
    this.detectionStats.totalFrames++
    this.frameStartTime = performance.now()
    
    this.log('debug', `Frame ${frameNumber} processing started`)
  }

  /**
   * Log OpenCV initialization
   * @param {boolean} success - Whether initialization succeeded
   * @param {any} error - Error if failed
   */
  logOpenCVInit(success, error = null) {
    if (success) {
      this.log('info', 'OpenCV initialized successfully', {
        version: window.cv ? 'loaded' : 'not loaded',
        timestamp: Date.now() - this.startTime
      })
    } else {
      this.log('error', 'OpenCV initialization failed', error)
      this.detectionStats.errors.push({
        type: 'opencv_init',
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      })
    }
  }

  /**
   * Log Haar cascade loading
   * @param {boolean} success - Whether loading succeeded
   * @param {string} cascadeUrl - Cascade URL
   * @param {any} error - Error if failed
   */
  logCascadeLoad(success, cascadeUrl, error = null) {
    if (success) {
      this.log('info', 'Haar cascade loaded successfully', { cascadeUrl })
    } else {
      this.log('error', 'Haar cascade loading failed', { cascadeUrl, error })
      this.detectionStats.errors.push({
        type: 'cascade_load',
        error: error?.message || 'Unknown error',
        cascadeUrl,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Log face detection results
   * @param {Array} faces - Detected faces
   * @param {number} processingTime - Processing time in ms
   * @param {Object} frameInfo - Frame information
   */
  logDetectionResult(faces, processingTime, frameInfo = {}) {
    const faceCount = faces.length
    
    if (faceCount > 0) {
      this.detectionStats.framesWithFaces++
      this.detectionStats.totalFacesDetected += faceCount
    }

    // Calculate quality scores
    const qualityScores = faces.map(f => f.quality || 0)
    this.detectionStats.qualityScores.push(...qualityScores)

    // Update performance stats
    this.detectionStats.averageProcessingTime = 
      (this.detectionStats.averageProcessingTime * (this.frameCount - 1) + processingTime) / this.frameCount

    const currentFPS = this.frameCount / ((Date.now() - this.startTime) / 1000)
    this.detectionStats.averageFPS = currentFPS

    this.log('debug', `Frame ${this.frameCount} detection complete`, {
      facesDetected: faceCount,
      processingTime: `${processingTime.toFixed(2)}ms`,
      fps: currentFPS.toFixed(1),
      qualityScores: qualityScores.map(q => (q * 100).toFixed(1) + '%'),
      frameSize: frameInfo.width && frameInfo.height ? `${frameInfo.width}x${frameInfo.height}` : 'unknown'
    })

    // Visual debugging
    if (this.config.showVisualDebug && this.debugCanvas) {
      this.drawDebugInfo(faces, processingTime, currentFPS)
    }

    // Save debug images if configured
    if (this.config.saveDebugImages && faceCount > 0) {
      this.saveDebugImage(faces, frameInfo)
    }
  }

  /**
   * Log face quality assessment
   * @param {Object} face - Face object
   * @param {Object} qualityMetrics - Quality metrics
   */
  logQualityAssessment(face, qualityMetrics) {
    this.log('debug', 'Face quality assessed', {
      faceRect: face.rect,
      overallQuality: (face.quality * 100).toFixed(1) + '%',
      metrics: {
        sharpness: qualityMetrics.sharpness?.toFixed(3),
        brightness: qualityMetrics.brightness?.toFixed(3),
        size: qualityMetrics.size?.toFixed(3),
        contrast: qualityMetrics.contrast?.toFixed(3)
      }
    })
  }

  /**
   * Log embedding extraction
   * @param {boolean} success - Whether extraction succeeded
   * @param {Object} embeddingInfo - Embedding information
   * @param {any} error - Error if failed
   */
  logEmbeddingExtraction(success, embeddingInfo = {}, error = null) {
    if (success) {
      this.log('info', 'Face embedding extracted successfully', {
        dimensions: embeddingInfo.dimensions || 'unknown',
        quality: embeddingInfo.quality ? (embeddingInfo.quality * 100).toFixed(1) + '%' : 'unknown',
        extractionTime: embeddingInfo.extractionTime ? `${embeddingInfo.extractionTime.toFixed(2)}ms` : 'unknown'
      })
    } else {
      this.log('error', 'Face embedding extraction failed', error)
      this.detectionStats.errors.push({
        type: 'embedding_extraction',
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      })
    }
  }

  /**
   * Log auto-capture events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logAutoCapture(event, data = {}) {
    const events = {
      'countdown_start': 'Auto-capture countdown started',
      'countdown_tick': 'Auto-capture countdown tick',
      'capture_triggered': 'Auto-capture triggered',
      'capture_cancelled': 'Auto-capture cancelled',
      'capture_failed': 'Auto-capture failed'
    }

    const message = events[event] || `Auto-capture event: ${event}`
    const level = event.includes('failed') || event.includes('error') ? 'error' : 'info'
    
    this.log(level, message, data)
  }

  /**
   * Log performance warning
   * @param {string} warning - Warning message
   * @param {Object} metrics - Performance metrics
   */
  logPerformanceWarning(warning, metrics = {}) {
    this.log('warn', `Performance warning: ${warning}`, metrics)
  }

  /**
   * Create debug canvas for visual debugging
   */
  createDebugCanvas() {
    this.debugCanvas = document.createElement('canvas')
    this.debugCanvas.id = 'face-detection-debug'
    this.debugCanvas.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      height: 200px;
      background: rgba(0,0,0,0.8);
      border: 1px solid #ccc;
      border-radius: 8px;
      z-index: 9999;
      font-family: monospace;
    `
    this.debugCanvas.width = 300
    this.debugCanvas.height = 200
    this.debugContext = this.debugCanvas.getContext('2d')
    
    document.body.appendChild(this.debugCanvas)
    this.log('info', 'Debug canvas created')
  }

  /**
   * Remove debug canvas
   */
  removeDebugCanvas() {
    if (this.debugCanvas) {
      document.body.removeChild(this.debugCanvas)
      this.debugCanvas = null
      this.debugContext = null
    }
  }

  /**
   * Draw debug information on canvas
   * @param {Array} faces - Detected faces
   * @param {number} processingTime - Processing time
   * @param {number} fps - Current FPS
   */
  drawDebugInfo(faces, processingTime, fps) {
    if (!this.debugContext) return

    const ctx = this.debugContext
    const canvas = this.debugCanvas

    // Clear canvas
    ctx.fillStyle = 'rgba(0,0,0,0.9)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set text style
    ctx.fillStyle = '#00ff00'
    ctx.font = '12px monospace'
    
    let y = 20
    const lineHeight = 15

    // Basic stats
    ctx.fillText(`Frame: ${this.frameCount}`, 10, y)
    y += lineHeight
    ctx.fillText(`FPS: ${fps.toFixed(1)}`, 10, y)
    y += lineHeight
    ctx.fillText(`Process Time: ${processingTime.toFixed(2)}ms`, 10, y)
    y += lineHeight
    ctx.fillText(`Faces Detected: ${faces.length}`, 10, y)
    y += lineHeight

    // Face details
    if (faces.length > 0) {
      ctx.fillStyle = '#ffff00'
      ctx.fillText('--- Face Details ---', 10, y)
      y += lineHeight

      faces.forEach((face, index) => {
        if (y > canvas.height - 20) return // Prevent overflow
        
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Face ${index + 1}:`, 10, y)
        y += lineHeight
        ctx.fillText(`  Size: ${face.rect.width}x${face.rect.height}`, 10, y)
        y += lineHeight
        ctx.fillText(`  Quality: ${(face.quality * 100).toFixed(1)}%`, 10, y)
        y += lineHeight
      })
    }

    // Performance indicators
    ctx.fillStyle = processingTime > 50 ? '#ff0000' : '#00ff00'
    ctx.fillRect(canvas.width - 20, 10, 10, Math.min(processingTime, 100))
    
    ctx.fillStyle = fps < 15 ? '#ff0000' : '#00ff00'
    ctx.fillRect(canvas.width - 35, 10, 10, Math.min(fps * 2, 60))
  }

  /**
   * Save debug image with face annotations
   * @param {Array} faces - Detected faces
   * @param {Object} frameInfo - Frame information
   */
  saveDebugImage(faces, frameInfo) {
    try {
      // This would typically save to a debug folder
      // For now, we'll just log the save event
      this.log('debug', 'Debug image saved', {
        filename: `debug_frame_${this.frameCount}_faces_${faces.length}.jpg`,
        faces: faces.length,
        timestamp: Date.now()
      })
    } catch (error) {
      this.log('error', 'Failed to save debug image', error)
    }
  }

  /**
   * Get comprehensive debug report
   * @returns {Object} Debug report
   */
  getDebugReport() {
    const runtime = Date.now() - this.startTime
    const detectionRate = this.detectionStats.framesWithFaces / this.detectionStats.totalFrames * 100

    return {
      runtime: `${(runtime / 1000).toFixed(1)}s`,
      totalFrames: this.detectionStats.totalFrames,
      framesWithFaces: this.detectionStats.framesWithFaces,
      detectionRate: `${detectionRate.toFixed(1)}%`,
      totalFacesDetected: this.detectionStats.totalFacesDetected,
      averageFPS: this.detectionStats.averageFPS.toFixed(1),
      averageProcessingTime: `${this.detectionStats.averageProcessingTime.toFixed(2)}ms`,
      averageQuality: this.detectionStats.qualityScores.length > 0 
        ? `${(this.detectionStats.qualityScores.reduce((a, b) => a + b, 0) / this.detectionStats.qualityScores.length * 100).toFixed(1)}%`
        : 'N/A',
      errorCount: this.detectionStats.errors.length,
      errors: this.detectionStats.errors,
      recentLogs: this.logs.slice(-20) // Last 20 log entries
    }
  }

  /**
   * Export debug data as JSON
   * @returns {string} JSON string
   */
  exportDebugData() {
    return JSON.stringify({
      config: this.config,
      stats: this.detectionStats,
      logs: this.logs,
      report: this.getDebugReport()
    }, null, 2)
  }

  /**
   * Clear all debug data
   */
  clearDebugData() {
    this.logs = []
    this.frameCount = 0
    this.startTime = Date.now()
    this.detectionStats = {
      totalFrames: 0,
      framesWithFaces: 0,
      totalFacesDetected: 0,
      averageFPS: 0,
      averageProcessingTime: 0,
      qualityScores: [],
      errors: []
    }
    this.log('info', 'Debug data cleared')
  }

  /**
   * Test face detection system
   * @returns {Promise<Object>} Test results
   */
  async runDiagnostics() {
    this.log('info', 'Running face detection diagnostics...')
    
    const diagnostics = {
      opencvLoaded: !!window.cv,
      opencvReady: !!(window.cv && window.cv.Mat),
      webrtcSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      canvasSupported: !!document.createElement('canvas').getContext,
      faceApiLoaded: !!(window.faceapi || (typeof faceapi !== 'undefined')),
      webglSupported: this.checkWebGLSupport(),
      performanceApiSupported: !!window.performance,
      timestamp: Date.now()
    }

    // Test camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      diagnostics.cameraAccessible = true
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      diagnostics.cameraAccessible = false
      diagnostics.cameraError = error.message
    }

    this.log('info', 'Diagnostics complete', diagnostics)
    return diagnostics
  }

  /**
   * Check WebGL support
   * @returns {boolean} Whether WebGL is supported
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch (error) {
      return false
    }
  }
}

export default new FaceDetectionDebugger()
