export const ROLE = {
  Owner: 'owner',
  Admin: 'admin',
  Manager: 'manager',
  Staff: 'staff',
  Guest: 'guest',
} as const

export type Role = (typeof ROLE)[keyof typeof ROLE]

export const ROLE_LABELS: Record<Role, string> = {
  [ROLE.Owner]: 'Propietario',
  [ROLE.Admin]: 'Administrador',
  [ROLE.Manager]: 'Gerente',
  [ROLE.Staff]: 'Empleado',
  [ROLE.Guest]: 'Colaborador',
}

export const PRIVILEGED_ROLES: Role[] = [ROLE.Owner, ROLE.Admin]
export const MANAGEMENT_ROLES: Role[] = [ROLE.Owner, ROLE.Admin, ROLE.Manager]
