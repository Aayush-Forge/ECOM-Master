'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, ROLE_HOME_ROUTES } from '@/lib/roles'
import {
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { register: registerUser, isAuthenticated, user } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const validate = () => {
    const errors = {}
    if (!firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required'
    }
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      await registerUser(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim(),
        redirectParam
      )
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // If already authenticated, show redirect info
  if (isAuthenticated && user) {
    const destination = redirectParam || ROLE_HOME_ROUTES[user.role] || '/account'
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
            Continue to Account
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

        {/* Register Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-saffron/10 rounded-2xl mb-4">
              <UserPlus className="w-7 h-7 text-saffron" />
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">Create Account</h1>
            <p className="text-stone-500 text-sm mt-1">Join Sri Dattam for a personalized devotional experience</p>
          </div>

          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: null }))
                  }}
                  placeholder="First name"
                  className={`w-full px-4 py-3 rounded-xl border bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition ${
                    fieldErrors.firstName ? 'border-red-400 focus:border-red-500' : 'border-stone-200'
                  }`}
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-600 mt-1 font-inter">{fieldErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: null }))
                  }}
                  placeholder="Last name"
                  className={`w-full px-4 py-3 rounded-xl border bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition ${
                    fieldErrors.lastName ? 'border-red-400 focus:border-red-500' : 'border-stone-200'
                  }`}
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-600 mt-1 font-inter">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null }))
                }}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 rounded-xl border bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition ${
                  fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-stone-200'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1 font-inter">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null }))
                }}
                placeholder="At least 6 characters"
                className={`w-full px-4 py-3 rounded-xl border bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron transition ${
                  fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-stone-200'
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1 font-inter">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E55A00] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-md cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="pt-2 text-center text-sm text-stone-600 font-inter border-t border-stone-100">
            <span>Already have an account? </span>
            <Link
              href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
              className="font-semibold text-saffron hover:underline"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2]" />}>
      <RegisterForm />
    </Suspense>
  )
}
