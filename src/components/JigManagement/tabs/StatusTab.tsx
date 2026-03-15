import { useState } from 'react'
import { CheckCircle2, Wrench, Calendar, Clock, Cpu, AlertTriangle, Check, X as XIcon } from 'lucide-react'
import { OpenMaintenanceModal } from '../modals/OpenMaintenanceModal'
import { CloseMaintenanceModal } from '../modals/CloseMaintenanceModal'
import { ScheduleModal } from '../modals/ScheduleModal'
import { CancelScheduleModal } from '../modals/CancelScheduleModal'
import { approveSchedule, rejectSchedule } from '@/lib/jigService'
import { hasPermission } from '@/types'
import type { Jig, JigLog, JigStatus, RolePermissions } from '@/types'

interface Props {
  jigs: Jig[]
  logs: JigLog[]
  onRefresh: () => void
  onViewHistory: (jigName: string) => void
  permissions: RolePermissions | null
  currentUser: { email: string; name: string; picture?: string }
}

const STATUS_CONFIG: Record<JigStatus, {
  label: string
  color: string
  bg: string
  dot: string
  icon: React.ElementType
}> = {
  available: {
    label: 'Disponível',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg:    'bg-emerald-50 dark:bg-emerald-500/10',
    dot:   'bg-emerald-500',
    icon:  CheckCircle2,
  },
  maintenance: {
    label: 'Em Manutenção',
    color: 'text-amber-700 dark:text-amber-400',
    bg:    'bg-amber-50 dark:bg-amber-500/10',
    dot:   'bg-amber-500',
    icon:  Wrench,
  },
  scheduled: {
    label: 'Alt. Agendada',
    color: 'text-blue-700 dark:text-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-500/10',
    dot:   'bg-blue-500',
    icon:  Calendar,
  },
}

const URGENCY_COLOR: Record<string, string> = {
  low:      'text-emerald-600 dark:text-emerald-400',
  medium:   'text-yellow-600 dark:text-yellow-400',
  high:     'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
}

const URGENCY_LABEL: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
}

