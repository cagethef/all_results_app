import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ParamComparisonEntry } from '@/utils/dashboardUtils'

interface Props {
  data: ParamComparisonEntry[]
  title?: string
}

interface TooltipPayload {
  name: string
  value: number
  color: string
  dataKey: string
  payload: ParamComparisonEntry & { unit?: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function fmt(v: number | null, unit: string) {
  if (v == null) return '—'
  const s = Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)
  return unit ? `${s} ${unit}` : s
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const unit = payload[0]?.payload?.unit ?? ''
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gray-200 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-mono font-semibold text-gray-100">{fmt(p.value, unit)}</span>
        </div>
      ))}
    </div>
  )
}

// Trunca labels longas para o eixo X
function truncate(s: string, max = 16) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function ParamComparisonChart({ data, title }: Props) {
  if (data.length === 0) return null

  const hasReference = data.some(d => d.reference != null)

  // Recharts precisa de chaves homogêneas; null → undefined para não renderizar
  const chartData = data.map(d => ({
    ...d,
    reference:   d.reference   ?? undefined,
    avgApproved: d.avgApproved ?? undefined,
    avgFailed:   d.avgFailed   ?? undefined,
  }))

  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-5">
      {title && (
        <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 52)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          barCategoryGap="25%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="param"
            width={130}
            tick={{ fill: '#d1d5db', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => truncate(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 12 }}
            iconType="square"
            iconSize={10}
          />

          {hasReference && (
            <Bar dataKey="reference" name="Referência" fill="#60a5fa" radius={[0, 3, 3, 0]} />
          )}
          <Bar dataKey="avgApproved" name="Média Aprovados" fill="#22c55e" radius={[0, 3, 3, 0]} />
          <Bar dataKey="avgFailed"   name="Média Reprovados" fill="#ef4444" radius={[0, 3, 3, 0]} />

          {/* Linha vertical em 0 para facilitar leitura de valores negativos */}
          <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="4 2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
