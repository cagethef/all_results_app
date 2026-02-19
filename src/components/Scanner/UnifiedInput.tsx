import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { parseQRCode } from '@/utils/qrParser'

interface UnifiedInputProps {
  onAddAll: (batches: string[], ids: string[]) => void
  onOpenOCR: () => void
  loading: boolean
}

export function UnifiedInput({ onAddAll, onOpenOCR, loading }: UnifiedInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const trimmedInput = input.trim()
    if (!trimmedInput) return

    const entries = trimmedInput
      .split(/[,\t\n]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (entries.length === 0) return

    const batches: string[] = []
    const ids: string[] = []
    let hasInvalid = false

    entries.forEach(entry => {
      const qrResult = parseQRCode(entry)

      if (qrResult.isValid && qrResult.deviceId) {
        ids.push(qrResult.deviceId)
      } else if (/^#?\d{8}_\d{2}$/.test(entry)) {
        batches.push(entry)
      } else if (/^[A-Z0-9]{5,10}$/i.test(entry)) {
        ids.push(entry.toUpperCase())
      } else {
        hasInvalid = true
        alert(`Formato inválido: "${entry}"\n\nFormatos aceitos:\n- ID: YL250QZ (5-10 caracteres)\n- Lote: 20250523_04 ou #20250523_04`)
      }
    })

    if (hasInvalid) return

    if (batches.length > 0 || ids.length > 0) {
      onAddAll(batches, ids)
      setInput('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Digite IDs ou lote (ex: #20250523_04) separados por vírgula..."
          className="w-full px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <button
        type="button"
        onClick={onOpenOCR}
        disabled={loading}
        className="px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Abrir câmera para OCR"
      >
        <Camera size={22} />
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Buscando...
          </>
        ) : (
          'Adicionar'
        )}
      </button>
    </form>
  )
}
