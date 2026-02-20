import { Device, Test, TestStatus, Parameter } from '@/types'
import type { ChipInfo } from '@/types'
import { TEST_NAMES, TEST_TYPES } from '@/constants/testNames'
import { getMatchingPattern } from '@/constants/deviceIdPatterns'

export interface FailedItem {
  test: string
  param: string
}

/**
 * Retorna lista de parâmetros reprovados do dispositivo.
 * Suporta tests com parameters[] e sections[].
 */
export function getFailedItems(device: Device): FailedItem[] {
  const items: FailedItem[] = []

  for (const test of device.tests) {
    if (test.parameters && test.parameters.length > 0) {
      for (const param of test.parameters) {
        if (param.status === 'failed') {
          items.push({ test: test.testName, param: param.name })
        }
      }
    } else if (test.sections && test.sections.length > 0) {
      for (const section of test.sections) {
        for (const param of section.parameters) {
          if (param.status === 'failed') {
            items.push({ test: test.testName, param: param.name })
          }
        }
      }
    } else if (test.status === 'failed') {
      // Teste reprovado sem parâmetros detalhados
      items.push({ test: test.testName, param: 'Reprovado' })
    }
  }

  return items
}

export function calculateDeviceStatus(tests: Test[]): TestStatus {
  if (tests.length === 0) return 'pending'
  
  const hasFailedTest = tests.some(t => t.status === 'failed')
  if (hasFailedTest) return 'failed'
  
  const hasWarningTest = tests.some(t => t.status === 'warning')
  if (hasWarningTest) return 'warning'
  
  const hasPendingTest = tests.some(t => t.status === 'pending')
  if (hasPendingTest) return 'pending'
  
  return 'approved'
}

export function getTestByName(device: Device, testName: string): Test | undefined {
  return device.tests.find(t => t.testName === testName)
}

// Get specific tests from device (single loop optimization)
export function getDeviceTests(device: Device) {
  const results = {
    atp: undefined as Test | undefined,
    itp: undefined as Test | undefined,
    leak: undefined as Test | undefined,
    final: undefined as Test | undefined,
  }

  for (const test of device.tests) {
    switch (test.testName) {
      case TEST_NAMES.ATP:
        results.atp = test
        break
      case TEST_NAMES.ITP:
        results.itp = test
        break
      case TEST_NAMES.LEAK:
      case TEST_NAMES.LEAK_ALT:
        results.leak = test
        break
      case TEST_NAMES.FINAL:
        results.final = test
        break
    }
  }

  return results
}

function getDeviceTypeFromPattern(deviceId: string): string {
  const pattern = getMatchingPattern(deviceId)
  if (!pattern) return 'Unknown Device'
  
  // Smart Trac Ultra Gen 2 pattern: randomly assign based on seed
  if (pattern.name === 'Smart Trac Ultra Gen 2') {
    const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    // 50% Gen 2 (ATP+ITP+Leak), 50% Smart Trac normal (ATP+Leak only)
    return seed % 2 === 0 ? 'Smart Trac Ultra Gen 2' : 'Smart Trac'
  }
  
  // Omni Receiver pattern: randomly assign between Omni Receiver and Smart Receiver
  if (pattern.name === 'Omni Receiver') {
    const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    // 60% Omni Receiver, 40% Smart Receiver
    return seed % 5 < 3 ? 'Omni Receiver' : 'Receiver'
  }
  
  return pattern.name.split(' / ')[0]
}

