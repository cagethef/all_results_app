import { matchesKnownPattern, getPatternConfidenceBoost, getAllPatternRegexes } from '@/constants/deviceIdPatterns'

// Words to ignore during OCR
const IGNORE_WORDS = new Set([
  'TRACTIAN',
  'TRACTIA',  // Common OCR mistake
  'TRACTAN',  // Common OCR mistake
  'TRACTION',
  'SENSOR',
  'DEVICE',
  'MODEL',
  'SERIAL',
  'NUMBER',
  'CODIGO',
  'QRCODE',
  'BARCODE',
])

// Device ID patterns from production data
const ID_PATTERNS = getAllPatternRegexes().map(regex => {
  // Convert regex to global search
  return new RegExp(regex.source, 'g')
})

// Common OCR character confusions (reserved for future use)
// const OCR_CORRECTIONS: Record<string, string> = {
//   '0': 'O',  // Zero vs O
//   'O': '0',  // O vs Zero (context dependent)
//   '1': 'I',  // One vs I
//   'I': '1',  // I vs One (context dependent)
//   '8': 'B',  // Eight vs B
//   'B': '8',  // B vs Eight (context dependent)
//   '5': 'S',  // Five vs S
//   'S': '5',  // S vs Five (context dependent)
// }

function tryCorrectOCR(text: string): string[] {
  const variations = new Set<string>()
  variations.add(text)
  
  // Check if it looks like letters + mixed alphanumeric
  const hasLetters = /^[A-Z]+/.test(text)
  const hasNumbers = /\d/.test(text)
  
  if (!hasLetters || !hasNumbers) {
    return Array.from(variations)
  }
  
  const letters = text.match(/^[A-Z]+/)?.[0] || ''
  const rest = text.substring(letters.length)
  
  // If 6 characters, also keep as valid (some IDs have 6 chars)
  // But also try adding a character in case it's missing
  if (text.length === 6 && letters.length === 2) {
    // Try adding common first letters to make 7 characters
    const commonFirstLetters = ['U', 'A', 'S', 'N', 'M', 'T', 'E', 'H', 'L', 'R']
    commonFirstLetters.forEach(letter => {
      variations.add(`${letter}${text}`)
    })
  }
  
  // If 5 characters (missing 2)
  if (text.length === 5 && letters.length === 2) {
    for (let i = 0; i <= 9; i++) {
      variations.add(`${text}${i}`)
    }
  }
  
  // CRITICAL: Fix S ↔ 5 confusion in rest (VERY common in OCR)
  if (rest.includes('S')) {
    variations.add(letters + rest.replace(/S/g, '5'))
  }
  if (rest.includes('5')) {
    variations.add(letters + rest.replace(/5/g, 'S'))
  }
  
  // CRITICAL: Try specific corrections first (most common issues)
  if (letters.includes('W')) {
    variations.add(letters.replace('W', 'M') + rest)  // KWH → KMH
    variations.add(letters.replace('W', 'H') + rest)
  }
  if (letters.includes('M') && letters.length === 2) {
    variations.add(`K${letters}` + rest)  // KM might be correct
  }
  
  // Try K prefix variations (common pattern: KM, KN, etc.)
  if (text.length === 7 && /^[KMN]M/.test(text)) {
    variations.add(`K${text.substring(1)}`)  // KMH7Y57
  }
  
  // Limit other substitutions to reduce noise
  if (letters.length >= 2) {
    const letterCorrections: Record<string, string[]> = {
      'W': ['M'],  // W → M (KWH → KMH)
      'M': ['H'],  // M → H only
      'N': ['M'],  // N → M
      'H': ['M'],  // H → M (KHH → KMH)
      'O': ['0'],
      '0': ['O'],
    }
    
    for (const [wrong, rights] of Object.entries(letterCorrections)) {
      if (letters.includes(wrong)) {
        rights.forEach(right => {
          variations.add(letters.replace(wrong, right) + rest)
        })
      }
    }
  }
  
  // Limit variations - accept 6 or 7 characters
  const validVariations = Array.from(variations).filter(v => v.length >= 6 && v.length <= 7)
  
  // If we have valid lengths, limit to 5 best candidates
  return validVariations.slice(0, 5)
}

/**
 * Extract potential device IDs from OCR text
 */
export function extractDeviceIds(text: string): string[] {
  const ids = new Set<string>()
  // Replace newlines with spaces, then clean
  const cleanText = text.toUpperCase().replace(/\n/g, ' ').replace(/[^A-Z0-9\s]/g, ' ')

  // Split into words and try to match each one
  const words = cleanText.split(/\s+/).filter(w => w.length > 0)

  for (const word of words) {
    // Try each pattern on this word
    for (const pattern of ID_PATTERNS) {
      if (pattern.test(word)) {
        const normalized = normalizeDeviceId(word)
        
        // Skip if it's in the ignore list
        if (IGNORE_WORDS.has(normalized)) {
          continue
        }
        
        // Skip if it's too similar to any ignore word
        let skipWord = false
        for (const ignoreWord of IGNORE_WORDS) {
          if (isSimilar(normalized, ignoreWord)) {
            skipWord = true
            break
          }
        }
        if (skipWord) continue
        
        // Add original match if valid
        if (isValidDeviceId(normalized)) {
          ids.add(normalized)
        }
        
        // Also try corrected versions
        tryCorrectOCR(word).forEach(corrected => {
          const correctedNorm = normalizeDeviceId(corrected)
          
          // Skip ignore words
          if (IGNORE_WORDS.has(correctedNorm)) return
          for (const ignoreWord of IGNORE_WORDS) {
            if (isSimilar(correctedNorm, ignoreWord)) return
          }
          
          if (isValidDeviceId(correctedNorm)) {
            ids.add(correctedNorm)
          }
        })
      }
    }
  }

  return Array.from(ids)
}

