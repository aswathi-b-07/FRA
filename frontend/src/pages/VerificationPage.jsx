import React, { useState } from 'react'
import { apiService } from '../services/apiService'
import FaceCapture from '../components/FaceCapture'
import LoadingSpinner from '../components/LoadingSpinner'

const VerificationPage = () => {
  const [verificationStep, setVerificationStep] = useState('input') // input, capture, verify, results
  const [searchName, setSearchName] = useState('')
  const [capturedData, setCapturedData] = useState(null)
  const [verificationResults, setVerificationResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFaceCapture = (data) => {
    console.log('🎯 Face capture data received:', {
      hasImageBlob: !!data.imageBlob,
      hasDescriptor: !!data.descriptor,
      hasFaceDescriptor: !!data.faceDescriptor,
      descriptorLength: data.descriptor?.length || data.faceDescriptor?.length,
      descriptorType: typeof (data.descriptor || data.faceDescriptor),
      detectionCount: data.detectionCount,
      allKeys: Object.keys(data)
    })
    
    setCapturedData(data)
    setVerificationStep('verify')
  }

  const handleFaceCaptureError = (error) => {
    setError('Face capture failed: ' + error.message)
  }

  const performVerification = async () => {
    // Check for face descriptor in multiple possible fields
    const descriptor = capturedData?.descriptor || capturedData?.faceDescriptor
    
    if (!descriptor) {
      console.error('❌ No face data found in captured data:', capturedData)
      setError('No face data captured. Please capture your face again.')
      return
    }
    
    console.log('✅ Face descriptor found:', {
      type: typeof descriptor,
      length: descriptor?.length,
      isArray: Array.isArray(descriptor)
    })

    try {
      setLoading(true)
      setError('')

      console.log('🔍 Starting face verification...')
      console.log('Face descriptor length:', descriptor.length)
      console.log('Search name:', searchName.trim() || 'All records')

      // Convert Float32Array to regular array if needed
      const faceEmbedding = Array.isArray(descriptor) 
        ? descriptor 
        : Array.from(descriptor);

      const result = await apiService.face.verify(
        faceEmbedding,
        searchName.trim() || null,
        0.5 // Lower threshold for better matching (50% instead of 60%)
      )

      console.log('🎯 Verification result:', result)
      setVerificationResults(result)
      setVerificationStep('results')

    } catch (err) {
      console.error('💥 Verification error:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        responseData: err.response?.data,
        status: err.response?.status,
        config: err.config
      })
      
      let errorMessage = 'Verification failed: '
      
      if (err.response) {
        // Server responded with error
        errorMessage += err.response.data?.error || err.response.data?.message || `Server error (${err.response.status})`
      } else if (err.request) {
        // Request was made but no response
        errorMessage += 'Network error - please check your connection and ensure the backend server is running'
      } else {
        // Something else happened
        errorMessage += err.message || 'An unexpected error occurred'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetVerification = () => {
    setVerificationStep('input')
    setSearchName('')
    setCapturedData(null)
    setVerificationResults(null)
    setError('')
  }

  const goToCapture = () => {
    setError('')
    setVerificationStep('capture')
  }

  const goBackToInput = () => {
    setCapturedData(null)
    setVerificationStep('input')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Face Verification</h1>
        <p className="mt-2 text-gray-600">
          Verify identity using biometric face recognition technology
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {[
              { id: 'input', name: 'Enter Details', status: verificationStep === 'input' ? 'current' : 'complete' },
              { id: 'capture', name: 'Capture Face', status: verificationStep === 'capture' ? 'current' : verificationStep === 'verify' || verificationStep === 'results' ? 'complete' : 'upcoming' },
              { id: 'verify', name: 'Verify', status: verificationStep === 'verify' ? 'current' : verificationStep === 'results' ? 'complete' : 'upcoming' },
              { id: 'results', name: 'Results', status: verificationStep === 'results' ? 'current' : 'upcoming' }
            ].map((step, stepIdx) => (
              <li key={step.name} className={`relative ${stepIdx !== 3 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== 3 && (
                    <div className={`h-0.5 w-full ${step.status === 'complete' ? 'bg-primary-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  step.status === 'complete' ? 'bg-primary-600' :
                  step.status === 'current' ? 'border-2 border-primary-600 bg-white' :
                  'border-2 border-gray-300 bg-white'
                }`}>
                  {step.status === 'complete' ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={`text-sm font-medium ${step.status === 'current' ? 'text-primary-600' : 'text-gray-500'}`}>
                      {stepIdx + 1}
                    </span>
                  )}
                </div>
                <span className="ml-4 text-sm font-medium text-gray-900">{step.name}</span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Input Details */}
        {verificationStep === 'input' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Enter Search Details (Optional)</h3>
            </div>
            <div className="card-body">
              <div className="max-w-md">
                <label htmlFor="searchName" className="form-label">
                  Name (optional)
                </label>
                <input
                  type="text"
                  id="searchName"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="form-input"
                  placeholder="Enter name to narrow search..."
                />
                <p className="mt-2 text-sm text-gray-600">
                  Leave empty to search all records, or enter a name to filter results.
                </p>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={goToCapture}
                  className="btn btn-primary"
                >
                  Proceed to Face Capture
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Face Capture */}
        {verificationStep === 'capture' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Capture Your Face</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <FaceCapture
                  onCapture={handleFaceCapture}
                  onError={handleFaceCaptureError}
                  className="max-w-lg mx-auto"
                />
                
                <div className="mt-6">
                  <button
                    onClick={goBackToInput}
                    className="btn btn-secondary mr-3"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {verificationStep === 'verify' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Ready to Verify</h3>
            </div>
            <div className="card-body">
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-4 text-lg font-medium text-gray-900">Face Captured Successfully</p>
                  <p className="text-sm text-gray-600">
                    {searchName ? `Searching for: ${searchName}` : 'Searching all records'}
                  </p>
                </div>

                <div className="space-x-4">
                  <button
                    onClick={goBackToInput}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Start Over
                  </button>
                  <button
                    onClick={performVerification}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" text="Verifying..." /> : 'Verify Identity'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {verificationStep === 'results' && verificationResults && (
          <div className="space-y-6">
            {/* Verification Status */}
            <div className={`card ${verificationResults.success ? 'border-green-200' : 'border-red-200'}`}>
              <div className="card-body">
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                    verificationResults.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {verificationResults.success ? (
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  
                  <h3 className={`mt-4 text-xl font-semibold ${
                    verificationResults.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {verificationResults.success ? 'Identity Verified' : 'Identity Not Found'}
                  </h3>
                  
                  <p className="mt-2 text-gray-600">
                    {verificationResults.message}
                  </p>

                  <div className="mt-3 space-y-2">
                    {verificationResults.similarity !== undefined && (
                      <p className="text-sm text-gray-500">
                        Similarity Score: <span className="font-semibold">
                          {typeof verificationResults.similarity === 'number' 
                            ? (verificationResults.similarity * 100).toFixed(1) + '%'
                            : verificationResults.similarity
                          }
                        </span>
                      </p>
                    )}
                    {verificationResults.totalRecordsChecked && (
                      <p className="text-xs text-gray-400">
                        Checked against {verificationResults.totalRecordsChecked} records with face data
                      </p>
                    )}
                    {!verificationResults.success && verificationResults.allSimilarities && verificationResults.allSimilarities.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Top similarities found:</p>
                        <div className="space-y-1">
                          {verificationResults.allSimilarities.slice(0, 3).map((sim, idx) => (
                            <div key={idx} className="text-xs text-gray-400 flex justify-between">
                              <span>{sim.name} ({sim.patta_id})</span>
                              <span>{sim.similarity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Record Details */}
            {verificationResults.success && verificationResults.record && (
              <div className="card">
                <div className="card-header">
                  <h4 className="text-lg font-medium text-gray-900">Verified Record</h4>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="text-lg font-semibold text-gray-900">{verificationResults.record.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Patta ID</dt>
                          <dd className="text-sm text-gray-900 font-mono">{verificationResults.record.patta_id}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Father's Name</dt>
                          <dd className="text-sm text-gray-900">{verificationResults.record.father_name || 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Village</dt>
                          <dd className="text-sm text-gray-900">{verificationResults.record.village}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">District</dt>
                          <dd className="text-sm text-gray-900">{verificationResults.record.district}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">State</dt>
                          <dd className="text-sm text-gray-900">{verificationResults.record.state}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {verificationResults.record.blockchain_token_id && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>Blockchain Verified:</strong> Token ID {verificationResults.record.blockchain_token_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alternative Matches */}
            {verificationResults.matches && verificationResults.matches.length > 1 && (
              <div className="card">
                <div className="card-header">
                  <h4 className="text-lg font-medium text-gray-900">Other Potential Matches</h4>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {verificationResults.matches.slice(1, 4).map((match, index) => (
                      <div key={match.patta_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{match.name}</p>
                          <p className="text-xs text-gray-600">Patta ID: {match.patta_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {match.similarity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="text-center">
              <button
                onClick={resetVerification}
                className="btn btn-primary"
              >
                Verify Another Person
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerificationPage
