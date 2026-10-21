import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Licenses that allow shipping the code in a paid product. Anything else stops the build until it is checked by hand.
export const ALLOWED_LICENSES = ['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD']

export interface BundledPackage {
  name: string
  version: string
  dir: string
}

interface ChunkLike {
  type: string
  moduleIds?: readonly string[]
}

// Every npm package that has at least one module in the output chunks (what actually ships to the browser).
export function bundledPackages(bundle: Record<string, ChunkLike>): BundledPackage[] {
  const found = new Map<string, BundledPackage>()
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk' || !chunk.moduleIds) continue
    for (const id of chunk.moduleIds) {
      const path = id.replace(/^\0/, '').split('?')[0] ?? ''
      const at = path.lastIndexOf('/node_modules/')
      if (at < 0) continue
      const rest = path.slice(at + '/node_modules/'.length).split('/')
      const name = rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1]}` : (rest[0] ?? '')
      const dir = join(path.slice(0, at), 'node_modules', name)
      if (found.has(dir)) continue
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string }
      found.set(dir, { name, version: pkg.version, dir })
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}
