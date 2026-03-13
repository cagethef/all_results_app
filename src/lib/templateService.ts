import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { TemplateField } from '@/components/Admin/WorkorderConfig'

const DOC_REF = () => doc(db, 'config', 'wo_template')

export async function fetchTemplate(): Promise<TemplateField[] | null> {
  try {
    const snap = await getDoc(DOC_REF())
    if (!snap.exists()) return null
    return snap.data().fields as TemplateField[]
  } catch {
    return null
  }
}

export async function saveTemplateToFirestore(fields: TemplateField[], updatedBy: string): Promise<void> {
  await setDoc(DOC_REF(), { fields, updatedAt: serverTimestamp(), updatedBy })
}
