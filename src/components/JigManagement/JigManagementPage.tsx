import { useState, useEffect, useCallback } from 'react'
import { Wrench, History, Settings, RefreshCw } from 'lucide-react'
import { StatusTab } from './tabs/StatusTab'
import { HistoryTab } from './tabs/HistoryTab'
import { SettingsTab } from './tabs/SettingsTab'
import { getJigs, getJigLogs, seedJigsIfNeeded, autoTransitionScheduled } from '@/lib/jigService'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/types'
import type { Jig, JigLog, RolePermissions } from '@/types'

type Tab = 'status' | 'history' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ElementType; permission: keyof RolePermissions }[] = [
  { id: 'status',   label: 'Status',        icon: Wrench,   permission: 'view_jig_management' },
  { id: 'history',  label: 'Histórico',     icon: History,  permission: 'view_jig_management' },
  { id: 'settings', label: 'Configurações', icon: Settings, permission: 'manage_users'        },
]

export function JigManagementPage() {
  const { user, permissions }   = useAuth()
  const [activeTab, setActiveTab]   = useState<Tab>('status')
  const [historyJig, setHistoryJig] = useState<string | undefined>(undefined)

  const visibleTabs = TABS.filter(t => hasPermission(permissions, t.permission))

  const goToHistory = (jigName: string) => {
    if (!hasPermission(permissions, 'view_jig_management')) return
    setHistoryJig(jigName)
    setActiveTab('history')
  }
  const [jigs, setJigs]           = useState<Jig[]>([])
  const [logs, setLogs]           = useState<JigLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await seedJigsIfNeeded()
      const [jigsData, logsData] = await Promise.all([getJigs(), getJigLogs()])

      // Auto-transition scheduled jigs whose time has arrived
      const anyTransitioned = await autoTransitionScheduled(
        jigsData, logsData, user?.email ?? 'system',
      )
      const finalJigs = anyTransitioned ? await getJigs() : jigsData

      setJigs(finalJigs.sort((a, b) => a.name.localeCompare(b.name)))
      setLogs(logsData)
    } catch {
      setError('Não foi possível carregar as jigas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Check every minute if any scheduled jig has reached its time
  useEffect(() => {
    const interval = setInterval(async () => {
      const [jigsData, logsData] = await Promise.all([getJigs(), getJigLogs()])
      const anyTransitioned = await autoTransitionScheduled(jigsData, logsData, user?.email ?? 'system')
      if (anyTransitioned) {
        // Refresh jigs directly — avoid calling load() which would run autoTransitionScheduled again
        const refreshed = await getJigs()
        setJigs(refreshed.sort((a, b) => a.name.localeCompare(b.name)))
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [user?.email])

  const currentUser = {
    email:   user?.email   ?? '',
    name:    user?.name    ?? '',
    picture: user?.picture ?? undefined,
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Card with tabs */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <RefreshCw size={22} className="animate-spin text-orange-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando jigas...</p>
          </div>
        ) : (
          <>
            {activeTab === 'status' && (
              <StatusTab
                jigs={jigs}
                logs={logs}
                onRefresh={load}
                onViewHistory={goToHistory}
                permissions={permissions}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab logs={logs} initialJig={historyJig} />
            )}
            {activeTab === 'settings' && <SettingsTab jigs={jigs} onRefresh={load} />}
          </>
        )}
      </div>
    </div>
  )
}
