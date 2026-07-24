import { useEffect, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, ScanSearch, Sparkles, Terminal } from 'lucide-react'
import { AiSetupModal } from './components/AiSetupModal'
import { CategorySection } from './components/CategorySection'
import { CommandBlock } from './components/CommandBlock'
import { DetectModal } from './components/DetectModal'
import { Modal } from './components/Modal'
import { PlatformBanner } from './components/PlatformBanner'
import { ProgressBar } from './components/ProgressBar'
import { ScrollTop } from './components/ScrollTop'
import { SearchBar } from './components/SearchBar'
import { ThemeToggle } from './components/ThemeToggle'
import { Tooltip } from './components/Tooltip'
import { isAvailable, matchesQuery } from './lib/commands'
import { detectPlatform, PLATFORMS, PLATFORM_INFO, refinePlatform, type PlatformId } from './lib/platform'
import { fillTokens, renderTokens } from './lib/tokens'
import { CATEGORIES, TOOLS } from './lib/tools'
import { useLocalStorage } from './lib/useLocalStorage'

const PLATFORM_KEY = 'rn-onboard:platform'

function readSavedPlatform(): PlatformId | null {
  const saved = localStorage.getItem(PLATFORM_KEY)
  return saved && (PLATFORMS as readonly string[]).includes(saved) ? (saved as PlatformId) : null
}

