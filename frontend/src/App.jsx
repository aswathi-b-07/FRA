import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabaseService'

// Layout Components
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Pages
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import DigitizeRecordsPage from './pages/DigitizeRecordsPage'
import SavedRecordsPage from './pages/SavedRecordsPage'
import AddNewRecordPage from './pages/AddNewRecordPage'
import VerificationPage from './pages/VerificationPage'
import PolicyRecommendationsPage from './pages/PolicyRecommendationsPage'
import BlockchainVerificationPage from './pages/BlockchainVerificationPage'
import ConflictResolutionPage from './pages/ConflictResolutionPage'
import GramSabhaPage from './pages/GramSabhaPage'
import FraudDetectionPage from './pages/FraudDetectionPage'
import MapViewPage from './pages/MapViewPage'

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/digitize" element={<DigitizeRecordsPage />} />
                      <Route path="/records" element={<SavedRecordsPage />} />
                      <Route path="/add-record" element={<AddNewRecordPage />} />
                      <Route path="/verification" element={<VerificationPage />} />
                      <Route path="/policy" element={<PolicyRecommendationsPage />} />
                      <Route path="/blockchain" element={<BlockchainVerificationPage />} />
                      <Route path="/conflicts" element={<ConflictResolutionPage />} />
                      <Route path="/gram-sabha" element={<GramSabhaPage />} />
                      <Route path="/fraud-detection" element={<FraudDetectionPage />} />
                      <Route path="/map" element={<MapViewPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
