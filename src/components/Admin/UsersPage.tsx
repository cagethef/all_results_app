import { useEffect, useRef, useState } from 'react'
import { RefreshCw, MoreVertical, UserCog } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllUsers, updateUserRole, type FirestoreUser } from '@/lib/userService'
import { getRoles } from '@/lib/roleService'
import { createNotification } from '@/lib/notificationService'
import { useGlobalToast } from '@/contexts/ToastContext'
import { hasPermission } from '@/types'
import type { Role } from '@/types'
import { Timestamp } from 'firebase/firestore'

// ─── Badge style from hex color (or rainbow) ─────────────────────────────────

function RoleBadge({ color, name }: { color: string; name: string }) {
  if (color === 'rainbow') {
    return (
      <span className="badge-master inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
        {name}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {name}
    </span>
  )
}

function formatRelative(ts: unknown): string {
  if (!ts) return '—'
  let ms: number
  if (ts instanceof Timestamp) ms = ts.toDate().getTime()
  else if (typeof ts === 'object' && ts !== null && 'seconds' in ts) ms = (ts as { seconds: number }).seconds * 1000
  else if (typeof ts === 'string') ms = new Date(ts).getTime()
  else return '—'

  const diff  = Date.now() - ms
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'há menos de um minuto'
  if (mins < 60)  return `há ${mins} minutos`
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`
  return `há ${days} dia${days > 1 ? 's' : ''}`
}


// ─── Actions menu ─────────────────────────────────────────────────────────────

function ActionsMenu({
  user,
  roles,
  myPermissions,
  onChangeRole,
}: {
  user: FirestoreUser
  roles: Role[]
  myPermissions: ReturnType<typeof useAuth>['permissions']
  onChangeRole: (email: string, roleId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const canEdit = hasPermission(myPermissions, 'manage_users')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowRoles(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!canEdit) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 overflow-hidden">
          {!showRoles ? (
            <button
              onClick={() => setShowRoles(true)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
            >
              <UserCog size={14} />
              Mudar cargo
            </button>
          ) : (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                Selecionar cargo
              </p>
              <div className="max-h-72 overflow-y-auto">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { onChangeRole(user.email, r.id); setOpen(false); setShowRoles(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#222] transition-colors ${
                      user.role === r.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{r.name}</span>
                    {user.role === r.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { permissions } = useAuth()
  const { success: toastSuccess } = useGlobalToast()
  const [users, setUsers]   = useState<FirestoreUser[]>([])
  const [roles, setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)


  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([getAllUsers(), getRoles()])
      setUsers(usersData.sort((a, b) => a.name.localeCompare(b.name)))
      setRoles(rolesData.sort((a, b) => a.name.localeCompare(b.name)))
    } catch {
      setError('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (email: string, roleId: string) => {
    setSaving(email)
    try {
      await updateUserRole(email, roleId)
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role: roleId } : u))
      const roleName = roles.find(r => r.id === roleId)?.name ?? roleId
      toastSuccess(`Cargo atualizado para ${roleName}.`)
      createNotification({
        type:    'role_changed',
        title:   'Seu cargo foi atualizado',
        body:    `Você agora tem o cargo de ${roleName}`,
        toEmail: email,
      }).catch(() => {})
    } catch {
      setError('Erro ao atualizar cargo.')
    } finally {
      setSaving(null)
    }
  }

  const normalizeRoleId = (roleId: string) => roleId === 'dev' ? 'master' : roleId

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return null
    return roles.find(r => r.id === normalizeRoleId(roleId))?.name ?? roleId
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between rounded-t-xl">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {!loading && `${users.length} usuário${users.length !== 1 ? 's' : ''}`}
          </span>
<button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Usuário</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Cargo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">Última Atividade</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {users.map(u => (
                <tr key={u.email} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                  {/* Avatar + Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.name} referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {u.name}
                        {saving === u.email && <RefreshCw size={11} className="inline ml-1.5 animate-spin text-gray-400" />}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{u.email}</td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    {u.role ? (() => {
                      const roleObj = roles.find(r => r.id === normalizeRoleId(u.role!))
                      const color   = roleObj?.color ?? '#6366f1'
                      const name    = getRoleName(u.role) ?? u.role
                      return <RoleBadge color={color} name={name} />
                    })() :
                      <span className="text-xs text-gray-400 italic">Sem cargo</span>
                    }
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                  </td>

                  {/* Last activity */}
                  <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">
                    {formatRelative(u.lastLogin)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <ActionsMenu
                      user={u}
                      roles={roles}
                      myPermissions={permissions}
                      onChangeRole={handleRoleChange}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
