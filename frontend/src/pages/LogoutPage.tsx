import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../lib/authAPI'

export default function LogoutPage() {
  const { refreshAuthState } = useAuth()
  const [message, setMessage] = useState('Signing you out...')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        await logoutUser()
        await refreshAuthState()
        if (mounted) setMessage('You are now signed out.')
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unable to log out.')
          setMessage('Logout did not complete.')
        }
      }
    }

    void run()
    return () => { mounted = false }
  }, [refreshAuthState])

  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-black mb-4">{message}</h1>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Link
            to="/"
            className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/80"
          >
            Home
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-off-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
