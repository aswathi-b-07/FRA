import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dbService } from '../services/supabaseService'
import LoadingSpinner from '../components/LoadingSpinner'
import RecordMapModal from '../components/RecordMapModal'
import RecordDetailsModal from '../components/RecordDetailsModal'

const SavedRecordsPage = () => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const states = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana']

  useEffect(() => {
    loadRecords()
  }, [selectedState])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const filters = selectedState ? { state: selectedState } : {}
      const { data, error: dbError } = await dbService.records.getAll(filters)
      
      if (dbError) throw dbError
      setRecords(data || [])
    } catch (err) {
      console.error('Load records error:', err)
      setError('Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadRecords()
      return
    }

    try {
      setLoading(true)
      const { data, error: searchError } = await dbService.records.search(
        searchQuery, 
        selectedState || null
      )
      
      if (searchError) throw searchError
      setRecords(data || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search records')
    } finally {
      setLoading(false)
    }
  }

  const handleViewMap = (record) => {
    setSelectedRecord(record)
    setShowMapModal(true)
  }

  const handleViewDetails = (record) => {
    setSelectedRecord(record)
    setShowDetailsModal(true)
  }

  const filteredRecords = records.filter(record =>
    !searchQuery || 
    record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.patta_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.village.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Records</h1>
            <p className="mt-2 text-gray-600">
              Browse and manage FRA records ({records.length} total)
            </p>
          </div>
          <Link to="/add-record" className="btn btn-primary">
            Add New Record
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, Patta ID, or village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="form-input"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="form-input"
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="btn btn-secondary whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading records..." />
      ) : error ? (
        <div className="alert alert-danger">
          <p>{error}</p>
          <button onClick={loadRecords} className="btn btn-secondary mt-2">
            Retry
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patta ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'No records found matching your search' : 'No records found'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.patta_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.name}</div>
                        {record.father_name && (
                          <div className="text-sm text-gray-500">S/o {record.father_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.photo_url ? (
                          <img
                            src={record.photo_url}
                            alt={record.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs"
                          style={{ display: record.photo_url ? 'none' : 'flex' }}
                        >
                          {record.name.charAt(0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.village}</div>
                        <div className="text-sm text-gray-500">{record.district}, {record.state}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.verification_status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : record.verification_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.verification_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewMap(record)}
                          className="text-primary-600 hover:text-primary-900"
                          disabled={!record.coordinates}
                        >
                          View Map
                        </button>
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showMapModal && selectedRecord && (
        <RecordMapModal
          record={selectedRecord}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {showDetailsModal && selectedRecord && (
        <RecordDetailsModal
          record={selectedRecord}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  )
}

export default SavedRecordsPage
