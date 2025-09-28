import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, deleteField } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useBusiness } from '../../app/providers/BusinessProvider'
import type { Role } from '../../app/roles'
import { ROLE, ROLE_LABELS, PRIVILEGED_ROLES } from '../../app/roles'
import type { BusinessMember } from '../../app/types'
import { useAuth } from '../../app/providers/AuthProvider'

const GMAIL_DOMAIN = '@gmail.com'

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

export default function UserManagementPage() {
  const { business, role, members, membersLoading, refreshMembers } = useBusiness()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>(() => getAssignableRoles(role)[0] ?? ROLE.Manager)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const assignableRoles = useMemo(() => getAssignableRoles(role), [role])

  useEffect(() => {
    if (!assignableRoles.includes(selectedRole)) {
      setSelectedRole(assignableRoles[0] ?? ROLE.Manager)
    }
  }, [assignableRoles, selectedRole])

  if (!PRIVILEGED_ROLES.includes(role)) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        No tienes permiso para gestionar usuarios en este negocio.
      </div>
    )
  }

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email.endsWith(GMAIL_DOMAIN)) {
      setError('Solo se permiten invitaciones a correos de Gmail.')
      return
    }
    setBusy(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const existing = members.find((member) => member.email.toLowerCase() === normalizedEmail)
      if (existing) {
        setError('Este usuario ya es miembro del negocio.')
        setBusy(false)
        return
      }

      const usersRef = collection(db, 'users')
      const snapshot = await getDocs(query(usersRef, where('email', '==', normalizedEmail)))
      if (snapshot.empty) {
        setError('No encontramos una cuenta registrada con ese correo. Pide al usuario que inicie sesión primero.')
        setBusy(false)
        return
      }

      const userDoc = snapshot.docs[0]
      const invitedUid = userDoc.id

      await setDoc(
        doc(db, 'businesses', business.id, 'members', invitedUid),
        {
          uid: invitedUid,
          email: normalizedEmail,
          role: selectedRole,
          addedAt: serverTimestamp(),
        },
        { merge: true },
      )

      await setDoc(
        doc(db, 'users', invitedUid),
        { businesses: { [business.id]: selectedRole } },
        { merge: true },
      )

      setSuccess('Invitación enviada correctamente.')
      setEmail('')
      setSelectedRole(assignableRoles[0] ?? ROLE.Manager)
      await refreshMembers()
    } catch (err) {
      console.error(err)
      setError('No se pudo enviar la invitación. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const handleChangeRole = async (member: BusinessMember, nextRole: Role) => {
    if (member.role === nextRole) return
    if (!canEditMember(role, member)) return
    if (role !== ROLE.Owner && nextRole === ROLE.Admin) return
    if (role !== ROLE.Owner && nextRole === ROLE.Owner) return

    try {
      await setDoc(
        doc(db, 'businesses', business.id, 'members', member.uid),
        {
          uid: member.uid,
          email: member.email,
          role: nextRole,
        },
        { merge: true },
      )

      await setDoc(
        doc(db, 'users', member.uid),
        { businesses: { [business.id]: nextRole } },
        { merge: true },
      )

      if (role === ROLE.Owner && nextRole === ROLE.Owner) {
        await updateDoc(doc(db, 'businesses', business.id), { ownerId: member.uid })
      }

      await refreshMembers()
    } catch (error) {
      console.error(error)
      setError('No se pudo actualizar el rol. Intenta nuevamente.')
    }
  }

  const handleRemove = async (member: BusinessMember) => {
    if (!canEditMember(role, member)) return
    if (member.uid === user?.uid) return

    try {
      await deleteDoc(doc(db, 'businesses', business.id, 'members', member.uid))
      await updateDoc(doc(db, 'users', member.uid), {
        [`businesses.${business.id}`]: deleteField(),
      })
      await refreshMembers()
    } catch (error) {
      console.error(error)
      setError('No se pudo quitar el acceso. Intenta más tarde.')
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Gestión de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Invita colaboradores y asigna roles según sus responsabilidades.
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Invitar colaborador</h2>
        <form onSubmit={handleInvite} className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr,auto] items-center">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@gmail.com"
            className="h-10 rounded-md border px-3"
          />
          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as Role)}
            className="h-10 rounded-md border px-3"
          >
            {assignableRoles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {ROLE_LABELS[roleOption]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? 'Enviando...' : 'Invitar'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
      </section>

      <section className="rounded-lg border">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Miembros</h2>
          {membersLoading && <span className="text-xs text-muted-foreground">Actualizando...</span>}
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.uid} className="border-t">
                  <td className="px-4 py-2">
                    <div className="font-medium">{member.email}</div>
                    <div className="text-xs text-muted-foreground">UID: {member.uid}</div>
                  </td>
                  <td className="px-4 py-2">
                    {canEditMember(role, member) ? (
                      <select
                        value={member.role}
                        onChange={(event) => handleChangeRole(member, event.target.value as Role)}
                        className="h-9 rounded-md border px-2"
                      >
                        <option value={member.role}>{ROLE_LABELS[member.role]}</option>
                        {getAssignableRoles(role)
                          .filter((roleOption) => roleOption !== member.role)
                          .map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {ROLE_LABELS[roleOption]}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span>{ROLE_LABELS[member.role]}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canEditMember(role, member) && member.uid !== user?.uid ? (
                      <button
                        onClick={() => handleRemove(member)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Quitar acceso
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
