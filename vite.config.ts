import { fileURLToPath } from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Before `react()`, which is what the plugin's documentation requires: it rewrites the route
    // files, and the React plugin has to see what it produced rather than what we wrote.
    //
    // `autoCodeSplitting` does nothing visible while three routes render the same board, and it is
    // the right default the moment one of them has anything of its own. Matching the reference
    // structure is the point of the phase that added this.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
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
