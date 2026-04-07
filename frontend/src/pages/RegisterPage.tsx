import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../lib/authAPI'

export default function RegisterPage() {
  const { isAuthenticated, isLoading, authSession } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in — redirect by role
  if (!isLoading && isAuthenticated) {
    const dest =
      authSession.roles.includes('Admin') || authSession.roles.includes('Staff')
        ? '/admin'
        : '/donor'
    navigate(dest, { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords must match.')
      return
    }

    setSubmitting(true)
    try {
      await registerUser(email, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
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
            <h1 className="text-2xl font-bold text-black">Create an account</h1>
            <p className="mt-2 text-sm text-medium-gray">
              Join Faro Safehouse
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
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-black">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 14 characters"
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

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-black">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-border bg-off-white px-4 py-3 text-sm text-black placeholder-medium-gray/50 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-wipe w-full rounded-full bg-black py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-medium-gray">
          Already have an account?{' '}
          <Link to="/login" className="text-black hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
