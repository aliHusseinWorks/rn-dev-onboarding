// Relay for the "Detect installed tools" scan (see src/lib/detectScript.ts).
// Deployed by Cloudflare Pages alongside the site, so the page and this
// endpoint share one origin — no CORS, no endpoint configuration.
//
// The scan script POSTs its result under a one-time pairing code; the page
// polls GET with the same code. Entries are single-use both ways and expire
// in 10 minutes.
//
// Abuse posture: ~62-bit random codes, 4 KB payload cap, id/entry caps,
// single-use writes and reads, short TTL. No IP rate limiting in v1 — add a
// Cloudflare WAF rate rule on /report/* if it's ever needed.

// Minimal shapes of the Pages runtime types used here — keeps this file
// dependency-free (no @cloudflare/workers-types).
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}
interface PagesContext {
  request: Request
  env: { DETECT_KV: KVNamespace }
  params: { code: string | string[] }
  waitUntil(promise: Promise<unknown>): void
}

const CODE_RE = /^[a-z0-9]{10,32}$/
const ID_RE = /^[a-z0-9-]{1,64}$/
const PLATFORM_RE = /^[a-z0-9-]{1,16}$/
const MAX_BODY_BYTES = 4096
const MAX_IDS = 128
const TTL_SECONDS = 600
const USED = 'used' // tombstone left after the page consumes a report

function respond(status: number, body: string | null = null): Response {
  return new Response(body, {
    status,
    headers: {
      ...(body === null ? {} : { 'Content-Type': 'application/json' }),
      'Cache-Control': 'no-store',
    },
  })
}

async function readCapped(request: Request): Promise<string | null> {
  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(all)
}

export async function onRequest(ctx: PagesContext): Promise<Response> {
  const { request, env } = ctx
  const code = typeof ctx.params.code === 'string' ? ctx.params.code : ''
  if (!CODE_RE.test(code)) return respond(400)
  const key = `report:${code}`

  if (request.method === 'GET') {
    const stored = await env.DETECT_KV.get(key)
    if (stored === null || stored === USED) return respond(404) // pending — the page keeps polling
    // Consumed on first read. A tombstone (not a delete) keeps the code
    // burned for its whole TTL — a re-run of the same script gets 409
    // instead of silently re-registering the code. Like the POST-side check
    // below this is best-effort (KV isn't atomic): two GETs racing within
    // KV propagation can both read the report. Codes are unguessable, so
    // that's only ever the same user's page double-fetching.
    ctx.waitUntil(env.DETECT_KV.put(key, USED, { expirationTtl: TTL_SECONDS }))
    return respond(200, stored)
  }

  if (request.method === 'POST' || request.method === 'PUT') {
    const raw = await readCapped(request)
    if (raw === null) return respond(413)
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return respond(422)
    }
    const report = parsed as { v?: unknown; platform?: unknown; found?: unknown }
    const valid =
      report !== null &&
      typeof report === 'object' &&
      report.v === 1 &&
      typeof report.platform === 'string' &&
      PLATFORM_RE.test(report.platform) &&
      Array.isArray(report.found) &&
      report.found.length <= MAX_IDS &&
      report.found.every((id) => typeof id === 'string' && ID_RE.test(id))
    if (!valid) return respond(422)

    // Best-effort single use (KV isn't atomic; codes are unguessable, so a
    // conflict here means the same script ran twice — tell it clearly).
    if ((await env.DETECT_KV.get(key)) !== null) return respond(409)
    await env.DETECT_KV.put(key, JSON.stringify({ platform: report.platform, found: report.found, at: Date.now() }), {
      expirationTtl: TTL_SECONDS,
    })
    return respond(204)
  }

  return respond(404)
}
