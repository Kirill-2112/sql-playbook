/**
 * The usual SQL errors in plain words, for PostgreSQL and MySQL alike, shown above the database's own message
 * (which beginners cannot read: "syntax error ... near '' at line 2"). Null when there is nothing simpler to say.
 */
export function explainError(message: string, sql = ''): string | null {
  const code = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/;$/, '')
  if (!code) return 'The query is empty. Start with select, then the columns, from and the table.'

  // The query stops in the middle: PostgreSQL "at end of input", MySQL "near '' at line N".
  if (/at end of input|near '' at line/i.test(message)) {
    const last = /(\w+)\s*$/.exec(code)?.[1]?.toLowerCase()
    const next: Record<string, string> = {
      select: 'after select, list the columns you want, then write from and the table',
      from: 'after from, write the name of a table',
      where: 'after where, write a condition, for example price > 10',
      by: 'after order by or group by, write a column',
      and: 'after and, write one more condition',
      or: 'after or, write one more condition',
      join: 'after join, write a table and then on with the columns that match',
      on: 'after on, write which columns must be equal',
    }
    return `The query stops too early: ${(last && next[last]) || 'something is missing at the end'}.`
  }

  const near = /syntax error at or near "([^"]*)"/i.exec(message) ?? /near '([^']{1,40})/i.exec(message)
  if (near) {
    return `The database got lost at "${near[1]}". Often it is a missing or extra comma, a misspelled word, or a word in the wrong place.`
  }

  const column = /column "?([\w.]+)"? does not exist/i.exec(message) ?? /Unknown column '([^']+)'/i.exec(message)
  if (column) return `There is no column ${column[1]} here. Check its spelling and its table under Database.`

  const table = /relation "([\w.]+)" does not exist/i.exec(message) ?? /Table '(?:\w+\.)?(\w+)' doesn't exist/i.exec(message)
  if (table) return `There is no table ${table[1]}. Check the name under Database.`

  if (/must appear in the GROUP BY clause|isn't in GROUP BY|not in GROUP BY clause|incompatible with sql_mode=only_full_group_by/i.test(message)) {
    return 'Every column in select must either be in group by or sit inside count(), sum(), avg(), min() or max().'
  }

  if (/is ambiguous/i.test(message)) return 'Two tables have a column with this name: write which one, for example o.customer_id.'

  if (/aggregate functions are not allowed in WHERE|Invalid use of group function/i.test(message)) {
    return 'count(), sum() and the like cannot be used in where. Put that condition in having, after group by.'
  }
  return null
}
