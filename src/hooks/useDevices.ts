import { useState, useCallback, useMemo, useRef } from 'react'
import { Device } from '@/types'
import { calculateDeviceStats } from '@/utils/deviceUtils'
import { ENDPOINTS } from '@/config/api'

export interface WorkorderOption {
  number: number
  title: string | null
  count: number
}

export interface DisambiguationState {
  batch: string
  workorders: WorkorderOption[]
}

// Runs fn over items with at most `concurrency` in-flight at once.
// Returns results in the same order as items (like Promise.allSettled).
async function allSettledConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
}

export function useDevices(toast: ToastFunctions) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disambiguationQueue, setDisambiguationQueue] = useState<DisambiguationState[]>([])

  // debounce para consolidar scans rápidos do Zebra em 1 toast
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

  const addAllDevices = useCallback(async (batches: string[], ids: string[]) => {
    if (batches.length === 0 && ids.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Fetch batches in parallel (usually just 1-2) and IDs with concurrency cap.
      // Each ID triggers ~10 BigQuery queries on the backend; capping at 15 concurrent
      // requests keeps the total under BigQuery's concurrent-job limit (~300).
      const [batchSettled, idSettled] = await Promise.all([
        Promise.allSettled(
          batches.map(async batch => {
            const res = await fetch(ENDPOINTS.getDevice(batch))
            if (!res.ok) throw new Error(batch)
            return res.json()
          })
        ),
        allSettledConcurrent(ids, 25, async id => {
          const res = await fetch(ENDPOINTS.getDevice(id))
          if (!res.ok) throw new Error(id)
          return (await res.json()) as Device
        })
      ])

      const allFound: Device[] = []
      const notFound: string[] = []
      const newDisambiguations: DisambiguationState[] = []

      batchSettled.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value
          if (data.needsDisambiguation) {
            newDisambiguations.push({ batch: data.batch, workorders: data.workorders })
          } else if (data.devices && Array.isArray(data.devices)) {
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

      notFound.forEach(id => toast.error(`ID ${id} não encontrado`))

      if (newDisambiguations.length > 0) {
        setDisambiguationQueue(prev => [...prev, ...newDisambiguations])
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [devices, toast])

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

      if (data.needsDisambiguation) {
        setDisambiguationQueue(prev => [...prev, { batch: data.batch, workorders: data.workorders }])
        return
      }

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

  const resolveDisambiguation = useCallback(async (workorderNumbers: number[]) => {
    setDisambiguationQueue(prev => prev.slice(1))
    const tokens = workorderNumbers.map(n => `#${String(n).padStart(5, '0')}`)
    await addAllDevices(tokens, [])
  }, [addAllDevices])

  const cancelDisambiguation = useCallback(() => {
    setDisambiguationQueue(prev => prev.slice(1))
  }, [])

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
    pendingDisambiguation: disambiguationQueue[0] ?? null,
    resolveDisambiguation,
    cancelDisambiguation,
  }
}
