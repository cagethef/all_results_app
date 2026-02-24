import { Device } from '@/types'
import { getFailedItems } from './deviceUtils'

export interface StatusDistribution {
  name: string
  value: number
  color: string
}

export interface DeviceTypeApproval {
  type: string
  total: number
  approved: number
  failed: number
  pending: number
  rate: number // 0-100
}

export interface FailureEntry {
  label: string   // "ATP · Signal"
  test: string
  param: string
  count: number
}

export interface TestSummary {
  testName: string
  total: number
  approved: number
  failed: number
  pending: number
  rate: number
}

// Cores do sistema de design
export const STATUS_COLORS = {
  approved: '#22c55e', // success-500
  failed:   '#ef4444', // danger-500
  pending:  '#f59e0b', // warning-500
  warning:  '#f59e0b',
}

// Distribuição de status geral para o donut
export function getStatusDistribution(devices: Device[]): StatusDistribution[] {
  const approved = devices.filter(d => d.overallStatus === 'approved').length
  const failed   = devices.filter(d => d.overallStatus === 'failed').length
  const pending  = devices.filter(d => d.overallStatus === 'pending').length
  const warning  = devices.filter(d => d.overallStatus === 'warning').length

  return [
    { name: 'Aprovado',  value: approved, color: STATUS_COLORS.approved },
    { name: 'Reprovado', value: failed,   color: STATUS_COLORS.failed   },
    { name: 'Pendente',  value: pending,  color: STATUS_COLORS.pending  },
    { name: 'Atenção',   value: warning,  color: STATUS_COLORS.warning  },
  ].filter(d => d.value > 0)
}

// Taxa de aprovação geral (0-100)
export function getApprovalRate(devices: Device[]): number {
  if (devices.length === 0) return 0
  const approved = devices.filter(d => d.overallStatus === 'approved').length
  return Math.round((approved / devices.length) * 100)
}

// Aprovação por tipo de dispositivo (para barras)
export function getApprovalByDeviceType(devices: Device[]): DeviceTypeApproval[] {
  const map = new Map<string, { total: number; approved: number; failed: number; pending: number }>()

  for (const device of devices) {
    const key = device.deviceType
    if (!map.has(key)) map.set(key, { total: 0, approved: 0, failed: 0, pending: 0 })
    const entry = map.get(key)!
    entry.total++
    if (device.overallStatus === 'approved') entry.approved++
    else if (device.overallStatus === 'failed') entry.failed++
    else entry.pending++
  }

  return Array.from(map.entries())
    .map(([type, data]) => ({
      type,
      ...data,
      rate: Math.round((data.approved / data.total) * 100)
    }))
    .sort((a, b) => b.total - a.total)
}

