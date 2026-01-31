import {
  Zap,
  Gauge,
  Droplets,
  Flag,
  Signal,
  Battery,
  Thermometer,
  Wind,
  Volume2,
  Vibrate,
  Wrench,
  TrendingDown,
  Triangle,
  BarChart,
  Clock,
  Network,
  Cpu,
  HardDrive,
  Activity,
  Radio,
  LucideIcon,
} from 'lucide-react'

// Test type to icon mapping
const testIconMap: Record<string, LucideIcon> = {
  // ATP - Electrical testing
  electrical: Zap,
  atp: Zap,

  // ITP - Internal testing
  mechanical: Gauge,
  itp: Gauge,

  // Leak/Estanqueidade
  leak: Droplets,
  estanqueidade: Droplets,

  // Final test
  final: Flag,

  // Default
  default: Activity,
}

// Parameter type to icon mapping
const parameterIconMap: Record<string, LucideIcon> = {
  // Electrical
  voltage: Zap,
  current: Battery,
  power: Zap,
  signal: Signal,
  'signal strength': Signal,

  // Temperature
  temperature: Thermometer,
  temp: Thermometer,

  // Pressure/Air
  pressure: Wind,
  vazao: Droplets,
  flow: Droplets,

  // Mechanical
  vibration: Vibrate,
  vibracao: Vibrate,
  noise: Volume2,
  ruido: Volume2,
  torque: Wrench,
  rpm: Gauge,

  // Data/Metrics
  drop: TrendingDown,
  slope: Triangle,
  'fit quality': BarChart,
  r2: BarChart,

  // Time
  time: Clock,
  tempo: Clock,

  // Network/Communication
  network: Network,
  ethernet: Network,
  iperf: Network,

  // System
  cpu: Cpu,
  memory: HardDrive,
  storage: HardDrive,

  // Radio/Wireless
  modem: Radio,
  radio: Radio,

  // Battery
  battery: Battery,
  low_status: Battery,

  // Default
  default: Activity,
}

/**
 * Get icon component for a test type
 */
export function getTestIcon(testType: string): LucideIcon {
  const normalized = testType.toLowerCase().trim()
  return testIconMap[normalized] || testIconMap.default
}

/**
 * Cache for parameter icons to avoid repeated lookups
 */
const parameterIconCache = new Map<string, LucideIcon>()

/**
 * Get icon component for a parameter type or name (optimized with cache)
 */
export function getParameterIcon(parameterTypeOrName: string): LucideIcon {
  const normalized = parameterTypeOrName.toLowerCase().trim()

  // Check cache first
  if (parameterIconCache.has(normalized)) {
    return parameterIconCache.get(normalized)!
  }

  let icon: LucideIcon

  // Direct match
  if (parameterIconMap[normalized]) {
    icon = parameterIconMap[normalized]
  } else {
    // Fuzzy match - check if any key is contained in the parameter name
    icon = parameterIconMap.default
    for (const [key, mappedIcon] of Object.entries(parameterIconMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        icon = mappedIcon
        break
      }
    }
  }

  // Cache the result
  parameterIconCache.set(normalized, icon)
  return icon
}

/**
 * Clear the icon cache (useful for testing)
 */
export function clearIconCache() {
  parameterIconCache.clear()
}
