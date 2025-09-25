const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const recordRoutes = require('./src/routes/recordRoutes');
const ocrRoutes = require('./src/routes/ocrRoutes');
const faceRoutes = require('./src/routes/faceRoutes');
const blockchainRoutes = require('./src/routes/blockchainRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const mapRoutes = require('./src/routes/mapRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/map', mapRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FRA Atlas Backend'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 FRA Atlas Backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
