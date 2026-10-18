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
]
