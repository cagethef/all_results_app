import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { upsertUser, fetchUserRole, type UserRole } from '@/lib/userService'

export const ALLOWED_DOMAIN = 'tractian.com'
const STORAGE_KEY = 'auth_user_v2'

export interface AuthUser {
  email: string
  name: string
  picture: string
  role: UserRole | null
}

interface AuthContextValue {
  user: AuthUser | null
  role: UserRole | null
  signOut: () => void
  setUser: (user: Omit<AuthUser, 'role'>) => void
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

  // On mount, refresh role from Firestore for cached users
  useEffect(() => {
    if (!user) return
    setRoleLoading(true)
    fetchUserRole(user.email)
      .then(role => {
        setUserState(prev => {
          if (!prev) return prev
          const updated = { ...prev, role }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      })
      .catch(() => {})
      .finally(() => setRoleLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setUser = async (u: Omit<AuthUser, 'role'>) => {
    setRoleLoading(true)
    try {
      const role = await upsertUser(u)
      const full: AuthUser = { ...u, role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      setUserState(full)
      setDenied(false)
    } catch {
      // Firestore error — allow login without role
      const full: AuthUser = { ...u, role: null }
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
    <AuthContext.Provider value={{ user, role: user?.role ?? null, signOut, setUser, denied, setDenied, roleLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
