import React, { useState } from 'react'
import { apiService } from '../services/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

const GramSabhaPage = () => {
  const [query, setQuery] = useState('')
  const [context, setContext] = useState('')
  const [location, setLocation] = useState({
    village: '',
    district: '',
    state: 'Madhya Pradesh'
  })
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatHistory, setChatHistory] = useState([])

  const states = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana']

  const commonQueries = [
    'How to conduct FRA claim verification in Gram Sabha?',
    'What documents are required for individual forest rights?',
    'How to resolve conflicts between community and individual claims?',
    'What are the steps for community forest resource management?',
    'How to integrate PM-KISAN with FRA beneficiaries?'
  ]

  const handleLocationChange = (e) => {
    const { name, value } = e.target
    setLocation(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter your question')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await apiService.ai.gramSabhaAssistant({
        query: query,
        context: context || null,
        village: location.village || null,
        district: location.district || null,
        state: location.state
      })

      setResponse(result.response)
      
      // Add to chat history
      const newEntry = {
        id: Date.now(),
        query: query,
        response: result.response,
        suggestions: result.suggestions || [],
        relatedSchemes: result.relatedSchemes || [],
        timestamp: new Date()
      }
      
      setChatHistory(prev => [newEntry, ...prev])
      setQuery('')

    } catch (err) {
      console.error('Gram Sabha assistant error:', err)
      setError('Failed to get AI assistance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickQuery = (quickQuery) => {
    setQuery(quickQuery)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gram Sabha AI Assistant</h1>
        <p className="mt-2 text-gray-600">
          Get AI-powered assistance for Gram Sabha meetings and FRA implementation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Query Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Ask AI Assistant</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Context */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Location Context</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="village" className="form-label">Village</label>
                      <input
                        type="text"
                        id="village"
                        name="village"
                        value={location.village}
                        onChange={handleLocationChange}
                        className="form-input"
                        placeholder="Enter village name"
                      />
                    </div>
                    <div>
                      <label htmlFor="district" className="form-label">District</label>
                      <input
                        type="text"
                        id="district"
                        name="district"
                        value={location.district}
                        onChange={handleLocationChange}
                        className="form-input"
                        placeholder="Enter district name"
                      />
                    </div>
                    <div>
                      <label htmlFor="state" className="form-label">State</label>
                      <select
                        id="state"
                        name="state"
                        value={location.state}
                        onChange={handleLocationChange}
                        className="form-input"
                      >
                        {states.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Context */}
                <div>
                  <label htmlFor="context" className="form-label">
                    Additional Context (Optional)
                  </label>
                  <textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="form-input"
                    rows={2}
                    placeholder="Provide any additional context about your situation..."
                  />
                </div>

                {/* Query Input */}
                <div>
                  <label htmlFor="query" className="form-label">
                    Your Question <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="form-input"
                    rows={3}
                    placeholder="Ask your question about FRA implementation, Gram Sabha procedures, or related topics..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" text="Getting AI assistance..." />
                  ) : (
                    'Ask AI Assistant'
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

          {/* Current Response */}
          {response && (
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">AI Response</h3>
              </div>
              <div className="card-body">
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: response.answer?.replace(/\n/g, '<br/>') }} />
                </div>

                {response.suggestions && response.suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Actions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {response.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {response.relatedSchemes && response.relatedSchemes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Related Schemes</h4>
                    <div className="flex flex-wrap gap-2">
                      {response.relatedSchemes.map((scheme, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full"
                        >
                          {scheme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Queries */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Common Questions</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                {commonQueries.map((quickQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuery(quickQuery)}
                    className="w-full text-left p-3 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {quickQuery}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Recent Questions</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                  {chatHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {entry.query}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.timestamp.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Usage Guidelines</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Provide specific context about your village and situation</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Ask clear, specific questions about FRA procedures</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Use the AI recommendations as guidance, not legal advice</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Consult with local officials for final decisions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GramSabhaPage
