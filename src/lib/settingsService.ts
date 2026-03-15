import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export interface SlackSettings {
  enabled: boolean
  botToken: string
  channelId: string
}

export async function getSlackSettings(): Promise<SlackSettings | null> {
  const snap = await getDoc(doc(db, 'settings', 'slack'))
  if (!snap.exists()) return null
  return snap.data() as SlackSettings
}

export async function saveSlackSettings(s: SlackSettings): Promise<void> {
  await setDoc(doc(db, 'settings', 'slack'), s)
}
