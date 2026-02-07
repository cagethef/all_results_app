import { X, Filter, CheckCircle2, XCircle, AlertTriangle, Clock, Smartphone, Wifi, WifiOff, Cpu, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { Device } from '@/types'
import { Filters } from './FilterBar'

interface FilterModalProps {
  devices: Device[]
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onClose: () => void
}

interface FilterCardProps {
  icon: React.ReactNode
  label: string
  isSelected: boolean
  onClick: () => void
}

function FilterCard({ icon, label, isSelected, onClick }: FilterCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-primary-300 dark:hover:border-primary-700'
      }`}
    >
      <div
        className={`${
          isSelected
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-sm font-medium text-center ${
          isSelected
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export function FilterModal({ devices, filters, onFiltersChange, onClose }: FilterModalProps) {
  // Detectar tipos de dispositivos disponíveis
  const deviceTypes = useMemo(() => {
    const types = new Set(devices.map(d => d.deviceType))
    return Array.from(types).sort()
  }, [devices])

  // Detectar operadoras disponíveis
  const carriers = useMemo(() => {
    const carrierSet = new Set<string>()
    devices.forEach(device => {
      if (device.chipInfo?.chip1.carrier && device.chipInfo.chip1.carrier !== 'Inativo') {
        carrierSet.add(device.chipInfo.chip1.carrier)
      }
      if (device.chipInfo?.chip2?.carrier && device.chipInfo.chip2.carrier !== 'Inativo') {
        carrierSet.add(device.chipInfo.chip2.carrier)
      }
    })
    return Array.from(carrierSet).sort()
  }, [devices])

  // Detectar testes disponíveis
  const testNames = useMemo(() => {
    const tests = new Set<string>()
    devices.forEach(device => {
      device.tests.forEach(test => tests.add(test.testName))
    })
    return Array.from(tests).sort()
  }, [devices])

  // Detectar tipos de conectividade disponíveis
  const availableConnectivity = useMemo(() => {
    const connectivity = new Set<string>()
    devices.forEach(device => {
      if (!device.chipInfo) {
        connectivity.add('none')
      } else if (device.chipInfo.type === 'Single Chip') {
        connectivity.add('single')
      } else if (device.chipInfo.type === 'Dual Chip') {
        connectivity.add('dual')
      } else if (device.chipInfo.type === 'Não Identificado') {
        connectivity.add('unidentified')
      }
    })
    return connectivity
  }, [devices])

  // Detectar status gerais disponíveis
  const availableOverallStatus = useMemo(() => {
    const statuses = new Set<string>()
    devices.forEach(device => {
      statuses.add(device.overallStatus)
    })
    return statuses
  }, [devices])

  // Ícones para tipos de dispositivo
  const getDeviceTypeIcon = (type: string) => {
    if (type.includes('Trac')) return <Cpu size={24} />
    if (type.includes('Receiver')) return <Wifi size={24} />
    return <Smartphone size={24} />
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#141414] rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Filter className="text-primary-600 dark:text-primary-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filtrar Dispositivos
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecione os critérios de filtro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="text-gray-500 dark:text-gray-400" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Tipo de Dispositivo */}
          {deviceTypes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Smartphone size={16} />
                Tipo de Dispositivo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <FilterCard
                  icon={<Smartphone size={24} />}
                  label="Todos"
                  value="all"
                  isSelected={filters.deviceType === 'all'}
                  onClick={() => onFiltersChange({ ...filters, deviceType: 'all' })}
                />
                {deviceTypes.map(type => (
                  <FilterCard
                    key={type}
                    icon={getDeviceTypeIcon(type)}
                    label={type}
                    value={type}
                    isSelected={filters.deviceType === type}
                    onClick={() => onFiltersChange({ ...filters, deviceType: type })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Conectividade */}
          {availableConnectivity.size > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wifi size={16} />
                Conectividade
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <FilterCard
                  icon={<Wifi size={24} />}
                  label="Todos"
                  value="all"
                  isSelected={filters.connectivity === 'all'}
                  onClick={() => onFiltersChange({ ...filters, connectivity: 'all' })}
                />
                {availableConnectivity.has('single') && (
                  <FilterCard
                    icon={<Wifi size={24} />}
                    label="Single Chip"
                    value="single"
                    isSelected={filters.connectivity === 'single'}
                    onClick={() => onFiltersChange({ ...filters, connectivity: 'single' })}
                  />
                )}
                {availableConnectivity.has('dual') && (
                  <FilterCard
                    icon={<Wifi size={24} />}
                    label="Dual Chip"
                    value="dual"
                    isSelected={filters.connectivity === 'dual'}
                    onClick={() => onFiltersChange({ ...filters, connectivity: 'dual' })}
                  />
                )}
                {availableConnectivity.has('unidentified') && (
                  <FilterCard
                    icon={<AlertTriangle size={24} />}
                    label="Não Identificado"
                    value="unidentified"
                    isSelected={filters.connectivity === 'unidentified'}
                    onClick={() => onFiltersChange({ ...filters, connectivity: 'unidentified' })}
                  />
                )}
                {availableConnectivity.has('none') && (
                  <FilterCard
                    icon={<WifiOff size={24} />}
                    label="Sem Info"
                    value="none"
                    isSelected={filters.connectivity === 'none'}
                    onClick={() => onFiltersChange({ ...filters, connectivity: 'none' })}
                  />
                )}
              </div>
            </div>
          )}

          {/* Operadora */}
          {carriers.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wifi size={16} />
                Operadora
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <FilterCard
                  icon={<Wifi size={24} />}
                  label="Todas"
                  value="all"
                  isSelected={filters.carrier === 'all'}
                  onClick={() => onFiltersChange({ ...filters, carrier: 'all' })}
                />
                {carriers.map(carrier => (
                  <FilterCard
                    key={carrier}
                    icon={<Wifi size={24} />}
                    label={carrier}
                    value={carrier}
                    isSelected={filters.carrier === carrier}
                    onClick={() => onFiltersChange({ ...filters, carrier: carrier })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status por Teste */}
          {testNames.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap size={16} />
                Filtrar por Teste
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <FilterCard
                  icon={<Zap size={24} />}
                  label="Todos os Testes"
                  value="all"
                  isSelected={filters.testStatus.testName === 'all'}
                  onClick={() => onFiltersChange({ 
                    ...filters, 
                    testStatus: { testName: 'all', status: 'all' } 
                  })}
                />
                {testNames.map(test => (
                  <FilterCard
                    key={test}
                    icon={<Zap size={24} />}
                    label={test}
                    value={test}
                    isSelected={filters.testStatus.testName === test}
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      testStatus: { ...filters.testStatus, testName: test } 
                    })}
                  />
                ))}
              </div>

              {/* Status do teste selecionado */}
              {filters.testStatus.testName !== 'all' && (
                <div className="mt-4 pl-4 border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/10 p-4 rounded-r-lg">
                  <h4 className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-3">
                    Status do {filters.testStatus.testName}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FilterCard
                      icon={<CheckCircle2 size={24} />}
                      label="Todos"
                      value="all"
                      isSelected={filters.testStatus.status === 'all'}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        testStatus: { ...filters.testStatus, status: 'all' } 
                      })}
                    />
                    <FilterCard
                      icon={<CheckCircle2 size={24} />}
                      label="Aprovado"
                      value="approved"
                      isSelected={filters.testStatus.status === 'approved'}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        testStatus: { ...filters.testStatus, status: 'approved' } 
                      })}
                    />
                    <FilterCard
                      icon={<XCircle size={24} />}
                      label="Reprovado"
                      value="failed"
                      isSelected={filters.testStatus.status === 'failed'}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        testStatus: { ...filters.testStatus, status: 'failed' } 
                      })}
                    />
                    <FilterCard
                      icon={<Clock size={24} />}
                      label="Pendente"
                      value="pending"
                      isSelected={filters.testStatus.status === 'pending'}
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        testStatus: { ...filters.testStatus, status: 'pending' } 
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Geral */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Status Geral do Dispositivo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <FilterCard
                icon={<CheckCircle2 size={24} />}
                label="Todos"
                value="all"
                isSelected={filters.overallStatus === 'all'}
                onClick={() => onFiltersChange({ ...filters, overallStatus: 'all' })}
              />
              {availableOverallStatus.has('approved') && (
                <FilterCard
                  icon={<CheckCircle2 size={24} />}
                  label="Aprovado"
                  value="approved"
                  isSelected={filters.overallStatus === 'approved'}
                  onClick={() => onFiltersChange({ ...filters, overallStatus: 'approved' })}
                />
              )}
              {availableOverallStatus.has('failed') && (
                <FilterCard
                  icon={<XCircle size={24} />}
                  label="Reprovado"
                  value="failed"
                  isSelected={filters.overallStatus === 'failed'}
                  onClick={() => onFiltersChange({ ...filters, overallStatus: 'failed' })}
                />
              )}
              {availableOverallStatus.has('warning') && (
                <FilterCard
                  icon={<AlertTriangle size={24} />}
                  label="Atenção"
                  value="warning"
                  isSelected={filters.overallStatus === 'warning'}
                  onClick={() => onFiltersChange({ ...filters, overallStatus: 'warning' })}
                />
              )}
              {availableOverallStatus.has('pending') && (
                <FilterCard
                  icon={<Clock size={24} />}
                  label="Pendente"
                  value="pending"
                  isSelected={filters.overallStatus === 'pending'}
                  onClick={() => onFiltersChange({ ...filters, overallStatus: 'pending' })}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
          <button
            onClick={() => onFiltersChange({
              deviceType: 'all',
              connectivity: 'all',
              carrier: 'all',
              testStatus: { testName: 'all', status: 'all' },
              overallStatus: 'all'
            })}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            Limpar Filtros
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
