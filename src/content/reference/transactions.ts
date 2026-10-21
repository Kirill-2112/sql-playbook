import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const ACCOUNTS = `create table account (id int primary key, balance int);
insert into account values (1, 100), (2, 20);`
const JOBS = `create table job (id int primary key, status varchar(10));
insert into job values (1, 'new'), (2, 'new'), (3, 'done');`

export const transactionEntries: ReferenceEntry[] = [
  {
    id: 'transaction',
    name: 'BEGIN / COMMIT',
    group: 'transactions',
    summary:
      'Groups statements so they succeed or fail together: a transfer must debit one account and credit the other, never just one. Other sessions see the changes only after COMMIT.',
    postgres: 'begin;\nupdate account set balance = balance - 50 where id = 1;\nupdate account set balance = balance + 50 where id = 2;\ncommit;',
    mysql: 'start transaction;\nupdate account set balance = balance - 50 where id = 1;\nupdate account set balance = balance + 50 where id = 2;\ncommit;',
    mysqlNote: 'MySQL also accepts BEGIN, but START TRANSACTION is clearer inside stored programs, where BEGIN starts a block.',
    example: {
      postgres: `${ACCOUNTS}
begin;
update account set balance = balance - 50 where id = 1;
update account set balance = balance + 50 where id = 2;
commit;
select id, balance from account order by id;`,
      mysql: `${ACCOUNTS}
start transaction;
update account set balance = balance - 50 where id = 1;
update account set balance = balance + 50 where id = 2;
commit;
select id, balance from account order by id;`,
    },
    match: '(^|;)\\s*(begin|start\\s+transaction)\\s*(;|isolation)|\\bcommit\\s*;',
    docs: [
      { label: 'PostgreSQL: transactions tutorial', url: PG + 'tutorial-transactions.html' },
      { label: 'MySQL: START TRANSACTION', url: MY + 'commit.html' },
    ],
  },
  {
    id: 'rollback',
    name: 'ROLLBACK',
    group: 'transactions',
    summary: 'Undoes everything since BEGIN. In PostgreSQL even CREATE TABLE is undone; in MySQL DDL statements commit on their own and cannot be rolled back.',
    postgres: 'begin;\ndelete from account;\nrollback;',
    mysql: 'start transaction;\ndelete from account;\nrollback;',
    example: {
      postgres: `${ACCOUNTS}
begin;
delete from account;
rollback;
select count(*) as still_there from account;`,
      mysql: `${ACCOUNTS}
start transaction;
delete from account;
rollback;
select count(*) as still_there from account;`,
    },
    match: '\\brollback\\s*;',
    docs: [
      { label: 'PostgreSQL: ROLLBACK', url: PG + 'sql-rollback.html' },
      { label: 'MySQL: implicit commits', url: MY + 'implicit-commit.html' },
    ],
  },
  {
    id: 'savepoint',
    name: 'SAVEPOINT',
    group: 'transactions',
    summary: 'A marker inside a transaction you can roll back to, undoing only the work after it, while the rest of the transaction carries on.',
    postgres: 'savepoint before_bonus;\n…\nrollback to savepoint before_bonus;',
    mysql: 'savepoint before_bonus;\n…\nrollback to savepoint before_bonus;',
    example: {
      postgres: `${ACCOUNTS}
begin;
update account set balance = balance + 5 where id = 1;
savepoint before_bonus;
update account set balance = balance + 1000 where id = 2;
rollback to savepoint before_bonus;
commit;
select id, balance from account order by id;`,
      mysql: `${ACCOUNTS}
start transaction;
update account set balance = balance + 5 where id = 1;
savepoint before_bonus;
update account set balance = balance + 1000 where id = 2;
rollback to savepoint before_bonus;
commit;
select id, balance from account order by id;`,
    },
    match: '\\bsavepoint\\b',
    docs: [
      { label: 'PostgreSQL: SAVEPOINT', url: PG + 'sql-savepoint.html' },
      { label: 'MySQL: SAVEPOINT', url: MY + 'savepoint.html' },
    ],
  },
  {
    id: 'isolation-level',
    name: 'Isolation levels',
    group: 'transactions',
    summary:
      'How much a transaction sees of others\' work. READ COMMITTED sees every committed change, even mid-transaction; REPEATABLE READ keeps one snapshot; SERIALIZABLE behaves as if transactions ran one at a time.',
    postgres: 'begin isolation level repeatable read;\nset transaction isolation level serializable;',
    mysql: 'set transaction isolation level read committed;\nstart transaction;',
    mysqlNote: 'Defaults differ: PostgreSQL uses READ COMMITTED, MySQL (InnoDB) REPEATABLE READ.',
    example: {
      postgres: `begin isolation level read committed;
select current_setting('transaction_isolation') as level;
commit;`,
      mysql: `set session transaction isolation level read committed;
select replace(lower(@@transaction_isolation), '-', ' ') as level;`,
    },
    match: '\\bisolation\\s+level\\b',
    docs: [
      { label: 'PostgreSQL: transaction isolation', url: PG + 'transaction-iso.html' },
      { label: 'MySQL: isolation levels', url: MY + 'innodb-transaction-isolation-levels.html' },
    ],
  },
  {
    id: 'for-update',
    name: 'SELECT … FOR UPDATE / FOR SHARE',
    group: 'transactions',
    summary:
      'Locks the selected rows until the transaction ends, so nobody else can change them between your read and your write. FOR SHARE allows others to read-lock them too.',
    postgres: 'select balance from account where id = 1 for update;',
    mysql: 'select balance from account where id = 1 for update;',
    example: {
      postgres: `${ACCOUNTS}
begin;
select balance from account where id = 1 for update;
update account set balance = balance - 30 where id = 1;
commit;
select balance from account where id = 1;`,
      mysql: `${ACCOUNTS}
start transaction;
select balance from account where id = 1 for update;
update account set balance = balance - 30 where id = 1;
commit;
select balance from account where id = 1;`,
    },
    match: '\\bfor\\s+(update|share|no\\s+key\\s+update)\\b',
    docs: [
      { label: 'PostgreSQL: locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' },
      { label: 'MySQL: locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'skip-locked',
    name: 'SKIP LOCKED / NOWAIT',
    group: 'transactions',
    summary:
      'SKIP LOCKED passes over rows another transaction has locked instead of waiting, so several workers can take different jobs from one queue table. NOWAIT fails at once instead of waiting.',
    postgres: "select id from job where status = 'new'\norder by id limit 1\nfor update skip locked;",
    mysql: "select id from job where status = 'new'\norder by id limit 1\nfor update skip locked;",
    mysqlNote: 'Supported since MySQL 8.0.1.',
    example: {
      postgres: `${JOBS}
begin;
select id from job where status = 'new' order by id limit 1 for update skip locked;
commit;`,
      mysql: `${JOBS}
start transaction;
select id from job where status = 'new' order by id limit 1 for update skip locked;
commit;`,
    },
    match: '\\bskip\\s+locked\\b|\\bnowait\\b',
    docs: [
      { label: 'PostgreSQL: locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' },
      { label: 'MySQL: NOWAIT and SKIP LOCKED', url: MY + 'innodb-locking-reads.html#innodb-locking-reads-nowait-skip-locked' },
    ],
  },
  {
    id: 'advisory-lock',
    name: 'Advisory locks',
    group: 'transactions',
    summary: 'Locks on a number or name that you choose, not on rows. Used to make sure only one copy of a job runs at a time.',
    postgres: 'select pg_try_advisory_lock(42);\nselect pg_advisory_unlock(42);',
    mysql: "select get_lock('job-42', 0);\nselect release_lock('job-42');",
    example: {
      postgres: 'select pg_try_advisory_lock(42) as got_it, pg_advisory_unlock(42) as released;',
      mysql: "select get_lock('42', 0) as got_it, release_lock('42') as released;",
    },
    match: '\\bpg_(try_)?advisory\\w*\\s*\\(|\\bget_lock\\s*\\(',
    docs: [
      { label: 'PostgreSQL: advisory lock functions', url: PG + 'functions-admin.html#FUNCTIONS-ADVISORY-LOCKS' },
      { label: 'MySQL: locking functions', url: MY + 'locking-functions.html' },
    ],
  },
  {
    id: 'lock-table',
    name: 'LOCK TABLE',
    group: 'transactions',
    summary: 'Locks a whole table, for rare maintenance jobs that must stop all other writers. Row locks (FOR UPDATE) are almost always the better tool.',
    postgres: 'begin;\nlock table account in exclusive mode;\n…\ncommit;',
    mysql: 'lock tables account write;\n…\nunlock tables;',
    mysqlNote: 'LOCK TABLES commits any open transaction and works per session, not per transaction.',
    example: {
      postgres: `${ACCOUNTS}
begin;
lock table account in exclusive mode;
update account set balance = 0 where id = 2;
commit;
select id, balance from account order by id;`,
      mysql: `${ACCOUNTS}
lock tables account write;
update account set balance = 0 where id = 2;
unlock tables;
select id, balance from account order by id;`,
    },
    match: '\\block\\s+tables?\\b',
    docs: [
      { label: 'PostgreSQL: LOCK', url: PG + 'sql-lock.html' },
      { label: 'MySQL: LOCK TABLES', url: MY + 'lock-tables.html' },
    ],
  },
]
