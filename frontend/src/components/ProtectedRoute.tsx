import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, authSession } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !authSession.roles.some((r) => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
