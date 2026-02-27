import { useMemo } from 'react'
import { CheckCircle, XCircle, Package, TrendingUp } from 'lucide-react'
import { Device } from '@/types'
import {
  getStatusDistribution,
  getApprovalRate,
  getApprovalByDeviceType,
  getFailureRanking,
} from '@/utils/dashboardUtils'
import { StatCard } from '../widgets/StatCard'
import { DonutChart } from '../widgets/DonutChart'
import { ApprovalBarChart } from '../widgets/ApprovalBarChart'
import { FailureRanking } from '../widgets/FailureRanking'

interface GeneralTabProps {
  devices: Device[]
}

export function GeneralTab({ devices }: GeneralTabProps) {
  const distribution  = useMemo(() => getStatusDistribution(devices), [devices])
  const approvalRate  = useMemo(() => getApprovalRate(devices), [devices])
  const byDeviceType  = useMemo(() => getApprovalByDeviceType(devices), [devices])
  const failureRank   = useMemo(() => getFailureRanking(devices), [devices])

  const failed  = devices.filter(d => d.overallStatus === 'failed').length
  const pending = devices.filter(d => d.overallStatus === 'pending').length

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={devices.length}
          sub="dispositivos na sessão"
          icon={<Package size={18} />}
        />
        <StatCard
          label="Taxa de Aprovação"
          value={`${approvalRate}%`}
          sub={`${devices.filter(d => d.overallStatus === 'approved').length} aprovados`}
          color={approvalRate >= 90 ? 'success' : approvalRate >= 70 ? 'warning' : 'danger'}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Reprovados"
          value={failed}
          sub={failed > 0 ? `${Math.round((failed / devices.length) * 100)}% do total` : 'Nenhum'}
          color={failed > 0 ? 'danger' : 'default'}
          icon={<XCircle size={18} />}
        />
        <StatCard
          label="Pendentes"
          value={pending}
          sub={pending > 0 ? `${Math.round((pending / devices.length) * 100)}% do total` : 'Nenhum'}
          color={pending > 0 ? 'warning' : 'default'}
          icon={<CheckCircle size={18} />}
        />
      </div>

      {/* Donut + Bar por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart
          data={distribution}
          title="Distribuição de Status"
          centerValue={`${approvalRate}%`}
          centerLabel="aprovação"
        />
        <ApprovalBarChart
          data={byDeviceType}
          title="Taxa de Aprovação por Tipo de Dispositivo"
        />
      </div>

      {/* Ranking de reprovas */}
      <FailureRanking
        data={failureRank}
        title="Top Parâmetros Reprovados"
      />
    </div>
  )
}
