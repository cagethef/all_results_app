import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { upsertUser } from '@/lib/userService'
import { fetchRolePermissions, seedRolesIfNeeded } from '@/lib/roleService'
import type { RolePermissions } from '@/types'

export const ALLOWED_DOMAIN = 'tractian.com'
const STORAGE_KEY = 'auth_user_v3'

export interface AuthUser {
  email: string
  name: string
  picture: string
  role: string | null
  permissions: RolePermissions | null
}

interface AuthContextValue {
  user: AuthUser | null
  role: string | null
  permissions: RolePermissions | null
  signOut: () => void
  setUser: (user: Omit<AuthUser, 'role' | 'permissions'>) => void
  denied: boolean
  setDenied: (v: boolean) => void
  roleLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [denied, setDenied] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)

  // Listen to user doc in Firestore — reflects role changes in real time
  useEffect(() => {
    if (!user) return
    setRoleLoading(true)
    const unsub = onSnapshot(doc(db, 'users', user.email), async snap => {
      try {
        const role = (snap.data()?.role as string | undefined) ?? null
        const permissions = role ? await fetchRolePermissions(role) : null
        setUserState(prev => {
          if (!prev) return prev
          const updated = { ...prev, role, permissions }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch { /* mantém estado atual em caso de erro */ }
      finally { setRoleLoading(false) }
    })
    return unsub
  }, [user?.email]) // eslint-disable-line react-hooks/exhaustive-deps

  const setUser = async (u: Omit<AuthUser, 'role' | 'permissions'>) => {
    setRoleLoading(true)
    try {
      await seedRolesIfNeeded()
      const role = await upsertUser(u)
      const permissions = role ? await fetchRolePermissions(role) : null
      const full: AuthUser = { ...u, role, permissions }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      setUserState(full)
      setDenied(false)
    } catch {
      const full: AuthUser = { ...u, role: null, permissions: null }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      setUserState(full)
      setDenied(false)
    } finally {
      setRoleLoading(false)
    }
  }

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUserState(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role ?? null,
      permissions: user?.permissions ?? null,
      signOut, setUser, denied, setDenied, roleLoading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
