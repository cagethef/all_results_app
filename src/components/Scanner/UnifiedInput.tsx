import { useState } from 'react'
import { Camera } from 'lucide-react'
import { parseQRCode } from '@/utils/qrParser'

interface UnifiedInputProps {
  onDeviceAdded: (deviceId: string) => void
  onOpenOCR: () => void
}

export function UnifiedInput({ onDeviceAdded, onOpenOCR }: UnifiedInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Split by comma, tab, or newline and process each entry
    const entries = input
      .split(/[,\t\n]+/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0)

    entries.forEach(entry => {
      // Try to parse as QR code first
      const qrResult = parseQRCode(entry)
      
      if (qrResult.isValid && qrResult.deviceId) {
        // It's a QR code link, use parsed ID
        onDeviceAdded(qrResult.deviceId)
      } else if (/^[A-Z0-9]{5,10}$/i.test(entry)) {
        // It's a direct ID
        onDeviceAdded(entry.toUpperCase())
      } else {
        console.warn('Invalid entry:', entry)
      }
    })

    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite IDs (separados por vírgula, tab ou Enter)..."
          className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={onOpenOCR}
        className="px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors text-sm"
        title="Abrir câmera para OCR"
      >
        <Camera size={22} />
      </button>
      <button
        type="submit"
        className="px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02]"
      >
        Adicionar
      </button>
    </form>
  )
}
