import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works on GitHub Pages project sites,
// Netlify, Vercel, or opened from a file path — no per-host config.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    // The detect-scan relay (functions/report/) runs under wrangler in local
    // dev: `pnpm build && npx wrangler pages dev dist` on :8788, and the dev
    // server forwards /report there. Without wrangler running, the Detect
    // modal degrades to manual paste.
    proxy: { '/report': 'http://127.0.0.1:8788' },
  },
})
