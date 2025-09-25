import React, { useRef, useEffect, useState } from 'react'
import faceApiUtils from '../utils/faceApiUtils'
import LoadingSpinner from './LoadingSpinner'

const FaceCapture = ({ onCapture, onError, className = '' }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState('')
  const [stream, setStream] = useState(null)
  const [detections, setDetections] = useState(null)

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
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const startFaceDetection = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const detect = async () => {
      if (!isStreaming || !videoRef.current) return

      try {
        const detections = await faceApiUtils.detectFace(videoRef.current)
        setDetections(detections)
        
        // Draw detections on canvas
        if (canvasRef.current) {
          faceApiUtils.drawDetections(canvasRef.current, detections)
        }
      } catch (err) {
        // Ignore detection errors during streaming
        console.debug('Detection error:', err.message)
      }

      // Continue detection loop
      if (isStreaming) {
        requestAnimationFrame(detect)
      }
    }

    detect()
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
          faceDescriptor: descriptorArray,
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
          className="face-overlay absolute top-0 left-0 w-full h-full"
          style={{ display: isStreaming ? 'block' : 'none' }}
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
          <div className="absolute top-2 right-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              hasValidFace 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {hasValidFace ? '✓ Face Detected' : '⚠ No Face'}
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
              disabled={!hasValidFace || isCapturing}
              className="btn btn-success"
            >
              {isCapturing ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                'Capture Face'
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
