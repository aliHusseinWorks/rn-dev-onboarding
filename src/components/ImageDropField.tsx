import { useEffect, useRef, useState } from 'react'
import { ImageUp, X } from 'lucide-react'
import { fileToIconBase64, type IconFormat } from '../lib/iconImage'

interface Props {
  label: string
  format: IconFormat
  value: string
  onChange: (base64: string) => void
}

export function ImageDropField({ label, format, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Decoding is async, so a drop that lands while an earlier one is still
  // running — or after Remove — must not write its bytes back into the field.
  const decode = useRef(0)
  const [over, setOver] = useState(false)
  const [preview, setPreview] = useState('')
  const [name, setName] = useState('')

  // Releases the previous thumbnail when it's replaced, and the last one when the
  // modal closes.
  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  const reset = () => {
    decode.current += 1
    setPreview('')
    setName('')
    onChange('')
  }

  const accept = (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    const id = ++decode.current
    setName(file.name)
    setPreview(URL.createObjectURL(file))
    // An unusable image falls back to the built-in icon rather than erroring.
    void fileToIconBase64(file, format).then((base64) => {
      if (id !== decode.current) return
      if (base64) onChange(base64)
      else reset()
    })
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg-subtle">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={(e) => {
          // dragleave also fires crossing into a child, which flickers the border mid-drag.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files?.[0])
        }}
        className={`flex items-center gap-2 rounded-lg border border-dashed bg-bg px-3 py-2 transition-colors ${
          over ? 'border-accent' : 'border-border hover:border-border-strong'
        }`}
      >
        {value && preview ? (
          <>
            <img src={preview} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{name}</span>
            <button
              type="button"
              onClick={reset}
              aria-label="Remove custom icon"
              className="flex items-center rounded-md p-1 text-fg-subtle transition-colors hover:text-fg cursor-pointer"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] text-fg-subtle transition-colors hover:text-fg cursor-pointer"
          >
            <ImageUp size={15} className="shrink-0" />
            <span className="truncate">Drop an image or click to choose</span>
          </button>
        )}
      </div>
    </label>
  )
}
