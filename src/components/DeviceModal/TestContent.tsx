import { useState } from 'react'
import { Test } from '@/types'
import { ParameterTable } from './ParameterTable'
import { StatusIcon } from '../shared/StatusIcon'

interface TestContentProps {
  test: Test
}

export function TestContent({ test }: TestContentProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Determinar se usa sections ou parameters
  const hasSections = test.sections && test.sections.length > 0
  const hasParameters = test.parameters && test.parameters.length > 0

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className={`p-6 rounded-xl border ${
        test.status === 'approved'
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30'
          : test.status === 'failed'
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
          : test.status === 'warning'
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30'
          : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <StatusIcon status={test.status} size={32} />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{test.testName}</h3>
                <p
                  className={`text-sm font-medium mt-1 ${
                    test.status === 'approved'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : test.status === 'failed'
                      ? 'text-red-700 dark:text-red-400'
                      : test.status === 'warning'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {test.status === 'approved' && '✓ Teste Aprovado'}
                  {test.status === 'failed' && '✗ Teste Reprovado'}
                  {test.status === 'warning' && '⚠ Atenção Necessária'}
                  {test.status === 'pending' && '⏳ Aguardando Teste'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs (se houver sections) */}
      {hasSections && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {test.sections!.map((section, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${
                  activeTab === index
                    ? 'bg-white dark:bg-[#141414] text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parameters Table */}
      {hasSections ? (
        // Renderizar seção ativa
        test.sections![activeTab].parameters.length > 0 ? (
          <ParameterTable
            parameters={test.sections![activeTab].parameters}
            variant={test.sections![activeTab].name === 'Calibração' ? 'info' : test.sections![activeTab].name === 'Vibration Tests' ? 'vibration' : 'default'}
            hideStatus={test.sections![activeTab].name === 'Calibração'}
          />
        ) : (
          <div className="text-center py-12 bg-white dark:bg-[#141414] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-14 h-14 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-semibold">Nenhum parâmetro disponível</p>
          </div>
        )
      ) : hasParameters ? (
        // Renderizar parameters (modo legado)
        <ParameterTable parameters={test.parameters!} />
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#141414] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-14 h-14 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">Nenhum parâmetro disponível</p>
        </div>
      )}

      {/* Test Metadata */}
      {test.responsible && (
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Responsável</p>
            <p className="text-sm text-gray-900 dark:text-white font-semibold">{test.responsible}</p>
          </div>
        </div>
      )}

      {/* Observations */}
      {test.observations && (
        <div className="p-4 bg-white dark:bg-[#141414] rounded-lg border border-blue-200 dark:border-blue-900/30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Observações</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{test.observations}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
