import React, { useState } from 'react'
import { apiService } from '../services/apiService'
import { supabase } from '../services/supabaseService'

const NetworkTest = () => {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const testResults = {}

    try {
      // Test 1: Backend health check
      console.log('🏥 Testing backend health...')
      try {
        const healthResult = await apiService.health()
        testResults.health = { success: true, data: healthResult }
        console.log('✅ Backend health OK:', healthResult)
      } catch (error) {
        testResults.health = { success: false, error: error.message }
        console.error('❌ Backend health failed:', error)
      }

      // Test 2: Face stats endpoint
      console.log('📊 Testing face stats endpoint...')
      try {
        const statsResult = await apiService.face.getStats()
        testResults.faceStats = { success: true, data: statsResult }
        console.log('✅ Face stats OK:', statsResult)
      } catch (error) {
        testResults.faceStats = { success: false, error: error.message }
        console.error('❌ Face stats failed:', error)
      }

      // Test 3: Direct Supabase query for records
      console.log('🗄️ Testing direct Supabase query...')
      try {
        const { data: records, error: supabaseError } = await supabase
          .from('records')
          .select('id, patta_id, name, face_embedding')
          .limit(5)

        if (supabaseError) throw supabaseError

        const recordsWithFaces = records?.filter(r => r.face_embedding) || []
        testResults.supabaseRecords = { 
          success: true, 
          data: {
            totalRecords: records?.length || 0,
            recordsWithFaces: recordsWithFaces.length,
            sampleRecords: records?.map(r => ({
              id: r.id,
              patta_id: r.patta_id,
              name: r.name,
              hasFaceEmbedding: !!r.face_embedding
            })) || []
          }
        }
        console.log('✅ Supabase query OK:', testResults.supabaseRecords.data)
      } catch (error) {
        testResults.supabaseRecords = { success: false, error: error.message }
        console.error('❌ Supabase query failed:', error)
      }

      // Test 4: Face verification with mock data
      console.log('🔍 Testing face verification endpoint...')
      try {
        const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1)
        const verifyResult = await apiService.face.verify(mockEmbedding, null, 0.5)
        testResults.faceVerify = { success: true, data: verifyResult }
        console.log('✅ Face verification OK:', verifyResult)
      } catch (error) {
        testResults.faceVerify = { success: false, error: error.message }
        console.error('❌ Face verification failed:', error)
      }

      // Test 5: Network connectivity
      console.log('🌐 Testing network connectivity...')
      try {
        const response = await fetch('http://localhost:3001/api/health')
        const data = await response.json()
        testResults.networkFetch = { success: true, data }
        console.log('✅ Network fetch OK:', data)
      } catch (error) {
        testResults.networkFetch = { success: false, error: error.message }
        console.error('❌ Network fetch failed:', error)
      }

    } catch (globalError) {
      console.error('💥 Global test error:', globalError)
    }

    setResults(testResults)
    setLoading(false)
  }

  const createTestRecord = async () => {
    try {
      setLoading(true)
      console.log('🧪 Creating test record with face data...')

      // Generate mock face embedding
      const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1)
      
      const testRecord = {
        patta_id: `NETWORK_TEST_${Date.now()}`,
        name: 'Network Test User',
        father_name: 'Test Father',
        village: 'Test Village',
        district: 'Test District',
        state: 'Madhya Pradesh',
        land_area: 1.0,
        land_type: 'Agricultural',
        survey_number: 'NET001',
        coordinates: { lat: 23.2599, lng: 77.4126 },
        details_json: { test: true, network_test: true },
        face_embedding: mockEmbedding,
        photo_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TkVUPC90ZXh0Pjwvc3ZnPg==',
        verification_status: 'pending'
      }

      const { data: record, error } = await supabase
        .from('records')
        .insert([testRecord])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Test record created:', record)
      
      // Now test verification with the same embedding
      const verifyResult = await apiService.face.verify(mockEmbedding, null, 0.5)
      console.log('✅ Verification with test record:', verifyResult)

      setResults(prev => ({
        ...prev,
        testRecordCreation: { success: true, data: { record, verifyResult } }
      }))

    } catch (error) {
      console.error('❌ Test record creation failed:', error)
      setResults(prev => ({
        ...prev,
        testRecordCreation: { success: false, error: error.message }
      }))
    } finally {
      setLoading(false)
    }
  }

  const cleanupTestRecords = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('records')
        .delete()
        .like('patta_id', 'NETWORK_TEST_%')

      if (error) throw error
      console.log('✅ Test records cleaned up')
      setResults(prev => ({
        ...prev,
        cleanup: { success: true, message: 'Test records cleaned up' }
      }))
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
      setResults(prev => ({
        ...prev,
        cleanup: { success: false, error: error.message }
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Network & API Test</h1>
      
      <div className="mb-6 space-x-4 text-center">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '🔄 Running Tests...' : '🧪 Run All Tests'}
        </button>
        
        <button
          onClick={createTestRecord}
          disabled={loading}
          className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '📝 Creating...' : '📝 Create Test Record'}
        </button>
        
        <button
          onClick={cleanupTestRecords}
          disabled={loading}
          className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? '🗑️ Cleaning...' : '🗑️ Cleanup Test Records'}
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([testName, result]) => (
          <div key={testName} className={`p-4 rounded-lg border ${
            result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? '✅' : '❌'} {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h3>
            </div>
            
            {result.success ? (
              <div className="text-sm text-green-700">
                <pre className="bg-green-100 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-red-700">
                <p className="font-medium">Error: {result.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">What This Test Checks:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
          <li>Backend server connectivity and health</li>
          <li>Face API endpoints accessibility</li>
          <li>Supabase database connectivity</li>
          <li>Records with face embeddings in database</li>
          <li>Network requests using different methods (axios vs fetch)</li>
          <li>Complete verification workflow with test data</li>
        </ul>
      </div>
    </div>
  )
}

export default NetworkTest
