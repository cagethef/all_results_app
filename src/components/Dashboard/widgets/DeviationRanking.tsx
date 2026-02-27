import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DeviationEntry } from '@/utils/dashboardUtils'

interface Props {
  data: DeviationEntry[]
  title?: string
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number; payload: DeviationEntry }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const fmt = (v: number) => Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gray-200 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex gap-2">
          <span className="text-gray-400">Medido:</span>
          <span className="font-mono text-white">{fmt(d.measured)}{d.unit ? ` ${d.unit}` : ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400">Referência:</span>
          <span className="font-mono text-blue-300">{fmt(d.reference)}{d.unit ? ` ${d.unit}` : ''}</span>
        </div>
        <div className="flex gap-2 mt-1 pt-1 border-t border-gray-700">
          <span className="text-gray-400">Desvio:</span>
          <span className="font-mono font-semibold text-red-400">+{d.deviationPct}%</span>
        </div>
      </div>
    </div>
  )
}

// Cor por severidade do desvio
function deviationColor(pct: number): string {
  if (pct >= 50) return '#ef4444'
  if (pct >= 20) return '#f97316'
  if (pct >= 10) return '#f59e0b'
  return '#eab308'
}

function truncate(s: string, max = 20) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function DeviationRanking({ data, title }: Props) {
  if (data.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-5">
      {title && <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>}

      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            unit="%"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="param"
            width={140}
            tick={{ fill: '#d1d5db', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => truncate(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="deviationPct" name="Desvio %" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11, formatter: (v: unknown) => `${v}%` }}>
            {data.map((entry, i) => (
              <Cell key={i} fill={deviationColor(entry.deviationPct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
