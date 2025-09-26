import React, { useState, useRef, useEffect } from 'react'
import { apiService } from '../services/apiService'
import { dbService } from '../services/supabaseService'
import faceApiUtils from '../utils/faceApiUtils'
import * as faceapi from 'face-api.js'

const VerificationTest = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [step, setStep] = useState('setup') // setup, capture, verify, results
  const [stream, setStream] = useState(null)
  const [capturedDescriptor, setCapturedDescriptor] = useState(null)
  const [verificationResults, setVerificationResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready to test verification')
  const [allRecords, setAllRecords] = useState([])

  useEffect(() => {
    loadRecords()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const loadRecords = async () => {
    try {
      const { data, error } = await dbService.records.getAll()
      if (!error && data) {
        setAllRecords(data.filter(r => r.face_embedding))
        console.log(`📊 Loaded ${data.filter(r => r.face_embedding).length} records with face data`)
      }
    } catch (error) {
      console.error('Failed to load records:', error)
    }
  }

  const startCamera = async () => {
    try {
      setStatus('Starting camera...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      
      setStream(mediaStream)
      videoRef.current.srcObject = mediaStream
      videoRef.current.play()
      
      setStep('capture')
      setStatus('Camera started. Position your face clearly and click capture.')
    } catch (error) {
      console.error('Camera error:', error)
      setStatus(`Camera error: ${error.message}`)
    }
  }

  const captureForVerification = async () => {
    try {
      setLoading(true)
      setStatus('Capturing face for verification...')

      // Load models if needed
      if (!faceApiUtils.modelsLoaded) {
        setStatus('Loading face detection models...')
        await faceApiUtils.loadModels()
      }

      if (!faceApiUtils.modelsLoaded) {
        throw new Error('Face detection models not loaded')
      }

      // Capture high-quality descriptor
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      
      if (!descriptor) {
        throw new Error('Failed to generate face descriptor')
      }

      const descriptorArray = faceApiUtils.descriptorToArray(descriptor)
      setCapturedDescriptor(descriptorArray)
      
      setStep('verify')
      setStatus(`Face captured successfully! Descriptor length: ${descriptorArray.length}`)
      
    } catch (error) {
      console.error('Capture error:', error)
      setStatus(`Capture failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runVerification = async () => {
    try {
      setLoading(true)
      setStatus('Running verification against database...')

      const result = await apiService.face.verify(
        capturedDescriptor,
        null, // Check all records
        0.5   // 50% threshold for testing
      )

      setVerificationResults(result)
      setStep('results')
      
      if (result.success) {
        setStatus(`✅ Verification complete! Found match with ${(result.similarity * 100).toFixed(1)}% similarity`)
      } else {
        setStatus(`❌ No matches found above 50% similarity. Checked ${result.totalRecordsChecked || 0} records.`)
      }

    } catch (error) {
      console.error('Verification error:', error)
      setStatus(`Verification failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('setup')
    setCapturedDescriptor(null)
    setVerificationResults(null)
    setStatus('Ready to test verification')
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      videoRef.current.srcObject = null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Face Verification Test</h1>
      
      <div className="mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-lg font-semibold text-blue-800">{status}</p>
        </div>
      </div>

      {/* Setup Step */}
      {step === 'setup' && (
        <div className="text-center space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Verification Test Setup</h3>
            <p className="text-gray-600 mb-4">
              This test will capture your face and verify it against stored records in the database.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-blue-600">{allRecords.length}</div>
                <div className="text-sm text-gray-600">Records with Face Data</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-green-600">50%</div>
                <div className="text-sm text-gray-600">Similarity Threshold</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="text-2xl font-bold text-purple-600">128</div>
                <div className="text-sm text-gray-600">Descriptor Dimensions</div>
              </div>
            </div>
          </div>
          
          <button
            onClick={startCamera}
            className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            🎥 Start Verification Test
          </button>
        </div>
      )}

      {/* Capture Step */}
      {step === 'capture' && (
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
            <button
              onClick={captureForVerification}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '📸 Capturing...' : '📸 Capture Face for Verification'}
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Verify Step */}
      {step === 'verify' && (
        <div className="text-center space-y-6">
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-green-800 mb-4">Face Captured Successfully!</h3>
            <p className="text-gray-600 mb-4">
              Face descriptor generated with {capturedDescriptor?.length || 0} dimensions.
              Ready to verify against database.
            </p>
          </div>
          
          <div className="space-x-4">
            <button
              onClick={runVerification}
              disabled={loading}
              className="px-8 py-4 bg-purple-500 text-white rounded-lg text-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? '🔍 Verifying...' : '🔍 Run Verification'}
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && verificationResults && (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border-2 ${
            verificationResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="text-center">
              <div className="text-6xl mb-4">
                {verificationResults.success ? '✅' : '❌'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {verificationResults.success ? 'Match Found!' : 'No Match Found'}
              </h3>
              <p className="text-lg text-gray-600 mb-4">
                {verificationResults.message}
              </p>
              
              {verificationResults.similarity !== undefined && (
                <div className="bg-white p-4 rounded-lg inline-block">
                  <div className="text-3xl font-bold text-blue-600">
                    {(verificationResults.similarity * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Similarity Score</div>
                </div>
              )}
            </div>
          </div>

          {/* Matched Record Details */}
          {verificationResults.success && verificationResults.record && (
            <div className="bg-white border rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">Matched Record</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Name:</strong> {verificationResults.record.name}</p>
                  <p><strong>Patta ID:</strong> {verificationResults.record.patta_id}</p>
                  <p><strong>Father's Name:</strong> {verificationResults.record.father_name || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Village:</strong> {verificationResults.record.village}</p>
                  <p><strong>District:</strong> {verificationResults.record.district}</p>
                  <p><strong>State:</strong> {verificationResults.record.state}</p>
                </div>
              </div>
              
              {verificationResults.record.photo_url && (
                <div className="mt-4 text-center">
                  <img
                    src={verificationResults.record.photo_url}
                    alt="Matched Record"
                    className="w-32 h-32 rounded-lg object-cover mx-auto border-2 border-gray-200"
                  />
                  <p className="text-sm text-gray-500 mt-2">Stored Photo</p>
                </div>
              )}
            </div>
          )}

          {/* All Matches */}
          {verificationResults.allMatches && verificationResults.allMatches.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">All Potential Matches</h4>
              <div className="space-y-3">
                {verificationResults.allMatches.map((match, index) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{match.name}</p>
                      <p className="text-sm text-gray-600">Patta ID: {match.patta_id}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        match.similarity >= 0.8 ? 'text-green-600' :
                        match.similarity >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(match.similarity * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {match.similarity >= 0.8 ? 'High' : 
                         match.similarity >= 0.6 ? 'Medium' : 'Low'} Confidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* Debug Information */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Debug Information</h4>
        <div className="text-sm space-y-1">
          <p>Step: {step}</p>
          <p>Camera Active: {stream ? 'Yes' : 'No'}</p>
          <p>Descriptor Captured: {capturedDescriptor ? 'Yes' : 'No'}</p>
          <p>Records in Database: {allRecords.length}</p>
          <p>Models Loaded: {faceApiUtils.modelsLoaded ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  )
}

export default VerificationTest
