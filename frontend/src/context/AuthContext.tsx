import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getAuthSession } from '../lib/authAPI'
import type { AuthSession } from '../lib/authAPI'

interface AuthContextValue {
  authSession: AuthSession
  isAuthenticated: boolean
  isLoading: boolean
  refreshAuthState: () => Promise<void>
}

const anonymousSession: AuthSession = {
  isAuthenticated: false,
  userName: null,
  email: null,
  firstName: null,
  lastName: null,
  roles: [],
  supporterId: null,
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(anonymousSession)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuthState = useCallback(async () => {
    try {
      const session = await getAuthSession()
      setAuthSession(session)
    } catch {
      setAuthSession(anonymousSession)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAuthState()
  }, [refreshAuthState])

  return (
    <AuthContext.Provider
      value={{
        authSession,
        isAuthenticated: authSession.isAuthenticated,
        isLoading,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.')
  return ctx
}
