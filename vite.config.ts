import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // PGlite ships its own WASM and data files; Vite's pre-bundler breaks their paths.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
})
