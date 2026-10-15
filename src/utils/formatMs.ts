/**
 * Browsers coarsen timers, so Postgres inside WASM reports very fast queries as 0 ms.
 * Below this value we only know the query was "very fast", not how fast.
 */
export const TIMER_RESOLUTION_MS = 0.1

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—'
  if (ms < TIMER_RESOLUTION_MS) return `< ${TIMER_RESOLUTION_MS} ms`
  if (ms < 10) return `${ms.toFixed(1)} ms`
  return `${Math.round(ms)} ms`
}

/** "13× faster", "over 130× faster" when the fast side is below timer resolution, or "about the same". */
export function formatSpeedup(beforeMs: number, afterMs: number): string {
  if (!Number.isFinite(beforeMs) || !Number.isFinite(afterMs)) return ''
  if (afterMs < TIMER_RESOLUTION_MS) {
    return `over ${Math.floor(beforeMs / TIMER_RESOLUTION_MS)}× faster`
  }
  const ratio = beforeMs / afterMs
  if (ratio >= 1.5) return `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× faster`
  if (ratio <= 0.67) return `${(1 / ratio).toFixed(1)}× slower`
  return 'about the same'
}
