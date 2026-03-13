import { ClipboardList } from 'lucide-react'
import { WorkorderConfig } from './WorkorderConfig'

export function WorkorderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <ClipboardList className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Modelo de WO</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure os campos do template de Work Order</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 px-6 py-6">
        <WorkorderConfig />
      </div>
    </div>
  )
}
