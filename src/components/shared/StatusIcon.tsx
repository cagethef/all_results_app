import { memo } from 'react'
import { TestStatus } from '@/types'
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface StatusIconProps {
  status: TestStatus
  size?: number
}

export const StatusIcon = memo(function StatusIcon({ status, size = 24 }: StatusIconProps) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="text-green-500" size={size} />
    case 'failed':
      return <XCircle className="text-red-500" size={size} />
    case 'warning':
      return <AlertTriangle className="text-yellow-500" size={size} />
    case 'pending':
      return <Clock className="text-gray-400" size={size} />
    default:
      return <Clock className="text-gray-400" size={size} />
  }
})
