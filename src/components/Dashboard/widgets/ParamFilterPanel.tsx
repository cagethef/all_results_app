import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { Device, Parameter } from '@/types'

interface ParamFilterPanelProps {
  devices: Device[]
  testName: string
  title?: string
}

type Operator = '>' | '<' | '>=' | '<='

// Extrai valor numérico do parâmetro: usa rawValue se disponível, senão parseia o measured
function getNumericValue(p: Parameter): number | null {
  if (p.rawValue != null) return p.rawValue
  if (p.measured == null) return null
  const n = parseFloat(String(p.measured))
  return isNaN(n) ? null : n
}

// Todos os parâmetros de um teste (lida com parameters direto ou sections)
function getAllParams(device: Device, testName: string): Parameter[] {
  const test = device.tests.find(t => t.testName === testName)
  if (!test) return []
  return test.parameters ?? test.sections?.flatMap(s => s.parameters) ?? []
}

export function ParamFilterPanel({ devices, testName, title = 'Filtrar por Valor' }: ParamFilterPanelProps) {
  const [selectedParam, setSelectedParam] = useState('')
  const [operator, setOperator] = useState<Operator>('>')
  const [threshold, setThreshold] = useState('')
  const [copied, setCopied] = useState(false)

  // Coleta todos os parâmetros que têm valor numérico (rawValue ou measured parseável)
  const availableParams = useMemo(() => {
    const names = new Set<string>()
    for (const device of devices) {
      getAllParams(device, testName).forEach(p => {
        if (getNumericValue(p) != null) names.add(p.name)
      })
    }
    return Array.from(names).sort()
  }, [devices, testName])

  const param = selectedParam || availableParams[0] || ''

  // Dispositivos que batem com o filtro
  const matchedDevices = useMemo(() => {
    const val = parseFloat(threshold)
    if (!param || isNaN(val)) return []

    return devices.filter(device => {
      const p = getAllParams(device, testName).find(p => p.name === param)
      if (!p) return false
      const v = getNumericValue(p)
      if (v == null) return false

      switch (operator) {
        case '>':  return v >  val
        case '<':  return v <  val
        case '>=': return v >= val
        case '<=': return v <= val
      }
    })
  }, [devices, testName, param, operator, threshold])

  const ids = matchedDevices.map(d => d.id)

  const handleCopy = () => {
    if (ids.length === 0) return
    navigator.clipboard.writeText(ids.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (availableParams.length === 0) return null

  const hasThreshold = threshold !== '' && !isNaN(parseFloat(threshold))

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>

      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={param}
          onChange={e => setSelectedParam(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {availableParams.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={operator}
          onChange={e => setOperator(e.target.value as Operator)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value=">">maior que (&gt;)</option>
          <option value="<">menor que (&lt;)</option>
          <option value=">=">maior ou igual (≥)</option>
          <option value="<=">menor ou igual (≤)</option>
        </select>

        <input
          type="number"
          step="any"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          placeholder="ex: -0.700"
          className="w-36 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      </div>

      {/* Resultado */}
      {hasThreshold && (
        <div className="mt-4">
          {ids.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum dispositivo encontrado.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {ids.length} dispositivo{ids.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                  {copied ? <><Check size={13} />Copiado!</> : <><Copy size={13} />Copiar IDs</>}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {ids.map(id => (
                  <span
                    key={id}
                    className="px-2 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
