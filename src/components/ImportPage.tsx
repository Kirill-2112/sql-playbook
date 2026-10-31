import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { mergeProgress } from '../progress/merge'
import { currentProgress, EMPTY_PROGRESS, replaceProgress, type ProgressState } from '../progress/store'

function decode(text: string): ProgressState | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Partial<ProgressState>
    if (parsed.version !== 1 || typeof parsed.lessons !== 'object' || typeof parsed.days !== 'object') return null
    return { ...EMPTY_PROGRESS, ...parsed, version: 1 }
  } catch {
    return null
  }
}

// /import/:data — progress brought over from the old address (MovedNotice), merged with whatever is here already.
export function ImportPage() {
  const { data = '' } = useParams()
  const [done, setDone] = useState(false)
  useEffect(() => {
    const incoming = decode(data)
    if (incoming) replaceProgress(mergeProgress(currentProgress(), incoming))
    setDone(true)
  }, [data])
  return done ? <Navigate to="/progress" replace /> : null
}
