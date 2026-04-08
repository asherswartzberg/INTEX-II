import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../context/AuthContext'
import {
  loginUser,
  getExternalProviders,
  buildExternalLoginUrl,
  type ExternalAuthProvider,
} from '../lib/authAPI'

export default function LoginPage() {
  const { isAuthenticated, isLoading, authSession, refreshAuthState } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState(searchParams.get('externalError') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [externalProviders, setExternalProviders] = useState<ExternalAuthProvider[]>([])

  useEffect(() => {
    void getExternalProviders().then(setExternalProviders)
  }, [])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    const dest =
      authSession.roles.includes('Admin') || authSession.roles.includes('Staff')
        ? '/admin'
        : '/donor'

    navigate(dest, { replace: true })
  }, [authSession.roles, isAuthenticated, isLoading, navigate])

  if (!isLoading && isAuthenticated) {
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      await loginUser(email, password, rememberMe)
      await refreshAuthState()
      // AuthContext will now have isAuthenticated=true → redirect above fires
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleExternalLogin(provider: string) {
    window.location.assign(buildExternalLoginUrl(provider, '/admin'))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-medium-gray transition-colors hover:text-black"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm md:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-black">Welcome back</h1>
            <p className="mt-2 text-sm text-medium-gray">
              Sign in to your Faro Safehouse account
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-black">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-off-white px-4 py-3 text-sm text-black placeholder-medium-gray/50 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-black">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-border bg-off-white px-4 py-3 pr-12 text-sm text-black placeholder-medium-gray/50 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-medium-gray hover:text-black transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-black focus:ring-black"
              />
              <label htmlFor="rememberMe" className="text-sm text-medium-gray">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-wipe w-full rounded-full bg-black py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {externalProviders.length > 0 && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-medium-gray">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {externalProviders.map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() => handleExternalLogin(provider.name)}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-off-white"
                >
                  {provider.name === 'Google' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with {provider.displayName}
                </button>
              ))}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-medium-gray">
          Don't have an account?{' '}
          <Link to="/register" className="text-black hover:underline">Create one</Link>
        </p>
      </motion.div>
    </div>
  )
}
