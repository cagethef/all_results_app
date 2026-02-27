import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'success' | 'danger' | 'warning' | 'primary'
  icon?: React.ReactNode
}

const colorMap = {
  default: 'text-gray-900 dark:text-white',
  success: 'text-success-500',
  danger:  'text-danger-500',
  warning: 'text-warning-500',
  primary: 'text-primary-500',
}

export function StatCard({ label, value, sub, color = 'default', icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl p-5 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}
