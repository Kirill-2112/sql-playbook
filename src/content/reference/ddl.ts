import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

export const ddlEntries: ReferenceEntry[] = [
  {
    id: 'create-table',
    name: 'CREATE TABLE',
    group: 'ddl',
    summary: 'Defines a table: its columns, their types and the rules (constraints) the data must follow.',
    postgres: 'create table customer (\n  id int primary key,\n  email varchar(100) not null unique,\n  created_at timestamp default now()\n);',
    mysql: 'create table customer (\n  id int primary key,\n  email varchar(100) not null unique,\n  created_at timestamp default now()\n);',
    mysqlNote: 'In MySQL CREATE TABLE commits the current transaction; in PostgreSQL it can be rolled back.',
    example: {
      postgres: `create table customer (id int primary key, email varchar(100) not null unique);
insert into customer values (1, 'ann@x.io');
select id, email from customer;`,
    },
    match: '\\bcreate\\s+table\\b',
    docs: [
      { label: 'PostgreSQL: CREATE TABLE', url: PG + 'sql-createtable.html' },
      { label: 'MySQL: CREATE TABLE', url: MY + 'create-table.html' },
    ],
  },
  {
    id: 'primary-key',
    name: 'PRIMARY KEY and UNIQUE',
    group: 'ddl',
    summary:
      'A primary key identifies each row: unique and never NULL, one per table. UNIQUE forbids duplicates in other columns but allows several NULLs.',
    postgres: 'primary key (order_id, line_no)\nunique (email)',
    mysql: 'primary key (order_id, line_no)\nunique (email)',
    example: {
      postgres: `create table account (id int primary key, email varchar(50) unique);
insert into account values (1, null), (2, null), (3, 'a@x.io');
select count(*) as accounts, count(email) as with_email from account;`,
    },
    match: '\\bprimary\\s+key\\b|\\bunique\\b',
    docs: [
      { label: 'PostgreSQL: constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS' },
      { label: 'MySQL: CREATE TABLE', url: MY + 'create-table.html' },
    ],
  },
  {
    id: 'foreign-key',
    name: 'FOREIGN KEY … ON DELETE',
    group: 'ddl',
    summary:
      'Makes sure a value exists in the referenced table. ON DELETE CASCADE removes child rows with their parent; SET NULL clears the link; the default refuses the delete.',
    postgres: 'customer_id int references customer (id) on delete cascade',
    mysql: 'customer_id int,\nforeign key (customer_id) references customer (id) on delete cascade',
    mysqlNote: 'MySQL ignores the short inline REFERENCES on a column; declare the FOREIGN KEY as a separate clause.',
    example: {
      postgres: `create table parent (id int primary key);
create table child (id int primary key, parent_id int, foreign key (parent_id) references parent (id) on delete cascade);
insert into parent values (1), (2);
insert into child values (10, 1), (11, 1), (12, 2);
delete from parent where id = 1;
select id from child;`,
    },
    match: '\\breferences\\s+\\w+|\\bforeign\\s+key\\b',
    docs: [
      { label: 'PostgreSQL: foreign keys', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' },
      { label: 'MySQL: FOREIGN KEY constraints', url: MY + 'create-table-foreign-keys.html' },
    ],
  },
  {
    id: 'check',
    name: 'CHECK and NOT NULL',
    group: 'ddl',
    summary: 'CHECK rejects rows for which a condition is false (NULL passes). NOT NULL rejects missing values. They keep bad data out at the source.',
    postgres: 'price numeric not null check (price >= 0)',
    mysql: 'price decimal(10, 2) not null check (price >= 0)',
    mysqlNote: 'MySQL enforces CHECK since 8.0.16; older versions parsed and ignored it.',
    example: {
      postgres: `create table product (id int primary key, price int not null check (price >= 0));
insert into product values (1, 0), (2, 15);
select count(*) as valid_rows from product;`,
    },
    match: '\\bcheck\\s*\\(',
    docs: [
      { label: 'PostgreSQL: check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' },
      { label: 'MySQL: CHECK constraints', url: MY + 'create-table-check-constraints.html' },
    ],
  },
  {
    id: 'default',
    name: 'DEFAULT',
    group: 'ddl',
    summary: 'The value a column gets when an INSERT leaves it out. It can be a constant or an expression such as now().',
    postgres: "status varchar(10) default 'new'\ncreated_at timestamp default now()",
    mysql: "status varchar(10) default 'new'\ncreated_at timestamp default (now())",
    mysqlNote: 'MySQL needs parentheses around expression defaults (8.0.13+), except CURRENT_TIMESTAMP.',
    example: {
      postgres: `create table ticket (id int, status varchar(10) default 'new');
insert into ticket (id) values (1);
insert into ticket values (2, 'closed');
select id, status from ticket order by id;`,
    },
    match: '\\bdefault\\s+[^,\\s]',
    docs: [
      { label: 'PostgreSQL: default values', url: PG + 'ddl-default.html' },
      { label: 'MySQL: data type defaults', url: MY + 'data-type-defaults.html' },
    ],
  },
  {
    id: 'identity',
    name: 'IDENTITY / AUTO_INCREMENT',
    group: 'ddl',
    summary:
      'A column that numbers new rows automatically. GENERATED ALWAYS AS IDENTITY is the modern PostgreSQL form (serial is the older one).',
    postgres: 'id int generated always as identity primary key',
    mysql: 'id int auto_increment primary key',
    example: {
      postgres: `create table task (id int generated always as identity primary key, title varchar(20));
insert into task (title) values ('first'), ('second');
select id, title from task order by id;`,
      mysql: `create table task (id int auto_increment primary key, title varchar(20));
insert into task (title) values ('first'), ('second');
select id, title from task order by id;`,
    },
    match: '\\bgenerated\\s+(always|by\\s+default)\\s+as\\s+identity\\b|\\bauto_increment\\b|\\bserial\\b',
    docs: [
      { label: 'PostgreSQL: identity columns', url: PG + 'ddl-identity-columns.html' },
      { label: 'MySQL: AUTO_INCREMENT', url: MY + 'example-auto-increment.html' },
    ],
  },
  {
    id: 'generated-column',
    name: 'Generated columns',
    group: 'ddl',
    summary:
      'A column computed from other columns of the same row, always up to date. STORED keeps the value on disk; it can only use immutable expressions.',
    postgres: 'total numeric generated always as (qty * price) stored',
    mysql: 'total decimal(10, 2) generated always as (qty * price) stored',
    mysqlNote: 'MySQL also has VIRTUAL generated columns, computed when read.',
    example: {
      postgres: `create table line (qty int, price int, total int generated always as (qty * price) stored);
insert into line (qty, price) values (3, 4);
select qty, price, total from line;`,
    },
    match: '\\bgenerated\\s+always\\s+as\\s*\\(',
    docs: [
      { label: 'PostgreSQL: generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'alter-table',
    name: 'ALTER TABLE',
    group: 'ddl',
    summary: 'Changes an existing table: add, drop or rename columns, change types, add constraints.',
    postgres: 'alter table item add column stock int default 0;\nalter table item rename column name to title;\nalter table item alter column price type numeric(10, 2);',
    mysql: 'alter table item add column stock int default 0;\nalter table item rename column name to title;\nalter table item modify column price decimal(10, 2);',
    example: {
      postgres: `create table item (id int, name varchar(20));
insert into item values (1, 'tea');
alter table item add column stock int default 5;
alter table item rename column name to title;
select id, title, stock from item;`,
    },
    match: '\\balter\\s+table\\b',
    docs: [
      { label: 'PostgreSQL: ALTER TABLE', url: PG + 'sql-altertable.html' },
      { label: 'MySQL: ALTER TABLE', url: MY + 'alter-table.html' },
    ],
  },
  {
    id: 'create-table-as',
    name: 'CREATE TABLE … AS SELECT',
    group: 'ddl',
    summary: 'Creates a table from a query result in one step. Constraints and indexes are not copied.',
    postgres: 'create table top_items as\nselect * from item where price > 5;',
    mysql: 'create table top_items as\nselect * from item where price > 5;',
    example: {
      postgres: `create table item (id int, price int);
insert into item values (1, 3), (2, 9);
create table pricey as select id from item where price > 5;
select id from pricey;`,
    },
    match: '\\bcreate\\s+(temp\\w*\\s+)?table\\s+\\w+\\s+as\\b',
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: CREATE TABLE … SELECT', url: MY + 'create-table-select.html' },
    ],
  },
  {
    id: 'temporary-table',
    name: 'Temporary tables',
    group: 'ddl',
    summary: 'A table visible only to your session and dropped when it ends. Good for staging intermediate results in a multi-step job.',
    postgres: 'create temporary table tmp_ids as select id from …;',
    mysql: 'create temporary table tmp_ids as select id from …;',
    mysqlNote: 'A MySQL temporary table cannot be referenced twice in the same query (no self-join on it).',
    example: {
      postgres: `create temporary table tmp_ids (id int);
insert into tmp_ids values (1), (2);
select count(*) as n from tmp_ids;`,
    },
    match: '\\bcreate\\s+temp(orary)?\\s+table\\b',
    docs: [
      { label: 'PostgreSQL: CREATE TABLE (TEMPORARY)', url: PG + 'sql-createtable.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'create-view',
    name: 'CREATE VIEW',
    group: 'ddl',
    summary: 'A saved query that behaves like a table. It stores no data: every read runs the query, so it is always current.',
    postgres: 'create view active_customer as\nselect * from customer where active;',
    mysql: 'create view active_customer as\nselect * from customer where active;',
    example: {
      postgres: `create table item (id int, price int);
insert into item values (1, 3), (2, 9);
create view pricey as select id from item where price > 5;
insert into item values (3, 12);
select id from pricey order by id;`,
    },
    match: '\\bcreate\\s+(or\\s+replace\\s+)?view\\b',
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: CREATE VIEW', url: MY + 'create-view.html' },
    ],
  },
  {
    id: 'materialized-view',
    name: 'MATERIALIZED VIEW',
    group: 'ddl',
    summary:
      'A view whose result is stored like a table, so reading it is fast. It does not update itself: run REFRESH MATERIALIZED VIEW when the data changes.',
    postgres: 'create materialized view sales_by_month as select …;\nrefresh materialized view sales_by_month;',
    mysql: null,
    mysqlNote: 'Not in MySQL: keep a summary table and rebuild it with a scheduled event or triggers.',
    example: {
      postgres: `create table item (id int, price int);
insert into item values (1, 3), (2, 9);
create materialized view pricey as select id from item where price > 5;
insert into item values (3, 12);
select (select count(*) from pricey) as before_refresh;`,
      mysql: `create table item (id int, price int);
insert into item values (1, 3), (2, 9);
create table pricey as select id from item where price > 5;
insert into item values (3, 12);
select (select count(*) from pricey) as before_refresh;`,
    },
    match: '\\bmaterialized\\s+view\\b',
    docs: [
      { label: 'PostgreSQL: materialized views', url: PG + 'rules-materializedviews.html' },
      { label: 'PostgreSQL: REFRESH MATERIALIZED VIEW', url: PG + 'sql-refreshmaterializedview.html' },
    ],
  },
  {
    id: 'schema',
    name: 'CREATE SCHEMA',
    group: 'ddl',
    summary: 'A schema is a namespace for tables inside one database: sales.orders and hr.orders can coexist. search_path decides which schemas a bare name looks in.',
    postgres: 'create schema sales;\ncreate table sales.orders (…);',
    mysql: 'create database sales;\ncreate table sales.orders (…);',
    mysqlNote: 'In MySQL a schema is a database (CREATE SCHEMA is a synonym), and you can query across databases on the same server.',
    example: {
      postgres: `create schema shop;
create table shop.item (id int);
insert into shop.item values (1);
select count(*) as n from shop.item;`,
      mysql: `create schema pb_reference_shop;
create table pb_reference_shop.item (id int);
insert into pb_reference_shop.item values (1);
select count(*) as n from pb_reference_shop.item;
drop schema pb_reference_shop;`,
    },
    match: '\\bcreate\\s+schema\\b|\\bsearch_path\\b',
    docs: [
      { label: 'PostgreSQL: schemas', url: PG + 'ddl-schemas.html' },
      { label: 'MySQL: CREATE DATABASE', url: MY + 'create-database.html' },
    ],
  },
  {
    id: 'sequence',
    name: 'Sequences (NEXTVAL)',
    group: 'ddl',
    summary: 'A counter object that hands out increasing numbers, independent of any table. Identity columns use one under the hood.',
    postgres: "create sequence invoice_no start 1000;\nselect nextval('invoice_no');",
    mysql: null,
    mysqlNote: 'MySQL has no sequences: use AUTO_INCREMENT, or a one-row counter table updated in a transaction.',
    example: {
      postgres: `create sequence invoice_no start 1000;
select nextval('invoice_no') as first, nextval('invoice_no') as second;`,
      mysql: null,
    },
    match: '\\b(create\\s+sequence|nextval|currval|setval)\\b',
    docs: [
      { label: 'PostgreSQL: CREATE SEQUENCE', url: PG + 'sql-createsequence.html' },
      { label: 'PostgreSQL: sequence functions', url: PG + 'functions-sequence.html' },
    ],
  },
  {
    id: 'partitioning',
    name: 'PARTITION BY RANGE / LIST',
    group: 'ddl',
    summary:
      'Splits one big table into partitions by a key, such as one per year. Queries that filter on the key read only the partitions they need, and old partitions can be dropped instantly.',
    postgres:
      "create table event (id int, at date) partition by range (at);\ncreate table event_2025 partition of event\n  for values from ('2025-01-01') to ('2026-01-01');",
    mysql:
      "create table event (id int, at date)\npartition by range (year(at)) (\n  partition p2025 values less than (2026),\n  partition pmax values less than maxvalue\n);",
    mysqlNote: 'MySQL defines all partitions inside CREATE TABLE, and partitioned tables cannot have foreign keys.',
    example: {
      postgres: `create table event (id int, at date) partition by range (at);
create table event_2024 partition of event for values from ('2024-01-01') to ('2025-01-01');
create table event_2025 partition of event for values from ('2025-01-01') to ('2026-01-01');
insert into event values (1, '2024-05-01'), (2, '2025-02-01'), (3, '2025-03-01');
select (select count(*) from event_2025) as in_2025, (select count(*) from event) as total;`,
      mysql: `create table event (id int, at date)
partition by range (year(at)) (partition p2024 values less than (2025), partition p2025 values less than (2026));
insert into event values (1, '2024-05-01'), (2, '2025-02-01'), (3, '2025-03-01');
select (select count(*) from event partition (p2025)) as in_2025, (select count(*) from event) as total;`,
    },
    match: '\\bpartition\\s+by\\s+(range|list|hash)\\b|\\bpartition\\s+of\\b',
    docs: [
      { label: 'PostgreSQL: table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE partitioning', url: MY + 'partitioning-range.html' },
    ],
  },
  {
    id: 'drop',
    name: 'DROP … IF EXISTS / CASCADE',
    group: 'ddl',
    summary: 'Deletes a table, view or other object with its data. IF EXISTS avoids an error when it is missing; CASCADE also drops objects that depend on it.',
    postgres: 'drop table if exists staging cascade;',
    mysql: 'drop table if exists staging;',
    mysqlNote: 'MySQL accepts CASCADE but ignores it.',
    example: {
      postgres: `create table staging (id int);
drop table if exists staging;
drop table if exists staging;
select 'dropped twice without an error' as result;`,
    },
    match: '\\bdrop\\s+(table|view|index|function|procedure|trigger|schema|materialized\\s+view)\\b',
    docs: [
      { label: 'PostgreSQL: DROP TABLE', url: PG + 'sql-droptable.html' },
      { label: 'MySQL: DROP TABLE', url: MY + 'drop-table.html' },
    ],
  },
]
