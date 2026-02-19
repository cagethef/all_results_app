import { useState } from 'react'
import { UnifiedInput } from './UnifiedInput'
import { OCRScanner } from './OCRScanner'
import { ZebraListener } from './ZebraListener'

interface ScannerProps {
  onAddAll: (batches: string[], ids: string[]) => void
  onSingleDevice: (id: string) => void
  loading: boolean
}

export function Scanner({ onAddAll, onSingleDevice, loading }: ScannerProps) {
  const [isOCRActive, setIsOCRActive] = useState(false)

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Adicionar Dispositivos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Digite o ID, cole o link do QR Code ou use o scanner Zebra</p>
      </div>

      {!isOCRActive && <ZebraListener onDeviceAdded={onSingleDevice} />}

      {isOCRActive ? (
        <OCRScanner
          onDeviceAdded={onSingleDevice}
          onClose={() => setIsOCRActive(false)}
        />
      ) : (
        <UnifiedInput
          onAddAll={onAddAll}
          onOpenOCR={() => setIsOCRActive(true)}
          loading={loading}
        />
      )}
    </div>
  )
}
