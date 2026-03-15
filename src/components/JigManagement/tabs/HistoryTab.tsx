import { useState } from 'react'
import { CheckCircle2, Clock, Wrench, Calendar, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import type { JigLog } from '@/types'

registerLocale('pt-BR', ptBR)

const LOG_STATUS_CONFIG = {
  open:      { label: 'Aberta',    color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10'    },
  completed: { label: 'Concluída', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  cancelled: { label: 'Cancelada', color: 'text-gray-500 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-800'         },
}

const URGENCY_LABELS: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
}

type Period = 'all' | 'today' | 'week' | 'month' | 'custom'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function Avatar({ picture, name, size = 5 }: { picture?: string; name: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 object-cover`
  if (picture) {
    return <img src={picture} alt={name} referrerPolicy="no-referrer" className={cls} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0`}>
      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
        {name?.[0]?.toUpperCase()}
      </span>
    </div>
  )
}

function LogRow({ log }: { log: JigLog }) {
  const [expanded, setExpanded] = useState(false)
  const status     = LOG_STATUS_CONFIG[log.status] ?? LOG_STATUS_CONFIG.open
  const isSchedule = log.type === 'scheduled_change'

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
      >
        {/* Type icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isSchedule
            ? <Calendar size={16} className="text-blue-500" />
            : log.status === 'completed'
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <Wrench size={16} className="text-amber-500" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{log.jigName}</span>

            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              isSchedule
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}>
              {isSchedule ? <Calendar size={9} /> : <Wrench size={9} />}
              {isSchedule ? 'Agendamento' : 'Manutenção'}
            </span>

            {/* Status badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.color}`}>
              {status.label}
            </span>

            {!isSchedule && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {URGENCY_LABELS[log.urgency] ?? log.urgency}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{log.symptom}</p>

          {/* Requester + date */}
          <div className="flex items-center gap-2 mt-1.5">
            <Avatar picture={log.openedByPicture} name={log.openedByName} size={4} />
            <span className="text-xs text-gray-400 dark:text-gray-500">{log.openedByName}</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Clock size={10} />
              {formatDate(log.openedAt)}
            </span>
            {log.closedAt && (
              <>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">Concluída {formatDate(log.closedAt)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50/50 dark:bg-[#111] space-y-4">

          {/* Opening / schedule info */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">
              {isSchedule ? 'Agendamento' : 'Abertura'}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-gray-400 dark:text-gray-500">{isSchedule ? 'Motivo' : 'Sintoma'}</dt>
                <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.symptom}</dd>
              </div>
              {isSchedule && log.scheduledFor && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500">Data agendada</dt>
                  <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{formatDate(log.scheduledFor)}</dd>
                </div>
              )}
              {isSchedule && log.authorizedByName && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500">Aprovado por</dt>
                  <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.authorizedByName}</dd>
                </div>
              )}
              {!isSchedule && (
                <>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Impedindo testes?</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.blockingTests ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Dispositivos afetados</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.affectedDevices === 'none' ? 'Nenhum' : log.affectedDevices}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Identificado em</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{formatDate(log.identifiedAt)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* Cancellation info */}
          {log.status === 'cancelled' && log.cancellationReason && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">Cancelamento</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400 dark:text-gray-500">Motivo</dt>
                  <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.cancellationReason}</dd>
                </div>
                {log.cancelledByName && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Cancelado por</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.cancelledByName}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Closing info (maintenance only) */}
          {log.status === 'completed' && log.modificationType && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">Conclusão</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500">Tipo de modificação</dt>
                  <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.modificationType}</dd>
                </div>
                {log.modificationReason && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Motivo</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">
                      {log.modificationReason === 'Outro' ? log.modificationReasonCustom : log.modificationReason}
                    </dd>
                  </div>
                )}
                {log.whatChanged && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 dark:text-gray-500">O que foi modificado</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.whatChanged}</dd>
                  </div>
                )}
                {log.technicalDetail && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Detalhe técnico</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.technicalDetail}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-400 dark:text-gray-500">Retestar?</dt>
                  <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.needsRetest ? 'Sim' : 'Não'}</dd>
                </div>
                {log.risks && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Observações / riscos</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.risks}</dd>
                  </div>
                )}
                {log.closedByName && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Concluído por</dt>
                    <dd className="text-gray-700 dark:text-gray-300 mt-0.5">{log.closedByName}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Period helpers ────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function filterByPeriod(logs: JigLog[], period: Period, customFrom: Date | null, customTo: Date | null): JigLog[] {
  if (period === 'all') return logs
  const now   = new Date()
  const today = startOfDay(now)

  return logs.filter(l => {
    const d = new Date(l.openedAt)
    if (period === 'today') return d >= today
    if (period === 'week')  {
      const week = new Date(today); week.setDate(today.getDate() - 7)
      return d >= week
    }
    if (period === 'month') {
      const month = new Date(today); month.setMonth(today.getMonth() - 1)
      return d >= month
    }
    if (period === 'custom') {
      const from = customFrom ? startOfDay(customFrom) : null
      const to   = customTo   ? new Date(customTo.getFullYear(), customTo.getMonth(), customTo.getDate(), 23, 59, 59) : null
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    }
    return true
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  logs: JigLog[]
  initialJig?: string
}

export function HistoryTab({ logs, initialJig }: Props) {
  const [filterJig, setFilterJig]     = useState<string>(initialJig ?? 'all')
  const [period, setPeriod]           = useState<Period>('all')
  const [customFrom, setCustomFrom]   = useState<Date | null>(null)
  const [customTo, setCustomTo]       = useState<Date | null>(null)

  const jigNames = Array.from(new Set(logs.map(l => l.jigName))).sort()

  // Don't show scheduled_change logs that were cancelled before approval
  const visible = logs.filter(l =>
    !(l.type === 'scheduled_change' && (l.approvalStatus === 'rejected' || l.approvalStatus === 'pending')),
  )

  const byJig     = filterJig === 'all' ? visible : visible.filter(l => l.jigName === filterJig)
  const filtered  = filterByPeriod(byJig, period, customFrom, customTo)

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'all',    label: 'Todos'   },
    { value: 'today',  label: 'Hoje'    },
    { value: 'week',   label: '7 dias'  },
    { value: 'month',  label: '30 dias' },
    { value: 'custom', label: 'Período' },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Jig filter */}
        <select
          value={filterJig}
          onChange={e => setFilterJig(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Todas as jigas</option>
          {jigNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Period pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <DatePicker
              selected={customFrom}
              onChange={(d: Date | null) => setCustomFrom(d)}
              selectsStart
              startDate={customFrom}
              endDate={customTo}
              maxDate={new Date()}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              placeholderText="De"
              className="w-28 px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              popperClassName="z-[60]"
              popperPlacement="bottom-start"
            />
            <span className="text-xs text-gray-400">até</span>
            <DatePicker
              selected={customTo}
              onChange={(d: Date | null) => setCustomTo(d)}
              selectsEnd
              startDate={customFrom}
              endDate={customTo}
              minDate={customFrom ?? undefined}
              maxDate={new Date()}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              placeholderText="Até"
              className="w-28 px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              popperClassName="z-[60]"
              popperPlacement="bottom-start"
            />
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(null); setCustomTo(null) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Limpar"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Logs */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center">
            <Wrench size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Nenhum registro encontrado</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">As manutenções aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => <LogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
