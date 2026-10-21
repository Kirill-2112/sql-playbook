import type { ExerciseFile } from '../content/types'
import { splitStatements } from './emulateTransactions'

const COPY_FROM = /^(\s|--[^\n]*\n)*copy\b[\s\S]*?\bfrom\s+'([^']+)'/i

/**
 * Lets PostgreSQL's COPY … FROM 'name.csv' read a file that comes with the exercise. PGlite has no file system, so
 * the statement is pointed at its virtual /dev/blob and the file is handed over as a Blob. Only one file can be read
 * per run, which is all an exercise needs.
 */
export function attachFiles(sql: string, files: ExerciseFile[] | undefined): { sql: string; blob?: Blob } {
  if (!files?.length) return { sql }
  let blob: Blob | undefined
  const statements = splitStatements(sql).map((statement) => {
    const match = COPY_FROM.exec(statement)
    const name = match?.[2]
    const file = files.find((f) => f.name === name || name?.endsWith('/' + f.name))
    if (!file || blob) return statement
    blob = new Blob([file.content])
    return statement.replace(`'${name}'`, "'/dev/blob'")
  })
  return { sql: statements.join(''), blob }
}
