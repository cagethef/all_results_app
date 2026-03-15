import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut, Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationPanel } from '@/components/Notifications/NotificationPanel'

const PAGE_TITLES: Record<string, string> = {
  '/results':           'Consultar Dispositivos',
  '/dashboard':         'Dashboard',
  '/debugging':         'Debugging',
  '/admin/users':       'Usuários',
  '/admin/roles':       'Cargos',
  '/admin/wo-template': 'Modelo de WO',
  '/jig-management':    'Gestão de Jigas',
}

export function TopBar() {
  const { user, signOut }          = useAuth()
  const { unreadCount }            = useNotifications()
  const { pathname }               = useLocation()
  const [userOpen, setUserOpen]    = useState(false)
  const [notifOpen, setNotifOpen]  = useState(false)
  const userRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const title = PAGE_TITLES[pathname] ?? 'Quality Hub'

  return (
    <header className="sticky top-0 z-10 h-12 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User avatar */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary-500 transition-all"
          >
            {user?.picture
              ? <img src={user.picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">{user?.name?.[0]}</div>
            }
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
