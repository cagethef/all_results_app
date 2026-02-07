// Core types for the application

export type TestStatus = 'approved' | 'failed' | 'pending' | 'warning'

export interface Parameter {
  name: string
  parameterType?: string // For icon mapping: "voltage", "temperature", etc
  expected?: string | number
  measured?: string | number
  unit?: string
  status: TestStatus
  errorPercentage?: number
}

export interface Test {
  testName: string
  testType: string // For icons: "electrical", "mechanical", "leak", etc
  status: TestStatus
  date?: string
  responsible?: string
  observations?: string
  parameters: Parameter[]
}

export interface ChipInfo {
  type: 'Single Chip' | 'Dual Chip' | 'Não Identificado'
  chip1: {
    carrier: string
    ccid: string
  }
  chip2?: {
    carrier: string
    ccid: string
  }
}

export interface Device {
  id: string
  deviceType: string // "Omni Trac", "Smart Trac Ultra", "Energy Trac", etc
  overallStatus: TestStatus
  tests: Test[]
  chipInfo?: ChipInfo
  batch?: string // Batch ID (e.g., "20250523_04_01_CLARO")
}

// QR Code parsing
export interface QRCodeResult {
  rawText: string
  deviceId: string | null
  isValid: boolean
}
