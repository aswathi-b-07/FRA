import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('supabase.auth.token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('supabase.auth.token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API service functions
export const apiService = {
  // OCR services
  ocr: {
    processDocument: async (formData) => {
      const response = await apiClient.post('/ocr/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },

    processText: async (text) => {
      const response = await apiClient.post('/ocr/process-text', { text })
      return response.data
    }
  },

  // Face recognition services
  face: {
    verify: async (faceEmbedding, name = null, threshold = 0.8) => {
      const response = await apiClient.post('/face/verify', {
        faceEmbedding,
        name,
        threshold
      })
      return response.data
    },

    store: async (recordId, faceEmbedding) => {
      const response = await apiClient.post('/face/store', {
        recordId,
        faceEmbedding
      })
      return response.data
    },

    findSimilar: async (faceEmbedding, threshold = 0.9, excludeRecordId = null) => {
      const response = await apiClient.post('/face/similar', {
        faceEmbedding,
        threshold,
        excludeRecordId
      })
      return response.data
    },

    getStats: async () => {
      const response = await apiClient.get('/face/stats')
      return response.data
    }
  },

  // Records services
  records: {
    getAll: async (params = {}) => {
      const response = await apiClient.get('/records', { params })
      return response.data
    },

    getById: async (id) => {
      const response = await apiClient.get(`/records/${id}`)
      return response.data
    },

    create: async (record) => {
      const response = await apiClient.post('/records', record)
      return response.data
    },

    update: async (id, updates) => {
      const response = await apiClient.put(`/records/${id}`, updates)
      return response.data
    },

    delete: async (id) => {
      const response = await apiClient.delete(`/records/${id}`)
      return response.data
    },

    search: async (query, state = null) => {
      const response = await apiClient.get('/records/search', {
        params: { query, state }
      })
      return response.data
    },

    getByArea: async (bounds) => {
      const response = await apiClient.get('/records/area', { params: bounds })
      return response.data
    }
  },

  // Blockchain services
  blockchain: {
    mint: async (recordId, metadata = null) => {
      const response = await apiClient.post('/blockchain/mint', {
        recordId,
        metadata
      })
      return response.data
    },

    getNFTDetails: async (tokenId) => {
      const response = await apiClient.get(`/blockchain/nft/${tokenId}`)
      return response.data
    },

    verifyOwnership: async (tokenId, ownerAddress) => {
      const response = await apiClient.post('/blockchain/verify-ownership', {
        tokenId,
        ownerAddress
      })
      return response.data
    },

    transfer: async (tokenId, fromAddress, toAddress) => {
      const response = await apiClient.post('/blockchain/transfer', {
        tokenId,
        fromAddress,
        toAddress
      })
      return response.data
    },

    getStats: async () => {
      const response = await apiClient.get('/blockchain/stats')
      return response.data
    }
  },

  // AI services
  ai: {
    generatePolicyRecommendations: async (params) => {
      const response = await apiClient.post('/ai/policy-recommendations', params)
      return response.data
    },

    analyzeConflict: async (params) => {
      const response = await apiClient.post('/ai/conflict-analysis', params)
      return response.data
    },

    gramSabhaAssistant: async (params) => {
      const response = await apiClient.post('/ai/gram-sabha-assistant', params)
      return response.data
    },

    detectFraud: async (recordData, checkType = 'comprehensive') => {
      const response = await apiClient.post('/ai/fraud-detection', {
        recordData,
        checkType
      })
      return response.data
    },

    getInsights: async (params = {}) => {
      const response = await apiClient.get('/ai/insights', { params })
      return response.data
    }
  },

  // Map services
  map: {
    getStateGeoJSON: async (state) => {
      const response = await apiClient.get(`/map/geojson/${state}`)
      return response.data
    },

    getFRAreas: async (params = {}) => {
      const response = await apiClient.get('/map/fra-areas', { params })
      return response.data
    },

    detectAssets: async (imageData, coordinates, analysisType = 'comprehensive') => {
      const response = await apiClient.post('/map/asset-detection', {
        imageData,
        coordinates,
        analysisType
      })
      return response.data
    },

    getLayers: async () => {
      const response = await apiClient.get('/map/layers')
      return response.data
    }
  },

  // Health check
  health: async () => {
    const response = await apiClient.get('/health')
    return response.data
  }
}

// Utility functions
export const apiUtils = {
  // Handle API errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.data?.message || 'Server error'
      return { error: message, status: error.response.status }
    } else if (error.request) {
      // Request was made but no response received
      return { error: 'Network error - please check your connection', status: 0 }
    } else {
      // Something else happened
      return { error: error.message || 'An unexpected error occurred', status: -1 }
    }
  },

  // Format file for upload
  createFormData: (file, additionalData = {}) => {
    const formData = new FormData()
    formData.append('document', file)
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key])
    })
    
    return formData
  },

  // Convert blob to base64
  blobToBase64: (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

export default apiService
