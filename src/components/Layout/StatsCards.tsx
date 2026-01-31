import { memo, useState } from 'react'
import { CheckCircle, XCircle, Clock, Package, Copy, Check } from 'lucide-react'
import { Device, TestStatus } from '@/types'

interface StatsCardsProps {
  stats: {
    total: number
    approved: number
    failed: number
    pending: number
  }
  devices: Device[]
}

export const StatsCards = memo(function StatsCards({ stats, devices }: StatsCardsProps) {
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  if (stats.total === 0) return null

  const getDeviceIdsByStatus = (status?: TestStatus): string => {
    let filteredDevices: Device[]
    
    if (!status) {
      filteredDevices = devices
    } else {
      filteredDevices = devices.filter(d => d.overallStatus === status)
    }
    
    return filteredDevices.map(d => d.id).join(',')
  }

  const handleCopy = async (label: string, status?: TestStatus) => {
    const ids = getDeviceIdsByStatus(status)
    
    if (!ids) return
    
    try {
      await navigator.clipboard.writeText(ids)
      setCopiedCard(label)
      setTimeout(() => setCopiedCard(null), 1500)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const cards = [
    {
      label: 'Total',
      value: stats.total,
      icon: Package,
      valueColor: 'text-gray-900 dark:text-white',
      trend: 'text-gray-600 dark:text-gray-400',
      status: undefined,
    },
    {
      label: 'Aprovados',
      value: stats.approved,
      icon: CheckCircle,
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      trend: 'text-emerald-600 dark:text-emerald-400',
      status: 'approved' as TestStatus,
    },
    {
      label: 'Reprovados',
      value: stats.failed,
      icon: XCircle,
      valueColor: 'text-red-600 dark:text-red-400',
      trend: 'text-red-600 dark:text-red-400',
      status: 'failed' as TestStatus,
    },
    {
      label: 'Pendentes',
      value: stats.pending,
      icon: Clock,
      valueColor: 'text-amber-600 dark:text-amber-400',
      trend: 'text-amber-600 dark:text-amber-400',
      status: 'pending' as TestStatus,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
      {cards.map((card) => {
        const Icon = card.icon
        const isCopied = copiedCard === card.label
        const CopyIcon = isCopied ? Check : Copy
        
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-[#141414] rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors relative group"
          >
            {/* Copy Button */}
            {card.value > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(card.label, card.status)
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                title={isCopied ? 'Copiado!' : 'Copiar IDs'}
              >
                <CopyIcon 
                  className={`${isCopied ? card.trend : 'text-gray-400 dark:text-gray-500'} transition-colors`} 
                  size={16} 
                />
              </button>
            )}
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{card.label}</p>
                <p className={`text-3xl font-semibold tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
              </div>
              <div className="p-2.5">
                <Icon className={card.trend} size={20} strokeWidth={2} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})
