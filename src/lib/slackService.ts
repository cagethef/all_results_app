import { doc, getDoc, getDocs, updateDoc, deleteField, collection } from 'firebase/firestore'
import { db } from './firebase'
import { getSlackSettings } from './settingsService'
import { fmtDate } from './dateUtils'

const JIGAS_COLLECTION = 'jigs'
const USERS_COLLECTION = 'users'
const ROLES_COLLECTION = 'roles'

async function callSlack(
  token: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const proxyUrl = import.meta.env.VITE_SLACK_PROXY_URL
  if (!proxyUrl) throw new Error('VITE_SLACK_PROXY_URL não configurado')

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, body, token }),
  })
  return res.json()
}

// ─── Slack User ID cache ───────────────────────────────────────────────────────

/** Returns the Slack User ID for an email, caching it in Firestore. */
async function getSlackUserId(email: string, token: string): Promise<string | null> {
  // Check Firestore cache
  const snap = await getDoc(doc(db, USERS_COLLECTION, email))
  const cached = snap.data()?.slackUserId as string | undefined
  if (cached) return cached

  // Look up via Slack API
  const result = await callSlack(token, 'users.lookupByEmail', { email }) as {
    ok: boolean
    user?: { id: string }
  }
  if (!result.ok || !result.user?.id) return null

  // Cache in Firestore
  if (snap.exists()) {
    await updateDoc(doc(db, USERS_COLLECTION, email), { slackUserId: result.user.id })
  }
  return result.user.id
}

