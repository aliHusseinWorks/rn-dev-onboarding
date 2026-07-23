import { PLATFORM_INFO, type PlatformId } from './platform'
import { CATEGORIES, TOOLS, type Category, type Tool, type ToolAction } from './tools'

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

// Build a single runnable install script for the detected OS. GUI apps that are
// links (not commands) are emitted as manual-step comments so nothing is silently dropped.
export function generateSetupScript(platform: PlatformId): { filename: string; content: string } {
  const isWindows = PLATFORM_INFO[platform].os === 'win'
  const comment = '#'
  const lines: string[] = isWindows
    ? [
        '# React Native setup — ' + PLATFORM_INFO[platform].label,
        '# Run this in PowerShell (the default Windows terminal), not cmd.exe.',
        '$ErrorActionPreference = "Stop"',
        '',
      ]
    : ['#!/usr/bin/env bash', '# React Native setup — ' + PLATFORM_INFO[platform].label, 'set -euo pipefail', '']

  for (const category of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    if (category.inScript === false) continue
    // Tools whose whole setup lives in a modal have no action and emit nothing;
    // modal tools with an action (e.g. Android Studio) still contribute it.
    const tools = toolsInCategory(category.id).filter(
      (t) => t.inScript !== false && resolveAction(t, platform),
    )
    if (tools.length === 0) continue
    lines.push(`${comment} ── ${category.title} ──`)
    for (const tool of tools) {
      const action = resolveAction(tool, platform)
      if (action?.type === 'command') {
        lines.push(`echo "==> ${tool.name}"`, action.value)
      } else if (action?.type === 'link') {
        lines.push(`${comment} ${tool.name}: download from ${action.value}`)
      }
    }
    lines.push('')
  }

  return {
    filename: isWindows ? 'rn-setup.ps1' : 'rn-setup.sh',
    content: lines.join('\n') + '\n',
  }
}
