import React, { useRef, useEffect, useState } from 'react'
import * as faceapi from 'face-api.js'

const FaceDetectionTest = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('Initializing...')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [stream, setStream] = useState(null)
  const [detections, setDetections] = useState([])

  useEffect(() => {
    initializeFaceAPI()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const initializeFaceAPI = async () => {
    try {
      setStatus('Loading face detection models...')
      console.log('Starting face-api initialization')
      
      // Load models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
      
      setModelsLoaded(true)
      setStatus('Models loaded successfully! Click Start Camera.')
      console.log('✅ Face-api models loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load models:', error)
      setStatus(`Failed to load models: ${error.message}`)
    }
  }

  const startCamera = async () => {
    try {
      setStatus('Starting camera...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      })
      
      setStream(mediaStream)
      videoRef.current.srcObject = mediaStream
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
        setStatus('Camera started. Starting face detection...')
        startDetection()
      }
    } catch (error) {
      console.error('Camera error:', error)
      setStatus(`Camera error: ${error.message}`)
    }
  }

  const startDetection = () => {
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded) return

      try {
        // Simple detection without landmarks or descriptors first
        const detectionResults = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.3
          }))

        setDetections(detectionResults)
        
        if (detectionResults.length > 0) {
          setStatus(`✅ Detected ${detectionResults.length} face(s)!`)
          
          // Draw on canvas
          const canvas = canvasRef.current
          const displaySize = { width: canvas.width, height: canvas.height }
          const ctx = canvas.getContext('2d')
          
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Manual drawing
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 3
          
          detectionResults.forEach((detection, i) => {
            const box = detection.box
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            ctx.fillStyle = '#00ff00'
            ctx.font = '16px Arial'
            ctx.fillText(`Face ${i+1} (${(detection.score * 100).toFixed(1)}%)`, box.x, box.y - 10)
          })
          
        } else {
          setStatus('No faces detected')
          const ctx = canvasRef.current.getContext('2d')
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      } catch (error) {
        console.error('Detection error:', error)
        setStatus(`Detection error: ${error.message}`)
      }
    }

    // Run detection every 500ms
    const interval = setInterval(detectFaces, 500)
    
    // Cleanup function
    return () => clearInterval(interval)
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      videoRef.current.srcObject = null
      setStatus('Camera stopped')
      setDetections([])
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Face Detection Test</h2>
      
      <div className="mb-4">
        <div className={`p-3 rounded ${
          modelsLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          Status: {status}
        </div>
      </div>

      <div className="relative mb-4">
        <video
          ref={videoRef}
          className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
            }
          }}
        />
        
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      <div className="flex justify-center space-x-4">
        {!stream ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Camera
          </button>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Detections: {detections.length}</p>
        <p>Models Loaded: {modelsLoaded ? 'Yes' : 'No'}</p>
        <p>Camera Active: {stream ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

export default FaceDetectionTest
