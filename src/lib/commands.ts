import type { PlatformId } from './platform'
import { TOOLS, type Category, type Tool, type ToolAction } from './tools'

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

export function matchesQuery(tool: Tool, category: Category | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    tool.name.toLowerCase().includes(q) ||
    tool.description.toLowerCase().includes(q) ||
    (category?.title.toLowerCase().includes(q) ?? false)
  )
}

export function resolveAction(tool: Tool, platform: PlatformId): ToolAction | undefined {
  return tool.actions?.[platform]
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

// Concatenate every runnable command in a category for the current OS.
export function copyAllForCategory(categoryId: string, platform: PlatformId): string {
  return toolsInCategory(categoryId)
    .map((t) => resolveAction(t, platform))
    .filter((a): a is ToolAction => a?.type === 'command')
    .map((a) => a.value)
    .join('\n\n')
}
