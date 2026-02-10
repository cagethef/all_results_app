import { useState } from 'react'
import { X, Cpu } from 'lucide-react'
import { Device } from '@/types'
import { TestContent } from './TestContent'
import { ChipContent } from './ChipContent'
import { StatusIcon } from '../shared/StatusIcon'
import { getDeviceIcon, getDeviceIconColor } from '@/utils/deviceIcons'

interface DeviceModalProps {
  device: Device
  onClose: () => void
}

export function DeviceModal({ device, onClose }: DeviceModalProps) {
  const [activeTestIndex, setActiveTestIndex] = useState(0)
  const [showChips, setShowChips] = useState(false)

  const activeTest = !showChips ? device.tests[activeTestIndex] : null
  const DeviceIcon = getDeviceIcon(device.deviceType)
  const iconColors = getDeviceIconColor(device.deviceType)
  
  // Extrair prefixo do lote (YYYYMMDD_XX)
  const batchPrefix = device.batch ? device.batch.match(/^(\d{8}_\d{2})/)?.[1] : null

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
            <div className={`w-10 h-10 ${iconColors.bg} rounded-lg flex items-center justify-center`}>
              <DeviceIcon className={iconColors.text} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {device.id}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{device.deviceType}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {batchPrefix && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Lote: #{batchPrefix}
                  </p>
                )}
                {activeTest?.date && (
                  <>
                    {batchPrefix && (
                      <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Testado em: {new Date(activeTest.date).toLocaleDateString('pt-BR')}
                    </p>
                  </>
                )}
              </div>
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

        {/* Tabs */}
        {device.tests.length > 0 || device.chipInfo ? (
          <>
            {/* Combined Tabs: Tests + Chips */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414] px-6">
              <div className="flex gap-1 overflow-x-auto">
                {/* Test Tabs */}
                {device.tests.map((test, index) => {
                  const isActive = !showChips && index === activeTestIndex
                  return (
                    <button
                      key={`test-${index}`}
                      onClick={() => {
                        setShowChips(false)
                        setActiveTestIndex(index)
                      }}
                      className={`flex items-center gap-2.5 px-5 py-4 border-b-3 transition-all whitespace-nowrap relative group ${
                        isActive
                          ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-semibold'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] font-medium'
                      }`}
                    >
                      <span className="text-sm">{test.testName}</span>
                      <div className="scale-90">
                        <StatusIcon status={test.status} size={18} />
                      </div>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600" />
                      )}
                    </button>
                  )
                })}

                {/* Chip Info Tab */}
                {device.chipInfo && (
                  <button
                    onClick={() => setShowChips(true)}
                    className={`flex items-center gap-2.5 px-5 py-4 border-b-3 transition-all whitespace-nowrap relative group ${
                      showChips
                        ? 'border-purple-600 text-purple-700 dark:text-purple-400 font-semibold'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] font-medium'
                    }`}
                  >
                    <Cpu size={20} className={showChips ? 'text-purple-600' : ''} />
                    <span className="text-sm">Chip Info</span>
                    {showChips && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#0a0a0a]">
              {showChips && device.chipInfo ? (
                <ChipContent chipInfo={device.chipInfo} />
              ) : activeTest ? (
                <TestContent test={activeTest} />
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Nenhum conteúdo disponível
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12 bg-gray-50/50 dark:bg-[#0a0a0a]">
            <div className="text-center max-w-md">
              <div className="w-14 h-14 bg-gray-200 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg mb-2">Nenhum teste disponível</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Os dados de teste ainda não foram carregados para este dispositivo
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414]">
          <div className="flex gap-3">
            {!showChips && (
              <>
                <button
                  onClick={() => setActiveTestIndex(Math.max(0, activeTestIndex - 1))}
                  disabled={activeTestIndex === 0}
                  className="px-4 py-2 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-gray-300 dark:border-gray-700"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setActiveTestIndex(Math.min(device.tests.length - 1, activeTestIndex + 1))}
                  disabled={activeTestIndex === device.tests.length - 1}
                  className="px-4 py-2 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-gray-300 dark:border-gray-700"
                >
                  Próximo →
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
