/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional override for the detect-scan relay URL (functions/report/).
  // Normally unset — the page defaults to its own origin.
  readonly VITE_DETECT_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
