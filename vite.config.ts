import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { bundledPackages } from './scripts/lib/bundledPackages'
import type { PackageLicense } from './src/content/licenses'

// Fails the production build if it ships a package that is not on the Licenses page.
// scripts/licenses.ts sets COLLECTING_LICENSES while it builds the list itself.
function checkLicenses(): Plugin {
  return {
    name: 'check-licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (process.env.COLLECTING_LICENSES) return
      const file = new URL('./src/content/generated/licenses.json', import.meta.url)
      const listed = new Set(
        (JSON.parse(readFileSync(file, 'utf8')) as PackageLicense[]).map((p) => `${p.name}@${p.version}`),
      )
      const missing = bundledPackages(bundle)
        .map((p) => `${p.name}@${p.version}`)
        .filter((p) => !listed.has(p))
      if (missing.length) this.error(`Not on the Licenses page: ${missing.join(', ')}. Run npm run licenses.`)
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the site from /sql-playbook/; the workflow sets BASE_PATH for that build.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), checkLicenses()],
  // PGlite ships its own WASM and data files; Vite's pre-bundler breaks their paths.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
})
