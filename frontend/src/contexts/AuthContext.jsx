import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/supabaseService'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session, error } = await authService.getSession()
        if (error) {
          console.error('Error getting initial session:', error)
        } else {
          setSession(session)
          setUser(session?.user || null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user || null)
        setLoading(false)

        // Store token in localStorage for API requests
        if (session?.access_token) {
          localStorage.setItem('supabase.auth.token', session.access_token)
        } else {
          localStorage.removeItem('supabase.auth.token')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      setLoading(true)
      const { data, error } = await authService.signUp(email, password, fullName)
      
      if (error) {
        throw error
      }

      // If email confirmation is enabled in Supabase, signUp returns session null
      // Show a friendly message quickly and do not attempt immediate sign-in
      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await authService.signIn(email, password)
      
      if (error) {
        // Provide clearer feedback for common cases
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please check your inbox for the verification link or click "Resend Verification".')
        }
        if (error.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password.')
        }
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await authService.signOut()
      
      if (error) {
        throw error
      }

      // Clear local storage
      localStorage.removeItem('supabase.auth.token')
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
