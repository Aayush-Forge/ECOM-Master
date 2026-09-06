'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_HOME_ROUTES, getRoleLabel } from '@/lib/roles'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const AuthContext = createContext(null)

/**
 * Reads auth session from localStorage.
 * Returns { user, token } or null.
 */
function readSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('auth_session')
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.user) return null
    return {
      user: {
        id: session.user.id || 'usr_active',
        name: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email,
        email: session.user.email,
        role: session.user.role || 'customer',
        firstName: session.user.firstName,
        lastName: session.user.lastName,
      },
      token: session.access_token,
    }
  } catch {
    return null
  }
}

function writeSession(user, token) {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_session', JSON.stringify({ user, access_token: token }))
  window.dispatchEvent(new Event('auth-change'))
}

function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_session')
  window.dispatchEvent(new Event('auth-change'))
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Read session on mount
  useEffect(() => {
    setSession(readSession())
    setLoading(false)
  }, [])

  // Listen for auth-change events (cross-tab, cross-component sync)
  useEffect(() => {
    const handleChange = () => {
      setSession(readSession())
    }
    window.addEventListener('auth-change', handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener('auth-change', handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  /**
   * Login with email/password, store session, and redirect to role's home route.
   * Returns the login response data on success, or throws on failure.
   */
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Login failed')

    writeSession(data.user, data.access_token)
    setSession({
      user: {
        id: data.user.id,
        name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.email,
        email: data.user.email,
        role: data.user.role || 'customer',
        firstName: data.user.firstName,
        lastName: data.user.lastName,
      },
      token: data.access_token,
    })

    // Single-hop redirect to role's home
    const destination = ROLE_HOME_ROUTES[data.user.role] || '/'
    router.push(destination)

    return data
  }, [router])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    router.push('/')
  }, [router])

  const value = {
    user: session?.user || null,
    token: session?.token || null,
    isAuthenticated: !!session?.user,
    loading,
    login,
    logout,
    roleLabel: session?.user ? getRoleLabel(session.user.role) : null,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * Returns { user, token, isAuthenticated, loading, login, logout, roleLabel }
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export default AuthContext
