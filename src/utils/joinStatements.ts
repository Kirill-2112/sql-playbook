/**
 * Joins SQL scripts so that a trailing semicolon never produces an empty statement
 * (MySQL rejects "…;;"). Used for "your statements + check query" in the browser and in scripts/verify.ts.
 */
export const joinStatements = (...parts: string[]) =>
  parts.map((p) => p.trim().replace(/;+$/, '')).join(';\n') + ';'
