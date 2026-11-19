/**
 * Phone keyboards (iOS Smart Punctuation, autocorrect on Android) can turn ' and " into typographic quotes, which
 * PostgreSQL reads as part of a name: `where rating = ’R’` fails with "column ’r’ does not exist". A learner never
 * means them as SQL quotes, so their query gets straight ones before it runs.
 */
export function straightQuotes(sql: string): string {
  return sql.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"')
}
