import { useRef, useEffect, useState, useMemo } from 'react'
import { DebugDevice } from './DebuggingPage'
import { DebuggingRow } from './DebuggingRow'

type SortCol = 'device_id' | 'device_type' | 'batch_name' | 'days_in_debug' | 'fail_name' | 'has_workorder' | 'fail_descriptor' | 'sap_code'
type SortDir = 'asc' | 'desc'

interface DebuggingTableProps {
  devices: DebugDevice[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (filtered: DebugDevice[]) => void
  onRowClick: (id: string) => void
  loadingDevice: string | null
  onMarkWO: (id: string) => void
  onRemoveWO: (id: string) => void
  markingWO: string | null
  removingWO: string | null
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 text-gray-400 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
  return dir === 'asc'
    ? <svg className="w-3 h-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
    : <svg className="w-3 h-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
}

export function DebuggingTable({ devices, selectedIds, onToggle, onSelectAll, onRowClick, loadingDevice, onMarkWO, onRemoveWO, markingWO, removingWO }: DebuggingTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [sortCol, setSortCol] = useState<SortCol>('days_in_debug')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterType, setFilterType] = useState('all')
  const [filterFail, setFilterFail] = useState('all')
  const [filterDays, setFilterDays] = useState('all')
  const [filterWO, setFilterWO] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const deviceTypes = useMemo(() => [...new Set(devices.map(d => d.device_type).filter(Boolean))].sort(), [devices])
  const failNames   = useMemo(() => [...new Set(devices.map(d => d.fail_name).filter(Boolean))].sort(), [devices])

  const filtered = useMemo(() => {
    let result = devices

    if (search)           result = result.filter(d => d.device_id.toLowerCase().includes(search.toLowerCase()) || d.batch_name?.toLowerCase().includes(search.toLowerCase()))
    if (filterType !== 'all') result = result.filter(d => d.device_type === filterType)
    if (filterFail !== 'all') result = result.filter(d => d.fail_name === filterFail)
    if (filterDays === '3+')  result = result.filter(d => d.days_in_debug >= 3)
    if (filterDays === '7+')  result = result.filter(d => d.days_in_debug >= 7)
    if (filterWO === 'pending') result = result.filter(d => !d.has_workorder)
    if (filterWO === 'created') result = result.filter(d => d.has_workorder)

    return [...result].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'days_in_debug') return mul * ((a.days_in_debug ?? 0) - (b.days_in_debug ?? 0))
      if (sortCol === 'has_workorder') return mul * (Number(a.has_workorder) - Number(b.has_workorder))
      const va = (a[sortCol] ?? '') as string
      const vb = (b[sortCol] ?? '') as string
      return mul * va.localeCompare(vb)
    })
  }, [devices, search, filterType, filterFail, filterDays, filterWO, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, filterType, filterFail, filterDays, filterWO, sortCol, sortDir])

  const allSelected  = filtered.length > 0 && filtered.every(d => selectedIds.has(d.device_id))
  const someSelected = filtered.some(d => selectedIds.has(d.device_id))

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const thClass = "px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"

  return (
    <div>
      {/* Filtros */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar device ID ou lote..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 w-52"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="all">Todos os tipos</option>
          {deviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterFail}
          onChange={e => setFilterFail(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="all">Todas as falhas</option>
          {failNames.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={filterDays}
          onChange={e => setFilterDays(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="all">Todos os dias</option>
          <option value="3+">3+ dias</option>
          <option value="7+">7+ dias</option>
        </select>
        <select
          value={filterWO}
          onChange={e => setFilterWO(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="all">Todas as WOs</option>
          <option value="pending">Pendentes</option>
          <option value="created">WO Criada</option>
        </select>
        {(search || filterType !== 'all' || filterFail !== 'all' || filterDays !== 'all' || filterWO !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterType('all'); setFilterFail('all'); setFilterDays('all'); setFilterWO('all') }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} de {devices.length}
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum resultado para os filtros selecionados
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="pl-4 pr-2 py-4 w-8">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onSelectAll(filtered)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] cursor-pointer accent-primary-600"
                  />
                </th>
                <th className={thClass} onClick={() => handleSort('device_id')}>
                  <div className="flex items-center gap-1">Dispositivo <SortIcon active={sortCol === 'device_id'} dir={sortDir} /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('sap_code')}>
                  <div className="flex items-center gap-1">SAP <SortIcon active={sortCol === 'sap_code'} dir={sortDir} /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('batch_name')}>
                  <div className="flex items-center gap-1">Lote <SortIcon active={sortCol === 'batch_name'} dir={sortDir} /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('days_in_debug')}>
                  <div className="flex items-center gap-1">Dias <SortIcon active={sortCol === 'days_in_debug'} dir={sortDir} /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('fail_name')}>
                  <div className="flex items-center gap-1">Falha <SortIcon active={sortCol === 'fail_name'} dir={sortDir} /></div>
                </th>
                <th className={thClass} onClick={() => handleSort('fail_descriptor')}>
                  <div className="flex items-center gap-1">Descrição <SortIcon active={sortCol === 'fail_descriptor'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} whitespace-nowrap`} onClick={() => handleSort('has_workorder')}>
                  <div className="flex items-center gap-1">Work Order <SortIcon active={sortCol === 'has_workorder'} dir={sortDir} /></div>
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginated.map(device => (
                <DebuggingRow
                  key={device.device_id}
                  device={device}
                  isSelected={selectedIds.has(device.device_id)}
                  onToggle={onToggle}
                  onRowClick={onRowClick}
                  isLoadingDetails={loadingDevice === device.device_id}
                  onMarkWO={onMarkWO}
                  onRemoveWO={onRemoveWO}
                  isMarkingWO={markingWO === device.device_id}
                  isRemovingWO={removingWO === device.device_id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
                : <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-7 text-xs font-medium rounded-lg transition-colors ${
                      page === p
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]'
                    }`}
                  >{p}</button>
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
