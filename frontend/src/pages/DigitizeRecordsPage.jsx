import React, { useState, useRef } from 'react'
import { apiService } from '../services/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

const DigitizeRecordsPage = () => {
  const [file, setFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [useGoogleVision, setUseGoogleVision] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid image file (JPEG, PNG) or PDF')
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      setFile(selectedFile)
      setError('')
      setResults(null)
    }
  }

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('document', file)
      formData.append('useGoogleVision', useGoogleVision.toString())

      const result = await apiService.ocr.processDocument(formData)
      setResults(result)
    } catch (err) {
      console.error('OCR processing error:', err)
      setError('Failed to process document. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateRecord = () => {
    if (results && results.structuredData) {
      // Navigate to add record page with pre-filled data
      const recordData = results.structuredData
      const queryParams = new URLSearchParams()
      
      Object.keys(recordData).forEach(key => {
        if (recordData[key] && recordData[key] !== '') {
          if (typeof recordData[key] === 'object') {
            queryParams.append(key, JSON.stringify(recordData[key]))
          } else {
            queryParams.append(key, recordData[key])
          }
        }
      })
      
      window.location.href = `/add-record?${queryParams.toString()}`
    }
  }

  const clearResults = () => {
    setFile(null)
    setResults(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Digitize Legacy Records</h1>
        <p className="mt-2 text-gray-600">
          Upload scanned FRA documents to extract information using AI-powered OCR and NER
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="form-label">Select Document</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          disabled={processing}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF up to 10MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Info */}
              {file && (
                <div className="flex items-center p-3 bg-primary-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-primary-900">{file.name}</p>
                    <p className="text-xs text-primary-700">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={clearResults}
                    className="ml-3 text-primary-600 hover:text-primary-500"
                    disabled={processing}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {/* OCR Options */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useGoogleVision}
                    onChange={(e) => setUseGoogleVision(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    disabled={processing}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Use Google Vision API (higher accuracy)
                  </span>
                </label>
              </div>

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={!file || processing}
                className="btn btn-primary w-full"
              >
                {processing ? (
                  <LoadingSpinner size="sm" text="Processing document..." />
                ) : (
                  'Process Document'
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="alert alert-danger">
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Extraction Results</h3>
          </div>
          <div className="card-body">
            {!results ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  Upload and process a document to see extracted information
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Structured Data */}
                {results.structuredData && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Extracted Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {Object.entries(results.structuredData).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-sm text-gray-900">
                              {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Named Entities */}
                {results.entities && results.entities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Named Entities</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.entities.map((entity, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entity.entity_group === 'PER' ? 'bg-blue-100 text-blue-800' :
                            entity.entity_group === 'LOC' ? 'bg-green-100 text-green-800' :
                            entity.entity_group === 'ORG' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entity.word} ({entity.entity_group})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Text */}
                {results.extractedText && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Extracted Text</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto scrollbar-thin">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {results.extractedText}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Create Record Button */}
                {results.structuredData && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCreateRecord}
                      className="btn btn-success w-full"
                    >
                      Create FRA Record from Extracted Data
                    </button>
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

export default DigitizeRecordsPage
