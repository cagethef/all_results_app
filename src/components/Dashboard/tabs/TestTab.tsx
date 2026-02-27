import { useMemo } from 'react'
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { Device } from '@/types'
import {
  getTestSummary,
  getFailureRanking,
  getParamComparison,
  getDeviationRanking,
  getLeakParamDistribution,
  getLeakFailuresByJig,
  getITPStepApproval,
} from '@/utils/dashboardUtils'
import { StatCard } from '../widgets/StatCard'
import { DonutChart } from '../widgets/DonutChart'
import { ApprovalBarChart } from '../widgets/ApprovalBarChart'
import { FailureRanking } from '../widgets/FailureRanking'
import { ParamComparisonChart } from '../widgets/ParamComparisonChart'
import { DeviationRanking } from '../widgets/DeviationRanking'
import { StepApprovalChart } from '../widgets/StepApprovalChart'
import { ParamFilterPanel } from '../widgets/ParamFilterPanel'

interface TestTabProps {
  devices: Device[]
  testName: string
}

export function TestTab({ devices, testName }: TestTabProps) {
  // Apenas dispositivos que têm esse teste
  const devicesWithTest = useMemo(
    () => devices.filter(d => d.tests.some(t => t.testName === testName)),
    [devices, testName]
  )

  const summary         = useMemo(() => getTestSummary(devices, testName),       [devices, testName])
  const failureRank     = useMemo(() => getFailureRanking(devices, testName),     [devices, testName])
  const paramComparison = useMemo(() => getParamComparison(devices, testName),    [devices, testName])
  const deviationRank   = useMemo(() => getDeviationRanking(devices, testName),   [devices, testName])
  const stepApproval    = useMemo(() => testName === 'ITP' ? getITPStepApproval(devices, testName) : [], [devices, testName])

  // Leak Test: distribuição por parâmetro
  const leakDropDist   = useMemo(() => testName === 'Leak Test' ? getLeakParamDistribution(devices, 'Drop')  : [], [devices, testName])
  const leakSlopeDist  = useMemo(() => testName === 'Leak Test' ? getLeakParamDistribution(devices, 'Slope') : [], [devices, testName])
  const leakByJig      = useMemo(() => testName === 'Leak Test' ? getLeakFailuresByJig(devices) : [],            [devices, testName])

  const leakDropRate  = leakDropDist.find(d => d.name === 'Aprovado')?.value ?? 0
  const leakSlopeRate = leakSlopeDist.find(d => d.name === 'Aprovado')?.value ?? 0
  const leakTotal     = (leakDropDist[0]?.value ?? 0) + (leakDropDist[1]?.value ?? 0)
  const leakHasDist   = leakDropDist.length > 0 || leakSlopeDist.length > 0

  // Distribuição de status apenas para este teste
  const distribution = useMemo(() => {
    const tests = devicesWithTest
      .map(d => d.tests.find(t => t.testName === testName))
      .filter(Boolean) as NonNullable<Device['tests'][number]>[]

    const approved = tests.filter(t => t.status === 'approved').length
    const failed   = tests.filter(t => t.status === 'failed').length
    const pending  = tests.filter(t => t.status === 'pending').length
    const warning  = tests.filter(t => t.status === 'warning').length

    return [
      { name: 'Aprovado',  value: approved, color: '#22c55e' },
      { name: 'Reprovado', value: failed,   color: '#ef4444' },
      { name: 'Pendente',  value: pending,  color: '#f59e0b' },
      { name: 'Atenção',   value: warning,  color: '#f59e0b' },
    ].filter(d => d.value > 0)
  }, [devicesWithTest, testName])

  if (devicesWithTest.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-500 text-sm">
        Nenhum dispositivo com {testName} na sessão.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Taxa de Aprovação"
          value={`${summary.rate}%`}
          sub={`${summary.approved} de ${summary.total} dispositivos`}
          color={summary.rate >= 90 ? 'success' : summary.rate >= 70 ? 'warning' : 'danger'}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Reprovados"
          value={summary.failed}
          sub={summary.failed > 0 ? `${Math.round((summary.failed / summary.total) * 100)}% do total` : 'Nenhum'}
          color={summary.failed > 0 ? 'danger' : 'default'}
          icon={<XCircle size={18} />}
        />
        <StatCard
          label="Pendentes"
          value={summary.pending}
          sub={summary.pending > 0 ? `${Math.round((summary.pending / summary.total) * 100)}% do total` : 'Nenhum'}
          color={summary.pending > 0 ? 'warning' : 'default'}
          icon={<CheckCircle size={18} />}
        />
      </div>

      {/* Donut + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart
          data={distribution}
          title={`Distribuição — ${testName}`}
          centerValue={`${summary.rate}%`}
          centerLabel="aprovação"
        />
        <FailureRanking
          data={failureRank}
          title={`Parâmetros Reprovados — ${testName}`}
        />
      </div>

      {/* ITP: aprovação por step */}
      {stepApproval.length > 0 && (
        <StepApprovalChart
          data={stepApproval}
          title="Aprovação por Step — ITP"
        />
      )}

      {/* Leak Test: donuts por parâmetro (Drop / Slope / R²) */}
      {leakHasDist && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leakDropDist.length > 0 && (
            <DonutChart
              data={leakDropDist}
              title="Drop"
              centerValue={`${leakTotal > 0 ? Math.round((leakDropRate / leakTotal) * 100) : 0}%`}
              centerLabel="aprovação"
            />
          )}
          {leakSlopeDist.length > 0 && (
            <DonutChart
              data={leakSlopeDist}
              title="Slope"
              centerValue={`${leakTotal > 0 ? Math.round((leakSlopeRate / leakTotal) * 100) : 0}%`}
              centerLabel="aprovação"
            />
          )}
        </div>
      )}

      {/* Leak Test: aprovação por jiga */}
      {leakByJig.length > 0 && (
        <ApprovalBarChart
          data={leakByJig}
          title="Taxa de Aprovação por Jiga — Leak Test"
        />
      )}

      {/* Leak Test: filtro por valor numérico de parâmetro */}
      {testName === 'Leak Test' && (
        <ParamFilterPanel
          devices={devices}
          testName="Leak Test"
          title="Filtrar por Valor de Parâmetro"
        />
      )}

      {/* Comparativo referência vs aprovados vs reprovados */}
      {paramComparison.length > 0 && (
        <ParamComparisonChart
          data={paramComparison}
          title={`Comparativo de Referência — ${testName}`}
        />
      )}

      {/* Ranking de desvio % da referência */}
      {deviationRank.length > 0 && (
        <DeviationRanking
          data={deviationRank}
          title={`Desvio da Referência — ${testName}`}
        />
      )}
    </div>
  )
}