function generateMockParameters(testName: string, deviceType: string, status: TestStatus, seed: number): Parameter[] {
  const params: Parameter[] = []
  
  if (testName === TEST_NAMES.ATP && deviceType === 'Energy Trac') {
    params.push(
      { name: 'Signal', expected: '-78 to inf dBm', measured: status === 'approved' ? '-65.2 dBm' : '-80.1 dBm', status },
      { name: 'RMS IA', expected: '4.98-5.98 A', measured: '5.38 A', status: 'approved' },
      { name: 'RMS IB', expected: '5.05-6.05 A', measured: '5.37 A', status: 'approved' },
      { name: 'RMS IC', expected: '4.96-5.96 A', measured: '5.36 A', status: 'approved' },
      { name: 'RMS VA', expected: '215-238 V', measured: '225.7 V', status: 'approved' },
      { name: 'RMS VB', expected: '215-238 V', measured: '225.9 V', status: 'approved' },
      { name: 'RMS VC', expected: '215-238 V', measured: '225.9 V', status: 'approved' },
      { name: 'Modem Temp', expected: '30-41°C', measured: status === 'failed' ? '42°C' : '37.5°C', status },
      { name: 'Low Status', expected: '>54', measured: '72', status: 'approved' }
    )
  } else if (testName === TEST_NAMES.ATP && deviceType === 'Omni Trac') {
    params.push(
      { name: 'SoC Temp', expected: '0-59°C', measured: '55.6°C', status: 'approved' },
      { name: 'CPU Usage', expected: '-25 to 38%', measured: '4.5%', status: 'approved' },
      { name: 'Disk Usage', expected: '566-849 MB', measured: '707.8 MB', status: 'approved' },
      { name: 'Memory Usage', expected: '364-546 MB', measured: status === 'failed' ? '550 MB' : '457.6 MB', status },
      { name: 'Low Status', expected: '>107', measured: '143', status: 'approved' }
    )
  } else if (testName === TEST_NAMES.ATP && deviceType.includes('Smart Trac')) {
    params.push(
      { name: 'Sensor Signal', expected: '-46 to inf dBm', measured: status === 'approved' ? '-34.0 dBm' : '-48.2 dBm', status },
      { name: 'Temperature Thermistor', expected: '21.8-24.1°C', measured: '23.0°C', status: 'approved' },
      { name: 'Low Status', expected: '>34', measured: status === 'failed' ? '30' : '45.6', status }
    )
  } else if (testName === TEST_NAMES.ATP && deviceType.includes('Receiver')) {
    const isOmniReceiver = deviceType === 'Omni Receiver'
    if (isOmniReceiver) {
      params.push(
        { name: 'Signal', expected: '-76 to inf dBm', measured: status === 'approved' ? '-66.0 dBm' : '-78.5 dBm', status },
        { name: 'Modem Temp', expected: '0-50°C', measured: '44.4°C', status: 'approved' },
        { name: 'Low Status', expected: '>107', measured: '143.5', status: 'approved' }
      )
    } else {
      params.push(
        { name: 'Sensor Signal', expected: '-51 to inf dBm', measured: '-43.5 dBm', status: 'approved' },
        { name: 'Signal', expected: '-61 to inf dBm', measured: status === 'approved' ? '-52.4 dBm' : '-63.2 dBm', status },
        { name: 'Modem Voltage', expected: '3.79-4.19 V', measured: '3.98 V', status: 'approved' },
        { name: 'Modem Temp', expected: '0-42°C', measured: '37.8°C', status: 'approved' },
        { name: 'CPU Temperature', expected: '0-46°C', measured: status === 'failed' ? '47°C' : '42.2°C', status },
        { name: 'Low Status', expected: '>42', measured: '56.3', status: 'approved' }
      )
    }
  } else if (testName === TEST_NAMES.ATP && deviceType.includes('Uni Trac')) {
    params.push(
      { name: 'Sensor Signal', expected: '-43 to inf dBm', measured: status === 'approved' ? '-32.1 dBm' : '-45.8 dBm', status },
      { name: 'Internal Temp', expected: '0-29°C', measured: '27.6°C', status: 'approved' },
      { name: 'Low Status', expected: '>50', measured: status === 'failed' ? '45' : '66.6', status }
    )
  } else if (testName === TEST_NAMES.ITP && deviceType === 'Omni Trac') {
    params.push(
      { name: 'Power Enables', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'USB Check', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'MMC CID', expected: 'Valid', measured: 'Valid', status: 'approved' },
      { name: 'Ethernet MAC', expected: 'Valid', measured: 'Valid', status: 'approved' },
      { name: 'SoC Temp', expected: '<80°C', measured: '75.6°C', status: 'approved' },
      { name: 'RS485 FD', expected: 'Pass', measured: status === 'failed' ? 'Fail' : 'Pass', status },
      { name: 'RS232', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'iPERF Ethernet', expected: '>80 Mbps', measured: '93.2 Mbps', status: 'approved' }
    )
  } else if (testName === TEST_NAMES.ITP && deviceType === 'Smart Trac Ultra Gen 2') {
    const stepsPassed = status === 'approved' ? 12 : status === 'failed' ? 6 : 0
    params.push(
      { name: 'QR Code', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'NFC', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'BLE Connect', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'CLI Who Am I', expected: '6/6 components', measured: status === 'failed' ? '4/6 components' : '6/6', status: status === 'failed' ? 'failed' : 'approved' },
      { name: 'Accelerometer Sample', expected: 'Pass', measured: 'Pass', status: 'approved' },
      { name: 'Accelerometer Active', expected: 'Pass', measured: status === 'failed' ? 'Fail' : 'Pass', status },
      { name: 'Steps Passed', expected: '12/12', measured: `${stepsPassed}/12`, status }
    )
  } else if (testName === TEST_NAMES.LEAK) {
    params.push(
      { name: 'Jig ID', expected: 'Any', measured: `Jig ${(seed % 3) + 1}`, status: 'approved' },
      { name: 'Calibration', expected: 'Valid', measured: 'STU horizontal Sem base', status: 'approved' },
      { name: 'Drop', expected: '<3.0 Pa/min', measured: status === 'approved' ? '2.58 Pa/min' : '3.5 Pa/min', status },
      { name: 'Slope', expected: '-0.35 ±0.1', measured: '-0.31', status: 'approved' },
      { name: 'Fit Quality (R²)', expected: '>0.7', measured: status === 'failed' ? '0.65' : '0.92', status }
    )
  }
  
  return params
}

