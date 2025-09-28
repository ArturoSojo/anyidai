import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  deleteField,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

import { useBusiness } from '../../app/providers/BusinessProvider'
import { useAuth } from '../../app/providers/AuthProvider'

import type { Role } from '../../app/roles'
import { ROLE, ROLE_LABELS, PRIVILEGED_ROLES } from '../../app/roles'
import type { BusinessMember } from '../../app/types'

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import {
  Plus,
  Search as SearchIcon,
  Trash2,
  Users as UsersIcon,
  Crown,
  Shield,
  UserCog,
  User,
  Eye,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react'

const GMAIL_DOMAIN = '@gmail.com'

// --- helpers ---
function tsToDate(v: any): Date | null {
  if (!v) return null
  // Firestore Timestamp?
  // @ts-ignore
  if (typeof v?.toDate === 'function') return v.toDate()
  try {
    return new Date(v)
  } catch {
    return null
  }
}

function getAssignableRoles(currentRole: Role) {
  if (currentRole === ROLE.Owner) return [ROLE.Admin, ROLE.Manager, ROLE.Staff, ROLE.Guest, ROLE.Owner]
  if (currentRole === ROLE.Admin) return [ROLE.Admin, ROLE.Manager, ROLE.Staff, ROLE.Guest]
  return []
}

function canEditMember(currentRole: Role, member: BusinessMember) {
  if (member.role === ROLE.Owner && currentRole !== ROLE.Owner) return false
  if (member.role === ROLE.Admin && currentRole !== ROLE.Owner) return false
  return true
}

function getRoleIcon(role: Role) {
  switch (role) {
    case ROLE.Owner: return <Crown className="h-4 w-4" />
    case ROLE.Admin: return <Shield className="h-4 w-4" />
    case ROLE.Manager: return <UserCog className="h-4 w-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white" />
    case ROLE.Staff: return <User className="h-4 w-4" />
    case ROLE.Guest: return <Eye className="h-4 w-4" />
    default: return <User className="h-4 w-4" />
  }
}

function getRoleBadgeClass(role: Role) {
  switch (role) {
    case ROLE.Owner: return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
    case ROLE.Admin: return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
    case ROLE.Manager: return 'bg-gradient-to-r from-green-500 to-green-600 text-white'
    case ROLE.Staff: return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
    case ROLE.Guest: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Descripciones (si no existen en tu archivo de roles)
const ROLE_HINTS: Record<Role, string> = {
  [ROLE.Owner]: 'Acceso total y transferencia de propiedad',
  [ROLE.Admin]: 'Administra usuarios y configuración',
  [ROLE.Manager]: 'Opera el negocio y agenda',
  [ROLE.Staff]: 'Atiende servicios y ventas',
  [ROLE.Guest]: 'Solo lectura',
}

export function UserManagement() {
  // Provider
  const { business, role, members, membersLoading, refreshMembers } = useBusiness()
  const { user } = useAuth()

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const assignableRoles = useMemo(() => getAssignableRoles(role), [role])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>(() => assignableRoles[0] ?? ROLE.Manager)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Mantener rol válido si cambia el rol del usuario actual
  useEffect(() => {
    if (!assignableRoles.includes(inviteRole)) {
      setInviteRole(assignableRoles[0] ?? ROLE.Manager)
    }
  }, [assignableRoles, inviteRole])

  // Guardas sin permisos → mensaje
  if (!PRIVILEGED_ROLES.includes(role)) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No tienes permiso para gestionar usuarios en este negocio.
        </CardContent>
      </Card>
    )
  }

  // Filtrado por nombre/email (fallback al prefijo de email)
  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return members
    return members.filter((m) => {
      const name = (m as any).name || m.email.split('@')[0]
      return name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)
    })
  }, [members, searchTerm])

  // === Actions ===
  const handleInvite = async (event?: FormEvent) => {
    event?.preventDefault()
    setError(null)
    setSuccess(null)

    if (!business?.id) {
      setError('No hay un negocio seleccionado.')
      return
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase()
    if (!normalizedEmail.endsWith(GMAIL_DOMAIN)) {
      setError('Solo se permiten invitaciones a correos de Gmail.')
      return
    }

    if (members.find((m) => m.email.toLowerCase() === normalizedEmail)) {
      setError('Este usuario ya es miembro del negocio.')
      return
    }

    setBusy(true)
    try {
      // Buscar /users por email
      const usersRef = collection(db, 'users')
      const snap = await getDocs(query(usersRef, where('email', '==', normalizedEmail)))
      if (snap.empty) {
        setError('No encontramos una cuenta registrada con ese correo. Pide al usuario que inicie sesión primero.')
        return
      }

      const invitedUid = snap.docs[0].id

      // Agregar a members del negocio
      await setDoc(
        doc(db, 'businesses', business.id, 'members', invitedUid),
        {
          uid: invitedUid,
          email: normalizedEmail,
          role: inviteRole,
          addedAt: serverTimestamp(),
        },
        { merge: true }
      )

      // Espejo en /users.{uid}.businesses.{businessId}
      await setDoc(
        doc(db, 'users', invitedUid),
        { businesses: { [business.id]: inviteRole } },
        { merge: true }
      )

      setSuccess('Invitación enviada correctamente.')
      setInviteEmail('')
      setInviteRole(assignableRoles[0] ?? ROLE.Manager)
      setIsInviteModalOpen(false)

      await refreshMembers()
    } catch (err) {
      console.error(err)
      setError('No se pudo enviar la invitación. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const handleChangeRole = async (member: BusinessMember, nextRole: Role) => {
    if (!business?.id) return
    if (member.role === nextRole) return
    if (!canEditMember(role, member)) return
    if (role !== ROLE.Owner && (nextRole === ROLE.Admin || nextRole === ROLE.Owner)) return

    try {
      await setDoc(
        doc(db, 'businesses', business.id, 'members', member.uid),
        { uid: member.uid, email: member.email, role: nextRole },
        { merge: true }
      )

      await setDoc(
        doc(db, 'users', member.uid),
        { businesses: { [business.id]: nextRole } },
        { merge: true }
      )

      if (role === ROLE.Owner && nextRole === ROLE.Owner) {
        await updateDoc(doc(db, 'businesses', business.id), { ownerId: member.uid })
      }

      await refreshMembers()
    } catch (err) {
      console.error(err)
      setError('No se pudo actualizar el rol. Intenta nuevamente.')
    }
  }

  const handleRemove = async (member: BusinessMember) => {
    if (!business?.id) return
    if (!canEditMember(role, member)) return
    if (member.uid === user?.uid) return

    try {
      await deleteDoc(doc(db, 'businesses', business.id, 'members', member.uid))
      await updateDoc(doc(db, 'users', member.uid), {
        [`businesses.${business.id}`]: deleteField(),
      })

      await refreshMembers()
    } catch (err) {
      console.error(err)
      setError('No se pudo quitar el acceso. Intenta más tarde.')
    }
  }

  // === UI ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-600">Administra el equipo de {business?.name}</p>
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="mr-2 h-4 w-4" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleInvite}>
              <div>
                <Label htmlFor="email">Email de Gmail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@gmail.com"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Solo se permiten cuentas de Gmail para la autenticación</p>
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(r)}
                          <div>
                            <p>{ROLE_LABELS[r]}</p>
                            <p className="text-xs text-gray-500">{ROLE_HINTS[r]}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={busy || !inviteEmail.includes(GMAIL_DOMAIN)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {busy ? 'Enviando…' : 'Enviar Invitación'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats por rol */}
      <div className="grid grid-cols-3 gap-5 md:grid-cols-5">
        {[ROLE.Owner, ROLE.Admin, ROLE.Manager, ROLE.Staff, ROLE.Guest].map((r) => {
          const count = members.filter((m) => m.role === r).length
          return (
            <Card key={r}>
              <CardContent className="p-4 text-center">
                <div className="mb-2 flex items-center justify-center">{getRoleIcon(r)}</div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-gray-600">{ROLE_LABELS[r]}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabla de miembros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Miembros del Equipo ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Agregado</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const displayName = (member as any).name || member.email.split('@')[0]
                const added = tsToDate((member as any).addedAt)
                const lastActive = tsToDate((member as any).lastActive)

                return (
                  <TableRow key={member.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            (member as any).photoURL ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7B1FA2&color=fff`
                          }
                          alt={displayName}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={getRoleBadgeClass(member.role)}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {ROLE_LABELS[member.role]}
                        </span>
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {added ? added.toLocaleDateString() : '—'}
                      </div>
                    </TableCell>

                    <TableCell>
                      {lastActive ? (
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {lastActive.toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <XCircle className="h-3 w-3" />
                          Pendiente
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {lastActive ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Invitado</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEditMember(role, member) ? (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleChangeRole(member, v as Role)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder={ROLE_LABELS[member.role]} />
                              </SelectTrigger>
                              <SelectContent>
                                {/* opción actual primero */}
                                <SelectItem value={member.role}>{ROLE_LABELS[member.role]}</SelectItem>
                                {getAssignableRoles(role)
                                  .filter((r) => r !== member.role)
                                  .map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {ROLE_LABELS[r]}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            {member.uid !== user?.uid ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemove(member)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">Tú</Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin acciones</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredMembers.length === 0 && !membersLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No hay miembros que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {membersLoading && (
            <p className="mt-3 text-xs text-muted-foreground">Actualizando…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
