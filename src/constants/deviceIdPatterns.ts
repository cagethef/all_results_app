// Device ID patterns (7 characters, like license plates)

export interface DevicePattern {
  name: string
  regex: RegExp
  format: string
  examples: string[]
  description: string
}

export const DEVICE_PATTERNS: DevicePattern[] = [
  {
    name: 'Energy Trac',
    regex: /^[A-Z]{2}\d{3}[A-Z]{2}$/,
    format: '2L+3D+2L',
    examples: ['TZ229AZ', 'BV379MP', 'KW547AN', 'IS655RJ', 'YQ908FN'],
    description: '2 letters + 3 digits + 2 letters',
  },
  {
    name: 'Omni Receiver',
    regex: /^[A-Z]{3}\d[A-Z]\d{2}$/,
    format: '3L+1D+1L+2D',
    examples: ['ENF3C26', 'GCK9V35', 'CMT5U68', 'EXZ4F22'],
    description: '3 letters + 1 digit + 1 letter + 2 digits',
  },
  {
    name: 'Omni Trac',
    regex: /^[A-Z]{2}\d{5}$/,
    format: '2L+5D',
    examples: ['EX09483', 'TP93090', 'YM80169', 'LH26479'],
    description: '2 letters + 5 digits',
  },
  {
    name: 'Smart Trac Ultra Gen 2',
    regex: /^[A-Z]{3}\d{4}$/,
    format: '3L+4D',
    examples: ['VUN0162', 'XZP2935', 'DGY7748', 'AAE5389'],
    description: '3 letters + 4 digits',
  },
  {
    name: 'Uni Trac',
    regex: /^[A-Z]\d{3}[A-Z]{3}$/,
    format: '1L+3D+3L',
    examples: ['R981JGI', 'E819ECZ', 'B329YGM', 'F093XAY'],
    description: '1 letter + 3 digits + 3 letters',
  },
]

export function matchesKnownPattern(id: string): boolean {
  return DEVICE_PATTERNS.some(pattern => pattern.regex.test(id))
}

export function getMatchingPattern(id: string): DevicePattern | null {
  return DEVICE_PATTERNS.find(pattern => pattern.regex.test(id)) || null
}

export function getAllPatternRegexes(): RegExp[] {
  return DEVICE_PATTERNS.map(p => p.regex)
}

export function getPatternConfidenceBoost(id: string): number {
  if (matchesKnownPattern(id)) {
    return 50 // +50 points for matching a known pattern
  }
  return 0
}
