import { useEffect, useState } from 'react'
import type { ReferenceEntry, ReferenceGenerated, ReferenceGroupId } from '../content/types'

export interface ReferenceData {
  entries: ReferenceEntry[]
  groups: { id: ReferenceGroupId; name: string }[]
  generated: Record<string, ReferenceGenerated>
}

let cache: Promise<ReferenceData> | undefined

// The reference and its verified examples are a separate chunk, loaded when a reference page is first opened.
function loadReference(): Promise<ReferenceData> {
  cache ??= Promise.all([import('../content/reference'), import('../content/generated/reference.json')]).then(
    ([content, generated]) => ({
      entries: content.REFERENCE,
      groups: content.REFERENCE_GROUPS,
      generated: generated.default as Record<string, ReferenceGenerated>,
    }),
  )
  return cache
}

export function useReference(): ReferenceData | null {
  const [data, setData] = useState<ReferenceData | null>(null)
  useEffect(() => {
    let active = true
    void loadReference().then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [])
  return data
}
