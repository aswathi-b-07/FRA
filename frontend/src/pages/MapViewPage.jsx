import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet'
import { apiService } from '../services/apiService'
import { dbService } from '../services/supabaseService'
import LoadingSpinner from '../components/LoadingSpinner'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Create custom icons for different record types
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

const icons = {
  verified: createCustomIcon('#10B981'),
  pending: createCustomIcon('#F59E0B'),
  rejected: createCustomIcon('#EF4444')
}

const MapViewPage = () => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [mapLayers, setMapLayers] = useState([])
  const [center, setCenter] = useState([20.5937, 78.9629]) // Center of India
  const [zoom, setZoom] = useState(5)

  const states = [
    { name: 'Madhya Pradesh', center: [23.2599, 77.4126], zoom: 7 },
    { name: 'Tripura', center: [23.9408, 91.9882], zoom: 8 },
    { name: 'Odisha', center: [20.9517, 85.0985], zoom: 7 },
    { name: 'Telangana', center: [18.1124, 79.0193], zoom: 7 }
  ]

  useEffect(() => {
    loadMapData()
    loadMapLayers()
  }, [selectedState, selectedDistrict])

  const loadMapData = async () => {
    try {
      setLoading(true)
      // Load records directly from Supabase for reliability
      const filters = {}
      if (selectedState) filters.state = selectedState
      if (selectedDistrict) filters.district = selectedDistrict

      const { data, error } = await dbService.records.getAll(filters)
      if (error) throw error

      const recordsData = (data || [])
        .filter(r => r.coordinates && typeof r.coordinates.lat === 'number' && typeof r.coordinates.lng === 'number')
        .map(r => ({
          id: r.id,
          name: r.name,
          pattaId: r.patta_id,
          village: r.village,
          district: r.district,
          state: r.state,
          landArea: r.land_area,
          landType: r.land_type,
          coordinates: { lat: r.coordinates.lat, lng: r.coordinates.lng },
          verification_status: r.verification_status || 'pending'
        }))
      setRecords(recordsData)

      // Update map center if state is selected
      if (selectedState) {
        const stateInfo = states.find(s => s.name === selectedState)
        if (stateInfo) {
          setCenter(stateInfo.center)
          setZoom(stateInfo.zoom)
        }
      }

    } catch (err) {
      console.error('Map data loading error:', err)
      setError('Failed to load map data')
    } finally {
      setLoading(false)
    }
  }

  const loadMapLayers = async () => {
    try {
      const result = await apiService.map.getLayers()
      setMapLayers(result.layers || [])
    } catch (err) {
      console.error('Map layers loading error:', err)
    }
  }

  const handleStateChange = (state) => {
    setSelectedState(state)
    setSelectedDistrict('')
  }

  const getRecordIcon = (record) => {
    return icons[record.verification_status] || icons.pending
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'rejected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WebGIS Map View</h1>
        <p className="mt-2 text-gray-600">
          Interactive map showing FRA records and land areas across target states
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-48">
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="form-input"
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state.name} value={state.name}>{state.name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-48">
              <input
                type="text"
                placeholder="District (optional)"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Verified ({records.filter(r => r.verification_status === 'verified').length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Pending ({records.filter(r => r.verification_status === 'pending').length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Rejected ({records.filter(r => r.verification_status === 'rejected').length})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading map data..." />
            </div>
          ) : error ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={loadMapData} className="btn btn-secondary">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>
                  
                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                      attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.Overlay checked name="FRA Records">
                    <>
                      {records.map((record) => (
                        <Marker
                          key={record.id}
                          position={[record.coordinates.lat, record.coordinates.lng]}
                          icon={getRecordIcon(record)}
                        >
                          <Popup>
                            <div className="p-2 min-w-64">
                              <h4 className="font-semibold text-gray-900 mb-2">{record.name}</h4>
                              
                              <div className="space-y-1 text-sm">
                                <p><strong>Patta ID:</strong> {record.pattaId}</p>
                                <p><strong>Location:</strong> {record.village}, {record.district}</p>
                                <p><strong>State:</strong> {record.state}</p>
                                {record.landArea && (
                                  <p><strong>Land Area:</strong> {record.landArea} acres</p>
                                )}
                                {record.landType && (
                                  <p><strong>Land Type:</strong> {record.landType}</p>
                                )}
                                <p>
                                  <strong>Status:</strong>{' '}
                                  <span className={`font-medium ${getStatusColor(record.verification_status)}`}>
                                    {record.verification_status}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Coordinates: {record.coordinates.lat.toFixed(6)}, {record.coordinates.lng.toFixed(6)}
                                </p>
                              </div>
                              
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    const url = `https://www.google.com/maps/@${record.coordinates.lat},${record.coordinates.lng},15z`
                                    window.open(url, '_blank')
                                  }}
                                  className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                                >
                                  Open in Google Maps →
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </>
                  </LayersControl.Overlay>
                </LayersControl>
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-gray-900">{records.length}</div>
            <div className="text-sm text-gray-600">Total Records</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">
              {records.filter(r => r.verification_status === 'verified').length}
            </div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {records.filter(r => r.verification_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-primary-600">
              {selectedState || 'All States'}
            </div>
            <div className="text-sm text-gray-600">Current View</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapViewPage
