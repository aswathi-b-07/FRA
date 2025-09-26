import React, { useRef, useEffect, useState, useCallback } from 'react'
import OpenCVFaceProcessor from '../utils/opencvFaceProcessor'
import faceEmbeddingService from '../services/faceEmbeddingService'
import faceDetectionDebugger from '../utils/faceDetectionDebugger'
import LoadingSpinner from './LoadingSpinner'
import FaceDetectionDebugPanel from './FaceDetectionDebugPanel'

const EnhancedFaceCapture = ({ 
  onCapture, 
  onError, 
  className = '',
  autoCapture = true,
  captureDelay = 5000,
  qualityThreshold = 0.7,
  enableDebug = false
}) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const processorRef = useRef(null)
  
  const [state, setState] = useState({
    isInitializing: false,
    isStreaming: false,
    isCapturing: false,
    error: null,
    detectedFaces: [],
    detectionStats: null,
    captureCountdown: 0
  })

  const [showDebugPanel, setShowDebugPanel] = useState(false)

  const [stream, setStream] = useState(null)
  const countdownRef = useRef(null)

  // Initialize OpenCV processor
  useEffect(() => {
    const initializeProcessor = async () => {
      try {
        setState(prev => ({ ...prev, isInitializing: true, error: null }))
        
        if (!processorRef.current) {
          processorRef.current = new OpenCVFaceProcessor()
        }

        const initialized = await processorRef.current.initialize()
        if (!initialized) {
          throw new Error('Failed to initialize face processor')
        }

        // Configure auto-capture settings
        processorRef.current.configureAutoCapture({
          enabled: autoCapture,
          delay: captureDelay
        })

        setState(prev => ({ ...prev, isInitializing: false }))
      } catch (error) {
        console.error('Processor initialization failed:', error)
        setState(prev => ({ 
          ...prev, 
          isInitializing: false, 
          error: 'Failed to initialize face detection. Please refresh and try again.' 
        }))
        if (onError) onError(error)
      }
    }

    initializeProcessor()

    return () => {
      stopCamera()
    }
  }, [autoCapture, captureDelay, onError])

  // Start camera and processing
  const startCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Get user media
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })

      videoRef.current.srcObject = mediaStream
      setStream(mediaStream)

      // Wait for video metadata
      await new Promise((resolve, reject) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          resolve()
        }
        videoRef.current.onerror = reject
      })

      // Start OpenCV processing
      await processorRef.current.startProcessing(
        videoRef.current,
        canvasRef.current,
        {
          onFaceDetected: handleFaceDetected,
          onEmbeddingExtracted: handleEmbeddingExtracted,
          onError: handleProcessingError
        }
      )

      setState(prev => ({ ...prev, isStreaming: true }))
      console.log('Camera and processing started successfully')

    } catch (error) {
      console.error('Failed to start camera:', error)
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access and try again.'
        : 'Failed to access camera. Please check your camera and try again.'
      
      setState(prev => ({ ...prev, error: errorMessage }))
      if (onError) onError(error)
    }
  }, [])

  // Stop camera and processing
  const stopCamera = useCallback(() => {
    try {
      // Stop processing
      if (processorRef.current) {
        processorRef.current.stopProcessing()
      }

      // Stop media stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      // Clear countdown
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        detectedFaces: [],
        detectionStats: null,
        captureCountdown: 0
      }))

      console.log('Camera and processing stopped')
    } catch (error) {
      console.error('Error stopping camera:', error)
    }
  }, [stream])

  // Handle face detection
  const handleFaceDetected = useCallback((faces) => {
    setState(prev => ({ ...prev, detectedFaces: faces }))
    
    // Get detection stats
    if (processorRef.current) {
      const stats = processorRef.current.getDetectionStats()
      setState(prev => ({ ...prev, detectionStats: stats }))

      // Handle countdown for auto-capture
      if (autoCapture && stats.isStable && faces.some(f => f.quality >= qualityThreshold)) {
        if (!countdownRef.current) {
          let countdown = captureDelay / 1000
          setState(prev => ({ ...prev, captureCountdown: countdown }))
          
          countdownRef.current = setInterval(() => {
            countdown -= 1
            setState(prev => ({ ...prev, captureCountdown: countdown }))
            
            if (countdown <= 0) {
              clearInterval(countdownRef.current)
              countdownRef.current = null
              setState(prev => ({ ...prev, captureCountdown: 0 }))
            }
          }, 1000)
        }
      } else {
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
          setState(prev => ({ ...prev, captureCountdown: 0 }))
        }
      }
    }
  }, [autoCapture, qualityThreshold, captureDelay])

  // Handle embedding extraction
  const handleEmbeddingExtracted = useCallback(async (result) => {
    try {
      setState(prev => ({ ...prev, isCapturing: true }))

      // Initialize embedding service if needed
      const session = await faceEmbeddingService.getSession()
      if (session?.access_token) {
        await faceEmbeddingService.initializeEncryption(session.access_token)
      }

      // Prepare capture data
      const captureData = {
        imageBlob: result.imageBlob,
        faceEmbedding: result.embedding,
        faceRect: result.faceRect,
        quality: result.quality,
        detectionCount: state.detectedFaces.length,
        detectionHistory: result.detectionHistory,
        metadata: {
          extractionMethod: 'opencv-face-api',
          qualityScore: result.quality,
          detectionConfidence: state.detectionStats?.averageQuality || 0,
          timestamp: result.timestamp
        }
      }

      console.log('Face captured successfully with quality:', result.quality)

      if (onCapture) {
        onCapture(captureData)
      }

      // Clear countdown
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
        setState(prev => ({ ...prev, captureCountdown: 0 }))
      }

    } catch (error) {
      console.error('Failed to process captured embedding:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to process captured face. Please try again.' 
      }))
      if (onError) onError(error)
    } finally {
      setState(prev => ({ ...prev, isCapturing: false }))
    }
  }, [state.detectedFaces.length, state.detectionStats, onCapture, onError])

  // Handle processing errors
  const handleProcessingError = useCallback((error) => {
    console.error('Processing error:', error)
    setState(prev => ({ 
      ...prev, 
      error: 'Face detection error. Please check your camera and lighting.' 
    }))
    if (onError) onError(error)
  }, [onError])

  // Manual capture
  const manualCapture = useCallback(async () => {
    try {
      if (!processorRef.current || !state.isStreaming) {
        throw new Error('Processing not active')
      }

      setState(prev => ({ ...prev, isCapturing: true, error: null }))
      
      const result = await processorRef.current.manualCapture(canvasRef.current)
      await handleEmbeddingExtracted(result)
      
    } catch (error) {
      console.error('Manual capture failed:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Capture failed. Please ensure your face is clearly visible.' 
      }))
      if (onError) onError(error)
    }
  }, [state.isStreaming, handleEmbeddingExtracted, onError])

  // Render status indicator
  const renderStatusIndicator = () => {
    const { detectedFaces, detectionStats, captureCountdown } = state
    const hasValidFace = detectedFaces.some(f => f.quality >= qualityThreshold)
    const isStable = detectionStats?.isStable

    let status = 'No Face'
    let color = 'bg-yellow-100 text-yellow-800'

    if (captureCountdown > 0) {
      status = `Capturing in ${captureCountdown}s`
      color = 'bg-blue-100 text-blue-800'
    } else if (hasValidFace && isStable) {
      status = '✓ Ready to Capture'
      color = 'bg-green-100 text-green-800'
    } else if (hasValidFace) {
      status = 'Face Detected'
      color = 'bg-orange-100 text-orange-800'
    }

    return (
      <div className="absolute top-2 right-2">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          {status}
        </div>
      </div>
    )
  }

  // Render quality metrics
  const renderQualityMetrics = () => {
    const { detectedFaces, detectionStats } = state
    if (!detectedFaces.length || !detectionStats) return null

    const avgQuality = detectedFaces.reduce((sum, f) => sum + f.quality, 0) / detectedFaces.length

    return (
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        <div>Faces: {detectedFaces.length}</div>
        <div>Quality: {(avgQuality * 100).toFixed(0)}%</div>
        <div>Stable: {detectionStats.isStable ? 'Yes' : 'No'}</div>
      </div>
    )
  }

  const { isInitializing, isStreaming, isCapturing, error, detectedFaces, captureCountdown } = state
  const hasValidFace = detectedFaces.some(f => f.quality >= qualityThreshold)

  return (
    <div className={`enhanced-face-capture ${className}`}>
      <div className="relative">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="face-video w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
          autoPlay
          muted
          playsInline
          style={{ display: isStreaming ? 'block' : 'none' }}
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
            }
          }}
        />

        {/* Canvas Overlay for OpenCV Output */}
        <canvas
          ref={canvasRef}
          className="face-overlay absolute top-0 left-0 w-full h-full rounded-lg"
          style={{ display: isStreaming ? 'block' : 'none' }}
        />

        {/* Placeholder when camera is off */}
        {!isStreaming && (
          <div className="w-full max-w-md mx-auto h-64 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
            <div className="text-center">
              {isInitializing ? (
                <LoadingSpinner size="md" text="Initializing..." />
              ) : (
                <>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Enhanced Face Capture</p>
                  <p className="text-xs text-gray-400">OpenCV + AI Embeddings</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Status Indicators */}
        {isStreaming && renderStatusIndicator()}
        {isStreaming && renderQualityMetrics()}

        {/* Capture Progress */}
        {captureCountdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
            <div className="text-center text-white">
              <div className="text-4xl font-bold">{captureCountdown}</div>
              <div className="text-sm">Auto-capturing...</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex justify-center space-x-4">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="btn btn-primary"
            disabled={isInitializing || isCapturing}
          >
            {isInitializing ? 'Initializing...' : 'Start Enhanced Capture'}
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
              disabled={isCapturing}
            >
              Stop Camera
            </button>
            <button
              onClick={manualCapture}
              disabled={!hasValidFace || isCapturing || captureCountdown > 0}
              className="btn btn-success"
            >
              {isCapturing ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                'Capture Now'
              )}
            </button>
          </>
        )}
        
        {/* Debug Controls */}
        {enableDebug && (
          <button
            onClick={() => setShowDebugPanel(true)}
            className="btn btn-outline"
            title="Open Debug Panel"
          >
            🐛 Debug
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 alert alert-danger">
          <p>{error}</p>
          <button 
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            className="btn btn-secondary mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>
          {!isStreaming 
            ? 'Click "Start Enhanced Capture" to begin AI-powered face detection'
            : captureCountdown > 0
            ? 'Hold still! Auto-capture in progress...'
            : hasValidFace
            ? autoCapture 
              ? 'Face detected! Hold still for auto-capture or click "Capture Now"'
              : 'Face detected! Click "Capture Now" to proceed'
            : 'Position your face clearly in the camera view'
          }
        </p>
        {isStreaming && (
          <p className="text-xs text-gray-500 mt-1">
            Enhanced with OpenCV detection and secure embedding extraction
          </p>
        )}
      </div>

      {/* Debug Panel */}
      <FaceDetectionDebugPanel 
        isVisible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  )
}

export default EnhancedFaceCapture
