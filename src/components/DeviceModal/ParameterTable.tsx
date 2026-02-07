import { Parameter } from '@/types'
import { getParameterIcon } from '@/utils/iconMapping'
import { StatusIcon } from '../shared/StatusIcon'

interface ParameterTableProps {
  parameters: Parameter[]
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#0a0a0a]">
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Parâmetro
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Referência
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Medido
            </th>
            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#141414] divide-y divide-gray-100 dark:divide-gray-800">
          {parameters.map((param, index) => {
            const Icon = getParameterIcon(param.parameterType || param.name)
            
            return (
              <tr key={index} className="transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                      <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {param.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {param.expected !== undefined ? (
                      <>
                        {param.expected} <span className="text-gray-500 dark:text-gray-500">{param.unit}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white font-bold">
                    {param.measured !== undefined ? (
                      <>
                        {param.measured} <span className="text-gray-500 dark:text-gray-500 font-medium">{param.unit}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <StatusIcon status={param.status} size={20} />
                    <span
                      className={`text-sm font-bold ${
                        param.status === 'approved'
                          ? 'text-success-600'
                          : param.status === 'failed'
                          ? 'text-danger-600'
                          : param.status === 'warning'
                          ? 'text-warning-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {param.status === 'approved' && 'APROVADO'}
                      {param.status === 'failed' && 'Reprovado'}
                      {param.status === 'warning' && 'Tolerável'}
                      {param.status === 'pending' && 'Pendente'}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
