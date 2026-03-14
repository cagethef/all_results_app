import { useState, useCallback } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import { DebuggingTable } from './DebuggingTable'
import { DeviceModal } from '../DeviceModal/DeviceModal'
import { Device } from '@/types'
import { ENDPOINTS } from '@/config/api'
import { loadTemplate } from '../Admin/WorkorderConfig'
import { fetchTemplate } from '@/lib/templateService'

export interface DebugDevice {
  device_id: string
  device_type: string
  sap_code: string
  batch_name: string
  created_at_production: string
  created_at_debugging: string
  days_in_debug: number
  hours_in_debug: number
  fail_name: string
  fail_type: string
  fail_descriptor: string
  fail_sequence: string
  step: string
  stage: string
  has_workorder: boolean
  workorder_id: string | null
}

const DEBUG_API_URL    = import.meta.env.VITE_DEBUG_API_URL ?? ''
const DEBUG_WO_LOG_URL = import.meta.env.VITE_DEBUG_WO_LOG_URL ?? ''
const CREATE_WO_URL    = import.meta.env.VITE_CREATE_WO_URL ?? ''

export function DebuggingPage() {
  const [devices, setDevices] = useState<DebugDevice[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [loadingDevice, setLoadingDevice] = useState<string | null>(null)
  const [markingWO, setMarkingWO] = useState<string | null>(null)
  const [removingWO, setRemovingWO] = useState<string | null>(null)

  const handleLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(DEBUG_API_URL)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data: DebugDevice[] = await res.json()
      setDevices(data)
      setSelectedIds(new Set())
    } catch (err) {
      setError('Não foi possível carregar os dispositivos. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback((filtered: DebugDevice[]) => {
    const allSelected = filtered.every(d => selectedIds.has(d.device_id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) filtered.forEach(d => next.delete(d.device_id))
      else filtered.forEach(d => next.add(d.device_id))
      return next
    })
  }, [selectedIds])

  const handleCreateWOs = useCallback(async () => {
    const selected = devices.filter(d => selectedIds.has(d.device_id))
    if (selected.length === 0) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`${DEBUG_API_URL}/workorders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: selected }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const result = await res.json()
      const succeededIds = new Set<string>(result.success?.map((d: DebugDevice) => d.device_id) ?? [])
      setDevices(prev => prev.filter(d => !succeededIds.has(d.device_id)))
      setSelectedIds(new Set())
    } catch (err) {
      setError('Falha ao criar work orders. Tente novamente.')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }, [devices, selectedIds])

  const handleMarkWO = useCallback(async (deviceId: string) => {
    setMarkingWO(deviceId)
    setError(null)
    try {
      const device = devices.find(d => d.device_id === deviceId)
      const res = await fetch(CREATE_WO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...device, template: (await fetchTemplate()) ?? loadTemplate() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setError('Token expirado. Execute refresh_token_headless.py para renovar.')
        } else {
          throw new Error(data.error ?? `Erro ${res.status}`)
        }
        return
      }
      setDevices(prev => prev.map(d =>
        d.device_id === deviceId
          ? { ...d, has_workorder: true, workorder_id: data.workorder_id }
          : d
      ))
    } catch (err) {
      console.error(err)
      setError('Falha ao criar work order. Tente novamente.')
    } finally {
      setMarkingWO(null)
    }
  }, [devices])

  const handleRemoveWO = useCallback(async (deviceId: string) => {
    setRemovingWO(deviceId)
    try {
      const res = await fetch(DEBUG_WO_LOG_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setDevices(prev => prev.map(d =>
        d.device_id === deviceId ? { ...d, has_workorder: false, workorder_id: null } : d
      ))
    } catch (err) {
      console.error(err)
      setError('Falha ao remover work order. Tente novamente.')
    } finally {
      setRemovingWO(null)
    }
  }, [])

  const handleDeviceClick = useCallback(async (deviceId: string) => {
    setLoadingDevice(deviceId)
    try {
      const res = await fetch(ENDPOINTS.getDevice(deviceId))
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data: Device = await res.json()
      setSelectedDevice(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDevice(null)
    }
  }, [])

  const selectedCount = selectedIds.size

  return (
    <>
    {selectedDevice && (
      <DeviceModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    )}
    <div className="px-6 py-6 space-y-4">
      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="px-6 pb-6">
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Toolbar row */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {devices.length > 0 && (
              <span>{devices.length} dispositivo{devices.length !== 1 ? 's' : ''}
                {selectedCount > 0 && <span className="text-primary-600 dark:text-primary-400"> · {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                onClick={handleCreateWOs}
                disabled={creating}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                Criar Work Orders ({selectedCount})
              </button>
            )}
            <button
              onClick={handleLoad}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Carregar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-primary-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dispositivos...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum dado carregado
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Clique em "Carregar" para buscar os dispositivos pendentes
            </p>
            <button
              onClick={handleLoad}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Carregar dados
            </button>
          </div>
        ) : (
          <DebuggingTable
            devices={devices}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onRowClick={handleDeviceClick}
            loadingDevice={loadingDevice}
            onMarkWO={handleMarkWO}
            onRemoveWO={handleRemoveWO}
            markingWO={markingWO}
            removingWO={removingWO}
          />
        )}
      </div>
    </div>
    </div>
    </>
  )
}
