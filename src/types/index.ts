export type TestStatus = 'approved' | 'failed' | 'pending' | 'warning'

export interface Parameter {
  name: string
  parameterType?: string
  expected?: string | number
  measured?: string | number
  unit?: string
  status: TestStatus
  errorPercentage?: number
}

export interface Section {
  name: string
  parameters: Parameter[]
}

export interface Test {
  testName: string
  testType: string
  status: TestStatus
  date?: string
  responsible?: string
  observations?: string
  parameters?: Parameter[]
  sections?: Section[]
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
  deviceType: string
  overallStatus: TestStatus
  tests: Test[]
  chipInfo?: ChipInfo
  batch?: string
  protocol?: string
}

export interface QRCodeResult {
  rawText: string
  deviceId: string | null
  isValid: boolean
}
