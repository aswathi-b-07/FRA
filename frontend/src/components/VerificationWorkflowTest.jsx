import React, { useState, useRef } from 'react'
import { supabase } from '../services/supabaseService'
import { apiService } from '../services/apiService'
import { useAuth } from '../contexts/AuthContext'
import faceApiUtils from '../utils/faceApiUtils'

const VerificationWorkflowTest = () => {
  const { user } = useAuth()
  const videoRef = useRef(null)
  const [step, setStep] = useState('setup') // setup, create-record, verify-record, results
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready to test complete verification workflow')
  const [testRecord, setTestRecord] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [stream, setStream] = useState(null)

  const updateStatus = (message) => {
    console.log('🔄', message)
    setStatus(message)
  }

  const startCamera = async () => {
    try {
      updateStatus('Starting camera...')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      setStream(mediaStream)
      videoRef.current.srcObject = mediaStream
      videoRef.current.play()
      return true
    } catch (error) {
      updateStatus(`Camera error: ${error.message}`)
      return false
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const captureAndCreateRecord = async () => {
    try {
      setLoading(true)
      updateStatus('Loading face detection models...')

      // Ensure models are loaded
      if (!faceApiUtils.modelsLoaded) {
        await faceApiUtils.loadModels()
      }

      if (!faceApiUtils.modelsLoaded) {
        throw new Error('Face detection models failed to load')
      }

      updateStatus('Capturing face for record creation...')
      
      // Capture face descriptor
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      if (!descriptor) {
        throw new Error('Failed to capture face descriptor')
      }

      const faceEmbedding = Array.isArray(descriptor) ? descriptor : Array.from(descriptor)
      updateStatus(`Face captured! Descriptor length: ${faceEmbedding.length}`)

      // Create a test record with unique ID
      const testPattaId = `TEST_VERIFY_${Date.now()}`
      updateStatus(`Creating test record with Patta ID: ${testPattaId}`)

      const recordData = {
        patta_id: testPattaId,
        name: 'Test Verification User',
        father_name: 'Test Father',
        village: 'Test Village',
        district: 'Test District',
        state: 'Madhya Pradesh',
        land_area: 1.5,
        land_type: 'Agricultural',
        survey_number: 'TEST_VERIFY_001',
        coordinates: { lat: 23.2599, lng: 77.4126 },
        details_json: { test: true, verification_test: true },
        face_embedding: faceEmbedding,
        photo_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdDwvdGV4dD48L3N2Zz4=',
        verification_status: 'pending',
        created_by: user?.id
      }

      const { data: record, error: createError } = await supabase
        .from('records')
        .insert([recordData])
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create record: ${createError.message}`)
      }

      updateStatus(`✅ Record created successfully: ${record.name} (${record.patta_id})`)
      setTestRecord(record)
      setStep('verify-record')

    } catch (error) {
      console.error('❌ Create record error:', error)
      updateStatus(`❌ Failed to create record: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const verifyWithSameFace = async () => {
    try {
      setLoading(true)
      updateStatus('Capturing face again for verification...')

      // Capture face descriptor again (same person)
      const descriptor = await faceApiUtils.getFaceDescriptorFromVideo(videoRef.current)
      if (!descriptor) {
        throw new Error('Failed to capture face descriptor for verification')
      }

      const faceEmbedding = Array.isArray(descriptor) ? descriptor : Array.from(descriptor)
      updateStatus(`Face captured for verification! Descriptor length: ${faceEmbedding.length}`)

      // Perform verification
      updateStatus('Performing face verification against database...')
      const result = await apiService.face.verify(faceEmbedding, null, 0.5)

      updateStatus('✅ Verification complete!')
      setVerificationResult(result)
      setStep('results')

    } catch (error) {
      console.error('❌ Verification error:', error)
      updateStatus(`❌ Verification failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const cleanupTestRecord = async () => {
    if (testRecord) {
      try {
        updateStatus('Cleaning up test record...')
        await supabase
          .from('records')
          .delete()
          .eq('id', testRecord.id)
        updateStatus('✅ Test record cleaned up')
      } catch (error) {
        console.error('Cleanup error:', error)
      }
    }
  }

  const reset = async () => {
    await cleanupTestRecord()
    stopCamera()
    setStep('setup')
    setTestRecord(null)
    setVerificationResult(null)
    updateStatus('Ready to test complete verification workflow')
  }

  const startTest = async () => {
    const cameraStarted = await startCamera()
    if (cameraStarted) {
      setStep('create-record')
      updateStatus('Camera ready. Click "Create Test Record" to capture your face and create a record.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Complete Verification Workflow Test</h1>
      
      <div className="mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-lg font-semibold text-blue-800">{status}</p>
        </div>
      </div>

      {/* Step 1: Setup */}
      {step === 'setup' && (
        <div className="text-center space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Verification Workflow Test</h3>
            <p className="text-gray-600 mb-4">
              This test will:
            </p>
            <ol className="list-decimal list-inside text-left space-y-2 text-gray-600 max-w-md mx-auto">
              <li>Capture your face and create a test record</li>
              <li>Capture your face again for verification</li>
              <li>Test if the same person is correctly verified</li>
              <li>Show detailed results and cleanup</li>
            </ol>
          </div>
          
          <button
            onClick={startTest}
            className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            🎥 Start Workflow Test
          </button>
        </div>
      )}

      {/* Camera Steps */}
      {(step === 'create-record' || step === 'verify-record') && (
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
          </div>
          
          <div className="text-center space-x-4">
            {step === 'create-record' && (
              <button
                onClick={captureAndCreateRecord}
                disabled={loading}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? '📸 Creating Record...' : '📸 Create Test Record'}
              </button>
            )}
            
            {step === 'verify-record' && (
              <button
                onClick={verifyWithSameFace}
                disabled={loading}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? '🔍 Verifying...' : '🔍 Verify Same Person'}
              </button>
            )}
            
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Reset Test
            </button>
          </div>

          {testRecord && step === 'verify-record' && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">
                ✅ Test record created: <strong>{testRecord.name}</strong> ({testRecord.patta_id})
              </p>
              <p className="text-sm text-green-600 mt-1">
                Now capture your face again to test verification accuracy
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && verificationResult && (
        <div className="space-y-6">
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <div className="text-8xl mb-4">
              {verificationResult.success ? '✅' : '❌'}
            </div>
            <h3 className="text-3xl font-bold mb-4">
              {verificationResult.success ? 'Verification Successful!' : 'Verification Failed'}
            </h3>
            
            <div className="bg-white p-6 rounded-lg inline-block max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Test Results</h4>
                  <div className="text-sm space-y-1 text-left">
                    <p><strong>Success:</strong> {verificationResult.success ? 'Yes' : 'No'}</p>
                    <p><strong>Message:</strong> {verificationResult.message}</p>
                    <p><strong>Records Checked:</strong> {verificationResult.totalRecordsChecked || 0}</p>
                    {verificationResult.similarity && (
                      <p><strong>Best Similarity:</strong> {
                        typeof verificationResult.similarity === 'number' 
                          ? (verificationResult.similarity * 100).toFixed(2) + '%'
                          : verificationResult.similarity
                      }</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Expected vs Actual</h4>
                  <div className="text-sm space-y-1 text-left">
                    <p><strong>Expected:</strong> Same person should verify</p>
                    <p><strong>Actual:</strong> {verificationResult.success ? 'Verified successfully' : 'Failed to verify'}</p>
                    <p><strong>Test Status:</strong> 
                      <span className={verificationResult.success ? 'text-green-600' : 'text-red-600'}>
                        {verificationResult.success ? ' PASS ✅' : ' FAIL ❌'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {verificationResult.success && verificationResult.record && (
                <div className="mt-4 p-3 bg-green-50 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Matched Record:</strong> {verificationResult.record.name} ({verificationResult.record.patta_id})
                  </p>
                </div>
              )}

              {verificationResult.allSimilarities && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-semibold mb-2">All Similarities:</p>
                  <div className="space-y-1">
                    {verificationResult.allSimilarities.map((sim, idx) => (
                      <div key={idx} className="text-xs flex justify-between">
                        <span>{sim.name} ({sim.patta_id})</span>
                        <span>{sim.similarity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center space-x-4">
            <button
              onClick={reset}
              className="px-8 py-4 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
            >
              🔄 Run Test Again
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">What This Test Validates:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
          <li>Face capture and descriptor generation</li>
          <li>Record creation with face embeddings</li>
          <li>Database storage of face data</li>
          <li>Face verification accuracy for same person</li>
          <li>End-to-end workflow functionality</li>
        </ul>
      </div>
    </div>
  )
}

export default VerificationWorkflowTest
