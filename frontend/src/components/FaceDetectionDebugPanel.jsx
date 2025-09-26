import React, { useState, useEffect, useRef } from 'react'
import faceDetectionDebugger from '../utils/faceDetectionDebugger'

const FaceDetectionDebugPanel = ({ isVisible, onClose }) => {
  const [debugData, setDebugData] = useState({
    logs: [],
    stats: {},
    report: {},
    diagnostics: {}
  })
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedLogLevel, setSelectedLogLevel] = useState('all')
  const logsEndRef = useRef(null)

  useEffect(() => {
    if (!isVisible) return

    // Enable debugging when panel opens
    faceDetectionDebugger.enable({
      logLevel: 'debug',
      showVisualDebug: true,
      logToConsole: true,
      logToUI: true,
      trackPerformance: true
    })

    // Set up log update callback
    faceDetectionDebugger.onLogUpdate = (logEntry) => {
      setDebugData(prev => ({
        ...prev,
        logs: [...prev.logs.slice(-199), logEntry] // Keep last 200 logs
      }))
    }

    // Update stats periodically
    const updateInterval = setInterval(() => {
      const report = faceDetectionDebugger.getDebugReport()
      setDebugData(prev => ({
        ...prev,
        report
      }))
    }, 1000)

    // Run initial diagnostics
    faceDetectionDebugger.runDiagnostics().then(diagnostics => {
      setDebugData(prev => ({
        ...prev,
        diagnostics
      }))
    })

    return () => {
      clearInterval(updateInterval)
      faceDetectionDebugger.onLogUpdate = null
      faceDetectionDebugger.disable()
    }
  }, [isVisible])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [debugData.logs, autoScroll])

  const filteredLogs = debugData.logs.filter(log => 
    selectedLogLevel === 'all' || log.level === selectedLogLevel
  )

  const exportDebugData = () => {
    const data = faceDetectionDebugger.exportDebugData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `face-detection-debug-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    faceDetectionDebugger.clearDebugData()
    setDebugData(prev => ({
      ...prev,
      logs: [],
      report: {}
    }))
  }

  const getLogLevelColor = (level) => {
    const colors = {
      debug: 'text-gray-600',
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    }
    return colors[level] || 'text-gray-600'
  }

  const getLogLevelBadge = (level) => {
    const badges = {
      debug: 'bg-gray-100 text-gray-800',
      info: 'bg-blue-100 text-blue-800',
      warn: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    return badges[level] || 'bg-gray-100 text-gray-800'
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Face Detection Debug Panel</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportDebugData}
              className="btn btn-sm btn-secondary"
            >
              Export Data
            </button>
            <button
              onClick={clearLogs}
              className="btn btn-sm btn-outline"
            >
              Clear Logs
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Stats and Diagnostics */}
          <div className="w-1/3 p-4 border-r overflow-y-auto">
            {/* System Diagnostics */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">System Diagnostics</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(debugData.diagnostics).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                    <span className={
                      typeof value === 'boolean' 
                        ? value ? 'text-green-600' : 'text-red-600'
                        : 'text-gray-600'
                    }>
                      {typeof value === 'boolean' ? (value ? '✅' : '❌') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Stats */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Performance Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Runtime:</span>
                  <span className="font-mono">{debugData.report.runtime || '0s'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Frames:</span>
                  <span className="font-mono">{debugData.report.totalFrames || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Detection Rate:</span>
                  <span className="font-mono">{debugData.report.detectionRate || '0%'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average FPS:</span>
                  <span className="font-mono">{debugData.report.averageFPS || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Process Time:</span>
                  <span className="font-mono">{debugData.report.averageProcessingTime || '0ms'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Quality:</span>
                  <span className="font-mono">{debugData.report.averageQuality || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className={`font-mono ${(debugData.report.errorCount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {debugData.report.errorCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Errors */}
            {debugData.report.errors && debugData.report.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-red-600">Recent Errors</h3>
                <div className="space-y-2 text-sm">
                  {debugData.report.errors.slice(-5).map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded border">
                      <div className="font-semibold text-red-800">{error.type}</div>
                      <div className="text-red-600 text-xs">{error.error}</div>
                      <div className="text-gray-500 text-xs">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Logs */}
          <div className="flex-1 flex flex-col">
            {/* Log Controls */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">Filter:</label>
                <select
                  value={selectedLogLevel}
                  onChange={(e) => setSelectedLogLevel(e.target.value)}
                  className="form-select text-sm"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warnings</option>
                  <option value="error">Errors</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="mr-2"
                  />
                  Auto-scroll
                </label>
                <span className="text-sm text-gray-500">
                  {filteredLogs.length} logs
                </span>
              </div>
            </div>

            {/* Log Display */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-sm">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No logs to display. Start face detection to see debug information.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2 py-1">
                      <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold w-16 text-center ${getLogLevelBadge(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        F{log.frameNumber || 0}
                      </span>
                      <div className="flex-1">
                        <div className={`${getLogLevelColor(log.level)} font-medium`}>
                          {log.message}
                        </div>
                        {log.data && (
                          <div className="text-xs text-gray-600 mt-1 pl-4 border-l-2 border-gray-200">
                            {typeof log.data === 'object' 
                              ? JSON.stringify(log.data, null, 2)
                              : String(log.data)
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <div>
              Debug panel active - monitoring face detection performance and errors
            </div>
            <div className="flex items-center space-x-4">
              <span>Visual Debug: {faceDetectionDebugger.config?.showVisualDebug ? '✅' : '❌'}</span>
              <span>Console Logs: {faceDetectionDebugger.config?.logToConsole ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FaceDetectionDebugPanel
