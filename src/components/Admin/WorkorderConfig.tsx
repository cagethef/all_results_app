import { useState } from 'react'
import {
  Type, ChevronDown, Calendar, Paperclip, ToggleLeft,
  Heading, Plus, Trash2, RotateCcw, Check, ChevronUp, GripVertical
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'heading' | 'simpleText' | 'select' | 'date' | 'file' | 'yesNoCustom'

export interface TemplateField {
  id: string
  type: FieldType
  name: string
  required?: boolean
  mappedTo?: string    // which DebugDevice key to pre-fill (undefined = manual)
  options?: string[]   // for select fields
}

// ── Device fields available for mapping ──────────────────────────────────────

export const DEVICE_FIELDS: { value: string; label: string }[] = [
  { value: 'device_id',             label: 'ID do Dispositivo' },
  { value: 'device_type',           label: 'Tipo de Dispositivo' },
  { value: 'sap_code',              label: 'Código SAP' },
  { value: 'batch_name',            label: 'Nome do Lote' },
  { value: 'created_at_production', label: 'Data de Produção' },
  { value: 'created_at_debugging',  label: 'Data de Entrada no Debug' },
  { value: 'days_in_debug',         label: 'Dias em Debug' },
  { value: 'fail_name',             label: 'Nome da Falha' },
  { value: 'fail_type',             label: 'Tipo de Falha' },
  { value: 'fail_descriptor',       label: 'Descrição da Falha' },
  { value: 'fail_sequence',         label: 'Sequência da Falha' },
  { value: 'step',                  label: 'Etapa (Step)' },
  { value: 'stage',                 label: 'Estágio (Stage)' },
]

// ── Default template (from procedure_template.json) ──────────────────────────

const DEFAULT_TEMPLATE: TemplateField[] = [
  { id: 'h1', type: 'heading',     name: 'Device data' },
  { id: 'f1', type: 'simpleText',  name: 'ID Code',      required: true, mappedTo: 'device_id' },
  { id: 'f2', type: 'select',      name: 'Product Type', required: true, mappedTo: 'device_type',
    options: ['Smart Receiver Pro','Smart Trac Ultra','Smart Trac Ultra Gen 2','Smart Trac Ultra Ex',
              'Energy Trac','Smart Receiver Ultra','Smart Trac Pro','Uni Trac','Omni Trac Cpu','Omni Trac Receiver'] },
  { id: 'f3', type: 'simpleText',  name: 'SAP Code',         required: true, mappedTo: 'sap_code' },
  { id: 'f4', type: 'date',        name: 'Entry Date',       required: true, mappedTo: 'created_at_debugging' },
  { id: 'f5', type: 'simpleText',  name: 'Production batch', required: true, mappedTo: 'batch_name' },
  { id: 'f6', type: 'select',      name: 'Fault identified in Product Inspection', required: true, mappedTo: 'fail_name',
    options: ['Offline','Checksum','Communication','Last reset problem','Sample','Bootcount','Reset','Sleep',
              'Sinal Fraco','Wifi Antenna','Signal','Pânico de Software','Task Watchdog','RTC Watchdog',
              'Intervalo de Amostra','Firmware Incompatível','Intermitência','Porcentagem baixa de status',
              'ATP - Comunicação','ATP - RF','Not Registred','Config','Firmware','Accel','No Status',
              'Thermistor','WTD','Memory','Intervalo de Status','ExtID Invalido','Chave Inválida','OTA Failed',
              'Flash Error','Erro de Brownout','Ausência de Firmware','Dados de tensão incoerente',
              'Dados de corrente incoerente','Mau contato na fonte','Led','Ram Error',
              'ATP - Temperature Accelerometer Error','ATP - Thermistor Error','ATP - Low Status',
              'Falha na coleta de Tensão','ATP - Sensor Signal','ATP - analogCurrent',
              'Ausência de chip secundário','ATP - Temperatura CPU','ATP - Tensão do Modem',
              'Falha de retenção de energia','ATP - Temperatura do modem',
              'ITP - Humidity Sensor','ITP - Piezo RMS','ITP - FRF','ITP - Accel'] },
  { id: 'h2', type: 'heading',     name: 'Failure Data' },
  { id: 'f7', type: 'select',      name: 'Fail Type', mappedTo: 'fail_type',
    options: ['Falha de Produção','Falha de Material','Falha do Fornecedor','Ausente de Falha','Falha de Firmware'] },
  { id: 'f8', type: 'select',      name: 'Root Cause of Failure', required: true, mappedTo: 'fail_descriptor',
    options: ['Contaminação do conector do termistor por Conformal Coating',
              'Ponte de Solda nos terminais do conector do termistor',
              'Dispositivo sem Firmware','Terminais da fonte de alimentação invertidos',
              'Antena Wifi ESP32 com rompimento parcial','Ausência do resistor R11',
              'Conector da bateria invertido','Chip Defeituoso','Chip Ausente','Ausente de Falha',
              'Modem Defeituoso','Arquivo de OTA corrompido','Firmware Corrompido',
              'Bateria não conectada','Key Inválida ou Inexistente','Dispositivo Não Cadastrado'] },
  { id: 'f9', type: 'file',        name: 'Evidences' },
  { id: 'f10', type: 'yesNoCustom', name: 'OPS validation', required: true },
  { id: 'f11', type: 'date',       name: 'Completion Date', required: true },
]

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wo_template_v2'

export function loadTemplate(): TemplateField[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_TEMPLATE.map(f => ({ ...f }))
}

function saveTemplate(t: TemplateField[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Field type helpers ───────────────────────────────────────────────────────

const TYPE_META: Record<FieldType, { label: string; Icon: React.ElementType; color: string; canMap: boolean }> = {
  heading:     { label: 'Seção',       Icon: Heading,     color: 'text-purple-500', canMap: false },
  simpleText:  { label: 'Texto',       Icon: Type,        color: 'text-blue-500',   canMap: true  },
  select:      { label: 'Seleção',     Icon: ChevronDown, color: 'text-orange-500', canMap: true  },
  date:        { label: 'Data',        Icon: Calendar,    color: 'text-green-500',  canMap: true  },
  file:        { label: 'Arquivo',     Icon: Paperclip,   color: 'text-gray-500',   canMap: false },
  yesNoCustom: { label: 'Sim / Não',   Icon: ToggleLeft,  color: 'text-teal-500',   canMap: false },
}

const FILLABLE_TYPES: FieldType[] = ['simpleText', 'select', 'date']

// ── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: TemplateField
  onUpdate: (id: string, patch: Partial<TemplateField>) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const meta = TYPE_META[field.type]
  const Icon = meta.Icon
  const isHeading = field.type === 'heading'
  const canMap = meta.canMap

  const mappedLabel = field.mappedTo
    ? DEVICE_FIELDS.find(f => f.value === field.mappedTo)?.label ?? field.mappedTo
    : null

  return (
    <div className={`rounded-lg border transition-colors ${
      open
        ? 'border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]'
    } ${isHeading ? 'border-dashed' : ''}`}>
      {/* Row header — click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <GripVertical size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab" />
        <Icon size={15} className={`${meta.color} flex-shrink-0`} />
        <span className={`flex-1 text-sm ${isHeading ? 'font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-xs' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
          {field.name}
        </span>
        {field.required && !isHeading && (
          <span className="text-[10px] font-semibold text-red-500 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20">
            obrigatório
          </span>
        )}
        {mappedLabel && (
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
            ← {mappedLabel}
          </span>
        )}
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {/* Expanded edit panel */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do campo</label>
            <input
              type="text"
              value={field.name}
              onChange={e => onUpdate(field.id, { name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Required toggle (non-headings) */}
          {!isHeading && (
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Obrigatório</label>
              <button
                onClick={() => onUpdate(field.id, { required: !field.required })}
                className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}

          {/* Mapping (only for fillable types) */}
          {canMap && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Auto-preencher com
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onUpdate(field.id, { mappedTo: undefined })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    !field.mappedTo
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-transparent'
                      : 'bg-white dark:bg-[#141414] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  Manual
                </button>
                {DEVICE_FIELDS.map(df => (
                  <button
                    key={df.value}
                    onClick={() => onUpdate(field.id, { mappedTo: df.value })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      field.mappedTo === df.value
                        ? 'bg-blue-600 text-white border-transparent'
                        : 'bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options preview (select fields) */}
          {field.type === 'select' && field.options && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Opções ({field.options.length})
              </label>
              <textarea
                rows={4}
                value={field.options.join('\n')}
                onChange={e => onUpdate(field.id, { options: e.target.value.split('\n') })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none font-mono"
                placeholder="Uma opção por linha"
              />
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onDelete(field.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Remover campo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add field panel ──────────────────────────────────────────────────────────

const ADD_TYPES: { type: FieldType; label: string; Icon: React.ElementType }[] = [
  { type: 'simpleText',  label: 'Texto',     Icon: Type        },
  { type: 'select',      label: 'Seleção',   Icon: ChevronDown },
  { type: 'date',        label: 'Data',      Icon: Calendar    },
  { type: 'heading',     label: 'Seção',     Icon: Heading     },
  { type: 'file',        label: 'Arquivo',   Icon: Paperclip   },
  { type: 'yesNoCustom', label: 'Sim/Não',   Icon: ToggleLeft  },
]

function AddFieldPanel({ onAdd }: { onAdd: (f: TemplateField) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FieldType>('simpleText')
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ id: uid(), type, name: name.trim(), required: false })
    setName('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <Plus size={14} />
        Adicionar campo
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/10 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Novo campo</p>
      <div className="flex flex-wrap gap-2">
        {ADD_TYPES.map(({ type: t, label, Icon }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              type === t
                ? 'bg-primary-600 text-white border-transparent'
                : 'bg-white dark:bg-[#141414] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-400'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>
      <input
        autoFocus
        type="text"
        placeholder="Nome do campo..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false) }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-40"
        >
          <Plus size={12} />
          Adicionar
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function WorkorderConfig() {
  const [fields, setFields] = useState<TemplateField[]>(loadTemplate)
  const [saved, setSaved] = useState(false)

  const update = (id: string, patch: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
    setSaved(false)
  }

  const remove = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    setSaved(false)
  }

  const add = (field: TemplateField) => {
    setFields(prev => [...prev, field])
    setSaved(false)
  }

  const handleSave = () => {
    saveTemplate(fields)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    const defaults = DEFAULT_TEMPLATE.map(f => ({ ...f }))
    setFields(defaults)
    saveTemplate(defaults)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fillableCount = fields.filter(f => FILLABLE_TYPES.includes(f.type) && f.mappedTo).length
  const fillableTotal = fields.filter(f => FILLABLE_TYPES.includes(f.type)).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {fields.length} campo{fields.length !== 1 ? 's' : ''} · {fillableCount}/{fillableTotal} com preenchimento automático
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
          >
            <RotateCcw size={12} />
            Restaurar padrão
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              saved ? 'bg-green-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {saved ? <><Check size={12} /> Salvo</> : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Fields list */}
      <div className="space-y-2">
        {fields.map(field => (
          <FieldRow
            key={field.id}
            field={field}
            onUpdate={update}
            onDelete={remove}
          />
        ))}
        <AddFieldPanel onAdd={add} />
      </div>
    </div>
  )
}
