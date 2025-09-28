import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import type { UserProfile } from '../types'

export type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub: Unsubscribe | null = null

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        if (profileUnsub) {
          profileUnsub()
          profileUnsub = null
        }

        if (!firebaseUser) {
          setProfile(null)
          setLoading(false)
          return
        }

        const userRef = doc(db, 'users', firebaseUser.uid)
        const snapshot = await getDoc(userRef)

        if (!snapshot.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name: firebaseUser.displayName ?? null,
            photoURL: firebaseUser.photoURL ?? null,
            businesses: {},
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          })
        } else {
          await setDoc(
            userRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              name: firebaseUser.displayName ?? null,
              photoURL: firebaseUser.photoURL ?? null,
              lastLogin: serverTimestamp(),
            },
            { merge: true },
          )
        }

        profileUnsub = onSnapshot(userRef, (snap) => {
          const data = snap.data() as UserProfile | undefined
          setProfile(
            data
              ? {
                  ...data,
                  businesses: data.businesses ?? {},
                }
              : null,
          )
          setLoading(false)
        })
      } catch (error) {
        console.error('AuthProvider error', error)
        setProfile(null)
        setLoading(false)
      } finally {
      }
    })

    return () => {
      unsub()
      if (profileUnsub) profileUnsub()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading }),
    [loading, profile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
