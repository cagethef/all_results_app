import { useState, useCallback, useMemo, useRef } from 'react'
import { Device } from '@/types'
import { calculateDeviceStats } from '@/utils/deviceUtils'
import { ENDPOINTS } from '@/config/api'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
}

export function useDevices(toast: ToastFunctions) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Accumulator for Zebra/OCR single scans (debounced — unknown total upfront)
  const singleAccRef = useRef<{
    added: number
    timer: ReturnType<typeof setTimeout> | null
  }>({ added: 0, timer: null })

  const scheduleSingleToast = useCallback((count: number) => {
    singleAccRef.current.added += count
    if (singleAccRef.current.timer) clearTimeout(singleAccRef.current.timer)
    singleAccRef.current.timer = setTimeout(() => {
      const total = singleAccRef.current.added
      singleAccRef.current.added = 0
      singleAccRef.current.timer = null
      if (total === 1) toast.success('1 dispositivo adicionado')
      else if (total > 1) toast.success(`${total} dispositivos adicionados`)
    }, 500)
  }, [toast])

  /**
   * Add all devices from a typed/pasted submission (batches + plain IDs) in parallel.
   * Knows the total upfront — shows 1 consolidated toast when ALL results arrive.
   * Used by UnifiedInput.
   */
  const addAllDevices = useCallback(async (batches: string[], ids: string[]) => {
    if (batches.length === 0 && ids.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Fetch batches and individual IDs all in parallel
      const [batchSettled, idSettled] = await Promise.all([
        Promise.allSettled(
          batches.map(async batch => {
            const res = await fetch(ENDPOINTS.getDevice(batch))
            if (!res.ok) throw new Error(batch)
            return res.json()
          })
        ),
        Promise.allSettled(
          ids.map(async id => {
            const res = await fetch(ENDPOINTS.getDevice(id))
            if (!res.ok) throw new Error(id)
            return res.json() as Promise<Device>
          })
        )
      ])

      // Collect all found devices
      const allFound: Device[] = []
      const notFound: string[] = []

      batchSettled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value
          if (data.devices && Array.isArray(data.devices)) {
            allFound.push(...data.devices)
          } else if (data.id) {
            allFound.push(data as Device)
          }
        } else {
          notFound.push(batches[i])
        }
      })

      idSettled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          allFound.push(result.value as Device)
        } else {
          notFound.push(ids[i])
        }
      })

      // Deduplicate (within results and against existing devices)
      const existingIds = new Set(devices.map(d => d.id))
      const seenInBatch = new Set<string>()
      const newDevices = allFound.filter(d => {
        if (existingIds.has(d.id) || seenInBatch.has(d.id)) return false
        seenInBatch.add(d.id)
        return true
      })
      const duplicateCount = allFound.length - seenInBatch.size

      if (newDevices.length > 0) {
        setDevices(prev => [...prev, ...newDevices])
      }

      // Single consolidated toast
      if (newDevices.length > 0) {
        let msg = newDevices.length === 1
          ? '1 dispositivo adicionado'
          : `${newDevices.length} dispositivos adicionados`
        if (duplicateCount > 0)
          msg += ` (${duplicateCount} já estava${duplicateCount > 1 ? 'm' : ''} na lista)`
        toast.success(msg)
      } else if (allFound.length > 0) {
        toast.success('Todos os dispositivos já estão na lista')
      }

      // Individual error toasts for not found IDs
      notFound.forEach(id => toast.error(`ID ${id} não encontrado`))

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [devices, toast])

  /**
   * Add a single device by ID (Zebra scanner / OCR — one at a time).
   * Uses a debounced accumulator to consolidate rapid sequential scans into 1 toast.
   */
  const addSingleDevice = useCallback(async (input: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(ENDPOINTS.getDevice(input))
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || err.error || 'Device not found')
      }

      const data = await res.json()

      // Batch result via single scan (e.g. Zebra scans a batch barcode)
      if (data.devices && Array.isArray(data.devices)) {
        setDevices(prev => {
          const existingIds = new Set(prev.map(d => d.id))
          const newDevices = data.devices.filter((d: Device) => !existingIds.has(d.id))
          return newDevices.length > 0 ? [...prev, ...newDevices] : prev
        })
        const existingIds = new Set(devices.map(d => d.id))
        const added = data.devices.filter((d: Device) => !existingIds.has(d.id)).length
        if (added > 0) scheduleSingleToast(added)
        else toast.success('Todos os dispositivos já estão na lista')
      } else {
        const device: Device = data
        const isDuplicate = devices.some(d => d.id === device.id)

        if (isDuplicate) {
          toast.success(`${device.id} já está na lista`)
        } else {
          setDevices(prev => {
            if (prev.some(d => d.id === device.id)) return prev
            return [...prev, device]
          })
          scheduleSingleToast(1)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [devices, toast, scheduleSingleToast])

  const removeDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId))
  }, [])

  const clearDevices = useCallback(() => {
    setDevices([])
  }, [])

  const stats = useMemo(() => calculateDeviceStats(devices), [devices])

  return {
    devices,
    addAllDevices,
    addSingleDevice,
    removeDevice,
    clearDevices,
    stats,
    loading,
    error,
  }
}
