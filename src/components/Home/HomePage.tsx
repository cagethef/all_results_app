import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CheckCircle2, Wrench, CalendarClock, X, Check, RefreshCw,
  Search, BarChart3, Bug, ShieldCheck, Users, AlertCircle,
  Sparkles, Zap, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/types'
import type { Jig, JigLog } from '@/types'
import { getJigs, getJigLogs, approveSchedule, rejectSchedule } from '@/lib/jigService'
import { fmtDate } from '@/lib/dateUtils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 2)   return 'agora'
  if (mins < 60)  return `${mins}min`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function activityMeta(log: JigLog): { Icon: React.ElementType; iconCls: string; title: string; by: string } {
  const isScheduled = log.type === 'scheduled_change'
  if (isScheduled) {
    if (log.approvalStatus === 'pending')
      return { Icon: CalendarClock, iconCls: 'text-blue-500 bg-blue-500/10',      title: `Agendamento criado — ${log.jigName}`,    by: log.openedByName }
    if (log.approvalStatus === 'approved')
      return { Icon: Check,         iconCls: 'text-emerald-500 bg-emerald-500/10', title: `Agendamento aprovado — ${log.jigName}`,  by: log.authorizedByName ?? '—' }
    return   { Icon: X,             iconCls: 'text-red-500 bg-red-500/10',         title: `Agendamento cancelado — ${log.jigName}`, by: log.cancelledByName ?? log.rejectedBy ?? '—' }
  }
  if (log.status === 'open')
    return { Icon: Wrench,       iconCls: 'text-amber-500 bg-amber-500/10',     title: `Manutenção aberta — ${log.jigName}`,    by: log.openedByName }
  if (log.status === 'completed')
    return { Icon: CheckCircle2, iconCls: 'text-emerald-500 bg-emerald-500/10', title: `Manutenção concluída — ${log.jigName}`, by: log.closedByName ?? '—' }
  return   { Icon: X,           iconCls: 'text-red-500 bg-red-500/10',          title: `Manutenção cancelada — ${log.jigName}`, by: log.openedByName }
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { permission: 'view_results'        as const, path: '/results',        label: 'Consultar Dispositivos', icon: Search,      color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  { permission: 'view_dashboard'      as const, path: '/dashboard',      label: 'Dashboard',              icon: BarChart3,   color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { permission: 'view_jig_management' as const, path: '/jig-management', label: 'Gestão de Jigas',        icon: Wrench,      color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { permission: 'view_debugging'      as const, path: '/debugging',      label: 'Debugging',              icon: Bug,         color: 'text-amber-500',  bg: 'bg-amber-500/10'  },
  { permission: 'manage_roles'        as const, path: '/admin/roles',    label: 'Cargos',                 icon: ShieldCheck, color: 'text-teal-500',   bg: 'bg-teal-500/10'   },
  { permission: 'manage_users'        as const, path: '/admin/users',    label: 'Usuários',               icon: Users,       color: 'text-rose-500',   bg: 'bg-rose-500/10'   },
]

// ─── Changelog ────────────────────────────────────────────────────────────────

type ChangeKind = 'feature' | 'improvement' | 'fix'

const CHANGELOG: { version: string; date: string; kind: ChangeKind; text: string }[] = [
  { version: 'v0.7.0', date: 'Mar 2025', kind: 'feature',     text: 'Página inicial com acesso rápido e atividade recente' },
  { version: 'v0.7.0', date: 'Mar 2025', kind: 'feature',     text: 'Integração com Slack — @mention em manutenções' },
  { version: 'v0.6.0', date: 'Mar 2025', kind: 'feature',     text: 'Gestão de jigas com agendamento e aprovação' },
  { version: 'v0.6.0', date: 'Mar 2025', kind: 'feature',     text: 'Sistema de cargos e permissões configurável' },
  { version: 'v0.5.0', date: 'Mar 2025', kind: 'feature',     text: 'Login via Google' },
  { version: 'v0.5.0', date: 'Mar 2025', kind: 'feature',     text: 'Criação de Work Order pelo app' },
  { version: 'v0.4.0', date: 'Mar 2025', kind: 'feature',     text: 'Aba de Debugging' },
  { version: 'v0.4.0', date: 'Mar 2025', kind: 'improvement', text: 'Som ao bipar dispositivo reprovado' },
  { version: 'v0.4.0', date: 'Mar 2025', kind: 'improvement', text: 'Ajuste nas queries de dispositivos individuais' },
]

const KIND_META: Record<ChangeKind, { Icon: React.ElementType; cls: string }> = {
  feature:     { Icon: Sparkles, cls: 'text-violet-500 bg-violet-500/10' },
  improvement: { Icon: Zap,      cls: 'text-blue-500 bg-blue-500/10'    },
  fix:         { Icon: Bug,      cls: 'text-amber-500 bg-amber-500/10'  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800/80">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}

function SkeletonRows({ count = 4, height = 'h-10' }: { count?: number; height?: string }) {
  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 ${height} animate-pulse`}>
          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
          <div className="h-3.5 rounded bg-gray-100 dark:bg-gray-800 flex-1" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user, permissions } = useAuth()
  const [jigs, setJigs]       = useState<Jig[]>([])
  const [logs, setLogs]       = useState<JigLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [saving, setSaving]   = useState<string | null>(null)

  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(permissions, p)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const [jigsData, logsData] = await Promise.all([getJigs(), getJigLogs(20)])
      setJigs(jigsData.sort((a, b) => a.name.localeCompare(b.name)))
      setLogs(logsData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const counts = {
    available:   jigs.filter(j => j.status === 'available').length,
    maintenance: jigs.filter(j => j.status === 'maintenance').length,
    scheduled:   jigs.filter(j => j.status === 'scheduled').length,
  }

  const pendingLogs     = logs.filter(l => l.type === 'scheduled_change' && l.approvalStatus === 'pending')
  const recentLogs      = logs.slice(0, 6)
  const visibleShortcuts = SHORTCUTS.filter(s => can(s.permission))

  const handleApprove = async (log: JigLog) => {
    if (!user) return
    setSaving(log.id)
    try {
      await approveSchedule(log.id, log.jigId, user.email, user.name, log.openedBy, log.jigName, log.scheduledFor ?? '')
      await load()
    } finally { setSaving(null) }
  }

  const handleReject = async (log: JigLog) => {
    if (!user) return
    setSaving(log.id)
    try {
      await rejectSchedule(log.id, log.jigId, user.email, log.openedBy, log.jigName)
      await load()
    } finally { setSaving(null) }
  }

  const JIG_STATUS = {
    available:   { dot: 'bg-emerald-500', label: 'Disponível', cls: 'text-emerald-600 dark:text-emerald-400' },
    maintenance: { dot: 'bg-amber-500',   label: 'Manutenção', cls: 'text-amber-500 dark:text-amber-400'   },
    scheduled:   { dot: 'bg-blue-500',    label: 'Agendada',   cls: 'text-blue-500 dark:text-blue-400'     },
  }

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Não foi possível carregar os dados.</p>
      <button
        onClick={load}
        className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="px-6 py-5 flex flex-col gap-4 h-full">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Olá, {user?.name?.split(' ')[0]}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats pill */}
        <div className="flex items-center divide-x divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {([
            { label: 'Disponíveis',  value: counts.available,   cls: 'text-emerald-500' },
            { label: 'Manutenção',   value: counts.maintenance, cls: 'text-amber-500'   },
            { label: 'Agendadas',    value: counts.scheduled,   cls: 'text-blue-500'    },
          ] as const).map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5">
              {loading
                ? <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                : <span className={`text-sm font-bold tabular-nums ${s.cls}`}>{s.value}</span>
              }
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending approvals ─────────────────────────────────────────────────── */}
      {!loading && can('approve_schedule') && pendingLogs.length > 0 && (
        <div className="flex-shrink-0 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/5 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {pendingLogs.length} agendamento{pendingLogs.length > 1 ? 's' : ''} aguardando sua aprovação
            </p>
          </div>
          <div className="space-y-1.5">
            {pendingLogs.map(l => (
              <div key={l.id} className="flex items-center gap-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white flex-1 min-w-0 truncate">{l.jigName}</p>
                <p className="text-xs text-gray-400 hidden sm:block">{l.scheduledFor ? fmtDate(l.scheduledFor) : '—'} · {l.openedByName}</p>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(l)}
                    disabled={saving === l.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  >
                    {saving === l.id ? <RefreshCw size={10} className="animate-spin" /> : <><Check size={10} />Aprovar</>}
                  </button>
                  <button
                    onClick={() => handleReject(l)}
                    disabled={saving === l.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    <X size={10} />Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3-column grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">

        {/* Col 1: Quick access */}
        <SectionCard title="Acesso rápido">
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {visibleShortcuts.map(s => {
              const Icon = s.icon
              return (
                <NavLink
                  key={s.path}
                  to={s.path}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                    <Icon size={14} className={s.color} />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {s.label}
                  </span>
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                </NavLink>
              )
            })}
          </div>
        </SectionCard>

        {/* Col 2: Jig status + Activity */}
        <div className="flex flex-col gap-4 min-h-0">

          {can('view_jig_management') && (
            <SectionCard title="Status das jigas">
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {loading
                  ? <SkeletonRows count={3} />
                  : jigs.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">Nenhuma jiga.</p>
                    : jigs.map(j => {
                        const st = JIG_STATUS[j.status]
                        return (
                          <div key={j.id} className="flex items-center gap-3 px-4 py-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{j.name}</span>
                            <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                          </div>
                        )
                      })
                }
              </div>
            </SectionCard>
          )}

          <SectionCard title="Atividade recente">
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {loading
                ? <SkeletonRows count={4} height="h-[52px]" />
                : recentLogs.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Sem atividade recente.</p>
                  : recentLogs.map(l => {
                      const { Icon, iconCls, title, by } = activityMeta(l)
                      const ts = l.closedAt ?? l.authorizedAt ?? l.openedAt
                      return (
                        <div key={l.id} className="flex items-start gap-3 px-4 py-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconCls}`}>
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{by}</p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap tabular-nums pt-0.5">
                            {ts ? relativeTime(ts) : ''}
                          </span>
                        </div>
                      )
                    })
              }
            </div>
          </SectionCard>
        </div>

        {/* Col 3: Changelog */}
        <SectionCard title="Novidades do app">
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {CHANGELOG.map((entry, i) => {
              const { Icon, cls } = KIND_META[entry.kind]
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cls}`}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{entry.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{entry.version} · {entry.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
