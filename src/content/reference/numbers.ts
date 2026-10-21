import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_MATH = PG + 'functions-math.html'
const MY_MATH = MY + 'mathematical-functions.html'

export const numberEntries: ReferenceEntry[] = [
  {
    id: 'round',
    name: 'ROUND',
    group: 'numbers',
    summary:
      'Rounds to n decimal places (half away from zero for exact numbers). A negative n rounds to tens, hundreds…. Round every average and ratio you show.',
    postgres: 'round(price, 2)\nround(total, -3)',
    mysql: 'round(price, 2)\nround(total, -3)',
    mysqlNote: "In PostgreSQL round(x, n) needs x to be numeric: cast double precision values first (round(x::numeric, 2)).",
    example: {
      postgres: 'select round(2.345, 2) as two_places, round(2.5) as half, round(12345, -3) as thousands;',
    },
    match: '\\bround\\s*\\(',
    docs: [
      { label: 'PostgreSQL: mathematical functions', url: PG_MATH },
      { label: 'MySQL: ROUND', url: MY_MATH + '#function_round' },
    ],
  },
  {
    id: 'ceil-floor-trunc',
    name: 'CEIL / FLOOR / TRUNC',
    group: 'numbers',
    summary: 'CEIL rounds up, FLOOR rounds down, TRUNC cuts the decimals off (towards zero). They differ on negative numbers.',
    postgres: 'ceil(x)\nfloor(x)\ntrunc(x, 1)',
    mysql: 'ceil(x)\nfloor(x)\ntruncate(x, 1)',
    mysqlNote: 'MySQL calls it TRUNCATE(x, d), and the number of decimals is required.',
    example: {
      postgres: 'select ceil(-2.5) as c, floor(-2.5) as f, trunc(-2.57, 1) as t;',
      mysql: 'select ceil(-2.5) as c, floor(-2.5) as f, truncate(-2.57, 1) as t;',
    },
    match: '\\b(ceil|ceiling|floor|trunc|truncate)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: mathematical functions', url: PG_MATH },
      { label: 'MySQL: FLOOR', url: MY_MATH + '#function_floor' },
    ],
  },
  {
    id: 'integer-division',
    name: 'Integer division and MOD',
    group: 'numbers',
    summary:
      'In PostgreSQL integer / integer drops the fraction (7 / 2 = 3); MySQL / always gives a decimal (3.5000). MOD or % is the remainder. Write 100.0 * a / b for a percentage.',
    postgres: '7 / 2\n7 % 2\nmod(7, 2)',
    mysql: '7 div 2\n7 % 2\nmod(7, 2)',
    mysqlNote: 'Use DIV for integer division in MySQL.',
    example: {
      postgres: 'select 7 / 2 as quotient, 7 % 2 as remainder, round(100.0 * 1 / 3, 1) as pct;',
      mysql: 'select 7 div 2 as quotient, 7 % 2 as remainder, round(100.0 * 1 / 3, 1) as pct;',
    },
    match: '\\bdiv\\b|\\bmod\\s*\\(|\\s%\\s',
    docs: [
      { label: 'PostgreSQL: mathematical operators', url: PG_MATH + '#FUNCTIONS-MATH-OP-TABLE' },
      { label: 'MySQL: DIV', url: MY + 'arithmetic-functions.html#operator_div' },
    ],
  },
  {
    id: 'abs-sign',
    name: 'ABS / SIGN',
    group: 'numbers',
    summary: 'ABS drops the minus sign; SIGN returns -1, 0 or 1. Useful for "how far from the target", whatever the direction.',
    postgres: 'abs(actual - target)\nsign(change)',
    mysql: 'abs(actual - target)\nsign(change)',
    example: {
      postgres: 'select abs(-7) as distance, sign(-7) as direction, sign(0) as zero;',
    },
    match: '\\b(abs|sign)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: mathematical functions', url: PG_MATH },
      { label: 'MySQL: ABS', url: MY_MATH + '#function_abs' },
    ],
  },
  {
    id: 'power-sqrt',
    name: 'POWER / SQRT / EXP / LN',
    group: 'numbers',
    summary: 'Powers, roots, e to the power x and natural logarithms. LN and EXP turn growth rates into something you can average.',
    postgres: 'power(1 + rate, years)\nsqrt(x)\nexp(x)\nln(x)',
    mysql: 'power(1 + rate, years)\nsqrt(x)\nexp(x)\nln(x)',
    mysqlNote: 'PostgreSQL also writes powers as x ^ y; in MySQL ^ is bitwise XOR.',
    example: {
      postgres: 'select power(2, 10) as kib, sqrt(16) as root, round(ln(exp(1))) as one;',
    },
    match: '\\b(power|pow|sqrt|exp|ln|log|log10)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: mathematical functions', url: PG_MATH },
      { label: 'MySQL: POW', url: MY_MATH + '#function_pow' },
    ],
  },
  {
    id: 'random',
    name: 'RANDOM',
    group: 'numbers',
    summary: 'A random number from 0 (inclusive) to 1 (exclusive). ORDER BY random() LIMIT n picks random rows, but it reads the whole table.',
    postgres: 'random()\norder by random() limit 5',
    mysql: 'rand()\norder by rand() limit 5',
    mysqlNote: 'MySQL calls it RAND(). setseed() in PostgreSQL and RAND(seed) in MySQL make the sequence repeatable.',
    example: {
      postgres: 'select random() >= 0 and random() < 1 as in_range;',
      mysql: 'select rand() >= 0 and rand() < 1 as in_range;',
    },
    match: '\\b(random|rand)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: random functions', url: PG_MATH + '#FUNCTIONS-MATH-RANDOM-TABLE' },
      { label: 'MySQL: RAND', url: MY_MATH + '#function_rand' },
    ],
  },
  {
    id: 'generate-series',
    name: 'GENERATE_SERIES',
    group: 'numbers',
    summary:
      'Produces a series of numbers or timestamps as rows. Join it to your data with LEFT JOIN to show days or months that have no rows.',
    postgres: "generate_series(1, 10)\ngenerate_series(date '2025-01-01', date '2025-12-01', interval '1 month')",
    mysql: 'with recursive s(n) as (select 1 union all select n + 1 from s where n < 10)\nselect n from s',
    mysqlNote: 'Not in MySQL; a recursive CTE does the same job and also works in PostgreSQL.',
    example: {
      postgres: 'select n from generate_series(1, 9, 4) as n;',
      mysql: 'with recursive s(n) as (select 1 union all select n + 4 from s where n + 4 <= 9)\nselect n from s;',
    },
    match: '\\bgenerate_series\\s*\\(',
    docs: [{ label: 'PostgreSQL: set returning functions', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'width-bucket',
    name: 'WIDTH_BUCKET',
    group: 'numbers',
    summary: 'Puts a value into one of n equal-width buckets between a low and a high bound. A quick way to build a histogram.',
    postgres: 'width_bucket(price, 0, 100, 4)',
    mysql: 'floor((price - 0) / ((100 - 0) / 4)) + 1',
    mysqlNote: 'Not in MySQL; compute the bucket number with FLOOR. Values outside the range need their own handling.',
    example: {
      postgres: `with t(price) as (select 5 union all select 30 union all select 99)
select price, width_bucket(price, 0, 100, 4) as bucket from t order by price;`,
      mysql: `with t(price) as (select 5 union all select 30 union all select 99)
select price, floor(price / 25) + 1 as bucket from t order by price;`,
    },
    match: '\\bwidth_bucket\\s*\\(',
    docs: [{ label: 'PostgreSQL: mathematical functions', url: PG_MATH }],
  },
]
