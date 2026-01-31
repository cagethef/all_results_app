import { ChipInfo } from '@/types'
import { Wifi, Cpu } from 'lucide-react'

interface ChipContentProps {
  chipInfo: ChipInfo
}

export function ChipContent({ chipInfo }: ChipContentProps) {
  return (
    <div className="space-y-6">
      {/* Chip Type Badge */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Cpu className="text-purple-600 dark:text-purple-400" size={24} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
            Tipo de Conexão
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
            {chipInfo.type}
          </p>
        </div>
      </div>

      {/* Chips Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chip 1 */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wifi className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Chip 1
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide mb-1">
                Operadora
              </p>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {chipInfo.chip1.carrier}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide mb-1">
                CCID
              </p>
              <code className="block px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                {chipInfo.chip1.ccid}
              </code>
            </div>
          </div>
        </div>

        {/* Chip 2 (if Dual Chip) */}
        {chipInfo.chip2 && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Wifi className="text-green-600 dark:text-green-400" size={18} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Chip 2
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide mb-1">
                  Operadora
                </p>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  {chipInfo.chip2.carrier}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide mb-1">
                  CCID
                </p>
                <code className="block px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800">
                  {chipInfo.chip2.ccid}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-xs text-yellow-800 dark:text-yellow-300">
          <strong>Atenção:</strong> Verifique fisicamente o velcro de identificação do chip. Cada cor representa uma operadora - a quantidade de velcros deve corresponder ao número de chips e as cores devem coincidir com as operadoras indicadas acima.
        </p>
      </div>
    </div>
  )
}
