import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../app/providers/AuthProvider'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-6">Cargando...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
