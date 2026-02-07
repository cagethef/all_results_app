import { useState, useCallback, useMemo } from 'react'
import { Device } from '@/types'
import { calculateDeviceStats } from '@/utils/deviceUtils'
import { ENDPOINTS } from '@/config/api'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
}

/**
 * Custom hook to manage devices state and operations
 */
export function useDevices(toast: ToastFunctions) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Add a new device by ID or batch
   * Supports single device or multiple devices (batch search)
   * Uses useCallback to prevent re-creation on every render
   */
  const addDevice = useCallback(async (input: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(ENDPOINTS.getDevice(input))
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Device not found')
      }
      
      const data = await response.json()
      
      // Verificar se retornou múltiplos devices (busca por lote)
      if (data.devices && Array.isArray(data.devices)) {
        // Busca por lote
        setDevices(prev => {
          // Cria um Set com IDs existentes para lookup rápido
          const existingIds = new Set(prev.map(d => d.id))
          
          // Filtra apenas devices novos
          const newDevices = data.devices.filter((device: Device) => 
            !existingIds.has(device.id)
          )
          
          if (newDevices.length === 0) {
            toast.success(`Todos os ${data.count} dispositivos do lote ${data.batch} já estão na lista`)
            return prev
          }
          
          const addedCount = newDevices.length
          const skippedCount = data.count - newDevices.length
          
          let message = `${addedCount} dispositivo${addedCount > 1 ? 's' : ''} adicionado${addedCount > 1 ? 's' : ''}`
          if (skippedCount > 0) {
            message += ` (${skippedCount} duplicado${skippedCount > 1 ? 's' : ''})`
          }
          
          toast.success(message)
          
          return [...prev, ...newDevices]
        })
      } else {
        // Device único
        const device: Device = data
        
        setDevices(prev => {
          // Prevent duplicates
          if (prev.some(d => d.id === device.id)) {
            toast.success(`${device.id} já está na lista`)
            return prev
          }
          
          toast.success(`${device.id} adicionado`)
          return [...prev, device]
        })
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching device:', errorMessage)
      
      // Mostra erro para o usuário
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [devices, toast])

  /**
   * Remove a device by ID
   */
  const removeDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId))
  }, [])

  /**
   * Clear all devices
   */
  const clearDevices = useCallback(() => {
    setDevices([])
  }, [])

  /**
   * Calculate statistics (memoized)
   */
  const stats = useMemo(() => calculateDeviceStats(devices), [devices])

  return {
    devices,
    addDevice,
    removeDevice,
    clearDevices,
    stats,
    loading,
    error,
  }
}
