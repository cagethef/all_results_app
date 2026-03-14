import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { BarChart3, Download, Loader2, ChevronDown, FileText, Files } from 'lucide-react'
import { Device } from '@/types'
import { getAvailableTests } from '@/utils/dashboardUtils'
import { exportDashboardPdf, exportAllTabsPdf, buildFilename } from '@/utils/exportPdf'
import { GeneralTab } from './tabs/GeneralTab'
import { TestTab } from './tabs/TestTab'

interface DashboardProps {
  devices: Device[]
}

// Aguarda o próximo frame de renderização
function waitFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 120)))
}

export function Dashboard({ devices }: DashboardProps) {
  const availableTests = useMemo(() => getAvailableTests(devices), [devices])
  const tabs = ['Geral', ...availableTests]
  const [activeTab, setActiveTab]   = useState('Geral')
  const [exporting, setExporting]   = useState(false)
  const [exportLabel, setExportLabel] = useState('')
  const [showMenu, setShowMenu]     = useState(false)
  const contentRef  = useRef<HTMLDivElement>(null)
  const menuRef     = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Exporta somente a aba atual
  const handleExportCurrent = useCallback(async () => {
    if (!contentRef.current || exporting) return
    setShowMenu(false)
    setExporting(true)
    setExportLabel('Exportando…')
    try {
      await exportDashboardPdf(contentRef.current, buildFilename(activeTab))
    } finally {
      setExporting(false)
      setExportLabel('')
    }
  }, [activeTab, exporting])

  // Exporta todas as abas — cada uma como página do seu tamanho exato
  const handleExportAll = useCallback(async () => {
    if (!contentRef.current || exporting) return
    setShowMenu(false)
    setExporting(true)

    const originalTab = activeTab
    try {
      await exportAllTabsPdf(
        () => contentRef.current,
        tabs,
        (tab) => setActiveTab(tab),
        waitFrame,
        (label) => setExportLabel(label),
        buildFilename('completo')
      )
    } finally {
      setActiveTab(originalTab)
      setExporting(false)
      setExportLabel('')
    }
  }, [activeTab, exporting, tabs])

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mb-4">
          <BarChart3 className="text-gray-400 dark:text-gray-500" size={28} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Nenhum dado para exibir
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Adicione dispositivos na aba <span className="font-semibold">Consultar</span> para ver o dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-violet-500/10 dark:bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-violet-200 dark:ring-violet-500/30">
            <BarChart3 className="text-violet-600 dark:text-violet-400" size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Análise da sessão</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {devices.length} dispositivo{devices.length > 1 ? 's' : ''} carregado{devices.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => !exporting && setShowMenu(v => !v)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
          >
            {exporting
              ? <><Loader2 size={15} className="animate-spin" />{exportLabel || 'Exportando…'}</>
              : <><Download size={15} />Exportar PDF<ChevronDown size={14} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} /></>
            }
          </button>

          {showMenu && !exporting && (
            <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                onClick={handleExportCurrent}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FileText size={15} className="text-primary-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Aba atual</p>
                  <p className="text-xs text-gray-400">Exporta somente "{activeTab}"</p>
                </div>
              </button>
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <button
                onClick={handleExportAll}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Files size={15} className="text-primary-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Todas as abas</p>
                  <p className="text-xs text-gray-400">Gera PDF com {tabs.length} página{tabs.length !== 1 ? 's' : ''}</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-all border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 bg-white dark:bg-[#141414]'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6" ref={contentRef}>
          {activeTab === 'Geral'
            ? <GeneralTab devices={devices} />
            : <TestTab devices={devices} testName={activeTab} />
          }
        </div>
      </div>
    </div>
  )
}
