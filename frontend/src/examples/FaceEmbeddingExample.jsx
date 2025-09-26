import React, { useState } from 'react'
import EnhancedFaceCapture from '../components/EnhancedFaceCapture'
import faceEmbeddingService from '../services/faceEmbeddingService'
import { useAuth } from '../contexts/AuthContext'

/**
 * Complete example showing how to use the enhanced face capture system
 * with secure embedding storage in Supabase
 */
const FaceEmbeddingExample = () => {
  const { user } = useAuth()
  const [capturedData, setCapturedData] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [verificationResult, setVerificationResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle successful face capture
  const handleFaceCapture = async (captureData) => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Face captured:', {
        quality: captureData.quality,
        embeddingLength: captureData.faceEmbedding.length,
        detectionCount: captureData.detectionCount
      })

      // Store the captured data
      setCapturedData(captureData)

      // Example: Store embedding in Supabase (requires a record ID)
      if (captureData.recordId) {
        const embeddingId = await faceEmbeddingService.storeEmbedding(
          captureData.recordId,
          new Float32Array(captureData.faceEmbedding),
          {
            qualityScore: captureData.quality,
            detectionConfidence: captureData.metadata.detectionConfidence,
            consentGiven: true
          }
        )
        
        console.log('Embedding stored with ID:', embeddingId)
      }

    } catch (err) {
      console.error('Face capture processing failed:', err)
      setError(`Failed to process captured face: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle capture errors
  const handleCaptureError = (error) => {
    console.error('Capture error:', error)
    setError(`Capture failed: ${error.message}`)
  }

  // Search for similar faces
  const searchSimilarFaces = async () => {
    if (!capturedData?.faceEmbedding) {
      setError('No face embedding available for search')
      return
    }

    try {
      setLoading(true)
      setError('')

      const results = await faceEmbeddingService.findSimilarFaces(
        new Float32Array(capturedData.faceEmbedding),
        {
          threshold: 0.8,
          limit: 10,
          includeMetadata: true
        }
      )

      setSearchResults(results)
      console.log(`Found ${results.length} similar faces`)

    } catch (err) {
      console.error('Search failed:', err)
      setError(`Search failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Verify against a specific record
  const verifyAgainstRecord = async (recordId) => {
    if (!capturedData?.faceEmbedding) {
      setError('No face embedding available for verification')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await faceEmbeddingService.verifyFace(
        new Float32Array(capturedData.faceEmbedding),
        recordId,
        0.85
      )

      setVerificationResult(result)
      console.log('Verification result:', result)

    } catch (err) {
      console.error('Verification failed:', err)
      setError(`Verification failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get embedding statistics
  const getStatistics = async () => {
    try {
      setLoading(true)
      const stats = await faceEmbeddingService.getStatistics()
      console.log('Embedding statistics:', stats)
      alert(`Total embeddings: ${stats.total}\nWith consent: ${stats.withConsent}\nAverage quality: ${(stats.averageQuality * 100).toFixed(1)}%`)
    } catch (err) {
      setError(`Failed to get statistics: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Enhanced Face Capture & Embedding System</h1>
      
      {/* User Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold">Current User</h3>
        <p>{user?.email || 'Not logged in'}</p>
        <p className="text-sm text-gray-600">
          Embeddings are stored securely with encryption and access logging
        </p>
      </div>

      {/* Face Capture Component */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Capture Face with AI Enhancement</h2>
        <EnhancedFaceCapture
          onCapture={handleFaceCapture}
          onError={handleCaptureError}
          autoCapture={true}
          captureDelay={5000}
          qualityThreshold={0.7}
          className="border rounded-lg p-4"
        />
      </div>

      {/* Captured Data Display */}
      {capturedData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Captured Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Embedding Info</h3>
              <p><strong>Quality:</strong> {(capturedData.quality * 100).toFixed(1)}%</p>
              <p><strong>Dimensions:</strong> {capturedData.faceEmbedding.length}D</p>
              <p><strong>Detection Count:</strong> {capturedData.detectionCount}</p>
              <p><strong>Method:</strong> {capturedData.metadata.extractionMethod}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Face Region</h3>
              <p><strong>X:</strong> {capturedData.faceRect.x}</p>
              <p><strong>Y:</strong> {capturedData.faceRect.y}</p>
              <p><strong>Width:</strong> {capturedData.faceRect.width}</p>
              <p><strong>Height:</strong> {capturedData.faceRect.height}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {capturedData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={searchSimilarFaces}
              disabled={loading}
              className="btn btn-primary"
            >
              Search Similar Faces
            </button>
            <button
              onClick={() => verifyAgainstRecord('example-record-id')}
              disabled={loading}
              className="btn btn-secondary"
            >
              Verify Against Record
            </button>
            <button
              onClick={getStatistics}
              disabled={loading}
              className="btn btn-outline"
            >
              Get Statistics
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Similar Faces Found</h2>
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p><strong>Record ID:</strong> {result.record_id}</p>
                    <p><strong>Similarity:</strong> {(result.similarity_score * 100).toFixed(1)}%</p>
                    <p><strong>Quality:</strong> {(result.quality_score * 100).toFixed(1)}%</p>
                    {result.recordMetadata && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>{result.recordMetadata.name}</p>
                        <p>{result.recordMetadata.village}, {result.recordMetadata.district}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => verifyAgainstRecord(result.record_id)}
                    className="btn btn-sm btn-outline"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Verification Result</h2>
          <div className={`p-4 rounded-lg ${
            verificationResult.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className="text-lg font-semibold">
              {verificationResult.verified ? '✅ Verified' : '❌ Not Verified'}
            </p>
            <p><strong>Similarity:</strong> {(verificationResult.similarity * 100).toFixed(1)}%</p>
            <p><strong>Confidence:</strong> {(verificationResult.confidence * 100).toFixed(1)}%</p>
            <p><strong>Quality:</strong> {(verificationResult.quality * 100).toFixed(1)}%</p>
            {!verificationResult.verified && (
              <p className="text-sm text-gray-600 mt-2">
                Reason: {verificationResult.reason || 'Similarity below threshold'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 alert alert-danger">
          <p>{error}</p>
          <button 
            onClick={() => setError('')}
            className="btn btn-sm btn-secondary mt-2"
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">System Features</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>OpenCV.js Integration:</strong> Real-time face detection with Haar cascades</li>
          <li>✅ <strong>AI Embeddings:</strong> 128D face embeddings using face-api.js</li>
          <li>✅ <strong>Secure Storage:</strong> Encrypted embeddings in Supabase with RLS</li>
          <li>✅ <strong>Quality Assessment:</strong> Automatic face quality scoring</li>
          <li>✅ <strong>Auto-Capture:</strong> Intelligent capture after stable detection</li>
          <li>✅ <strong>Similarity Search:</strong> Vector-based face matching</li>
          <li>✅ <strong>Audit Logging:</strong> Complete access trail for compliance</li>
          <li>✅ <strong>GDPR Compliance:</strong> Consent tracking and data retention</li>
        </ul>
      </div>
    </div>
  )
}

export default FaceEmbeddingExample
