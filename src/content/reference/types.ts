import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const typeEntries: ReferenceEntry[] = [
  {
    id: 'cast',
    name: 'CAST and ::',
    group: 'types',
    summary:
      'Converts a value to another type. cast(x as type) is standard SQL and works everywhere; x::type is the PostgreSQL shorthand. A text that does not fit the type is an error.',
    postgres: "cast('42' as integer)\n'42'::int\nprice::numeric(10, 2)",
    mysql: "cast('42' as signed)\ncast(price as decimal(10, 2))",
    mysqlNote: 'MySQL casts to SIGNED/UNSIGNED instead of INTEGER, DECIMAL instead of NUMERIC, CHAR instead of TEXT, and has no :: operator.',
    example: {
      postgres: "select cast('42' as integer) + 1 as n, '3.14159'::numeric(5, 2) as pi, cast('2025-03-07' as date) as d;",
      mysql: "select cast('42' as signed) + 1 as n, cast('3.14159' as decimal(5, 2)) as pi, cast('2025-03-07' as date) as d;",
    },
    match: '\\bcast\\s*\\(|::\\s*\\w',
    docs: [
      { label: 'PostgreSQL: type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html#function_cast' },
    ],
  },
  {
    id: 'numeric-types',
    name: 'NUMERIC vs double precision',
    group: 'types',
    summary:
      'numeric(p, s) / decimal stores exact decimals, right for money. real and double precision are binary floating point: fast but 0.1 + 0.2 is not exactly 0.3.',
    postgres: 'numeric(10, 2)\ndouble precision',
    mysql: 'decimal(10, 2)\ndouble',
    example: {
      postgres: 'select 0.1::numeric + 0.2::numeric = 0.3 as exact, 0.1::float8 + 0.2::float8 = 0.3::float8 as floating;',
      mysql: 'select 0.1 + 0.2 = 0.3 as exact, cast(0.1 as double) + cast(0.2 as double) = cast(0.3 as double) as floating;',
    },
    match: '\\b(numeric|decimal)\\s*\\(\\s*\\d|\\bdouble\\b|\\bfloat8?\\b',
    docs: [
      { label: 'PostgreSQL: numeric types', url: PG + 'datatype-numeric.html' },
      { label: 'MySQL: numeric types', url: MY + 'numeric-types.html' },
    ],
  },
  {
    id: 'boolean',
    name: 'BOOLEAN',
    group: 'types',
    summary:
      'True, false or NULL. A comparison is already a boolean, so you can select it or sum it after a cast. MySQL stores BOOLEAN as TINYINT(1): 1 and 0.',
    postgres: 'is_active boolean\nwhere is_active\nsum(is_active::int)',
    mysql: 'is_active boolean -- tinyint(1)\nwhere is_active\nsum(is_active)',
    example: {
      postgres: `with t(n) as (select 5 union all select 12 union all select 30)
select sum((n > 10)::int) as big_ones, bool_or(n > 20) as any_huge from t;`,
      mysql: `with t(n) as (select 5 union all select 12 union all select 30)
select sum(n > 10) as big_ones, max(n > 20) as any_huge from t;`,
    },
    match: '\\bboolean\\b|::\\s*int\\b|\\b(true|false)\\b',
    docs: [
      { label: 'PostgreSQL: boolean type', url: PG + 'datatype-boolean.html' },
      { label: 'MySQL: numeric types (BOOL)', url: MY + 'numeric-type-syntax.html' },
    ],
  },
  {
    id: 'date-types',
    name: 'DATE, TIMESTAMP, TIMESTAMPTZ',
    group: 'types',
    summary:
      'date has no time; timestamp is a wall-clock time with no zone; timestamptz is a moment in time, stored as UTC and shown in the session\'s time zone.',
    postgres: 'date\ntimestamp\ntimestamptz\ninterval',
    mysql: 'date\ndatetime\ntimestamp',
    mysqlNote: "MySQL's DATETIME is like PostgreSQL's timestamp. MySQL TIMESTAMP converts to UTC like timestamptz but only covers 1970–2038. There is no INTERVAL type.",
    example: {
      postgres: "select cast(timestamp '2025-03-07 14:30:00' as date) as day_only, timestamp '2025-03-07' as midnight;",
      mysql: "select cast(timestamp '2025-03-07 14:30:00' as date) as day_only, cast('2025-03-07' as datetime) as midnight;",
    },
    match: '\\b(timestamptz|timestamp|datetime)\\b',
    docs: [
      { label: 'PostgreSQL: date/time types', url: PG + 'datatype-datetime.html' },
      { label: 'MySQL: date and time types', url: MY + 'date-and-time-types.html' },
    ],
  },
  {
    id: 'text-types',
    name: 'TEXT, VARCHAR(n), CHAR(n)',
    group: 'types',
    summary:
      'In PostgreSQL text and varchar perform the same; varchar(n) just adds a length limit. char(n) pads with spaces and is rarely what you want.',
    postgres: 'name text\ncode varchar(10)',
    mysql: 'name varchar(255)\nbody text\ncode varchar(10)',
    mysqlNote: 'In MySQL TEXT columns cannot have a default value and need a prefix length to be indexed, so VARCHAR is the usual choice.',
    example: {
      postgres: "select char_length(cast('ab' as char(5))) as char_len, cast('abcdef' as varchar(3)) as cut;",
      mysql: "select char_length(cast('ab' as char(5))) as char_len, cast('abcdef' as char(3)) as cut;",
    },
    match: '\\b(varchar|char)\\s*\\(\\s*\\d|\\btext\\b',
    docs: [
      { label: 'PostgreSQL: character types', url: PG + 'datatype-character.html' },
      { label: 'MySQL: string types', url: MY + 'string-types.html' },
    ],
  },
  {
    id: 'uuid',
    name: 'UUID',
    group: 'types',
    summary: 'A 128-bit random identifier, unique without a central counter. Good for public ids; larger and slower to index than an integer key.',
    postgres: 'id uuid primary key default gen_random_uuid()',
    mysql: 'id binary(16) primary key default (uuid_to_bin(uuid()))',
    mysqlNote: 'MySQL has no uuid type: store UUID() as CHAR(36) or, more compactly, BINARY(16) with UUID_TO_BIN.',
    example: {
      postgres: 'select char_length(gen_random_uuid()::text) as chars, gen_random_uuid() <> gen_random_uuid() as different;',
      mysql: 'select char_length(uuid()) as chars, uuid() <> uuid() as different;',
    },
    match: '\\buuid\\b|\\bgen_random_uuid\\s*\\(',
    docs: [
      { label: 'PostgreSQL: UUID type', url: PG + 'datatype-uuid.html' },
      { label: 'MySQL: UUID', url: MY + 'miscellaneous-functions.html#function_uuid' },
    ],
  },
  {
    id: 'pg-typeof',
    name: 'PG_TYPEOF',
    group: 'types',
    summary: 'Shows the type PostgreSQL gave an expression. Handy when a result is unexpectedly integer, text or numeric.',
    postgres: 'pg_typeof(expr)',
    mysql: null,
    mysqlNote: 'No equivalent in MySQL. Create a table from the query (CREATE TABLE t AS SELECT …) and look at its columns.',
    example: {
      postgres: "select pg_typeof(7 / 2) as int_div, pg_typeof(7 / 2.0) as dec_div, pg_typeof(now()) as now_type;",
      mysql: null,
    },
    match: '\\bpg_typeof\\s*\\(',
    docs: [{ label: 'PostgreSQL: system information functions', url: PG + 'functions-info.html' }],
  },
]
