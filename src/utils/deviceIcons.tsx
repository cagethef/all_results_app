import { Zap, Cpu, Disc, Sparkles, Workflow, Antenna, Wifi, LucideIcon } from 'lucide-react'

export function getDeviceIcon(deviceType: string): LucideIcon {
  if (deviceType === 'Energy Trac') return Zap
  if (deviceType === 'Omni Trac') return Cpu
  if (deviceType === 'Smart Trac') return Disc
  if (deviceType === 'Smart Trac Ultra Gen 2') return Sparkles
  if (deviceType === 'Uni Trac') return Workflow
  if (deviceType === 'Omni Receiver') return Antenna
  if (deviceType === 'Receiver') return Wifi
  
  return Cpu // default
}

export function getDeviceIconColor(deviceType: string): { bg: string; text: string } {
  if (deviceType === 'Energy Trac') return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' }
  if (deviceType === 'Omni Trac') return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' }
  if (deviceType === 'Smart Trac') return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' }
  if (deviceType === 'Smart Trac Ultra Gen 2') return { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' }
  if (deviceType === 'Uni Trac') return { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' }
  if (deviceType === 'Omni Receiver') return { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400' }
  if (deviceType === 'Receiver') return { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' }
  
  return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' } // default
}
