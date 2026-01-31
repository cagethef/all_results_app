import { QRCodeResult } from '@/types'

/**
 * Parses QR code text to extract device ID
 * Handles various formats:
 * - httpsÇ;;qrcode.tractian.com;NLS4459
 * - HTTPS://QRCODE.TRACTIAN.COM/mbs4345
 * - https://qrcode.tractian.com/ABC1234
 */
export function parseQRCode(text: string): QRCodeResult {
  if (!text || text.trim().length === 0) {
    return {
      rawText: text,
      deviceId: null,
      isValid: false,
    }
  }

  // Clean and uppercase the text
  const cleaned = text.trim().toUpperCase()

  // Try to extract ID after last slash or semicolon
  const match = cleaned.match(/[/;]([A-Z0-9]+)$/i)

  if (match && match[1]) {
    return {
      rawText: text,
      deviceId: match[1].toUpperCase(),
      isValid: true,
    }
  }

  // If no match, check if the text itself is a valid ID (alphanumeric, 5-10 chars)
  if (/^[A-Z0-9]{5,10}$/i.test(cleaned)) {
    return {
      rawText: text,
      deviceId: cleaned,
      isValid: true,
    }
  }

  return {
    rawText: text,
    deviceId: null,
    isValid: false,
  }
}
