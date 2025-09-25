import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dbService, supabase } from '../services/supabaseService'
import { apiService } from '../services/apiService'
import { useAuth } from '../contexts/AuthContext'
import FaceCapture from '../components/FaceCapture'
import LoadingSpinner from '../components/LoadingSpinner'

const AddNewRecordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    pattaId: '',
    name: '',
    fatherName: '',
    village: '',
    district: '',
    state: 'Madhya Pradesh',
    landArea: '',
    landType: 'Agricultural',
    surveyNumber: '',
    coordinates: { lat: '', lng: '' },
    detailsJson: {}
  })

  const [faceData, setFaceData] = useState(null)
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const states = ['Madhya Pradesh', 'Tripura', 'Odisha', 'Telangana']
  const landTypes = ['Agricultural', 'Residential', 'Forest Land', 'Barren Land', 'Water Body']

  useEffect(() => {
    // Pre-fill form with data from URL params (from OCR results)
    const prefilledData = {}
    
    searchParams.forEach((value, key) => {
      if (key === 'coordinates') {
        try {
          prefilledData[key] = JSON.parse(value)
        } catch {
          prefilledData[key] = { lat: '', lng: '' }
        }
      } else {
        prefilledData[key] = value
      }
    })

    if (Object.keys(prefilledData).length > 0) {
      setFormData(prev => ({ ...prev, ...prefilledData }))
    }
  }, [searchParams])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'lat' || name === 'lng') {
      setFormData(prev => ({
        ...prev,
        coordinates: { ...prev.coordinates, [name]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleFaceCapture = (data) => {
    setFaceData(data)
    setShowFaceCapture(false)
    setSuccess('Face captured successfully!')
  }

  const handleFaceCaptureError = (error) => {
    setError('Face capture failed: ' + error.message)
  }

  const validateForm = () => {
    const required = ['pattaId', 'name', 'village', 'district', 'state']
    const missing = required.filter(field => !formData[field]?.trim())
    
    if (missing.length > 0) {
      setError(`Please fill in required fields: ${missing.join(', ')}`)
      return false
    }

    // Validate coordinates if provided
    if (formData.coordinates.lat && formData.coordinates.lng) {
      const lat = parseFloat(formData.coordinates.lat)
      const lng = parseFloat(formData.coordinates.lng)
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError('Please enter valid coordinates')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      console.log('🚀 Starting record creation...')
      console.log('Form data:', formData)
      console.log('Face data:', faceData)

      // Upload face image to Supabase storage
      let photoUrl = null
      if (faceData?.imageBlob) {
        try {
          console.log('📷 Uploading face image to Supabase storage...')
          const fileName = `face_${formData.pattaId}_${Date.now()}.jpg`
          
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('face-images')
            .upload(fileName, faceData.imageBlob, {
              contentType: 'image/jpeg',
              upsert: false
            })

          if (uploadError) {
            console.warn('❌ Image upload failed:', uploadError)
            // Fallback to base64
            photoUrl = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.readAsDataURL(faceData.imageBlob)
            })
            console.log('📷 Using base64 fallback for image')
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('face-images')
              .getPublicUrl(fileName)
            photoUrl = publicUrl
            console.log('✅ Image uploaded to Supabase:', photoUrl)
          }
        } catch (imageError) {
          console.warn('Image upload error:', imageError)
          // Fallback to base64
          try {
            photoUrl = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.readAsDataURL(faceData.imageBlob)
            })
            console.log('📷 Using base64 fallback after error')
          } catch (base64Error) {
            console.error('Both upload and base64 failed:', base64Error)
          }
        }
      }

      // Check authentication
      if (!user) {
        throw new Error('You must be logged in to create records')
      }

      console.log('👤 Creating record as user:', user.email)

      // Prepare record data
      const recordData = {
        patta_id: formData.pattaId,
        name: formData.name,
        father_name: formData.fatherName || null,
        village: formData.village,
        district: formData.district,
        state: formData.state,
        land_area: formData.landArea ? parseFloat(formData.landArea) : null,
        land_type: formData.landType,
        survey_number: formData.surveyNumber || null,
        coordinates: (formData.coordinates.lat && formData.coordinates.lng) ? {
          lat: parseFloat(formData.coordinates.lat),
          lng: parseFloat(formData.coordinates.lng)
        } : null,
        details_json: formData.detailsJson,
        photo_url: photoUrl,
        created_by: user.id,
        verification_status: 'pending'
      }

      console.log('💾 Creating record with data:', recordData)

      // Create record in database
      const { data: record, error: dbError } = await dbService.records.create(recordData)
      
      if (dbError) {
        console.error('❌ Database error:', dbError)
        
        // Handle specific RLS error
        if (dbError.message?.includes('row-level security')) {
          throw new Error('Database access denied. Please contact administrator to set up proper permissions.')
        }
        
        throw new Error(`Database error: ${dbError.message || dbError.details || JSON.stringify(dbError)}`)
      }

      if (!record) {
        throw new Error('No record returned from database')
      }

      console.log('✅ Record created:', record)

      // Store face embedding if captured
      if (faceData?.descriptor && record.id) {
        try {
          console.log('🧠 Storing face embedding...')
          
          // Convert Float32Array to regular array if needed
          const faceEmbedding = Array.isArray(faceData.descriptor) 
            ? faceData.descriptor 
            : Array.from(faceData.descriptor);
            
          console.log('📊 Face embedding details:', {
            type: typeof faceEmbedding,
            isArray: Array.isArray(faceEmbedding),
            length: faceEmbedding.length,
            sample: faceEmbedding.slice(0, 3)
          })
          
          await apiService.face.store(record.id, faceEmbedding)
          console.log('✅ Face embedding stored successfully')
        } catch (faceError) {
          console.error('⚠️ Face storage error:', faceError)
          // Try direct database update as fallback
          try {
            const faceEmbedding = Array.isArray(faceData.descriptor) 
              ? faceData.descriptor 
              : Array.from(faceData.descriptor);
              
            const { error: updateError } = await supabase
              .from('records')
              .update({ face_embedding: faceEmbedding })
              .eq('id', record.id)
              
            if (updateError) {
              console.error('❌ Direct face update failed:', updateError)
            } else {
              console.log('✅ Face embedding stored via direct update')
            }
          } catch (directError) {
            console.error('❌ Direct face storage also failed:', directError)
          }
        }
      }

      // Mint NFT on blockchain (async, don't wait)
      if (record.id) {
        setTimeout(async () => {
          try {
            console.log('🔗 Minting NFT...')
            await apiService.blockchain.mint(record.id, {
              name: `FRA Land Title - ${record.patta_id}`,
              description: `Forest Rights Act land title for ${record.name}`,
              attributes: [
                { trait_type: 'Patta ID', value: record.patta_id },
                { trait_type: 'Owner', value: record.name },
                { trait_type: 'Village', value: record.village },
                { trait_type: 'District', value: record.district },
                { trait_type: 'State', value: record.state }
              ]
            })
            console.log('✅ NFT minted')
          } catch (blockchainError) {
            console.error('⚠️ Blockchain error:', blockchainError)
            // Continue without blockchain
          }
        }, 1000)
      }

      setSuccess('Record created successfully!')
      
      // Redirect to records page after 2 seconds
      setTimeout(() => {
        navigate('/records')
      }, 2000)

    } catch (err) {
      console.error('💥 Create record error:', err)
      setError(`Failed to create record: ${err.message || 'Please check the console for details.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New FRA Record</h1>
        <p className="mt-2 text-gray-600">
          Create a new Forest Rights Act record with all required information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label htmlFor="pattaId" className="form-label">
                  Patta ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="pattaId"
                  name="pattaId"
                  value={formData.pattaId}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter Patta ID"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="form-label">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="fatherName" className="form-label">
                  Father's Name
                </label>
                <input
                  type="text"
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter father's name"
                />
              </div>

              <div>
                <label htmlFor="surveyNumber" className="form-label">
                  Survey Number
                </label>
                <input
                  type="text"
                  id="surveyNumber"
                  name="surveyNumber"
                  value={formData.surveyNumber}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter survey number"
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label htmlFor="village" className="form-label">
                  Village <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="village"
                  name="village"
                  value={formData.village}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter village name"
                  required
                />
              </div>

              <div>
                <label htmlFor="district" className="form-label">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="district"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter district name"
                  required
                />
              </div>

              <div>
                <label htmlFor="state" className="form-label">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lat" className="form-label">Latitude</label>
                  <input
                    type="number"
                    id="lat"
                    name="lat"
                    value={formData.coordinates.lat}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., 23.2599"
                    step="any"
                  />
                </div>
                <div>
                  <label htmlFor="lng" className="form-label">Longitude</label>
                  <input
                    type="number"
                    id="lng"
                    name="lng"
                    value={formData.coordinates.lng}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., 77.4126"
                    step="any"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Land Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Land Information</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label htmlFor="landArea" className="form-label">
                  Land Area (in acres)
                </label>
                <input
                  type="number"
                  id="landArea"
                  name="landArea"
                  value={formData.landArea}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter land area"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="landType" className="form-label">
                  Land Type
                </label>
                <select
                  id="landType"
                  name="landType"
                  value={formData.landType}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  {landTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Face Biometrics */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Face Biometrics</h3>
            </div>
            <div className="card-body">
              {!faceData ? (
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    Capture face biometrics for verification
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFaceCapture(true)}
                    className="btn btn-secondary mt-3"
                  >
                    Capture Face
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    Face captured successfully
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFaceData(null)
                      setShowFaceCapture(true)
                    }}
                    className="btn btn-secondary mt-3"
                  >
                    Recapture
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Face Capture Modal */}
        {showFaceCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Capture Face Biometrics</h3>
                  <button
                    onClick={() => setShowFaceCapture(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <FaceCapture
                  onCapture={handleFaceCapture}
                  onError={handleFaceCaptureError}
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          
          {/* Test Button for Debugging */}
          <button
            type="button"
            onClick={async () => {
              console.log('🧪 Test Data:')
              console.log('User:', user)
              console.log('Form data:', formData)
              console.log('Face data:', faceData)
              console.log('Supabase client:', supabase)
              
              // Test authentication
              const { data: { session } } = await supabase.auth.getSession()
              console.log('Current session:', session)
              
              // Test database connection
              try {
                const { data, error } = await supabase.from('records').select('count').limit(1)
                console.log('Database test result:', { data, error })
              } catch (dbTest) {
                console.error('Database test failed:', dbTest)
              }
            }}
            className="btn btn-outline"
            disabled={loading}
          >
            🧪 Test Debug
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Creating record..." />
            ) : (
              'Create Record'
            )}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 alert alert-danger">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 alert alert-success">
            <p>{success}</p>
          </div>
        )}
      </form>
    </div>
  )
}

export default AddNewRecordPage