function generateMockTests(deviceType: string, seed: number): Test[] {
  const tests: Test[] = []
  const date = new Date()
  date.setDate(date.getDate() - seed % 10)
  
  const statusVariations: TestStatus[] = seed % 3 === 0 ? ['approved', 'approved', 'approved'] :
                                         seed % 3 === 1 ? ['approved', 'pending', 'pending'] :
                                         ['approved', 'failed', 'pending']
  
  if (deviceType === 'Energy Trac') {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
  }
  
  else if (deviceType === 'Omni Trac') {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
    
    tests.push({
      testName: TEST_NAMES.ITP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[1],
      date: statusVariations[1] === 'pending' ? undefined : new Date(date.getTime() + 86400000).toISOString(),
      parameters: statusVariations[1] === 'pending' ? [] : generateMockParameters(TEST_NAMES.ITP, deviceType, statusVariations[1], seed)
    })
  }
  
  else if (deviceType === 'Smart Trac') {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
    
    const leakParams3: Parameter[] = statusVariations[1] === 'pending' ? [] : generateMockParameters(TEST_NAMES.LEAK, deviceType, statusVariations[1], seed)
    tests.push({
      testName: TEST_NAMES.LEAK,
      testType: TEST_TYPES.LEAK,
      status: statusVariations[1],
      date: statusVariations[1] === 'pending' ? undefined : new Date(date.getTime() + 86400000).toISOString(),
      parameters: leakParams3
    })
  }
  
  else if (deviceType === 'Smart Trac Ultra Gen 2') {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
    
    tests.push({
      testName: TEST_NAMES.ITP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[1],
      date: statusVariations[1] === 'pending' ? undefined : new Date(date.getTime() + 86400000).toISOString(),
      parameters: statusVariations[1] === 'pending' ? [] : generateMockParameters(TEST_NAMES.ITP, deviceType, statusVariations[1], seed)
    })
    
    const leakParams4: Parameter[] = statusVariations[2] === 'pending' ? [] : generateMockParameters(TEST_NAMES.LEAK, deviceType, statusVariations[2], seed)
    tests.push({
      testName: TEST_NAMES.LEAK,
      testType: TEST_TYPES.LEAK,
      status: statusVariations[2],
      date: statusVariations[2] === 'pending' ? undefined : new Date(date.getTime() + 172800000).toISOString(),
      parameters: leakParams4
    })
  }
  
  else if (deviceType.includes('Uni Trac')) {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
  }
  
  else if (deviceType === 'Omni Receiver') {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
  }
  
  else if (deviceType.includes('Receiver')) {
    tests.push({
      testName: TEST_NAMES.ATP,
      testType: TEST_TYPES.ELECTRICAL,
      status: statusVariations[0],
      date: date.toISOString(),
      parameters: generateMockParameters(TEST_NAMES.ATP, deviceType, statusVariations[0], seed)
    })
    
    const leakParams6: Parameter[] = statusVariations[1] === 'pending' ? [] : generateMockParameters(TEST_NAMES.LEAK, deviceType, statusVariations[1], seed)
    tests.push({
      testName: TEST_NAMES.LEAK,
      testType: TEST_TYPES.LEAK,
      status: statusVariations[1],
      date: statusVariations[1] === 'pending' ? undefined : new Date(date.getTime() + 86400000).toISOString(),
      parameters: leakParams6
    })
  }
  
  return tests
}

export function createMockDevice(deviceId: string): Device {
  const deviceType = getDeviceTypeFromPattern(deviceId)
  const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const mockTests = generateMockTests(deviceType, seed)

  const carriers = ['VIVO', 'CLARO', 'TIM', 'AT&T', 'TWILIO']
  const hasChip = deviceType === 'Energy Trac' || deviceType.includes('Receiver')
  
  let chipInfo: ChipInfo | undefined = undefined
  if (hasChip) {
    const chipType = seed % 2 === 0 ? 'Single Chip' : 'Dual Chip'
    const carrier1 = carriers[seed % carriers.length]
    const carrier2 = carriers[(seed + 1) % carriers.length]
    
    // Generate mock CCID (20 digits)
    const generateCCID = (baseSeed: number) => {
      let ccid = '8955'
      for (let i = 0; i < 16; i++) {
        ccid += ((baseSeed + i * 7) % 10).toString()
      }
      return ccid
    }
    
    chipInfo = {
      type: chipType,
      chip1: {
        carrier: carrier1,
        ccid: generateCCID(seed)
      },
      chip2: chipType === 'Dual Chip' ? {
        carrier: carrier2,
        ccid: generateCCID(seed + 100)
      } : undefined
    }
  }

  const device: Device = {
    id: deviceId,
    deviceType,
    overallStatus: calculateDeviceStatus(mockTests),
    tests: mockTests,
    ...(chipInfo && { chipInfo })
  }

  return device
}

/**
 * Calculate statistics from devices array
 */
export function calculateDeviceStats(devices: Device[]) {
  return {
    total: devices.length,
    approved: devices.filter(d => d.overallStatus === 'approved').length,
    failed: devices.filter(d => d.overallStatus === 'failed').length,
    pending: devices.filter(d => d.overallStatus === 'pending').length,
  }
}
