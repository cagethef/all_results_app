import { doc, setDoc, getDoc, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface FirestoreUser {
  email: string
  name: string
  picture: string
  role: string | null
  createdAt: unknown
  lastLogin: unknown
}

export async function upsertUser(user: { email: string; name: string; picture: string }): Promise<string | null> {
  const ref = doc(db, 'users', user.email)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { name: user.name, picture: user.picture, lastLogin: serverTimestamp() })
    return (snap.data().role as string) ?? null
  } else {
    // Check if this email has a pre-assigned role
    const emailRolesSnap = await getDoc(doc(db, 'settings', 'emailRoles'))
    const preAssigned = (emailRolesSnap.data()?.[user.email] as string | undefined) ?? 'user'
    await setDoc(ref, { ...user, role: preAssigned, createdAt: serverTimestamp(), lastLogin: serverTimestamp() })
    return preAssigned
  }
}


export async function getAllUsers(): Promise<FirestoreUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => d.data() as FirestoreUser)
}

export async function updateUserRole(email: string, role: string): Promise<void> {
  await updateDoc(doc(db, 'users', email), { role })
}

