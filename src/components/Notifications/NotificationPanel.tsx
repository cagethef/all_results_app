import { useRef, useEffect } from 'react'
import { Bell, Calendar, Wrench, Shield, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification, NotificationType } from '@/types'

function typeConfig(type: NotificationType) {
  switch (type) {
    case 'role_changed':
      return { icon: Shield,   color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' }
    case 'schedule_pending':
      return { icon: Calendar, color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' }
    case 'schedule_approved':
      return { icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
    case 'schedule_rejected':
    case 'schedule_cancelled':
      return { icon: Calendar, color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' }
    case 'maintenance_completed':
      return { icon: Wrench,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
  }
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'agora'
  if (mins < 60)  return `${mins}min`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function NotificationItem({
  n,
  userEmail,
  onRead,
}: {
  n: AppNotification
  userEmail: string
  onRead: (id: string) => void
}) {
  const isUnread = !n.readBy.includes(userEmail)
  const config   = typeConfig(n.type)
  const Icon     = config.icon

  return (
    <button
      onClick={() => isUnread && onRead(n.id)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#222] transition-colors ${
        isUnread ? 'bg-blue-50/40 dark:bg-blue-900/5' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
        <Icon size={14} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug truncate ${
          isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'
        }`}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{relativeTime(n.createdAt)}</p>
      </div>
      {isUnread && <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />}
    </button>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const userEmail = user?.email ?? ''
  const unread = notifications.filter(n => !n.readBy.includes(userEmail))

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <CheckCheck size={12} />
            Marcar tudo como lido
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
        {unread.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Bell size={20} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-600">Nenhuma notificação</p>
          </div>
        ) : (
          unread.map(n => (
            <NotificationItem
              key={n.id}
              n={n}
              userEmail={userEmail}
              onRead={markRead}
            />
          ))
        )}
      </div>
    </div>
  )
}
