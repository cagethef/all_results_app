import {
  collection, doc, getDocs, getDoc,
  setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Role, RolePermissions } from '@/types'

const COL = 'roles'

const none: RolePermissions = {
  view_results: false, view_dashboard: false, view_debugging: false,
  view_jig_management: false, open_maintenance: false, close_maintenance: false,
  approve_schedule: false, manage_users: false, manage_roles: false,
}

const SEED_ROLES: Omit<Role, 'createdAt'>[] = [
  // ── System roles ──────────────────────────────────────────────────────────
  {
    id: 'user', name: 'User', color: '#94a3b8', isSystem: true,
    permissions: { ...none, view_results: true, view_dashboard: true, view_jig_management: true },
  },
  {
    id: 'admin', name: 'Admin', color: '#f59e0b', isSystem: true,
    permissions: {
      view_results: true, view_dashboard: true, view_debugging: true,
      view_jig_management: true, open_maintenance: true, close_maintenance: true,
      approve_schedule: true, manage_users: true, manage_roles: false,
    },
  },
  {
    id: 'master', name: 'Master', color: 'rainbow', isSystem: true,
    permissions: {
      view_results: true, view_dashboard: true, view_debugging: true,
      view_jig_management: true, open_maintenance: true, close_maintenance: true,
      approve_schedule: true, manage_users: true, manage_roles: true,
    },
  },
  // ── Pre-created (non-system) ───────────────────────────────────────────────
  {
    id: 'quality_inspector', name: 'Quality Inspector', color: '#3b82f6', isSystem: false,
    permissions: { ...none, view_results: true, view_dashboard: true, view_jig_management: true, open_maintenance: true },
  },
  {
    id: 'quality_inspector_debug', name: 'Quality Inspector Debug', color: '#8b5cf6', isSystem: false,
    permissions: {
      view_results: true, view_dashboard: true, view_debugging: true,
      view_jig_management: true, open_maintenance: true, close_maintenance: true,
      approve_schedule: true, manage_users: false, manage_roles: false,
    },
  },
]

export async function seedRolesIfNeeded(): Promise<void> {
  for (const role of SEED_ROLES) {
    const ref = doc(db, COL, role.id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { ...role, createdAt: serverTimestamp() })
    }
  }
}

export async function getRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt ?? ''),
    } as Role
  })
}

export async function fetchRolePermissions(roleId: string): Promise<RolePermissions | null> {
  // Backwards compat: map legacy 'dev' to master
  const id = roleId === 'dev' ? 'master' : roleId
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return snap.data().permissions as RolePermissions
}

export async function createRole(
  role: Omit<Role, 'id' | 'createdAt' | 'isSystem'>,
  createdBy: string,
): Promise<string> {
  const id = role.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  await setDoc(doc(db, COL, id), {
    ...role,
    id,
    isSystem: false,
    createdBy,
    createdAt: serverTimestamp(),
  })
  return id
}

export async function updateRolePermissions(
  roleId: string,
  permissions: RolePermissions,
): Promise<void> {
  await updateDoc(doc(db, COL, roleId), { permissions })
}

export async function updateRoleColor(roleId: string, color: string): Promise<void> {
  await updateDoc(doc(db, COL, roleId), { color })
}

export async function updateRoleName(roleId: string, name: string): Promise<void> {
  await updateDoc(doc(db, COL, roleId), { name })
}

export async function deleteRole(roleId: string): Promise<void> {
  await deleteDoc(doc(db, COL, roleId))
}
