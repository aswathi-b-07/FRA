import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth service functions
export const authService = {
  // Sign up with email and password
  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
        data: {
          full_name: fullName
        }
      }
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Resend verification email
  resendVerification: async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email
    })
    return { data, error }
  }
}

// Database service functions
export const dbService = {
  // Records operations
  records: {
    getAll: async (filters = {}) => {
      let query = supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.state) query = query.eq('state', filters.state)
      if (filters.district) query = query.eq('district', filters.district)
      if (filters.village) query = query.eq('village', filters.village)
      if (filters.limit) query = query.limit(filters.limit)

      const { data, error } = await query
      return { data, error }
    },

    // Get exact total count of records (with optional filters)
    getCount: async (filters = {}) => {
      let query = supabase
        .from('records')
        .select('id', { count: 'exact', head: true })

      if (filters.state) query = query.eq('state', filters.state)
      if (filters.district) query = query.eq('district', filters.district)
      if (filters.village) query = query.eq('village', filters.village)

      const { count, error } = await query
      return { count: count || 0, error }
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    create: async (record) => {
      const { data, error } = await supabase
        .from('records')
        .insert([record])
        .select()
        .single()
      return { data, error }
    },

    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('records')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id)
      return { error }
    },

    search: async (query, state = null) => {
      let dbQuery = supabase
        .from('records')
        .select('*')
        .or(`name.ilike.%${query}%,patta_id.ilike.%${query}%`)
        .limit(20)

      if (state) {
        dbQuery = dbQuery.eq('state', state)
      }

      const { data, error } = await dbQuery
      return { data, error }
    }
  },

  // Conflicts operations
  conflicts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('conflicts')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    },

    create: async (conflict) => {
      const { data, error } = await supabase
        .from('conflicts')
        .insert([conflict])
        .select()
        .single()
      return { data, error }
    }
  },

  // Policy recommendations operations
  policyRecommendations: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('policy_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    },

    create: async (recommendation) => {
      const { data, error } = await supabase
        .from('policy_recommendations')
        .insert([recommendation])
        .select()
        .single()
      return { data, error }
    }
  },

  // Fraud alerts operations
  fraudAlerts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    }
  }
}

// File storage service
export const storageService = {
  // Upload file to Supabase storage
  uploadFile: async (bucket, path, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    return { data, error }
  },

  // Get public URL for a file
  getPublicUrl: (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Delete file from storage
  deleteFile: async (bucket, path) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    return { error }
  }
}
