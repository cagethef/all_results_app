import { useState, useCallback, useMemo } from 'react'
import { Device } from '@/types'
import { DeviceRow } from './DeviceRow'
import { DeviceModal } from '../DeviceModal/DeviceModal'

interface DeviceTableProps {
  devices: Device[]
  onClearAll?: () => void
}

export function DeviceTable({ devices, onClearAll }: DeviceTableProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  // Detect unique test columns from all devices
  const testColumns = useMemo(() => {
    const uniqueTests = new Set<string>()
    devices.forEach(device => {
      device.tests.forEach(test => {
        uniqueTests.add(test.testName)
      })
    })
    return Array.from(uniqueTests).sort()
  }, [devices])

  // Check if any device has chip info
  const hasChipColumn = useMemo(() => {
    return devices.some(device => device.chipInfo)
  }, [devices])

  // Memoize handlers to prevent re-creating functions
  const handleDeviceClick = useCallback((device: Device) => {
    setSelectedDevice(device)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedDevice(null)
  }, [])

  if (devices.length === 0) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum dispositivo adicionado
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use o campo acima para adicionar dispositivos manualmente ou escaneie com o leitor Zebra
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header with Clear Button */}
        {devices.length > 0 && onClearAll && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Dispositivos ({devices.length})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {testColumns.length > 0 && `Exibindo ${testColumns.length} teste${testColumns.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={onClearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Limpar Todos
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  ID Dispositivo
                </th>
                {hasChipColumn && (
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Conectividade
                  </th>
                )}
                {testColumns.map(testName => (
                  <th key={testName} className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {testName}
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status Geral
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.map((device, index) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  testColumns={testColumns}
                  hasChipColumn={hasChipColumn}
                  onClick={() => handleDeviceClick(device)}
                  index={index}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
