import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { StepApprovalEntry } from '@/utils/dashboardUtils'

interface Props {
  data: StepApprovalEntry[]
  title?: string
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const total = (payload.find(p => p.name === 'Aprovados')?.value ?? 0)
              + (payload.find(p => p.name === 'Reprovados')?.value ?? 0)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gray-200 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-mono font-semibold text-gray-100">{p.value}</span>
        </div>
      ))}
      {total > 0 && (
        <div className="mt-1 pt-1 border-t border-gray-700 flex gap-2">
          <span className="text-gray-400">Taxa:</span>
          <span className="font-mono font-semibold text-green-400">
            {Math.round(((payload.find(p => p.name === 'Aprovados')?.value ?? 0) / total) * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

export function StepApprovalChart({ data, title }: Props) {
  if (data.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-5">
      {title && <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>}

      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 56)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
          barCategoryGap="30%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="step"
            width={70}
            tick={{ fill: '#d1d5db', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 12 }} iconType="square" iconSize={10} />

          <Bar dataKey="approved" name="Aprovados" fill="#22c55e" radius={[0, 3, 3, 0]} stackId="a">
            <LabelList
              dataKey="rate"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fill: '#9ca3af', fontSize: 11 }}
            />
          </Bar>
          <Bar dataKey="failed" name="Reprovados" fill="#ef4444" radius={[0, 3, 3, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