/**
 * Check if two strings are similar (for filtering out ignore words)
 */
function isSimilar(str1: string, str2: string): boolean {
  // If exact match
  if (str1 === str2) return true
  
  // If one is substring of other
  if (str1.includes(str2) || str2.includes(str1)) return true
  
  // If lengths are too different, not similar
  if (Math.abs(str1.length - str2.length) > 2) return false
  
  // Calculate Levenshtein distance (simple version)
  const maxLength = Math.max(str1.length, str2.length)
  let differences = 0
  
  for (let i = 0; i < maxLength; i++) {
    if (str1[i] !== str2[i]) differences++
  }
  
  // Similar if less than 30% different
  return differences / maxLength < 0.3
}

/**
 * Validate if a string looks like a valid device ID
 * Standard: 7 characters (like license plates)
 * Must match a known device pattern from production data
 */
export function isValidDeviceId(id: string): boolean {
  // Must be exactly 7 characters
  if (id.length !== 7) return false
  
  // Must have at least one letter and one digit
  const hasLetter = /[A-Z]/i.test(id)
  const hasDigit = /\d/.test(id)
  
  if (!hasLetter || !hasDigit) return false
  
  // Check if it's too similar to ignore words
  for (const ignoreWord of IGNORE_WORDS) {
    if (isSimilar(id, ignoreWord)) return false
  }
  
  // CRITICAL: Must match a known device pattern
  if (!matchesKnownPattern(id)) return false
  
  return true
}

/**
 * Clean and normalize a device ID
 */
export function normalizeDeviceId(id: string): string {
  // Remove spaces and special characters, convert to uppercase
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Apply Otsu's method to calculate optimal threshold
 */
function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  // Build histogram
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    histogram[gray]++
  }

  const total = data.length / 4
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }

  let sumB = 0
  let wB = 0
  let wF = 0
  let maxVariance = 0
  let threshold = 0

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue

    wF = total - wB
    if (wF === 0) break

    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) ** 2

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }

  return threshold
}

/**
 * Pre-process strategies for different image conditions
 */
type PreprocessStrategy = 'otsu' | 'adaptive_high' | 'adaptive_low' | 'standard'

interface PreprocessOptions {
  strategy: PreprocessStrategy
  invert: boolean
}

/**
 * Pre-process canvas with specific strategy
 */
function applyPreprocessStrategy(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  options: PreprocessOptions
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Draw video frame to canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  // Apply inversion if needed (white text on black → black text on white)
  if (options.invert) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
  }

  // Apply threshold based on strategy
  let threshold = 128
  switch (options.strategy) {
    case 'otsu':
      threshold = calculateOtsuThreshold(data)
      break
    case 'adaptive_high':
      threshold = 140
      break
    case 'adaptive_low':
      threshold = 100
      break
    case 'standard':
      threshold = 128
      break
  }

  // Apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
  }

  // Put processed image back
  ctx.putImageData(imageData, 0, 0)

  // Apply filters based on strategy
  switch (options.strategy) {
    case 'otsu':
      ctx.filter = 'contrast(1.5) brightness(1.0)'
      break
    case 'adaptive_high':
      ctx.filter = 'contrast(1.8) brightness(1.05)'
      break
    case 'adaptive_low':
      ctx.filter = 'contrast(1.3) brightness(1.0) blur(0.3px)'
      break
    case 'standard':
      ctx.filter = 'contrast(2.0) brightness(1.0)'
      break
  }
  ctx.drawImage(canvas, 0, 0)

  return canvas
}

export function preprocessImageForOCR(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): void {
  // Use Otsu method by default (most adaptive)
  applyPreprocessStrategy(canvas, video, {
    strategy: 'otsu',
    invert: true,
  })
}

export function generatePreprocessVariants(
  video: HTMLVideoElement
): HTMLCanvasElement[] {
  const variants: HTMLCanvasElement[] = []
  
  const strategies: PreprocessOptions[] = [
    { strategy: 'otsu', invert: true },
    { strategy: 'adaptive_low', invert: true },
  ]

  strategies.forEach(options => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    applyPreprocessStrategy(canvas, video, options)
    variants.push(canvas)
  })

  return variants
}

export function calculateIdConfidence(id: string, ocrConfidence: number): number {
  let score = ocrConfidence
  score += getPatternConfidenceBoost(id)

  if (id.length !== 7) score -= 30

  return Math.max(0, Math.min(100, score))
}
