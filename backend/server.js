const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
require("dotenv").config();

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const recordRoutes = require("./src/routes/recordRoutes");
const ocrRoutes = require("./src/routes/ocrRoutes");
const faceRoutes = require("./src/routes/faceRoutes");
const blockchainRoutes = require("./src/routes/blockchainRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const mapRoutes = require("./src/routes/mapRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration for development
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all localhost origins during development
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return callback(null, true);
      }
      
      // Allow specific production origins (add your production domains here)
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:5175",
        "http://localhost:5178"
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Reject other origins
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma"
    ],
    exposedHeaders: [
      "X-Total-Count",
      "X-Page-Count"
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  })
);

// Handle preflight requests explicitly with robust headers
app.options('*', (req, res) => {
  const origin = req.headers.origin || '*';
  console.log(`CORS preflight from: ${origin}`);

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  // Expose custom pagination headers to the browser
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');
  res.header('Access-Control-Allow-Credentials', 'true');
  return res.sendStatus(204);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/map", mapRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "FRA Atlas Backend",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server with graceful fallback if port is in use
function startServer(port, attempt = 0) {
  const parsedPort = Number(port) || 3001;
  const maxAttempts = 5;

  const server = app.listen(parsedPort, () => {
    console.log(`🚀 FRA Atlas Backend server running on port ${parsedPort}`);
    console.log(`📍 Health check: http://localhost:${parsedPort}/api/health`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < maxAttempts) {
      const nextPort = parsedPort + 1;
      console.warn(`⚠️  Port ${parsedPort} is in use. Retrying on ${nextPort}...`);
      setTimeout(() => startServer(nextPort, attempt + 1), 250);
    } else {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
