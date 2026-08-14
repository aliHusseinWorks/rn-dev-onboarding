// Copy this, change the selectors. Run: node .claude/skills/browser-check/example.mjs
import { connect } from './cdp.mjs'

const CARD = 'Zoho MCP'

const page = await connect({ port: 9333 })
const problems = page.watch()

await page.go('http://localhost:5173/')

// No ids on the cards, so scope by the heading and walk to the button.
await page.click(`js:(() => {
  const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim().startsWith(${JSON.stringify(CARD)}))
  return [...h.closest('div[class*="rounded-xl"]').querySelectorAll('button')].find((b) => /view setup/i.test(b.textContent))
})()`)
await page.until(`document.querySelector('[role="dialog"]')`, { label: 'modal opens' })

const commands = await page.ev(`[...document.querySelectorAll('[role="dialog"] code')].map((c) => c.textContent.trim())`)
page.check('modal shows a command to copy', commands.length > 0, `${commands.length} found`)

await page.type(`[role="dialog"] input`, 'zoho-cliq')
page.check('typing reaches React state', (await page.ev(`document.querySelector('[role="dialog"] input').value`)) === 'zoho-cliq')

await page.shot('/tmp/check.png')
page.check('page logged nothing broken', problems.length === 0, problems.map((p) => `${p.kind}: ${p.text}`).join(' | '))

page.report()
