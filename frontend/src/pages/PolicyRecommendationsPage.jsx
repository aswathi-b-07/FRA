import React, { useState } from 'react'
import { apiService } from '../services/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

const PolicyRecommendationsPage = () => {
  const [formData, setFormData] = useState({
    targetDemographic: '',
    state: 'Madhya Pradesh',
    district: '',
    landData: {
      totalArea: '',
      forestCover: '',
      agriculturalLand: '',
      population: ''
    },
    guidelines: {
      focusArea: 'livelihood',
      priority: 'high'
    }
  })

  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const states = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana']
  const focusAreas = ['livelihood', 'education', 'healthcare', 'infrastructure', 'conservation']
  const priorities = ['high', 'medium', 'low']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name.startsWith('landData.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        landData: { ...prev.landData, [field]: value }
      }))
    } else if (name.startsWith('guidelines.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        guidelines: { ...prev.guidelines, [field]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.targetDemographic.trim()) {
      setError('Please enter target demographic')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await apiService.ai.generatePolicyRecommendations({
        targetDemographic: formData.targetDemographic,
        state: formData.state,
        district: formData.district,
        landData: formData.landData,
        guidelines: formData.guidelines
      })

      setRecommendations(result.recommendations)

    } catch (err) {
      console.error('Policy recommendations error:', err)
      setError('Failed to generate recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Policy Recommendations</h1>
        <p className="mt-2 text-gray-600">
          Generate tailored policy recommendations and funding schemes using AI analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Input Parameters</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Demographic */}
              <div>
                <label htmlFor="targetDemographic" className="form-label">
                  Target Demographic <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="targetDemographic"
                  name="targetDemographic"
                  value={formData.targetDemographic}
                  onChange={handleInputChange}
                  className="form-input"
                  rows={3}
                  placeholder="Describe the target demographic (e.g., Tribal communities in forest areas, Small farmers, etc.)"
                  required
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="form-label">State</label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="district" className="form-label">District</label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter district name"
                  />
                </div>
              </div>

              {/* Land Data */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Land Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="landData.totalArea" className="form-label">Total Area (hectares)</label>
                    <input
                      type="number"
                      name="landData.totalArea"
                      value={formData.landData.totalArea}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="landData.forestCover" className="form-label">Forest Cover (%)</label>
                    <input
                      type="number"
                      name="landData.forestCover"
                      value={formData.landData.forestCover}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="landData.agriculturalLand" className="form-label">Agricultural Land (%)</label>
                    <input
                      type="number"
                      name="landData.agriculturalLand"
                      value={formData.landData.agriculturalLand}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="landData.population" className="form-label">Population</label>
                    <input
                      type="number"
                      name="landData.population"
                      value={formData.landData.population}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Guidelines</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guidelines.focusArea" className="form-label">Focus Area</label>
                    <select
                      name="guidelines.focusArea"
                      value={formData.guidelines.focusArea}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      {focusAreas.map(area => (
                        <option key={area} value={area}>
                          {area.charAt(0).toUpperCase() + area.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="guidelines.priority" className="form-label">Priority</label>
                    <select
                      name="guidelines.priority"
                      value={formData.guidelines.priority}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      {priorities.map(priority => (
                        <option key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" text="Generating recommendations..." />
                ) : (
                  'Generate Recommendations'
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

        {/* Results */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">AI Recommendations</h3>
          </div>
          <div className="card-body">
            {!recommendations ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  Fill in the form and click "Generate Recommendations" to get AI-powered policy suggestions
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Recommendations */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Policy Recommendations</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: recommendations.recommendations?.replace(/\n/g, '<br/>') }} />
                    </div>
                  </div>
                </div>

                {/* Funding Schemes */}
                {recommendations.fundingSchemes && recommendations.fundingSchemes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Relevant Funding Schemes</h4>
                    <div className="space-y-2">
                      {recommendations.fundingSchemes.map((scheme, index) => (
                        <div key={index} className="flex items-center p-3 bg-primary-50 rounded-lg">
                          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="ml-3 text-sm font-medium text-primary-900">{scheme}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Implementation Score */}
                {recommendations.implementationScore && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Implementation Feasibility</h4>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${recommendations.implementationScore * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {Math.round(recommendations.implementationScore * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Based on available resources and policy alignment
                    </p>
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

export default PolicyRecommendationsPage
