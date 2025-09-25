import React, { useRef, useEffect, useState } from 'react'
import * as faceapi from 'face-api.js'

const SimpleFaceTest = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('Click Start to begin')
  const [isRunning, setIsRunning] = useState(false)
  const [detectionCount, setDetectionCount] = useState(0)
  const intervalRef = useRef(null)

  const loadModels = async () => {
    try {
      setStatus('Loading models...')
      
      // Load only the tiny face detector first
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      
      setStatus('Models loaded! Starting camera...')
      return true
    } catch (error) {
      console.error('Model loading error:', error)
      setStatus(`Model error: ${error.message}`)
      return false
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      
      videoRef.current.srcObject = stream
      videoRef.current.play()
      
      setStatus('Camera started. Waiting for video...')
      
      // Wait for video to be ready
      videoRef.current.onloadeddata = () => {
        setStatus('Video ready. Starting detection...')
        startDetection()
      }
      
    } catch (error) {
      console.error('Camera error:', error)
      setStatus(`Camera error: ${error.message}`)
    }
  }

  const startDetection = () => {
    setIsRunning(true)
    
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) return
      
      try {
        // Very simple detection - just tiny face detector
        const detections = await faceapi.detectAllFaces(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.3
          })
        )
        
        setDetectionCount(detections.length)
        
        if (detections.length > 0) {
          setStatus(`✅ FOUND ${detections.length} FACE(S)!`)
          
          // Draw simple rectangles
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 3
          
          detections.forEach((detection, i) => {
            const { x, y, width, height } = detection.box
            ctx.strokeRect(x, y, width, height)
            ctx.fillStyle = '#00ff00'
            ctx.font = '20px Arial'
            ctx.fillText(`FACE ${i + 1}`, x, y - 10)
          })
          
          console.log(`✅ Detected ${detections.length} faces:`, detections)
        } else {
          setStatus('❌ No faces detected')
          const ctx = canvasRef.current.getContext('2d')
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
        
      } catch (error) {
        console.error('Detection error:', error)
        setStatus(`Detection error: ${error.message}`)
      }
    }
    
    // Run detection every 1 second
    intervalRef.current = setInterval(detectFaces, 1000)
    detectFaces() // Run immediately
  }

  const handleStart = async () => {
    const modelsLoaded = await loadModels()
    if (modelsLoaded) {
      await startCamera()
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setStatus('Stopped')
    setDetectionCount(0)
  }

  useEffect(() => {
    return () => {
      handleStop()
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Simple Face Detection Test</h1>
      
      <div className="mb-6">
        <div className={`p-4 rounded text-center text-lg font-semibold ${
          detectionCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </div>
      </div>

      <div className="relative mb-6 flex justify-center">
        <div className="relative">
          <video
            ref={videoRef}
            className="rounded-lg border-4 border-gray-300"
            width="640"
            height="480"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={() => {
              if (canvasRef.current && videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth
                canvasRef.current.height = videoRef.current.videoHeight
                canvasRef.current.style.width = '640px'
                canvasRef.current.style.height = '480px'
              }
            }}
          />
          
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: '640px',
              height: '480px'
            }}
          />
        </div>
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-green-500 text-white rounded-lg text-lg font-semibold hover:bg-green-600"
          >
            🚀 START DETECTION
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-3 bg-red-500 text-white rounded-lg text-lg font-semibold hover:bg-red-600"
          >
            ⏹️ STOP
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-2xl font-bold text-blue-600">{detectionCount}</div>
          <div className="text-blue-800">Faces Detected</div>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <div className="text-2xl font-bold text-purple-600">
            {videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : '0x0'}
          </div>
          <div className="text-purple-800">Video Size</div>
        </div>
        <div className="bg-orange-50 p-4 rounded">
          <div className="text-2xl font-bold text-orange-600">{isRunning ? 'ON' : 'OFF'}</div>
          <div className="text-orange-800">Detection Status</div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "START DETECTION" to begin</li>
          <li>Allow camera permissions when prompted</li>
          <li>Position your face clearly in the camera view</li>
          <li>Look for green rectangles around detected faces</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ol>
      </div>
    </div>
  )
}

export default SimpleFaceTest
