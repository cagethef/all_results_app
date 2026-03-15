import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Cpu, Eye, EyeOff, Slack, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { addJig, renameJig, deleteJig } from '@/lib/jigService'
import { getSlackSettings, saveSlackSettings, type SlackSettings } from '@/lib/settingsService'
import { postJigCreated, initializeJigThread, testSlackConnection, resetJigThreads } from '@/lib/slackService'
import { useAuth } from '@/contexts/AuthContext'
import { useGlobalToast } from '@/contexts/ToastContext'
import type { Jig } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  available:   'Disponível',
  maintenance: 'Em Manutenção',
  scheduled:   'Agendada',
}
const STATUS_COLOR: Record<string, string> = {
  available:   'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  maintenance: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  scheduled:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
}

interface Props {
  jigs: Jig[]
  onRefresh: () => void
}

// ─── Add jig form ─────────────────────────────────────────────────────────────

function AddJigForm({ onClose, onSuccess, createdBy }: {
  onClose: () => void
  onSuccess: (jigId: string, jigName: string) => void
  createdBy: string
}) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const id = await addJig(name.trim(), createdBy)
      onSuccess(id, name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar jiga.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-5 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
      <Cpu size={15} className="text-blue-400 flex-shrink-0" />
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome da jiga..."
        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-500 whitespace-nowrap">{error}</p>}
      <button type="submit" disabled={!name.trim() || saving}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button type="button" onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
        <X size={13} />
      </button>
    </form>
  )
}

// ─── Jig row ──────────────────────────────────────────────────────────────────

