import { memo } from 'react'
import { TestStatus } from '@/types'
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface StatusIconProps {
  status: TestStatus
  size?: number
}

export const StatusIcon = memo(function StatusIcon({ status, size = 24 }: StatusIconProps) {
  if (status === 'approved') return <CheckCircle2 className="text-green-500" size={size} />
  if (status === 'failed') return <XCircle className="text-red-500" size={size} />
  if (status === 'warning') return <AlertTriangle className="text-yellow-500" size={size} />
  return <Clock className="text-gray-400" size={size} />
})
