/**
 * Collects the license of every npm package that ships to the browser, for the Licenses page.
 *   1. builds the site in memory and lists the packages that have code in the output, plus every production
 *      dependency (some packages inline code from their own dependencies, e.g. styled-components)
 *   2. reads each package's license field and license file; stops if a license is not in ALLOWED_LICENSES
 *
 * Writes src/content/generated/licenses.json. The production build (vite.config.ts) fails if it bundles a package
 * that is missing from that file, so run this after adding or updating a dependency.
 * Usage: npm run licenses
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Rolldown } from 'vite'
import { ALLOWED_LICENSES, bundledPackages } from './lib/bundledPackages'
import type { PackageLicense } from '../src/content/licenses'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/content/generated/licenses.json')

process.env.COLLECTING_LICENSES = '1'
const result = await build({ root: ROOT, logLevel: 'warn', build: { write: false } })
const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[]
const bundle = Object.fromEntries(outputs.flatMap((o) => o.output.map((c) => [c.fileName, c])))

const dirs = new Set(bundledPackages(bundle).map((p) => p.dir))
const tree = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: ROOT, encoding: 'utf8' })
for (const dir of tree.split('\n').slice(1)) if (dir.includes('/node_modules/')) dirs.add(dir)

const problems: string[] = []
const packages: PackageLicense[] = [...dirs].map((dir) => {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license?: unknown }
  const { name, version } = pkg
  const license = typeof pkg.license === 'string' ? pkg.license : ''
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f))
  if (!ALLOWED_LICENSES.includes(license)) problems.push(`${name}@${version}: license "${license}" is not on the allowed list`)
  if (!file) problems.push(`${name}@${version}: no license file to show`)
  const text = file ? readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n').trim() : ''
  return { name, version, license, url: `https://www.npmjs.com/package/${name}`, text }
})
packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
writeFileSync(OUT, `${JSON.stringify(packages, null, 2)}\n`)
console.log(`${packages.length} packages: ${packages.map((p) => `${p.name} (${p.license})`).join(', ')}`)
