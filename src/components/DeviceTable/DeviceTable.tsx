import { useState, useCallback, useMemo } from 'react'
import { Device } from '@/types'
import { DeviceRow } from './DeviceRow'
import { DeviceModal } from '../DeviceModal/DeviceModal'
import { FilterBar, Filters } from './FilterBar'
import { FilterModal } from './FilterModal'
import { ActiveFilterBadges } from './ActiveFilterBadges'

interface DeviceTableProps {
  devices: Device[]
  onClearAll?: () => void
}

export function DeviceTable({ devices, onClearAll }: DeviceTableProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    deviceType: 'all',
    connectivity: 'all',
    carrier: 'all',
    testStatus: {
      testName: 'all',
      status: 'all'
    },
    overallStatus: 'all'
  })

  // Filtrar dispositivos
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // Filtro por tipo de dispositivo
      if (filters.deviceType !== 'all' && device.deviceType !== filters.deviceType) {
        return false
      }

      // Filtro por conectividade
      if (filters.connectivity !== 'all') {
        if (filters.connectivity === 'none' && device.chipInfo) return false
        if (filters.connectivity === 'single' && device.chipInfo?.type !== 'Single Chip') return false
        if (filters.connectivity === 'dual' && device.chipInfo?.type !== 'Dual Chip') return false
        if (filters.connectivity === 'unidentified' && device.chipInfo?.type !== 'Não Identificado') return false
      }

      // Filtro por operadora (busca em chip1 E chip2)
      if (filters.carrier !== 'all') {
        const hasCarrier =
          device.chipInfo?.chip1.carrier === filters.carrier ||
          device.chipInfo?.chip2?.carrier === filters.carrier
        if (!hasCarrier) return false
      }

      // Filtro por status de teste específico
      if (filters.testStatus.testName !== 'all') {
        const test = device.tests.find(t => t.testName === filters.testStatus.testName)
        if (!test) return false
        if (filters.testStatus.status !== 'all' && test.status !== filters.testStatus.status) {
          return false
        }
      }

      // Filtro por status geral
      if (filters.overallStatus !== 'all' && device.overallStatus !== filters.overallStatus) {
        return false
      }

      return true
    })
  }, [devices, filters])

  // Contador inteligente
  const stats = useMemo(() => {
    return {
      total: devices.length,
      filtered: filteredDevices.length,
      approved: filteredDevices.filter(d => d.overallStatus === 'approved').length,
      failed: filteredDevices.filter(d => d.overallStatus === 'failed').length,
      warning: filteredDevices.filter(d => d.overallStatus === 'warning').length,
      pending: filteredDevices.filter(d => d.overallStatus === 'pending').length
    }
  }, [devices, filteredDevices])

  // Filtros ativos (para badges)
  const activeFilters = useMemo(() => {
    const active = []

    if (filters.deviceType !== 'all') {
      active.push({
        key: 'deviceType',
        label: 'Tipo',
        value: filters.deviceType,
        displayValue: filters.deviceType
      })
    }

    if (filters.connectivity !== 'all') {
      const connectivityLabels: Record<string, string> = {
        single: 'Single Chip',
        dual: 'Dual Chip',
        unidentified: 'Não Identificado',
        none: 'Sem Informação'
      }
      active.push({
        key: 'connectivity',
        label: 'Conectividade',
        value: filters.connectivity,
        displayValue: connectivityLabels[filters.connectivity] || filters.connectivity
      })
    }

    if (filters.carrier !== 'all') {
      active.push({
        key: 'carrier',
        label: 'Operadora',
        value: filters.carrier,
        displayValue: filters.carrier
      })
    }

    if (filters.testStatus.testName !== 'all') {
      const statusLabels: Record<string, string> = {
        approved: 'Aprovado',
        failed: 'Reprovado',
        pending: 'Pendente',
        warning: 'Atenção'
      }
      const displayValue =
        filters.testStatus.status !== 'all'
          ? `${filters.testStatus.testName} - ${statusLabels[filters.testStatus.status]}`
          : filters.testStatus.testName
      
      active.push({
        key: 'testStatus',
        label: 'Teste',
        value: filters.testStatus.testName,
        displayValue
      })
    }

    if (filters.overallStatus !== 'all') {
      const statusLabels: Record<string, string> = {
        approved: 'Aprovado',
        failed: 'Reprovado',
        pending: 'Pendente',
        warning: 'Atenção'
      }
      active.push({
        key: 'overallStatus',
        label: 'Status Geral',
        value: filters.overallStatus,
        displayValue: statusLabels[filters.overallStatus] || filters.overallStatus
      })
    }

    return active
  }, [filters])

  // Remover filtro individual
  const handleRemoveFilter = useCallback((key: string) => {
    setFilters(prev => {
      if (key === 'testStatus') {
        return { ...prev, testStatus: { testName: 'all', status: 'all' } }
      }
      return { ...prev, [key]: 'all' }
    })
  }, [])

  // Limpar todos os filtros
  const handleClearAllFilters = useCallback(() => {
    setFilters({
      deviceType: 'all',
      connectivity: 'all',
      carrier: 'all',
      testStatus: {
        testName: 'all',
        status: 'all'
      },
      overallStatus: 'all'
    })
  }, [])

  // Detect unique test columns from all devices (usar filteredDevices)
  const testColumns = useMemo(() => {
    const uniqueTests = new Set<string>()
    filteredDevices.forEach(device => {
      device.tests.forEach(test => {
        uniqueTests.add(test.testName)
      })
    })
    return Array.from(uniqueTests).sort()
  }, [filteredDevices])

  // Check if any device has chip info (usar filteredDevices)
  const hasChipColumn = useMemo(() => {
    return filteredDevices.some(device => device.chipInfo)
  }, [filteredDevices])

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
                Dispositivos ({stats.filtered}{stats.filtered !== stats.total && ` de ${stats.total}`})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stats.approved > 0 && `✓ ${stats.approved} aprovado${stats.approved > 1 ? 's' : ''} `}
                {stats.failed > 0 && `✗ ${stats.failed} reprovado${stats.failed > 1 ? 's' : ''} `}
                {stats.warning > 0 && `⚠ ${stats.warning} atenção `}
                {stats.pending > 0 && `⏳ ${stats.pending} pendente${stats.pending > 1 ? 's' : ''}`}
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

        {/* Barra de Filtros */}
        {devices.length > 0 && (
          <FilterBar
            activeFiltersCount={activeFilters.length}
            onOpenModal={() => setShowFilterModal(true)}
          />
        )}

        {/* Badges de Filtros Ativos */}
        <ActiveFilterBadges
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        <div className="overflow-x-auto">
          {filteredDevices.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum dispositivo encontrado
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Ajuste os filtros para ver mais resultados
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          ) : (
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
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDevices.map((device, index) => (
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
          )}
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          onClose={handleCloseModal}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal
          devices={devices}
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}
    </>
  )
}
