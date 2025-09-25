import React, { useEffect, useRef } from 'react'

const RecordDetailsModal = ({ record, onClose }) => {
  const modalRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Record Details - {record.name}
            </h3>
            <p className="text-sm text-gray-600">
              Patta ID: {record.patta_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] scrollbar-thin">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo Section */}
              <div className="lg:col-span-1">
                <div className="card">
                  <div className="card-header">
                    <h4 className="text-sm font-medium text-gray-900">Photo</h4>
                  </div>
                  <div className="card-body">
                    {record.photo_url ? (
                      <img
                        src={record.photo_url}
                        alt={record.name}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
                      style={{ display: record.photo_url ? 'none' : 'flex' }}
                    >
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="mt-2 text-sm">No photo available</p>
                      </div>
                    </div>
                    
                    {/* Status and Blockchain Info */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.verification_status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : record.verification_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.verification_status}
                        </span>
                      </div>
                      
                      {record.blockchain_token_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">NFT Token:</span>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {record.blockchain_token_id}
                          </span>
                        </div>
                      )}
                      
                      {record.face_embedding && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Face Data:</span>
                          <span className="text-xs text-green-600">✓ Available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-medium text-gray-900">Personal Information</h4>
                    </div>
                    <div className="card-body">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.name)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Father's Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.father_name)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Patta ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{formatValue(record.patta_id)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Survey Number</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.survey_number)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-medium text-gray-900">Location Information</h4>
                    </div>
                    <div className="card-body">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Village</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.village)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">District</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.district)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">State</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.state)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Coordinates</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {record.coordinates && record.coordinates.lat && record.coordinates.lng
                              ? `${record.coordinates.lat.toFixed(6)}, ${record.coordinates.lng.toFixed(6)}`
                              : 'N/A'
                            }
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Land Information */}
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-medium text-gray-900">Land Information</h4>
                    </div>
                    <div className="card-body">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Land Area</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.land_area)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Land Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.land_type)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {record.details_json && Object.keys(record.details_json).length > 0 && (
                    <div className="card">
                      <div className="card-header">
                        <h4 className="text-sm font-medium text-gray-900">Additional Details</h4>
                      </div>
                      <div className="card-body">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(record.details_json).map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-sm font-medium text-gray-500 capitalize">
                                {key.replace(/_/g, ' ')}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">{formatValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  )}

                  {/* System Information */}
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-medium text-gray-900">System Information</h4>
                    </div>
                    <div className="card-body">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Created At</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(record.created_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(record.updated_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Record ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{record.id}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Verification Status</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatValue(record.verification_status)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button 
            onClick={() => {
              // Print functionality
              window.print()
            }}
            className="btn btn-primary"
          >
            Print Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecordDetailsModal
