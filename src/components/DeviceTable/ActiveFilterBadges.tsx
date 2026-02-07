import { X } from 'lucide-react'

interface ActiveFilter {
  key: string
  label: string
  value: string
  displayValue: string
}

interface ActiveFilterBadgesProps {
  filters: ActiveFilter[]
  onRemove: (key: string) => void
  onClearAll: () => void
}

export function ActiveFilterBadges({ filters, onRemove, onClearAll }: ActiveFilterBadgesProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap px-6 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-800">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Filtros ativos:
      </span>
      {filters.map(filter => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium"
        >
          <span>
            {filter.label}: <strong>{filter.displayValue}</strong>
          </span>
          <button
            onClick={() => onRemove(filter.key)}
            className="hover:bg-primary-200 dark:hover:bg-primary-800/50 rounded-full p-0.5 transition-colors"
            aria-label={`Remover filtro ${filter.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline ml-2"
      >
        Limpar tudo
      </button>
    </div>
  )
}
