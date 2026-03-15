import { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { openMaintenance, updateJigStatus } from '@/lib/jigService'
import { useAuth } from '@/contexts/AuthContext'
import type { Jig, JigUrgency, JigAffectedDevices } from '@/types'

registerLocale('pt-BR', ptBR)

interface Props {
  jig: Jig
  onClose: () => void
  onSuccess: () => void
}

const URGENCY_OPTIONS: { value: JigUrgency; label: string; color: string }[] = [
  { value: 'low',      label: 'Baixa',   color: 'border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
  { value: 'medium',   label: 'Média',   color: 'border-yellow-400  text-yellow-700  dark:text-yellow-400  bg-yellow-50  dark:bg-yellow-900/20'  },
  { value: 'high',     label: 'Alta',    color: 'border-orange-400  text-orange-700  dark:text-orange-400  bg-orange-50  dark:bg-orange-900/20'  },
  { value: 'critical', label: 'Crítica', color: 'border-red-400     text-red-700     dark:text-red-400     bg-red-50     dark:bg-red-900/20'     },
]

const AFFECTED_OPTIONS: { value: JigAffectedDevices; label: string }[] = [
  { value: 'none', label: 'Nenhum' },
  { value: '1-5',  label: '1 – 5'  },
  { value: '6-20', label: '6 – 20' },
  { value: '20+',  label: '+20'    },
]

export function OpenMaintenanceModal({ jig, onClose, onSuccess }: Props) {
  const { user } = useAuth()

  const [symptom,         setSymptom]         = useState('')
  const [blockingTests,   setBlockingTests]   = useState<boolean | null>(null)
  const [urgency,         setUrgency]         = useState<JigUrgency | null>(null)
  const [affectedDevices, setAffectedDevices] = useState<JigAffectedDevices | null>(null)
  const [identifiedAt,    setIdentifiedAt]    = useState<Date | null>(null)
  const [submitting,      setSubmitting]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const isValid =
    symptom.trim().length > 0 &&
    blockingTests !== null &&
    urgency !== null &&
    affectedDevices !== null &&
    identifiedAt !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !user) return
    setSubmitting(true)
    setError(null)
    try {
      const pad = (n: number) => n.toString().padStart(2, '0')
      const d = identifiedAt!
      const identifiedAtStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

      const logId = await openMaintenance({
        jigId:            jig.id,
        jigName:          jig.name,
        type:             'maintenance',
        openedBy:         user.email,
        openedByName:     user.name,
        openedByPicture:  user.picture ?? undefined,
        symptom:          symptom.trim(),
        blockingTests:    blockingTests!,
        urgency:          urgency!,
        affectedDevices:  affectedDevices!,
        identifiedAt:     identifiedAtStr,
      })
      await updateJigStatus(jig.id, 'maintenance', user.email, logId)
      onSuccess()
    } catch {
      setError('Erro ao abrir manutenção. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#141414] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Abrir Manutenção</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{jig.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Symptom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Qual o sintoma ou problema observado? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={symptom}
              onChange={e => setSymptom(e.target.value)}
              rows={3}
              placeholder="Descreva o que está acontecendo com a jiga..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Blocking tests */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              O problema está impedindo a realização de testes? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setBlockingTests(v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    blockingTests === v
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Urgência <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    urgency === opt.value
                      ? opt.color
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Affected devices */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantos dispositivos podem ter sido afetados? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AFFECTED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAffectedDevices(opt.value)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                    affectedDevices === opt.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Identified at */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quando o problema foi identificado? <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={identifiedAt}
              onChange={(date: Date | null) => setIdentifiedAt(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              maxDate={new Date()}
              locale="pt-BR"
              placeholderText="Selecione data e hora"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              wrapperClassName="w-full"
              popperClassName="z-[60]"
              popperPlacement="top-start"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Abrir Manutenção
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
