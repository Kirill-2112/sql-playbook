import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const sakilaPractice: Exercise[] = [
  {
    id: 'sakila-129',
    dataset: 'sakila',
    level: 4,
    topics: ['privileges'],
    title: 'An auditor who can read everything',
    prompt: 'Create a role auditor that can read every table of the database (but change nothing), with one GRANT instead of one per table.',
    orderMatters: false,
    checkSql: `select distinct privilege_type
from information_schema.role_table_grants
where grantee = 'auditor'`,
    checkSqlMysql: `select privilege_type
from information_schema.schema_privileges
where grantee = '''auditor''@''%'''`,
    solutions: [
      {
        approach: 'GRANT … ON ALL TABLES IN SCHEMA',
        postgres: `create role auditor nologin;
grant select on all tables in schema public to auditor;`,
        mysql: `create role auditor;
grant select on * to auditor;`,
        mysqlNote: 'In MySQL ON * means every table of the current database (ON sakila.* names it); the grant is stored once at database level.',
        explanation:
          'PostgreSQL expands ALL TABLES IN SCHEMA into a grant on each existing table; tables created later are not included unless you also set ALTER DEFAULT PRIVILEGES. MySQL\'s database-level grant also covers future tables.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GRANT', url: PG + 'sql-grant.html' },
      { label: 'MySQL: GRANT', url: MY + 'grant.html' },
    ],
  },
  {
    id: 'sakila-130',
    dataset: 'sakila',
    level: 4,
    topics: ['privileges'],
    title: 'Rent out, but never delete',
    prompt: 'The front desk records rentals. Create a role front_desk that can read and add rentals, but not change or delete them. Show its privileges on rental.',
    orderMatters: true,
    checkSql: `select privilege_type
from information_schema.role_table_grants
where grantee = 'front_desk' and table_name = 'rental'
order by privilege_type`,
    checkSqlMysql: `select privilege_type
from information_schema.table_privileges
where grantee = '''front_desk''@''%''' and table_name = 'rental'
order by privilege_type`,
    solutions: [
      {
        approach: 'GRANT SELECT, INSERT',
        postgres: `create role front_desk nologin;
grant select, insert on rental to front_desk;`,
        mysql: `create role front_desk;
grant select, insert on rental to front_desk;`,
        explanation: 'Grant exactly the verbs the job needs. Without UPDATE and DELETE a mistake at the desk cannot rewrite history; corrections go through someone with more rights.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: privileges', url: PG + 'ddl-priv.html' },
      { label: 'MySQL: privileges provided', url: MY + 'privileges-provided.html' },
    ],
  },
  {
    id: 'sakila-131',
    dataset: 'sakila',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Names in title case',
    prompt: 'Actor names are stored in capitals. Show actor_id and first_name written with only the first letter capital, for actors 1 to 10.',
    orderMatters: true,
    solutions: [
      {
        approach: 'INITCAP',
        postgres: `select actor_id, initcap(first_name) as first_name
from actor
where actor_id <= 10
order by actor_id;`,
        mysql: `select actor_id, concat(upper(left(first_name, 1)), lower(substring(first_name, 2))) as first_name
from actor
where actor_id <= 10
order by actor_id;`,
        mysqlNote: 'MySQL has no INITCAP: capitalise the first letter and lower-case the rest. That works for single words only.',
        explanation: 'INITCAP capitalises the first letter of every word, which also handles names like "MARY JANE". Display formatting belongs in the query or the app, not in the stored data.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: initcap', url: PG + 'functions-string.html' },
      { label: 'MySQL: UPPER and LOWER', url: MY + 'string-functions.html#function_upper' },
    ],
  },
]
