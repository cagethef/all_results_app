import { useEffect, useState } from 'react'
import { Camera, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useOCR } from '@/hooks/useOCR'

interface OCRScannerProps {
  onDeviceAdded: (deviceId: string) => void | Promise<void>
  onClose: () => void
}

export function OCRScanner({ onDeviceAdded, onClose }: OCRScannerProps) {
  const {
    videoRef,
    streamRef,
    isProcessing,
    error,
    capturedImage,
    startCamera,
    stopCamera,
    captureAndProcess,
    resetCapture,
  } = useOCR()

  const [cameraReady, setCameraReady] = useState(false)
  const [foundIds, setFoundIds] = useState<Array<{ id: string; confidence: number }>>([])

  useEffect(() => {
    startCamera().then(setCameraReady)
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const handleCapture = async () => {
    const results = await captureAndProcess()
    setFoundIds(results)
  }

  const handleAddId = async (id: string) => {
    try {
      await onDeviceAdded(id)
      resetCapture()
      setFoundIds([])
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err)
          })
        }
      }, 100)
    } catch (error) {
      console.error('Error adding device:', error)
    }
  }

  const handleRetry = () => {
    resetCapture()
    setFoundIds([])
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err)
        })
      }
    }, 100)
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Scanner OCR</h3>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
          title="Fechar"
        >
          <X size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: '400px' }}>
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-green-400 border-dashed rounded-lg w-2/3 h-2/5 flex flex-col items-center justify-center gap-1 bg-black/20">
                <p className="text-white text-xs bg-black/60 px-2 py-1 rounded font-medium">
                  📱 Posicione o ID completo aqui
                </p>
                <p className="text-white text-[10px] bg-black/60 px-2 py-0.5 rounded">
                  ⚠️ Não corte as letras das bordas
                </p>
              </div>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      {!capturedImage ? (
        <button
          onClick={handleCapture}
          disabled={!cameraReady || isProcessing}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processando...
            </>
          ) : (
            <>
              <Camera size={20} />
              Capturar Foto
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          {foundIds.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="font-medium">ID(s) encontrado(s) {foundIds.length > 3 ? '(com variações)' : ''}:</span>
              </div>
              {foundIds.length > 3 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Múltiplas variações detectadas. Verifique qual é o correto.
                </p>
              )}
              {foundIds.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{result.id}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {result.confidence > 60 ? '✅ Alta confiança' : 
                       result.confidence > 30 ? '⚠️ Média confiança - Verifique o ID' : 
                       '❌ Baixa confiança - Pode estar incorreto'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddId(result.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            onClick={handleRetry}
            className="w-full px-6 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      )}

    </div>
  )
}
