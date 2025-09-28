import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../app/providers/AuthProvider'
import type { Business } from '../app/types'
import type { Role } from '../app/roles'
import { ROLE, ROLE_LABELS } from '../app/roles'

const DEFAULT_SETTINGS = { currency: 'MXN', timezone: 'America/Mexico_City' }

type BusinessSummary = {
  business: Business
  role: Role
}

async function fetchBusiness(id: string) {
  const ref = doc(db, 'businesses', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Business
}

export default function ConsolePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const membershipEntries = useMemo(() => Object.entries(profile?.businesses ?? {}), [profile?.businesses])

  const summariesQuery = useQuery({
    queryKey: ['console-businesses', profile?.uid, membershipEntries],
    queryFn: async () => {
      const results = await Promise.all(
        membershipEntries.map(async ([id, role]) => {
          const business = await fetchBusiness(id)
          if (!business) return null
          return { business, role: role as Role }
        }),
      )
      return results.filter(Boolean) as BusinessSummary[]
    },
    enabled: membershipEntries.length > 0,
  })

  const ownerBusinesses = summariesQuery.data?.filter((item) => item.role === ROLE.Owner) ?? []
  const collaboratorBusinesses = summariesQuery.data?.filter((item) => item.role !== ROLE.Owner) ?? []

  const handleCreateBusiness = async () => {
    if (!user) return
    const name = window.prompt('Nombre del negocio')?.trim()
    if (!name) return

    try {
      const businessRef = doc(collection(db, 'businesses'))
      await setDoc(businessRef, {
        id: businessRef.id,
        name,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: DEFAULT_SETTINGS,
      })

      await setDoc(
        doc(db, 'businesses', businessRef.id, 'members', user.uid),
        {
          uid: user.uid,
          email: user.email ?? '',
          role: ROLE.Owner,
          addedAt: serverTimestamp(),
        },
        { merge: true },
      )

      await setDoc(
        doc(db, 'users', user.uid),
        { businesses: { [businessRef.id]: ROLE.Owner } },
        { merge: true },
      )
    } catch (error) {
      console.error('No se pudo crear el negocio', error)
      window.alert('No se pudo crear el negocio. Intenta nuevamente.')
    }
  }

  const loading = summariesQuery.isLoading && membershipEntries.length > 0

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Tu consola</h1>
        <p className="text-muted-foreground">
          Administra y accede a los negocios donde colaboras.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tus negocios</h2>
          <button
            onClick={handleCreateBusiness}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
          >
            Crear negocio
          </button>
        </div>
        {loading && <div>Cargando negocios...</div>}
        {!loading && ownerBusinesses.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Aún no tienes negocios creados. Usa el botón “Crear negocio” para comenzar.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownerBusinesses.map(({ business, role }) => (
            <article
              key={business.id}
              className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{business.name}</h3>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                </div>
              </header>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  ID: {business.id}
                </div>
                <button
                  onClick={() => navigate(`/business/${business.id}`)}
                  className="rounded-md border px-3 py-1 text-sm font-medium hover:bg-accent"
                >
                  Entrar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Negocios con acceso</h2>
        {loading && <div>Cargando negocios...</div>}
        {!loading && collaboratorBusinesses.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No tienes invitaciones activas todavía.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collaboratorBusinesses.map(({ business, role }) => (
            <article
              key={business.id}
              className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{business.name}</h3>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
                </div>
              </header>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  ID: {business.id}
                </div>
                <button
                  onClick={() => navigate(`/business/${business.id}`)}
                  className="rounded-md border px-3 py-1 text-sm font-medium hover:bg-accent"
                >
                  Entrar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
