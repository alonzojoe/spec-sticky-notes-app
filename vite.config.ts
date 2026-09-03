import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // P10 put a router in the bundle and pushed the single chunk past rollup's 500kB warning.
    // Splitting the dependencies out is the fix rather than raising the limit: React, Radix and
    // the router change on an npm install, and our own code changes every commit, so a returning
    // visitor re-downloads the half that actually moved.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
