import React, { useState } from 'react'
import { apiService } from '../services/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

const ConflictResolutionPage = () => {
  const [formData, setFormData] = useState({
    conflictType: 'land_boundary',
    description: '',
    partiesInvolved: '',
    recordId: '',
    documents: ''
  })

  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const conflictTypes = [
    { value: 'land_boundary', label: 'Land Boundary Disputes' },
    { value: 'ownership_claim', label: 'Ownership Claims' },
    { value: 'forest_rights', label: 'Forest Rights Conflicts' },
    { value: 'community_individual', label: 'Community vs Individual Rights' },
    { value: 'government_dispute', label: 'Government Land Disputes' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      setError('Please provide a conflict description')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await apiService.ai.analyzeConflict({
        conflictType: formData.conflictType,
        description: formData.description,
        partiesInvolved: formData.partiesInvolved.split(',').map(p => p.trim()).filter(p => p),
        recordId: formData.recordId || null,
        documents: formData.documents || null
      })

      setAnalysis(result.analysis)

    } catch (err) {
      console.error('Conflict analysis error:', err)
      setError('Failed to analyze conflict. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI-Powered Conflict Resolution</h1>
        <p className="mt-2 text-gray-600">
          Analyze land disputes and get AI-powered resolution recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Conflict Details</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="conflictType" className="form-label">
                  Conflict Type
                </label>
                <select
                  id="conflictType"
                  name="conflictType"
                  value={formData.conflictType}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  {conflictTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="form-label">
                  Conflict Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-input"
                  rows={4}
                  placeholder="Describe the conflict in detail..."
                  required
                />
              </div>

              <div>
                <label htmlFor="partiesInvolved" className="form-label">
                  Parties Involved
                </label>
                <input
                  type="text"
                  id="partiesInvolved"
                  name="partiesInvolved"
                  value={formData.partiesInvolved}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter parties separated by commas"
                />
              </div>

              <div>
                <label htmlFor="recordId" className="form-label">
                  Related Record ID (Optional)
                </label>
                <input
                  type="text"
                  id="recordId"
                  name="recordId"
                  value={formData.recordId}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter FRA record ID if applicable"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" text="Analyzing conflict..." />
                ) : (
                  'Analyze Conflict'
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

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">AI Analysis & Recommendations</h3>
          </div>
          <div className="card-body">
            {!analysis ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  Submit conflict details to get AI-powered analysis and resolution recommendations
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis</h4>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: analysis.analysis?.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>

                {analysis.recommendedApproach && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Approach</h4>
                    <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {analysis.recommendedApproach}
                    </div>
                  </div>
                )}

                {analysis.fairnessScore && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Fairness Score</h4>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${analysis.fairnessScore * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {Math.round(analysis.fairnessScore * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {analysis.timeline && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Expected Timeline</h4>
                    <p className="text-sm text-gray-700">{analysis.timeline}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionPage
