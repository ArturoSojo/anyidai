import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

import { useAuth } from '../app/providers/AuthProvider'
import type { Business } from '../app/types'
import type { Role } from '../app/roles'
import { ROLE, ROLE_LABELS } from '../app/roles'
import { signOut } from 'firebase/auth'

import { Store, Plus, ArrowRight, Crown, Users, Calendar, Building2, Sparkles, LogOut } from 'lucide-react'

const DEFAULT_SETTINGS = { currency: 'VES', timezone: 'America/Caracas', country: 'Venezuela' }


/** === Paleta y estilos base (alineados al Login) === */
const palette = {
  pink100: '#FCD1E3',
  pink500: '#FF5AB8',
  violet600: '#6F1AB6',
  purple700: '#5B2C98',
  blue600: '#0F69A8',
  cyan400: '#19D1F2',
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    position: 'relative',
    display: 'block',
    background: `linear-gradient(145deg,
      ${palette.pink500} 0%,
      ${palette.violet600} 30%,
      ${palette.purple700} 45%,
      ${palette.blue600} 70%,
      ${palette.cyan400} 100%)`,
    overflow: 'hidden',
    color: 'white',
  },
  backGlow: {
    position: 'absolute',
    width: 1200,
    height: 1200,
    borderRadius: '50%',
    background: `radial-gradient(closest-side, ${palette.pink100}, transparent 70%)`,
    filter: 'blur(50px)',
    opacity: 0.28,
    top: '-25%',
    right: '-10%',
    animation: 'float 14s ease-in-out infinite',
    pointerEvents: 'none',
  },
  brand: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(255,255,255,.15)',
  },
  brandLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logoMark: { fontSize: 22, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.25))' },
  logoText: { fontWeight: 800, letterSpacing: .4, textShadow: '0 2px 10px rgba(0,0,0,.25)' },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '999px',
    boxShadow: '0 4px 14px rgba(0,0,0,.25)',
    border: '2px solid rgba(255,255,255,.7)'
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 16px',
  },
  heading: { fontSize: 28, fontWeight: 800, marginBottom: 6 },
  subheading: { opacity: .9, marginBottom: 24 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
  },
  // Tarjeta tipo “glass”
  glassCard: {
    position: 'relative',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,.28)',
    background: 'rgba(255,255,255,.14)',
    boxShadow: '0 12px 40px rgba(0,0,0,.25)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white',
    overflow: 'hidden',
    transition: 'transform .18s ease, box-shadow .18s ease',
  },
  cardHover: { transform: 'translateY(-2px)', boxShadow: '0 18px 60px rgba(0,0,0,.28)' },
  cardHeader: { padding: 18, paddingBottom: 10, display: 'flex', gap: 12, alignItems: 'center' },
  cardBody: { padding: 18, paddingTop: 8 },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,.35)',
    background: 'rgba(255,255,255,.2)'
  },
  primaryBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.35)',
    background: 'linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,255,255,.85))',
    color: '#1a1f36',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'transform .12s ease, box-shadow .12s ease, background .2s ease',
    boxShadow: '0 6px 18px rgba(0,0,0,.18)'
  },
  outlineBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.35)',
    background: 'transparent',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform .12s ease, box-shadow .12s ease, background .2s ease',
    boxShadow: '0 6px 18px rgba(0,0,0,.18)'
  },
  muted: { opacity: .85 },
}

// ====== TIPOS ======

type BusinessSummary = { business: Business; role: Role }

type CreateBusinessFormData = { name: string; description: string; address: string; phone: string; email: string }

// ---- helpers ----
async function fetchBusiness(id: string) {
  const ref = doc(db, 'businesses', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Business
}

function tsToDate(v: any): Date | null {
  if (!v) return null
  // Firestore Timestamp?
  // @ts-ignore
  if (typeof v?.toDate === 'function') return v.toDate()
  try { return new Date(v) } catch { return null }
}

function RolePill({ role }: { role: Role | string }) {
  const label = ROLE_LABELS[(role as Role) || ROLE.Guest]
  return <span style={styles.pill}>{label}</span>
}

/** ===== Componente tarjeta (hooks locales permitidos) ===== */
function BusinessCard({
  business,
  role,
  variant,
  onPrimary,
}: {
  business: Business
  role: Role | string
  variant: 'owner' | 'access'
  onPrimary: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const createdAt = tsToDate((business as any).createdAt)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...styles.glassCard, ...(hovered ? styles.cardHover : null) }}
    >
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.2)' }}>
            <div style={{ display: 'flex', height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: variant === 'owner' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'linear-gradient(135deg, #0ea5e9, #22d3ee)' }}>
              <Store size={18} color="#fff" />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>{business.name}</div>
            <RolePill role={role} />
          </div>
        </div>
      </div>

      <div style={styles.cardBody}>
        <p style={{ ...styles.muted, marginBottom: 12, fontSize: 14 }}>
          {(business as any).description || 'Salón de belleza profesional'}
        </p>

        {variant === 'owner' && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: .95 }}>
              <Building2 size={16} /> {(business as any).settings?.address || 'Dirección no configurada'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: .95 }}>
              <Calendar size={16} /> Creado: {createdAt ? createdAt.toLocaleDateString() : '—'}
            </div>
          </div>
        )}

        <button style={variant === 'owner' ? styles.primaryBtn : styles.outlineBtn} onClick={onPrimary}>
          {variant === 'owner' ? 'Gestionar Negocio' : 'Acceder'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function ConsolePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState<CreateBusinessFormData>({ name: '', description: '', address: '', phone: '', email: '' })

  const membershipEntries = useMemo(() => Object.entries(profile?.businesses ?? {}), [profile?.businesses])

  const summariesQuery = useQuery({
    queryKey: ['console-businesses', profile?.uid, membershipEntries],
    queryFn: async () => {
      const results = await Promise.all(
        membershipEntries.map(async ([id, role]) => {
          const business = await fetchBusiness(id)
          if (!business) return null
          return { business, role: role as Role }
        })
      )
      return results.filter(Boolean) as BusinessSummary[]
    },
    enabled: membershipEntries.length > 0,
  })

  const loading = summariesQuery.isLoading && membershipEntries.length > 0
  const summaries = summariesQuery.data ?? []

  const ownerBusinesses = summaries.filter((s) => s.role === ROLE.Owner).map((s) => s.business)
  const accessBusinesses = summaries.filter((s) => s.role !== ROLE.Owner).map((s) => s.business)

  const handleCreateBusiness = async () => {
    const name = formData.name.trim()
    if (!user || !name) return

    try {
      const businessRef = doc(collection(db, 'businesses'))
      await setDoc(businessRef, {
        id: businessRef.id,
        name,
        description: formData.description || '',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: { ...DEFAULT_SETTINGS, country: 'México', address: formData.address || '', phone: formData.phone || '', email: formData.email || user.email || '' },
      })

      await setDoc(doc(db, 'businesses', businessRef.id, 'members', user.uid), { uid: user.uid, email: user.email ?? '', role: ROLE.Owner, addedAt: serverTimestamp() }, { merge: true })
      await setDoc(doc(db, 'users', user.uid), { businesses: { [businessRef.id]: ROLE.Owner } }, { merge: true })

      setFormData({ name: '', description: '', address: '', phone: '', email: '' })
      setIsCreateModalOpen(false)
      summariesQuery.refetch()
    } catch (err) {
      console.error('No se pudo crear el negocio', err)
      window.alert('No se pudo crear el negocio. Intenta nuevamente.')
    }
  }

  const doLogout = async () => { await signOut(auth); navigate('/login') }

  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.backGlow} />
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ margin: '0 auto 16px', height: 48, width: 48, borderRadius: '999px', border: '3px solid rgba(255,255,255,.7)', borderBottomColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <p style={{ opacity: .9 }}>Cargando tus negocios…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.backGlow} />

      {/* Header / Brand */}
      <header style={styles.brand}>
        <div style={styles.brandLeft}>
          <span style={styles.logoMark}>💈</span>
          <span style={styles.logoText}>Anyidai</span>
        </div>
        <div style={styles.userBox}>
          <img
            src={(user?.photoURL as string) || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.displayName as string) || 'User')}&background=7B1FA2&color=fff`}
            alt={(user?.displayName as string) || 'User'}
            style={styles.avatar}
          />
          <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700 }}>{(user?.displayName as string) || ''}</div>
            <div style={{ fontSize: 12, opacity: .9 }}>{user?.email}</div>
          </div>
          <button onClick={doLogout} style={{ ...styles.outlineBtn, width: 'auto', padding: '8px 12px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main style={styles.container}>
        {/* Welcome */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={styles.heading}>¡Hola, {(user?.displayName || '').toString().split(' ')[0] || '👋'}! 👋</h2>
          <p style={styles.subheading}>Desde aquí puedes acceder a todos tus salones de belleza y crear nuevos negocios.</p>
        </section>

        {/* Tus Negocios (owner) */}
        {ownerBusinesses.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Crown size={18} />
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tus Negocios ({ownerBusinesses.length})</h3>
            </div>

            <div style={styles.grid as React.CSSProperties}>
              {ownerBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  role={ROLE.Owner}
                  variant="owner"
                  onPrimary={() => navigate(`/business/${business.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Negocios con Acceso */}
        {accessBusinesses.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={18} />
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Negocios con Acceso ({accessBusinesses.length})</h3>
            </div>

            <div style={styles.grid as React.CSSProperties}>
              {accessBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  role={(profile?.businesses ?? {})[business.id] || ROLE.Guest}
                  variant="access"
                  onPrimary={() => navigate(`/business/${business.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Crear Nuevo Negocio */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,.25)' }}>
            <Plus size={18} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Crear Nuevo Negocio</h3>
          </div>

          <div style={{ ...styles.glassCard, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.2)' }}>
                  <div style={{ display: 'flex', height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #0ea5e9)' }}>
                    <Sparkles size={18} color="#fff" />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontWeight: 800 }}>¿Expandiendo tu imperio?</h4>
                  <p style={{ ...styles.muted }}>Crea un nuevo salón y comienza a gestionarlo desde el primer día.</p>
                </div>
              </div>

              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <button style={{ ...styles.primaryBtn, width: 'auto' }}>
                    <Plus size={16} /> Crear Negocio
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl border border-white/50  backdrop-blur-2xl shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold tracking-tight">Crear Nuevo Negocio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre del Negocio *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Anyidai Polanco" className="mt-1 focus-visible:ring-2 focus-visible:ring-purple-400" />
                    </div>
                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Breve descripción de tu salón..." rows={3} className="mt-1 focus-visible:ring-2 focus-visible:ring-purple-400" />
                    </div>
                    <div>
                      <Label htmlFor="address">Dirección</Label>
                      <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Dirección completa" className="mt-1 focus-visible:ring-2 focus-visible:ring-purple-400" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+52 55 1234 5678" className="mt-1 focus-visible:ring-2 focus-visible:ring-purple-400" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contacto@salon.com" className="mt-1 focus-visible:ring-2 focus-visible:ring-purple-400" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="hover:bg-white/60">Cancelar</Button>
                      <Button onClick={handleCreateBusiness} disabled={!formData.name.trim()} className="shadow-md hover:shadow-lg bg-gradient-to-r from-white to-white/90 text-gray-900">
                        Crear Negocio
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Empty State */}
        {membershipEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ margin: '0 auto 16px', height: 64, width: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', background: 'linear-gradient(135deg, rgba(255,255,255,.35), rgba(255,255,255,.2))', boxShadow: '0 12px 40px rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.35)' }}>
              <Store size={28} color="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>¡Bienvenido a Anyidai!</h3>
            <p style={{ ...styles.muted, marginBottom: 18 }}>Crea tu primer salón de belleza y comienza a gestionar tu negocio.</p>
            <button onClick={() => setIsCreateModalOpen(true)} style={{ ...styles.primaryBtn, width: 'auto' }}>
              <Plus size={16} /> Crear Mi Primer Negocio
            </button>
          </div>
        )}
      </main>

      <footer style={{ position: 'sticky', bottom: 0, textAlign: 'center', padding: '12px 0 18px', color: 'rgba(255,255,255,.85)', fontSize: 12 }}>
        © {new Date().getFullYear()} Anyidai
      </footer>
    </div>
  )
}
