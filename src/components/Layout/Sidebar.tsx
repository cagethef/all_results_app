import { Search, BarChart3, Moon, Sun, ChevronRight, ChevronLeft, Bug, ShieldCheck, ClipboardList } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { hasAccess, type UserRole } from '@/lib/userService'

const navItems = [
  { path: '/results',   label: 'Consultar Dispositivos', icon: Search,    minRole: 'quality_inspector' as UserRole },
  { path: '/dashboard', label: 'Dashboard',               icon: BarChart3, minRole: 'quality_inspector' as UserRole },
  { path: '/debugging', label: 'Debugging',               icon: Bug,       minRole: 'quality_inspector_debug' as UserRole },
]

const adminItems = [
  { path: '/admin/roles',       label: 'Roles',        icon: ShieldCheck,   minRole: 'admin' as UserRole },
  { path: '/admin/wo-template', label: 'Modelo de WO', icon: ClipboardList, minRole: 'admin' as UserRole },
]

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

function NavItem({ path, label, icon: Icon, expanded }: { path: string; label: string; icon: React.ElementType; expanded: boolean }) {
  return (
    <NavLink
      to={path}
      title={!expanded ? label : undefined}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 py-2 rounded-lg transition-colors ${expanded ? 'px-3' : 'justify-center'} ${
          isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white'
        }`
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      {expanded && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
    </NavLink>
  )
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { role } = useAuth()

  const visibleNavItems = navItems.filter(item => hasAccess(role, item.minRole))
  const visibleAdminItems = adminItems.filter(item => hasAccess(role, item.minRole))

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${expanded ? 'w-60' : 'w-16'} bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-all duration-200 overflow-hidden`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${expanded ? 'px-4' : 'justify-center'}`}>
        <img src="/assets/logo.png" alt="Logo" className="w-9 h-9 object-contain flex-shrink-0" />
        {expanded && (
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">All Results</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Sistema de testes</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map(item => (
          <NavItem key={item.path} {...item} expanded={expanded} />
        ))}

        {/* Admin section */}
        {visibleAdminItems.length > 0 && (
          <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-800">
            {expanded && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                Gerenciamento
              </p>
            )}
            <div className="space-y-1">
              {visibleAdminItems.map(item => (
                <NavItem key={item.path} {...item} expanded={expanded} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1 flex-shrink-0">
        <button
          onClick={toggleTheme}
          title={!expanded ? (theme === 'light' ? 'Modo Escuro' : 'Modo Claro') : undefined}
          className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors ${expanded ? 'px-3' : 'justify-center'}`}
        >
          {theme === 'light'
            ? <Moon size={20} className="flex-shrink-0" />
            : <Sun size={20} className="flex-shrink-0" />
          }
          {expanded && (
            <span className="text-sm font-medium whitespace-nowrap">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          )}
        </button>

        {expanded && (
          <p className="px-3 py-1 text-xs text-gray-400 dark:text-gray-600">v0.2.0</p>
        )}

        <button
          onClick={onToggle}
          title={expanded ? 'Recolher' : 'Expandir'}
          className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </aside>
  )
}
