import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_WIN = PG + 'functions-window.html'
const MY_WIN = MY + 'window-function-descriptions.html'

const SCORES = `with score(team, player, points) as (
  select 'red', 'Ann', 30 union all select 'red', 'Bob', 20 union all select 'red', 'Cy', 20 union all
  select 'blue', 'Di', 25 union all select 'blue', 'Ed', 10
)`

const MONTHS = `with sales(month, amount) as (
  select 1, 100 union all select 2, 120 union all select 3, 90 union all select 4, 150
)`

export const windowEntries: ReferenceEntry[] = [
  {
    id: 'over-partition-by',
    name: 'OVER (PARTITION BY …)',
    group: 'window',
    summary:
      'Turns an aggregate or ranking function into a window function: it is computed over related rows but every row stays in the result. PARTITION BY splits the rows into groups, ORDER BY sets the order inside each.',
    postgres: 'sum(amount) over (partition by shop order by day)',
    mysql: 'sum(amount) over (partition by shop order by day)',
    example: {
      postgres: `${SCORES}
select team, player, points,
       sum(points) over (partition by team) as team_total
from score
order by team, player;`,
    },
    match: '\\bover\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window function calls', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: window function concepts', url: MY + 'window-functions-usage.html' },
    ],
  },
  {
    id: 'row-number',
    name: 'ROW_NUMBER',
    group: 'window',
    summary: 'Numbers the rows 1, 2, 3… in window order, with no ties. Filter on it in an outer query to keep the first row per group.',
    postgres: 'row_number() over (partition by team order by points desc)',
    mysql: 'row_number() over (partition by team order by points desc)',
    example: {
      postgres: `${SCORES}
select team, player, points,
       row_number() over (partition by team order by points desc, player) as rn
from score
order by team, rn;`,
    },
    match: '\\brow_number\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: ROW_NUMBER', url: MY_WIN + '#function_row-number' },
    ],
  },
  {
    id: 'rank-dense-rank',
    name: 'RANK / DENSE_RANK',
    group: 'window',
    summary: 'Rank with ties sharing a place. After a tie RANK skips places (1, 2, 2, 4); DENSE_RANK does not (1, 2, 2, 3).',
    postgres: 'rank() over (order by points desc)\ndense_rank() over (order by points desc)',
    mysql: 'rank() over (order by points desc)\ndense_rank() over (order by points desc)',
    mysqlNote: 'RANK is a reserved word in MySQL: do not use it as a column alias.',
    example: {
      postgres: `${SCORES}
select player, points,
       rank() over (order by points desc) as rnk,
       dense_rank() over (order by points desc) as dense
from score
order by points desc, player;`,
    },
    match: '\\b(dense_)?rank\\s*\\(\\s*\\)',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: RANK', url: MY_WIN + '#function_rank' },
    ],
  },
  {
    id: 'ntile',
    name: 'NTILE',
    group: 'window',
    summary: 'Splits the ordered rows into N buckets of nearly equal size and returns the bucket number. Used for quartiles and deciles.',
    postgres: 'ntile(4) over (order by amount)',
    mysql: 'ntile(4) over (order by amount)',
    example: {
      postgres: `${SCORES}
select player, points, ntile(2) over (order by points desc, player) as half
from score
order by points desc, player;`,
    },
    match: '\\bntile\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: NTILE', url: MY_WIN + '#function_ntile' },
    ],
  },
  {
    id: 'lag-lead',
    name: 'LAG / LEAD',
    group: 'window',
    summary:
      'The value from a previous (LAG) or next (LEAD) row in window order, without a self-join. Perfect for month-over-month changes. The optional third argument replaces the NULL at the edges.',
    postgres: 'lag(amount) over (order by month)\nlead(amount, 1, 0) over (order by month)',
    mysql: 'lag(amount) over (order by month)\nlead(amount, 1, 0) over (order by month)',
    example: {
      postgres: `${MONTHS}
select month, amount,
       amount - lag(amount) over (order by month) as diff,
       lead(amount, 1, 0) over (order by month) as next_month
from sales
order by month;`,
    },
    match: '\\b(lag|lead)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: LAG', url: MY_WIN + '#function_lag' },
    ],
  },
  {
    id: 'first-last-value',
    name: 'FIRST_VALUE / LAST_VALUE / NTH_VALUE',
    group: 'window',
    summary:
      'The value from the first, last or n-th row of the window frame. With ORDER BY the default frame ends at the current row, so LAST_VALUE needs "rows between unbounded preceding and unbounded following".',
    postgres:
      'first_value(player) over (partition by team order by points desc)\nlast_value(player) over (\n  order by points\n  rows between unbounded preceding and unbounded following\n)',
    mysql:
      'first_value(player) over (partition by team order by points desc)\nlast_value(player) over (\n  order by points\n  rows between unbounded preceding and unbounded following\n)',
    example: {
      postgres: `${SCORES}
select team, player,
       first_value(player) over (partition by team order by points desc, player) as best,
       last_value(player) over (
         partition by team order by points desc, player
         rows between unbounded preceding and unbounded following
       ) as worst
from score
order by team, player;`,
    },
    match: '\\b(first|last|nth)_value\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: FIRST_VALUE', url: MY_WIN + '#function_first-value' },
    ],
  },
  {
    id: 'percent-rank-cume-dist',
    name: 'PERCENT_RANK / CUME_DIST',
    group: 'window',
    summary:
      'Relative position from 0 to 1. PERCENT_RANK is (rank − 1) / (rows − 1); CUME_DIST is the share of rows at or below the current one.',
    postgres: 'percent_rank() over (order by points)\ncume_dist() over (order by points)',
    mysql: 'percent_rank() over (order by points)\ncume_dist() over (order by points)',
    example: {
      postgres: `${SCORES}
select player, points,
       round(percent_rank() over (order by points)::numeric, 2) as pct_rank,
       round(cume_dist() over (order by points)::numeric, 2) as cume
from score
order by points, player;`,
      mysql: `${SCORES}
select player, points,
       round(percent_rank() over (order by points), 2) as pct_rank,
       round(cume_dist() over (order by points), 2) as cume
from score
order by points, player;`,
    },
    match: '\\b(percent_rank|cume_dist)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG_WIN },
      { label: 'MySQL: PERCENT_RANK', url: MY_WIN + '#function_percent-rank' },
    ],
  },
  {
    id: 'running-total',
    name: 'Running total (SUM … OVER ORDER BY)',
    group: 'window',
    summary:
      'An aggregate with ORDER BY in its window adds up everything from the first row to the current one. Spell out ROWS BETWEEN … to avoid the default RANGE frame, which lumps ties together.',
    postgres: 'sum(amount) over (order by day rows between unbounded preceding and current row)',
    mysql: 'sum(amount) over (order by day rows between unbounded preceding and current row)',
    example: {
      postgres: `${MONTHS}
select month, amount,
       sum(amount) over (order by month rows between unbounded preceding and current row) as running
from sales
order by month;`,
    },
    match: '\\bsum\\s*\\([^)]*\\)\\s*over\\s*\\([^)]*order\\s+by',
    docs: [
      { label: 'PostgreSQL: window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: window frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'moving-average',
    name: 'Window frame: ROWS BETWEEN n PRECEDING',
    group: 'window',
    summary: 'A frame of a fixed number of rows around the current one, for moving averages and rolling sums.',
    postgres: 'avg(amount) over (order by day rows between 2 preceding and current row)',
    mysql: 'avg(amount) over (order by day rows between 2 preceding and current row)',
    example: {
      postgres: `${MONTHS}
select month, amount,
       round(avg(amount) over (order by month rows between 1 preceding and current row), 1) as avg_2_months
from sales
order by month;`,
    },
    match: '\\b(rows|range|groups)\\s+between\\s+\\d+\\s+preceding\\b',
    docs: [
      { label: 'PostgreSQL: window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: window frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'window-clause',
    name: 'WINDOW w AS (…)',
    group: 'window',
    summary: 'Names a window once and reuses it in several functions, so the same PARTITION BY and ORDER BY are not repeated.',
    postgres: 'select rank() over w, lag(x) over w\nfrom t\nwindow w as (partition by g order by x)',
    mysql: 'select rank() over w, lag(x) over w\nfrom t\nwindow w as (partition by g order by x)',
    example: {
      postgres: `${MONTHS}
select month, amount,
       lag(amount) over w as previous,
       sum(amount) over w as running
from sales
window w as (order by month)
order by month;`,
    },
    match: '\\bwindow\\s+\\w+\\s+as\\s*\\(',
    docs: [
      { label: 'PostgreSQL: WINDOW clause', url: PG + 'sql-select.html#SQL-WINDOW' },
      { label: 'MySQL: named windows', url: MY + 'window-functions-named-windows.html' },
    ],
  },
]
