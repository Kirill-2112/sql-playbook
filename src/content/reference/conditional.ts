import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const conditionalEntries: ReferenceEntry[] = [
  {
    id: 'case',
    name: 'CASE',
    group: 'conditional',
    summary:
      'Chooses a value by conditions, checked from top to bottom; the first true one wins. Without ELSE, no match gives NULL. Works in SELECT, WHERE, ORDER BY and inside aggregates.',
    postgres: "case\n  when score >= 90 then 'A'\n  when score >= 75 then 'B'\n  else 'C'\nend",
    mysql: "case\n  when score >= 90 then 'A'\n  when score >= 75 then 'B'\n  else 'C'\nend",
    mysqlNote: 'MySQL also has IF(condition, then, else) for two-way choices; PostgreSQL does not.',
    example: {
      postgres: `with t(name, score) as (
  select 'Ann', 95 union all select 'Bob', 80 union all select 'Cy', 60
)
select name,
       case when score >= 90 then 'A' when score >= 75 then 'B' else 'C' end as grade
from t
order by name;`,
    },
    match: '\\bcase\\s+when\\b|\\bcase\\s+\\w+(\\.\\w+)?\\s+when\\b',
    docs: [
      { label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' },
      { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
    ],
  },
  {
    id: 'coalesce',
    name: 'COALESCE',
    group: 'conditional',
    summary: 'Returns the first argument that is not NULL. The usual way to show a default instead of NULL, such as 0 for "no sales".',
    postgres: "coalesce(phone, email, 'no contact')",
    mysql: "coalesce(phone, email, 'no contact')",
    mysqlNote: 'MySQL also has IFNULL(a, b), the two-argument version.',
    example: {
      postgres: `with t(name, phone, email) as (
  select 'Ann', '555-01', 'ann@x.io' union all
  select 'Bob', null, 'bob@x.io' union all
  select 'Cy', null, null
)
select name, coalesce(phone, email, 'no contact') as contact
from t
order by name;`,
    },
    match: '\\b(coalesce|ifnull)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' },
      { label: 'MySQL: COALESCE', url: MY + 'comparison-operators.html#function_coalesce' },
    ],
  },
  {
    id: 'nullif',
    name: 'NULLIF',
    group: 'conditional',
    summary: 'Returns NULL when the two arguments are equal, otherwise the first one. The standard guard against division by zero: x / nullif(y, 0).',
    postgres: 'total / nullif(count, 0)',
    mysql: 'total / nullif(count, 0)',
    mysqlNote: 'MySQL already returns NULL for division by zero (with a warning), but NULLIF makes the intent clear and works everywhere.',
    example: {
      postgres: `with t(shop, revenue, orders) as (select 'A', 100, 4 union all select 'B', 50, 0)
select shop, round(revenue / nullif(orders, 0), 2) as per_order
from t
order by shop;`,
    },
    match: '\\bnullif\\s*\\(',
    docs: [
      { label: 'PostgreSQL: NULLIF', url: PG + 'functions-conditional.html#FUNCTIONS-NULLIF' },
      { label: 'MySQL: NULLIF', url: MY + 'flow-control-functions.html#function_nullif' },
    ],
  },
  {
    id: 'greatest-least',
    name: 'GREATEST / LEAST',
    group: 'conditional',
    summary: 'The largest or smallest of several values in the same row (MAX and MIN work down a column instead).',
    postgres: 'greatest(a, b, c)\nleast(a, b, c)',
    mysql: 'greatest(a, b, c)\nleast(a, b, c)',
    mysqlNote: 'NULLs differ: PostgreSQL ignores them, MySQL returns NULL if any argument is NULL. Wrap arguments in COALESCE when they can be NULL.',
    example: {
      postgres: 'select greatest(3, 9, 4) as biggest, least(3, 9, 4) as smallest;',
    },
    match: '\\b(greatest|least)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: GREATEST and LEAST', url: PG + 'functions-conditional.html#FUNCTIONS-GREATEST-LEAST' },
      { label: 'MySQL: GREATEST', url: MY + 'comparison-operators.html#function_greatest' },
    ],
  },
  {
    id: 'is-null',
    name: 'IS NULL / IS NOT NULL',
    group: 'conditional',
    summary: 'The only correct test for a missing value. "= NULL" is never true, because comparing anything with NULL gives NULL.',
    postgres: 'where end_date is null',
    mysql: 'where end_date is null',
    example: {
      postgres: `with t(name, end_date) as (select 'Ann', null union all select 'Bob', '2024-01-01')
select name,
       end_date is null as open,
       (end_date = null) is null as equals_null_is_unknown
from t
order by name;`,
    },
    match: '\\bis\\s+(not\\s+)?null\\b',
    docs: [
      { label: 'PostgreSQL: comparison predicates', url: PG + 'functions-comparison.html#FUNCTIONS-COMPARISON-PRED-TABLE' },
      { label: 'MySQL: IS NULL', url: MY + 'comparison-operators.html#operator_is-null' },
    ],
  },
  {
    id: 'is-distinct-from',
    name: 'IS DISTINCT FROM',
    group: 'conditional',
    summary: 'A comparison that treats NULL as an ordinary value: NULL is not distinct from NULL, and 1 is distinct from NULL. Handy for "did this value change?".',
    postgres: 'where old_value is distinct from new_value',
    mysql: 'where not (old_value <=> new_value)',
    mysqlNote: 'MySQL has the NULL-safe equality operator <=>, which is IS NOT DISTINCT FROM.',
    example: {
      postgres: `select (1 is distinct from null) as a,
       (null is not distinct from null) as b,
       (2 is distinct from 2) as c;`,
      mysql: `select not (1 <=> null) as a,
       (null <=> null) as b,
       not (2 <=> 2) as c;`,
    },
    match: '\\bis\\s+(not\\s+)?distinct\\s+from\\b|<=>',
    docs: [
      { label: 'PostgreSQL: IS DISTINCT FROM', url: PG + 'functions-comparison.html#FUNCTIONS-COMPARISON-PRED-TABLE' },
      { label: 'MySQL: <=>', url: MY + 'comparison-operators.html#operator_equal-to' },
    ],
  },
  {
    id: 'between',
    name: 'BETWEEN',
    group: 'conditional',
    summary:
      'x BETWEEN a AND b means a <= x AND x <= b, both ends included. For timestamps prefer x >= day AND x < next_day, so the last day is not cut at midnight.',
    postgres: 'where price between 10 and 20',
    mysql: 'where price between 10 and 20',
    example: {
      postgres: `with t(n) as (select 9 union all select 10 union all select 20 union all select 21)
select n from t where n between 10 and 20;`,
    },
    match: '\\bbetween\\b',
    docs: [
      { label: 'PostgreSQL: BETWEEN', url: PG + 'functions-comparison.html#FUNCTIONS-COMPARISON-PRED-TABLE' },
      { label: 'MySQL: BETWEEN', url: MY + 'comparison-operators.html#operator_between' },
    ],
  },
  {
    id: 'in-list',
    name: 'IN (list)',
    group: 'conditional',
    summary: 'Short for several equality checks joined with OR: status in (\'new\', \'paid\').',
    postgres: "where status in ('new', 'paid')",
    mysql: "where status in ('new', 'paid')",
    example: {
      postgres: `with t(id, status) as (select 1, 'new' union all select 2, 'sent' union all select 3, 'paid')
select id from t where status in ('new', 'paid') order by id;`,
    },
    match: "\\bin\\s*\\(\\s*('|\\d)",
    docs: [
      { label: 'PostgreSQL: IN', url: PG + 'functions-comparisons.html#FUNCTIONS-COMPARISONS-IN-SCALAR' },
      { label: 'MySQL: IN()', url: MY + 'comparison-operators.html#operator_in' },
    ],
  },
  {
    id: 'like-ilike',
    name: 'LIKE / ILIKE',
    group: 'conditional',
    summary:
      'Pattern matching: % stands for any run of characters, _ for exactly one. LIKE is case-sensitive in PostgreSQL; ILIKE ignores case.',
    postgres: "where name like 'A%'\nwhere name ilike 'a%'",
    mysql: "where name like 'A%'",
    mysqlNote: 'MySQL has no ILIKE: with the usual _ci collations LIKE already ignores case. Use COLLATE utf8mb4_bin for a case-sensitive LIKE.',
    example: {
      postgres: `with t(name) as (select 'Anna' union all select 'anton' union all select 'Bea')
select name from t where name ilike 'an%' order by name;`,
      mysql: `with t(name) as (select 'Anna' union all select 'anton' union all select 'Bea')
select name from t where name like 'an%' order by name;`,
    },
    match: '\\bi?like\\b',
    docs: [
      { label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: LIKE', url: MY + 'string-comparison-functions.html#operator_like' },
    ],
  },
  {
    id: 'three-valued-logic',
    name: 'AND / OR / NOT with NULL',
    group: 'conditional',
    summary:
      'SQL logic has three values: true, false and unknown (NULL). NULL AND false is false, NULL OR true is true, anything else with NULL stays NULL, and WHERE keeps only true.',
    postgres: 'where not (a and b) or c',
    mysql: 'where not (a and b) or c',
    example: {
      postgres: `select (null and false) as and_false,
       (null or true) as or_true,
       (null and true) is null as and_true_unknown,
       (not null) is null as not_unknown;`,
    },
    match: '\\bnot\\s*\\(',
    docs: [
      { label: 'PostgreSQL: logical operators', url: PG + 'functions-logical.html' },
      { label: 'MySQL: logical operators', url: MY + 'logical-operators.html' },
    ],
  },
]
