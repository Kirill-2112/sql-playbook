import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const chinookPractice: Exercise[] = [
  {
    id: 'chinook-127',
    dataset: 'chinook',
    level: 4,
    topics: ['introspection'],
    title: 'Where can values be missing?',
    prompt: 'Using the system catalog, count the columns of each table that allow NULL. Show table_name and the count, most first (ties by table name).',
    orderMatters: true,
    solutions: [
      {
        approach: "is_nullable = 'YES'",
        postgres: `select table_name, count(*) as nullable_columns
from information_schema.columns
where table_schema = 'public'
  and is_nullable = 'YES'
group by table_name
order by nullable_columns desc, table_name;`,
        mysql: `select table_name, count(*) as nullable_columns
from information_schema.columns
where table_schema = database()
  and is_nullable = 'YES'
group by table_name
order by nullable_columns desc, table_name;`,
        explanation: 'Before writing a report on an unfamiliar database, check which columns may be NULL: those are the ones that need COALESCE, IS NULL and care in NOT IN.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: information_schema.columns', url: PG + 'infoschema-columns.html' },
      { label: 'MySQL: INFORMATION_SCHEMA COLUMNS', url: MY + 'information-schema-columns-table.html' },
    ],
  },
  {
    id: 'chinook-128',
    dataset: 'chinook',
    level: 4,
    topics: ['introspection'],
    title: 'The columns of invoice, in order',
    prompt: 'List the columns of the invoice table in the order they were defined: position, column name, and whether NULL is allowed.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ordinal_position',
        postgres: `select ordinal_position, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'invoice'
order by ordinal_position;`,
        mysql: `select ordinal_position, column_name, is_nullable
from information_schema.columns
where table_schema = database()
  and table_name = 'invoice'
order by ordinal_position;`,
        explanation: 'The SQL way to "describe" a table, the same in every database that has information_schema. psql\'s \\d invoice and MySQL\'s DESCRIBE invoice are client shortcuts for this.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: information_schema.columns', url: PG + 'infoschema-columns.html' },
      { label: 'MySQL: DESCRIBE', url: MY + 'explain.html' },
    ],
  },
  {
    id: 'chinook-129',
    dataset: 'chinook',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Customers by e-mail provider',
    prompt: 'Count customers by e-mail domain (the part after @), in lower case. Show the domain and the count, most first (ties by domain).',
    orderMatters: true,
    solutions: [
      {
        approach: 'SPLIT_PART',
        postgres: `select lower(split_part(email, '@', 2)) as domain,
       count(*) as customers
from customer
group by 1
order by customers desc, domain;`,
        mysql: `select lower(substring_index(email, '@', -1)) as domain,
       count(*) as customers
from customer
group by domain
order by customers desc, domain;`,
        mysqlNote: 'SUBSTRING_INDEX with −1 returns everything after the last @.',
        explanation: 'Pulling a part out of a structured string is daily cleaning work: domains from e-mails, area codes from phones, years from codes.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: split_part', url: PG + 'functions-string.html' },
      { label: 'MySQL: SUBSTRING_INDEX', url: MY + 'string-functions.html#function_substring-index' },
    ],
  },
]
