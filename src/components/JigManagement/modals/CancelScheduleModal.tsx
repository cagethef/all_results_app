import { useState } from 'react'
import { X, XCircle, RefreshCw } from 'lucide-react'
import { cancelApprovedSchedule } from '@/lib/jigService'
import type { Jig, JigLog } from '@/types'

interface Props {
  jig: Jig
  log: JigLog
  currentUser: { email: string; name: string }
  onClose: () => void
  onSuccess: () => void
}

export function CancelScheduleModal({ jig, log, currentUser, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Informe o motivo do cancelamento.'); return }
    setSaving(true)
    setError(null)
    try {
      await cancelApprovedSchedule(
        log.id, jig.id,
        currentUser.email, currentUser.name,
        reason.trim(),
        log.openedBy, jig.name,
      )
      onSuccess()
    } catch {
      setError('Erro ao cancelar. Tente novamente.')
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
            <XCircle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cancelar Agendamento</h2>
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
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
            Agendado por <span className="font-medium text-gray-700 dark:text-gray-300">{log.openedByName}</span>
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Motivo do cancelamento <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Explique por que o agendamento está sendo cancelado..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
            Cancelar agendamento
          </button>
        </div>
      </div>
    </div>
  )
}
