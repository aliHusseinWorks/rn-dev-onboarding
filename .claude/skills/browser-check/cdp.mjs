// Drive a Chromium browser over the DevTools Protocol. No dependencies: Node's
// own fetch and WebSocket, both global since Node 22.
//
// The browser has to be started with --remote-debugging-port, and with its own
// --user-data-dir: Chromium refuses the debugging port on a default profile.

const DEFAULT_PORT = Number(process.env.CDP_PORT ?? 9333)

export async function connect({ port = DEFAULT_PORT, match, timeout = 20000, width = 1280, height = 900 } = {}) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find((t) => t.type === 'page' && (!match || t.url.includes(match)))
  if (!target) throw new Error(`no page target on :${port}${match ? ` matching ${match}` : ''}`)

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = () => rej(new Error(`cannot reach the debugging port on :${port}`))
  })

  let seq = 0
  const pending = new Map()
  const listeners = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
      return
    }
    for (const fn of listeners) fn(msg)
  }

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq
      pending.set(id, res)
      setTimeout(() => pending.has(id) && (pending.delete(id), rej(new Error(`timeout ${method}`))), timeout)
      ws.send(JSON.stringify({ id, method, params }))
    })

  // An exception inside the page is a failed step, not a value worth returning —
  // returning it lets a broken selector read as a passing check.
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    const err = r.result?.exceptionDetails
    if (err) throw new Error(`page threw: ${err.exception?.description ?? err.text}`)
    return r.result?.result?.value
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // The one thing raw CDP has no answer for: a state that is true a moment from
  // now. Poll rather than sleep, so a slow machine doesn't read as a failure.
  const until = async (expression, { ms = 5000, every = 100, label = expression } = {}) => {
    const deadline = Date.now() + ms
    let last = ''
    for (;;) {
      // A condition that throws is "not yet", not a failure: the node it reaches
      // through is usually the thing being waited for. Letting `ev` throw here
      // turns every `until` into an immediate error.
      try {
        if (await ev(`Boolean(${expression})`)) return true
      } catch (e) {
        last = e.message
      }
      if (Date.now() > deadline) throw new Error(`waited ${ms}ms for: ${label}${last ? ` — last error: ${last}` : ''}`)
      await sleep(every)
    }
  }

  // Three ways to name an element, because this app's buttons carry no ids:
  //   'button.foo'          a CSS selector
  //   'text=View setup'     first element whose own text says that
  //   'js:<expression>'     anything else — scoping by card is the common one
  const resolve = (target) => {
    if (target.startsWith('js:')) return target.slice(3)
    if (target.startsWith('text=')) {
      const want = JSON.stringify(target.slice(5))
      return `[...document.querySelectorAll('button, a, [role="button"], label, h3')]
        .find((e) => e.textContent.trim().startsWith(${want}))`
    }
    return `document.querySelector(${JSON.stringify(target)})`
  }

  // Centre of the match, plus whether it is really the topmost element there.
  // Without the hit test a click can land on an overlay and report fine.
  const at = (target) =>
    ev(`(() => {
      const el = ${resolve(target)}
      if (!el) return null
      const r = el.getBoundingClientRect()
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
      const top = document.elementFromPoint(x, y)
      const onScreen = x > 0 && x < innerWidth && y > 0 && y < innerHeight
      return { x, y, hit: top === el || el.contains(top), onScreen }
    })()`)

  // Wait until the element stops moving. `scroll-behavior: smooth` in
  // src/index.css animates every scrollIntoView, `behavior: 'instant'` does not
  // reliably override it, and no fixed sleep is long enough on a slow frame — so
  // watch the rect across frames the way Playwright's "stable" check does.
  const stable = (target, frames = 120) =>
    ev(`new Promise((res) => {
      const el = ${resolve(target)}
      if (!el) return res(false)
      let last = '', same = 0, n = 0
      const tick = () => {
        const r = el.getBoundingClientRect()
        const key = Math.round(r.top) + ',' + Math.round(r.left)
        same = key === last ? same + 1 : 0
        last = key
        if (same >= 2) return res(true)
        if (++n > ${frames}) return res(false)
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })`)

  const point = async (target) => {
    if (typeof target !== 'string') return target
    const name = target.length > 60 ? target.slice(0, 60) + '…' : target
    // Existence first, or a typo'd selector reports as an animation that never
    // settles and sends you looking for the wrong thing.
    if (!(await ev(`Boolean(${resolve(target)})`))) throw new Error(`no element for ${name}`)
    await ev(`(() => { const el = ${resolve(target)}; el.scrollIntoView({ block: 'center', behavior: 'instant' }) })()`)
    if (!(await stable(target))) throw new Error(`element never stopped moving: ${name}`)
    const p = await at(target)
    if (!p) throw new Error(`no element for ${name}`)
    if (!p.onScreen) throw new Error(`${name} is off screen at ${p.x},${p.y}`)
    if (!p.hit) throw new Error(`${name} is covered by something else`)
    return p
  }

  const click = async (selector) => {
    const p = await point(selector)
    await sleep(120)
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
    }
    return p
  }

  // Arriving from off to the side, because a single move onto the target can be
  // the pointer's first event there and miss `pointerover` altogether.
  const hover = async (selector) => {
    const p = await point(selector)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.max(0, p.x - 60), y: p.y })
    await sleep(150)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
    return p
  }

  // Real keystrokes. Setting `input.value` from a script skips React's onChange
  // unless you go through the prototype's setter and dispatch `input` yourself.
  const type = async (selector, text) => {
    await click(selector)
    await sleep(120)
    await send('Input.insertText', { text })
  }

  const go = async (url) => {
    await send('Page.navigate', { url })
    await until('document.readyState === "complete"', { ms: 15000, label: 'page load' })
  }

  const shot = async (path) => {
    const { writeFileSync } = await import('node:fs')
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path, Buffer.from(r.result.data, 'base64'))
    return path
  }

  // Everything the page complained about, collected from the moment this is
  // called. Failed requests included: a 500 the UI swallows is still a bug.
  const watch = () => {
    const entries = []
    listeners.push(({ method, params }) => {
      if (method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(params.type)) {
        entries.push({ kind: params.type, text: params.args.map((a) => a.value ?? a.description).join(' ') })
      }
      if (method === 'Runtime.exceptionThrown') {
        entries.push({ kind: 'exception', text: params.exceptionDetails.exception?.description ?? params.exceptionDetails.text })
      }
      if (method === 'Log.entryAdded' && params.entry.level === 'error') {
        entries.push({ kind: 'log', text: params.entry.text })
      }
      if (method === 'Network.responseReceived' && params.response.status >= 400) {
        entries.push({ kind: 'http', text: `${params.response.status} ${params.response.url}` })
      }
      if (method === 'Network.loadingFailed') {
        entries.push({ kind: 'netfail', text: `${params.errorText} ${params.type}` })
      }
    })
    return entries
  }

  const checks = []
  const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
    checks.push({ name, ok })
    return ok
  }
  // Non-zero exit, so a red run is visible without reading the output. A run that
  // asserted nothing is a failure too: a script that returned early past all its
  // checks otherwise prints "0/0 passed" and reads as proof.
  const report = () => {
    const bad = checks.filter((c) => !c.ok)
    if (checks.length === 0) console.log('\nNO CHECKS RAN — nothing was asserted')
    else console.log(bad.length === 0 ? `\n${checks.length}/${checks.length} passed` : `\nFAILED: ${bad.map((c) => c.name).join(' | ')}`)
    ws.close()
    process.exitCode = checks.length > 0 && bad.length === 0 ? 0 : 1
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  // A headless window defaults to roughly 756x419, where this layout collapses to
  // its narrow breakpoint — so pin the size rather than letting the mode decide
  // which UI gets checked.
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

  return { send, ev, until, at, stable, click, hover, type, go, shot, watch, sleep, check, report, close: () => ws.close() }
}
