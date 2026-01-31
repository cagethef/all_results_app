/**
 * Test name constants to avoid magic strings
 */
export const TEST_NAMES = {
  ATP: 'ATP',
  ITP: 'ITP',
  LEAK: 'Estanqueidade',
  LEAK_ALT: 'Leak Test',
  FINAL: 'Final',
} as const

export type TestName = typeof TEST_NAMES[keyof typeof TEST_NAMES]

/**
 * Test type constants
 */
export const TEST_TYPES = {
  ELECTRICAL: 'electrical',
  MECHANICAL: 'mechanical',
  LEAK: 'leak',
  QUALITY: 'quality',
} as const

export type TestType = typeof TEST_TYPES[keyof typeof TEST_TYPES]
