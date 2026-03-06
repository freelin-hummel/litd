import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure only one copy of lit is used across all packages, preventing
    // the "Illegal constructor" error that arises from multiple lit instances.
    dedupe: [
      'lit',
      'lit-html',
      'lit-element',
      '@lit/reactive-element',
    ],
  },
  optimizeDeps: {
    include: [
      '@blocksuite/presets',
      '@blocksuite/blocks',
      '@blocksuite/store',
      'lit',
      'lit/decorators.js',
      '@lit/reactive-element',
    ],
  },
})
