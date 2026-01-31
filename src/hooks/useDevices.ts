import { useState, useCallback, useMemo } from 'react'
import { Device } from '@/types'
import { createMockDevice, calculateDeviceStats } from '@/utils/deviceUtils'

/**
 * Custom hook to manage devices state and operations
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])

  /**
   * Add a new device by ID
   * Uses useCallback to prevent re-creation on every render
   */
  const addDevice = useCallback((deviceId: string) => {
    
    // TODO: Replace with actual API call
    // const device = await fetchDeviceData(deviceId)
    const newDevice = createMockDevice(deviceId)
    
    setDevices(prev => {
      // Prevent duplicates
      if (prev.some(d => d.id === deviceId)) {
        console.warn(`Device ${deviceId} already exists`)
        return prev
      }
      return [...prev, newDevice]
    })
  }, [])

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
  }
}
