import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the build works on GitHub Pages project sites,
// Netlify, Vercel, or opened from a file path — no per-host config.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
