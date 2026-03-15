import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Lock, ChevronDown, ChevronUp, Save, Trash2, X, Palette } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGlobalToast } from '@/contexts/ToastContext'
import { getRoles, updateRolePermissions, updateRoleColor, updateRoleName, createRole, deleteRole } from '@/lib/roleService'
import { hasPermission, PERMISSION_LABELS, PERMISSION_GROUPS } from '@/types'
import type { Role, RolePermissions } from '@/types'

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value)

  const handleHex = (raw: string) => {
    setHex(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  const handleWheel = (v: string) => {
    setHex(v)
    onChange(v)
  }

  // Keep hex in sync if parent changes value
  if (hex !== value && /^#[0-9a-fA-F]{6}$/.test(value) && hex === value.slice(0, hex.length)) {
    // typing in progress — don't override
  }

  return (
    <div className="flex items-center gap-2">
      {/* Color wheel */}
      <label className="relative w-9 h-9 rounded-lg overflow-hidden cursor-pointer border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 hover:scale-110 transition-transform"
        style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#6b7280' }}
        title="Escolher cor"
      >
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#6b7280'}
          onChange={e => handleWheel(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>

      {/* Hex input */}
      <input
        type="text"
        value={hex}
        onChange={e => handleHex(e.target.value)}
        placeholder="#3b82f6"
        maxLength={7}
        spellCheck={false}
        className="w-28 px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {/* Preview badge */}
      {/^#[0-9a-fA-F]{6}$/.test(hex) && (
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${hex}22`, color: hex, border: `1px solid ${hex}44` }}
        >
          Preview
        </span>
      )}
    </div>
  )
}

// ─── New role modal ───────────────────────────────────────────────────────────

function NewRoleModal({
  myPermissions,
  onClose,
  onCreated,
  userEmail,
}: {
  myPermissions: RolePermissions | null
  onClose: () => void
  onCreated: () => void
  userEmail: string
}) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState('#6366f1')
  const [perms, setPerms] = useState<RolePermissions>({
    view_results: false, view_dashboard: false, view_debugging: false,
    view_jig_management: false, open_maintenance: false, close_maintenance: false,
    approve_schedule: false, manage_users: false, manage_roles: false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const toggle = (key: keyof RolePermissions) => {
    if (!perms[key] && !hasPermission(myPermissions, key)) return
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createRole({ name: name.trim(), color, permissions: perms }, userEmail)
      onCreated()
    } catch {
      setError('Erro ao criar cargo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#141414] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#141414] z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Novo Cargo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome do cargo <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Técnico de Produção"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Cor do cargo
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Permissions */}
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.keys.map(key => {
                  const iAllowed = hasPermission(myPermissions, key)
                  return (
                    <label key={key} className={`flex items-center gap-3 cursor-pointer ${!iAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        checked={perms[key]}
                        onChange={() => toggle(key)}
                        disabled={!iAllowed}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{PERMISSION_LABELS[key]}</span>
                      {!iAllowed && <Lock size={11} className="text-gray-400" />}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim() || saving}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <RefreshCw size={13} className="animate-spin" />}
              Criar Cargo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Role row ─────────────────────────────────────────────────────────────────

function RoleRow({
  role,
  myPermissions,
  canManage,
  onSaved,
  onDeleted,
}: {
  role: Role
  myPermissions: RolePermissions | null
  canManage: boolean
  onSaved: () => void
  onDeleted: () => void
}) {
  const { success: toastSuccess, error: toastError } = useGlobalToast()
  const [expanded,  setExpanded]  = useState(false)
  const [perms,     setPerms]     = useState<RolePermissions>({ ...role.permissions })
  const [color,     setColor]     = useState(role.color ?? '#6b7280')
  const [name,      setName]      = useState(role.name)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  const dirtyPerms  = JSON.stringify(perms) !== JSON.stringify(role.permissions)
  const dirtyColor  = color !== (role.color ?? '#6b7280')
  const dirtyName   = name.trim() !== role.name
  const dirty       = dirtyPerms || dirtyColor || dirtyName

  const toggle = (key: keyof RolePermissions) => {
    if (!canManage || role.isSystem) return
    if (!perms[key] && !hasPermission(myPermissions, key)) return
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (dirtyPerms) await updateRolePermissions(role.id, perms)
      if (dirtyColor) await updateRoleColor(role.id, color)
      if (dirtyName && name.trim()) await updateRoleName(role.id, name.trim())
      toastSuccess('Cargo salvo com sucesso!')
      onSaved()
    } catch {
      toastError('Erro ao salvar cargo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Deletar o cargo "${role.name}"? Usuários com esse cargo ficarão sem acesso.`)) return
    setDeleting(true)
    try {
      await deleteRole(role.id)
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  const enabledCount = Object.values(role.permissions).filter(Boolean).length

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
      >
        {/* Color dot */}
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color ?? '#6b7280' }} />

        <div className="flex-1 flex items-center gap-3">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{role.name}</span>
          {role.isSystem && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <Lock size={9} /> Sistema
            </span>
          )}
        </div>

        {/* Badge preview */}
        {role.color === 'rainbow'
          ? <span className="badge-master px-2.5 py-0.5 rounded-full text-xs font-semibold hidden sm:inline">{role.name}</span>
          : <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold hidden sm:inline"
              style={{ backgroundColor: `${role.color ?? '#6b7280'}22`, color: role.color ?? '#6b7280', border: `1px solid ${role.color ?? '#6b7280'}44` }}
            >{role.name}</span>
        }

        <span className="text-xs text-gray-400 dark:text-gray-500">{enabledCount} perm.</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50/50 dark:bg-[#111] space-y-5">

          {/* Name */}
          {canManage && !role.isSystem && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">Nome do cargo</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Color picker — editable only for non-system roles */}
          {(canManage && !role.isSystem) && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2 flex items-center gap-1.5">
                <Palette size={11} /> Cor do cargo
              </p>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          )}

          {/* Permissions */}
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">{group.label}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {group.keys.map(key => {
                  const checked  = perms[key]
                  const iAllowed = hasPermission(myPermissions, key)
                  const editable = canManage && !role.isSystem && iAllowed

                  return (
                    <label key={key} className={`flex items-center gap-2.5 ${editable ? 'cursor-pointer' : 'cursor-default'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        disabled={!editable}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 disabled:opacity-60"
                      />
                      <span className={`text-sm ${checked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                        {PERMISSION_LABELS[key]}
                      </span>
                      {!iAllowed && canManage && !role.isSystem && (
                        <Lock size={10} className="text-gray-400 flex-shrink-0" aria-label="Você não possui essa permissão" />
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Footer actions */}
          {canManage && !role.isSystem && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {deleting ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Deletar cargo
              </button>
              {dirty && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                  Salvar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RolesConfigPage() {
  const { user, permissions } = useAuth()
  const [roles,   setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const canManage = hasPermission(permissions, 'manage_roles')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRoles()
      data.sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setRoles(data)
    } catch {
      setError('Erro ao carregar cargos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="px-6 py-6 space-y-4">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {!loading && `${roles.length} cargo${roles.length !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                <Plus size={12} /> Novo Cargo
              </button>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="p-5 space-y-2">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando cargos...</p>
            </div>
          ) : (
            roles.map(role => (
              <RoleRow
                key={role.id}
                role={role}
                myPermissions={permissions}
                canManage={canManage}
                onSaved={load}
                onDeleted={load}
              />
            ))
          )}
        </div>

        {!canManage && !loading && (
          <p className="px-6 pb-4 text-xs text-gray-400 dark:text-gray-600 text-center">
            Apenas <span className="font-semibold text-emerald-600 dark:text-emerald-400">Master</span> pode criar ou editar cargos.
          </p>
        )}
      </div>

      {showNew && user && (
        <NewRoleModal
          myPermissions={permissions}
          userEmail={user.email}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}
