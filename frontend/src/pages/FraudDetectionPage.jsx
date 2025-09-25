import React, { useState, useEffect } from 'react'
import { apiService } from '../services/apiService'
import { dbService } from '../services/supabaseService'
import LoadingSpinner from '../components/LoadingSpinner'

const FraudDetectionPage = () => {
  const [recordData, setRecordData] = useState({
    pattaId: '',
    name: '',
    village: '',
    district: '',
    state: 'Madhya Pradesh',
    landArea: '',
    coordinates: { lat: '', lng: '' }
  })

  const [analysisResult, setAnalysisResult] = useState(null)
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [error, setError] = useState('')

  const states = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana']
  const checkTypes = [
    { value: 'comprehensive', label: 'Comprehensive Analysis' },
    { value: 'duplicate', label: 'Duplicate Check Only' },
    { value: 'data_consistency', label: 'Data Consistency Check' },
    { value: 'geographic', label: 'Geographic Anomalies' }
  ]

  const [selectedCheckType, setSelectedCheckType] = useState('comprehensive')

  useEffect(() => {
    loadFraudAlerts()
  }, [])

  const loadFraudAlerts = async () => {
    try {
      const { data, error: alertsError } = await dbService.fraudAlerts.getAll()
      if (alertsError) throw alertsError
      setFraudAlerts(data || [])
    } catch (err) {
      console.error('Load fraud alerts error:', err)
    } finally {
      setAlertsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'lat' || name === 'lng') {
      setRecordData(prev => ({
        ...prev,
        coordinates: { ...prev.coordinates, [name]: value }
      }))
    } else {
      setRecordData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    
    if (!recordData.pattaId.trim() || !recordData.name.trim()) {
      setError('Please provide at least Patta ID and name')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await apiService.ai.detectFraud(recordData, selectedCheckType)
      setAnalysisResult(result.fraudAnalysis)

      // Reload alerts if new alert was created
      if (result.alertCreated) {
        await loadFraudAlerts()
      }

    } catch (err) {
      console.error('Fraud detection error:', err)
      setError('Failed to analyze for fraud. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskScore) => {
    if (riskScore >= 0.7) return 'text-red-600'
    if (riskScore >= 0.4) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskLabel = (riskScore) => {
    if (riskScore >= 0.7) return 'High Risk'
    if (riskScore >= 0.4) return 'Medium Risk'
    return 'Low Risk'
  }

  const getAlertColor = (score) => {
    if (score >= 0.7) return 'bg-red-100 text-red-800 border-red-200'
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Fraud & Anomaly Detection</h1>
        <p className="mt-2 text-gray-600">
          Detect fraudulent claims and data anomalies using AI-powered analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analysis Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Record Analysis</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleAnalyze} className="space-y-6">
                <div>
                  <label htmlFor="checkType" className="form-label">Analysis Type</label>
                  <select
                    id="checkType"
                    value={selectedCheckType}
                    onChange={(e) => setSelectedCheckType(e.target.value)}
                    className="form-input"
                  >
                    {checkTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pattaId" className="form-label">
                      Patta ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="pattaId"
                      name="pattaId"
                      value={recordData.pattaId}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter Patta ID"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="form-label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={recordData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="village" className="form-label">Village</label>
                    <input
                      type="text"
                      id="village"
                      name="village"
                      value={recordData.village}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter village"
                    />
                  </div>
                  <div>
                    <label htmlFor="district" className="form-label">District</label>
                    <input
                      type="text"
                      id="district"
                      name="district"
                      value={recordData.district}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter district"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="form-label">State</label>
                    <select
                      id="state"
                      name="state"
                      value={recordData.state}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="landArea" className="form-label">Land Area</label>
                    <input
                      type="number"
                      id="landArea"
                      name="landArea"
                      value={recordData.landArea}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter land area"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label htmlFor="lat" className="form-label">Latitude</label>
                    <input
                      type="number"
                      id="lat"
                      name="lat"
                      value={recordData.coordinates.lat}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter latitude"
                      step="any"
                    />
                  </div>
                  <div>
                    <label htmlFor="lng" className="form-label">Longitude</label>
                    <input
                      type="number"
                      id="lng"
                      name="lng"
                      value={recordData.coordinates.lng}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter longitude"
                      step="any"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" text="Analyzing..." />
                  ) : (
                    'Analyze for Fraud'
                  )}
                </button>
              </form>

              {error && (
                <div className="mt-4 alert alert-danger">
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="card mt-6">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysisResult.riskScore >= 0.7 ? 'bg-red-100 text-red-800' :
                    analysisResult.riskScore >= 0.4 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {getRiskLabel(analysisResult.riskScore)}
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="space-y-6">
                  {/* Risk Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Risk Score</span>
                      <span className={`text-lg font-bold ${getRiskColor(analysisResult.riskScore)}`}>
                        {Math.round(analysisResult.riskScore * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          analysisResult.riskScore >= 0.7 ? 'bg-red-500' :
                          analysisResult.riskScore >= 0.4 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${analysisResult.riskScore * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Primary Concern */}
                  {analysisResult.primaryConcern && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Primary Concern</h4>
                      <p className="text-sm text-gray-700">{analysisResult.primaryConcern}</p>
                    </div>
                  )}

                  {/* Anomalies */}
                  {analysisResult.anomalies && analysisResult.anomalies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Detected Anomalies</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {analysisResult.anomalies.map((anomaly, index) => (
                          <li key={index}>{anomaly}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Analysis Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Analysis</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <div dangerouslySetInnerHTML={{ __html: analysisResult.analysis?.replace(/\n/g, '<br/>') }} />
                      </div>
                    </div>
                  </div>

                  {/* Verification Steps */}
                  {analysisResult.verificationSteps && analysisResult.verificationSteps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Verification Steps</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        {analysisResult.verificationSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Fraud Alerts */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Fraud Alerts</h3>
            </div>
            <div className="card-body">
              {alertsLoading ? (
                <LoadingSpinner size="sm" text="Loading alerts..." />
              ) : fraudAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No fraud alerts found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                  {fraudAlerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${getAlertColor(alert.confidence_score)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{alert.alert_type}</span>
                        <span className="text-xs">
                          {Math.round(alert.confidence_score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs opacity-75">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detection Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Detection Statistics</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{fraudAlerts.length}</div>
                  <div className="text-sm text-gray-600">Total Alerts</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    {fraudAlerts.filter(a => a.investigation_status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending Investigation</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {fraudAlerts.filter(a => a.investigation_status === 'resolved').length}
                  </div>
                  <div className="text-sm text-gray-600">Resolved</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detection Tips */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Detection Tips</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Check for duplicate Patta IDs across different locations</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Verify geographic coordinates match the claimed location</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Look for inconsistent land area claims</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Cross-reference with existing records for anomalies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FraudDetectionPage
