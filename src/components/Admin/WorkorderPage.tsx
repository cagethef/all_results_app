import { ClipboardList } from 'lucide-react'
import { WorkorderConfig } from './WorkorderConfig'

export function WorkorderPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d]">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/10 dark:bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-teal-200 dark:ring-teal-500/30">
            <ClipboardList className="text-teal-600 dark:text-teal-400" size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Template de Work Order</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure os campos do modelo de WO</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <WorkorderConfig />
        </div>
      </div>
    </div>
  )
}
