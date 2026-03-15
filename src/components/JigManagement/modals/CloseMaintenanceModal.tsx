import { useState } from 'react'
import { X, CheckCircle2, Loader2 } from 'lucide-react'
import { closeMaintenance, updateJigStatus } from '@/lib/jigService'
import { useAuth } from '@/contexts/AuthContext'
import type { Jig, JigLog, JigModificationType, JigModificationReason } from '@/types'

interface Props {
  jig: Jig
  log: JigLog
  onClose: () => void
  onSuccess: () => void
}

const MOD_TYPES: JigModificationType[] = ['Hardware', 'Mecânica', 'Calibração', 'Software']

const MOD_REASONS: JigModificationReason[] = [
  'Falha recorrente no teste',
  'Melhoria de tempo de teste',
  'Erro de montagem',
  'Mudança de produto',
  'Segurança',
  'Outro',
]

interface FormState {
  modificationType: JigModificationType | ''
  modificationReason: JigModificationReason | ''
  modificationReasonCustom: string
  whatChanged: string
  technicalDetail: string
  needsRetest: boolean | null
  risks: string
}

const INITIAL: FormState = {
  modificationType:         '',
  modificationReason:       '',
  modificationReasonCustom: '',
  whatChanged:              '',
  technicalDetail:          '',
  needsRetest:              null,
  risks:                    '',
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

export function CloseMaintenanceModal({ jig, log, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const isValid =
    form.modificationType !== '' &&
    form.modificationReason !== '' &&
    (form.modificationReason !== 'Outro' || form.modificationReasonCustom.trim().length > 0) &&
    form.whatChanged.trim().length > 0 &&
    form.needsRetest !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !user) return
    setSubmitting(true)
    setError(null)
    try {
      await closeMaintenance(log.id, {
        closedBy:                 user.email,
        closedByName:             user.name,
        modificationType:         form.modificationType as JigModificationType,
        modificationReason:       form.modificationReason as JigModificationReason,
        modificationReasonCustom: form.modificationReasonCustom.trim() || undefined,
        whatChanged:              form.whatChanged.trim(),
        technicalDetail:          form.technicalDetail.trim() || undefined,
        needsRetest:              form.needsRetest!,
        risks:                    form.risks.trim() || undefined,
      }, jig.id, jig.name)
      await updateJigStatus(jig.id, 'available', user.email, undefined)
      onSuccess()
    } catch {
      setError('Erro ao concluir manutenção. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#141414] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#141414] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Concluir Manutenção</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{jig.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Two selects side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Modification type */}
            <div>
              <Label required>Tipo de modificação</Label>
              <select
                value={form.modificationType}
                onChange={e => set('modificationType', e.target.value as JigModificationType)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {MOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Modification reason */}
            <div>
              <Label required>Motivo da modificação</Label>
              <select
                value={form.modificationReason}
                onChange={e => { set('modificationReason', e.target.value as JigModificationReason); set('modificationReasonCustom', '') }}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {MOD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Custom reason */}
          {form.modificationReason === 'Outro' && (
            <div>
              <Label required>Especifique o motivo</Label>
              <input
                type="text"
                value={form.modificationReasonCustom}
                onChange={e => set('modificationReasonCustom', e.target.value)}
                placeholder="Descreva o motivo..."
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* What changed */}
          <div>
            <Label required>O que foi modificado? (antes → depois)</Label>
            <textarea
              value={form.whatChanged}
              onChange={e => set('whatChanged', e.target.value)}
              rows={3}
              placeholder="Ex: Antes: sensor modelo X | Depois: sensor modelo Y"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Technical detail */}
          <div>
            <Label>Detalhe técnico da modificação <span className="text-xs text-gray-400 font-normal">(opcional)</span></Label>
            <textarea
              value={form.technicalDetail}
              onChange={e => set('technicalDetail', e.target.value)}
              rows={2}
              placeholder="Informações técnicas adicionais, números de parte, especificações..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Needs retest */}
          <div className="space-y-2">
            <Label required>Será preciso retestar dispositivos ou lotes?</Label>
            <div className="flex gap-3">
              {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set('needsRetest', v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    form.needsRetest === v
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Risks */}
          <div>
            <Label>Existe risco ou observação importante? <span className="text-xs text-gray-400 font-normal">(opcional)</span></Label>
            <textarea
              value={form.risks}
              onChange={e => set('risks', e.target.value)}
              rows={2}
              placeholder="Riscos, cuidados especiais, atenções necessárias..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Concluir Manutenção
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
