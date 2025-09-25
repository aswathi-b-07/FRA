import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const RecordMapModal = ({ record, onClose }) => {
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

  if (!record.coordinates || !record.coordinates.lat || !record.coordinates.lng) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">No Location Data</h3>
            <p className="text-gray-600 mb-6">
              This record doesn't have coordinate information available.
            </p>
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const position = [record.coordinates.lat, record.coordinates.lng]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Map Location - {record.name}
            </h3>
            <p className="text-sm text-gray-600">
              {record.village}, {record.district}, {record.state}
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

        {/* Map */}
        <div className="h-96">
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                <div className="p-2">
                  <h4 className="font-medium text-gray-900">{record.name}</h4>
                  <p className="text-sm text-gray-600">Patta ID: {record.patta_id}</p>
                  <p className="text-sm text-gray-600">
                    {record.village}, {record.district}
                  </p>
                  {record.land_area && (
                    <p className="text-sm text-gray-600">
                      Land Area: {record.land_area} {record.land_type || 'acres'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {record.coordinates.lat.toFixed(6)}, {record.coordinates.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <p><strong>Coordinates:</strong> {record.coordinates.lat.toFixed(6)}, {record.coordinates.lng.toFixed(6)}</p>
            {record.land_area && (
              <p><strong>Land Area:</strong> {record.land_area} {record.land_type || 'acres'}</p>
            )}
          </div>
          <div className="space-x-3">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/@${record.coordinates.lat},${record.coordinates.lng},15z`
                window.open(url, '_blank')
              }}
              className="btn btn-secondary"
            >
              Open in Google Maps
            </button>
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordMapModal
