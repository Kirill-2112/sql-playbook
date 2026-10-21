import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const CUSTOMERS = `create table customer (id int, email varchar(50), city varchar(20), active boolean);
insert into customer values (1, 'Ann@x.io', 'Oslo', true), (2, 'bob@x.io', 'Rome', false), (3, 'cy@x.io', 'Oslo', true);`

const PG_INDEXES = "select indexname as index_name from pg_indexes where tablename = 'customer' order by 1;"
const MY_INDEXES =
  "select distinct index_name from information_schema.statistics where table_schema = database() and table_name = 'customer' order by 1;"

export const performanceEntries: ReferenceEntry[] = [
  {
    id: 'create-index',
    name: 'CREATE INDEX',
    group: 'performance',
    summary:
      'A sorted structure (a B-tree by default) that lets the database find rows by a column without reading the whole table. It speeds up reads and slows down writes a little.',
    postgres: 'create index customer_email_idx on customer (email);',
    mysql: 'create index customer_email_idx on customer (email);',
    example: {
      postgres: `${CUSTOMERS}
create index customer_email_idx on customer (email);
${PG_INDEXES}`,
      mysql: `${CUSTOMERS}
create index customer_email_idx on customer (email);
${MY_INDEXES}`,
    },
    match: '\\bcreate\\s+(unique\\s+)?index\\b',
    docs: [
      { label: 'PostgreSQL: CREATE INDEX', url: PG + 'sql-createindex.html' },
      { label: 'MySQL: CREATE INDEX', url: MY + 'create-index.html' },
    ],
  },
  {
    id: 'composite-index',
    name: 'Composite (multicolumn) index',
    group: 'performance',
    summary:
      'An index on several columns is sorted by the first, then the second… It helps queries that filter on a leftmost prefix of its columns: (city, active) helps "city = ?" but not "active = ?" alone.',
    postgres: 'create index on customer (city, active);',
    mysql: 'create index customer_city_active_idx on customer (city, active);',
    mysqlNote: 'MySQL needs an index name. Put columns compared with = first and range conditions last.',
    example: {
      postgres: `${CUSTOMERS}
create index customer_city_active_idx on customer (city, active);
select id from customer where city = 'Oslo' and active order by id;`,
    },
    match: '\\bcreate\\s+(unique\\s+)?index\\b[^;]*\\(\\s*\\w+\\s*,',
    docs: [
      { label: 'PostgreSQL: multicolumn indexes', url: PG + 'indexes-multicolumn.html' },
      { label: 'MySQL: multiple-column indexes', url: MY + 'multiple-column-indexes.html' },
    ],
  },
  {
    id: 'expression-index',
    name: 'Expression index',
    group: 'performance',
    summary:
      'An index on the result of an expression, such as lower(email). The query must use exactly the same expression to benefit.',
    postgres: 'create index on customer (lower(email));',
    mysql: 'create index customer_email_lower_idx on customer ((lower(email)));',
    mysqlNote: 'MySQL 8.0.13+ supports functional indexes; note the extra pair of parentheses.',
    example: {
      postgres: `${CUSTOMERS}
create index customer_email_lower_idx on customer (lower(email));
select id from customer where lower(email) = 'ann@x.io';`,
      mysql: `${CUSTOMERS}
create index customer_email_lower_idx on customer ((lower(email)));
select id from customer where lower(email) = 'ann@x.io';`,
    },
    match: '\\bcreate\\s+(unique\\s+)?index\\b[^;]*\\(\\s*\\(?\\s*(lower|upper|date|extract|coalesce|\\()',
    docs: [
      { label: 'PostgreSQL: indexes on expressions', url: PG + 'indexes-expressional.html' },
      { label: 'MySQL: functional key parts', url: MY + 'create-index.html#create-index-functional-key-parts' },
    ],
  },
  {
    id: 'partial-index',
    name: 'Partial index (WHERE)',
    group: 'performance',
    summary: 'Indexes only the rows that match a condition, such as active customers or unprocessed jobs. Smaller and faster when queries always use that condition.',
    postgres: 'create index on job (created_at) where status = \'new\';',
    mysql: null,
    mysqlNote: 'Not in MySQL. A functional index on an expression that is NULL for the other rows comes close.',
    example: {
      postgres: `${CUSTOMERS}
create index customer_active_city_idx on customer (city) where active;
select id from customer where active and city = 'Oslo' order by id;`,
      mysql: `${CUSTOMERS}
create index customer_active_city_idx on customer ((if(active, city, null)));
select id from customer where active and city = 'Oslo' order by id;`,
    },
    match: '\\bcreate\\s+(unique\\s+)?index\\b[^;]*\\)\\s*where\\b',
    docs: [{ label: 'PostgreSQL: partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'covering-index',
    name: 'Covering index (INCLUDE)',
    group: 'performance',
    summary:
      'When an index holds every column a query needs, the database can answer from the index alone (an index-only scan). INCLUDE adds columns to the index without sorting by them.',
    postgres: 'create index on orders (customer_id) include (total);',
    mysql: 'create index orders_customer_total_idx on orders (customer_id, total);',
    mysqlNote: 'No INCLUDE in MySQL: add the extra columns at the end of the index. InnoDB secondary indexes always contain the primary key too.',
    example: {
      postgres: `${CUSTOMERS}
create index customer_city_incl_idx on customer (city) include (email);
select email from customer where city = 'Rome';`,
      mysql: `${CUSTOMERS}
create index customer_city_email_idx on customer (city, email);
select email from customer where city = 'Rome';`,
    },
    match: '\\binclude\\s*\\(',
    docs: [
      { label: 'PostgreSQL: index-only scans', url: PG + 'indexes-index-only-scans.html' },
      { label: 'MySQL: covering indexes (glossary)', url: MY + 'glossary.html#glos_covering_index' },
    ],
  },
  {
    id: 'unique-index',
    name: 'UNIQUE index',
    group: 'performance',
    summary: 'An index that also forbids duplicates. A UNIQUE constraint creates one automatically.',
    postgres: 'create unique index on customer (lower(email));',
    mysql: 'create unique index customer_email_uq on customer ((lower(email)));',
    example: {
      postgres: `${CUSTOMERS}
create unique index customer_email_uq on customer (lower(email));
insert into customer values (4, 'dan@x.io', 'Rome', true);
select count(*) as n from customer;`,
      mysql: `${CUSTOMERS}
create unique index customer_email_uq on customer ((lower(email)));
insert into customer values (4, 'dan@x.io', 'Rome', true);
select count(*) as n from customer;`,
    },
    match: '\\bcreate\\s+unique\\s+index\\b',
    docs: [
      { label: 'PostgreSQL: unique indexes', url: PG + 'indexes-unique.html' },
      { label: 'MySQL: CREATE INDEX', url: MY + 'create-index.html' },
    ],
  },
  {
    id: 'explain',
    name: 'EXPLAIN',
    group: 'performance',
    summary:
      'Shows the plan the database chose for a query: which tables it scans, which indexes it uses, how it joins, and its cost estimates. The query itself does not run.',
    postgres: 'explain select … ;\nexplain (costs off) select … ;',
    mysql: 'explain select … ;\nexplain format=tree select … ;',
    mysqlNote: 'MySQL prints a table (or a tree with FORMAT=TREE) with different names for the same ideas: type=ALL is a full scan, ref/range use an index.',
    example: {
      postgres: `${CUSTOMERS}
explain (costs off) select id from customer where city = 'Oslo';`,
      mysql: null,
    },
    match: '\\bexplain\\b(?!\\s*\\(\\s*analy[sz]e|\\s+analy[sz]e)',
    docs: [
      { label: 'PostgreSQL: using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'MySQL: EXPLAIN', url: MY + 'explain.html' },
    ],
  },
  {
    id: 'explain-analyze',
    name: 'EXPLAIN ANALYZE',
    group: 'performance',
    summary:
      'Runs the query and shows the plan with real row counts and times next to the estimates. Big differences between estimated and actual rows point to stale statistics or a bad plan.',
    postgres: 'explain (analyze, buffers) select … ;',
    mysql: 'explain analyze select … ;',
    mysqlNote: 'MySQL 8.0.18+ prints a tree with actual times. Careful with INSERT/UPDATE/DELETE: EXPLAIN ANALYZE really executes them.',
    example: {
      postgres: `${CUSTOMERS}
explain (analyze, costs off, timing off, summary off, buffers off) select id from customer where city = 'Oslo';`,
      mysql: null,
    },
    match: '\\bexplain\\s*(\\(\\s*)?analy[sz]e\\b',
    docs: [
      { label: 'PostgreSQL: EXPLAIN ANALYZE', url: PG + 'using-explain.html#USING-EXPLAIN-ANALYZE' },
      { label: 'MySQL: EXPLAIN ANALYZE', url: MY + 'explain.html#explain-analyze' },
    ],
  },
  {
    id: 'analyze',
    name: 'ANALYZE (statistics)',
    group: 'performance',
    summary:
      'Collects statistics about the values in a table, which the planner uses to estimate row counts. Run it after loading or changing a lot of data.',
    postgres: 'analyze customer;',
    mysql: 'analyze table customer;',
    example: {
      postgres: `${CUSTOMERS}
analyze customer;
select count(*) as n from customer;`,
      mysql: `${CUSTOMERS}
analyze table customer;
select count(*) as n from customer;`,
    },
    match: '(^|;)\\s*analy[sz]e\\s+(table\\s+)?\\w',
    docs: [
      { label: 'PostgreSQL: ANALYZE', url: PG + 'sql-analyze.html' },
      { label: 'MySQL: ANALYZE TABLE', url: MY + 'analyze-table.html' },
    ],
  },
]
