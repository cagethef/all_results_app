import { useState } from 'react'
import { UnifiedInput } from './UnifiedInput'
import { OCRScanner } from './OCRScanner'
import { ZebraListener } from './ZebraListener'

interface ScannerProps {
  onDeviceAdded: (deviceId: string) => void
}

export function Scanner({ onDeviceAdded }: ScannerProps) {
  const [isOCRActive, setIsOCRActive] = useState(false)

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Adicionar Dispositivos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Digite o ID, cole o link do QR Code ou use o scanner Zebra</p>
      </div>
      
      {/* Zebra Scanner always listening in background (unless OCR is active) */}
      {!isOCRActive && <ZebraListener onDeviceAdded={onDeviceAdded} />}

      {/* Unified Input or OCR Scanner */}
      {isOCRActive ? (
        <OCRScanner 
          onDeviceAdded={onDeviceAdded}
          onClose={() => setIsOCRActive(false)}
        />
      ) : (
        <UnifiedInput 
          onDeviceAdded={onDeviceAdded}
          onOpenOCR={() => setIsOCRActive(true)}
        />
      )}
    </div>
  )
}
