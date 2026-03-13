import { DebugDevice } from './DebuggingPage'
import { getDeviceIcon, getDeviceIconColor } from '@/utils/deviceIcons'
import { RefreshCw } from 'lucide-react'

interface DebuggingRowProps {
  device: DebugDevice
  isSelected: boolean
  onToggle: (id: string) => void
  onRowClick: (id: string) => void
  isLoadingDetails: boolean
  onMarkWO: (id: string) => void
  onRemoveWO: (id: string) => void
  isMarkingWO: boolean
  isRemovingWO: boolean
}

function DaysBadge({ days }: { days: number }) {
  const style = days >= 7
    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    : days >= 3
    ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${style}`}>
      {days}d
    </span>
  )
}

function FailBadge({ name }: { name: string | null }) {
  if (!name) return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 whitespace-nowrap">
      {name}
    </span>
  )
}

export function DebuggingRow({
  device, isSelected, onToggle, onRowClick, isLoadingDetails,
  onMarkWO, onRemoveWO, isMarkingWO, isRemovingWO
}: DebuggingRowProps) {
  const DeviceIcon = getDeviceIcon(device.device_type ?? '')
  const iconColors = getDeviceIconColor(device.device_type ?? '')

  return (
    <tr
      onClick={() => onRowClick(device.device_id)}
      className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 last:border-0 ${
        isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
      }`}
    >
      <td className="pl-4 pr-2 py-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(device.device_id)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] cursor-pointer accent-primary-600"
        />
      </td>

      {/* Device ID + Tipo */}
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${iconColors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <DeviceIcon className={iconColors.text} size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{device.device_id}</div>
            {device.device_type && (
              <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {device.device_type}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* SAP */}
      <td className="px-6 py-5 whitespace-nowrap">
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {device.sap_code ?? '—'}
        </span>
      </td>

      {/* Lote */}
      <td className="px-6 py-5 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
          {device.batch_name ?? '—'}
        </span>
      </td>

      {/* Dias */}
      <td className="px-6 py-5 whitespace-nowrap">
        <DaysBadge days={device.days_in_debug ?? 0} />
      </td>

      {/* Falha */}
      <td className="px-6 py-5 whitespace-nowrap">
        <FailBadge name={device.fail_name} />
      </td>

      {/* Descrição */}
      <td className="px-6 py-5 max-w-[220px]">
        <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={device.fail_descriptor}>
          {device.fail_descriptor ?? '—'}
        </span>
      </td>

      {/* Work Order */}
      <td className="px-6 py-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {device.has_workorder
            ? <>
                {device.workorder_id
                  ? (
                    <a
                      href={`https://app.tractian.com/cmms/workorders/${device.workorder_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Criada
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Criada
                    </span>
                  )
                }
                <button
                  onClick={() => onRemoveWO(device.device_id)}
                  disabled={isRemovingWO}
                  title="Desfazer marcação"
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                >
                  {isRemovingWO
                    ? <RefreshCw size={12} className="animate-spin" />
                    : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                </button>
              </>
            : <>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Pendente
                </span>
                <button
                  onClick={() => onMarkWO(device.device_id)}
                  disabled={isMarkingWO}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
                >
                  {isMarkingWO
                    ? <><RefreshCw size={11} className="animate-spin" /> Criando...</>
                    : <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Criar WO
                      </>
                  }
                </button>
              </>
          }
        </div>
      </td>

      {/* Detalhes */}
      <td className="px-6 py-5 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onRowClick(device.device_id)}
          disabled={isLoadingDetails}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
        >
          {isLoadingDetails
            ? <><RefreshCw size={12} className="animate-spin" /> Carregando...</>
            : 'Detalhes'}
        </button>
      </td>
    </tr>
  )
}
