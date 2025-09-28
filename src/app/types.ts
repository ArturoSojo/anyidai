import type { Timestamp } from 'firebase/firestore'
import type { Role } from './roles'

export type UserProfile = {
  uid: string
  email: string
  name: string | null
  photoURL: string | null
  businesses: Record<string, Role>
  createdAt?: Timestamp
  lastLogin?: Timestamp
}

export type BusinessSettings = {
  currency: string
  timezone: string
}

export type Business = {
  id: string
  name: string
  ownerId: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  settings?: BusinessSettings
}

export type BusinessMember = {
  uid: string
  email: string
  role: Role
  addedAt?: Timestamp
}
