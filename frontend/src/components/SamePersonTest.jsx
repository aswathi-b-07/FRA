import React, { useState, useRef, useEffect } from 'react'
import faceApiUtils from '../utils/faceApiUtils'
import * as faceapi from 'face-api.js'

const SamePersonTest = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [step, setStep] = useState('setup') // setup, capture1, capture2, compare
  const [stream, setStream] = useState(null)
  const [descriptor1, setDescriptor1] = useState(null)
  const [descriptor2, setDescriptor2] = useState(null)
  const [similarity, setSimilarity] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready to test same person verification')

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setStatus('Starting camera...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      
      setStream(mediaStream)
      videoRef.current.srcObject = mediaStream
      videoRef.current.play()
      
      setStep('capture1')
      setStatus('Camera started. Capture your face for the first time.')
    } catch (error) {
      console.error('Camera error:', error)
      setStatus(`Camera error: ${error.message}`)
    }
  }

  const captureFirst = async () => {
    try {
      setLoading(true)
      setStatus('Capturing first face sample...')

      // Load models if needed
      if (!faceApiUtils.modelsLoaded) {
        setStatus('Loading face detection models...')
        await faceApiUtils.loadModels()
      }

      if (!faceApiUtils.modelsLoaded) {
        throw new Error('Face detection models not loaded')
      }

      // Capture descriptor
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      
      if (!descriptor) {
        throw new Error('Failed to generate face descriptor')
      }

      const descriptorArray = faceApiUtils.descriptorToArray(descriptor)
      setDescriptor1(descriptorArray)
      
      setStep('capture2')
      setStatus('First capture complete! Now capture your face again for comparison.')
      
    } catch (error) {
      console.error('First capture error:', error)
      setStatus(`First capture failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const captureSecond = async () => {
    try {
      setLoading(true)
      setStatus('Capturing second face sample...')

      // Capture descriptor
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      
      if (!descriptor) {
        throw new Error('Failed to generate face descriptor')
      }

      const descriptorArray = faceApiUtils.descriptorToArray(descriptor)
      setDescriptor2(descriptorArray)
      
      setStep('compare')
      setStatus('Second capture complete! Comparing...')
      
      // Calculate similarity
      const sim = faceApiUtils.calculateSimilarity(descriptor1, descriptorArray)
      setSimilarity(sim)
      
      setStatus(`Comparison complete! Similarity: ${(sim * 100).toFixed(2)}%`)
      
    } catch (error) {
      console.error('Second capture error:', error)
      setStatus(`Second capture failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('setup')
    setDescriptor1(null)
    setDescriptor2(null)
    setSimilarity(null)
    setStatus('Ready to test same person verification')
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      videoRef.current.srcObject = null
    }
  }

  const getSimilarityColor = (sim) => {
    if (sim >= 0.8) return 'text-green-600'
    if (sim >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSimilarityLabel = (sim) => {
    if (sim >= 0.8) return 'Excellent Match'
    if (sim >= 0.6) return 'Good Match'
    if (sim >= 0.4) return 'Possible Match'
    return 'Poor Match'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Same Person Verification Test</h1>
      
      <div className="mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-lg font-semibold text-blue-800">{status}</p>
        </div>
      </div>

      {/* Setup Step */}
      {step === 'setup' && (
        <div className="text-center space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Same Person Verification Test</h3>
            <p className="text-gray-600 mb-4">
              This test captures your face twice and compares the similarity to verify the accuracy of face recognition.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• Excellent Match: 80%+ similarity</p>
              <p>• Good Match: 60-79% similarity</p>
              <p>• Possible Match: 40-59% similarity</p>
              <p>• Poor Match: Below 40% similarity</p>
            </div>
          </div>
          
          <button
            onClick={startCamera}
            className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            🎥 Start Same Person Test
          </button>
        </div>
      )}

      {/* Camera Steps */}
      {(step === 'capture1' || step === 'capture2') && (
        <div className="space-y-6">
          <div className="relative flex justify-center">
            <video
              ref={videoRef}
              className="rounded-lg border-4 border-blue-300"
              width="640"
              height="480"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: '640px', height: '480px' }}
            />
          </div>
          
          <div className="text-center space-x-4">
            {step === 'capture1' ? (
              <button
                onClick={captureFirst}
                disabled={loading}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? '📸 Capturing...' : '📸 Capture First Sample'}
              </button>
            ) : (
              <button
                onClick={captureSecond}
                disabled={loading}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? '📸 Capturing...' : '📸 Capture Second Sample'}
              </button>
            )}
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Reset
            </button>
          </div>

          {descriptor1 && step === 'capture2' && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">✅ First sample captured! Now capture again for comparison.</p>
            </div>
          )}
        </div>
      )}

      {/* Results Step */}
      {step === 'compare' && similarity !== null && (
        <div className="space-y-6">
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <div className="text-8xl mb-4">
              {similarity >= 0.6 ? '✅' : '❌'}
            </div>
            <h3 className="text-3xl font-bold mb-4">
              {similarity >= 0.6 ? 'Same Person Verified!' : 'Verification Failed'}
            </h3>
            
            <div className="bg-white p-6 rounded-lg inline-block">
              <div className={`text-4xl font-bold ${getSimilarityColor(similarity)}`}>
                {(similarity * 100).toFixed(2)}%
              </div>
              <div className="text-lg text-gray-600">Similarity Score</div>
              <div className={`text-sm font-semibold ${getSimilarityColor(similarity)}`}>
                {getSimilarityLabel(similarity)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">First Capture</h4>
              <p className="text-sm text-blue-600">
                Descriptor Length: {descriptor1?.length || 0}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Sample values: [{descriptor1?.slice(0, 3).map(v => v.toFixed(3)).join(', ')}...]
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Second Capture</h4>
              <p className="text-sm text-purple-600">
                Descriptor Length: {descriptor2?.length || 0}
              </p>
              <p className="text-xs text-purple-500 mt-1">
                Sample values: [{descriptor2?.slice(0, 3).map(v => v.toFixed(3)).join(', ')}...]
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={reset}
              className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
            >
              🔄 Test Again
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">What This Test Shows:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
          <li>How consistent face capture is for the same person</li>
          <li>If the face detection models are working properly</li>
          <li>The similarity threshold needed for accurate verification</li>
          <li>Whether descriptors are being generated correctly</li>
        </ul>
      </div>
    </div>
  )
}

export default SamePersonTest
