import { createContext, useContext, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Business, BusinessMember } from '../types'
import type { Role } from '../roles'
import { useAuth } from './AuthProvider'

export type BusinessContextValue = {
  business: Business
  role: Role
  members: BusinessMember[]
  membersLoading: boolean
  refreshMembers: () => Promise<BusinessMember[] | undefined>
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined)

async function fetchBusiness(businessId: string) {
  const ref = doc(db, 'businesses', businessId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Business not found')
  return { id: snap.id, ...snap.data() } as Business
}

async function fetchMembers(businessId: string) {
  const col = collection(db, 'businesses', businessId, 'members')
  const snap = await getDocs(col)
  return snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...(docSnap.data() as Omit<BusinessMember, 'uid'>),
  })) as BusinessMember[]
}

export function BusinessProvider({ businessId, children }: { businessId: string; children: ReactNode }) {
  const { profile, loading: authLoading } = useAuth()
  const role = (profile?.businesses?.[businessId] ?? null) as Role | null

  const businessQuery = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: Boolean(businessId),
  })

  const membersQuery = useQuery({
    queryKey: ['business-members', businessId],
    queryFn: () => fetchMembers(businessId),
    enabled: Boolean(businessId && role),
  })

  const { data: membersData, isPending: membersPending, refetch: refetchMembersQuery } = membersQuery

  if (authLoading || businessQuery.isLoading) {
    return <div className="p-6">Cargando negocio...</div>
  }

  if (!businessId || !role || !businessQuery.data) {
    return <Navigate to="/" replace />
  }

  const refreshMembers = useCallback(async () => {
    const fresh = await refetchMembersQuery()
    return fresh.data
  }, [refetchMembersQuery])

  const value = useMemo<BusinessContextValue>(
    () => ({
      business: businessQuery.data!,
      role: role!,
      members: membersData ?? [],
      membersLoading: membersPending,
      refreshMembers,
    }),
    [businessQuery.data, membersData, membersPending, refreshMembers, role],
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used inside BusinessProvider')
  return ctx
}
