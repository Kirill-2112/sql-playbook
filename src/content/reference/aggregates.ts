import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_AGG = PG + 'functions-aggregate.html'
const MY_AGG = MY + 'aggregate-functions.html'

const SALES = `with sale(shop, item, amount) as (
  select 'A', 'tea', 10 union all select 'A', 'cake', 30 union all
  select 'A', 'tea', 20 union all select 'B', 'pie', null union all select 'B', 'tea', 40
)`

export const aggregateEntries: ReferenceEntry[] = [
  {
    id: 'count',
    name: 'COUNT',
    group: 'aggregates',
    summary:
      'COUNT(*) counts rows; COUNT(column) counts only the non-NULL values; COUNT(DISTINCT column) counts different non-NULL values.',
    postgres: 'count(*)\ncount(col)\ncount(distinct col)',
    mysql: 'count(*)\ncount(col)\ncount(distinct col)',
    example: {
      postgres: `${SALES}
select count(*) as rows_, count(amount) as with_amount, count(distinct item) as items
from sale;`,
    },
    match: '\\bcount\\s*\\(',
    docs: [
      { label: 'PostgreSQL: aggregate functions', url: PG_AGG },
      { label: 'MySQL: COUNT', url: MY_AGG + '#function_count' },
    ],
  },
  {
    id: 'sum-avg',
    name: 'SUM / AVG',
    group: 'aggregates',
    summary:
      'Total and mean of the non-NULL values. Both return NULL for an empty group, so wrap SUM in COALESCE(…, 0) when "nothing" should be zero. ROUND averages: the two databases print different numbers of decimals.',
    postgres: 'sum(amount)\nround(avg(amount), 2)',
    mysql: 'sum(amount)\nround(avg(amount), 2)',
    example: {
      postgres: `${SALES}
select shop, sum(amount) as total, round(avg(amount), 2) as average
from sale
group by shop
order by shop;`,
    },
    match: '\\b(sum|avg)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: aggregate functions', url: PG_AGG },
      { label: 'MySQL: SUM', url: MY_AGG + '#function_sum' },
    ],
  },
  {
    id: 'min-max',
    name: 'MIN / MAX',
    group: 'aggregates',
    summary: 'The smallest and largest value in a group. Work on numbers, text and dates; NULLs are skipped.',
    postgres: 'min(price)\nmax(order_date)',
    mysql: 'min(price)\nmax(order_date)',
    example: {
      postgres: `${SALES}
select min(amount) as smallest, max(amount) as largest, max(item) as last_name
from sale;`,
    },
    match: '\\b(min|max)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: aggregate functions', url: PG_AGG },
      { label: 'MySQL: MAX', url: MY_AGG + '#function_max' },
    ],
  },
  {
    id: 'filter',
    name: 'FILTER (WHERE …)',
    group: 'aggregates',
    summary:
      'Restricts one aggregate to the rows that match, so one query can count several things side by side ("conditional aggregation").',
    postgres: "count(*) filter (where status = 'paid')",
    mysql: "sum(case when status = 'paid' then 1 else 0 end)",
    mysqlNote: 'MySQL has no FILTER. Put a CASE inside the aggregate; the CASE form also works in PostgreSQL.',
    example: {
      postgres: `${SALES}
select shop,
       count(*) filter (where item = 'tea') as tea_sales,
       sum(amount) filter (where item <> 'tea') as other_amount
from sale
group by shop
order by shop;`,
      mysql: `${SALES}
select shop,
       sum(case when item = 'tea' then 1 else 0 end) as tea_sales,
       sum(case when item <> 'tea' then amount end) as other_amount
from sale
group by shop
order by shop;`,
    },
    match: '\\bfilter\\s*\\(\\s*where\\b',
    docs: [
      { label: 'PostgreSQL: aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
      { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
    ],
  },
  {
    id: 'string-agg',
    name: 'STRING_AGG',
    group: 'aggregates',
    summary: 'Joins the values of a group into one string with a separator, in the order you choose.',
    postgres: "string_agg(name, ', ' order by name)",
    mysql: "group_concat(name order by name separator ', ')",
    mysqlNote: 'MySQL calls it GROUP_CONCAT. Its result is cut at 1,024 bytes unless you raise group_concat_max_len.',
    example: {
      postgres: `${SALES}
select shop, string_agg(distinct item, ', ' order by item) as items
from sale
group by shop
order by shop;`,
      mysql: `${SALES}
select shop, group_concat(distinct item order by item separator ', ') as items
from sale
group by shop
order by shop;`,
    },
    match: '\\b(string_agg|group_concat)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG_AGG },
      { label: 'MySQL: GROUP_CONCAT', url: MY_AGG + '#function_group-concat' },
    ],
  },
  {
    id: 'bool-and-or',
    name: 'BOOL_AND / BOOL_OR',
    group: 'aggregates',
    summary: 'True when the condition holds for every row of the group (BOOL_AND) or for at least one (BOOL_OR).',
    postgres: 'bool_and(paid)\nbool_or(amount > 100)',
    mysql: 'min(paid) = 1\nmax(amount > 100) = 1',
    mysqlNote: 'MySQL has no boolean aggregates. A condition is 1 or 0 there, so MIN gives "all" and MAX gives "any".',
    example: {
      postgres: `${SALES}
select shop, bool_and(amount is not null) as all_priced, bool_or(amount > 35) as any_big
from sale
group by shop
order by shop;`,
      mysql: `${SALES}
select shop, min(amount is not null) as all_priced, max(amount > 35) as any_big
from sale
group by shop
order by shop;`,
    },
    match: '\\bbool_(and|or)\\s*\\(',
    docs: [{ label: 'PostgreSQL: bool_and', url: PG_AGG }],
  },
  {
    id: 'percentile',
    name: 'PERCENTILE_CONT / PERCENTILE_DISC',
    group: 'aggregates',
    summary:
      'The value at a given fraction of the sorted group. percentile_cont(0.5) is the median, interpolated between the two middle values; percentile_disc picks an actual value.',
    postgres: 'percentile_cont(0.5) within group (order by amount)',
    mysql: null,
    mysqlNote: 'Not in MySQL. Number the rows with ROW_NUMBER and COUNT over the group, then average the middle one or two.',
    example: {
      postgres: `with t(x) as (select 1 union all select 3 union all select 4 union all select 10)
select percentile_cont(0.5) within group (order by x) as median,
       percentile_disc(0.5) within group (order by x) as lower_middle
from t;`,
      mysql: `with t(x) as (select 1 union all select 3 union all select 4 union all select 10),
r as (select x, row_number() over (order by x) as rn, count(*) over () as n from t)
select avg(x) as median, min(x) as lower_middle
from r
where rn in (floor((n + 1) / 2), floor(n / 2) + 1);`,
    },
    match: '\\bpercentile_(cont|disc)\\s*\\(',
    docs: [{ label: 'PostgreSQL: ordered-set aggregates', url: PG_AGG + '#FUNCTIONS-ORDEREDSET-TABLE' }],
  },
  {
    id: 'mode',
    name: 'MODE',
    group: 'aggregates',
    summary: 'The most frequent value in the group. With a tie, PostgreSQL returns the first one in sort order.',
    postgres: 'mode() within group (order by item)',
    mysql: null,
    mysqlNote: 'Not in MySQL. Count per value and keep the top one with ORDER BY count desc LIMIT 1.',
    example: {
      postgres: `${SALES}
select mode() within group (order by item) as most_common from sale;`,
      mysql: `${SALES}
select item as most_common from sale group by item order by count(*) desc, item limit 1;`,
    },
    match: '\\bmode\\s*\\(\\s*\\)',
    docs: [{ label: 'PostgreSQL: ordered-set aggregates', url: PG_AGG + '#FUNCTIONS-ORDEREDSET-TABLE' }],
  },
  {
    id: 'stddev',
    name: 'STDDEV / VARIANCE',
    group: 'aggregates',
    summary:
      'How spread out the values are. STDDEV_SAMP and VAR_SAMP treat the rows as a sample; STDDEV_POP and VAR_POP as the whole population.',
    postgres: 'stddev_samp(x)\nstddev_pop(x)\nvar_samp(x)',
    mysql: 'stddev_samp(x)\nstddev_pop(x)\nvar_samp(x)',
    mysqlNote: 'Plain STDDEV is the sample version in PostgreSQL but the population version in MySQL. Use the explicit _samp/_pop names.',
    example: {
      postgres: `with t(x) as (select 2 union all select 4 union all select 4 union all select 6)
select round(stddev_pop(x), 4) as pop, round(stddev_samp(x), 4) as samp from t;`,
    },
    match: '\\b(stddev|variance|var_samp|var_pop)(_samp|_pop)?\\s*\\(',
    docs: [
      { label: 'PostgreSQL: statistical aggregates', url: PG_AGG + '#FUNCTIONS-AGGREGATE-STATISTICS-TABLE' },
      { label: 'MySQL: STDDEV_SAMP', url: MY_AGG + '#function_stddev-samp' },
    ],
  },
  {
    id: 'corr-regr',
    name: 'CORR / REGR_SLOPE',
    group: 'aggregates',
    summary: 'Statistics over pairs of values: the correlation coefficient and the slope of the best-fit line.',
    postgres: 'corr(y, x)\nregr_slope(y, x)',
    mysql: null,
    mysqlNote: 'Not in MySQL; compute them from SUM, AVG and COUNT with the textbook formulas.',
    example: {
      postgres: `with t(x, y) as (select 1, 2 union all select 2, 4 union all select 3, 7)
select round(corr(y, x)::numeric, 4) as r, round(regr_slope(y, x)::numeric, 4) as slope from t;`,
      mysql: `with t(x, y) as (select 1, 2 union all select 2, 4 union all select 3, 7),
s as (select count(*) as n, sum(x) as sx, sum(y) as sy, sum(x * x) as sxx, sum(y * y) as syy, sum(x * y) as sxy from t)
select round((n * sxy - sx * sy) / sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)), 4) as r,
       round((n * sxy - sx * sy) / (n * sxx - sx * sx), 4) as slope
from s;`,
    },
    match: '\\b(corr|regr_\\w+|covar_\\w+)\\s*\\(',
    docs: [{ label: 'PostgreSQL: statistical aggregates', url: PG_AGG + '#FUNCTIONS-AGGREGATE-STATISTICS-TABLE' }],
  },
]
