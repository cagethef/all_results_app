import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { StatusDistribution } from '@/utils/dashboardUtils'

interface DonutChartProps {
  data: StatusDistribution[]
  title: string
  centerLabel?: string
  centerValue?: string | number
}

interface TooltipPayload {
  name: string
  value: number
  payload: StatusDistribution
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <span className="font-semibold text-gray-900 dark:text-white">{item.name}: </span>
      <span className="text-gray-600 dark:text-gray-300">{item.value}</span>
    </div>
  )
}

function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</p>
      <div className="relative" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Label central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-10px' }}>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {centerValue ?? total}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {centerLabel ?? 'Total'}
          </span>
        </div>
      </div>
    </div>
  )
}
