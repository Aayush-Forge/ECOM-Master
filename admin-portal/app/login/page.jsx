'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ROLE_HOME_ROUTES } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    searchParams.get('error') === 'unauthorized'
      ? 'Access denied. You need staff or administrator privileges to access this portal.'
      : null
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const user = await login(email, password)
      if (!user) {
        throw new Error('Authentication failed')
      }

      const role = (user.role || '').toLowerCase()
      if (role === 'customer') {
        setError('Access denied: Customer accounts cannot access the admin portal.')
        setLoading(false)
        return
      }

      const redirectPath = ROLE_HOME_ROUTES[role] || '/overview'
      router.push(redirectPath)
    } catch (err) {
      console.error('Login error:', err)
      setError(err?.response?.data?.message || err?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white border-stone-200 text-stone-900 shadow-xl rounded-xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-stone-900">Sign In</CardTitle>
        <CardDescription className="text-stone-500 text-xs">
          Enter your credentials to access operations & catalog management
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-stone-700 font-semibold">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="staff@sridattam.com"
                className="pl-9 bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-[#FF6B00]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-stone-700 font-semibold">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-9 bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-[#FF6B00]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold shadow-sm transition-colors py-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 mb-3 shadow-sm">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-display">SRIDATTAM</h1>
          <p className="text-xs text-stone-500 font-mono tracking-widest uppercase mt-0.5">Management Portal</p>
        </div>

        <Suspense fallback={
          <div className="p-8 text-center text-stone-400">Loading form...</div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-stone-400 mt-6">
          Authorized personnel only. All access attempts are monitored and logged.
        </p>
      </div>
    </div>
  )
}
