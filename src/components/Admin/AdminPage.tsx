import { useState } from 'react'
import { Bug, ChevronRight, Settings } from 'lucide-react'
import { WorkorderConfig } from './WorkorderConfig'

type Section = 'debug' | null

export function AdminPage() {
  const [openSection, setOpenSection] = useState<Section>(null)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Settings className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configurações do sistema</p>
        </div>
      </div>

      {/* Debug section */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <button
          onClick={() => setOpenSection(prev => prev === 'debug' ? null : 'debug')}
          className="w-full px-6 py-5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-left"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bug className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Debug</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configurações do módulo de debugging e work orders
            </p>
          </div>
          <ChevronRight
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${openSection === 'debug' ? 'rotate-90' : ''}`}
          />
        </button>

        {openSection === 'debug' && (
          <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800">
            <WorkorderConfig />
          </div>
        )}
      </div>
    </div>
  )
}
