import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early. GUI tools and drivers do not need this.'

// Level 4–5: exercises that change the database. Each is judged by checkSql, run after the learner's statements.
export const sakilaAdvanced: Exercise[] = [
  {
    id: 'sakila-031',
    dataset: 'sakila',
    level: 4,
    topics: ['views'],
    title: 'A view of customer spending',
    prompt:
      'Create a view named customer_spending with columns customer_id, first_name, last_name and total (the sum of the customer\'s payments).',
    orderMatters: true,
    checkSql: `select * from customer_spending where customer_id <= 5 order by customer_id`,
    solutions: [
      {
        approach: 'CREATE VIEW',
        postgres: `create view customer_spending as
select c.customer_id, c.first_name, c.last_name, sum(p.amount) as total
from customer c
join payment p on p.customer_id = c.customer_id
group by c.customer_id;`,
        mysql: `create view customer_spending as
select c.customer_id, c.first_name, c.last_name, sum(p.amount) as total
from customer c
join payment p on p.customer_id = c.customer_id
group by c.customer_id;`,
        explanation:
          'A view is a saved query. It stores no data: every time you select from it, the query runs again, so it is always up to date.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: CREATE VIEW', url: MY + 'create-view.html' },
    ],
  },
  {
    id: 'sakila-032',
    dataset: 'sakila',
    level: 4,
    topics: ['temp-tables'],
    title: 'Rental counts in a temporary table',
    prompt:
      'Create a temporary table film_rentals(film_id, rentals) with the number of rentals of every film. Films never rented must be there with 0.',
    orderMatters: false,
    checkSql: `select count(*) as films, sum(rentals) as rentals, max(rentals) as most from film_rentals`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table film_rentals as
select f.film_id, count(r.rental_id) as rentals
from film f
left join inventory i on i.film_id = f.film_id
left join rental r    on r.inventory_id = i.inventory_id
group by f.film_id;`,
        mysql: `create temporary table film_rentals as
select f.film_id, count(r.rental_id) as rentals
from film f
left join inventory i on i.film_id = f.film_id
left join rental r    on r.inventory_id = i.inventory_id
group by f.film_id;`,
        mysqlNote:
          'MySQL spells it CREATE TEMPORARY TABLE. A MySQL temporary table also cannot be referred to twice in the same query (for example in a self join): you get "Can\'t reopen table".',
        explanation:
          'A temporary table lives only in your session and disappears when it ends. Handy for storing an intermediate result you will query several times.',
      },
      {
        approach: 'CREATE, then INSERT … SELECT',
        postgres: `create temp table film_rentals (
  film_id integer primary key,
  rentals integer not null
);
insert into film_rentals
select f.film_id, count(r.rental_id)
from film f
left join inventory i on i.film_id = f.film_id
left join rental r    on r.inventory_id = i.inventory_id
group by f.film_id;`,
        mysql: `create temporary table film_rentals (
  film_id integer primary key,
  rentals integer not null
);
insert into film_rentals
select f.film_id, count(r.rental_id)
from film f
left join inventory i on i.film_id = f.film_id
left join rental r    on r.inventory_id = i.inventory_id
group by f.film_id;`,
        explanation: 'Define the table first, with exact types and a primary key, then fill it.',
      },
    ],
    comparison:
      'Same contents. CREATE … AS is quickest to write; column types are inferred. Declaring the table first gives you control over types, keys and NOT NULL, which matters if the table is used further.',
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: Temporary tables', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'sakila-033',
    dataset: 'sakila',
    level: 4,
    topics: ['dml'],
    title: 'Add an actor and get her id',
    prompt: 'Add the actor GRACE HOPPER (first and last name in capitals, like the others) and return the id the database assigned.',
    orderMatters: false,
    checkSql: `select actor_id, first_name, last_name from actor where first_name = 'GRACE' and last_name = 'HOPPER'`,
    solutions: [
      {
        approach: 'INSERT … RETURNING',
        postgres: `insert into actor (first_name, last_name)
values ('GRACE', 'HOPPER')
returning actor_id;`,
        mysql: `insert into actor (first_name, last_name)
values ('GRACE', 'HOPPER');
select last_insert_id();`,
        mysqlNote: 'MySQL has no RETURNING. LAST_INSERT_ID() returns the AUTO_INCREMENT value generated by your last insert in this session.',
        explanation:
          'actor_id is filled by the database (an identity column) and last_update by its default. RETURNING hands back the new row in the same statement.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Returning data from modified rows', url: PG + 'dml-returning.html' },
      { label: 'MySQL: LAST_INSERT_ID()', url: MY + 'information-functions.html#function_last-insert-id' },
    ],
  },
  {
    id: 'sakila-034',
    dataset: 'sakila',
    level: 4,
    topics: ['dml', 'joins'],
    title: 'Raise prices of horror films',
    prompt: 'Increase the rental rate of every film in the Horror category by 1.00.',
    orderMatters: false,
    checkSql: `select count(*) as horror_films, sum(f.rental_rate) as total_rate
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
where c.name = 'Horror'`,
    solutions: [
      {
        approach: 'WHERE … IN (subquery)',
        postgres: `update film
set rental_rate = rental_rate + 1
where film_id in (
  select fc.film_id
  from film_category fc
  join category c on c.category_id = fc.category_id
  where c.name = 'Horror'
);`,
        mysql: `update film
set rental_rate = rental_rate + 1
where film_id in (
  select fc.film_id
  from film_category fc
  join category c on c.category_id = fc.category_id
  where c.name = 'Horror'
);`,
        explanation: 'Find the ids to change with a subquery. Same syntax in both databases.',
      },
      {
        approach: 'UPDATE with a join',
        postgres: `update film f
set rental_rate = f.rental_rate + 1
from film_category fc
join category c on c.category_id = fc.category_id
where fc.film_id = f.film_id
  and c.name = 'Horror';`,
        mysql: `update film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
set f.rental_rate = f.rental_rate + 1
where c.name = 'Horror';`,
        mysqlNote: 'MySQL writes the join between UPDATE and SET; PostgreSQL uses a FROM clause after SET.',
        explanation: 'Join the table you update with the tables that decide which rows change.',
      },
    ],
    comparison:
      'Same result. The subquery version is identical in both databases. Join syntax is where they differ most: UPDATE … FROM in PostgreSQL, UPDATE … JOIN … SET in MySQL. With a join, watch out for rows that match several times; each row is still updated only once.',
    docs: [
      { label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' },
      { label: 'MySQL: UPDATE (multiple-table)', url: MY + 'update.html' },
    ],
  },
  {
    id: 'sakila-035',
    dataset: 'sakila',
    level: 4,
    topics: ['dml'],
    title: 'Remove zero payments',
    prompt: 'Delete every payment with an amount of 0.00.',
    orderMatters: false,
    checkSql: `select count(*) as payments, sum(amount) as total, min(amount) as smallest from payment`,
    solutions: [
      {
        approach: 'DELETE … WHERE',
        postgres: `delete from payment
where amount = 0;`,
        mysql: `delete from payment
where amount = 0;`,
        explanation:
          'Without WHERE, DELETE removes every row. A good habit: run the same WHERE as a SELECT first and check what it finds.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: DELETE', url: PG + 'sql-delete.html' },
      { label: 'MySQL: DELETE', url: MY + 'delete.html' },
    ],
  },
  {
    id: 'sakila-036',
    dataset: 'sakila',
    level: 4,
    topics: ['upsert', 'merge'],
    title: 'Insert or update in one statement',
    prompt:
      'In one statement, make category 1 be named "Action & Adventure" and category 17 be named "Anime": update a category if its id exists, insert it otherwise.',
    orderMatters: true,
    checkSql: `select category_id, name from category where category_id in (1, 17) order by category_id`,
    solutions: [
      {
        approach: 'Upsert',
        postgres: `insert into category (category_id, name)
values (1, 'Action & Adventure'), (17, 'Anime')
on conflict (category_id) do update
set name = excluded.name;`,
        mysql: `insert into category (category_id, name)
values (1, 'Action & Adventure'), (17, 'Anime') as new
on duplicate key update name = new.name;`,
        mysqlNote:
          'MySQL: ON DUPLICATE KEY UPDATE, with an alias for the new row (MySQL 8.0.19+). The older VALUES(name) form still works but is deprecated.',
        explanation: 'Try to insert; if the key already exists, update the existing row instead. excluded is the row you tried to insert.',
      },
      {
        approach: 'MERGE',
        postgres: `merge into category c
using (values (1, 'Action & Adventure'), (17, 'Anime')) as v(category_id, name)
on c.category_id = v.category_id
when matched then update set name = v.name
when not matched then insert (category_id, name) values (v.category_id, v.name);`,
        mysql: null,
        mysqlNote: 'MySQL has no MERGE. Use ON DUPLICATE KEY UPDATE (solution A).',
        explanation: 'MERGE is the SQL-standard statement for "match, then update or insert", available in PostgreSQL 15+.',
      },
    ],
    comparison:
      'Same result. ON CONFLICT is safe under concurrent inserts and needs a unique key to detect the conflict. MERGE is more general (any join condition, can also delete) but does not handle concurrent inserts as gracefully.',
    docs: [
      { label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'sakila-037',
    dataset: 'sakila',
    level: 4,
    topics: ['transactions'],
    title: 'Undo part of a transaction',
    prompt:
      'Raise every film\'s rental rate by 10%. Then set a savepoint, set all rental rates to 0 by mistake, and roll back to the savepoint so only the 10% raise remains. You are already inside a transaction.',
    hint: 'SAVEPOINT name; … ROLLBACK TO SAVEPOINT name;',
    orderMatters: false,
    checkSql: `select count(*) as films, sum(rental_rate) as total_rate, min(rental_rate) as lowest from film`,
    solutions: [
      {
        approach: 'SAVEPOINT',
        postgres: `update film set rental_rate = rental_rate * 1.10;
savepoint before_mistake;
update film set rental_rate = 0;
rollback to savepoint before_mistake;`,
        mysql: `start transaction;
update film set rental_rate = rental_rate * 1.10;
savepoint before_mistake;
update film set rental_rate = 0;
rollback to savepoint before_mistake;
commit;`,
        mysqlNote:
          'A MySQL session runs in autocommit mode, so savepoints only work after START TRANSACTION. Also remember: in MySQL, CREATE/ALTER/DROP commit the transaction immediately and cannot be rolled back.',
        explanation:
          'A savepoint marks a point inside a transaction. ROLLBACK TO SAVEPOINT undoes only what happened after it; the transaction itself stays open.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SAVEPOINT', url: PG + 'sql-savepoint.html' },
      { label: 'MySQL: SAVEPOINT', url: MY + 'savepoint.html' },
    ],
  },
  {
    id: 'sakila-038',
    dataset: 'sakila',
    level: 5,
    topics: ['functions'],
    title: 'A function: rentals of a customer',
    prompt: 'Write a function rentals_of(p_customer_id) that returns how many rentals the customer has made.',
    orderMatters: false,
    checkSql: `select rentals_of(1) as c1, rentals_of(2) as c2, rentals_of(600) as nobody`,
    solutions: [
      {
        approach: 'SQL function',
        postgres: `create function rentals_of(p_customer_id integer)
returns bigint
language sql
stable
as $$
  select count(*) from rental where customer_id = p_customer_id;
$$;`,
        mysql: `create function rentals_of(p_customer_id integer)
returns integer
reads sql data
begin
  return (select count(*) from rental where customer_id = p_customer_id);
end;`,
        mysqlNote:
          'MySQL functions have a BEGIN … END body and must declare READS SQL DATA (or DETERMINISTIC) when binary logging is on, as it is by default. ' +
          DELIMITER_NOTE,
        explanation:
          'A LANGUAGE SQL function is just a query with parameters. STABLE tells PostgreSQL it does not change data, so it can be optimised like part of the calling query.',
      },
      {
        approach: 'PL/pgSQL function',
        postgres: `create function rentals_of(p_customer_id integer)
returns bigint
language plpgsql
stable
as $$
declare
  n bigint;
begin
  select count(*) into n from rental where customer_id = p_customer_id;
  return n;
end;
$$;`,
        mysql: `create function rentals_of(p_customer_id integer)
returns integer
reads sql data
begin
  declare n integer;
  select count(*) into n from rental where customer_id = p_customer_id;
  return n;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation: 'PL/pgSQL adds variables, IF, loops and error handling. Overkill here, but the structure is the one you need for real logic.',
      },
    ],
    comparison:
      'Same answers. For a single query, LANGUAGE SQL is simpler and PostgreSQL can inline it into the calling query. Use PL/pgSQL once you need variables or control flow. MySQL has only one style, close to B.',
    docs: [
      { label: 'PostgreSQL: CREATE FUNCTION', url: PG + 'sql-createfunction.html' },
      { label: 'PostgreSQL: PL/pgSQL', url: PG + 'plpgsql.html' },
      { label: 'MySQL: CREATE FUNCTION (stored)', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'sakila-039',
    dataset: 'sakila',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'IF inside a function',
    prompt:
      'Write film_length_label(p_film_id) returning "short" (under 60 minutes), "medium" (60–120), "long" (over 120), or "unknown" when there is no such film.',
    orderMatters: false,
    checkSql: `select film_length_label(1) as f1, film_length_label(2) as f2, film_length_label(5) as f5, film_length_label(99999) as missing`,
    solutions: [
      {
        approach: 'PL/pgSQL IF',
        postgres: `create function film_length_label(p_film_id integer)
returns text
language plpgsql
stable
as $$
declare
  len integer;
begin
  select length into len from film where film_id = p_film_id;
  if not found then
    return 'unknown';
  elsif len < 60 then
    return 'short';
  elsif len <= 120 then
    return 'medium';
  else
    return 'long';
  end if;
end;
$$;`,
        mysql: `create function film_length_label(p_film_id integer)
returns varchar(10)
reads sql data
begin
  declare len integer default null;
  select length into len from film where film_id = p_film_id;
  if len is null then
    return 'unknown';
  elseif len < 60 then
    return 'short';
  elseif len <= 120 then
    return 'medium';
  else
    return 'long';
  end if;
end;`,
        mysqlNote:
          'MySQL writes ELSEIF (PostgreSQL ELSIF) and has no FOUND variable: when SELECT … INTO finds no row the variable keeps its old value, so start it as NULL and test that. ' +
          DELIMITER_NOTE,
        explanation:
          'After SELECT … INTO, PL/pgSQL sets FOUND to tell whether a row came back. IF / ELSIF / ELSE then picks the label.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Control structures', url: PG + 'plpgsql-control-structures.html' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'sakila-040',
    dataset: 'sakila',
    level: 5,
    topics: ['triggers'],
    title: 'An audit trail with a trigger',
    prompt:
      'Create a table film_rate_log(film_id, old_rate, new_rate) and a trigger that adds a row to it whenever a film\'s rental_rate changes. Updates that do not change the rate must not be logged.',
    orderMatters: true,
    checkSql: `update film set rental_rate = 5.99 where film_id in (1, 2);
update film set title = title where film_id = 3;
select film_id, old_rate, new_rate from film_rate_log order by film_id`,
    solutions: [
      {
        approach: 'Trigger function with IF',
        postgres: `create table film_rate_log (
  film_id  integer not null,
  old_rate numeric(4, 2),
  new_rate numeric(4, 2)
);

create function log_rate_change() returns trigger
language plpgsql as $$
begin
  if new.rental_rate is distinct from old.rental_rate then
    insert into film_rate_log values (new.film_id, old.rental_rate, new.rental_rate);
  end if;
  return new;
end;
$$;

create trigger film_rate_change
after update on film
for each row execute function log_rate_change();`,
        mysql: `create table film_rate_log (
  film_id  integer not null,
  old_rate decimal(4, 2),
  new_rate decimal(4, 2)
);

create trigger film_rate_change
after update on film
for each row
begin
  if not (new.rental_rate <=> old.rental_rate) then
    insert into film_rate_log values (new.film_id, old.rental_rate, new.rental_rate);
  end if;
end;`,
        mysqlNote:
          'In MySQL the trigger body is written inline, without a separate function. <=> is MySQL\'s NULL-safe equality, like IS NOT DISTINCT FROM. ' +
          DELIMITER_NOTE,
        explanation:
          'In PostgreSQL a trigger calls a trigger function. OLD and NEW are the row before and after the update. IS DISTINCT FROM treats NULL as a value, so a change from NULL is logged too.',
      },
      {
        approach: 'Trigger with WHEN',
        postgres: `create table film_rate_log (
  film_id  integer not null,
  old_rate numeric(4, 2),
  new_rate numeric(4, 2)
);

create function log_rate_change() returns trigger
language plpgsql as $$
begin
  insert into film_rate_log values (new.film_id, old.rental_rate, new.rental_rate);
  return new;
end;
$$;

create trigger film_rate_change
after update of rental_rate on film
for each row
when (old.rental_rate is distinct from new.rental_rate)
execute function log_rate_change();`,
        mysql: null,
        mysqlNote: 'MySQL triggers have no WHEN clause or column list. Put the condition inside the body (solution A).',
        explanation:
          'UPDATE OF rental_rate and WHEN filter before the function is even called, so the function stays a one-liner and unrelated updates cost nothing.',
      },
    ],
    comparison:
      'Same log. Putting the condition in WHEN keeps the function simple and skips the call entirely for other updates. The IF version works in both databases.',
    docs: [
      { label: 'PostgreSQL: CREATE TRIGGER', url: PG + 'sql-createtrigger.html' },
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Trigger syntax', url: MY + 'trigger-syntax.html' },
    ],
  },
  {
    id: 'sakila-041',
    dataset: 'sakila',
    level: 5,
    topics: ['indexes', 'query-plans'],
    title: 'Make a slow filter fast',
    prompt:
      'Queries like select * from payment where amount > 11 read the whole payment table. Create an index that lets the database find these rows directly.',
    orderMatters: false,
    checkSql: `select count(*) as indexes_on_amount
from pg_indexes
where tablename = 'payment' and indexdef like '%(amount%'`,
    checkSqlMysql: `select count(distinct index_name) as indexes_on_amount
from information_schema.statistics
where table_schema = database() and table_name = 'payment'
  and column_name = 'amount' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'B-tree index',
        postgres: `create index payment_amount_idx on payment (amount);`,
        mysql: `create index payment_amount_idx on payment (amount);`,
        explanation:
          'A B-tree index keeps amounts sorted, so "amount > 11" becomes a short range scan. Only a few payments are that large, which is exactly when an index pays off. Try EXPLAIN before and after.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE INDEX', url: PG + 'sql-createindex.html' },
      { label: 'MySQL: CREATE INDEX', url: MY + 'create-index.html' },
    ],
  },
  {
    id: 'sakila-042',
    dataset: 'sakila',
    level: 4,
    topics: ['generated-columns', 'dates-advanced'],
    title: 'A column that computes itself',
    prompt:
      'Add a stored generated column days_out to rental: the number of calendar days between rental_date and return_date (NULL while not returned).',
    // PostgreSQL sorts NULL last and MySQL first, so the check compares rows regardless of order.
    orderMatters: false,
    checkSql: `select days_out, count(*) as rentals from rental group by days_out order by days_out`,
    solutions: [
      {
        approach: 'GENERATED ALWAYS AS … STORED',
        postgres: `alter table rental
add column days_out integer
generated always as (return_date::date - rental_date::date) stored;`,
        mysql: `alter table rental
add column days_out integer
generated always as (datediff(return_date, rental_date)) stored;`,
        mysqlNote: 'Same clause in MySQL; DATEDIFF() gives the day difference. MySQL also supports VIRTUAL generated columns, computed on read.',
        explanation:
          'The database computes the value on every insert and update, so it can never disagree with the source columns. Subtracting two dates in PostgreSQL gives whole days.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'sakila-043',
    dataset: 'sakila',
    level: 4,
    topics: ['constraints'],
    title: 'No negative payments',
    prompt: 'Add a CHECK constraint named payment_amount_not_negative that rejects payments below zero.',
    orderMatters: false,
    checkSql: `select count(*) as constraints
from information_schema.check_constraints
where constraint_name = 'payment_amount_not_negative'`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD CONSTRAINT',
        postgres: `alter table payment
add constraint payment_amount_not_negative check (amount >= 0);`,
        mysql: `alter table payment
add constraint payment_amount_not_negative check (amount >= 0);`,
        mysqlNote: 'MySQL enforces CHECK constraints since 8.0.16. Older versions accepted the syntax and silently ignored it.',
        explanation:
          'Adding the constraint checks every existing row first; it fails if any row already breaks the rule. After that, inserts and updates that would break it are rejected.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' },
      { label: 'MySQL: CHECK constraints', url: MY + 'create-table-check-constraints.html' },
    ],
  },
  {
    id: 'sakila-044',
    dataset: 'sakila',
    level: 4,
    topics: ['materialized-views'],
    title: 'Pre-computed revenue by category',
    prompt:
      'Revenue by category is slow to compute and changes rarely. Store it as category_revenue(category, revenue) so reading it is instant.',
    orderMatters: true,
    checkSql: `select category, revenue from category_revenue order by category`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view category_revenue as
select c.name as category, sum(p.amount) as revenue
from payment p
join rental r         on r.rental_id = p.rental_id
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
group by c.name;`,
        mysql: null,
        mysqlNote: 'MySQL has no materialized views. Store the result in a table (solution B) and refresh it yourself.',
        explanation:
          'A materialized view stores the query result like a table. It does not update itself: run REFRESH MATERIALIZED VIEW category_revenue when the data changes.',
      },
      {
        approach: 'Summary table',
        postgres: `create table category_revenue as
select c.name as category, sum(p.amount) as revenue
from payment p
join rental r         on r.rental_id = p.rental_id
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
group by c.name;`,
        mysql: `create table category_revenue as
select c.name as category, sum(p.amount) as revenue
from payment p
join rental r         on r.rental_id = p.rental_id
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
group by c.name;`,
        explanation: 'A plain table filled from a query. To refresh it: TRUNCATE and INSERT … SELECT again, typically on a schedule.',
      },
    ],
    comparison:
      'Same data. The materialized view remembers its own query, so refreshing is one command (and REFRESH … CONCURRENTLY keeps it readable meanwhile). The summary table works in any database but you maintain the refresh logic yourself.',
    docs: [
      { label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' },
      { label: 'MySQL: CREATE TABLE … SELECT', url: MY + 'create-table-select.html' },
    ],
  },
  {
    id: 'sakila-045',
    dataset: 'sakila',
    level: 2,
    topics: ['full-join', 'conditional-aggregates'],
    title: 'Which store stocks which films',
    prompt: 'Count the films stocked in both stores, only in store 1, only in store 2, and in neither, in one row.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of the two stores',
        postgres: `with s1 as (select distinct film_id from inventory where store_id = 1),
     s2 as (select distinct film_id from inventory where store_id = 2)
select count(*) filter (where s1.film_id is not null and s2.film_id is not null) as both_stores,
       count(*) filter (where s2.film_id is null)                                as only_store_1,
       count(*) filter (where s1.film_id is null)                                as only_store_2,
       (select count(*) from film) - count(*)                                    as neither
from s1
full join s2 on s2.film_id = s1.film_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no FULL JOIN; see solution B.',
        explanation:
          'FULL JOIN keeps films from either side, with NULL on the side that lacks them. Films in neither store are not in either list at all, so they are the total minus everything the join returned.',
      },
      {
        approach: 'One flag per store',
        postgres: `select sum(case when s1 = 1 and s2 = 1 then 1 else 0 end) as both_stores,
       sum(case when s1 = 1 and s2 = 0 then 1 else 0 end) as only_store_1,
       sum(case when s1 = 0 and s2 = 1 then 1 else 0 end) as only_store_2,
       sum(case when s1 = 0 and s2 = 0 then 1 else 0 end) as neither
from (
  select f.film_id,
         case when exists (select 1 from inventory i where i.film_id = f.film_id and i.store_id = 1) then 1 else 0 end as s1,
         case when exists (select 1 from inventory i where i.film_id = f.film_id and i.store_id = 2) then 1 else 0 end as s2
  from film f
) flags;`,
        mysql: `select sum(s1 and s2)         as both_stores,
       sum(s1 and not s2)     as only_store_1,
       sum(s2 and not s1)     as only_store_2,
       sum(not s1 and not s2) as neither
from (
  select f.film_id,
         exists (select 1 from inventory i where i.film_id = f.film_id and i.store_id = 1) as s1,
         exists (select 1 from inventory i where i.film_id = f.film_id and i.store_id = 2) as s2
  from film f
) flags;`,
        explanation: 'Start from all films, so "neither" comes for free, and mark each film with one flag per store.',
      },
    ],
    comparison:
      'Same counts. FULL JOIN shows the idea of "present on one side, the other, or both"; starting from film with two flags also covers "neither" naturally and works in MySQL.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: EXISTS', url: MY + 'exists-and-not-exists-subqueries.html' },
    ],
  },
  {
    id: 'sakila-046',
    dataset: 'sakila',
    level: 3,
    topics: ['date-series'],
    title: 'Every day of August 2005',
    prompt: 'Show every day of August 2005 with its number of rentals, including the days without any.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select d::date as day, count(r.rental_id) as rentals
from generate_series(date '2005-08-01', date '2005-08-31', interval '1 day') as d
left join rental r on r.rental_date >= d and r.rental_date < d + interval '1 day'
group by d
order by d;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'Rentals happened only on 1–2 and 16–23 August. Starting from a calendar keeps the 21 empty days in the report, with 0.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive days as (
  select date '2005-08-01' as day
  union all
  select (day + 1)::date from days where day < date '2005-08-31'
)
select d.day, count(r.rental_id) as rentals
from days d
left join rental r on r.rental_date >= d.day and r.rental_date < d.day + 1
group by d.day
order by d.day;`,
        mysql: `with recursive days as (
  select date('2005-08-01') as day
  union all
  select day + interval 1 day from days where day < '2005-08-31'
)
select d.day, count(r.rental_id) as rentals
from days d
left join rental r on r.rental_date >= d.day and r.rental_date < d.day + interval 1 day
group by d.day
order by d.day;`,
        explanation: 'The calendar built row by row: a start day, then "the previous day plus one" until the 31st.',
      },
    ],
    comparison: 'Same 31 rows. A plain GROUP BY on rental dates would return only the 10 days that have rentals.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'sakila-047',
    dataset: 'sakila',
    level: 3,
    topics: ['gaps-islands'],
    title: 'When was the shop busy',
    prompt: 'Rentals come in bursts. Find each run of consecutive days with at least one rental: first day, last day, number of days and rentals.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date minus row number',
        postgres: `with days as (
  select rental_date::date as day, count(*) as rentals
  from rental
  group by rental_date::date
),
runs as (
  select day, rentals, day - (row_number() over (order by day))::int as grp
  from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days, sum(rentals) as rentals
from runs
group by grp
order by first_day;`,
        mysql: `with days as (
  select date(rental_date) as day, count(*) as rentals
  from rental
  group by date(rental_date)
),
runs as (
  select day, rentals, day - interval (row_number() over (order by day)) day as grp
  from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days, sum(rentals) as rentals
from runs
group by grp
order by first_day;`,
        mysqlNote: 'date − integer is not date arithmetic in MySQL (it turns the date into a number); subtract an INTERVAL instead.',
        explanation:
          'Number the active days 1, 2, 3, … Inside a run of consecutive days, the date and the number grow together, so date − number is constant; after a gap it jumps. That constant identifies each run.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'sakila-048',
    dataset: 'sakila',
    level: 3,
    topics: ['pivot', 'conditional-aggregates'],
    title: 'Category rentals by month',
    prompt: 'For each film category, show its rentals in June, July and August 2005 as three columns, ordered by category name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts',
        postgres: `select c.name as category,
       count(*) filter (where r.rental_date >= '2005-06-01' and r.rental_date < '2005-07-01') as june,
       count(*) filter (where r.rental_date >= '2005-07-01' and r.rental_date < '2005-08-01') as july,
       count(*) filter (where r.rental_date >= '2005-08-01' and r.rental_date < '2005-09-01') as august
from rental r
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
group by c.name
order by c.name;`,
        mysql: `select c.name as category,
       sum(r.rental_date >= '2005-06-01' and r.rental_date < '2005-07-01') as june,
       sum(r.rental_date >= '2005-07-01' and r.rental_date < '2005-08-01') as july,
       sum(r.rental_date >= '2005-08-01' and r.rental_date < '2005-09-01') as august
from rental r
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
group by c.name
order by c.name;`,
        mysqlNote: 'No FILTER; a true comparison is 1 in MySQL, so SUM counts the matching rows.',
        explanation: 'A pivot turns values of one column (the month) into separate columns: one conditional count per month. The month list is fixed in the query; SQL cannot create columns from data on its own.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'sakila-049',
    dataset: 'sakila',
    level: 3,
    topics: ['lateral'],
    title: 'Each customer\'s latest rental',
    prompt: 'For customers 1 to 10, show customer_id, the title of the film they rented last and when.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 1',
        postgres: `select c.customer_id, last.title, last.rental_date
from customer c
cross join lateral (
  select f.title, r.rental_date
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f      on f.film_id = i.film_id
  where r.customer_id = c.customer_id
  order by r.rental_date desc, r.rental_id desc
  limit 1
) as last
where c.customer_id between 1 and 10
order by c.customer_id;`,
        mysql: `select c.customer_id, last.title, last.rental_date
from customer c
cross join lateral (
  select f.title, r.rental_date
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f      on f.film_id = i.film_id
  where r.customer_id = c.customer_id
  order by r.rental_date desc, r.rental_id desc
  limit 1
) as last
where c.customer_id between 1 and 10
order by c.customer_id;`,
        mysqlNote: 'LATERAL exists since MySQL 8.0.14.',
        explanation: 'The subquery runs per customer and can return several columns at once, which a scalar subquery in SELECT cannot.',
      },
      {
        approach: 'ROW_NUMBER',
        postgres: `select customer_id, title, rental_date
from (
  select r.customer_id, f.title, r.rental_date,
         row_number() over (partition by r.customer_id order by r.rental_date desc, r.rental_id desc) as n
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f      on f.film_id = i.film_id
  where r.customer_id between 1 and 10
) ranked
where n = 1
order by customer_id;`,
        mysql: `select customer_id, title, rental_date
from (
  select r.customer_id, f.title, r.rental_date,
         row_number() over (partition by r.customer_id order by r.rental_date desc, r.rental_id desc) as n
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f      on f.film_id = i.film_id
  where r.customer_id between 1 and 10
) ranked
where n = 1
order by customer_id;`,
        explanation: 'Number each customer\'s rentals from the newest and keep number 1.',
      },
    ],
    comparison: 'Same rows. With an index on rental (customer_id, rental_date), LATERAL reads one row per customer; ROW_NUMBER reads all of their rentals first.',
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'sakila-050',
    dataset: 'sakila',
    level: 3,
    topics: ['window-frames'],
    title: 'Revenue so far, and its share',
    prompt:
      'For each day with payments in July 2005, show the day\'s payments total, the running total since 1 July, and the running total as a percentage of the whole month (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two windows over daily totals',
        postgres: `with daily as (
  select payment_date::date as day, sum(amount) as amount
  from payment
  where payment_date >= '2005-07-01' and payment_date < '2005-08-01'
  group by payment_date::date
)
select day, amount,
       sum(amount) over (order by day rows between unbounded preceding and current row) as running,
       round(100 * sum(amount) over (order by day rows between unbounded preceding and current row)
                 / sum(amount) over (), 1) as pct_of_month
from daily
order by day;`,
        mysql: `with daily as (
  select date(payment_date) as day, sum(amount) as amount
  from payment
  where payment_date >= '2005-07-01' and payment_date < '2005-08-01'
  group by date(payment_date)
)
select day, amount,
       sum(amount) over (order by day rows between unbounded preceding and current row) as running,
       round(100 * sum(amount) over (order by day rows between unbounded preceding and current row)
                 / sum(amount) over (), 1) as pct_of_month
from daily
order by day;`,
        explanation:
          'The frame "unbounded preceding … current row" sums everything up to this day. An empty OVER () is the whole result: the month total. Writing the frame out is clearer than relying on the default, which is RANGE and would merge rows with equal days.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: Window function frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'sakila-051',
    dataset: 'sakila',
    level: 4,
    topics: ['arrays', 'normalization'],
    title: 'Counting special features',
    prompt:
      'special_features holds a comma-separated list such as "Trailers,Commentaries". Count how many films have each feature.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Split into an array and unnest',
        postgres: `select feature, count(*) as films
from film
cross join unnest(string_to_array(special_features, ',')) as feature
group by feature
order by films desc, feature;`,
        mysql: `select f.feature, count(*) as films
from film
join (select 'Trailers' as feature union all select 'Commentaries'
      union all select 'Deleted Scenes' union all select 'Behind the Scenes') as f
  on find_in_set(f.feature, film.special_features) > 0
group by f.feature
order by films desc, f.feature;`,
        mysqlNote:
          'In MySQL the column is a SET, a built-in "list of allowed values" type. FIND_IN_SET looks a value up in it, but there is no general way to turn it into rows, so the four allowed values are listed by hand.',
        explanation:
          'string_to_array turns the text into an array and unnest makes one row per element, so each film appears once per feature. This column breaks first normal form (one value per field): the next exercise fixes that.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_to_array, unnest', url: PG + 'functions-array.html' },
      { label: 'MySQL: FIND_IN_SET', url: MY + 'string-functions.html#function_find-in-set' },
    ],
  },
  {
    id: 'sakila-052',
    dataset: 'sakila',
    level: 4,
    topics: ['normalization', 'ddl'],
    title: 'One feature per row',
    prompt:
      'Normalize special_features: create film_feature (film_id, feature) with one row per film and feature, primary key on both columns and a foreign key to film, and fill it.',
    orderMatters: true,
    checkSql: `select feature, count(*) as films from film_feature group by feature order by feature`,
    solutions: [
      {
        approach: 'New table from the list',
        postgres: `create table film_feature (
  film_id integer     not null references film (film_id),
  feature varchar(20) not null,
  primary key (film_id, feature)
);

insert into film_feature (film_id, feature)
select film_id, unnest(string_to_array(special_features, ','))
from film
where special_features is not null;`,
        mysql: `create table film_feature (
  film_id smallint unsigned not null,
  feature varchar(20)       not null,
  primary key (film_id, feature),
  foreign key (film_id) references film (film_id)
);

insert into film_feature (film_id, feature)
select film.film_id, f.feature
from film
join (select 'Trailers' as feature union all select 'Commentaries'
      union all select 'Deleted Scenes' union all select 'Behind the Scenes') as f
  on find_in_set(f.feature, film.special_features) > 0;`,
        mysqlNote: 'film.film_id is SMALLINT UNSIGNED in Sakila\'s MySQL schema, and a foreign key column must have exactly the same type.',
        explanation:
          'Now "films with trailers" is a plain WHERE feature = \'Trailers\' that an index can serve, a new feature is a new row rather than an edited string, and a typo cannot hide inside a list.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Constraints', url: PG + 'ddl-constraints.html' },
      { label: 'MySQL: The SET type', url: MY + 'set.html' },
    ],
  },
  {
    id: 'sakila-053',
    dataset: 'sakila',
    level: 5,
    topics: ['full-text'],
    title: 'Films with a crocodile and a shark',
    prompt:
      'Make film descriptions searchable with a full-text index. Then find the films whose description contains both the word "crocodile" and the word "shark": film_id and title.',
    orderMatters: true,
    checkSql: `select film_id, title from film
where to_tsvector('simple', description) @@ to_tsquery('simple', 'crocodile & shark')
order by film_id`,
    checkSqlMysql: `select film_id, title from film
where match(description) against ('+crocodile +shark' in boolean mode)
order by film_id`,
    solutions: [
      {
        approach: 'GIN index / FULLTEXT index',
        postgres: `create index film_description_fts on film using gin (to_tsvector('simple', description));`,
        mysql: `create fulltext index film_description_ft on film (description);`,
        mysqlNote: 'In boolean mode, + marks a word that must be present: \'+crocodile +shark\'. Without the + signs, either word would match.',
        explanation:
          'In tsquery, & means "both words" (| is "either", ! is "not"). Unlike LIKE \'%shark%\', a word search does not match "sharkskin", and the index finds the rows without reading every description.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Text search operators', url: PG + 'functions-textsearch.html' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'sakila-054',
    dataset: 'sakila',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'Let the index work',
    prompt: 'Count the rentals made on 31 July 2005. rental_date is indexed: write the query so that the index can be used.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Range on the bare column',
        postgres: `select count(*) as rentals
from rental
where rental_date >= '2005-07-31' and rental_date < '2005-08-01';`,
        mysql: `select count(*) as rentals
from rental
where rental_date >= '2005-07-31' and rental_date < '2005-08-01';`,
        explanation:
          'The condition compares the indexed column itself with two constants, so the planner can jump to 31 July in the index and read just that day (EXPLAIN: Index Only Scan or Bitmap Index Scan).',
      },
      {
        approach: 'Function on the column',
        postgres: `select count(*) as rentals
from rental
where rental_date::date = '2005-07-31';`,
        mysql: `select count(*) as rentals
from rental
where date(rental_date) = '2005-07-31';`,
        explanation:
          'Correct, but the index is ordered by rental_date, not by rental_date::date. The database must compute the cast for all 16,000 rentals and check each one (EXPLAIN: Seq Scan).',
      },
    ],
    comparison:
      'Same count. Keeping the column "bare" (sargable) is what lets an index help; see the index column in the comparison. An index on the expression (rental_date::date) would also work, at the cost of one more index.',
    docs: [
      { label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'MySQL: Range optimization', url: MY + 'range-optimization.html' },
    ],
  },
  {
    id: 'sakila-055',
    dataset: 'sakila',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Missing rental numbers',
    prompt: 'rental_id runs from 1 to 16049, but there are only 16044 rentals. Find the gaps: the first and last missing id of each gap.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Compare each id with the next',
        postgres: `select rental_id + 1 as gap_start, next_id - 1 as gap_end
from (
  select rental_id, lead(rental_id) over (order by rental_id) as next_id
  from rental
) r
where next_id > rental_id + 1
order by gap_start;`,
        mysql: `select rental_id + 1 as gap_start, next_id - 1 as gap_end
from (
  select rental_id, lead(rental_id) over (order by rental_id) as next_id
  from rental
) r
where next_id > rental_id + 1
order by gap_start;`,
        explanation: 'If the next existing id is more than one higher, everything between them is missing.',
      },
      {
        approach: 'All ids minus existing ones',
        postgres: `select id as gap_start, id as gap_end
from generate_series(1, (select max(rental_id) from rental)) as id
where not exists (select 1 from rental r where r.rental_id = id)
order by id;`,
        mysql: null,
        mysqlNote: 'Without generate_series, MySQL would need a recursive CTE counting to 16,049, which hits the default recursion limit of 1,000 (cte_max_recursion_depth). Use solution A.',
        explanation: 'Generate every possible id and keep those with no rental. Each missing id is its own row; here no gap is longer than one id, so the result matches.',
      },
    ],
    comparison:
      'Same rows here. LEAD returns one row per gap however long it is; the generate_series version lists every missing id and only matches because each gap is a single id. Missing ids are normal: deleted rows and rolled-back inserts leave holes, and ids should never be reused.',
    docs: [
      { label: 'PostgreSQL: LEAD', url: PG + 'functions-window.html' },
      { label: 'MySQL: cte_max_recursion_depth', url: MY + 'server-system-variables.html#sysvar_cte_max_recursion_depth' },
    ],
  },
  {
    id: 'sakila-056',
    dataset: 'sakila',
    level: 5,
    topics: ['locks-isolation', 'subqueries'],
    title: 'Grab a free copy',
    prompt:
      'Two clerks at store 1 rent out ACADEMY DINOSAUR (film 1) at the same moment. Lock and return the lowest inventory_id of a copy that is in the store (no open rental), skipping copies another clerk has already locked.',
    hint: 'A copy is out while it has a rental with return_date NULL.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FOR UPDATE SKIP LOCKED',
        postgres: `select i.inventory_id
from inventory i
where i.film_id = 1 and i.store_id = 1
  and not exists (select 1 from rental r where r.inventory_id = i.inventory_id and r.return_date is null)
order by i.inventory_id
limit 1
for update skip locked;`,
        mysql: `select i.inventory_id
from inventory i
where i.film_id = 1 and i.store_id = 1
  and not exists (select 1 from rental r where r.inventory_id = i.inventory_id and r.return_date is null)
order by i.inventory_id
limit 1
for update skip locked;`,
        explanation:
          'Both clerks run the same query. The first locks copy A; the second skips the locked A and gets copy B instead of waiting, so the same disc is never handed out twice. The lock lasts until the rental is inserted and the transaction commits.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: The locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' },
      { label: 'MySQL: SKIP LOCKED', url: MY + 'innodb-locking-reads.html#innodb-locking-reads-nowait-skip-locked' },
    ],
  },
  {
    id: 'sakila-057',
    dataset: 'sakila',
    level: 5,
    topics: ['partitioning'],
    title: 'Payments, one partition per month',
    prompt:
      'Create payment_by_month with the columns of payment, partitioned by payment_date into one partition for each month that has payments (May–August 2005 and February 2006), and copy the payments into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'payment_by_month'::regclass) as partitions,
       (select count(*) from payment_by_month) as total_rows,
       (select count(*) from payment_by_month where payment_date >= '2005-07-01' and payment_date < '2005-08-01') as july`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'payment_by_month') as partitions,
       (select count(*) from payment_by_month) as total_rows,
       (select count(*) from payment_by_month where payment_date >= '2005-07-01' and payment_date < '2005-08-01') as july`,
    solutions: [
      {
        approach: 'Monthly range partitions',
        postgres: `create table payment_by_month (like payment, primary key (payment_id, payment_date))
partition by range (payment_date);

create table payment_2005_05 partition of payment_by_month for values from ('2005-05-01') to ('2005-06-01');
create table payment_2005_06 partition of payment_by_month for values from ('2005-06-01') to ('2005-07-01');
create table payment_2005_07 partition of payment_by_month for values from ('2005-07-01') to ('2005-08-01');
create table payment_2005_08 partition of payment_by_month for values from ('2005-08-01') to ('2005-09-01');
create table payment_2006_02 partition of payment_by_month for values from ('2006-02-01') to ('2006-03-01');

insert into payment_by_month select * from payment;`,
        mysql: `create table payment_by_month like payment;

alter table payment_by_month drop primary key, add primary key (payment_id, payment_date);

alter table payment_by_month
partition by range (year(payment_date) * 100 + month(payment_date)) (
  partition p200505 values less than (200506),
  partition p200506 values less than (200507),
  partition p200507 values less than (200508),
  partition p200508 values less than (200509),
  partition p200602 values less than (200603)
);

insert into payment_by_month select * from payment;`,
        mysqlNote:
          'Here the MySQL partitions are defined on an expression (year × 100 + month) instead of RANGE COLUMNS; YEAR() and MONTH() are among the functions allowed in partition expressions. The primary key is widened first because it must contain payment_date.',
        explanation:
          'PostgreSQL has no partitions for the empty months between, so a payment dated, say, December 2005 would be rejected until a partition (or a DEFAULT one) exists. Monthly partitions make "drop data older than a year" a matter of dropping old partitions.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: Partitioning functions', url: MY + 'partitioning-limitations-functions.html' },
    ],
  },
  {
    id: 'sakila-058',
    dataset: 'sakila',
    level: 4,
    topics: ['json', 'joins'],
    title: 'A film with its cast, as JSON',
    prompt: 'For films 1 to 3, return one JSON object each: {"title": …, "year": …, "actors": ["FIRST LAST", …]} with the actors in alphabetical order of last name, then first name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Object with an aggregated array',
        postgres: `select f.film_id,
       jsonb_build_object(
         'title', f.title,
         'year', f.release_year,
         'actors', jsonb_agg(a.first_name || ' ' || a.last_name order by a.last_name, a.first_name)
       ) as film
from film f
join film_actor fa on fa.film_id = f.film_id
join actor a       on a.actor_id = fa.actor_id
where f.film_id between 1 and 3
group by f.film_id, f.title, f.release_year
order by f.film_id;`,
        mysql: `select f.film_id,
       json_object(
         'title', f.title,
         'year', f.release_year,
         'actors', cast(concat('[', group_concat(json_quote(concat(a.first_name, ' ', a.last_name))
                                                order by a.last_name, a.first_name), ']') as json)
       ) as film
from film f
join film_actor fa on fa.film_id = f.film_id
join actor a       on a.actor_id = fa.actor_id
where f.film_id between 1 and 3
group by f.film_id, f.title, f.release_year
order by f.film_id;`,
        mysqlNote: 'JSON_QUOTE makes each name a valid JSON string (quotes, escapes) before GROUP_CONCAT glues them into an ordered array.',
        explanation: 'GROUP BY film turns the actor rows into one array per film, nested inside the film object.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: jsonb_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_QUOTE', url: MY + 'json-creation-functions.html#function_json-quote' },
    ],
  },
  {
    id: 'sakila-059',
    dataset: 'sakila',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'Index only what is still out',
    prompt: 'The counter staff look up the 183 rentals not yet returned (return_date is NULL) by customer. Create the smallest index that serves this.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'rental' and indexdef like '%return_date%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'rental' and column_name = 'return_date'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index rental_open_by_customer on rental (customer_id) where return_date is null;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: '183 of 16,044 rentals: the index is about 90 times smaller than a full one and only changes when a rental is created or returned.',
      },
      {
        approach: 'NULL test as the first key column',
        postgres: `create index rental_return_customer on rental (return_date, customer_id);`,
        mysql: `create index rental_return_customer on rental (return_date, customer_id);`,
        explanation: 'NULLs are stored in the index too, together at one end, so "return_date is null and customer_id = ?" is one small range.',
      },
    ],
    comparison: 'Both serve the lookup. The partial index is tiny; the composite one covers every rental but works everywhere.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'sakila-060',
    dataset: 'sakila',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'When is it due back',
    prompt: 'A film may be kept for film.rental_duration days. For rentals 1 to 5, show rental_id, rental_date and the due date (rental_date plus that many days).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer to interval',
        postgres: `select r.rental_id, r.rental_date,
       r.rental_date + make_interval(days => f.rental_duration) as due
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f      on f.film_id = i.film_id
where r.rental_id between 1 and 5
order by r.rental_id;`,
        mysql: `select r.rental_id, r.rental_date,
       r.rental_date + interval f.rental_duration day as due
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f      on f.film_id = i.film_id
where r.rental_id between 1 and 5
order by r.rental_id;`,
        mysqlNote: 'MySQL\'s INTERVAL accepts any expression as the amount: interval f.rental_duration day.',
        explanation:
          'A number is not an interval: make_interval(days => n) turns it into one. f.rental_duration * interval \'1 day\' is an equivalent spelling.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: make_interval', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: Temporal intervals', url: MY + 'expressions.html#temporal-intervals' },
    ],
  },
  {
    id: 'sakila-061',
    dataset: 'sakila',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'A procedure to rent a film',
    prompt:
      'Write a procedure rent_copy(p_inventory_id, p_customer_id, p_staff_id) that inserts a rental dated 2006-02-15 12:00 only if the copy is not currently rented out, and otherwise does nothing. Then rent copy 1 to customer 1 (staff 1).',
    orderMatters: false,
    checkSql: `call rent_copy(1, 1, 1);
select count(*) as open_rentals_of_copy_1 from rental where inventory_id = 1 and return_date is null`,
    solutions: [
      {
        approach: 'IF NOT EXISTS … INSERT',
        postgres: `create procedure rent_copy(p_inventory_id integer, p_customer_id integer, p_staff_id integer)
language plpgsql
as $$
begin
  if not exists (select 1 from rental where inventory_id = p_inventory_id and return_date is null) then
    insert into rental (rental_date, inventory_id, customer_id, staff_id)
    values (timestamp '2006-02-15 12:00', p_inventory_id, p_customer_id, p_staff_id);
  end if;
end;
$$;`,
        mysql: `create procedure rent_copy(p_inventory_id int, p_customer_id int, p_staff_id int)
begin
  if not exists (select 1 from rental where inventory_id = p_inventory_id and return_date is null) then
    insert into rental (rental_date, inventory_id, customer_id, staff_id)
    values ('2006-02-15 12:00:00', p_inventory_id, p_customer_id, p_staff_id);
  end if;
end;`,
        mysqlNote: `rental_id is AUTO_INCREMENT and last_update has a default, so they are left out. ${DELIMITER_NOTE}`,
        explanation:
          'Copy 1 is in the store, so one open rental is created. Called again it would do nothing. Two clerks calling at the same moment could both pass the check; lock the inventory row first (SELECT … FOR UPDATE) to close that gap.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'sakila-062',
    dataset: 'sakila',
    level: 4,
    topics: ['generated-columns', 'conditions'],
    title: 'A length category column',
    prompt: 'Add a stored generated column length_class to film: "short" under 90 minutes, "feature" up to 150, "epic" above (length may be NULL).',
    orderMatters: true,
    checkSql: `select length_class, count(*) as films from film group by length_class order by length_class`,
    solutions: [
      {
        approach: 'CASE in a generated column',
        postgres: `alter table film add column length_class text generated always as (
  case when length < 90 then 'short' when length <= 150 then 'feature' when length > 150 then 'epic' end
) stored;`,
        mysql: `alter table film add column length_class varchar(10) generated always as (
  case when length < 90 then 'short' when length <= 150 then 'feature' when length > 150 then 'epic' end
) stored;`,
        explanation: 'A CASE with no ELSE gives NULL when length is NULL, so unknown lengths stay unknown instead of falling into a class.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'sakila-063',
    dataset: 'sakila',
    level: 4,
    topics: ['materialized-views'],
    title: 'Customer lifetime value, stored',
    prompt: 'Store each customer\'s number of payments and total paid, for the marketing team\'s weekly look at top customers.',
    orderMatters: true,
    checkSql: `select customer_id, payments, total_paid from customer_value order by total_paid desc, customer_id limit 5`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view customer_value as
select customer_id, count(*) as payments, sum(amount) as total_paid
from payment
group by customer_id;`,
        mysql: `create table customer_value as
select customer_id, count(*) as payments, sum(amount) as total_paid
from payment
group by customer_id;`,
        mysqlNote: 'A table rebuilt weekly stands in for the materialized view.',
        explanation: 'A weekly view does not need live data: computing it once and reading the stored rows is cheaper. REFRESH MATERIALIZED VIEW customer_value brings it up to date.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'sakila-064',
    dataset: 'sakila',
    level: 4,
    topics: ['merge', 'joins'],
    title: 'New prices for two categories',
    prompt:
      'Pricing decides: films in category Horror rent for 1.99, films in Comedy for 3.99. Store that as category_price (name, rental_rate) and apply it to film in one statement, only where the price changes.',
    orderMatters: true,
    checkSql: `select c.name, f.rental_rate, count(*) as films
from film f join film_category fc on fc.film_id = f.film_id join category c on c.category_id = fc.category_id
where c.name in ('Horror', 'Comedy')
group by c.name, f.rental_rate
order by c.name, f.rental_rate`,
    solutions: [
      {
        approach: 'MERGE from a joined source',
        postgres: `create table category_price (name varchar(25) primary key, rental_rate numeric(4, 2) not null);
insert into category_price values ('Horror', 1.99), ('Comedy', 3.99);

merge into film f
using (select fc.film_id, cp.rental_rate
       from film_category fc
       join category c on c.category_id = fc.category_id
       join category_price cp on cp.name = c.name) s
on s.film_id = f.film_id
when matched and f.rental_rate <> s.rental_rate then
  update set rental_rate = s.rental_rate;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'The USING clause can be any query: here it maps every film of the two categories to its new price.',
      },
      {
        approach: 'UPDATE with joins',
        postgres: `create table category_price (name varchar(25) primary key, rental_rate numeric(4, 2) not null);
insert into category_price values ('Horror', 1.99), ('Comedy', 3.99);

update film f set rental_rate = cp.rental_rate
from film_category fc, category c, category_price cp
where fc.film_id = f.film_id and c.category_id = fc.category_id and cp.name = c.name
  and f.rental_rate <> cp.rental_rate;`,
        mysql: `create table category_price (name varchar(25) primary key, rental_rate decimal(4, 2) not null);
insert into category_price values ('Horror', 1.99), ('Comedy', 3.99);

update film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
join category_price cp on cp.name = c.name
set f.rental_rate = cp.rental_rate
where f.rental_rate <> cp.rental_rate;`,
        explanation: 'For updates only, a joined UPDATE does the job in both databases.',
      },
    ],
    comparison: 'Same prices afterwards. Each film has exactly one category in Sakila; if a film could be in both, the new price would depend on which row came first.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'sakila-065',
    dataset: 'sakila',
    level: 4,
    topics: ['upsert'],
    title: 'A page-view counter',
    prompt:
      'Create film_views (film_id primary key, views). Record views of films 1, 1 and 2 with three statements, each adding 1 to the counter or starting it at 1.',
    orderMatters: true,
    checkSql: `select film_id, views from film_views order by film_id`,
    solutions: [
      {
        approach: 'Increment on conflict',
        postgres: `create table film_views (film_id integer primary key, views integer not null);

insert into film_views values (1, 1) on conflict (film_id) do update set views = film_views.views + 1;
insert into film_views values (1, 1) on conflict (film_id) do update set views = film_views.views + 1;
insert into film_views values (2, 1) on conflict (film_id) do update set views = film_views.views + 1;`,
        mysql: `create table film_views (film_id int primary key, views int not null);

insert into film_views values (1, 1) on duplicate key update views = views + 1;
insert into film_views values (1, 1) on duplicate key update views = views + 1;
insert into film_views values (2, 1) on duplicate key update views = views + 1;`,
        mysqlNote: 'Inside ON DUPLICATE KEY UPDATE, a plain column name refers to the existing row.',
        explanation:
          'The classic counter: the first view inserts 1, later ones add to the stored value. In ON CONFLICT the existing row is referred to by the table name (film_views.views), the new one as excluded. Atomic, so concurrent views are never lost.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'sakila-066',
    dataset: 'sakila',
    level: 5,
    topics: ['full-text'],
    title: 'A phrase, not two words',
    prompt:
      'Make film descriptions searchable and count the films whose description contains the phrase "mad scientist" (the two words next to each other), and for comparison those with both words anywhere.',
    orderMatters: false,
    checkSql: `select count(*) filter (where to_tsvector('simple', description) @@ phraseto_tsquery('simple', 'mad scientist')) as phrase,
       count(*) filter (where to_tsvector('simple', description) @@ to_tsquery('simple', 'mad & scientist')) as both_words
from film`,
    checkSqlMysql: `select sum(match(description) against ('"mad scientist"' in boolean mode) > 0) as phrase,
       sum(match(description) against ('+mad +scientist' in boolean mode) > 0) as both_words
from film`,
    solutions: [
      {
        approach: 'Phrase query',
        postgres: `create index film_description_fts on film using gin (to_tsvector('simple', description));

-- phrase: phraseto_tsquery('simple', 'mad scientist')   both words: to_tsquery('simple', 'mad & scientist')`,
        mysql: `create fulltext index film_description_ft on film (description);

-- phrase: against ('"mad scientist"' in boolean mode)   both words: against ('+mad +scientist' in boolean mode)`,
        mysqlNote: 'Double quotes inside the boolean search string mark a phrase. MATCH returns a relevance score; > 0 means it matched.',
        explanation:
          'phraseto_tsquery requires the words in that order, next to each other (internally: mad <-> scientist). Here both counts are 97: Sakila\'s generated descriptions only ever use the two words together, as "a Mad Scientist". On real text the phrase count would usually be the smaller one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Phrase search', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'sakila-067',
    dataset: 'sakila',
    level: 5,
    topics: ['triggers'],
    title: 'Touch last_update on every change',
    prompt:
      'film.last_update should change whenever a film row is updated. Make sure it does, then raise film 1\'s rental rate and check that last_update moved past 2006-02-15 (the original load date).',
    orderMatters: false,
    checkSql: `update film set rental_rate = rental_rate + 1 where film_id = 1;
select film_id, last_update > timestamp '2006-02-16' as touched from film where film_id = 1`,
    checkSqlMysql: `update film set rental_rate = rental_rate + 1 where film_id = 1;
select film_id, last_update > '2006-02-16' as touched from film where film_id = 1`,
    solutions: [
      {
        approach: 'BEFORE UPDATE trigger / ON UPDATE',
        postgres: `create function touch_last_update() returns trigger
language plpgsql
as $$
begin
  new.last_update := now();
  return new;
end;
$$;

create trigger film_touch_last_update
before update on film
for each row execute function touch_last_update();`,
        mysql: `-- Nothing to do: the column is already defined as
-- last_update timestamp not null default current_timestamp on update current_timestamp
show create table film;`,
        mysqlNote: 'MySQL\'s ON UPDATE CURRENT_TIMESTAMP keeps the column current automatically; Sakila\'s MySQL schema uses it on every table.',
        explanation:
          'PostgreSQL has no ON UPDATE clause for columns; a small BEFORE UPDATE trigger that sets NEW.last_update does the same job. The same trigger function can be attached to every table that has the column.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Automatic initialization and updating for TIMESTAMP', url: MY + 'timestamp-initialization.html' },
    ],
  },
  {
    id: 'sakila-068',
    dataset: 'sakila',
    level: 4,
    topics: ['views'],
    title: 'A view without personal data',
    prompt:
      'Analysts may see customers but not their email or address. Create a view customer_public (customer_id, store_id, first_name, active, create_date) and show how many active customers each store has through it.',
    orderMatters: true,
    checkSql: `select store_id, sum(active) as active_customers from customer_public group by store_id order by store_id`,
    solutions: [
      {
        approach: 'A view that leaves columns out',
        postgres: `create view customer_public as
select customer_id, store_id, first_name, active, create_date
from customer;`,
        mysql: `create view customer_public as
select customer_id, store_id, first_name, active, create_date
from customer;`,
        explanation:
          'Grant analysts SELECT on the view and nothing on the table, and they cannot read the hidden columns. A view is the classic tool for column-level access control.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: Access control for views', url: MY + 'view-restrictions.html' },
    ],
  },
  {
    id: 'sakila-069',
    dataset: 'sakila',
    level: 2,
    topics: ['full-join'],
    title: 'Films rented in July, August or both',
    prompt: 'Count the films rented in July 2005 and in August 2005, only in July, and only in August, in one row.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two months',
        postgres: `with jul as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where r.rental_date >= '2005-07-01' and r.rental_date < '2005-08-01'
),
aug as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where r.rental_date >= '2005-08-01' and r.rental_date < '2005-09-01'
)
select count(*) filter (where j.film_id is not null and a.film_id is not null) as both_months,
       count(*) filter (where a.film_id is null) as only_july,
       count(*) filter (where j.film_id is null) as only_august
from jul j
full join aug a on a.film_id = j.film_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Each side is the set of films rented that month; FULL JOIN pairs them up and keeps films found on one side only.',
      },
      {
        approach: 'One flag per month',
        postgres: `select sum(case when jul = 1 and aug = 1 then 1 else 0 end) as both_months,
       sum(case when jul = 1 and aug = 0 then 1 else 0 end) as only_july,
       sum(case when jul = 0 and aug = 1 then 1 else 0 end) as only_august
from (
  select i.film_id,
         max(case when r.rental_date >= '2005-07-01' and r.rental_date < '2005-08-01' then 1 else 0 end) as jul,
         max(case when r.rental_date >= '2005-08-01' and r.rental_date < '2005-09-01' then 1 else 0 end) as aug
  from rental r join inventory i on i.inventory_id = r.inventory_id
  where r.rental_date >= '2005-07-01' and r.rental_date < '2005-09-01'
  group by i.film_id
) f;`,
        mysql: `select sum(jul = 1 and aug = 1) as both_months,
       sum(jul = 1 and aug = 0) as only_july,
       sum(jul = 0 and aug = 1) as only_august
from (
  select i.film_id,
         max(r.rental_date >= '2005-07-01' and r.rental_date < '2005-08-01') as jul,
         max(r.rental_date >= '2005-08-01' and r.rental_date < '2005-09-01') as aug
  from rental r join inventory i on i.inventory_id = r.inventory_id
  where r.rental_date >= '2005-07-01' and r.rental_date < '2005-09-01'
  group by i.film_id
) f;`,
        explanation: 'Group both months together and keep a 0/1 flag per month for every film.',
      },
    ],
    comparison: 'Same counts. Most films rent in both busy months; the FULL JOIN version reads like a Venn diagram.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'sakila-070',
    dataset: 'sakila',
    level: 4,
    topics: ['temp-tables', 'self-cross-join'],
    title: 'A temp table joined to itself',
    prompt:
      'Put each actor\'s number of films into a temporary table actor_films (actor_id, films). Then count the pairs of different actors with exactly the same number of films, which needs the temp table twice in one query.',
    orderMatters: false,
    checkSql: `select count(*) as pairs from actor_films a join actor_films b on b.films = a.films and b.actor_id > a.actor_id`,
    checkSqlMysql: `select count(*) as pairs from actor_films a join actor_films_copy b on b.films = a.films and b.actor_id > a.actor_id`,
    solutions: [
      {
        approach: 'Temp table (and a copy in MySQL)',
        postgres: `create temp table actor_films as
select actor_id, count(*) as films from film_actor group by actor_id;`,
        mysql: `create temporary table actor_films as
select actor_id, count(*) as films from film_actor group by actor_id;

create temporary table actor_films_copy as select * from actor_films;`,
        mysqlNote:
          'A MySQL temporary table can be referenced only once per query: a self-join fails with "Can\'t reopen table". The usual fix is a second copy, as here, or a CTE instead of the temp table.',
        explanation: 'In PostgreSQL a temporary table behaves like any table, so joining it to itself is fine.',
      },
    ],
    docs: [
      { label: 'MySQL: Temporary table problems', url: MY + 'temporary-table-problems.html' },
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
    ],
  },
  {
    id: 'sakila-071',
    dataset: 'sakila',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for inactive customers',
    prompt: 'A win-back campaign repeatedly lists inactive customers (active = 0) by last name. Create an index that holds only them.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'customer' and indexdef like '%active%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'customer' and column_name = 'active'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index customer_inactive_idx on customer (last_name) where active = 0;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: '15 of 599 customers are inactive; the index holds just those, sorted by name.',
      },
      {
        approach: 'Composite index',
        postgres: `create index customer_active_last_name_idx on customer (active, last_name);`,
        mysql: `create index customer_active_last_name_idx on customer (active, last_name);`,
        explanation: 'active first, so "active = 0 order by last_name" is one sorted range.',
      },
    ],
    comparison: 'Both serve the list; the partial index is 40 times smaller here.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'sakila-072',
    dataset: 'sakila',
    level: 4,
    topics: ['json', 'dml'],
    title: 'Change one key inside JSON',
    prompt:
      'Add a JSON column prefs to customer, defaulting to {"newsletter": true, "language": "en"}. Then switch customer 1\'s newsletter to false without touching the other keys.',
    orderMatters: true,
    checkSql: `select customer_id, prefs->>'newsletter' as newsletter, prefs->>'language' as language from customer where customer_id in (1, 2) order by customer_id`,
    checkSqlMysql: `select customer_id, prefs->>'$.newsletter' as newsletter, prefs->>'$.language' as language from customer where customer_id in (1, 2) order by customer_id`,
    solutions: [
      {
        approach: 'jsonb_set / JSON_SET',
        postgres: `alter table customer add column prefs jsonb not null default '{"newsletter": true, "language": "en"}';

update customer set prefs = jsonb_set(prefs, '{newsletter}', 'false') where customer_id = 1;`,
        mysql: `alter table customer add column prefs json not null default ('{"newsletter": true, "language": "en"}');

update customer set prefs = json_set(prefs, '$.newsletter', false) where customer_id = 1;`,
        mysqlNote: 'A JSON column default must be an expression in parentheses (MySQL 8.0.13+). JSON_SET takes a path string; MySQL\'s false becomes JSON false.',
        explanation:
          'jsonb_set(document, path, new_value) returns a copy with one key replaced; the path is a text array, {newsletter}. Both read back as "false"/"true" text with ->> (MySQL shows booleans the same way).',
      },
    ],
    docs: [
      { label: 'PostgreSQL: jsonb_set', url: PG + 'functions-json.html#FUNCTIONS-JSON-PROCESSING' },
      { label: 'MySQL: JSON_SET', url: MY + 'json-modification-functions.html#function_json-set' },
    ],
  },
  {
    id: 'sakila-073',
    dataset: 'sakila',
    level: 3,
    topics: ['subtotals'],
    title: 'Payments by store and month, with totals',
    prompt: 'Sum payments by store (through the staff member who took them) and month (YYYY-MM), with a subtotal per store and a grand total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(s.store_id::text, 'All stores') as store,
       coalesce(to_char(p.payment_date, 'YYYY-MM'), 'All months') as month,
       sum(p.amount) as amount
from payment p
join staff s on s.staff_id = p.staff_id
group by rollup (s.store_id, to_char(p.payment_date, 'YYYY-MM'))
order by grouping(s.store_id), s.store_id, grouping(to_char(p.payment_date, 'YYYY-MM')), month;`,
        mysql: `select coalesce(store_id, 'All stores') as store, coalesce(month, 'All months') as month, sum(amount) as amount
from (
  select s.store_id, date_format(p.payment_date, '%Y-%m') as month, p.amount
  from payment p join staff s on s.staff_id = p.staff_id
) x
group by store_id, month with rollup
order by grouping(store_id), store_id, grouping(month), month;`,
        mysqlNote: 'The month is computed in a derived table first: MySQL refuses some expressions over rolled-up values under ONLY_FULL_GROUP_BY.',
        explanation: 'store_id is a number, so it is cast to text before coalesce can put "All stores" in the same column.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'sakila-074',
    dataset: 'sakila',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'A table for staff notes',
    prompt:
      'Create staff_note: an id generated by the database, staff_id referencing staff, a note text that cannot be empty, a priority that is low, normal or high (default normal), and created_at defaulting to now. Add one note for staff 1.',
    orderMatters: true,
    checkSql: `select id, staff_id, note, priority from staff_note order by id`,
    solutions: [
      {
        approach: 'Identity, FK, CHECKs and DEFAULTs',
        postgres: `create table staff_note (
  id         integer generated always as identity primary key,
  staff_id   integer   not null references staff (staff_id),
  note       text      not null check (length(trim(note)) > 0),
  priority   text      not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamp not null default now()
);

insert into staff_note (staff_id, note) values (1, 'Training on the new till');`,
        mysql: `create table staff_note (
  id         int auto_increment primary key,
  staff_id   tinyint unsigned not null,
  note       text     not null check (length(trim(note)) > 0),
  priority   enum('low', 'normal', 'high') not null default 'normal',
  created_at datetime not null default current_timestamp,
  foreign key (staff_id) references staff (staff_id)
);

insert into staff_note (staff_id, note) values (1, 'Training on the new till');`,
        mysqlNote: 'staff.staff_id is TINYINT UNSIGNED in Sakila, and a foreign key needs the same type. ENUM is MySQL\'s built-in list of allowed values; a CHECK works too.',
        explanation: 'NOT NULL alone would accept an empty string; the CHECK on trim(note) rejects blank notes too. Defaults fill priority and created_at when the insert leaves them out.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE', url: PG + 'sql-createtable.html' }],
  },
  {
    id: 'sakila-075',
    dataset: 'sakila',
    level: 3,
    topics: ['recursive', 'self-cross-join'],
    title: 'Degrees of Penelope Guiness',
    prompt:
      'Two actors are connected if they appeared in the same film. Starting from actor 1, count how many other actors are at distance 1 and at distance 2 (each actor counted once, at the smallest distance).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive walk with a depth limit',
        postgres: `with recursive reach (actor_id, depth) as (
  select 1, 0
  union
  select b.actor_id, r.depth + 1
  from reach r
  join film_actor a on a.actor_id = r.actor_id
  join film_actor b on b.film_id = a.film_id and b.actor_id <> a.actor_id
  where r.depth < 2
)
select depth, count(*) as actors
from (select actor_id, min(depth) as depth from reach group by actor_id) best
where depth > 0
group by depth
order by depth;`,
        mysql: `with recursive reach (actor_id, depth) as (
  select 1, 0
  union
  select b.actor_id, r.depth + 1
  from reach r
  join film_actor a on a.actor_id = r.actor_id
  join film_actor b on b.film_id = a.film_id and b.actor_id <> a.actor_id
  where r.depth < 2
)
select depth, count(*) as actors
from (select actor_id, min(depth) as depth from reach group by actor_id) best
where depth > 0
group by depth
order by depth;`,
        explanation:
          'Each step goes actor → film → co-star. UNION removes repeated (actor, depth) pairs so the walk does not explode, and min(depth) keeps the shortest distance. In Sakila everyone is at most two films away from Penelope: 79 direct co-stars, the other 120 one step further.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH RECURSIVE', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'sakila-076',
    dataset: 'sakila',
    level: 3,
    topics: ['pivot'],
    title: 'Ratings by category',
    prompt: 'For each film category, count its films per rating (G, PG, PG-13, R, NC-17) as five columns, ordered by category name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts',
        postgres: `select c.name as category,
       count(*) filter (where f.rating = 'G')     as g,
       count(*) filter (where f.rating = 'PG')    as pg,
       count(*) filter (where f.rating = 'PG-13') as pg_13,
       count(*) filter (where f.rating = 'R')     as r,
       count(*) filter (where f.rating = 'NC-17') as nc_17
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
group by c.name
order by c.name;`,
        mysql: `select c.name as category,
       sum(f.rating = 'G')     as g,
       sum(f.rating = 'PG')    as pg,
       sum(f.rating = 'PG-13') as pg_13,
       sum(f.rating = 'R')     as r,
       sum(f.rating = 'NC-17') as nc_17
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
group by c.name
order by c.name;`,
        mysqlNote: 'rating is an ENUM in MySQL; comparing it with a string works as usual.',
        explanation: 'Each rating value becomes a column; the column names must be valid identifiers, so PG-13 becomes pg_13.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'sakila-077',
    dataset: 'sakila',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Return a film, charge a late fee',
    prompt:
      'Write a procedure return_film(p_rental_id, p_returned_at) that sets the return date and, if the film is returned after rental_duration days, inserts a late-fee payment of 1.00 per extra full day. Return rental 1 on 2005-06-05 12:00.',
    orderMatters: false,
    checkSql: `call return_film(1, '2005-06-05 12:00:00');
select r.return_date, (select sum(amount) from payment p where p.rental_id = 1) as paid_for_rental
from rental r where r.rental_id = 1`,
    solutions: [
      {
        approach: 'Compute the fee, then decide',
        postgres: `create procedure return_film(p_rental_id integer, p_returned_at timestamp)
language plpgsql
as $$
declare
  v_days_late integer;
  v_customer integer;
begin
  select floor(extract(epoch from p_returned_at - (r.rental_date + make_interval(days => f.rental_duration))) / 86400)::int,
         r.customer_id
    into v_days_late, v_customer
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.rental_id = p_rental_id;

  update rental set return_date = p_returned_at where rental_id = p_rental_id;

  if v_days_late > 0 then
    insert into payment (customer_id, staff_id, rental_id, amount, payment_date)
    values (v_customer, 1, p_rental_id, v_days_late * 1.00, p_returned_at);
  end if;
end;
$$;`,
        mysql: `create procedure return_film(p_rental_id int, p_returned_at datetime)
begin
  declare v_days_late int;
  declare v_customer int;

  select floor(timestampdiff(second, r.rental_date + interval f.rental_duration day, p_returned_at) / 86400),
         r.customer_id
    into v_days_late, v_customer
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.rental_id = p_rental_id;

  update rental set return_date = p_returned_at where rental_id = p_rental_id;

  if v_days_late > 0 then
    insert into payment (customer_id, staff_id, rental_id, amount, payment_date)
    values (v_customer, 1, p_rental_id, v_days_late * 1.00, p_returned_at);
  end if;
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'Rental 1 started on 2005-05-24 22:53 for a film rented for 7 days, so it was due on 31 May 22:53. Returned on 5 June 12:00 it is 4 full days late: a 4.00 fee joins the 2.99 already paid, 6.99 in total. (In the real data it came back on 26 May; the exercise pretends otherwise.)',
      },
    ],
    docs: [{ label: 'PostgreSQL: PL/pgSQL', url: PG + 'plpgsql.html' }],
  },
  {
    id: 'sakila-078',
    dataset: 'sakila',
    level: 1,
    topics: ['select-basics'],
    title: 'Long R-rated films',
    prompt: 'List the R-rated films longer than 3 hours: title and length, longest first (ties by title).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two conditions',
        postgres: `select title, length
from film
where rating = 'R' and length > 180
order by length desc, title;`,
        mysql: `select title, length
from film
where rating = 'R' and length > 180
order by length desc, title;`,
        explanation: 'Sakila titles are upper-case ASCII, so ordering by title is the same in both databases here.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ORDER BY', url: PG + 'queries-order.html' }],
  },
  {
    id: 'sakila-079',
    dataset: 'sakila',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Move a copy to the other store',
    prompt:
      'Move inventory copy 1 from store 1 to store 2, but only if it is not rented out at the moment; lock the copy first so it cannot be rented meanwhile. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select inventory_id, store_id from inventory where inventory_id = 1`,
    solutions: [
      {
        approach: 'Lock, check, update',
        postgres: `select inventory_id from inventory where inventory_id = 1 for update;

update inventory set store_id = 2
where inventory_id = 1
  and not exists (select 1 from rental where inventory_id = 1 and return_date is null);`,
        mysql: `start transaction;

select inventory_id from inventory where inventory_id = 1 for update;

update inventory set store_id = 2
where inventory_id = 1
  and not exists (select 1 from rental where inventory_id = 1 and return_date is null);

commit;`,
        explanation:
          'A clerk renting the copy has to lock it too (or insert a rental referencing it, which takes a key share lock), so check and move happen without anyone slipping in between. Copy 1 is in the store, so it moves.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' }],
  },
  {
    id: 'sakila-080',
    dataset: 'sakila',
    level: 5,
    topics: ['partitioning'],
    title: 'Customers split by store',
    prompt: 'Create customer_by_store (customer_id, store_id, first_name, last_name, email, active) list-partitioned by store_id (1 and 2) and copy the customers into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'customer_by_store'::regclass) as partitions,
       (select count(*) from customer_by_store) as total_rows,
       (select count(*) from customer_by_store where store_id = 1) as store_1`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'customer_by_store') as partitions,
       (select count(*) from customer_by_store) as total_rows,
       (select count(*) from customer_by_store where store_id = 1) as store_1`,
    solutions: [
      {
        approach: 'LIST by store',
        postgres: `create table customer_by_store (
  customer_id integer not null,
  store_id    integer not null,
  first_name  varchar(45) not null,
  last_name   varchar(45) not null,
  email       varchar(50),
  active      smallint not null,
  primary key (customer_id, store_id)
) partition by list (store_id);

create table customer_store_1 partition of customer_by_store for values in (1);
create table customer_store_2 partition of customer_by_store for values in (2);

insert into customer_by_store select customer_id, store_id, first_name, last_name, email, active from customer;`,
        mysql: `create table customer_by_store (
  customer_id int not null,
  store_id    int not null,
  first_name  varchar(45) not null,
  last_name   varchar(45) not null,
  email       varchar(50),
  active      tinyint not null,
  primary key (customer_id, store_id)
)
partition by list (store_id) (
  partition p_store_1 values in (1),
  partition p_store_2 values in (2)
);

insert into customer_by_store select customer_id, store_id, first_name, last_name, email, active from customer;`,
        explanation: 'Each store\'s customers sit in their own partition: queries for one store read one partition, and a third store is one more partition.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'sakila-081',
    dataset: 'sakila',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'Love and hearts in titles',
    prompt:
      'LIKE \'%LOVE%\' or \'%HEART%\' finds 17 film titles, some only because the letters appear inside another word. Make titles searchable by word and count the films with the word LOVE or the word HEART.',
    orderMatters: false,
    checkSql: `select count(*) as films from film where to_tsvector('simple', title) @@ to_tsquery('simple', 'love | heart')`,
    checkSqlMysql: `select count(*) as films from film where match(title) against ('love heart' in boolean mode)`,
    solutions: [
      {
        approach: 'Full-text index on titles',
        postgres: `create index film_title_fts on film using gin (to_tsvector('simple', title));`,
        mysql: `create fulltext index film_title_ft on film (title);`,
        explanation: 'Whole words only: GLOVES no longer counts as LOVE. Searches are case-insensitive, because both databases lower-case the words when indexing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'sakila-082',
    dataset: 'sakila',
    level: 1,
    topics: ['limit'],
    title: 'Customers ranked 6 to 10',
    prompt: 'Rank customers by total payments and show places 6 to 10: customer_id and total (ties by customer_id).',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIMIT … OFFSET after GROUP BY',
        postgres: `select customer_id, sum(amount) as total
from payment
group by customer_id
order by total desc, customer_id
limit 5 offset 5;`,
        mysql: `select customer_id, sum(amount) as total
from payment
group by customer_id
order by total desc, customer_id
limit 5 offset 5;`,
        explanation: 'LIMIT and OFFSET apply last, after grouping and sorting: they cut the finished, ordered result.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'sakila-083',
    dataset: 'sakila',
    level: 2,
    topics: ['casting', 'conditions'],
    title: 'Postal codes as numbers, safely',
    prompt:
      'Group addresses by postal code as a number: "under 10000", "10000-49999", "50000 and up", and "not a number" for codes that are empty or contain anything but digits. Show bucket and count, ordered by bucket.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Check with a pattern, then cast',
        postgres: `select case
         when postal_code is null or postal_code !~ '^[0-9]+$' then 'not a number'
         when postal_code::integer < 10000 then 'under 10000'
         when postal_code::integer < 50000 then '10000-49999'
         else '50000 and up'
       end as bucket,
       count(*) as addresses
from address
group by bucket
order by bucket;`,
        mysql: `select case
         when postal_code is null or postal_code not regexp '^[0-9]+$' then 'not a number'
         when cast(postal_code as unsigned) < 10000 then 'under 10000'
         when cast(postal_code as unsigned) < 50000 then '10000-49999'
         else '50000 and up'
       end as bucket,
       count(*) as addresses
from address
group by bucket
order by bucket;`,
        mysqlNote:
          'MySQL would not fail on cast(\'\' as unsigned): it returns 0 with a warning, so the 4 empty codes would quietly land in "under 10000". The pattern check is what keeps them out.',
        explanation:
          'In PostgreSQL \'\'::integer is an error, and so is any code with a letter. CASE tests its branches in order, so the cast only runs on values that passed the digit check. A WHERE with "pattern AND cast" gives no such promise: the planner may evaluate the cast first.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' },
      { label: 'MySQL: Type conversion', url: MY + 'type-conversion.html' },
    ],
  },
  {
    id: 'sakila-084',
    dataset: 'sakila',
    level: 1,
    topics: ['null', 'conditions'],
    title: 'Empty or unknown second lines',
    prompt:
      'address2 is the optional second address line. Count addresses where it is NULL, where it is an empty string, and where it is "missing" in either way.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Three conditional counts',
        postgres: `select count(*) filter (where address2 is null) as is_null,
       count(*) filter (where address2 = '') as is_empty,
       count(*) filter (where coalesce(address2, '') = '') as missing
from address;`,
        mysql: `select sum(address2 is null) as is_null,
       sum(address2 = '') as is_empty,
       sum(coalesce(address2, '') = '') as missing
from address;`,
        mysqlNote: 'No FILTER in MySQL; a comparison is 1 or 0, so SUM counts the matches.',
        explanation:
          'NULL and \'\' are different values: "address2 = \'\'" does not match NULL, and "address2 is null" does not match \'\'. Data loaded from several sources often mixes both; COALESCE(address2, \'\') = \'\' catches either. Better still, pick one convention and enforce it with a CHECK.',
      },
    ],
    docs: [{ label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' }],
  },
  {
    id: 'sakila-085',
    dataset: 'sakila',
    level: 3,
    topics: ['cte', 'ranking'],
    title: 'Each customer\'s favourite category',
    prompt:
      'For customers 1 to 5: the film category they rented most often, and how many rentals that was. On a tie, take the alphabetically first category. Order by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Count in one CTE, rank in the next',
        postgres: `with per_category as (
  select r.customer_id, c.name as category, count(*) as rentals
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film_category fc on fc.film_id = i.film_id
  join category c on c.category_id = fc.category_id
  where r.customer_id between 1 and 5
  group by r.customer_id, c.name
),
ranked as (
  select customer_id, category, rentals,
         row_number() over (partition by customer_id order by rentals desc, category) as n
  from per_category
)
select customer_id, category, rentals
from ranked
where n = 1
order by customer_id;`,
        mysql: `with per_category as (
  select r.customer_id, c.name as category, count(*) as rentals
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film_category fc on fc.film_id = i.film_id
  join category c on c.category_id = fc.category_id
  where r.customer_id between 1 and 5
  group by r.customer_id, c.name
),
ranked as (
  select customer_id, category, rentals,
         row_number() over (partition by customer_id order by rentals desc, category) as n
  from per_category
)
select customer_id, category, rentals
from ranked
where n = 1
order by customer_id;`,
        explanation:
          'The first CTE answers "how many per category", the second "which is first", and the final query only filters. Each step can be run and checked on its own, which is the main reason to write queries this way.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'sakila-086',
    dataset: 'sakila',
    level: 3,
    topics: ['pivot', 'dates-basics'],
    title: 'Rentals per month, one column per store',
    prompt: 'For each month with rentals (YYYY-MM): rentals at store 1, at store 2, and in total. Store is the store of the rented inventory item.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts per store',
        postgres: `select to_char(r.rental_date, 'YYYY-MM') as month,
       count(*) filter (where i.store_id = 1) as store_1,
       count(*) filter (where i.store_id = 2) as store_2,
       count(*) as total
from rental r
join inventory i on i.inventory_id = r.inventory_id
group by month
order by month;`,
        mysql: `select date_format(r.rental_date, '%Y-%m') as month,
       sum(i.store_id = 1) as store_1,
       sum(i.store_id = 2) as store_2,
       count(*) as total
from rental r
join inventory i on i.inventory_id = r.inventory_id
group by month
order by month;`,
        explanation:
          'Five months come out: the data has rentals from May to August 2005 and a few in February 2006, nothing in between. The stores are always close, a sign of generated sample data rather than two real shops.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'sakila-087',
    dataset: 'sakila',
    level: 4,
    topics: ['normalization', 'joins'],
    title: 'A customer stored twice',
    prompt:
      'payment has a customer_id, and so does the rental it pays for. Check whether the two ever disagree, then explain what a design without payment.customer_id would need.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Join and compare the duplicated column',
        postgres: `select count(*) as payments,
       count(*) filter (where p.customer_id <> r.customer_id) as mismatches
from payment p
join rental r on r.rental_id = p.rental_id;`,
        mysql: `select count(*) as payments,
       sum(p.customer_id <> r.customer_id) as mismatches
from payment p
join rental r on r.rental_id = p.rental_id;`,
        explanation:
          'payment.customer_id can be derived from payment.rental_id → rental.customer_id, so storing it again is redundancy (a transitive dependency, which third normal form removes). Here all 16,044 payments agree, but nothing in the schema guarantees it: one wrong UPDATE would make them disagree. Without the column, "payments per customer" needs a join through rental; the duplicate saves that join, at the cost of a consistency rule you have to enforce yourself.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Constraints', url: PG + 'ddl-constraints.html' }],
  },
  {
    id: 'sakila-088',
    dataset: 'sakila',
    level: 4,
    topics: ['arrays', 'json'],
    title: 'Films with both actors in the cast',
    prompt: 'Build each film\'s cast as a list of actor ids, then find the films whose cast contains both actor 1 and actor 10. Show film_id and title.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg and @> / JSON_ARRAYAGG and JSON_CONTAINS',
        postgres: `with casts as (
  select film_id, array_agg(actor_id) as actor_ids
  from film_actor
  group by film_id
)
select f.film_id, f.title
from casts c
join film f on f.film_id = c.film_id
where c.actor_ids @> array[1, 10]
order by f.film_id;`,
        mysql: `with casts as (
  select film_id, json_arrayagg(actor_id) as actor_ids
  from film_actor
  group by film_id
)
select f.film_id, f.title
from casts c
join film f on f.film_id = c.film_id
where json_contains(c.actor_ids, '[1, 10]')
order by f.film_id;`,
        mysqlNote: 'No arrays in MySQL: a JSON array plays the role, and JSON_CONTAINS(target, candidate) checks that every element of the candidate is in it.',
        explanation:
          '@> means "contains": the order of elements does not matter. Two films, ACADEMY DINOSAUR and WIZARD COLDBLOODED, have both. A plain join would do the same (film_actor twice); the array form shines when the list to check comes from the user.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' },
      { label: 'MySQL: JSON_CONTAINS', url: MY + 'json-search-functions.html#function_json-contains' },
    ],
  },
  {
    id: 'sakila-089',
    dataset: 'sakila',
    level: 1,
    topics: ['distinct', 'null'],
    title: 'Who still has a film at home',
    prompt: 'How many rentals have not been returned (return_date is NULL), and by how many different customers?',
    orderMatters: false,
    solutions: [
      {
        approach: 'IS NULL with COUNT(DISTINCT …)',
        postgres: `select count(*) as open_rentals, count(distinct customer_id) as customers
from rental
where return_date is null;`,
        mysql: `select count(*) as open_rentals, count(distinct customer_id) as customers
from rental
where return_date is null;`,
        explanation:
          '"return_date = NULL" would find nothing, because a comparison with NULL is never true; IS NULL is the test. 183 open rentals belong to 159 customers, so a few customers have more than one film out.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison predicates', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'sakila-090',
    dataset: 'sakila',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'The genres of each actor',
    prompt: 'For actors 1 to 3: first_name, last_name, how many different categories their films belong to, and those categories in one line, alphabetically, separated by ", ".',
    orderMatters: true,
    solutions: [
      {
        approach: 'Distinct aggregation over a three-table join',
        postgres: `select a.actor_id, a.first_name, a.last_name,
       count(distinct c.name) as categories,
       string_agg(distinct c.name, ', ' order by c.name) as category_list
from actor a
join film_actor fa on fa.actor_id = a.actor_id
join film_category fc on fc.film_id = fa.film_id
join category c on c.category_id = fc.category_id
where a.actor_id between 1 and 3
group by a.actor_id, a.first_name, a.last_name
order by a.actor_id;`,
        mysql: `select a.actor_id, a.first_name, a.last_name,
       count(distinct c.name) as categories,
       group_concat(distinct c.name order by c.name separator ', ') as category_list
from actor a
join film_actor fa on fa.actor_id = a.actor_id
join film_category fc on fc.film_id = fa.film_id
join category c on c.category_id = fc.category_id
where a.actor_id between 1 and 3
group by a.actor_id, a.first_name, a.last_name
order by a.actor_id;`,
        explanation:
          'An actor with three comedies would list Comedy three times without DISTINCT. Nick Wahlberg covers 14 of the 16 categories, Ed Chase 10.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'sakila-091',
    dataset: 'sakila',
    level: 3,
    topics: ['lateral', 'ranking'],
    title: 'Top 3 films of each store',
    prompt: 'For each store, the 3 most rented films (by rentals of that store\'s copies): store_id, film_id, title and rentals. On a tie, lower film_id first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL subquery per store',
        postgres: `select s.store_id, top.film_id, top.title, top.rentals
from store s
cross join lateral (
  select f.film_id, f.title, count(*) as rentals
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where i.store_id = s.store_id
  group by f.film_id, f.title
  order by rentals desc, f.film_id
  limit 3
) top
order by s.store_id, top.rentals desc, top.film_id;`,
        mysql: `select s.store_id, top.film_id, top.title, top.rentals
from store s
cross join lateral (
  select f.film_id, f.title, count(*) as rentals
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where i.store_id = s.store_id
  group by f.film_id, f.title
  order by rentals desc, f.film_id
  limit 3
) top
order by s.store_id, top.rentals desc, top.film_id;`,
        explanation:
          'The lateral subquery runs once per store with that store\'s id, so "top 3" is a plain ORDER BY … LIMIT inside it. The window-function version (ROW_NUMBER per store, keep ≤ 3) gives the same rows; LATERAL tends to win when there are few groups and an index to reach each group\'s rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'sakila-092',
    dataset: 'sakila',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Deactivate a customer, but not with films at home',
    prompt:
      'Write a procedure deactivate_customer(p_customer_id) that sets active = 0, but raises an error if the customer still has unreturned rentals. Deactivate customer 1.',
    orderMatters: false,
    checkSql: `select customer_id, active from customer where customer_id = 1`,
    solutions: [
      {
        approach: 'EXISTS check, then update',
        postgres: `create procedure deactivate_customer(p_customer_id integer)
language plpgsql
as $$
begin
  if exists (select 1 from rental where customer_id = p_customer_id and return_date is null) then
    raise exception 'customer % still has films at home', p_customer_id;
  end if;

  update customer set active = 0 where customer_id = p_customer_id;
end;
$$;

call deactivate_customer(1);`,
        mysql: `create procedure deactivate_customer(p_customer_id int)
begin
  if exists (select 1 from rental where customer_id = p_customer_id and return_date is null) then
    signal sqlstate '45000' set message_text = 'customer still has films at home';
  end if;

  update customer set active = 0 where customer_id = p_customer_id;
end;

call deactivate_customer(1);`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'Customer 1 has returned everything, so the update runs. Customer 15 has two films out: deactivate_customer(15) would stop with the error and change nothing. EXISTS stops at the first open rental instead of counting them all.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'sakila-093',
    dataset: 'sakila',
    level: 4,
    topics: ['temp-tables', 'dates-advanced'],
    title: 'Late returns, collected once',
    prompt:
      'A rental is late when return_date is after rental_date plus the film\'s rental_duration days. Put the late rentals into a temporary table late_rentals (rental_id, store_id, days_late). Then: late rentals and average days late per store.',
    orderMatters: true,
    checkSql: `select store_id, count(*) as late_rentals, round(avg(days_late), 1) as avg_days_late from late_rentals group by store_id order by store_id`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS with date arithmetic',
        postgres: `create temporary table late_rentals as
select r.rental_id, i.store_id,
       r.return_date::date - (r.rental_date + make_interval(days => f.rental_duration))::date as days_late
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
where r.return_date > r.rental_date + make_interval(days => f.rental_duration);`,
        mysql: `create temporary table late_rentals as
select r.rental_id, i.store_id,
       datediff(r.return_date, r.rental_date + interval f.rental_duration day) as days_late
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
where r.return_date > r.rental_date + interval f.rental_duration day;`,
        mysqlNote: 'INTERVAL accepts a column as the amount: rental_date + INTERVAL rental_duration DAY.',
        explanation:
          'make_interval(days => n) builds an interval from a column, which a literal like interval \'3 days\' cannot. Half of all rentals come back late (8,121 of 16,044), split evenly between the stores. days_late counts calendar days, so a film due at 22:00 and returned at 08:00 the next morning is one day late.',
      },
    ],
    docs: [{ label: 'PostgreSQL: make_interval', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'sakila-094',
    dataset: 'sakila',
    level: 4,
    topics: ['materialized-views', 'joins'],
    title: 'Copies on the shelf, stored',
    prompt:
      'Store, per film and store, how many copies exist and how many are out (rented, not returned): film_id, store_id, copies, out_now. Then: the films with every copy of a store out right now.',
    orderMatters: true,
    checkSql: `select film_id, store_id, copies, out_now from film_stock where out_now = copies order by film_id, store_id`,
    solutions: [
      {
        approach: 'Materialized view with a unique index',
        postgres: `create materialized view film_stock as
select i.film_id, i.store_id, count(*) as copies,
       count(*) filter (where exists (
         select 1 from rental r where r.inventory_id = i.inventory_id and r.return_date is null
       )) as out_now
from inventory i
group by i.film_id, i.store_id;

create unique index film_stock_key on film_stock (film_id, store_id);`,
        mysql: `create table film_stock (
  film_id  int,
  store_id int,
  copies   int,
  out_now  int,
  primary key (film_id, store_id)
);

replace into film_stock
select i.film_id, i.store_id, count(*),
       sum(exists (select 1 from rental r where r.inventory_id = i.inventory_id and r.return_date is null))
from inventory i
group by i.film_id, i.store_id;`,
        mysqlNote: 'A table filled by REPLACE INTO stands in for the materialized view; EXISTS is 1 or 0, so SUM counts the copies out.',
        explanation:
          'Stock changes with every rental and return, so this summary is stale until refreshed: fine for a nightly report, wrong for the counter at the till, which should query live. The unique index allows REFRESH … CONCURRENTLY.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'sakila-095',
    dataset: 'sakila',
    level: 4,
    topics: ['generated-columns', 'numbers'],
    title: 'Price per rental day',
    prompt: 'Add a stored generated column rate_per_day to film: rental_rate / rental_duration, rounded to 2 decimals. Then: the 3 cheapest films per day (ties by film_id).',
    orderMatters: true,
    checkSql: `select film_id, title, rental_rate, rental_duration, rate_per_day from film order by rate_per_day, film_id limit 3`,
    solutions: [
      {
        approach: 'GENERATED ALWAYS AS … STORED',
        postgres: `alter table film
add column rate_per_day numeric(5, 2)
generated always as (round(rental_rate / rental_duration, 2)) stored;`,
        mysql: `alter table film
add column rate_per_day decimal(5, 2)
generated always as (round(rental_rate / rental_duration, 2)) stored;`,
        explanation:
          'rental_rate is numeric, so the division keeps decimals even though rental_duration is an integer. A 0.99 film kept for 7 days costs 0.14 a day. If either column changes, the database recomputes the value; nobody can forget it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'sakila-096',
    dataset: 'sakila',
    level: 3,
    topics: ['recursive', 'strings'],
    title: 'Split a list with recursion',
    prompt:
      'special_features holds comma-separated values. Without any splitting function, use a recursive CTE to turn the features of films 1 to 3 into rows: film_id, position (1, 2, …) and feature.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Peel off the first item, recurse on the rest',
        postgres: `with recursive parts (film_id, pos, feature, rest) as (
  select film_id, 1,
         split_part(special_features, ',', 1),
         nullif(substr(special_features, strpos(special_features, ',') + 1), special_features)
  from film
  where film_id between 1 and 3
  union all
  select film_id, pos + 1,
         split_part(rest, ',', 1),
         nullif(substr(rest, strpos(rest, ',') + 1), rest)
  from parts
  where rest is not null
)
select film_id, pos, feature
from parts
order by film_id, pos;`,
        mysql: `with recursive parts (film_id, pos, feature, rest) as (
  select film_id, 1,
         cast(substring_index(special_features, ',', 1) as char(100)),
         cast(if(locate(',', special_features) > 0, substring(special_features, locate(',', special_features) + 1), null) as char(100))
  from film
  where film_id between 1 and 3
  union all
  select film_id, pos + 1,
         substring_index(rest, ',', 1),
         if(locate(',', rest) > 0, substring(rest, locate(',', rest) + 1), null)
  from parts
  where rest is not null
)
select film_id, pos, feature
from parts
order by film_id, pos;`,
        mysqlNote: 'The anchor CASTs both text columns wide enough; special_features is a SET in MySQL and is read here as its comma-separated text.',
        explanation:
          'Each step takes the text before the first comma as one feature and carries the remainder on; when no comma is left, the remainder becomes NULL and the recursion stops. In PostgreSQL, strpos returns 0 when there is no comma, so substr(…, 1) gives back the whole string, and NULLIF turns that into NULL. string_to_table or JSON_TABLE do this in one call; the recursive pattern works anywhere.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'sakila-097',
    dataset: 'sakila',
    level: 4,
    topics: ['upsert', 'dates-basics'],
    title: 'The newest score wins',
    prompt:
      'critic_scores (film_id primary key, score, updated_at) holds (1, 7, 2025-01-01) and (2, 5, 2025-03-01). A feed arrives: (1, 8, 2025-02-01), (2, 9, 2025-02-15), (3, 6, 2025-02-01). Upsert it so that a row is only replaced by newer data.',
    orderMatters: true,
    checkSql: `select film_id, score, updated_at from critic_scores order by film_id`,
    solutions: [
      {
        approach: 'Conditional upsert',
        postgres: `create table critic_scores (film_id integer primary key, score integer not null, updated_at date not null);
insert into critic_scores values (1, 7, '2025-01-01'), (2, 5, '2025-03-01');

insert into critic_scores (film_id, score, updated_at)
values (1, 8, '2025-02-01'), (2, 9, '2025-02-15'), (3, 6, '2025-02-01')
on conflict (film_id) do update
  set score = excluded.score, updated_at = excluded.updated_at
  where excluded.updated_at > critic_scores.updated_at;`,
        mysql: `create table critic_scores (film_id int primary key, score int not null, updated_at date not null);
insert into critic_scores values (1, 7, '2025-01-01'), (2, 5, '2025-03-01');

insert into critic_scores (film_id, score, updated_at)
values (1, 8, '2025-02-01'), (2, 9, '2025-02-15'), (3, 6, '2025-02-01') as new
on duplicate key update
  score      = if(new.updated_at > critic_scores.updated_at, new.score, critic_scores.score),
  updated_at = greatest(new.updated_at, critic_scores.updated_at);`,
        mysqlNote:
          'No WHERE in MySQL\'s ON DUPLICATE KEY UPDATE, so each column decides with IF. Order matters: assignments run left to right, so score must be set before updated_at changes.',
        explanation:
          'Feeds arrive out of order; "last writer wins" would let the stale score 9 overwrite the newer 5. Comparing timestamps keeps the newest version: film 1 becomes 8, film 2 stays 5, film 3 is added.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'sakila-098',
    dataset: 'sakila',
    level: 5,
    topics: ['partitioning'],
    title: 'Rentals by quarter, with a catch-all',
    prompt:
      'Create rental_by_quarter (rental_id, rental_date, inventory_id, customer_id) partitioned by rental_date into Q2 2005, Q3 2005 and a partition for everything else. Copy the rentals in.',
    orderMatters: false,
    checkSql: `select (select count(*) from rental_2005_q2) as q2, (select count(*) from rental_2005_q3) as q3, (select count(*) from rental_other) as other`,
    checkSqlMysql: `select (select count(*) from rental_by_quarter partition (p2005_q2)) as q2,
       (select count(*) from rental_by_quarter partition (p2005_q3)) as q3,
       (select count(*) from rental_by_quarter partition (p_other)) as other`,
    solutions: [
      {
        approach: 'Range partitions plus a DEFAULT partition',
        postgres: `create table rental_by_quarter (
  rental_id    integer   not null,
  rental_date  timestamp not null,
  inventory_id integer   not null,
  customer_id  integer   not null,
  primary key (rental_id, rental_date)
) partition by range (rental_date);

create table rental_2005_q2 partition of rental_by_quarter for values from ('2005-04-01') to ('2005-07-01');
create table rental_2005_q3 partition of rental_by_quarter for values from ('2005-07-01') to ('2005-10-01');
create table rental_other   partition of rental_by_quarter default;

insert into rental_by_quarter select rental_id, rental_date, inventory_id, customer_id from rental;`,
        mysql: `create table rental_by_quarter (
  rental_id    int      not null,
  rental_date  datetime not null,
  inventory_id int      not null,
  customer_id  int      not null,
  primary key (rental_id, rental_date)
)
partition by range columns (rental_date) (
  partition p_before   values less than ('2005-04-01'),
  partition p2005_q2   values less than ('2005-07-01'),
  partition p2005_q3   values less than ('2005-10-01'),
  partition p_other    values less than (maxvalue)
);

insert into rental_by_quarter select rental_id, rental_date, inventory_id, customer_id from rental;`,
        mysqlNote: 'MySQL has no DEFAULT partition for RANGE: MAXVALUE catches everything later, and an extra partition everything earlier.',
        explanation:
          'A PostgreSQL DEFAULT partition takes any row that fits no other partition, here the 182 rentals of February 2006. Creating a new partition later checks the default first, and fails if it already holds rows for that range; move them out before adding the partition.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'sakila-099',
    dataset: 'sakila',
    level: 2,
    topics: ['set-operations'],
    title: 'UNION or UNION ALL?',
    prompt: 'Put the first and last names of all actors, customers and staff into one list. How many rows does it have with UNION ALL, and how many with UNION?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Count both forms',
        postgres: `select
  (select count(*) from (
     select first_name, last_name from actor
     union all select first_name, last_name from customer
     union all select first_name, last_name from staff) a) as union_all_rows,
  (select count(*) from (
     select first_name, last_name from actor
     union select first_name, last_name from customer
     union select first_name, last_name from staff) u) as union_rows;`,
        mysql: `select
  (select count(*) from (
     select first_name, last_name from actor
     union all select first_name, last_name from customer
     union all select first_name, last_name from staff) a) as union_all_rows,
  (select count(*) from (
     select first_name, last_name from actor
     union select first_name, last_name from customer
     union select first_name, last_name from staff) u) as union_rows;`,
        explanation:
          'UNION ALL simply appends (801 rows); UNION also removes duplicate rows (799), which costs a sort or hash. The two duplicates are real: the actor table has two different actors named SUSAN DAVIS. Use UNION only when duplicates must go; otherwise UNION ALL is faster and does not hide data.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'sakila-100',
    dataset: 'sakila',
    level: 3,
    topics: ['window-frames', 'dates-basics'],
    title: 'Running total that restarts every month',
    prompt: 'For customer 1\'s payments before July 2005: payment_id, payment_date, amount, and the running total of the amounts within the same calendar month.',
    orderMatters: true,
    solutions: [
      {
        approach: 'PARTITION BY month, frame from the start of the partition',
        postgres: `select payment_id, payment_date, amount,
       sum(amount) over (
         partition by date_trunc('month', payment_date)
         order by payment_date, payment_id
         rows between unbounded preceding and current row
       ) as month_to_date
from payment
where customer_id = 1 and payment_date < '2005-07-01'
order by payment_date, payment_id;`,
        mysql: `select payment_id, payment_date, amount,
       sum(amount) over (
         partition by date_format(payment_date, '%Y-%m')
         order by payment_date, payment_id
         rows between unbounded preceding and current row
       ) as month_to_date
from payment
where customer_id = 1 and payment_date < '2005-07-01'
order by payment_date, payment_id;`,
        explanation:
          'PARTITION BY starts a new window for each month, so the sum restarts on the 1st; the frame "unbounded preceding to current row" makes it a running total. Writing the frame with ROWS avoids the default RANGE behaviour, which would treat payments with equal timestamps as one step.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window function calls', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'sakila-101',
    dataset: 'sakila',
    level: 4,
    topics: ['merge'],
    title: 'Re-categorise films from a list',
    prompt:
      'A curator sends new categories by name: film 1 → Horror, film 2 → Horror, film 3 → Comedy. Each film has one category. Apply the list in one statement, touching only films whose category actually changes.',
    orderMatters: true,
    checkSql: `select fc.film_id, c.name from film_category fc join category c on c.category_id = fc.category_id where fc.film_id in (1, 2, 3) order by fc.film_id`,
    solutions: [
      {
        approach: 'MERGE on film_id, update when different',
        postgres: `merge into film_category fc
using (
  select v.film_id, c.category_id
  from (values (1, 'Horror'), (2, 'Horror'), (3, 'Comedy')) as v (film_id, category)
  join category c on c.name = v.category
) s
on fc.film_id = s.film_id
when matched and fc.category_id <> s.category_id then
  update set category_id = s.category_id, last_update = now()
when not matched then
  insert (film_id, category_id) values (s.film_id, s.category_id);`,
        mysql: `update film_category fc
join (
  select v.film_id, c.category_id
  from (select 1 as film_id, 'Horror' as category union all select 2, 'Horror' union all select 3, 'Comedy') v
  join category c on c.name = v.category collate utf8mb4_0900_ai_ci
) s on s.film_id = fc.film_id
set fc.category_id = s.category_id, fc.last_update = now()
where fc.category_id <> s.category_id;`,
        mysqlNote: 'No MERGE in MySQL; every film here already has a category row, so a joined UPDATE does the job. COLLATE matches the literal names to the table\'s collation.',
        explanation:
          'The feed speaks in names, the table in ids, so the source query translates first. Film 2 is already Horror and is left alone; films 1 and 3 change. Because (film_id, category_id) is the primary key, the UPDATE changes a key column, which is allowed as long as no other row has the new pair.',
      },
    ],
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'sakila-102',
    dataset: 'sakila',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'An index that also sorts',
    prompt:
      'The account page runs: select rental_id, rental_date from rental where customer_id = ? order by rental_date desc limit 5. rental has an index on customer_id alone. Create an index that lets the query stop after 5 rows without sorting.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'rental' and indexdef like '%(customer_id, rental_date%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'rental' and column_name = 'rental_date' and seq_in_index = 2
  and index_name in (select index_name from information_schema.statistics
                     where table_schema = database() and table_name = 'rental' and column_name = 'customer_id' and seq_in_index = 1)`,
    solutions: [
      {
        approach: 'Equality column first, sort column second',
        postgres: `create index rental_customer_date_idx on rental (customer_id, rental_date);

-- explain select rental_id, rental_date from rental where customer_id = 5 order by rental_date desc limit 5;`,
        mysql: `create index rental_customer_date_idx on rental (customer_id, rental_date);

-- explain select rental_id, rental_date from rental where customer_id = 5 order by rental_date desc limit 5;`,
        explanation:
          'Within one customer_id the entries are already ordered by rental_date, and an index can be read backwards, so the newest five are simply the last five entries of that customer: no sort, no reading the customer\'s other rentals. With the customer_id-only index the database fetches all of the customer\'s rentals and sorts them.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Indexes and ORDER BY', url: PG + 'indexes-ordering.html' },
      { label: 'MySQL: ORDER BY optimization', url: MY + 'order-by-optimization.html' },
    ],
  },
  {
    id: 'sakila-103',
    dataset: 'sakila',
    level: 3,
    topics: ['date-series'],
    title: 'The quiet day before the rush',
    prompt: 'For every hour of 16 August 2005 (0 to 23), the number of rentals that started in it, including hours with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Hour series LEFT JOIN rentals',
        postgres: `select h.hour, count(r.rental_id) as rentals
from generate_series(0, 23) as h (hour)
left join rental r
  on r.rental_date >= '2005-08-16' and r.rental_date < '2005-08-17'
 and extract(hour from r.rental_date) = h.hour
group by h.hour
order by h.hour;`,
        mysql: `with recursive hours (hour) as (
  select 0 union all select hour + 1 from hours where hour < 23
)
select h.hour, count(r.rental_id) as rentals
from hours h
left join rental r
  on r.rental_date >= '2005-08-16' and r.rental_date < '2005-08-17'
 and hour(r.rental_date) = h.hour
group by h.hour
order by h.hour;`,
        explanation:
          'Rentals only started at 22:00 that day: 23 in the last two hours, then about 600 a day from the 17th. The day conditions sit in ON, so the 22 empty hours survive the LEFT JOIN as 0.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'sakila-104',
    dataset: 'sakila',
    level: 4,
    topics: ['views', 'joins'],
    title: 'A readable rental view',
    prompt:
      'Create a view rental_details (rental_id, rental_date, return_date, customer, film, store_id) with the customer as "FIRST LAST" and the film title. Then show customer 1\'s first 3 rentals from it.',
    orderMatters: true,
    checkSql: `select rental_id, customer, film, store_id from rental_details where customer = 'MARY SMITH' order by rental_date, rental_id limit 3`,
    solutions: [
      {
        approach: 'A view over four tables',
        postgres: `create view rental_details as
select r.rental_id, r.rental_date, r.return_date,
       c.first_name || ' ' || c.last_name as customer,
       f.title as film, i.store_id
from rental r
join customer c on c.customer_id = r.customer_id
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id;`,
        mysql: `create view rental_details as
select r.rental_id, r.rental_date, r.return_date,
       concat(c.first_name, ' ', c.last_name) as customer,
       f.title as film, i.store_id
from rental r
join customer c on c.customer_id = r.customer_id
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id;`,
        explanation:
          'The view saves every report the same three joins. Filtering on a computed column such as customer is fine for occasional use, but it cannot use an index on the name columns; for frequent lookups filter on customer_id instead and expose it in the view.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'sakila-105',
    dataset: 'sakila',
    level: 4,
    topics: ['arrays', 'window-frames'],
    title: 'Each customer\'s third film',
    prompt: 'For customers 1 to 5, collect the titles they rented in rental order into a list, and show the third element: customer_id and third_film.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg with ORDER BY, then [3]',
        postgres: `select r.customer_id,
       (array_agg(f.title order by r.rental_date, r.rental_id))[3] as third_film
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
where r.customer_id between 1 and 5
group by r.customer_id
order by r.customer_id;`,
        mysql: `select r.customer_id,
       substring_index(substring_index(group_concat(f.title order by r.rental_date, r.rental_id separator '|'), '|', 3), '|', -1) as third_film
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
where r.customer_id between 1 and 5
group by r.customer_id
order by r.customer_id;`,
        mysqlNote: 'No arrays: an ordered GROUP_CONCAT with a separator that never appears in titles, then "everything up to the 3rd item, and of that the last item".',
        explanation:
          'PostgreSQL arrays start at index 1, so [3] is the third rental. The window alternative is ROW_NUMBER() per customer and a filter on 3, which scales better when you need one position from very long lists.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Arrays', url: PG + 'arrays.html' }],
  },
  {
    id: 'sakila-106',
    dataset: 'sakila',
    level: 5,
    topics: ['functions', 'control-flow'],
    title: 'A late fee function',
    prompt:
      'Write late_fee(p_rental_id): 1.00 per calendar day the film came back after rental_date + rental_duration days, capped at the film\'s replacement_cost; 0 if on time; NULL if not returned yet. Test rentals 1, 3 and 11496.',
    orderMatters: false,
    checkSql: `select late_fee(1) as on_time, late_fee(3) as one_day, late_fee(11496) as not_returned`,
    solutions: [
      {
        approach: 'Look up, compute, cap',
        postgres: `create function late_fee(p_rental_id integer) returns numeric
language plpgsql
stable
as $$
declare
  v_days integer;
  v_cap  numeric;
begin
  select r.return_date::date - (r.rental_date + make_interval(days => f.rental_duration))::date, f.replacement_cost
  into v_days, v_cap
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.rental_id = p_rental_id;

  if v_days is null then
    return null;
  end if;
  return least(greatest(v_days, 0) * 1.00, v_cap);
end;
$$;`,
        mysql: `create function late_fee(p_rental_id int) returns decimal(5, 2)
reads sql data
begin
  declare v_days int;
  declare v_cap decimal(5, 2);

  select datediff(r.return_date, r.rental_date + interval f.rental_duration day), f.replacement_cost
  into v_days, v_cap
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.rental_id = p_rental_id;

  if v_days is null then
    return null;
  end if;
  return least(greatest(v_days, 0) * 1.00, v_cap);
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'An open rental has no return_date, so the day difference is NULL and the function says so instead of inventing a fee. greatest(…, 0) turns early returns into 0; least(…) applies the cap. Rental 3 came back one day late.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GREATEST and LEAST', url: PG + 'functions-conditional.html#FUNCTIONS-GREATEST-LEAST' }],
  },
  {
    id: 'sakila-107',
    dataset: 'sakila',
    level: 5,
    topics: ['locks-isolation', 'dml'],
    title: 'Optimistic locking with last_update',
    prompt:
      'Two clerks may edit rental 1 at once. Without holding a lock while the clerk types, record the return_date 2005-05-26 22:10 only if the row\'s last_update is still the value you read (2006-02-15 21:30:53), and bump last_update. Show the row afterwards.',
    orderMatters: false,
    checkSql: `select rental_id, return_date, last_update > '2006-02-15 21:30:53' as was_updated from rental where rental_id = 1`,
    solutions: [
      {
        approach: 'UPDATE … WHERE last_update = the value read',
        postgres: `update rental
set return_date = '2005-05-26 22:10', last_update = now()
where rental_id = 1 and last_update = '2006-02-15 21:30:53';`,
        mysql: `update rental
set return_date = '2005-05-26 22:10', last_update = now()
where rental_id = 1 and last_update = '2006-02-15 21:30:53';`,
        explanation:
          'If someone changed the row in between, its last_update differs, the UPDATE matches 0 rows, and the application must reload and ask the clerk again. No lock is held while people think, which a SELECT … FOR UPDATE would do. A timestamp works as a version only if every write updates it; a counter column is safer.',
      },
    ],
    docs: [{ label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' }],
  },
  {
    id: 'sakila-108',
    dataset: 'sakila',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'Epic-length films by category',
    prompt: 'For films longer than 180 minutes: per category, how many there are and their titles in one line, alphabetically. Most films first, then category name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg / GROUP_CONCAT after a filtered join',
        postgres: `select c.name as category, count(*) as films,
       string_agg(f.title, ', ' order by f.title) as titles
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
where f.length > 180
group by c.name
order by films desc, category;`,
        mysql: `select c.name as category, count(*) as films,
       group_concat(f.title order by f.title separator ', ') as titles
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
where f.length > 180
group by c.name
order by films desc, category;`,
        explanation: '39 films run over three hours, spread over 15 categories; Animation and Foreign have five each. WHERE filters films before grouping, so categories without long films do not appear at all.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'sakila-109',
    dataset: 'sakila',
    level: 3,
    topics: ['subtotals'],
    title: 'Action and Comedy rentals per store, with totals',
    prompt: 'Count rentals of Action and Comedy films per store and category, with a subtotal per store and a grand total (label totals \'All\'). Stores in order, categories within each store, totals after their details.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP (store, category)',
        postgres: `select coalesce(i.store_id::text, 'All') as store, coalesce(c.name, 'All') as category, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c on c.category_id = fc.category_id
where c.name in ('Action', 'Comedy')
group by rollup (i.store_id, c.name)
order by grouping(i.store_id), i.store_id, grouping(c.name), c.name;`,
        mysql: `select coalesce(cast(store_id as char), 'All') as store, coalesce(name, 'All') as category, rentals
from (
  select i.store_id, c.name, count(*) as rentals, grouping(i.store_id) as gs, grouping(c.name) as gc
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film_category fc on fc.film_id = i.film_id
  join category c on c.category_id = fc.category_id
  where c.name in ('Action', 'Comedy')
  group by i.store_id, c.name with rollup
) t
order by gs, store_id, gc, name;`,
        mysqlNote: 'The labels are applied outside the ROLLUP query, where its NULLs are plain values; COALESCE of a number with text needs the number cast to text first.',
        explanation: 'Store 1 rented 1,098 of these films, store 2 955, together 2,053. ROLLUP never totals a category across stores; that would be CUBE or an extra GROUPING SET.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'sakila-110',
    dataset: 'sakila',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'An email type you can reuse',
    prompt:
      'Several tables will store emails that must contain "@" and be at most 100 characters. Define that rule once as a domain (PostgreSQL), then create newsletter_signup (signup_id, email using it, signed_up_at). Add one signup: anna@example.com on 2025-07-01.',
    orderMatters: false,
    checkSql: `select signup_id, email, signed_up_at from newsletter_signup`,
    solutions: [
      {
        approach: 'CREATE DOMAIN / a CHECK per column',
        postgres: `create domain email_address as varchar(100)
  check (value like '%_@_%');

create table newsletter_signup (
  signup_id    integer generated always as identity primary key,
  email        email_address not null unique,
  signed_up_at date not null
);

insert into newsletter_signup (email, signed_up_at) values ('anna@example.com', '2025-07-01');`,
        mysql: `create table newsletter_signup (
  signup_id    int auto_increment primary key,
  email        varchar(100) not null unique check (email like '%_@_%'),
  signed_up_at date not null
);

insert into newsletter_signup (email, signed_up_at) values ('anna@example.com', '2025-07-01');`,
        mysqlNote: 'MySQL has no domains; the CHECK has to be repeated on every column that stores an email.',
        explanation:
          'A domain is a named type plus rules: every column declared as email_address gets the length and the CHECK, and changing the domain changes them all. \'%_@_%\' demands at least one character before and after the @. Real email validation is far more complex; the database only keeps out obvious junk.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE DOMAIN', url: PG + 'sql-createdomain.html' }],
  },
  {
    id: 'sakila-111',
    dataset: 'sakila',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Move zero payments to an archive, all or nothing',
    prompt:
      'Create payment_archive with the columns of payment, then move the payments with amount 0 there: they must end up in exactly one of the two tables, never both and never neither. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select (select count(*) from payment_archive) as archived, (select count(*) from payment where amount = 0) as left_in_payment`,
    solutions: [
      {
        approach: 'DELETE … RETURNING inside an INSERT (one statement)',
        postgres: `create table payment_archive (like payment);

with moved as (
  delete from payment where amount = 0 returning *
)
insert into payment_archive select * from moved;`,
        mysql: `create table payment_archive like payment;

start transaction;
insert into payment_archive select * from payment where amount = 0;
delete from payment where amount = 0;
commit;`,
        mysqlNote: 'No data-modifying CTEs in MySQL: two statements inside one transaction. Between them, a concurrent insert of a new zero payment could slip into the DELETE without being archived; SELECT … FOR UPDATE or SERIALIZABLE closes that gap.',
        explanation:
          'In PostgreSQL the DELETE … RETURNING hands exactly the deleted rows to the INSERT, in one statement, so no row can be counted twice or lost. 24 payments move.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Data-modifying statements in WITH', url: PG + 'queries-with.html#QUERIES-WITH-MODIFYING' }],
  },
  {
    id: 'sakila-112',
    dataset: 'sakila',
    level: 5,
    topics: ['triggers'],
    title: 'Renting reactivates a customer',
    prompt:
      'If an inactive customer (active = 0) rents a film, they should become active again. Add a trigger for that. Test: set customer 1 inactive, then rent inventory 1 to them (rental 16050, 2006-02-20 10:00, staff 1).',
    orderMatters: false,
    checkSql: `update customer set active = 0 where customer_id = 1;
insert into rental (rental_id, rental_date, inventory_id, customer_id, staff_id) values (16050, '2006-02-20 10:00', 1, 1, 1);
select customer_id, active from customer where customer_id = 1`,
    solutions: [
      {
        approach: 'AFTER INSERT trigger on rental',
        postgres: `create function reactivate_customer() returns trigger
language plpgsql
as $$
begin
  update customer set active = 1 where customer_id = new.customer_id and active = 0;
  return null;
end;
$$;

create trigger rental_reactivates
after insert on rental
for each row execute function reactivate_customer();`,
        mysql: `create trigger rental_reactivates
after insert on rental
for each row
  update customer set active = 1 where customer_id = new.customer_id and active = 0;`,
        mysqlNote: 'A one-statement trigger body needs no BEGIN … END.',
        explanation:
          'The condition active = 0 in the UPDATE makes the trigger touch the customer row only when something changes, so ordinary rentals by active customers cost nothing extra. It runs inside the same transaction as the rental: if the rental is rolled back, so is the reactivation.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' }],
  },
  {
    id: 'sakila-113',
    dataset: 'sakila',
    level: 1,
    topics: ['text-search'],
    title: 'Dinosaur films',
    prompt: 'List the films with "dinosaur" in the title, in any letter case. Show film_id and title.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE / LIKE',
        postgres: `select film_id, title
from film
where title ilike '%dinosaur%'
order by film_id;`,
        mysql: `select film_id, title
from film
where title like '%dinosaur%'
order by film_id;`,
        mysqlNote: 'MySQL\'s default collation ignores case, so LIKE already matches DINOSAUR.',
        explanation: 'Sakila titles are stored in capitals, so a case-sensitive LIKE \'%dinosaur%\' in PostgreSQL finds nothing; ILIKE ignores case. Three films: ACADEMY DINOSAUR, CENTER DINOSAUR and DINOSAUR SECRETARY.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE and ILIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'sakila-114',
    dataset: 'sakila',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'A timestamp split into date and time',
    prompt: 'For rentals 1 to 3: rental_id, the rental date as \'YYYY-MM-DD\' text, the time as \'HH:MM\' text, and the date as a real date value.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Format for text, cast for a date',
        postgres: `select rental_id,
       to_char(rental_date, 'YYYY-MM-DD') as day_text,
       to_char(rental_date, 'HH24:MI') as time_text,
       rental_date::date as day
from rental
where rental_id between 1 and 3
order by rental_id;`,
        mysql: `select rental_id,
       date_format(rental_date, '%Y-%m-%d') as day_text,
       date_format(rental_date, '%H:%i') as time_text,
       cast(rental_date as date) as day
from rental
where rental_id between 1 and 3
order by rental_id;`,
        explanation:
          'Text versions are for display: they sort correctly only because the format puts the year first, and date arithmetic on them is impossible. The cast to date keeps a real date, which can be compared, grouped and added to.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Formatting functions', url: PG + 'functions-formatting.html' }],
  },
  {
    id: 'sakila-115',
    dataset: 'sakila',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for unusually large payments',
    prompt: 'Payments of 10.00 or more are reviewed per customer. They are 114 of 16,044. Create an index holding only those payments that serves "large payments of customer X".',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'payment' and indexdef like '%amount%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'payment' and column_name = 'amount'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index payment_large_idx on payment (customer_id) include (amount, payment_date)
where amount >= 10;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'Fewer than 1% of the rows. The index stays small, and a payment that crosses the threshold enters it automatically.',
      },
      {
        approach: 'Composite index',
        postgres: `create index payment_customer_amount_idx on payment (customer_id, amount);`,
        mysql: `create index payment_customer_amount_idx on payment (customer_id, amount);`,
        explanation: 'For one customer, amount >= 10 is a short range at the end of that customer\'s section of the index. It indexes every payment, though.',
      },
    ],
    comparison: 'Both find a customer\'s large payments directly; the partial one is about 140 times smaller.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'sakila-116',
    dataset: 'sakila',
    level: 2,
    topics: ['full-join', 'distinct'],
    title: 'August films, store against store',
    prompt: 'Compare the films rented from store 1 and from store 2 since 1 August 2005: how many films were rented at both stores, only at store 1, only at store 2?',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two distinct film lists',
        postgres: `with s1 as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where i.store_id = 1 and r.rental_date >= '2005-08-01'
),
s2 as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where i.store_id = 2 and r.rental_date >= '2005-08-01'
)
select count(*) filter (where s1.film_id is not null and s2.film_id is not null) as both_stores,
       count(*) filter (where s2.film_id is null) as store_1_only,
       count(*) filter (where s1.film_id is null) as store_2_only
from s1
full join s2 on s2.film_id = s1.film_id;`,
        mysql: `with s1 as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where i.store_id = 1 and r.rental_date >= '2005-08-01'
),
s2 as (
  select distinct i.film_id from rental r join inventory i on i.inventory_id = r.inventory_id
  where i.store_id = 2 and r.rental_date >= '2005-08-01'
)
select (select count(*) from s1 join s2 on s2.film_id = s1.film_id) as both_stores,
       (select count(*) from s1 where not exists (select 1 from s2 where s2.film_id = s1.film_id)) as store_1_only,
       (select count(*) from s2 where not exists (select 1 from s1 where s1.film_id = s2.film_id)) as store_2_only;`,
        mysqlNote: 'No FULL JOIN in MySQL: a join and two anti-joins.',
        explanation:
          '563 films rented at both, 196 only at store 1, 199 only at store 2: almost exactly the films each store alone stocks. The "only" groups are explained by inventory, not by taste.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'sakila-117',
    dataset: 'sakila',
    level: 3,
    topics: ['lateral', 'joins'],
    title: 'Each actor\'s longest film',
    prompt: 'For actors 1 to 3: actor_id, first and last name, and their longest film (title and length). On equal length, the lower film_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CROSS JOIN LATERAL with a join inside',
        postgres: `select a.actor_id, a.first_name, a.last_name, longest.title, longest.length
from actor a
cross join lateral (
  select f.title, f.length
  from film_actor fa
  join film f on f.film_id = fa.film_id
  where fa.actor_id = a.actor_id
  order by f.length desc, f.film_id
  limit 1
) longest
where a.actor_id between 1 and 3
order by a.actor_id;`,
        mysql: `select a.actor_id, a.first_name, a.last_name, longest.title, longest.length
from actor a
cross join lateral (
  select f.title, f.length
  from film_actor fa
  join film f on f.film_id = fa.film_id
  where fa.actor_id = a.actor_id
  order by f.length desc, f.film_id
  limit 1
) longest
where a.actor_id between 1 and 3
order by a.actor_id;`,
        explanation: 'Penelope Guiness\'s longest is KING EVOLUTION. The lateral subquery walks only that actor\'s film_actor rows, which the index on (actor_id, film_id) finds directly.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'sakila-118',
    dataset: 'sakila',
    level: 4,
    topics: ['materialized-views', 'joins'],
    title: 'Actor popularity, stored',
    prompt: 'Store per actor: actor_id, name ("FIRST LAST") and the number of rentals of films they appear in, refreshed nightly. Then: the 3 most rented actors.',
    orderMatters: true,
    checkSql: `select actor_id, name, rentals from actor_rentals order by rentals desc, actor_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view keyed by actor',
        postgres: `create materialized view actor_rentals as
select a.actor_id, a.first_name || ' ' || a.last_name as name, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film_actor fa on fa.film_id = i.film_id
join actor a on a.actor_id = fa.actor_id
group by a.actor_id, a.first_name, a.last_name;

create unique index actor_rentals_key on actor_rentals (actor_id);`,
        mysql: `create table actor_rentals (actor_id int primary key, name varchar(91), rentals int);

replace into actor_rentals
select a.actor_id, concat(a.first_name, ' ', a.last_name), count(*)
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film_actor fa on fa.film_id = i.film_id
join actor a on a.actor_id = fa.actor_id
group by a.actor_id, a.first_name, a.last_name;`,
        mysqlNote: 'A keyed table refreshed by REPLACE INTO stands in for the materialized view.',
        explanation: 'A four-table join over 16,000 rentals becomes 200 stored rows. Gina Degeneres leads with 753 rentals of her films. A rental counts once for every actor in the film, so the column sums to far more than 16,044.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'sakila-119',
    dataset: 'sakila',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Add copies of a film with a loop',
    prompt:
      'Write a procedure add_copies(p_film_id, p_store_id, p_n) that inserts p_n new inventory rows for that film and store (ids after the current maximum), refusing p_n outside 1–10. Add 3 copies of film 1 to store 2.',
    orderMatters: false,
    checkSql: `select store_id, count(*) as copies from inventory where film_id = 1 group by store_id order by store_id`,
    solutions: [
      {
        approach: 'A counted loop of inserts',
        postgres: `create procedure add_copies(p_film_id integer, p_store_id integer, p_n integer)
language plpgsql
as $$
begin
  if p_n not between 1 and 10 then
    raise exception 'between 1 and 10 copies at a time, not %', p_n;
  end if;
  for i in 1 .. p_n loop
    insert into inventory (inventory_id, film_id, store_id)
    select max(inventory_id) + 1, p_film_id, p_store_id from inventory;
  end loop;
end;
$$;

call add_copies(1, 2, 3);`,
        mysql: `create procedure add_copies(p_film_id int, p_store_id int, p_n int)
begin
  declare i int default 1;
  if p_n not between 1 and 10 then
    signal sqlstate '45000' set message_text = 'between 1 and 10 copies at a time';
  end if;
  while i <= p_n do
    insert into inventory (inventory_id, film_id, store_id)
    select max(inventory_id) + 1, p_film_id, p_store_id from inventory;
    set i = i + 1;
  end while;
end;

call add_copies(1, 2, 3);`,
        mysqlNote: DELIMITER_NOTE + ' MySQL allows INSERT … SELECT from the same table; it reads the maximum before inserting each row.',
        explanation:
          'Store 2 goes from 4 to 7 copies of ACADEMY DINOSAUR. A single INSERT … SELECT FROM generate_series would avoid the loop; the loop shows the control structure. Computing ids as MAX + 1 is only safe without concurrent writers; normally the identity column hands them out.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Loops', url: PG + 'plpgsql-control-structures.html#PLPGSQL-CONTROL-STRUCTURES-LOOPS' }],
  },
]