function formatRelative(iso: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `há ${mins}min`
  if (hours < 24) return `há ${hours}h`
  return `há ${days}d`
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d     = new Date(iso)
  const day   = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const h     = d.getHours().toString().padStart(2, '0')
  const m     = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} às ${h}:${m}`
}

function JigRow({
  jig,
  activeLog,
  onOpenMaintenance,
  onCloseMaintenance,
  onSchedule,
  onApprove,
  onCancelPending,
  onCancelApproved,
  onViewHistory,
  canOpenMaintenance,
  canCloseMaintenance,
  canApprove,
  currentUserEmail,
}: {
  jig: Jig
  activeLog?: JigLog
  onOpenMaintenance: (jig: Jig) => void
  onCloseMaintenance: (jig: Jig, log: JigLog) => void
  onSchedule: (jig: Jig) => void
  onApprove: (log: JigLog) => void
  onCancelPending: (log: JigLog) => void
  onCancelApproved: (jig: Jig, log: JigLog) => void
  onViewHistory: (jigName: string) => void
  canOpenMaintenance: boolean
  canCloseMaintenance: boolean
  canApprove: boolean
  currentUserEmail: string
}) {
  // Badge on the right: scheduled jig is still physically available
  const cfg = jig.status === 'scheduled' ? STATUS_CONFIG.available : STATUS_CONFIG[jig.status]

  // Subtitle
  let subtitle: React.ReactNode
  if (jig.status === 'scheduled' && activeLog) {
    if (activeLog.approvalStatus === 'pending') {
      subtitle = (
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          {activeLog.openedByPicture ? (
            <img
              src={activeLog.openedByPicture}
              alt={activeLog.openedByName}
              referrerPolicy="no-referrer"
              className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300">
                {activeLog.openedByName?.[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <p className="text-xs text-amber-500 dark:text-amber-400 truncate">
            {'por '}
            <span className="font-medium">{activeLog.openedByName}</span>
            {' para '}
            <span className="font-medium">{formatDateTime(activeLog.scheduledFor ?? '')}</span>
            {activeLog.symptom ? <> · <span className="opacity-80">{activeLog.symptom}</span></> : null}
            {' — aguardando aprovação'}
          </p>
        </div>
      )
    } else {
      subtitle = (
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 truncate">
          {'Manutenção agendada para '}
          <span className="font-medium">{formatDateTime(activeLog.scheduledFor ?? '')}</span>
          {activeLog.symptom ? <> · <span className="opacity-80">{activeLog.symptom}</span></> : null}
        </p>
      )
    }
  } else if (jig.status === 'maintenance' && activeLog) {
    subtitle = (
      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
        <span className={URGENCY_COLOR[activeLog.urgency]}>
          {URGENCY_LABEL[activeLog.urgency]}
        </span>
        {' · '}
        <span className="truncate">{activeLog.symptom}</span>
      </p>
    )
  } else {
    subtitle = (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {jig.updatedAt ? `Atualizado ${formatRelative(jig.updatedAt)}` : 'Sem registros'}
      </p>
    )
  }

  // Wrench button state
  const wrenchEnabled =
    (jig.status === 'available' && canOpenMaintenance) ||
    (jig.status === 'maintenance' && canCloseMaintenance)
  const wrenchAction = () => {
    if (jig.status === 'maintenance' && activeLog) onCloseMaintenance(jig, activeLog)
    else if (jig.status === 'available') onOpenMaintenance(jig)
  }

  // Clock button state
  const clockEnabled = jig.status === 'available' && canOpenMaintenance

  // Approve button: only approvers, only pending
  const showApprove = jig.status === 'scheduled' && canApprove && activeLog?.approvalStatus === 'pending'

  // Cancel button:
  //   pending → creator OR approver (no modal)
  //   approved → only approver (opens modal with reason)
  const isCreator = activeLog?.openedBy === currentUserEmail
  const showCancelPending  = jig.status === 'scheduled' && activeLog?.approvalStatus === 'pending'  && (isCreator || canApprove)
  const showCancelApproved = jig.status === 'scheduled' && activeLog?.approvalStatus === 'approved' && canApprove

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Jig icon */}
        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#222] flex items-center justify-center flex-shrink-0">
          <Cpu size={16} className="text-gray-500 dark:text-gray-400" />
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onViewHistory(jig.name)}
            className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-left"
            title="Ver histórico"
          >
            {jig.name}
          </button>
          {subtitle}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Approve (pending + canApprove) */}
          {showApprove && activeLog && (
            <button
              onClick={() => onApprove(activeLog)}
              title="Aprovar agendamento"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              <Check size={15} />
            </button>
          )}

          {/* Cancel pending (creator or approver — no modal needed) */}
          {showCancelPending && activeLog && (
            <button
              onClick={() => onCancelPending(activeLog)}
              title="Cancelar agendamento"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <XIcon size={15} />
            </button>
          )}

          {/* Cancel approved (approver only — requires reason modal) */}
          {showCancelApproved && activeLog && (
            <button
              onClick={() => onCancelApproved(jig, activeLog)}
              title="Cancelar agendamento aprovado"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <XIcon size={15} />
            </button>
          )}

          {/* Wrench — open or close maintenance */}
          <button
            onClick={wrenchEnabled ? wrenchAction : undefined}
            disabled={!wrenchEnabled}
            title={
              jig.status === 'maintenance' ? 'Concluir manutenção'
              : jig.status === 'available' ? 'Colocar em manutenção'
              : 'Indisponível'
            }
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
              ${jig.status === 'maintenance' && canCloseMaintenance
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                : jig.status === 'available' && canOpenMaintenance
                  ? 'bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400'
                  : 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-[#222] text-gray-400'
              }`}
          >
            <Wrench size={15} />
          </button>

          {/* Clock — schedule */}
          <button
            onClick={clockEnabled ? () => onSchedule(jig) : undefined}
            disabled={!clockEnabled}
            title={clockEnabled ? 'Agendar manutenção' : 'Indisponível'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
              ${clockEnabled
                ? 'bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                : 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-[#222] text-gray-400'
              }`}
          >
            <Clock size={15} />
          </button>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Inline alert for active maintenance only */}
      {activeLog && jig.status === 'maintenance' && (() => {
        const u = activeLog.urgency
        const theme = {
          low:      { wrap: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30', icon: 'text-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', sub: 'text-emerald-500/80 dark:text-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
          medium:   { wrap: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800/30',   icon: 'text-yellow-500', text: 'text-yellow-700 dark:text-yellow-300',   sub: 'text-yellow-500/80 dark:text-yellow-500',   badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'   },
          high:     { wrap: 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30',   icon: 'text-orange-500', text: 'text-orange-700 dark:text-orange-300',   sub: 'text-orange-500/80 dark:text-orange-500',   badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'   },
          critical: { wrap: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30',               icon: 'text-red-500',    text: 'text-red-700 dark:text-red-300',         sub: 'text-red-500/80 dark:text-red-500',         badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'             },
        }[u] ?? {  wrap: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30',          icon: 'text-amber-500',  text: 'text-amber-700 dark:text-amber-300',     sub: 'text-amber-500/80 dark:text-amber-500',     badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'     }

        return (
          <div className={`mx-5 mb-3 px-4 py-2.5 rounded-lg border flex items-start gap-2 ${theme.wrap}`}>
            <AlertTriangle size={13} className={`${theme.icon} mt-0.5 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${theme.badge}`}>
                  {URGENCY_LABEL[u]} urgência
                </span>
              </div>
              <p className={`text-xs ${theme.text} leading-relaxed line-clamp-1`}>{activeLog.symptom}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {activeLog.openedByPicture ? (
                  <img
                    src={activeLog.openedByPicture}
                    alt={activeLog.openedByName}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${theme.badge}`}>
                    <span className="text-[9px] font-bold">
                      {activeLog.openedByName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <p className={`text-[11px] ${theme.sub}`}>
                  {activeLog.openedByName} · {formatRelative(activeLog.openedAt)}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export function StatusTab({ jigs, logs, onRefresh, onViewHistory, permissions, currentUser }: Props) {
  const [openMaintenanceJig, setOpenMaintenanceJig] = useState<Jig | null>(null)
  const [closeTarget, setCloseTarget]               = useState<{ jig: Jig; log: JigLog } | null>(null)
  const [scheduleJig, setScheduleJig]               = useState<Jig | null>(null)
  const [cancelApprovedTarget, setCancelApprovedTarget] = useState<{ jig: Jig; log: JigLog } | null>(null)
  const [approving, setApproving]                   = useState<string | null>(null)

  const canOpenMaintenance  = hasPermission(permissions, 'open_maintenance')
  const canCloseMaintenance = hasPermission(permissions, 'close_maintenance')
  const canApprove          = hasPermission(permissions, 'approve_schedule')

  const getActiveLog = (jig: Jig) =>
    jig.currentLogId ? logs.find(l => l.id === jig.currentLogId) : undefined

  const handleApprove = async (log: JigLog) => {
    setApproving(log.id)
    try {
      await approveSchedule(
        log.id, log.jigId, currentUser.email, currentUser.name,
        log.openedBy, log.jigName, log.scheduledFor ?? '',
      )
      onRefresh()
    } finally {
      setApproving(null)
    }
  }

  const handleCancelPending = async (log: JigLog) => {
    setApproving(log.id)
    try {
      await rejectSchedule(log.id, log.jigId, currentUser.email, log.openedBy, log.jigName)
      onRefresh()
    } finally {
      setApproving(null)
    }
  }

  const counts = {
    available:   jigs.filter(j => j.status === 'available' || j.status === 'scheduled').length,
    maintenance: jigs.filter(j => j.status === 'maintenance').length,
    scheduled:   jigs.filter(j => j.status === 'scheduled').length,
  }

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {counts.available} disponível{counts.available !== 1 ? 'is' : ''}
        </span>
        {counts.maintenance > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {counts.maintenance} em manutenção
          </span>
        )}
        {counts.scheduled > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {counts.scheduled} agendada{counts.scheduled !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {jigs.map(jig => (
          <JigRow
            key={jig.id}
            jig={jig}
            activeLog={getActiveLog(jig)}
            onOpenMaintenance={setOpenMaintenanceJig}
            onCloseMaintenance={(j, l) => setCloseTarget({ jig: j, log: l })}
            onSchedule={setScheduleJig}
            onApprove={handleApprove}
            onCancelPending={handleCancelPending}
            onCancelApproved={(j, l) => setCancelApprovedTarget({ jig: j, log: l })}
            onViewHistory={onViewHistory}
            canOpenMaintenance={canOpenMaintenance}
            canCloseMaintenance={canCloseMaintenance}
            canApprove={canApprove && approving === null}
            currentUserEmail={currentUser.email}
          />
        ))}
      </div>

      {/* Modals */}
      {openMaintenanceJig && (
        <OpenMaintenanceModal
          jig={openMaintenanceJig}
          onClose={() => setOpenMaintenanceJig(null)}
          onSuccess={() => { setOpenMaintenanceJig(null); onRefresh() }}
        />
      )}
      {closeTarget && (
        <CloseMaintenanceModal
          jig={closeTarget.jig}
          log={closeTarget.log}
          onClose={() => setCloseTarget(null)}
          onSuccess={() => { setCloseTarget(null); onRefresh() }}
        />
      )}
      {scheduleJig && (
        <ScheduleModal
          jig={scheduleJig}
          currentUser={currentUser}
          onClose={() => setScheduleJig(null)}
          onSuccess={() => { setScheduleJig(null); onRefresh() }}
        />
      )}
      {cancelApprovedTarget && (
        <CancelScheduleModal
          jig={cancelApprovedTarget.jig}
          log={cancelApprovedTarget.log}
          currentUser={currentUser}
          onClose={() => setCancelApprovedTarget(null)}
          onSuccess={() => { setCancelApprovedTarget(null); onRefresh() }}
        />
      )}
    </div>
  )
}
