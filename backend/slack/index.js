/**
 * Slack API Proxy — Cloud Function Gen 2
 *
 * Proxies Slack Web API calls server-side to bypass browser CORS restrictions.
 * The bot token is passed from the frontend (already loaded from Firestore)
 * and forwarded to Slack with a server-side fetch — no CORS issue.
 *
 * Deploy:
 *   gcloud functions deploy slackProxy \
 *     --gen2 --runtime=nodejs22 \
 *     --region=southamerica-east1 \
 *     --source=. --entry-point=slackProxy \
 *     --trigger-http --allow-unauthenticated
 */

exports.slackProxy = async (req, res) => {
  // ── CORS — only allow requests from known origins ────────────────────────────
  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://all-results-appvercel.vercel.app',
  ]
  const origin = req.headers.origin || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.set('Access-Control-Allow-Origin', allowedOrigin)
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // ── Validate payload ─────────────────────────────────────────────────────────
  const { endpoint, body, token } = req.body ?? {}

  if (!endpoint || typeof endpoint !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "endpoint"' })
    return
  }

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "token"' })
    return
  }

  // Only allow known Slack Web API endpoints
  const POST_ENDPOINTS = ['chat.postMessage', 'chat.update', 'conversations.info']
  const GET_ENDPOINTS  = ['users.lookupByEmail']
  const ALLOWED = [...POST_ENDPOINTS, ...GET_ENDPOINTS]

  if (!ALLOWED.includes(endpoint)) {
    res.status(400).json({ error: `Endpoint not allowed: ${endpoint}` })
    return
  }

  // ── Call Slack ───────────────────────────────────────────────────────────────
  try {
    let slackRes

    if (GET_ENDPOINTS.includes(endpoint)) {
      // GET endpoints pass params as query string
      const params = new URLSearchParams(body ?? {})
      slackRes = await fetch(`https://slack.com/api/${endpoint}?${params}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    } else {
      slackRes = await fetch(`https://slack.com/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body ?? {}),
      })
    }

    const data = await slackRes.json()
    res.json(data)
  } catch (err) {
    console.error('Slack proxy error:', err)
    res.status(502).json({ error: 'Failed to reach Slack API' })
  }
}
