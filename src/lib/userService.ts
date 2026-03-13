import { doc, setDoc, getDoc, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export type UserRole = 'quality_inspector' | 'quality_inspector_debug' | 'admin' | 'dev'

export const ROLE_LABELS: Record<UserRole, string> = {
  quality_inspector: 'Quality Inspector',
  quality_inspector_debug: 'Quality Inspector Debug',
  admin: 'Admin',
  dev: 'DEV',
}

export interface FirestoreUser {
  email: string
  name: string
  picture: string
  role: UserRole | null
  createdAt: unknown
  lastLogin: unknown
}

export async function upsertUser(user: { email: string; name: string; picture: string }): Promise<UserRole | null> {
  const ref = doc(db, 'users', user.email)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { name: user.name, picture: user.picture, lastLogin: serverTimestamp() })
    return (snap.data().role as UserRole) ?? null
  } else {
    await setDoc(ref, { ...user, role: 'quality_inspector', createdAt: serverTimestamp(), lastLogin: serverTimestamp() })
    return 'quality_inspector'
  }
}

export async function fetchUserRole(email: string): Promise<UserRole | null> {
  const snap = await getDoc(doc(db, 'users', email))
  if (!snap.exists()) return null
  return (snap.data().role as UserRole) ?? null
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => d.data() as FirestoreUser)
}

export async function updateUserRole(email: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', email), { role })
}

// Role hierarchy — higher index = more permissions
const ROLE_ORDER: UserRole[] = ['quality_inspector', 'quality_inspector_debug', 'admin', 'dev']

export function hasAccess(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole)
}
