import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseService'
import { useAuth } from '../contexts/AuthContext'

const DatabaseDebug = () => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const loadRecords = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🔍 Loading all records from database...')
      
      const { data, error: fetchError } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      console.log('📊 Database records:', data)
      setRecords(data || [])
      
      // Analyze face embedding data
      const withFaceEmbedding = data?.filter(r => r.face_embedding) || []
      const withPhotoUrl = data?.filter(r => r.photo_url) || []
      
      console.log(`📈 Analysis:`)
      console.log(`- Total records: ${data?.length || 0}`)
      console.log(`- Records with face_embedding: ${withFaceEmbedding.length}`)
      console.log(`- Records with photo_url: ${withPhotoUrl.length}`)
      
      withFaceEmbedding.forEach((record, i) => {
        console.log(`👤 Record ${i+1} (${record.patta_id}):`, {
          name: record.name,
          face_embedding_type: typeof record.face_embedding,
          face_embedding_length: Array.isArray(record.face_embedding) ? record.face_embedding.length : 'N/A',
          photo_url: record.photo_url ? 'Present' : 'Missing'
        })
      })

    } catch (err) {
      console.error('❌ Failed to load records:', err)
      setError(`Failed to load records: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestRecord = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🧪 Creating test record with mock face data...')
      
      // Generate mock face embedding
      const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1)
      
      const testRecord = {
        patta_id: `TEST_${Date.now()}`,
        name: 'Test User',
        father_name: 'Test Father',
        village: 'Test Village',
        district: 'Test District',
        state: 'Madhya Pradesh',
        land_area: 2.5,
        land_type: 'Agricultural',
        survey_number: 'TEST001',
        coordinates: { lat: 23.2599, lng: 77.4126 },
        details_json: { test: true },
        face_embedding: mockEmbedding,
        photo_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdDwvdGV4dD48L3N2Zz4=',
        verification_status: 'pending',
        created_by: user?.id
      }
      
      console.log('💾 Inserting test record:', testRecord)
      
      const { data, error: insertError } = await supabase
        .from('records')
        .insert([testRecord])
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      console.log('✅ Test record created:', data)
      
      // Reload records to show the new one
      await loadRecords()
      
    } catch (err) {
      console.error('❌ Failed to create test record:', err)
      setError(`Failed to create test record: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearTestRecords = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🗑️ Clearing test records...')
      
      const { error: deleteError } = await supabase
        .from('records')
        .delete()
        .like('patta_id', 'TEST_%')

      if (deleteError) {
        throw deleteError
      }

      console.log('✅ Test records cleared')
      await loadRecords()
      
    } catch (err) {
      console.error('❌ Failed to clear test records:', err)
      setError(`Failed to clear test records: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Database Debug - Face Embeddings</h1>
      
      <div className="mb-6 flex justify-center space-x-4">
        <button
          onClick={loadRecords}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh Records'}
        </button>
        
        <button
          onClick={createTestRecord}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          🧪 Create Test Record
        </button>
        
        <button
          onClick={clearTestRecords}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          🗑️ Clear Test Records
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{records.length}</div>
          <div className="text-blue-800">Total Records</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {records.filter(r => r.face_embedding).length}
          </div>
          <div className="text-green-800">With Face Data</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">
            {records.filter(r => r.photo_url).length}
          </div>
          <div className="text-purple-800">With Photos</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {user ? 'Yes' : 'No'}
          </div>
          <div className="text-orange-800">Authenticated</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Patta ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Face Embedding</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No records found in database
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {record.patta_id}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {record.name}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {record.face_embedding ? (
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          ✅ Present
                        </span>
                        <div className="text-xs text-gray-500">
                          Type: {typeof record.face_embedding}
                          {Array.isArray(record.face_embedding) && (
                            <span> | Length: {record.face_embedding.length}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        ❌ Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {record.photo_url ? (
                      <div className="flex items-center space-x-2">
                        <img
                          src={record.photo_url}
                          alt="Record"
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'inline'
                          }}
                        />
                        <span style={{ display: 'none' }} className="text-red-500 text-xs">❌ Error</span>
                        <span className="text-green-600 text-xs">✅ Photo</span>
                      </div>
                    ) : (
                      <span className="text-red-500 text-xs">❌ No Photo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(record.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Check if any records have face embeddings (green ✅ in Face Embedding column)</li>
          <li>If no face embeddings, create a record with face capture first</li>
          <li>Use "Create Test Record" to add a record with mock face data for testing</li>
          <li>Check browser console for detailed logging</li>
          <li>Verify that photos are displaying correctly</li>
        </ol>
      </div>
    </div>
  )
}

export default DatabaseDebug
