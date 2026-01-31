import { useEffect, useState } from 'react'
import { parseQRCode } from '@/utils/qrParser'

interface ZebraListenerProps {
  onDeviceAdded: (deviceId: string) => void | Promise<void>
}

/**
 * Background listener for Zebra scanner
 * Captures keyboard events and automatically processes QR codes
 */
export function ZebraListener({ onDeviceAdded }: ZebraListenerProps) {
  const [lastScanned, setLastScanned] = useState<string>('')
  const [scanTime, setScanTime] = useState<Date | null>(null)

  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      
      // If more than 100ms passed, reset buffer (user typing vs scanner)
      if (currentTime - lastKeyTime > 100) {
        buffer = ''
      }
      
      lastKeyTime = currentTime

      // Zebra scanner ends with Enter
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          const result = parseQRCode(buffer)
          if (result.isValid && result.deviceId) {
            setLastScanned(result.deviceId)
            setScanTime(new Date())
            onDeviceAdded(result.deviceId)
          }
          buffer = ''
        }
      } else if (e.key.length === 1) {
        // Only accumulate printable characters
        buffer += e.key
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [onDeviceAdded])

  // Show last scanned notification (fades after 2 seconds)
  if (!lastScanned || !scanTime) return null

  const timeDiff = Date.now() - scanTime.getTime()
  if (timeDiff > 2000) return null

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-success-50 to-success-100 border-2 border-success-200 rounded-xl animate-fade-in shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-success-500 rounded-lg flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-success-900">Dispositivo escaneado</p>
          <p className="text-xs text-success-700 font-mono">{lastScanned}</p>
        </div>
      </div>
    </div>
  )
}