// Ranking de reprovas (todos os testes ou por teste específico)
export function getFailureRanking(devices: Device[], testName?: string): FailureEntry[] {
  const countMap = new Map<string, { test: string; param: string; count: number }>()

  for (const device of devices) {
    const items = getFailedItems(device)
    for (const item of items) {
      if (testName && item.test !== testName) continue
      const key = `${item.test}||${item.param}`
      if (!countMap.has(key)) {
        countMap.set(key, { test: item.test, param: item.param, count: 0 })
      }
      countMap.get(key)!.count++
    }
  }

  return Array.from(countMap.values())
    .map(entry => ({ ...entry, label: `${entry.test} · ${entry.param}` }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// Sumário por teste (ATP, ITP, Leak)
export function getTestSummary(devices: Device[], testName: string): TestSummary {
  const testsForName = devices
    .map(d => d.tests.find(t => t.testName === testName))
    .filter(Boolean) as NonNullable<Device['tests'][number]>[]

  const total    = testsForName.length
  const approved = testsForName.filter(t => t.status === 'approved').length
  const failed   = testsForName.filter(t => t.status === 'failed').length
  const pending  = testsForName.filter(t => t.status === 'pending').length

  return {
    testName,
    total,
    approved,
    failed,
    pending,
    rate: total > 0 ? Math.round((approved / total) * 100) : 0
  }
}

export interface DeviationEntry {
  param: string
  test: string
  label: string
  measured: number
  reference: number
  deviationPct: number
  unit: string
}

export interface StepApprovalEntry {
  step: string
  total: number
  approved: number
  failed: number
  rate: number
}

export interface ParamComparisonEntry {
  param: string
  reference: number | null
  avgApproved: number | null
  avgFailed: number | null
  unit: string
}

// Extrai número de uma string como "5.38 A", "-34.0 dBm", "0.92", etc.
function parseNumeric(value?: string | number): number | null {
  if (value == null) return null
  if (typeof value === 'number') return isNaN(value) ? null : value
  const match = String(value).match(/[-+]?\d+(\.\d+)?/)
  if (!match) return null
  const n = parseFloat(match[0])
  return isNaN(n) ? null : n
}

// Extrai unidade de uma string como "5.38 A" → "A", "-34.0 dBm" → "dBm"
function parseUnit(value?: string | number): string {
  if (value == null || typeof value === 'number') return ''
  const match = String(value).match(/[-+]?\d+(\.\d+)?\s*([a-zA-Z°%/²]+)/)
  return match ? match[2] : ''
}

// Comparativo referência vs aprovados vs reprovados por parâmetro
export function getParamComparison(devices: Device[], testName: string): ParamComparisonEntry[] {
  // Coletar todos os parâmetros de todos os dispositivos nesse teste
  const paramMap = new Map<string, {
    reference: number[]
    approved: number[]
    failed: number[]
    unit: string
  }>()

  for (const device of devices) {
    const test = device.tests.find(t => t.testName === testName)
    if (!test) continue

    // Suporta parameters[] e sections[]
    const allParams = test.parameters
      ? test.parameters
      : test.sections?.flatMap(s => s.parameters) ?? []

    for (const param of allParams) {
      const measured  = parseNumeric(param.measured)
      const reference = parseNumeric(param.expected)
      if (measured == null) continue

      if (!paramMap.has(param.name)) {
        paramMap.set(param.name, { reference: [], approved: [], failed: [], unit: '' })
      }
      const entry = paramMap.get(param.name)!

      if (!entry.unit) entry.unit = param.unit ?? parseUnit(param.measured)
      if (reference != null) entry.reference.push(reference)
      if (param.status === 'approved') entry.approved.push(measured)
      if (param.status === 'failed')   entry.failed.push(measured)
    }
  }

  const avg = (arr: number[]) => arr.length > 0
    ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4))
    : null

  return Array.from(paramMap.entries())
    .map(([param, data]) => ({
      param,
      reference:   data.reference.length > 0 ? avg(data.reference) : null,
      avgApproved: avg(data.approved),
      avgFailed:   avg(data.failed),
      unit: data.unit,
    }))
    // Só mostra parâmetros que têm pelo menos referência ou aprovados E reprovados
    .filter(e => (e.reference != null || e.avgApproved != null) && e.avgFailed != null)
}

// Quais nomes de testes existem na sessão
export function getAvailableTests(devices: Device[]): string[] {
  const tests = new Set<string>()
  for (const device of devices) {
    for (const test of device.tests) {
      tests.add(test.testName)
    }
  }
  return Array.from(tests).sort()
}

// Ranking de desvio % da referência (parâmetros reprovados com expected numérico)
export function getDeviationRanking(devices: Device[], testName: string): DeviationEntry[] {
  const entries: DeviationEntry[] = []

  for (const device of devices) {
    const test = device.tests.find(t => t.testName === testName)
    if (!test) continue

    const allParams = test.parameters
      ? test.parameters
      : test.sections?.flatMap(s => s.parameters) ?? []

    for (const param of allParams) {
      if (param.status !== 'failed') continue
      const measured  = parseNumeric(param.measured)
      const reference = parseNumeric(param.expected)
      if (measured == null || reference == null || reference === 0) continue

      const deviationPct = Math.abs(((measured - reference) / Math.abs(reference)) * 100)
      entries.push({
        param: param.name,
        test: testName,
        label: param.name,
        measured,
        reference,
        deviationPct: parseFloat(deviationPct.toFixed(2)),
        unit: param.unit ?? parseUnit(param.measured),
      })
    }
  }

  // Média de desvio por parâmetro (pode haver múltiplos dispositivos com o mesmo param reprovado)
  const grouped = new Map<string, DeviationEntry & { count: number; sumDeviation: number }>()
  for (const e of entries) {
    const key = e.param
    if (!grouped.has(key)) {
      grouped.set(key, { ...e, count: 1, sumDeviation: e.deviationPct })
    } else {
      const g = grouped.get(key)!
      g.count++
      g.sumDeviation += e.deviationPct
      g.deviationPct = parseFloat((g.sumDeviation / g.count).toFixed(2))
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.deviationPct - a.deviationPct)
    .slice(0, 10)
}

// Aprovação/reprova do Leak Test agrupada por jiga
export function getLeakFailuresByJig(devices: Device[]): DeviceTypeApproval[] {
  const map = new Map<string, { total: number; approved: number; failed: number; pending: number }>()

  for (const device of devices) {
    const test = device.tests.find(t => t.testName === 'Leak Test')
    if (!test?.sections) continue

    const calibSection = test.sections.find(s => s.name === 'Calibração')
    const jigParam = calibSection?.parameters.find(p => p.name === 'ID da Jiga')
    const jig = (jigParam?.measured as string) || 'Desconhecida'

    if (!map.has(jig)) map.set(jig, { total: 0, approved: 0, failed: 0, pending: 0 })
    const entry = map.get(jig)!
    entry.total++
    if (test.status === 'approved')     entry.approved++
    else if (test.status === 'failed')  entry.failed++
    else                                entry.pending++
  }

  return Array.from(map.entries())
    .map(([type, data]) => ({
      type,
      ...data,
      rate: Math.round((data.approved / data.total) * 100),
    }))
    .sort((a, b) => a.failed - b.failed)
}

// Distribuição de aprovação para um parâmetro específico do Leak Test (Drop, Slope, R²)
export function getLeakParamDistribution(devices: Device[], paramName: string): StatusDistribution[] {
  let approved = 0, failed = 0

  for (const device of devices) {
    const test = device.tests.find(t => t.testName === 'Leak Test')
    if (!test?.sections) continue
    const leakSection = test.sections.find(s => s.name === 'Leak Test')
    if (!leakSection) continue
    const param = leakSection.parameters.find(p => p.name === paramName)
    if (!param) continue
    if (param.status === 'approved') approved++
    else if (param.status === 'failed') failed++
  }

  return [
    { name: 'Aprovado',  value: approved, color: '#22c55e' },
    { name: 'Reprovado', value: failed,   color: '#ef4444' },
  ].filter(d => d.value > 0)
}

// Aprovação por step do ITP (agrupa parâmetros cujo nome começa com "Step N:")
export function getITPStepApproval(devices: Device[], testName: string): StepApprovalEntry[] {
  const stepMap = new Map<string, { total: number; approved: number; failed: number }>()

  for (const device of devices) {
    const test = device.tests.find(t => t.testName === testName)
    if (!test) continue

    const allParams = test.parameters
      ? test.parameters
      : test.sections?.flatMap(s => s.parameters) ?? []

    for (const param of allParams) {
      const match = param.name.match(/^(Step\s+\d+)/i)
      if (!match) continue
      const step = match[1]

      if (!stepMap.has(step)) stepMap.set(step, { total: 0, approved: 0, failed: 0 })
      const entry = stepMap.get(step)!
      entry.total++
      if (param.status === 'approved') entry.approved++
      if (param.status === 'failed')   entry.failed++
    }
  }

  return Array.from(stepMap.entries())
    .map(([step, data]) => ({
      step,
      ...data,
      rate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
    }))
    .sort((a, b) => {
      const numA = parseInt(a.step.replace(/\D/g, ''))
      const numB = parseInt(b.step.replace(/\D/g, ''))
      return numA - numB
    })
}