/** Returns a "FYI: @user1 @user2" string combining an optional email + optional permission. */
async function buildFYI(params: {
  email?: string
  permission?: string
  token: string
}): Promise<string> {
  const { email, permission, token } = params
  const emailSet = new Set<string>()

  if (email) emailSet.add(email)

  if (permission) {
    const rolesSnap = await getDocs(collection(db, ROLES_COLLECTION))
    const rolesWithPerm = rolesSnap.docs
      .filter(d => d.data().permissions?.[permission] === true)
      .map(d => d.id)

    if (rolesWithPerm.length > 0) {
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION))
      usersSnap.docs
        .filter(d => rolesWithPerm.includes(d.data().role))
        .forEach(d => emailSet.add(d.id))
    }
  }

  if (emailSet.size === 0) return ''

  const ids = await Promise.all([...emailSet].map(e => getSlackUserId(e, token)))
  const mentions = ids.filter(Boolean).map(id => `<@${id}>`).join(' ')
  return mentions ? `FYI: ${mentions}` : ''
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildJigText(jigName: string, state: {
  status: 'available' | 'maintenance' | 'scheduled'
  scheduledFor?: string
  scheduledReason?: string
  modifiedAt: string
}): string {
  const lines: string[] = [`🔧 *${jigName}*`]

  if (state.status === 'maintenance') {
    lines.push('Status: Em Manutenção 🔧')
  } else {
    lines.push('Status: Disponível ✅')
    if (state.status === 'scheduled' && state.scheduledFor) {
      const base = `📅 Manutenção agendada para ${fmtDate(state.scheduledFor)}`
      lines.push(state.scheduledReason ? `${base} · "${state.scheduledReason}"` : base)
    }
  }

  lines.push(`_Última modificação: ${fmtDate(state.modifiedAt)}_`)
  return lines.join('\n')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Posts the initial jig message and saves threadTs to Firestore. */
export async function postJigCreated(jigId: string, jigName: string): Promise<void> {
  const config = await getSlackSettings()
  if (!config?.enabled || !config.botToken || !config.channelId) return

  const text = buildJigText(jigName, {
    status: 'available',
    modifiedAt: new Date().toISOString(),
  })

  const data = await callSlack(config.botToken, 'chat.postMessage', {
    channel: config.channelId,
    text,
  })

  if (!data.ok) throw new Error(`Slack: ${data.error}`)
  await updateDoc(doc(db, JIGAS_COLLECTION, jigId), { slackThreadTs: data.ts })
}

/** Updates the main jig message and posts a reply in the thread. */
export async function notifyJigEvent(params: {
  jigId: string
  jigName: string
  /** Use "{actor}" as placeholder — it will be replaced with the Slack @mention of actorEmail */
  replyText: string
  newStatus: 'available' | 'maintenance' | 'scheduled'
  scheduledFor?: string
  scheduledReason?: string
  modifiedAt: string
  /** Email of the person who performed the action — replaces "{actor}" in replyText */
  actorEmail?: string
  /** Fallback name if actor has no Slack account */
  actorName?: string
  /** Add "FYI: @mention" for all users with this permission */
  mentionPermission?: string
  /** Add "FYI: @mention" for a specific user */
  mentionEmail?: string
}): Promise<void> {
  const config = await getSlackSettings()
  if (!config?.enabled || !config.botToken || !config.channelId) return

  const snap = await getDoc(doc(db, JIGAS_COLLECTION, params.jigId))
  const threadTs = snap.data()?.slackThreadTs as string | undefined
  if (!threadTs) return

  const messageText = buildJigText(params.jigName, {
    status:          params.newStatus,
    scheduledFor:    params.scheduledFor,
    scheduledReason: params.scheduledReason,
    modifiedAt:      params.modifiedAt,
  })

  let replyText = params.replyText
  try {
    // Replace {actor} with the Slack @mention of the person who acted
    if (params.actorEmail && replyText.includes('{actor}')) {
      const actorId = await getSlackUserId(params.actorEmail, config.botToken)
      replyText = replyText.replace('{actor}', actorId ? `<@${actorId}>` : `*${params.actorName ?? params.actorEmail}*`)
    }

    // Append FYI line for approvers / notified roles
    if (params.mentionEmail || params.mentionPermission) {
      const fyi = await buildFYI({
        email:      params.mentionEmail,
        permission: params.mentionPermission,
        token:      config.botToken,
      })
      if (fyi) replyText = `${replyText}\n${fyi}`
    }
  } catch {
    // mentions are best-effort — don't block the notification
  }

  await Promise.all([
    callSlack(config.botToken, 'chat.update', {
      channel: config.channelId,
      ts:      threadTs,
      text:    messageText,
    }),
    callSlack(config.botToken, 'chat.postMessage', {
      channel:   config.channelId,
      thread_ts: threadTs,
      text:      replyText,
    }),
  ])
}

/** Posts initial thread message for an existing jig (used in SettingsTab). */
export async function initializeJigThread(jig: {
  id: string
  name: string
  status: 'available' | 'maintenance' | 'scheduled'
  updatedAt: string
  scheduledFor?: string
  scheduledReason?: string
}, token: string, channelId: string): Promise<void> {
  const text = buildJigText(jig.name, {
    status:          jig.status,
    scheduledFor:    jig.scheduledFor,
    scheduledReason: jig.scheduledReason,
    modifiedAt:      jig.updatedAt,
  })

  const data = await callSlack(token, 'chat.postMessage', { channel: channelId, text })
  if (!data.ok) throw new Error(`Slack: ${data.error}`)
  await updateDoc(doc(db, JIGAS_COLLECTION, jig.id), { slackThreadTs: data.ts })
}

/** Removes slackThreadTs from all jigs — use before migrating to a new channel. */
export async function resetJigThreads(): Promise<number> {
  const snap = await getDocs(collection(db, JIGAS_COLLECTION))
  const withThread = snap.docs.filter(d => d.data().slackThreadTs)
  await Promise.all(
    withThread.map(d => updateDoc(doc(db, JIGAS_COLLECTION, d.id), { slackThreadTs: deleteField() }))
  )
  return withThread.length
}

/** Tests connectivity by calling conversations.info. */
export async function testSlackConnection(token: string, channelId: string): Promise<string> {
  const info = await callSlack(token, 'conversations.info', { channel: channelId }) as { ok: boolean; error?: string; channel?: { name: string } }
  if (!info.ok) {
    if (info.error === 'channel_not_found') throw new Error('Canal não encontrado')
    if (info.error === 'invalid_auth' || info.error === 'not_authed') throw new Error('Token inválido')
    throw new Error(info.error ?? 'Canal inválido')
  }
  return info.channel?.name ?? channelId
}
