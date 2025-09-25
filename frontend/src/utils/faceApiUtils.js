import * as faceapi from '@vladmandic/face-api'

class FaceApiUtils {
  constructor() {
    this.modelsLoaded = false
    this.modelPath = '/models'
  }

  async loadModels() {
    if (this.modelsLoaded) return

    try {
      console.log('Loading face-api.js models...')
      
      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(this.modelPath)
      ])

      this.modelsLoaded = true
      console.log('Face-api.js models loaded successfully')
    } catch (error) {
      console.error('Failed to load face-api.js models:', error)
      // Continue without face recognition functionality
    }
  }

  async detectFace(imageElement) {
    if (!this.modelsLoaded) {
      await this.loadModels()
    }

    if (!this.modelsLoaded) {
      throw new Error('Face detection models not loaded')
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()

      return detections
    } catch (error) {
      console.error('Face detection error:', error)
      throw error
    }
  }

  async getFaceDescriptor(imageElement) {
    const detections = await this.detectFace(imageElement)
    
    if (detections.length === 0) {
      throw new Error('No face detected in the image')
    }

    if (detections.length > 1) {
      console.warn('Multiple faces detected, using the first one')
    }

    return detections[0].descriptor
  }

  async captureFromVideo(videoElement) {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      throw new Error('Invalid video element')
    }

    // Create canvas to capture frame
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to capture image from video'))
        }
      }, 'image/jpeg', 0.8)
    })
  }

  async getFaceDescriptorFromVideo(videoElement) {
    if (!this.modelsLoaded) {
      await this.loadModels()
    }

    if (!this.modelsLoaded) {
      throw new Error('Face detection models not loaded')
    }

    try {
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()

      if (detections.length === 0) {
        throw new Error('No face detected')
      }

      return detections[0].descriptor
    } catch (error) {
      console.error('Face descriptor extraction error:', error)
      throw error
    }
  }

  calculateSimilarity(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) {
      return 0
    }

    // Calculate cosine similarity
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < descriptor1.length; i++) {
      dotProduct += descriptor1[i] * descriptor2[i]
      normA += descriptor1[i] * descriptor1[i]
      normB += descriptor2[i] * descriptor2[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  async startVideoStream(videoElement, constraints = {}) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          ...constraints.video
        },
        audio: false,
        ...constraints
      })

      videoElement.srcObject = stream
      
      return new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play()
          resolve(stream)
        }
        videoElement.onerror = reject
      })
    } catch (error) {
      console.error('Error starting video stream:', error)
      throw error
    }
  }

  stopVideoStream(videoElement) {
    if (videoElement.srcObject) {
      const stream = videoElement.srcObject
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      videoElement.srcObject = null
    }
  }

  drawDetections(canvas, detections) {
    if (!detections || detections.length === 0) return

    const ctx = canvas.getContext('2d')
    const displaySize = { width: canvas.width, height: canvas.height }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Resize detections to match display size
    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    // Draw face detection boxes
    faceapi.draw.drawDetections(canvas, resizedDetections)
    
    // Draw face landmarks
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
  }

  // Mock face descriptor for testing when models aren't loaded
  generateMockDescriptor() {
    return new Float32Array(128).map(() => Math.random() * 2 - 1)
  }

  // Validate if face descriptor is valid
  isValidDescriptor(descriptor) {
    return descriptor && 
           descriptor.length === 128 && 
           descriptor instanceof Float32Array
  }

  // Convert descriptor to array for storage
  descriptorToArray(descriptor) {
    return Array.from(descriptor)
  }

  // Convert array back to descriptor
  arrayToDescriptor(array) {
    return new Float32Array(array)
  }
}

export default new FaceApiUtils()
