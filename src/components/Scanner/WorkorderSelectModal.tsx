import { useState } from 'react'
import { DisambiguationState } from '@/hooks/useDevices'

interface WorkorderSelectModalProps {
  disambiguation: DisambiguationState
  onConfirm: (workorderNumbers: number[]) => void
  onCancel: () => void
}

export function WorkorderSelectModal({ disambiguation, onConfirm, onCancel }: WorkorderSelectModalProps) {
  const { batch, workorders } = disambiguation
  const [selected, setSelected] = useState<Set<number>>(new Set(workorders.map(w => w.number)))

  const toggle = (number: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  const handleConfirm = () => {
    const numbers = workorders.filter(w => selected.has(w.number)).map(w => w.number)
    if (numbers.length > 0) onConfirm(numbers)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#141414] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Múltiplas workorders no lote
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            O lote{' '}
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              #{batch}
            </span>{' '}
            foi encontrado em {workorders.length} workorders. Selecione quais deseja carregar:
          </p>
        </div>

        {/* Workorder list */}
        <div className="px-6 py-4 space-y-2">
          {workorders.map(w => (
            <label
              key={w.number}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(w.number)}
                onChange={() => toggle(w.number)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary-600 cursor-pointer"
              />
              <div className="text-sm">
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  #{String(w.number).padStart(5, '0')}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  —{w.title ? ` ${w.title} |` : ''} {w.count} dispositivo{w.count !== 1 ? 's' : ''}
                </span>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Carregar selecionados
          </button>
        </div>
      </div>
    </div>
  )
}
