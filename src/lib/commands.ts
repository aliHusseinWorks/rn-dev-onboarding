import { PLATFORMS, type PlatformId } from './platform'
import { CATEGORIES, TOOLS, type Category, type Tool, type ToolAction } from './tools'
import type { VersionSource } from './versions'

export const ARCH_SHORT: Record<PlatformId, string> = {
  'mac-arm': 'Apple Silicon',
  'mac-intel': 'Intel',
  'win-x64': 'x64',
  'win-arm': 'ARM',
  linux: 'Linux',
}

export function toolsInCategory(categoryId: string): Tool[] {
  return TOOLS.filter((t) => t.category === categoryId).sort((a, b) => a.order - b.order)
}

// Whole-category totals for the rail and the chip strip — deliberately not
// query-filtered, so the numbers hold still while you search.
export function categoryProgress(
  categoryId: string,
  platform: PlatformId,
  installed: Record<string, boolean>,
): { done: number; total: number } {
  const tools = toolsInCategory(categoryId).filter((t) => isAvailable(t, platform))
  return { done: tools.filter((t) => installed[t.id]).length, total: tools.length }
}

export function matchesQuery(tool: Tool, category: Category | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    tool.name.toLowerCase().includes(q) ||
    tool.description.toLowerCase().includes(q) ||
    (category?.title.toLowerCase().includes(q) ?? false)
  )
}

// Cards in a per-project section are actions you repeat in every repo, not
// machine state, so nothing tracks them as installed.
export function isCheckable(tool: Tool): boolean {
  return CATEGORIES.find((c) => c.id === tool.category)?.checkable !== false
}

export function resolveAction(tool: Tool, platform: PlatformId): ToolAction | undefined {
  return tool.actions?.[platform]
}

// A bare source applies to every platform; a per-platform map only to the one
// picked, and resolves to nothing where that OS has no source worth trusting.
// The two key sets are disjoint, so the presence of any platform key tells them
// apart.
export function resolveVersion(tool: Tool, platform: PlatformId): VersionSource | undefined {
  const version = tool.version
  if (!version) return undefined
  return PLATFORMS.some((p) => p in version)
    ? (version as Partial<Record<PlatformId, VersionSource>>)[platform]
    : (version as VersionSource)
}

export function resolveSecondary(tool: Tool, platform: PlatformId): ToolAction | undefined {
  return tool.secondary?.[platform]
}

// Tools with platform actions are available where an action exists — even if
// they also have a setup modal (e.g. Xcode: mac-only download + modal steps).
// Action-less modal tools (plugins / prompts) live inside Claude Code and are
// available everywhere.
export function isAvailable(tool: Tool, platform: PlatformId): boolean {
  if (tool.actions) return Boolean(tool.actions[platform])
  return Boolean(tool.modal)
}

// Unlabeled links are downloads by convention — anything that merely opens a
// page (App Store, install guides) must carry an explicit label in the config.
export function buttonLabel(action: ToolAction, platform: PlatformId): string {
  if (action.label) return action.label
  if (action.type === 'command') return 'Copy command'
  return `Download for ${ARCH_SHORT[platform]}`
}
