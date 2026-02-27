import { FailureEntry } from '@/utils/dashboardUtils'

interface FailureRankingProps {
  data: FailureEntry[]
  title: string
}

const TEST_COLORS: Record<string, string> = {
  'ATP':       'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
  'ITP':       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'Leak Test': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
}

function getTestBadgeClass(test: string): string {
  return TEST_COLORS[test] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

export function FailureRanking({ data, title }: FailureRankingProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</p>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma reprova encontrada</p>
        </div>
      </div>
    )
  }

  const max = data[0].count

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</p>
      <div className="space-y-3">
        {data.map((entry, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 shrink-0">
                  {i + 1}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${getTestBadgeClass(entry.test)}`}>
                  {entry.test}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{entry.param}</span>
              </div>
              <span className="text-sm font-bold text-danger-600 dark:text-danger-400 shrink-0">
                {entry.count}×
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ml-6">
              <div
                className="h-full bg-danger-400 dark:bg-danger-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((entry.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