function JigSettingsRow({ jig, onRefresh, updatedBy }: {
  jig: Jig
  onRefresh: () => void
  updatedBy: string
}) {
  const { success: toastSuccess, error: toastError } = useGlobalToast()
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(jig.name)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canDelete = jig.status === 'available'

  const handleRename = async () => {
    if (!name.trim() || name.trim() === jig.name) { setEditing(false); setName(jig.name); return }
    setSaving(true)
    try {
      await renameJig(jig.id, name.trim(), updatedBy)
      toastSuccess('Jiga renomeada.')
      onRefresh()
      setEditing(false)
    } catch {
      toastError('Erro ao renomear jiga.')
      setName(jig.name)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remover a jiga "${jig.name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await deleteJig(jig.id)
      toastSuccess('Jiga removida.')
      onRefresh()
    } catch {
      toastError('Erro ao remover jiga.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#222] flex items-center justify-center flex-shrink-0">
        <Cpu size={15} className="text-gray-500 dark:text-gray-400" />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setName(jig.name) } }}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-[#1a1a1a] border border-blue-400 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{jig.name}</p>
        )}
      </div>

      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[jig.status]}`}>
        {STATUS_LABEL[jig.status]}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <>
            <button onClick={handleRename} disabled={saving}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors">
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button onClick={() => { setEditing(false); setName(jig.name) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} title="Renomear"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={handleDelete} disabled={!canDelete || deleting}
              title={canDelete ? 'Remover jiga' : 'Jiga em uso — não pode ser removida'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              {deleting ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Slack section ────────────────────────────────────────────────────────────

function SlackSection({ jigs, onRefresh }: { jigs: Jig[]; onRefresh: () => void }) {
  const { success: toastSuccess, error: toastError } = useGlobalToast()

  const [settings, setSettings] = useState<SlackSettings>({ enabled: false, botToken: '', channelId: '' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [initAll, setInitAll]   = useState(false)
  const [resetting, setResetting] = useState(false)
  const [initId, setInitId]     = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    getSlackSettings()
      .then(s => { if (s) setSettings(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSlackSettings(settings)
      toastSuccess('Configurações Slack salvas.')
      setTestResult(null)
    } catch {
      toastError('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!settings.botToken || !settings.channelId) return
    setTesting(true)
    setTestResult(null)
    try {
      const channelName = await testSlackConnection(settings.botToken, settings.channelId)
      setTestResult({ ok: true, msg: `Conectado ao canal #${channelName}` })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Erro de conexão' })
    } finally {
      setTesting(false)
    }
  }

  const handleInitThread = async (jig: Jig) => {
    setInitId(jig.id)
    try {
      await initializeJigThread(
        { id: jig.id, name: jig.name, status: jig.status, updatedAt: jig.updatedAt },
        settings.botToken,
        settings.channelId,
      )
      toastSuccess(`Thread criada para ${jig.name}.`)
      onRefresh()
    } catch {
      toastError(`Erro ao criar thread para ${jig.name}.`)
    } finally {
      setInitId(null)
    }
  }

  const handleReset = async () => {
    if (!confirm('Remover todas as threads vinculadas? As jigas ficarão sem thread até serem inicializadas novamente.')) return
    setResetting(true)
    try {
      const count = await resetJigThreads()
      toastSuccess(`${count} thread${count !== 1 ? 's removidas' : ' removida'}. Inicialize no novo canal.`)
      onRefresh()
    } catch {
      toastError('Erro ao resetar threads.')
    } finally {
      setResetting(false)
    }
  }

  const handleInitAll = async () => {
    const pending = jigs.filter(j => !j.slackThreadTs)
    if (pending.length === 0) return
    setInitAll(true)
    try {
      for (const jig of pending) {
        await initializeJigThread(
          { id: jig.id, name: jig.name, status: jig.status, updatedAt: jig.updatedAt },
          settings.botToken,
          settings.channelId,
        )
      }
      toastSuccess(`${pending.length} thread${pending.length > 1 ? 's criadas' : ' criada'}.`)
      onRefresh()
    } catch {
      toastError('Erro ao inicializar threads.')
    } finally {
      setInitAll(false)
    }
  }

  if (loading) return (
    <div className="py-6 flex justify-center">
      <RefreshCw size={16} className="animate-spin text-gray-400" />
    </div>
  )

  const pendingCount = jigs.filter(j => !j.slackThreadTs).length

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Slack size={15} className="text-[#4A154B]" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Slack</p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Bot Token */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Bot Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={settings.botToken}
              onChange={e => setSettings(s => ({ ...s, botToken: e.target.value }))}
              placeholder="xoxb-..."
              className="w-full px-3 py-2 pr-9 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A154B]/40 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Channel ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Canal ID</label>
          <input
            type="text"
            value={settings.channelId}
            onChange={e => setSettings(s => ({ ...s, channelId: e.target.value }))}
            placeholder="C0xxxxxxxx"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A154B]/40 font-mono"
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-600">ID do canal (não o nome). Ex: C0xxxxxxxx</p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            testResult.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {testResult.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {testResult.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#4A154B] hover:bg-[#3d1040] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
            Salvar
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !settings.botToken || !settings.channelId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            {testing ? <RefreshCw size={11} className="animate-spin" /> : <Slack size={11} />}
            Testar conexão
          </button>
        </div>

        {/* Threads section */}
        {settings.enabled && settings.botToken && settings.channelId && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Threads das jigas</p>
              <div className="flex items-center gap-3">
                {pendingCount > 0 && (
                  <button
                    onClick={handleInitAll}
                    disabled={initAll || resetting}
                    className="flex items-center gap-1.5 text-xs text-[#4A154B] dark:text-purple-400 hover:underline disabled:opacity-50"
                  >
                    {initAll ? <RefreshCw size={10} className="animate-spin" /> : <Slack size={10} />}
                    Inicializar todas ({pendingCount})
                  </button>
                )}
                {jigs.some(j => j.slackThreadTs) && (
                  <button
                    onClick={handleReset}
                    disabled={resetting || initAll}
                    className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    {resetting ? <RefreshCw size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                    Resetar threads
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {jigs.map(jig => (
                <div key={jig.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1a1a1a]">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{jig.name}</span>
                  {jig.slackThreadTs
                    ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={10} /> Thread ativa</span>
                    : <button
                        onClick={() => handleInitThread(jig)}
                        disabled={initId === jig.id || initAll}
                        className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                      >
                        {initId === jig.id ? <RefreshCw size={9} className="animate-spin" /> : <Slack size={9} />}
                        Inicializar
                      </button>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export function SettingsTab({ jigs, onRefresh }: Props) {
  const { user } = useAuth()
  const { success: toastSuccess } = useGlobalToast()
  const [adding, setAdding] = useState(false)

  const handleAddSuccess = async (jigId: string, jigName: string) => {
    setAdding(false)
    toastSuccess('Jiga adicionada.')
    postJigCreated(jigId, jigName).catch(() => {}) // no-op if Slack disabled
    onRefresh()
  }

  return (
    <div className="p-5 space-y-4">
      {/* Jigas */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Jigas</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{jigs.length} jiga{jigs.length !== 1 ? 's' : ''} cadastrada{jigs.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>

        {adding && (
          <AddJigForm
            createdBy={user?.email ?? ''}
            onClose={() => setAdding(false)}
            onSuccess={handleAddSuccess}
          />
        )}

        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {jigs.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-600">
              Nenhuma jiga cadastrada.
            </div>
          ) : (
            jigs.map(jig => (
              <JigSettingsRow
                key={jig.id}
                jig={jig}
                onRefresh={onRefresh}
                updatedBy={user?.email ?? ''}
              />
            ))
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-600 px-1">
        Jigas em manutenção ou com agendamento ativo não podem ser removidas.
      </p>

      {/* Slack */}
      <SlackSection jigs={jigs} onRefresh={onRefresh} />
    </div>
  )
}
