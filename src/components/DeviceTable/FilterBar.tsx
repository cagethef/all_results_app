import { Filter } from 'lucide-react'

export interface Filters {
  deviceType: string
  connectivity: string
  carrier: string
  testStatus: {
    testName: string
    status: string
  }
  overallStatus: string
}

interface FilterBarProps {
  activeFiltersCount: number
  onOpenModal: () => void
}

export function FilterBar({ activeFiltersCount, onOpenModal }: FilterBarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <div className="px-6 py-3">
        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <Filter size={16} />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
