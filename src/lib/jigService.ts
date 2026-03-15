import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Jig, JigLog, JigStatus } from '@/types'
import { createNotification } from './notificationService'
import { notifyJigEvent } from './slackService'
import { fmtDate } from './dateUtils'

const URGENCY_SLACK: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
}

const JIGAS_COLLECTION = 'jigs'
const LOGS_COLLECTION  = 'jigLogs'

// ─── Seed default jigs if they don't exist ───────────────────────────────────

const DEFAULT_JIGS: Omit<Jig, 'updatedAt'>[] = [
  { id: 'itp-omni-trac',       name: 'ITP Omni Trac',                status: 'available' },
  { id: 'itp-smarttrac-gen2',  name: 'ITP Smart Trac Ultra Gen 2',   status: 'available' },
  { id: 'estanqueidade-1',     name: 'Estanqueidade 1',              status: 'available' },
  { id: 'estanqueidade-2',     name: 'Estanqueidade 2',              status: 'available' },
]

function nameToId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function addJig(name: string, createdBy: string): Promise<string> {
  const id  = nameToId(name)
  const ref = doc(db, JIGAS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (snap.exists()) throw new Error('Já existe uma jiga com esse nome.')
  await setDoc(ref, { name, status: 'available', updatedAt: serverTimestamp(), updatedBy: createdBy })
  return id
}

export async function renameJig(jigId: string, newName: string, updatedBy: string): Promise<void> {
  await updateDoc(doc(db, JIGAS_COLLECTION, jigId), { name: newName, updatedAt: serverTimestamp(), updatedBy })
}

export async function deleteJig(jigId: string): Promise<void> {
  await deleteDoc(doc(db, JIGAS_COLLECTION, jigId))
}

export async function seedJigsIfNeeded(): Promise<void> {
  for (const jig of DEFAULT_JIGS) {
    const ref = doc(db, JIGAS_COLLECTION, jig.id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { ...jig, updatedAt: serverTimestamp() })
    }
  }
}

// ─── Jig reads ────────────────────────────────────────────────────────────────

export async function getJigs(): Promise<Jig[]> {
  const snap = await getDocs(collection(db, JIGAS_COLLECTION))
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt ?? ''),
    } as Jig
  })
}

// ─── Jig status update ────────────────────────────────────────────────────────

