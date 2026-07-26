import { PLATFORM_INFO, type PlatformId } from './platform'

// Windows shortcuts point at an .ico container; Linux .desktop entries take a
// plain image path instead.
export type IconFormat = 'ico' | 'png'

// A dropped icon travels inside the pasted command, so these are capped to keep
// that line manageable: 48 is the default desktop size and 64 covers the larger
// views without the weight of a 128 px frame, which for a photo dominates the rest.
const ICO_SIZES = [16, 32, 48, 64]
const PNG_SIZE = 64

export function iconFormatFor(platform: PlatformId): IconFormat {
  return PLATFORM_INFO[platform].os === 'win' ? 'ico' : 'png'
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const settle = (value: HTMLImageElement | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    img.onload = () => settle(img)
    img.onerror = () => settle(null)
    img.src = url
  })
}

// Fits the whole image inside a transparent square so a non-square logo keeps
// its aspect ratio instead of being cropped.
function squarePng(img: HTMLImageElement, size: number): Promise<Uint8Array | null> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  const scale = Math.min(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null)
      void blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(() => resolve(null))
    }, 'image/png')
  })
}

// ICONDIR (6 bytes) + one 16-byte ICONDIRENTRY per frame + the PNG payloads.
// PNG-compressed frames are legal in .ico from Vista on, so no BMP encoding.
function packIco(frames: Array<{ size: number; png: Uint8Array }>): Uint8Array {
  const dirSize = 6 + frames.length * 16
  const out = new Uint8Array(dirSize + frames.reduce((n, f) => n + f.png.length, 0))
  const view = new DataView(out.buffer)
  view.setUint16(2, 1, true)
  view.setUint16(4, frames.length, true)
  let offset = dirSize
  frames.forEach((frame, i) => {
    const at = 6 + i * 16
    // A zero in the one-byte width/height fields means 256.
    out[at] = frame.size >= 256 ? 0 : frame.size
    out[at + 1] = frame.size >= 256 ? 0 : frame.size
    view.setUint16(at + 4, 1, true)
    view.setUint16(at + 6, 32, true)
    view.setUint32(at + 8, frame.png.length, true)
    view.setUint32(at + 12, offset, true)
    out.set(frame.png, offset)
    offset += frame.png.length
  })
  return out
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  // Chunked — spreading a whole icon into fromCharCode overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

// null = the file wasn't a usable image; the caller keeps the built-in icon.
export async function fileToIconBase64(file: File, format: IconFormat): Promise<string | null> {
  const img = await loadImage(file)
  if (!img) return null
  if (format === 'png') {
    const png = await squarePng(img, PNG_SIZE)
    return png && toBase64(png)
  }
  const frames: Array<{ size: number; png: Uint8Array }> = []
  for (const size of ICO_SIZES) {
    const png = await squarePng(img, size)
    if (!png) return null
    frames.push({ size, png })
  }
  return toBase64(packIco(frames))
}
