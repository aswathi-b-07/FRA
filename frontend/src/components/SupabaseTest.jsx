import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseService'
import { useAuth } from '../contexts/AuthContext'

const SupabaseTest = () => {
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const runTests = async () => {
    setLoading(true)
    const results = {}

    try {
      // Test 1: Basic connection
      console.log('🔗 Testing Supabase connection...')
      results.connection = { status: 'success', message: 'Supabase client initialized' }

      // Test 2: Authentication status
      console.log('👤 Testing authentication...')
      const { data: { session } } = await supabase.auth.getSession()
      results.auth = {
        status: session ? 'success' : 'warning',
        message: session ? `Authenticated as ${session.user.email}` : 'Not authenticated',
        user: session?.user || null
      }

      // Test 3: Database connection
      console.log('💾 Testing database connection...')
      try {
        const { data, error } = await supabase
          .from('records')
          .select('count')
          .limit(1)
        
        results.database = {
          status: error ? 'error' : 'success',
          message: error ? `Database error: ${error.message}` : 'Database connection successful',
          error: error
        }
      } catch (dbError) {
        results.database = {
          status: 'error',
          message: `Database connection failed: ${dbError.message}`,
          error: dbError
        }
      }

      // Test 4: Table structure
      console.log('📋 Testing table structure...')
      try {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .limit(1)
        
        results.tableStructure = {
          status: error ? 'error' : 'success',
          message: error ? `Table access error: ${error.message}` : 'Table structure accessible',
          sampleData: data?.[0] || null,
          error: error
        }
      } catch (tableError) {
        results.tableStructure = {
          status: 'error',
          message: `Table access failed: ${tableError.message}`,
          error: tableError
        }
      }

      // Test 5: Storage bucket
      console.log('🗄️ Testing storage...')
      try {
        const { data, error } = await supabase.storage.listBuckets()
        const faceImagesBucket = data?.find(bucket => bucket.id === 'face-images')
        
        results.storage = {
          status: error ? 'error' : (faceImagesBucket ? 'success' : 'warning'),
          message: error ? `Storage error: ${error.message}` : 
                   faceImagesBucket ? 'face-images bucket exists' : 'face-images bucket not found',
          buckets: data,
          error: error
        }
      } catch (storageError) {
        results.storage = {
          status: 'error',
          message: `Storage test failed: ${storageError.message}`,
          error: storageError
        }
      }

      // Test 6: RLS Policies (if authenticated)
      if (session) {
        console.log('🔒 Testing RLS policies...')
        try {
          const testRecord = {
            patta_id: `TEST_${Date.now()}`,
            name: 'Test User',
            village: 'Test Village',
            district: 'Test District',
            state: 'Madhya Pradesh',
            verification_status: 'pending',
            created_by: session.user.id
          }

          // Try to insert and then delete
          const { data: insertData, error: insertError } = await supabase
            .from('records')
            .insert([testRecord])
            .select()
            .single()

          if (insertError) {
            results.rls = {
              status: 'error',
              message: `RLS Insert failed: ${insertError.message}`,
              error: insertError
            }
          } else {
            // Clean up test record
            await supabase
              .from('records')
              .delete()
              .eq('id', insertData.id)

            results.rls = {
              status: 'success',
              message: 'RLS policies working correctly',
              testRecord: insertData
            }
          }
        } catch (rlsError) {
          results.rls = {
            status: 'error',
            message: `RLS test failed: ${rlsError.message}`,
            error: rlsError
          }
        }
      } else {
        results.rls = {
          status: 'skipped',
          message: 'RLS test skipped - not authenticated'
        }
      }

      console.log('✅ All tests completed:', results)
      setTestResults(results)

    } catch (error) {
      console.error('💥 Test suite failed:', error)
      results.general = {
        status: 'error',
        message: `Test suite failed: ${error.message}`,
        error: error
      }
      setTestResults(results)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'skipped': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'skipped': return '⏭️'
      default: return '❓'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Supabase MCP Test Results</h1>
      
      <div className="mb-6 flex justify-center">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '🔄 Running Tests...' : '🧪 Run Tests Again'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg capitalize">
                {testName.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <span className="text-2xl">{getStatusIcon(result.status)}</span>
            </div>
            
            <div className={`px-3 py-2 rounded-lg text-sm ${getStatusColor(result.status)}`}>
              {result.message}
            </div>

            {result.error && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Error Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </details>
            )}

            {result.sampleData && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Sample Data
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.sampleData, null, 2)}
                </pre>
              </details>
            )}

            {result.buckets && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Storage Buckets
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.buckets, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Test Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl text-green-600">
              {Object.values(testResults).filter(r => r.status === 'success').length}
            </div>
            <div className="text-green-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-yellow-600">
              {Object.values(testResults).filter(r => r.status === 'warning').length}
            </div>
            <div className="text-yellow-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-red-600">
              {Object.values(testResults).filter(r => r.status === 'error').length}
            </div>
            <div className="text-red-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl text-gray-600">
              {Object.values(testResults).filter(r => r.status === 'skipped').length}
            </div>
            <div className="text-gray-600">Skipped</div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-600">
        <p>User: {user ? user.email : 'Not authenticated'}</p>
        <p>Project URL: {import.meta.env.VITE_SUPABASE_URL}</p>
        <p>Last tested: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}

export default SupabaseTest