export async function updateJigStatus(
  jigId: string,
  status: JigStatus,
  updatedBy: string,
  logId?: string,
): Promise<void> {
  await updateDoc(doc(db, JIGAS_COLLECTION, jigId), {
    status,
    updatedBy,
    currentLogId: logId ?? null,
    updatedAt: serverTimestamp(),
  })
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function getJigLogs(): Promise<JigLog[]> {
  const q = query(collection(db, LOGS_COLLECTION), orderBy('openedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    const toISO = (v: unknown) =>
      v instanceof Timestamp ? v.toDate().toISOString() : (v as string | undefined) ?? ''
    return {
      ...data,
      id: d.id,
      openedAt:    toISO(data.openedAt),
      closedAt:    data.closedAt    ? toISO(data.closedAt)    : undefined,
      authorizedAt: data.authorizedAt ? toISO(data.authorizedAt) : undefined,
    } as JigLog
  })
}

export async function openMaintenance(
  log: Omit<JigLog, 'id' | 'openedAt' | 'status' | 'closedAt' | 'closedBy' | 'closedByName' | 'approvalStatus' | 'rejectedBy' | 'rejectedAt'>,
): Promise<string> {
  const ref = doc(collection(db, LOGS_COLLECTION))
  await setDoc(ref, {
    ...log,
    status: 'open',
    openedAt: serverTimestamp(),
  })
  notifyJigEvent({
    jigId:      log.jigId,
    jigName:    log.jigName,
    replyText:  `🔧 Manutenção aberta por {actor} — Urgência: *${URGENCY_SLACK[log.urgency] ?? log.urgency}* · "${log.symptom}"`,
    newStatus:  'maintenance',
    modifiedAt: new Date().toISOString(),
    actorEmail: log.openedBy,
    actorName:  log.openedByName,
  }).catch(() => {})
  return ref.id
}

export async function scheduleMaintenance(log: {
  jigId: string
  jigName: string
  openedBy: string
  openedByName: string
  openedByPicture?: string
  reason: string
  scheduledFor: string
}): Promise<string> {
  const ref = doc(collection(db, LOGS_COLLECTION))
  await setDoc(ref, {
    jigId:            log.jigId,
    jigName:          log.jigName,
    type:             'scheduled_change',
    status:           'open',
    approvalStatus:   'pending',
    openedBy:         log.openedBy,
    openedByName:     log.openedByName,
    ...(log.openedByPicture && { openedByPicture: log.openedByPicture }),
    openedAt:         serverTimestamp(),
    symptom:          log.reason,
    scheduledFor:     log.scheduledFor,
    blockingTests:    false,
    urgency:          'low',
    affectedDevices:  'none',
    identifiedAt:     log.scheduledFor,
  })
  await updateJigStatus(log.jigId, 'scheduled', log.openedBy, ref.id)
  createNotification({
    type:          'schedule_pending',
    title:         'Agendamento aguardando aprovação',
    body:          `${log.openedByName} agendou ${log.jigName} para ${fmtDate(log.scheduledFor)}`,
    toPermission:  'approve_schedule',
    jigId:         log.jigId,
    jigName:       log.jigName,
  }).catch(() => {})
  notifyJigEvent({
    jigId:             log.jigId,
    jigName:           log.jigName,
    replyText:         `📅 Agendamento criado por {actor} para *${fmtDate(log.scheduledFor)}* · "${log.reason}" — aguardando aprovação`,
    newStatus:         'scheduled',
    scheduledFor:      log.scheduledFor,
    scheduledReason:   log.reason,
    modifiedAt:        new Date().toISOString(),
    actorEmail:        log.openedBy,
    actorName:         log.openedByName,
    mentionPermission: 'approve_schedule',
  }).catch(() => {})
  return ref.id
}

export async function approveSchedule(
  logId: string,
  jigId: string,
  approvedBy: string,
  approvedByName: string,
  creatorEmail: string,
  jigName: string,
  scheduledFor: string,
): Promise<void> {
  await updateDoc(doc(db, LOGS_COLLECTION, logId), {
    approvalStatus:   'approved',
    authorizedBy:     approvedBy,
    authorizedByName: approvedByName,
    authorizedAt:     serverTimestamp(),
  })
  createNotification({
    type:    'schedule_approved',
    title:   'Agendamento aprovado',
    body:    `Seu agendamento para ${jigName} em ${fmtDate(scheduledFor)} foi aprovado por ${approvedByName}`,
    toEmail: creatorEmail,
    jigName,
  }).catch(() => {})
  notifyJigEvent({
    jigId,
    jigName,
    replyText:    '✅ Agendamento aprovado por {actor}',
    newStatus:    'scheduled',
    scheduledFor,
    modifiedAt:   new Date().toISOString(),
    actorEmail:   approvedBy,
    actorName:    approvedByName,
    mentionEmail: creatorEmail,
  }).catch(() => {})
}

export async function rejectSchedule(
  logId: string,
  jigId: string,
  rejectedBy: string,
  creatorEmail: string,
  jigName: string,
): Promise<void> {
  await updateDoc(doc(db, LOGS_COLLECTION, logId), {
    approvalStatus: 'rejected',
    status:         'cancelled',
    rejectedBy,
    rejectedAt:     serverTimestamp(),
  })
  await updateJigStatus(jigId, 'available', rejectedBy)
  createNotification({
    type:    'schedule_rejected',
    title:   'Agendamento cancelado',
    body:    `Seu agendamento para ${jigName} foi cancelado`,
    toEmail: creatorEmail,
    jigName,
  }).catch(() => {})
  notifyJigEvent({
    jigId,
    jigName,
    replyText:    '❌ Agendamento reprovado por {actor}',
    newStatus:    'available',
    modifiedAt:   new Date().toISOString(),
    actorEmail:   rejectedBy,
    mentionEmail: creatorEmail,
  }).catch(() => {})
}

export async function cancelApprovedSchedule(
  logId: string,
  jigId: string,
  cancelledBy: string,
  cancelledByName: string,
  reason: string,
  creatorEmail: string,
  jigName: string,
): Promise<void> {
  await updateDoc(doc(db, LOGS_COLLECTION, logId), {
    approvalStatus:     'cancelled',
    status:             'cancelled',
    cancelledBy,
    cancelledByName,
    cancelledAt:        serverTimestamp(),
    cancellationReason: reason,
  })
  await updateJigStatus(jigId, 'available', cancelledBy)
  createNotification({
    type:    'schedule_cancelled',
    title:   'Agendamento cancelado',
    body:    `Seu agendamento para ${jigName} foi cancelado por ${cancelledByName}`,
    toEmail: creatorEmail,
    jigName,
  }).catch(() => {})
  notifyJigEvent({
    jigId,
    jigName,
    replyText:    '❌ Agendamento cancelado por {actor}',
    newStatus:    'available',
    modifiedAt:   new Date().toISOString(),
    actorEmail:   cancelledBy,
    actorName:    cancelledByName,
    mentionEmail: creatorEmail,
  }).catch(() => {})
}

export async function autoTransitionScheduled(
  jigs: Jig[],
  logs: JigLog[],
  updatedBy: string,
): Promise<boolean> {
  const now = new Date()
  let any = false
  for (const jig of jigs) {
    if (jig.status !== 'scheduled' || !jig.currentLogId) continue
    const log = logs.find(l => l.id === jig.currentLogId)
    if (!log || log.approvalStatus !== 'approved' || !log.scheduledFor) continue
    if (new Date(log.scheduledFor) <= now) {
      await updateJigStatus(jig.id, 'maintenance', updatedBy, jig.currentLogId)
      notifyJigEvent({
        jigId:      jig.id,
        jigName:    jig.name,
        replyText:  `🔧 Manutenção iniciada — agendamento de ${fmtDate(log.scheduledFor)} atingiu a data`,
        newStatus:  'maintenance',
        modifiedAt: new Date().toISOString(),
      }).catch(() => {})
      any = true
    }
  }
  return any
}

export async function closeMaintenance(
  logId: string,
  data: Pick<
    JigLog,
    | 'closedBy' | 'closedByName'
    | 'modificationType' | 'modificationReason' | 'modificationReasonCustom'
    | 'whatChanged' | 'technicalDetail' | 'needsRetest' | 'risks'
  >,
  jigId: string,
  jigName: string,
): Promise<void> {
  // Firestore rejects undefined values — strip them out
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  )
  await updateDoc(doc(db, LOGS_COLLECTION, logId), {
    ...clean,
    status: 'completed',
    closedAt: serverTimestamp(),
  })
  createNotification({
    type:         'maintenance_completed',
    title:        'Manutenção concluída',
    body:         `${jigName} está disponível novamente`,
    toPermission: 'approve_schedule',
    jigName,
  }).catch(() => {})
  const reason = data.modificationReason === 'Outro' && data.modificationReasonCustom
    ? data.modificationReasonCustom
    : data.modificationReason

  const replyLines = [
    '✅ Manutenção concluída por {actor}',
    '',
    `*Tipo de modificação:* ${data.modificationType}`,
    `*Motivo:* ${reason}`,
    `*O que foi modificado:* ${data.whatChanged}`,
    ...(data.technicalDetail ? [`*Detalhe técnico:* ${data.technicalDetail}`] : []),
    `*Reteste necessário:* ${data.needsRetest ? 'Sim' : 'Não'}`,
    ...(data.risks ? [`*Riscos / Observações:* ${data.risks}`] : []),
  ]

  notifyJigEvent({
    jigId,
    jigName,
    replyText:         replyLines.join('\n'),
    newStatus:         'available',
    modifiedAt:        new Date().toISOString(),
    actorEmail:        data.closedBy,
    actorName:         data.closedByName,
    mentionPermission: 'approve_schedule',
  }).catch(() => {})
}
