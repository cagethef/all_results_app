import { useState } from 'react'
import { X, Calendar, RefreshCw } from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { scheduleMaintenance } from '@/lib/jigService'
import type { Jig } from '@/types'

registerLocale('pt-BR', ptBR)

interface Props {
  jig: Jig
  currentUser: { email: string; name: string; picture?: string }
  onClose: () => void
  onSuccess: () => void
}

export function ScheduleModal({ jig, currentUser, onClose, onSuccess }: Props) {
  const [reason, setReason]           = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim() || !selectedDate) {
      setError('Preencha todos os campos.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // toISOString gives UTC — keep local time as string for display
      const pad = (n: number) => n.toString().padStart(2, '0')
      const d = selectedDate
      const scheduledFor = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

      await scheduleMaintenance({
        jigId:           jig.id,
        jigName:         jig.name,
        openedBy:        currentUser.email,
        openedByName:    currentUser.name,
        openedByPicture: currentUser.picture,
        reason:          reason.trim(),
        scheduledFor,
      })
      onSuccess()
    } catch {
      setError('Erro ao agendar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Agendar Manutenção</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Jiga: <span className="font-medium text-gray-700 dark:text-gray-300">{jig.name}</span>
          </p>

          {/* Date + time picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Data e hora <span className="text-red-400">*</span>
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              minDate={new Date()}
              locale="pt-BR"
              placeholderText="Selecione data e hora"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              wrapperClassName="w-full"
              popperClassName="z-[60]"
              popperPlacement="bottom-start"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Motivo do agendamento <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Descreva o que será feito nesta manutenção..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !reason.trim() || !selectedDate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving
              ? <RefreshCw size={13} className="animate-spin" />
              : <Calendar size={13} />
            }
            Agendar
          </button>
        </div>
      </div>
    </div>
  )
}
