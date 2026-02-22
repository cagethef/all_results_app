import { useState, useCallback, useRef } from 'react'
import Tesseract from 'tesseract.js'
import { extractDeviceIds, normalizeDeviceId, generatePreprocessVariants, calculateIdConfidence } from '@/utils/ocrUtils'
import { matchesKnownPattern } from '@/constants/deviceIdPatterns'

interface OCRResult {
  id: string
  confidence: number
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      return true
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const captureAndProcess = useCallback(async (): Promise<OCRResult[]> => {
    if (!videoRef.current) {
      throw new Error('Câmera não inicializada')
    }

    setIsProcessing(true)
    setError(null)

    try {
      const video = videoRef.current

      const canvasVariants = generatePreprocessVariants(video)

      // Save first variant for preview
      const imageData = canvasVariants[0].toDataURL('image/png')
      setCapturedImage(imageData)

      const allResults: Array<{ ids: string[], confidence: number, variant: number }> = []

      for (let i = 0; i < canvasVariants.length; i++) {
        try {
          const result = await Tesseract.recognize(canvasVariants[i], 'eng', {
            // @ts-ignore - tessedit options are valid but not in types
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            // @ts-ignore
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            // @ts-ignore
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
            // @ts-ignore
            preserve_interword_spaces: '0',
          })

          const extractedIds = extractDeviceIds(result.data.text)
          
          if (extractedIds.length > 0) {
            allResults.push({
              ids: extractedIds,
              confidence: result.data.confidence,
              variant: i,
            })
          }
        } catch {
          // Silently continue to next variant
        }
      }

      if (allResults.length === 0) {
        setError('Nenhum ID válido encontrado. Tente novamente com melhor iluminação.')
        return []
      }

      allResults.sort((a, b) => b.confidence - a.confidence)
      
      const idConfidenceMap = new Map<string, number>()
      allResults.forEach(result => {
        result.ids.forEach(id => {
          const currentConf = idConfidenceMap.get(id) || 0
          if (result.confidence > currentConf) {
            idConfidenceMap.set(id, result.confidence)
          }
        })
      })

      const calculateQualityScore = (id: string, ocrConfidence: number): number => {
        let score = calculateIdConfidence(id, ocrConfidence)
        
        if (matchesKnownPattern(id)) {
          score += 100
        } else {
          score -= 50
        }
        
        const digitCount = (id.match(/\d/g) || []).length
        score += digitCount * 5
        
        if (/(.)\1{2,}/.test(id)) score -= 30
        if (id.length !== 7) score -= 50
        
        return score
      }
      
      const sortedIds = Array.from(idConfidenceMap.entries())
        .sort((a, b) => {
          const qualityA = calculateQualityScore(a[0], a[1])
          const qualityB = calculateQualityScore(b[0], b[1])
          return qualityB - qualityA
        })
        .filter(([id]) => matchesKnownPattern(id))
      
      const results: OCRResult[] = sortedIds.slice(0, 3).map(([id, confidence]) => ({
        id: normalizeDeviceId(id),
        confidence,
      }))

      return results
    } catch (err) {
      console.error('OCR Error:', err)
      setError('Erro ao processar imagem. Tente novamente.')
      return []
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const resetCapture = useCallback(() => {
    setCapturedImage(null)
    setError(null)
  }, [])

  return {
    videoRef,
    streamRef,
    isProcessing,
    error,
    capturedImage,
    startCamera,
    stopCamera,
    captureAndProcess,
    resetCapture,
  }
}
