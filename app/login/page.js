'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, ROLE_HOME_ROUTES } from '@/lib/roles'
import {
  ShieldCheck,
  KeyRound,
  LogIn,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const QUICK_LOGIN_PRESETS = [
  {
    label: 'Admin',
    email: 'admin@sridattam.com',
    role: 'admin',
    description: 'Full access — Dashboard, Users, Audit Logs, Catalog, Operations',
    color: 'border-purple-500/50 bg-purple-950/20 hover:border-purple-400',
    badge: 'bg-purple-600 text-white',
    button: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  {
    label: 'Editor Employee',
    email: 'editor@sridattam.com',
    role: 'editor',
    description: 'Catalog & Operations — Products, Discounts, Orders, Payments',
    color: 'border-blue-500/50 bg-blue-950/20 hover:border-blue-400',
    badge: 'bg-blue-600 text-white',
    button: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  {
    label: 'Viewer Employee',
    email: 'viewer@sridattam.com',
    role: 'read_only',
    description: 'Operations only — View Orders & Payments',
    color: 'border-teal-500/50 bg-teal-950/20 hover:border-teal-400',
    badge: 'bg-teal-600 text-white',
    button: 'bg-teal-600 hover:bg-teal-500 text-white',
  },
  {
    label: 'Customer',
    email: 'customer@sridattam.com',
    role: 'customer',
    description: 'Storefront — Order history, Profile, Addresses',
    color: 'border-amber-500/50 bg-amber-950/20 hover:border-amber-400',
    badge: 'bg-amber-600 text-white',
    button: 'bg-amber-600 hover:bg-amber-400 text-slate-950 font-bold',
  },
]

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      // login() auto-redirects to role's home
    } catch (err) {
      setError(err.message || 'Login failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (presetEmail) => {
    setLoading(true)
    setError(null)
    try {
      await login(presetEmail, 'password123')
      // login() auto-redirects to role's home
    } catch (err) {
      setError(err.message || 'Login failed. Make sure the backend is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }

  // If already authenticated, show redirect info
  if (isAuthenticated && user) {
    const destination = ROLE_HOME_ROUTES[user.role] || '/'
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold text-stone-900">Already Logged In</h1>
          <p className="text-stone-600 text-sm">
            You&apos;re signed in as <strong>{user.name}</strong> ({ROLE_LABELS[user.role] || user.role}).
          </p>
          <Link
            href={destination}
            className="inline-flex items-center gap-2 px-6 py-3 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-xl transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Back to store */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-saffron transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-saffron/10 rounded-2xl mb-4">
              <KeyRound className="w-7 h-7 text-saffron" />
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">Sign In</h1>
            <p className="text-stone-500 text-sm mt-1">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-saffron hover:bg-saffron/90 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Quick Login (Dev Only) */}
        {IS_DEV && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border-2 border-dashed border-amber-300">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dev Only — Quick Login
              </span>
              <p className="text-stone-500 text-xs mt-2">
                Click a role to log in instantly with seeded test credentials
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_LOGIN_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  disabled={loading}
                  onClick={() => handleQuickLogin(preset.email)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${preset.color}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-sm">{preset.label}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${preset.badge}`}>
                      {preset.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