export function App() {
  const [detected, setDetected] = useState<PlatformId>(() => detectPlatform())
  const [platform, setPlatformState] = useState<PlatformId>(() => readSavedPlatform() ?? detectPlatform())
  const [installed, setInstalled] = useLocalStorage<Record<string, boolean>>('rn-onboard:installed', {})
  const [query, setQuery] = useState('')
  const [modalToolId, setModalToolId] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [aiSetupOpen, setAiSetupOpen] = useState(false)
  const [detectOpen, setDetectOpen] = useState(false)
  // Section fold state, keyed by category id. Missing key = open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'))

  // Async UA-CH refinement (catches Windows ARM). Always updates what was
  // detected; only moves the selection when the user hasn't overridden it.
  useEffect(() => {
    void refinePlatform(detected).then((p) => {
      setDetected(p)
      if (!readSavedPlatform()) setPlatformState(p)
    })
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])

  const setPlatform = (p: PlatformId) => {
    setPlatformState(p)
    localStorage.setItem(PLATFORM_KEY, p)
  }

  const toggleInstalled = (id: string) => setInstalled((prev) => ({ ...prev, [id]: !prev[id] }))

  const setInstalledMany = (ids: string[], value: boolean) =>
    setInstalled((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = value
      return next
    })

  const availableTools = TOOLS.filter((t) => isAvailable(t, platform))
  const done = availableTools.filter((t) => installed[t.id]).length
  const categoryFor = (id: string) => CATEGORIES.find((c) => c.id === id)
  const hasResults = TOOLS.some((t) => matchesQuery(t, categoryFor(t.category), query))

  const openModal = (toolId: string) => {
    setFieldValues({})
    setModalToolId(toolId)
  }

  const modalTool = TOOLS.find((t) => t.id === modalToolId)
  const modalFields = modalTool?.modal?.fields ?? []
  const sortedCategories = [...CATEGORIES].sort((a, b) => a.order - b.order)

  const allCollapsed = sortedCategories.every((c) => collapsed[c.id])
  const toggleAllSections = () =>
    setCollapsed(allCollapsed ? {} : Object.fromEntries(sortedCategories.map((c) => [c.id, true])))

  return (
    <div className="min-h-svh">
      <header className="ambient border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Terminal size={22} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">React Native Dev Setup</h1>
                <p className="text-sm text-fg-muted">A fresh machine to a full RN stack — click, copy, done.</p>
              </div>
            </div>
            <ThemeToggle light={light} onToggle={() => setLight((v) => !v)} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PlatformBanner platform={platform} detected={detected} onChange={setPlatform} />
            <div className="flex items-center rounded-xl border border-border bg-surface/70 px-4 py-3">
              <div className="w-full">
                <ProgressBar done={done} total={availableTools.length} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SearchBar value={query} onChange={setQuery} />
            <Tooltip
              label="Two pastes: install Claude Code, then hand it a prompt that installs and verifies everything else for you."
              side="bottom"
              align="end"
              className="shrink-0"
            >
              <button
                onClick={() => setAiSetupOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-strong cursor-pointer"
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">Full AI setup</span>
                <span className="sm:hidden">AI setup</span>
              </button>
            </Tooltip>
            <Tooltip
              label="One paste in your terminal: a readable script checks which tools are already installed and this page ticks them off by itself."
              side="bottom"
              align="end"
              className="shrink-0"
            >
              <button
                onClick={() => setDetectOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
              >
                <ScanSearch size={16} />
                <span className="hidden sm:inline">Detect installed</span>
                <span className="sm:hidden">Detect</span>
              </button>
            </Tooltip>
            <Tooltip
              label={allCollapsed ? 'Open every category.' : 'Fold every category to just its header.'}
              side="bottom"
              align="end"
              className="shrink-0"
            >
              <button
                onClick={toggleAllSections}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
              >
                {allCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}
                <span className="hidden sm:inline">{allCollapsed ? 'Expand all' : 'Collapse all'}</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        {sortedCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            platform={platform}
            installed={installed}
            query={query}
            open={!collapsed[category.id]}
            onToggleOpen={() => setCollapsed((prev) => ({ ...prev, [category.id]: !prev[category.id] }))}
            onToggle={toggleInstalled}
            onSetMany={setInstalledMany}
            onOpenModal={openModal}
          />
        ))}

        {!hasResults && <p className="py-12 text-center text-sm text-fg-subtle">No tools match “{query}”.</p>}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-fg-subtle sm:px-6">
          Progress is saved in your browser. Commands install the latest version for{' '}
          <span className="font-mono text-fg-muted">{PLATFORM_INFO[platform].label}</span> unless a version is pinned.
        </div>
      </footer>

      <ScrollTop />

      {aiSetupOpen && <AiSetupModal platform={platform} onClose={() => setAiSetupOpen(false)} />}

      {detectOpen && <DetectModal platform={platform} onApply={setInstalledMany} onClose={() => setDetectOpen(false)} />}

      {modalTool?.modal && (
        <Modal title={modalTool.name} onClose={() => setModalToolId(null)}>
          <div className="flex flex-col gap-4">
            {modalTool.modal.intro && <p className="text-sm leading-relaxed text-fg-muted">{modalTool.modal.intro}</p>}
            {modalFields.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {modalFields.map((field) => (
                  <label key={field.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-fg-subtle">{field.label}</span>
                    <input
                      type="text"
                      value={fieldValues[field.key] ?? ''}
                      onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      spellCheck={false}
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px] text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-accent"
                    />
                  </label>
                ))}
              </div>
            )}
            {modalTool.modal.prereq && (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-fg-muted">
                <span className="font-semibold text-fg">Prerequisite: </span>
                {modalTool.modal.prereq}
              </p>
            )}
            {modalTool.modal.steps
              ?.flatMap((step) => {
                const command = typeof step.command === 'string' ? step.command : step.command[platform]
                return command ? [{ note: step.note, command }] : []
              })
              .map((step, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-fg-subtle">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-fg-muted">
                      {i + 1}
                    </span>
                    {step.note && <span>{step.note}</span>}
                  </div>
                  <CommandBlock
                    command={fillTokens(step.command, modalFields, fieldValues)}
                    display={renderTokens(step.command, modalFields, fieldValues)}
                    label="Copy"
                  />
                </div>
              ))}
            {modalTool.modal.prompt && (
              <CommandBlock
                command={fillTokens(modalTool.modal.prompt, modalFields, fieldValues)}
                display={renderTokens(modalTool.modal.prompt, modalFields, fieldValues)}
                label={modalTool.modal.copyLabel ?? 'Copy'}
                multiline
              />
            )}
            {modalTool.docsUrl && (
              <a
                href={modalTool.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs text-fg-subtle transition-colors hover:text-fg cursor-pointer"
              >
                <ExternalLink size={12} /> View repo / docs
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
