import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
      } else if (data.user) {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">FRA</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to FRA Atlas
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Forest Rights Monitoring System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              <p>{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Helper links */}
          <div className="space-y-3">
            <div className="text-xs text-gray-600">
              If you just signed up, please verify your email, then sign in.
            </div>
            <div className="flex items-center justify-between">
              <Link to="/signup" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                Don't have an account? Sign up
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    setError('Enter your email to resend verification')
                    return
                  }
                  setLoading(true)
                  setError('')
                  try {
                    const { error } = await import('../services/supabaseService').then(m => m.authService.resendVerification(email))
                    if (error) {
                      setError(error.message)
                    } else {
                      alert('Verification email sent. Please check your inbox.')
                    }
                  } catch (e) {
                    setError('Failed to resend verification. Try again later.')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Resend verification
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/signup"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Don't have an account? Sign up
              </Link>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 space-y-1">
            <p>Demo Credentials:</p>
            <p>Email: demo@fra-atlas.com</p>
            <p>Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
