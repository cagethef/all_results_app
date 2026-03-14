import { useEffect, useState } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllUsers, updateUserRole, ROLE_LABELS, type FirestoreUser, type UserRole } from '@/lib/userService'

const ROLES: UserRole[] = ['quality_inspector', 'quality_inspector_debug', 'admin', 'dev']

const ROLE_COLORS: Record<UserRole, string> = {
  quality_inspector: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  quality_inspector_debug: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  dev: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export function RolesPage() {
  const { role: myRole } = useAuth()
  const canEdit = myRole === 'dev'

  const [users, setUsers] = useState<FirestoreUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUsers()
      data.sort((a, b) => a.email.localeCompare(b.email))
      setUsers(data)
    } catch {
      setError('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (email: string, role: UserRole) => {
    setSaving(email)
    try {
      await updateUserRole(email, role)
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role } : u))
    } catch {
      setError('Erro ao atualizar role.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d]">
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-rose-200 dark:ring-rose-500/30">
            <ShieldCheck className="text-rose-600 dark:text-rose-400" size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Gerenciamento de Roles</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Atribua cargos e permissões aos usuários</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <span key={r} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[r]}`}>
            {ROLE_LABELS[r]}
          </span>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            <RefreshCw size={16} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map(u => (
                <tr key={u.email} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors duration-150">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 ring-2 ring-gray-100 dark:ring-gray-800">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role ?? ''}
                          disabled={saving === u.email}
                          onChange={e => handleRoleChange(u.email, e.target.value as UserRole)}
                          className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                        >
                          <option value="" disabled>Sem role</option>
                          {ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        {saving === u.email && <RefreshCw size={12} className="animate-spin text-gray-400" />}
                      </div>
                    ) : (
                      u.role ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600 italic">Sem role</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          Apenas usuários com role <span className="font-semibold text-emerald-600 dark:text-emerald-400">DEV</span> podem alterar roles.
        </p>
      )}
    </div>
    </div>
  )
}
