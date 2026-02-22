import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Device } from '@/types'
import { getFailedItems } from '@/utils/deviceUtils'
import { DeviceRow } from './DeviceRow'
import { DeviceModal } from '../DeviceModal/DeviceModal'
import { FilterBar, Filters } from './FilterBar'
import { FilterModal } from './FilterModal'
import { ActiveFilterBadges } from './ActiveFilterBadges'

type SortDirection = 'asc' | 'desc' | null
type SortColumn = 'id' | 'overallStatus' | string // string para colunas de teste dinâmicas

interface SortConfig {
  column: SortColumn | null
  direction: SortDirection
}

const STATUS_ORDER: Record<string, number> = {
  approved: 0,
  warning: 1,
  pending: 2,
  failed: 3
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (!direction) {
    return (
      <svg className="w-3.5 h-3.5 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  if (direction === 'asc') {
    return (
      <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

interface DeviceTableProps {
  devices: Device[]
  onClearAll?: () => void
}

export function DeviceTable({ devices, onClearAll }: DeviceTableProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)
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

  // Lógica de ordenação
  const handleSort = useCallback((column: SortColumn) => {
    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' }
      }
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      if (prev.direction === 'desc') return { column: null, direction: null }
      return { column, direction: 'asc' }
    })
  }, [])

  const sortedDevices = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return filteredDevices

    return [...filteredDevices].sort((a, b) => {
      const { column, direction } = sortConfig
      const multiplier = direction === 'asc' ? 1 : -1

      if (column === 'id') {
        return multiplier * a.id.localeCompare(b.id)
      }

      if (column === 'overallStatus') {
        const orderA = STATUS_ORDER[a.overallStatus] ?? 99
        const orderB = STATUS_ORDER[b.overallStatus] ?? 99
        return multiplier * (orderA - orderB)
      }

      // Ordenar por quantidade de reprovas
      if (column === 'reprovas') {
        const countA = getFailedItems(a).length
        const countB = getFailedItems(b).length
        return multiplier * (countA - countB)
      }

      // Colunas de teste (ATP, ITP, Leak Test, etc.)
      const testA = a.tests.find(t => t.testName === column)
      const testB = b.tests.find(t => t.testName === column)
      const orderA = testA ? (STATUS_ORDER[testA.status] ?? 99) : 100
      const orderB = testB ? (STATUS_ORDER[testB.status] ?? 99) : 100
      return multiplier * (orderA - orderB)
    })
  }, [filteredDevices, sortConfig])

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

  // Mostrar coluna REPROVAS apenas se ao menos 1 dispositivo tiver parâmetros reprovados
  const hasReprovasColumn = useMemo(() => {
    return filteredDevices.some(device => getFailedItems(device).length > 0)
  }, [filteredDevices])

  // Selection logic
  const allVisibleSelected = sortedDevices.length > 0 && sortedDevices.every(d => selectedIds.has(d.id))
  const someVisibleSelected = sortedDevices.some(d => selectedIds.has(d.id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [someVisibleSelected, allVisibleSelected])

  const handleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedDevices.map(d => d.id)))
    }
  }, [allVisibleSelected, sortedDevices])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCopyIds = useCallback(() => {
    const ids = Array.from(selectedIds).join(', ')
    navigator.clipboard.writeText(ids)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [selectedIds])

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
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleCopyIds}
                  className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar {selectedIds.size} ID{selectedIds.size > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClearAll}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Limpar Todos
              </button>
            </div>
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
                  {/* Checkbox select-all */}
                  <th className="pl-4 pr-2 py-4 w-8">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] cursor-pointer accent-primary-600"
                    />
                  </th>
                  {/* ID Dispositivo - ordenável */}
                  <th
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1.5">
                      ID Dispositivo
                      <SortIcon direction={sortConfig.column === 'id' ? sortConfig.direction : null} />
                    </div>
                  </th>
                  {hasChipColumn && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Conectividade
                    </th>
                  )}
                  {/* Colunas de teste - ordenáveis */}
                  {testColumns.map(testName => (
                    <th
                      key={testName}
                      className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                      onClick={() => handleSort(testName)}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {testName}
                        <SortIcon direction={sortConfig.column === testName ? sortConfig.direction : null} />
                      </div>
                    </th>
                  ))}
                  {/* Status Geral - ordenável */}
                  <th
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => handleSort('overallStatus')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Status Geral
                      <SortIcon direction={sortConfig.column === 'overallStatus' ? sortConfig.direction : null} />
                    </div>
                  </th>
                  {/* Coluna REPROVAS - aparece só se tiver ao menos 1 reprovado */}
                  {hasReprovasColumn && (
                    <th
                      className="px-6 py-4 text-left text-xs font-bold text-danger-600 dark:text-danger-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                      onClick={() => handleSort('reprovas')}
                    >
                      <div className="flex items-center gap-1.5">
                        Reprovas
                        <SortIcon direction={sortConfig.column === 'reprovas' ? sortConfig.direction : null} />
                      </div>
                    </th>
                  )}
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedDevices.map((device, index) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    testColumns={testColumns}
                    hasChipColumn={hasChipColumn}
                    hasReprovasColumn={hasReprovasColumn}
                    onClick={() => handleDeviceClick(device)}
                    index={index}
                    isSelected={selectedIds.has(device.id)}
                    onToggle={handleToggleSelect}
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
