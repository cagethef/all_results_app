import { Parameter } from '@/types'
import { getParameterIcon } from '@/utils/iconMapping'
import { StatusIcon } from '../shared/StatusIcon'

interface ParameterTableProps {
  parameters: Parameter[]
  variant?: 'default' | 'info' | 'vibration'
  hideStatus?: boolean
  hideExpected?: boolean
}

function parseVibrationAxes(measured?: string): { x: string | null; y: string | null; z: string | null } {
  if (!measured) return { x: null, y: null, z: null }
  const parts = measured.split(' / ')
  if (parts.length === 3) {
    return {
      x: parseFloat(parts[0]).toFixed(4),
      y: parseFloat(parts[1]).toFixed(4),
      z: parseFloat(parts[2]).toFixed(4),
    }
  }
  return { x: parseFloat(measured).toFixed(4), y: null, z: null }
}

export function ParameterTable({ parameters, variant = 'default', hideStatus = false, hideExpected = false }: ParameterTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full">
        <thead>
          {variant === 'vibration' ? (
            <>
              <tr className="bg-gray-50 dark:bg-[#0a0a0a]">
                <th rowSpan={2} className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Parâmetro
                </th>
                <th colSpan={3} className="px-6 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Referência
                </th>
                <th colSpan={3} className="px-6 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 border-l border-gray-200 dark:border-gray-700">
                  Medido
                </th>
                {!hideStatus && (
                  <th rowSpan={2} className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Status
                  </th>
                )}
              </tr>
              <tr className="bg-gray-50 dark:bg-[#0a0a0a]">
                {['X', 'Y', 'Z', 'X', 'Y', 'Z'].map((axis, i) => (
                  <th key={i} className={`px-4 py-2 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700${i === 3 ? ' border-l border-gray-200 dark:border-gray-700' : ''}`}>
                    {axis}
                  </th>
                ))}
              </tr>
            </>
          ) : (
            <tr className="bg-gray-50 dark:bg-[#0a0a0a]">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Parâmetro
              </th>
              {variant === 'default' ? (
                <>
                  {!hideExpected && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Referência
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Medido
                  </th>
                </>
              ) : (
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Informação
                </th>
              )}
              {!hideStatus && (
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              )}
            </tr>
          )}
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

                {variant === 'default' ? (
                  <>
                    {!hideExpected && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {param.parameterType === 'info' ? (
                            <span className="text-gray-400 dark:text-gray-600" />
                          ) : param.expected !== undefined ? (
                            <>
                              {param.expected} <span className="text-gray-500 dark:text-gray-500">{param.unit}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">-</span>
                          )}
                        </span>
                      </td>
                    )}
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
                  </>
                ) : variant === 'vibration' ? (
                  (() => {
                    const meas = parseVibrationAxes(param.measured != null ? String(param.measured) : undefined)
                    const ref = parseVibrationAxes(param.expected != null ? String(param.expected) : undefined)
                    const cellBase = "px-4 py-4 text-center whitespace-nowrap text-sm font-mono"
                    const measClass = `${cellBase} text-gray-900 dark:text-white font-bold`
                    const refClass = `${cellBase} text-gray-500 dark:text-gray-400`
                    const empty = <span className="text-gray-300 dark:text-gray-700">-</span>
                    return (
                      <>
                        <td className={refClass}>{ref.x ?? empty}</td>
                        <td className={refClass}>{ref.y ?? empty}</td>
                        <td className={refClass}>{ref.z ?? empty}</td>
                        <td className={`${measClass} border-l border-gray-200 dark:border-gray-700`}>{meas.x ?? empty}</td>
                        <td className={measClass}>{meas.y ?? empty}</td>
                        <td className={measClass}>{meas.z ?? empty}</td>
                      </>
                    )
                  })()
                ) : (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white font-semibold">
                      {param.measured !== undefined ? (
                        <>
                          {param.measured} <span className="text-gray-500 dark:text-gray-500 font-medium">{param.unit}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </span>
                  </td>
                )}

                {!hideStatus && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {param.parameterType === 'info' ? (
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-600">N/A</span>
                      </div>
                    ) : (
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
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
