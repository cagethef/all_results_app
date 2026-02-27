import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { DeviceTypeApproval } from '@/utils/dashboardUtils'

interface ApprovalBarChartProps {
  data: DeviceTypeApproval[]
  title: string
}

interface TooltipPayload {
  payload: DeviceTypeApproval
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">{d.type}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success-500" />
        <span className="text-gray-600 dark:text-gray-300">Aprovados: <b>{d.approved}</b></span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-danger-500" />
        <span className="text-gray-600 dark:text-gray-300">Reprovados: <b>{d.failed}</b></span>
      </div>
      {d.pending > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning-500" />
          <span className="text-gray-600 dark:text-gray-300">Pendentes: <b>{d.pending}</b></span>
        </div>
      )}
      <p className="text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
        Taxa: <b className="text-gray-900 dark:text-white">{d.rate}%</b>
      </p>
    </div>
  )
}

function getBarColor(rate: number): string {
  if (rate >= 90) return '#22c55e' // success
  if (rate >= 70) return '#f59e0b' // warning
  return '#ef4444'                 // danger
}

// Trunca nomes longos de dispositivo
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    'Smart Trac Ultra Gen 2': 'STU Gen 2',
    'Smart Trac Ultra':       'STU',
    'Smart Receiver Ultra':   'Receiver',
    'Omni Receiver':          'Omni Rec.',
    'OmniTrac':               'OmniTrac',
    'EnergyTrac':             'Energy',
    'Unitrac':                'Unitrac',
  }
  return map[name] ?? name
}

export function ApprovalBarChart({ data, title }: ApprovalBarChartProps) {
  if (data.length === 0) return null

  const chartData = data.map(d => ({ ...d, shortType: shortLabel(d.type) }))

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
            <XAxis
              dataKey="shortType"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.rate)} />
              ))}
              <LabelList
                dataKey="rate"
                position="top"
                formatter={(v: unknown) => `${v}%`}
                style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
