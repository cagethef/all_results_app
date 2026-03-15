import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { listenToNotifications, markAsRead, markAllAsRead } from '@/lib/notificationService'
import { useAuth } from './AuthContext'
import type { AppNotification } from '@/types'

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, permissions } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!user || !permissions) { setNotifications([]); return }
    const unsub = listenToNotifications(user.email, permissions, setNotifications)
    return unsub
  }, [user?.email, permissions]) // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter(n => !n.readBy.includes(user?.email ?? '')).length

  const markRead = useCallback((id: string) => {
    if (!user) return
    markAsRead(id, user.email).catch(() => {})
  }, [user])

  const markAllRead = useCallback(() => {
    if (!user) return
    const ids = notifications
      .filter(n => !n.readBy.includes(user.email))
      .map(n => n.id)
    if (ids.length > 0) markAllAsRead(ids, user.email).catch(() => {})
  }, [user, notifications])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) return { notifications: [], unreadCount: 0, markRead: (_: string) => {}, markAllRead: () => {} }
  return ctx
}
