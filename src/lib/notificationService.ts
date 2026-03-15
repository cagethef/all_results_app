import {
  collection, doc, addDoc, updateDoc,
  query, where, onSnapshot, limit,
  arrayUnion, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { AppNotification, NotificationType, RolePermissions } from '@/types'

const COL = 'notifications'

function toNotification(d: { id: string; data: () => Record<string, unknown> }): AppNotification {
  const data = d.data()
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : (data.createdAt as string) ?? new Date().toISOString()
  return { ...data, id: d.id, createdAt } as AppNotification
}

export async function createNotification(data: {
  type: NotificationType
  title: string
  body: string
  toEmail?: string
  toPermission?: string
  jigId?: string
  jigName?: string
}): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await addDoc(collection(db, COL), {
    ...clean,
    readBy: [],
    createdAt: serverTimestamp(),
  })
}

export async function markAsRead(notificationId: string, userEmail: string): Promise<void> {
  await updateDoc(doc(db, COL, notificationId), { readBy: arrayUnion(userEmail) })
}

export async function markAllAsRead(notificationIds: string[], userEmail: string): Promise<void> {
  await Promise.all(notificationIds.map(id => markAsRead(id, userEmail)))
}

export function listenToNotifications(
  userEmail: string,
  permissions: RolePermissions,
  callback: (notifications: AppNotification[]) => void,
): () => void {
  const personal  = new Map<string, AppNotification>()
  const broadcast = new Map<string, AppNotification>()

  const emit = () => {
    const all = [...personal.values(), ...broadcast.values()]
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    callback(all)
  }

  // Listener 1: personal notifications (toEmail == me)
  const q1 = query(collection(db, COL), where('toEmail', '==', userEmail), limit(50))
  const unsub1 = onSnapshot(q1, snap => {
    personal.clear()
    snap.docs.forEach(d => personal.set(d.id, toNotification(d)))
    emit()
  })

  // Listener 2: permission-based broadcast notifications
  const activePerms = (Object.entries(permissions) as [string, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k)

  let unsub2: () => void = () => {}
  if (activePerms.length > 0) {
    const q2 = query(collection(db, COL), where('toPermission', 'in', activePerms), limit(50))
    unsub2 = onSnapshot(q2, snap => {
      broadcast.clear()
      snap.docs.forEach(d => broadcast.set(d.id, toNotification(d)))
      emit()
    })
  }

  return () => { unsub1(); unsub2() }
}
