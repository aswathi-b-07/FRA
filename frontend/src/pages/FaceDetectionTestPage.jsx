import React, { useState, useEffect } from 'react'
import EnhancedFaceCapture from '../components/EnhancedFaceCapture'
import faceDetectionDebugger from '../utils/faceDetectionDebugger'

const FaceDetectionTestPage = () => {
  const [testResults, setTestResults] = useState(null)
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)
  const [capturedData, setCapturedData] = useState(null)
  const [debugEnabled, setDebugEnabled] = useState(true)

  useEffect(() => {
    // Run initial diagnostics
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true)
    try {
      const diagnostics = await faceDetectionDebugger.runDiagnostics()
      setTestResults(diagnostics)
    } catch (error) {
      console.error('Diagnostics failed:', error)
      setTestResults({ error: error.message })
    } finally {
      setIsRunningDiagnostics(false)
    }
  }

  const handleFaceCapture = (data) => {
    setCapturedData(data)
    console.log('Face captured in test page:', data)
  }

  const handleCaptureError = (error) => {
    console.error('Capture error in test page:', error)
  }

  const toggleDebugMode = () => {
    setDebugEnabled(!debugEnabled)
    if (!debugEnabled) {
      faceDetectionDebugger.enable({
        logLevel: 'debug',
        showVisualDebug: true,
        logToConsole: true,
        trackPerformance: true
      })
    } else {
      faceDetectionDebugger.disable()
    }
  }

  const getDiagnosticStatus = (value) => {
    if (typeof value === 'boolean') {
      return value ? '✅ Working' : '❌ Not Working'
    }
    return value ? '✅ Available' : '❌ Unavailable'
  }

  const getDiagnosticColor = (value) => {
    if (typeof value === 'boolean') {
      return value ? 'text-green-600' : 'text-red-600'
    }
    return value ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Face Detection Test & Debug</h1>
        <p className="mt-2 text-gray-600">
          Test face detection functionality with comprehensive debugging tools
        </p>
      </div>

      {/* Debug Controls */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Controls</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDebugMode}
            className={`btn ${debugEnabled ? 'btn-primary' : 'btn-outline'}`}
          >
            {debugEnabled ? '🐛 Debug Enabled' : '🐛 Enable Debug'}
          </button>
          <button
            onClick={runDiagnostics}
            disabled={isRunningDiagnostics}
            className="btn btn-secondary"
          >
            {isRunningDiagnostics ? 'Running...' : '🔍 Run Diagnostics'}
          </button>
          <div className="text-sm text-gray-600">
            Debug mode: {debugEnabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      {/* System Diagnostics */}
      {testResults && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">System Diagnostics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(testResults).map(([key, value]) => (
              <div key={key} className="p-4 border rounded-lg">
                <h3 className="font-medium text-gray-900 capitalize mb-2">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </h3>
                <div className={`text-sm ${getDiagnosticColor(value)}`}>
                  {getDiagnosticStatus(value)}
                </div>
                {key === 'cameraError' && value && (
                  <div className="text-xs text-red-600 mt-1">{value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Face Capture Test */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Face Capture Test</h2>
        <div className="max-w-2xl">
          <EnhancedFaceCapture
            onCapture={handleFaceCapture}
            onError={handleCaptureError}
            autoCapture={true}
            captureDelay={3000} // Shorter delay for testing
            qualityThreshold={0.6} // Lower threshold for testing
            enableDebug={debugEnabled}
            className="border rounded-lg p-4"
          />
        </div>
      </div>

      {/* Capture Results */}
      {capturedData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Capture Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Face Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Quality Score:</span>
                  <span className="font-mono">{(capturedData.quality * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Embedding Dimensions:</span>
                  <span className="font-mono">{capturedData.faceEmbedding?.length || 0}D</span>
                </div>
                <div className="flex justify-between">
                  <span>Face Size:</span>
                  <span className="font-mono">
                    {capturedData.faceRect?.width}x{capturedData.faceRect?.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Detection Count:</span>
                  <span className="font-mono">{capturedData.detectionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-mono text-xs">{capturedData.metadata?.extractionMethod}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Detection History</h3>
              {capturedData.detectionHistory && capturedData.detectionHistory.length > 0 ? (
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                  {capturedData.detectionHistory.slice(-10).map((detection, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span>Frame {detection.timestamp}</span>
                      <span>{detection.faceCount} faces</span>
                      <span>{(detection.averageQuality * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No detection history available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debugging Tips */}
      <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Debugging Tips</h2>
        <ul className="text-sm space-y-2">
          <li>• <strong>Enable Debug Mode:</strong> Click "Enable Debug" to see detailed logs and visual debugging</li>
          <li>• <strong>Check Diagnostics:</strong> Red items in diagnostics indicate potential issues</li>
          <li>• <strong>Camera Issues:</strong> If camera access fails, check browser permissions</li>
          <li>• <strong>OpenCV Issues:</strong> If OpenCV fails to load, check network connectivity</li>
          <li>• <strong>Performance Issues:</strong> Watch for high processing times in debug panel</li>
          <li>• <strong>Quality Issues:</strong> Ensure good lighting and clear face visibility</li>
        </ul>
      </div>

      {/* Debug Information */}
      {debugEnabled && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Debug Information</h2>
          <div className="text-sm space-y-2">
            <p><strong>Debug Mode:</strong> Active</p>
            <p><strong>Visual Debug:</strong> Check top-right corner for debug overlay when capturing</p>
            <p><strong>Console Logs:</strong> Check browser console for detailed logs</p>
            <p><strong>Debug Panel:</strong> Click "Debug" button during capture to open detailed panel</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FaceDetectionTestPage
