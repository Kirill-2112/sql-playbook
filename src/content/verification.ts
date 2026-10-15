import report from './generated/verification.json'

export interface SolutionVerification {
  /** Median EXPLAIN ANALYZE time in PGlite during verification; only measured when there are several solutions. */
  pgMs: number | null
  usesIndex: boolean
  mysql: 'verified' | 'unsupported' | 'failed'
}

export interface ExerciseVerification {
  rows: number
  solutions: SolutionVerification[]
}

export interface VerificationReport {
  generatedAt: string
  postgres: string
  mysql: string
  exercises: Record<string, ExerciseVerification>
}

export const verification = report as VerificationReport
