export const PLATFORMS = ['mac-arm', 'mac-intel', 'win-x64', 'win-arm', 'linux'] as const
export type PlatformId = (typeof PLATFORMS)[number]

export interface PlatformInfo {
  id: PlatformId
  label: string
  os: 'mac' | 'win' | 'linux'
}

export const PLATFORM_INFO: Record<PlatformId, PlatformInfo> = {
  'mac-arm': { id: 'mac-arm', label: 'macOS (Apple Silicon)', os: 'mac' },
  'mac-intel': { id: 'mac-intel', label: 'macOS (Intel)', os: 'mac' },
  'win-x64': { id: 'win-x64', label: 'Windows (x64)', os: 'win' },
  'win-arm': { id: 'win-arm', label: 'Windows (ARM)', os: 'win' },
  linux: { id: 'linux', label: 'Linux', os: 'linux' },
}

interface UADataValues {
  architecture?: string
}
interface NavigatorUAData {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<UADataValues>
}

function uaData(): NavigatorUAData | undefined {
  return (navigator as unknown as { userAgentData?: NavigatorUAData }).userAgentData
}

function detectOs(): 'mac' | 'win' | 'linux' {
  const platform = uaData()?.platform ?? navigator.platform ?? ''
  const ua = navigator.userAgent
  if (/mac/i.test(platform) || /Mac/.test(ua)) return 'mac'
  if (/win/i.test(platform) || /Win/.test(ua)) return 'win'
  return 'linux'
}

// User agents can't distinguish Apple Silicon from Intel Macs, so fall back to
// the WebGL renderer string: Apple Silicon reports an "Apple" GPU, Intel Macs
// report Intel/AMD/Radeon.
function macIsAppleSilicon(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext ? String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    const r = renderer.toLowerCase()
    if (r.includes('apple')) return true
    if (r.includes('intel') || r.includes('amd') || r.includes('radeon')) return false
  } catch {
    // fall through
  }
  return true // newer Macs are Apple Silicon; the override dropdown covers misses
}

export function detectPlatform(): PlatformId {
  const os = detectOs()
  if (os === 'mac') return macIsAppleSilicon() ? 'mac-arm' : 'mac-intel'
  if (os === 'win') return /ARM|aarch64/i.test(navigator.userAgent) ? 'win-arm' : 'win-x64'
  return 'linux'
}

// UA-CH architecture is only available asynchronously; use it to catch Windows
// ARM, which the synchronous UA string usually hides.
export async function refinePlatform(current: PlatformId): Promise<PlatformId> {
  const data = uaData()
  if (!data?.getHighEntropyValues || data.platform !== 'Windows') return current
  try {
    const { architecture } = await data.getHighEntropyValues(['architecture'])
    return architecture === 'arm' ? 'win-arm' : 'win-x64'
  } catch {
    return current
  }
}
