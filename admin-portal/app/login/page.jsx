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
    <Card className="bg-stone-900 border-stone-800 text-stone-100 shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold text-white">Sign In</CardTitle>
        <CardDescription className="text-stone-400 text-xs">
          Enter your staff credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-stone-300 font-medium">
              Work Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="staff@sridattam.com"
                className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-saffron"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-stone-300 font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-saffron"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-saffron hover:bg-saffron/90 text-white font-medium shadow-md transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Authenticating...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-saffron/10 text-saffron border border-saffron/20 mb-3 shadow-lg">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sridattam Portal</h1>
          <p className="text-sm text-stone-400 mt-1">Staff & Management Operations</p>
        </div>

        <Suspense fallback={
          <div className="p-8 text-center text-stone-400">Loading form...</div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-stone-500 mt-6">
          Authorized personnel only. All access attempts are logged and monitored.
        </p>
      </div>
    </div>
  )
}
