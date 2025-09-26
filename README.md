# AI-Powered FRA Atlas and WebGIS-based Decision Support System

A comprehensive full-stack web application for monitoring Forest Rights Act (FRA) implementation across Madhya Pradesh, Tripura, Odisha, and Telangana.

## Features

- **User Authentication**: Supabase-powered signup/login
- **Record Digitization**: OCR and NER for legacy document processing
- **Face Recognition**: Biometric verification using face-api.js
- **WebGIS Integration**: Interactive mapping with Leaflet.js
- **Blockchain Verification**: NFT-based land title verification on Avalanche
- **AI Services**: Policy recommendations, conflict resolution
- **Fraud Detection**: ML-powered anomaly detection

## Tech Stack

### Frontend
- React 18 with Vite
- React Router DOM for routing
- Tailwind CSS for styling
- Leaflet.js for mapping
- face-api.js for face recognition
- Supabase client for auth and data

### Backend
- Node.js with Express.js
- Supabase for database and auth
- PostgreSQL with pgvector for embeddings
- Ethers.js for blockchain integration
- OpenAI API for generative AI
- Tesseract.js for OCR

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- Google Cloud Vision API key (optional)

### Installation

1. **Clone and install dependencies:**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Environment Configuration:**

Backend `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
GOOGLE_VISION_API_KEY=your_google_vision_key
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PORT=3001
```

Frontend `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

3. **Database Setup:**
Run the SQL commands in `backend/config/database.sql` in your Supabase SQL editor.

4. **Run the application:**
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Project Structure

```
project-root/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── config/
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── .env
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

- `POST /api/auth/signup` - User registration
- `GET /api/records` - Get all records
- `POST /api/records` - Create new record
- `POST /api/ocr/process` - Process document with OCR
- `POST /api/face/verify` - Face verification
- `POST /api/blockchain/mint` - Mint NFT for record
- `POST /api/ai/policy-recommendations` - Get AI policy recommendations
- `POST /api/ai/conflict-resolution` - Analyze conflicts

## Deployment

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist` folder
3. Set environment variables

### Backend (Render/Heroku)
1. Set environment variables
2. Deploy with `npm start`

## License

MIT License
