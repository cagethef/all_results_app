import { useState, useCallback, useMemo } from 'react'
import { Device } from '@/types'
import { createMockDevice, calculateDeviceStats } from '@/utils/deviceUtils'
import { ENDPOINTS } from '@/config/api'

/**
 * Custom hook to manage devices state and operations
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Add a new device by ID
   * Uses useCallback to prevent re-creation on every render
   */
  const addDevice = useCallback(async (deviceId: string) => {
    // Prevent duplicates
    if (devices.some(d => d.id === deviceId)) {
      console.warn(`Device ${deviceId} already exists`)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(ENDPOINTS.getDevice(deviceId))
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Device not found')
      }
      
      const device: Device = await response.json()
      
      setDevices(prev => [...prev, device])
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching device:', errorMessage)
      
      // Fallback para mock em caso de erro
      console.log('Using mock data as fallback')
      const newDevice = createMockDevice(deviceId)
      setDevices(prev => [...prev, newDevice])
    } finally {
      setLoading(false)
    }
  }, [devices])

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
