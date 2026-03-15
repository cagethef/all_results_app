export type TestStatus = 'approved' | 'failed' | 'pending' | 'warning'

export interface Parameter {
  name: string
  parameterType?: string
  expected?: string | number
  measured?: string | number
  unit?: string
  status: TestStatus
  errorPercentage?: number
  rawValue?: number
}

export interface Section {
  name: string
  parameters: Parameter[]
}

export interface Test {
  testName: string
  testType: string
  status: TestStatus
  date?: string
  responsible?: string
  observations?: string
  parameters?: Parameter[]
  sections?: Section[]
}

export interface ChipInfo {
  type: 'Single Chip' | 'Dual Chip' | 'Não Identificado'
  chip1: {
    carrier: string
    ccid: string
  }
  chip2?: {
    carrier: string
    ccid: string
  }
}

export interface Device {
  id: string
  deviceType: string
  overallStatus: TestStatus
  tests: Test[]
  chipInfo?: ChipInfo
  batch?: string
  protocol?: string
}

export interface QRCodeResult {
  rawText: string
  deviceId: string | null
  isValid: boolean
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────

export interface RolePermissions {
  view_results:        boolean
  view_dashboard:      boolean
  view_debugging:      boolean
  view_jig_management: boolean
  open_maintenance:    boolean
  close_maintenance:   boolean
  approve_schedule:    boolean
  manage_users:        boolean
  manage_roles:        boolean
}

export const PERMISSION_LABELS: Record<keyof RolePermissions, string> = {
  view_results:        'Ver Resultados',
  view_dashboard:      'Ver Dashboard',
  view_debugging:      'Debugging',
  view_jig_management: 'Ver Gestão de Jigas',
  open_maintenance:    'Abrir Manutenção',
  close_maintenance:   'Concluir Manutenção',
  approve_schedule:    'Aprovar Agendamento',
  manage_users:        'Gerenciar Usuários',
  manage_roles:        'Gerenciar Cargos',
}

export const PERMISSION_GROUPS: { label: string; keys: (keyof RolePermissions)[] }[] = [
  { label: 'Visualização',    keys: ['view_results', 'view_dashboard', 'view_debugging', 'view_jig_management'] },
  { label: 'Jigas',           keys: ['open_maintenance', 'close_maintenance', 'approve_schedule'] },
  { label: 'Administração',   keys: ['manage_users', 'manage_roles'] },
]

export interface Role {
  id: string
  name: string
  color: string
  isSystem: boolean
  permissions: RolePermissions
  createdAt?: string
  createdBy?: string
}

export function hasPermission(permissions: RolePermissions | null, key: keyof RolePermissions): boolean {
  if (!permissions) return false
  return permissions[key] === true
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'role_changed'
  | 'schedule_pending'
  | 'schedule_approved'
  | 'schedule_rejected'
  | 'schedule_cancelled'
  | 'maintenance_completed'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  createdAt: string
  toEmail?: string
  toPermission?: string
  readBy: string[]
  jigId?: string
  jigName?: string
}

// ─── Jig Management ───────────────────────────────────────────────────────────

export type JigStatus = 'available' | 'maintenance' | 'scheduled'

export type JigUrgency = 'low' | 'medium' | 'high' | 'critical'

export type JigModificationType = 'Hardware' | 'Mecânica' | 'Calibração' | 'Software'

export type JigModificationReason =
  | 'Falha recorrente no teste'
  | 'Melhoria de tempo de teste'
  | 'Erro de montagem'
  | 'Mudança de produto'
  | 'Segurança'
  | 'Outro'

export type JigAffectedDevices = 'none' | '1-5' | '6-20' | '20+'

export type JigLogType = 'maintenance' | 'scheduled_change'

export type JigLogStatus = 'open' | 'completed' | 'cancelled'

export interface Jig {
  id: string
  name: string
  status: JigStatus
  currentLogId?: string
  updatedAt: string
  updatedBy?: string
  slackThreadTs?: string
}

export interface JigLog {
  id: string
  jigId: string
  jigName: string
  type: JigLogType
  status: JigLogStatus

  // Opening (QI fills)
  openedBy: string
  openedByName: string
  openedByPicture?: string
  openedAt: string
  symptom: string
  blockingTests: boolean
  urgency: JigUrgency
  affectedDevices: JigAffectedDevices
  identifiedAt: string

  // Closing (tech fills)
  closedBy?: string
  closedByName?: string
  closedAt?: string
  modificationType?: JigModificationType
  modificationReason?: JigModificationReason
  modificationReasonCustom?: string
  whatChanged?: string
  technicalDetail?: string
  needsRetest?: boolean
  risks?: string

  // Scheduled change
  scheduledFor?: string
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  authorizedBy?: string
  authorizedByName?: string
  authorizedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledAt?: string
  cancellationReason?: string
}
