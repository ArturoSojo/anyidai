import { useMemo } from 'react'
import type { Role } from '../app/roles'
import { useAuth } from '../app/providers/AuthProvider'

export function useRole(businessId?: string | null) {
  const { profile } = useAuth()

  return useMemo(() => {
    if (!businessId) return null
    const value = profile?.businesses?.[businessId]
    if (!value) return null
    return value as Role
  }, [businessId, profile?.businesses])
}
