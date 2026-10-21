import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const queryEntries: ReferenceEntry[] = [
  {
    id: 'select',
    name: 'SELECT … FROM',
    group: 'query',
    summary: 'Reads rows from one or more tables and returns the columns or expressions you list. Every query starts here.',
    postgres: 'select col1, col2 as alias, expr\nfrom table_name;',
    mysql: 'select col1, col2 as alias, expr\nfrom table_name;',
    example: {
      postgres: `with film(title, length) as (
  select 'Alien', 117 union all select 'Heat', 170
)
select title, length, length / 60 as hours
from film;`,
      mysql: `with film(title, length) as (
  select 'Alien', 117 union all select 'Heat', 170
)
select title, length, length div 60 as hours
from film;`,
    },
    mysqlNote: 'The query is the same; only the integer division changes, because / in MySQL always returns a decimal.',
    match: '\\bselect\\b',
    docs: [
      { label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'where',
    name: 'WHERE',
    group: 'query',
    summary: 'Keeps only the rows for which the condition is true. Rows where it is false or NULL are dropped.',
    postgres: 'select …\nfrom t\nwhere condition and other_condition;',
    mysql: 'select …\nfrom t\nwhere condition and other_condition;',
    example: {
      postgres: `with t(name, price) as (
  select 'tea', 3 union all select 'cake', 7 union all select 'water', null
)
select name from t where price > 2;`,
    },
    match: '\\bwhere\\b',
    docs: [
      { label: 'PostgreSQL: WHERE clause', url: PG + 'sql-select.html#SQL-WHERE' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'distinct',
    name: 'DISTINCT',
    group: 'query',
    summary: 'Removes duplicate rows from the result. Two rows are duplicates when every selected column is equal; NULLs count as equal here.',
    postgres: 'select distinct col1, col2\nfrom t;',
    mysql: 'select distinct col1, col2\nfrom t;',
    example: {
      postgres: `with t(city) as (
  select 'Oslo' union all select 'Rome' union all select 'Oslo'
)
select distinct city from t order by city;`,
    },
    match: '\\bselect\\s+distinct\\b(?!\\s+on\\b)',
    docs: [
      { label: 'PostgreSQL: DISTINCT', url: PG + 'sql-select.html#SQL-DISTINCT' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'distinct-on',
    name: 'DISTINCT ON',
    group: 'query',
    summary:
      'PostgreSQL only: keeps the first row of each group, where "first" is decided by ORDER BY. A short way to get the latest or biggest row per group.',
    postgres: 'select distinct on (group_col) *\nfrom t\norder by group_col, sort_col desc;',
    mysql: null,
    mysqlNote: 'Not in MySQL. Use ROW_NUMBER() over (partition by … order by …) in a subquery and keep row number 1.',
    example: {
      postgres: `with sale(shop, day, amount) as (
  select 'A', 1, 10 union all select 'A', 2, 30 union all select 'B', 1, 20
)
select distinct on (shop) shop, day, amount
from sale
order by shop, day desc;`,
      mysql: `with sale(shop, day, amount) as (
  select 'A', 1, 10 union all select 'A', 2, 30 union all select 'B', 1, 20
)
select shop, day, amount
from (
  select sale.*, row_number() over (partition by shop order by day desc) as rn
  from sale
) s
where rn = 1;`,
    },
    match: '\\bdistinct\\s+on\\b',
    docs: [{ label: 'PostgreSQL: DISTINCT ON', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },
  {
    id: 'order-by',
    name: 'ORDER BY … NULLS FIRST / LAST',
    group: 'query',
    summary:
      'Sorts the result. Without ORDER BY the row order is not guaranteed. PostgreSQL puts NULLs last when sorting up, MySQL puts them first; NULLS FIRST/LAST makes it explicit.',
    postgres: 'order by col1 desc, col2 nulls last',
    mysql: 'order by col1 desc, col2 is null, col2',
    mysqlNote: 'MySQL has no NULLS FIRST/LAST. Sort by "col is null" first: false (0) comes before true (1), so NULLs go last.',
    example: {
      postgres: `with t(name, score) as (
  select 'Ann', 7 union all select 'Bob', null union all select 'Cy', 9
)
select name, score from t order by score nulls first;`,
      mysql: `with t(name, score) as (
  select 'Ann', 7 union all select 'Bob', null union all select 'Cy', 9
)
select name, score from t order by score is not null, score;`,
    },
    match: '\\border\\s+by\\b',
    docs: [
      { label: 'PostgreSQL: ORDER BY', url: PG + 'sql-select.html#SQL-ORDERBY' },
      { label: 'MySQL: ORDER BY optimization', url: MY + 'order-by-optimization.html' },
    ],
  },
  {
    id: 'limit-offset',
    name: 'LIMIT … OFFSET',
    group: 'query',
    summary:
      'Returns at most N rows, optionally after skipping some. Always pair it with an ORDER BY that has a full tie-breaker, or the rows you get are arbitrary.',
    postgres: 'order by … limit 10 offset 20',
    mysql: 'order by … limit 10 offset 20',
    mysqlNote: 'MySQL also accepts the short form LIMIT 20, 10 (offset first).',
    example: {
      postgres: `with t(n) as (
  select 1 union all select 2 union all select 3 union all select 4 union all select 5
)
select n from t order by n limit 2 offset 1;`,
    },
    match: '\\blimit\\s+\\d',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'fetch-first',
    name: 'FETCH FIRST … WITH TIES',
    group: 'query',
    summary:
      'The SQL-standard form of LIMIT. WITH TIES also returns every row that ties with the last one, so a "top 3" never cuts a tie in half.',
    postgres: 'order by score desc\nfetch first 3 rows with ties',
    mysql: null,
    mysqlNote: 'Not in MySQL. For WITH TIES, use RANK() in a subquery and keep rank <= 3.',
    example: {
      postgres: `with t(name, score) as (
  select 'Ann', 9 union all select 'Bob', 8 union all select 'Cy', 8 union all select 'Di', 5
)
select name, score from t order by score desc fetch first 2 rows with ties;`,
      mysql: `with t(name, score) as (
  select 'Ann', 9 union all select 'Bob', 8 union all select 'Cy', 8 union all select 'Di', 5
)
select name, score
from (select t.*, rank() over (order by score desc) as rnk from t) r
where rnk <= 2;`,
    },
    match: '\\bfetch\\s+(first|next)\\b',
    docs: [{ label: 'PostgreSQL: LIMIT clause', url: PG + 'sql-select.html#SQL-LIMIT' }],
  },
  {
    id: 'group-by',
    name: 'GROUP BY',
    group: 'query',
    summary:
      'Collapses rows with the same values into one row per group, so aggregates like COUNT and SUM are computed per group. Every selected column must be grouped or aggregated.',
    postgres: 'select key, count(*), sum(amount)\nfrom t\ngroup by key;',
    mysql: 'select key, count(*), sum(amount)\nfrom t\ngroup by key;',
    example: {
      postgres: `with sale(shop, amount) as (
  select 'A', 10 union all select 'A', 30 union all select 'B', 20
)
select shop, count(*) as sales, sum(amount) as total
from sale
group by shop
order by shop;`,
    },
    match: '\\bgroup\\s+by\\b',
    docs: [
      { label: 'PostgreSQL: GROUP BY', url: PG + 'sql-select.html#SQL-GROUPBY' },
      { label: 'MySQL: GROUP BY handling', url: MY + 'group-by-handling.html' },
    ],
  },
  {
    id: 'having',
    name: 'HAVING',
    group: 'query',
    summary: 'Filters groups after GROUP BY, so it can use aggregates. WHERE filters rows before grouping and cannot.',
    postgres: 'group by key\nhaving count(*) > 1',
    mysql: 'group by key\nhaving count(*) > 1',
    example: {
      postgres: `with sale(shop, amount) as (
  select 'A', 10 union all select 'A', 30 union all select 'B', 20
)
select shop, sum(amount) as total
from sale
group by shop
having count(*) > 1;`,
    },
    match: '\\bhaving\\b',
    docs: [
      { label: 'PostgreSQL: HAVING', url: PG + 'sql-select.html#SQL-HAVING' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'rollup',
    name: 'ROLLUP',
    group: 'query',
    summary:
      'Adds subtotal rows to a grouped result: one per group level plus a grand total. The rolled-up columns are NULL in those extra rows; GROUPING() tells them apart from real NULLs.',
    postgres: 'group by rollup (region, city)',
    mysql: 'group by region, city with rollup',
    example: {
      postgres: `with sale(shop, amount) as (
  select 'A', 10 union all select 'A', 30 union all select 'B', 20
)
select shop, sum(amount) as total
from sale
group by rollup (shop)
order by grouping(shop), shop;`,
      mysql: `with sale(shop, amount) as (
  select 'A', 10 union all select 'A', 30 union all select 'B', 20
)
select shop, sum(amount) as total
from sale
group by shop with rollup
order by grouping(shop), shop;`,
    },
    match: '\\brollup\\b',
    docs: [
      { label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' },
      { label: 'MySQL: WITH ROLLUP', url: MY + 'group-by-modifiers.html' },
    ],
  },
  {
    id: 'grouping-sets',
    name: 'GROUPING SETS and CUBE',
    group: 'query',
    summary:
      'Computes several groupings in one query. GROUPING SETS lists them explicitly; CUBE makes every combination of the columns.',
    postgres: 'group by grouping sets ((region), (product), ())\ngroup by cube (region, product)',
    mysql: null,
    mysqlNote: 'MySQL has only WITH ROLLUP. Other combinations need one query per grouping glued with UNION ALL.',
    example: {
      postgres: `with sale(shop, item, amount) as (
  select 'A', 'tea', 10 union all select 'A', 'cake', 30 union all select 'B', 'tea', 20
)
select shop, item, sum(amount) as total
from sale
group by grouping sets ((shop), (item))
order by shop, item;`,
      mysql: `with sale(shop, item, amount) as (
  select 'A', 'tea', 10 union all select 'A', 'cake', 30 union all select 'B', 'tea', 20
)
select shop, null as item, sum(amount) as total from sale group by shop
union all
select null, item, sum(amount) from sale group by item;`,
    },
    match: '\\b(grouping\\s+sets|cube)\\s*\\(',
    docs: [{ label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'with',
    name: 'WITH (common table expression)',
    group: 'query',
    summary:
      'Names a subquery so the main query can use it like a table. Makes long queries readable step by step, and one CTE can be used several times.',
    postgres: 'with recent as (\n  select … from t where …\n)\nselect … from recent;',
    mysql: 'with recent as (\n  select … from t where …\n)\nselect … from recent;',
    example: {
      postgres: `with sale(amount) as (
  select 10 union all select 30 union all select 20
),
stats as (select avg(amount) as avg_amount from sale)
select amount from sale, stats where amount > avg_amount;`,
    },
    match: '\\bwith\\s+(?!recursive\\b)\\w+(\\s*\\([^)]*\\))?\\s+as\\s*\\(',
    docs: [
      { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
      { label: 'MySQL: WITH', url: MY + 'with.html' },
    ],
  },
  {
    id: 'with-recursive',
    name: 'WITH RECURSIVE',
    group: 'query',
    summary:
      'A CTE that refers to itself: a starting query, UNION ALL, and a step that runs on the previous step\'s rows until it returns none. Used for number and date series, trees and graphs.',
    postgres: 'with recursive r(n) as (\n  select 1\n  union all\n  select n + 1 from r where n < 5\n)\nselect n from r;',
    mysql: 'with recursive r(n) as (\n  select 1\n  union all\n  select n + 1 from r where n < 5\n)\nselect n from r;',
    mysqlNote: 'MySQL stops a recursion after 1,000 steps by default (cte_max_recursion_depth).',
    example: {
      postgres: `with recursive r(n) as (
  select 1
  union all
  select n * 2 from r where n < 16
)
select n from r;`,
    },
    match: '\\bwith\\s+recursive\\b',
    docs: [
      { label: 'PostgreSQL: recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' },
      { label: 'MySQL: recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'lateral',
    name: 'LATERAL',
    group: 'query',
    summary:
      'Lets a subquery in FROM use columns of the tables before it, so it runs once per row. The classic use: top N rows per group.',
    postgres: 'from a\ncross join lateral (\n  select … from b where b.a_id = a.id order by … limit 3\n) top3',
    mysql: 'from a\ncross join lateral (\n  select … from b where b.a_id = a.id order by … limit 3\n) top3',
    mysqlNote: 'Supported since MySQL 8.0.14.',
    example: {
      postgres: `with shop(name) as (select 'A' union all select 'B'),
sale(shop, amount) as (
  select 'A', 10 union all select 'A', 30 union all select 'A', 20 union all select 'B', 5
)
select shop.name, top.amount
from shop
cross join lateral (
  select amount from sale where sale.shop = shop.name order by amount desc limit 2
) top
order by shop.name, top.amount desc;`,
    },
    match: '\\blateral\\b',
    docs: [
      { label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' },
      { label: 'MySQL: lateral derived tables', url: MY + 'lateral-derived-tables.html' },
    ],
  },
  {
    id: 'values',
    name: 'VALUES',
    group: 'query',
    summary: 'Builds a small table right in the query, without creating one. Handy for lookups and test data.',
    postgres: "select * from (values (1, 'a'), (2, 'b')) as t(id, name);",
    mysql: "select * from (values row(1, 'a'), row(2, 'b')) as t(id, name);",
    mysqlNote: 'MySQL 8.0.19+ needs the ROW keyword before each row.',
    example: {
      postgres: `select id, name
from (values (1, 'tea'), (2, 'cake')) as t(id, name)
order by id;`,
      mysql: `select id, name
from (values row(1, 'tea'), row(2, 'cake')) as t(id, name)
order by id;`,
    },
    match: '\\(\\s*values\\s*(row\\s*)?\\(',
    docs: [
      { label: 'PostgreSQL: VALUES lists', url: PG + 'queries-values.html' },
      { label: 'MySQL: VALUES statement', url: MY + 'values.html' },
    ],
  },
  {
    id: 'subquery-scalar',
    name: 'Scalar subquery',
    group: 'query',
    summary:
      'A subquery in parentheses that returns one value can be used anywhere a value fits: in SELECT, WHERE or ORDER BY. If it returns no rows the value is NULL; more than one row is an error.',
    postgres: 'select name, (select max(x) from t2 where t2.id = t1.id) as best\nfrom t1;',
    mysql: 'select name, (select max(x) from t2 where t2.id = t1.id) as best\nfrom t1;',
    example: {
      postgres: `with sale(amount) as (select 10 union all select 30 union all select 20)
select amount, amount - (select avg(amount) from sale) as vs_avg
from sale
order by amount;`,
    },
    match: '\\(\\s*select\\b',
    docs: [
      { label: 'PostgreSQL: scalar subqueries', url: PG + 'sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES' },
      { label: 'MySQL: scalar operand', url: MY + 'scalar-subqueries.html' },
    ],
  },
  {
    id: 'keyset-pagination',
    name: 'Keyset pagination',
    group: 'query',
    summary:
      'Fetches the next page by continuing after the last row shown (WHERE sort key > last value) instead of skipping rows with OFFSET. Stays fast deep into a list and never repeats or skips rows when new ones arrive.',
    postgres: 'select … from t\nwhere (created_at, id) < (:last_created_at, :last_id)\norder by created_at desc, id desc\nlimit 20;',
    mysql: 'select … from t\nwhere (created_at, id) < (:last_created_at, :last_id)\norder by created_at desc, id desc\nlimit 20;',
    example: {
      postgres: `with item(id, price) as (
  select 1, 50 union all select 2, 40 union all select 3, 40 union all select 4, 30 union all select 5, 20
)
select id, price from item
where price < 40 or (price = 40 and id > 2)
order by price desc, id
limit 2;`,
    },
    match: '\\(\\s*\\w+(\\.\\w+)?\\s*,\\s*\\w+(\\.\\w+)?\\s*\\)\\s*[<>]=?\\s*\\(|\\bwhere\\s+\\w+\\s*<\\s*[\\d.]+\\s+or\\s*\\(',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'PostgreSQL: row constructor comparison', url: PG + 'functions-comparisons.html#ROW-WISE-COMPARISON' },
      { label: 'MySQL: LIMIT optimization', url: MY + 'limit-optimization.html' },
    ],
  },
]
