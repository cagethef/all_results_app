import { memo, useMemo } from 'react'
import { Device, TestStatus } from '@/types'
import { StatusIcon } from '../shared/StatusIcon'
import { getDeviceIcon, getDeviceIconColor } from '@/utils/deviceIcons'

interface DeviceRowProps {
  device: Device
  testColumns: string[]
  hasChipColumn: boolean
  onClick: () => void
  index: number
}

export const DeviceRow = memo(function DeviceRow({ device, testColumns, hasChipColumn, onClick, index }: DeviceRowProps) {
  // Create a map of test name to status for quick lookup
  const testStatusMap = useMemo(() => {
    const map = new Map<string, TestStatus>()
    device.tests.forEach(test => {
      map.set(test.testName, test.status)
    })
    return map
  }, [device.tests])

  const DeviceIcon = getDeviceIcon(device.deviceType)
  const iconColors = getDeviceIconColor(device.deviceType)

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 last:border-0"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${iconColors.bg} rounded-lg flex items-center justify-center`}>
            <DeviceIcon className={iconColors.text} size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{device.id}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {device.deviceType}
              </span>
            </div>
          </div>
        </div>
      </td>
      {hasChipColumn && (
        <td className="px-6 py-5 whitespace-nowrap">
          {device.chipInfo ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {device.chipInfo.type}
              </span>
              <div className="flex items-center gap-1 text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">
                  {device.chipInfo.chip1.carrier}
                </span>
                {device.chipInfo.chip2 && (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">+</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">
                      {device.chipInfo.chip2.carrier}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
          )}
        </td>
      )}
      {testColumns.map(testName => {
        const status = testStatusMap.get(testName)
        return (
          <td key={testName} className="px-6 py-5 whitespace-nowrap text-center">
            <div className="flex justify-center">
              {status ? (
                <StatusIcon status={status} />
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
              )}
            </div>
          </td>
        )
      })}
      <td className="px-6 py-5 whitespace-nowrap text-center">
        <span
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${
            device.overallStatus === 'approved'
              ? 'bg-gradient-to-r from-success-500 to-success-600 text-white'
              : device.overallStatus === 'failed'
              ? 'bg-gradient-to-r from-danger-500 to-danger-600 text-white'
              : device.overallStatus === 'warning'
              ? 'bg-gradient-to-r from-warning-500 to-warning-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {device.overallStatus === 'approved' && (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Aprovado
            </>
          )}
          {device.overallStatus === 'failed' && (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Reprovado
            </>
          )}
          {device.overallStatus === 'warning' && '⚠ Atenção'}
          {device.overallStatus === 'pending' && '⏳ Pendente'}
        </span>
      </td>
    </tr>
  )
})
