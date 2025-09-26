import React, { useRef, useEffect, useState } from 'react'
import faceApiUtils from '../utils/faceApiUtils'
import LoadingSpinner from './LoadingSpinner'

const FaceCapture = ({ onCapture, onError, className = '' }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const offscreenCanvasRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState('')
  const [stream, setStream] = useState(null)
  const [detections, setDetections] = useState(null)
  const [opencvReady, setOpenCVReady] = useState(false)
  const faceCascadeRef = useRef(null)

  // OpenCV loop & resources
  const cvCapRef = useRef(null)
  const cvSrcRef = useRef(null)
  const cvDstRef = useRef(null)
  const cvGrayRef = useRef(null)
  const cvFacesRef = useRef(null)
  const opencvLoopActiveRef = useRef(false)
  const detectionStartTimestampRef = useRef(null)
  const captureScheduledRef = useRef(false)

  const OPENCV_SCRIPT_URL = 'https://docs.opencv.org/4.x/opencv.js'
  const HAAR_CASCADE_URL = 'https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml'

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError('')
      setIsStreaming(true)
      
      const videoStream = await faceApiUtils.startVideoStream(videoRef.current)
      setStream(videoStream)
      
      // Attempt to load OpenCV asynchronously (face-api.js remains as fallback)
      loadOpenCV().catch(() => {})

      // Start face detection loop
      startFaceDetection()
    } catch (err) {
      console.error('Camera start error:', err)
      setError('Failed to access camera. Please check permissions.')
      setIsStreaming(false)
      if (onError) onError(err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      faceApiUtils.stopVideoStream(videoRef.current)
      setStream(null)
    }
    setIsStreaming(false)
    setDetections(null)
    detectionStartTimestampRef.current = null
    captureScheduledRef.current = false
    // Stop OpenCV loop and clean mats
    opencvLoopActiveRef.current = false
    cleanupOpenCVObjects()
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const startFaceDetection = async () => {
<<<<<<< HEAD
    if (!videoRef.current || !canvasRef.current) return

    if (opencvReady && faceCascadeRef.current && window.cv) {
      try {
        initializeOpenCVObjects(videoRef.current)
        opencvLoopActiveRef.current = true
        processVideoOpenCV()
        return
      } catch (e) {
        console.warn('Falling back to face-api.js detection', e)
      }
    }

    // Fallback to face-api.js loop
    const detect = async () => {
      if (!isStreaming || !videoRef.current) return

      try {
        const faDetections = await faceApiUtils.detectFace(videoRef.current)
        setDetections(faDetections)
        if (canvasRef.current) {
          faceApiUtils.drawDetections(canvasRef.current, faDetections)
        }

        // Auto-capture after 5 seconds of continuous detection
        if (faDetections && faDetections.length > 0) {
          if (!detectionStartTimestampRef.current) {
            detectionStartTimestampRef.current = Date.now()
          } else if (!captureScheduledRef.current && Date.now() - detectionStartTimestampRef.current >= 5000) {
            captureScheduledRef.current = true
            await captureImage()
          }
        } else {
          detectionStartTimestampRef.current = null
        }
      } catch (err) {
        // Ignore detection errors during streaming
        console.debug('Detection error:', err.message)
      }

      if (isStreaming) {
        requestAnimationFrame(detect)
      }
=======
    console.log('Starting face detection...')
    
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video or canvas ref not available')
      return
>>>>>>> 507e77db4d917ec23b4bb11faf88ddc9ec1a6e20
    }

    // Wait for video to be ready
    const waitForVideo = () => {
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        console.log('Waiting for video dimensions...')
        setTimeout(waitForVideo, 100)
        return
      }
      console.log(`Video ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`)
      startDetectionLoop()
    }

    const startDetectionLoop = () => {
      let detectionInterval

      const detect = async () => {
        if (!isStreaming || !videoRef.current || videoRef.current.readyState < 2) {
          console.log('Stopping detection - streaming stopped or video not ready')
          if (detectionInterval) clearInterval(detectionInterval)
          return
        }

        try {
          console.log('🔍 Running face detection...')
          // Use fallback method that includes mock detection for testing
          const detections = await faceApiUtils.detectFaceWithFallback(videoRef.current)
          console.log('🎯 Detection result:', detections)
          setDetections(detections)
          
          // Always try to draw (including clearing when no detections)
          if (canvasRef.current) {
            faceApiUtils.drawDetections(canvasRef.current, detections)
          }
        } catch (err) {
          console.error('💥 Detection error:', err)
          setDetections([]) // Clear detections on error
        }
      }

      // Run detection every 500ms (2fps) for better performance
      detectionInterval = setInterval(detect, 500)
      
      // Run first detection immediately
      detect()
    }

    waitForVideo()
  }

  const captureImage = async () => {
    if (!videoRef.current || !isStreaming) {
      setError('Camera not active')
      return
    }

    try {
      setIsCapturing(true)
      setError('')

      // Get face descriptor from current video frame
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      
      if (!descriptor) {
        throw new Error('No face detected. Please ensure your face is clearly visible.')
      }

      // Capture image blob
      const imageBlob = await faceApiUtils.captureFromVideo(videoRef.current)
      
      // Convert descriptor to array for storage
      const descriptorArray = faceApiUtils.descriptorToArray(descriptor)

      if (onCapture) {
        onCapture({
          imageBlob,
          descriptor: descriptorArray, // Changed from faceDescriptor to descriptor for consistency
          faceDescriptor: descriptorArray, // Keep both for backward compatibility
          detectionCount: detections?.length || 0
        })
      }

    } catch (err) {
      console.error('Capture error:', err)
      setError(err.message || 'Failed to capture face. Please try again.')
      if (onError) onError(err)
    } finally {
      setIsCapturing(false)
    }
  }

  const hasValidFace = detections && detections.length > 0

  // ---- OpenCV Integration ----
  const loadOpenCV = async () => {
    try {
      if (window.cv && window.cv.FS_createDataFile) {
        // Already loaded
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = OPENCV_SCRIPT_URL
          script.async = true
          script.onload = () => {
            if (window.cv && window.cv['onRuntimeInitialized']) {
              const prev = window.cv['onRuntimeInitialized']
              window.cv['onRuntimeInitialized'] = () => {
                prev && prev()
                resolve()
              }
            } else if (window.cv) {
              window.cv['onRuntimeInitialized'] = resolve
            } else {
              // Fallback small delay
              setTimeout(resolve, 500)
            }
          }
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      // Load Haar cascade into OpenCV FS
      const response = await fetch(HAAR_CASCADE_URL)
      const data = await response.arrayBuffer()
      const data8 = new Uint8Array(data)
      if (!window.cv.FS_createDataFile) return
      try {
        // If file exists, this will throw; ignore
        window.cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data8, true, false, false)
      } catch (_) {}

      const classifier = new window.cv.CascadeClassifier()
      classifier.load('haarcascade_frontalface_default.xml')
      faceCascadeRef.current = classifier
      setOpenCVReady(true)
    } catch (e) {
      console.warn('OpenCV failed to initialize, falling back to face-api.js', e)
      setOpenCVReady(false)
    }
  }

  const initializeOpenCVObjects = (videoEl) => {
    const cv = window.cv
    const vw = videoEl.videoWidth
    const vh = videoEl.videoHeight
    cvSrcRef.current = new cv.Mat(vh, vw, cv.CV_8UC4)
    cvDstRef.current = new cv.Mat(vh, vw, cv.CV_8UC4)
    cvGrayRef.current = new cv.Mat()
    cvFacesRef.current = new cv.RectVector()
    cvCapRef.current = new cv.VideoCapture(videoEl)
  }

  const cleanupOpenCVObjects = () => {
    const mats = [cvSrcRef, cvDstRef, cvGrayRef, cvFacesRef]
    mats.forEach(ref => {
      try { ref.current && ref.current.delete && ref.current.delete() } catch (_) {}
      ref.current = null
    })
    cvCapRef.current = null
  }

  const processVideoOpenCV = () => {
    const cv = window.cv
    const FPS = 30
    try {
      if (!isStreaming || !opencvLoopActiveRef.current || !cvCapRef.current) {
        cleanupOpenCVObjects()
        return
      }
      const begin = Date.now()

      // Read frame
      cvCapRef.current.read(cvSrcRef.current)
      cvSrcRef.current.copyTo(cvDstRef.current)
      cv.cvtColor(cvDstRef.current, cvGrayRef.current, cv.COLOR_RGBA2GRAY, 0)

      // Detect faces
      faceCascadeRef.current.detectMultiScale(cvGrayRef.current, cvFacesRef.current, 1.1, 3, 0)

      // Draw rectangles
      for (let i = 0; i < cvFacesRef.current.size(); ++i) {
        const face = cvFacesRef.current.get(i)
        const p1 = new cv.Point(face.x, face.y)
        const p2 = new cv.Point(face.x + face.width, face.y + face.height)
        cv.rectangle(cvDstRef.current, p1, p2, [34, 197, 94, 255])
      }

      // Show on overlay canvas
      if (canvasRef.current) {
        cv.imshow(canvasRef.current, cvDstRef.current)
      }

      // Update detection state
      const detectedCount = cvFacesRef.current.size()
      setDetections(new Array(detectedCount).fill(0))

      // Auto-capture after 5 seconds of continuous detection
      if (detectedCount > 0) {
        if (!detectionStartTimestampRef.current) {
          detectionStartTimestampRef.current = Date.now()
        } else if (!captureScheduledRef.current && Date.now() - detectionStartTimestampRef.current >= 5000) {
          captureScheduledRef.current = true
          captureImage().catch(() => {})
        }
      } else {
        detectionStartTimestampRef.current = null
      }

      // Schedule next frame
      const delay = Math.max(0, (1000 / FPS) - (Date.now() - begin))
      setTimeout(processVideoOpenCV, delay)
    } catch (err) {
      console.warn('OpenCV processing error', err)
      // Try again shortly
      setTimeout(processVideoOpenCV, 100)
    }
  }

  return (
    <div className={`face-capture-container ${className}`}>
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

        {/* Canvas Overlay for Face Detection */}
        <canvas
          ref={canvasRef}
          className="face-overlay absolute top-0 left-0 pointer-events-none"
          style={{ 
            display: isStreaming ? 'block' : 'none',
            width: '100%',
            height: '100%'
          }}
        />

        {/* Placeholder when camera is off */}
        {!isStreaming && (
          <div className="w-full max-w-md mx-auto h-64 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">Camera Preview</p>
            </div>
          </div>
        )}

        {/* Face Detection Status */}
        {isStreaming && (
          <div className="absolute top-2 right-2 space-y-1">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              hasValidFace 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {hasValidFace ? `✓ ${detections.length} Face(s)` : '⚠ No Face'}
            </div>
            {/* Debug info */}
            <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'No video'}
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
            disabled={isCapturing}
          >
            Start Camera
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
              onClick={captureImage}
              disabled={isCapturing}
              className={`px-6 py-3 rounded-lg font-semibold ${
                hasValidFace 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              {isCapturing ? (
                <LoadingSpinner size="sm" text="Capturing..." />
              ) : hasValidFace ? (
                '📸 Capture Face'
              ) : (
                '📸 Capture Anyway'
              )}
            </button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 alert alert-danger">
          <p>{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>
          {!isStreaming 
            ? 'Click "Start Camera" to begin face capture'
            : hasValidFace
            ? 'Face detected! Click "Capture Face" to proceed'
            : 'Please position your face clearly in the camera view'
          }
        </p>
      </div>
    </div>
  )
}

export default FaceCapture
