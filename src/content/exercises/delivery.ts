import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

export const deliveryExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'delivery-001',
    dataset: 'delivery',
    level: 1,
    topics: ['select-basics', 'limit'],
    title: 'The biggest orders',
    prompt: 'Show the 5 largest orders: id, total and created_at. Equal totals: earlier order first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY … LIMIT',
        postgres: `select id, total, created_at
from orders
order by total desc, created_at, id
limit 5;`,
        mysql: `select id, total, created_at
from orders
order by total desc, created_at, id
limit 5;`,
        explanation: 'Sort by the amount, break ties by time and then by id, and keep the first five rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'delivery-002',
    dataset: 'delivery',
    level: 1,
    topics: ['text-search', 'aggregates'],
    title: 'How many customers are called Noa',
    prompt: 'Emails look like first.last123@mail.com. Count the customers whose email starts with "noa.".',
    orderMatters: false,
    solutions: [
      {
        approach: 'LIKE with a prefix',
        postgres: `select count(*) as noas
from customers
where email like 'noa.%';`,
        mysql: `select count(*) as noas
from customers
where email like 'noa.%';`,
        explanation: 'The dot is an ordinary character in LIKE; only % and _ are wildcards. Without the dot, "noam…" would match too if such names existed.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'delivery-003',
    dataset: 'delivery',
    level: 1,
    topics: ['casting', 'dates-basics'],
    title: 'Orders of one day',
    prompt: 'created_at holds date and time. How many orders were placed on 1 March 2025?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Range on the timestamp',
        postgres: `select count(*) as orders
from orders
where created_at >= '2025-03-01' and created_at < '2025-03-02';`,
        mysql: `select count(*) as orders
from orders
where created_at >= '2025-03-01' and created_at < '2025-03-02';`,
        explanation: 'Every moment of that day, compared on the column itself, so an index on created_at can be used.',
      },
      {
        approach: 'Cast to date',
        postgres: `select count(*) as orders
from orders
where created_at::date = '2025-03-01';`,
        mysql: `select count(*) as orders
from orders
where cast(created_at as date) = '2025-03-01';`,
        mysqlNote: 'No :: in MySQL; CAST(… AS DATE) or DATE(created_at).',
        explanation: 'Converts each timestamp to a date and compares. Shorter, but the conversion runs on every row and a plain index on created_at cannot help.',
      },
    ],
    comparison: 'Same count. The range keeps the column bare and stays index-friendly; casting reads more naturally but scans everything.',
    docs: [
      { label: 'PostgreSQL: Type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html' },
    ],
  },
  {
    id: 'delivery-004',
    dataset: 'delivery',
    level: 1,
    topics: ['conditions', 'group-by'],
    title: 'Small, medium and large orders',
    prompt: 'Put each order in a size band: under 60 is small, under 150 is medium, the rest large. Count the orders per band.',
    orderMatters: false,
    solutions: [
      {
        approach: 'CASE in GROUP BY',
        postgres: `select case when total < 60  then 'small'
            when total < 150 then 'medium'
            else 'large' end as band,
       count(*) as orders
from orders
group by band;`,
        mysql: `select case when total < 60  then 'small'
            when total < 150 then 'medium'
            else 'large' end as band,
       count(*) as orders
from orders
group by band;`,
        explanation: 'CASE takes the first branch whose condition is true, so "< 150" only sees orders that are not already small.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },

  // ---------- Level 2 ----------
  {
    id: 'delivery-005',
    dataset: 'delivery',
    level: 2,
    topics: ['numbers', 'group-by'],
    title: 'Share of each status',
    prompt: 'For each order status, show the number of orders and its share of all orders in percent, rounded to 1 decimal.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Window total',
        postgres: `select status, count(*) as orders,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from orders
group by status;`,
        mysql: `select status, count(*) as orders,
       round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from orders
group by status;`,
        explanation: 'sum(count(*)) over () adds the group counts of all rows of the result: the grand total, available on every row. 100.0 keeps the division from being an integer one.',
      },
      {
        approach: 'Scalar subquery',
        postgres: `select status, count(*) as orders,
       round(100.0 * count(*) / (select count(*) from orders), 1) as pct
from orders
group by status;`,
        mysql: `select status, count(*) as orders,
       round(100.0 * count(*) / (select count(*) from orders), 1) as pct
from orders
group by status;`,
        explanation: 'The total comes from a separate count of the whole table.',
      },
    ],
    comparison: 'Same numbers. The window version reads the table once; the subquery version reads it twice but is easy to follow.',
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'delivery-006',
    dataset: 'delivery',
    level: 2,
    topics: ['joins', 'group-by'],
    title: 'Revenue by cuisine and city',
    prompt: 'Total delivered revenue per restaurant city and cuisine. Show city, cuisine and revenue, ordered by city and then revenue, highest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join and group',
        postgres: `select r.city, r.cuisine, sum(o.total) as revenue
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.city, r.cuisine
order by r.city, revenue desc;`,
        mysql: `select r.city, r.cuisine, sum(o.total) as revenue
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.city, r.cuisine
order by r.city, revenue desc;`,
        explanation: 'Cancelled and refunded orders brought no money, so they are filtered out before summing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'delivery-007',
    dataset: 'delivery',
    level: 2,
    topics: ['subqueries', 'set-operations'],
    title: 'Customers who never ordered',
    prompt: 'How many customers have no orders at all?',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as never_ordered
from customers c
where not exists (select 1 from orders o where o.customer_id = c.id);`,
        mysql: `select count(*) as never_ordered
from customers c
where not exists (select 1 from orders o where o.customer_id = c.id);`,
        explanation: 'For each customer, look for one order. NOT EXISTS keeps the customers for whom none is found.',
      },
      {
        approach: 'LEFT JOIN … IS NULL',
        postgres: `select count(*) as never_ordered
from customers c
left join orders o on o.customer_id = c.id
where o.id is null;`,
        mysql: `select count(*) as never_ordered
from customers c
left join orders o on o.customer_id = c.id
where o.id is null;`,
        explanation: 'A LEFT JOIN keeps customers without a match, filling the order side with NULL; the WHERE keeps exactly those.',
      },
      {
        approach: 'EXCEPT',
        postgres: `select count(*) as never_ordered
from (
  select id from customers
  except
  select customer_id from orders
) nobody;`,
        mysql: `select count(*) as never_ordered
from (
  select id from customers
  except
  select customer_id from orders
) nobody;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation: 'All customer ids minus every id that appears in orders.',
      },
    ],
    comparison:
      'Same count, different plans. PostgreSQL runs NOT EXISTS as a hash anti-join, which only needs to know whether a match exists; the LEFT JOIN is planned as an ordinary join that pairs every customer with all his orders and filters afterwards; EXCEPT builds both id lists. NOT IN would also work here, but returns nothing at all if the subquery ever contains a NULL.',
    docs: [
      { label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' },
      { label: 'MySQL: EXCEPT', url: MY + 'except.html' },
    ],
  },
  {
    id: 'delivery-008',
    dataset: 'delivery',
    level: 2,
    topics: ['joins', 'dates-basics'],
    title: 'Orders before sign-up',
    prompt:
      'Data check: an order should never be older than its customer\'s account. Count the orders created before the customer\'s signed_up_at date, and how many customers they belong to.',
    hint: 'This data is generated: sign-up dates and order times are drawn independently, so the check finds real problems.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Join and compare',
        postgres: `select count(*)                       as bad_orders,
       count(distinct o.customer_id)  as customers
from orders o
join customers c on c.id = o.customer_id
where o.created_at < c.signed_up_at;`,
        mysql: `select count(*)                       as bad_orders,
       count(distinct o.customer_id)  as customers
from orders o
join customers c on c.id = o.customer_id
where o.created_at < c.signed_up_at;`,
        explanation:
          'Comparing a timestamp with a date treats the date as midnight. A check like this belongs in every pipeline: in a real system these rows would point to a bug, such as accounts re-created after deletion.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time comparison', url: PG + 'functions-datetime.html' }],
  },

  // ---------- Level 3 ----------
  {
    id: 'delivery-009',
    dataset: 'delivery',
    level: 3,
    topics: ['date-series', 'joins'],
    title: 'Revenue every day of March 2025',
    prompt: 'Show every day of March 2025 with its delivered revenue (0 for a day without any).',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select d::date as day, coalesce(sum(o.total), 0) as revenue
from generate_series(date '2025-03-01', date '2025-03-31', interval '1 day') as d
left join orders o
       on o.status = 'delivered'
      and o.created_at >= d and o.created_at < d + interval '1 day'
group by d
order by d;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation:
          'The calendar comes from generate_series, so a day with no orders still appears. coalesce turns the NULL sum of such a day into 0. The range join keeps created_at bare for an index.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive days as (
  select date '2025-03-01' as day
  union all
  select (day + 1)::date from days where day < date '2025-03-31'
)
select d.day, coalesce(sum(o.total), 0) as revenue
from days d
left join orders o
       on o.status = 'delivered'
      and o.created_at >= d.day and o.created_at < d.day + 1
group by d.day
order by d.day;`,
        mysql: `with recursive days as (
  select date('2025-03-01') as day
  union all
  select day + interval 1 day from days where day < '2025-03-31'
)
select d.day, coalesce(sum(o.total), 0) as revenue
from days d
left join orders o
       on o.status = 'delivered'
      and o.created_at >= d.day and o.created_at < d.day + interval 1 day
group by d.day
order by d.day;`,
        explanation: 'The same calendar, built one day at a time.',
      },
    ],
    comparison: 'Same rows. Every day of March has orders here, but the calendar guarantees the report would not silently skip a quiet day.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'delivery-010',
    dataset: 'delivery',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'A 7-day moving average',
    prompt:
      'For each day of March 2025, show the delivered revenue and the average daily revenue over that day and the 6 days before it (rounded to 2 decimals). Use the previous days\' dates, not "the previous 6 rows".',
    orderMatters: true,
    solutions: [
      {
        approach: 'RANGE with an interval',
        postgres: `with daily as (
  select created_at::date as day, sum(total) as revenue
  from orders
  where status = 'delivered' and created_at >= '2025-02-22' and created_at < '2025-04-01'
  group by created_at::date
)
select day, revenue, avg_7d
from (
  select day, revenue,
         round(avg(revenue) over (order by day range between interval '6 days' preceding and current row), 2) as avg_7d
  from daily
) w
where day >= '2025-03-01'
order by day;`,
        mysql: `with daily as (
  select date(created_at) as day, sum(total) as revenue
  from orders
  where status = 'delivered' and created_at >= '2025-02-22' and created_at < '2025-04-01'
  group by date(created_at)
)
select day, revenue, avg_7d
from (
  select day, revenue,
         round(avg(revenue) over (order by day range between interval 6 day preceding and current row), 2) as avg_7d
  from daily
) w
where day >= '2025-03-01'
order by day;`,
        mysqlNote: 'MySQL also supports RANGE frames with an INTERVAL when ordering by a date.',
        explanation:
          'RANGE counts in values of the ORDER BY column: "6 days before this day". ROWS would count rows, which goes wrong as soon as a day is missing. The data starts on 22 February so that 1 March already has six days of history.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: Window function frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'delivery-011',
    dataset: 'delivery',
    level: 3,
    topics: ['ranking'],
    title: 'Order value quartiles',
    prompt:
      'Split the delivered orders into 4 equal groups by total (ntile). For each quartile show the number of orders and the smallest and largest total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NTILE',
        postgres: `select quartile, count(*) as orders, min(total) as lowest, max(total) as highest
from (
  select total, ntile(4) over (order by total, id) as quartile
  from orders
  where status = 'delivered'
) q
group by quartile
order by quartile;`,
        mysql: `select quartile, count(*) as orders, min(total) as lowest, max(total) as highest
from (
  select total, ntile(4) over (order by total, id) as quartile
  from orders
  where status = 'delivered'
) q
group by quartile
order by quartile;`,
        explanation:
          'NTILE(4) deals the sorted rows into four buckets of (nearly) equal size. Adding id to the ORDER BY makes the split of equal totals at a bucket border reproducible.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'delivery-012',
    dataset: 'delivery',
    level: 3,
    topics: ['lag-lead', 'dates-advanced'],
    title: 'The quietest stretch per restaurant',
    prompt:
      'For restaurants 1 to 5, find the longest gap between two consecutive orders (any status). Show the restaurant id and the gap in whole minutes.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG, then MAX',
        postgres: `select restaurant_id, max(gap_minutes) as longest_gap_minutes
from (
  select restaurant_id,
         floor(extract(epoch from created_at - lag(created_at) over (partition by restaurant_id order by created_at, id)) / 60)::int as gap_minutes
  from orders
  where restaurant_id between 1 and 5
) g
group by restaurant_id
order by restaurant_id;`,
        mysql: `select restaurant_id, max(gap_minutes) as longest_gap_minutes
from (
  select restaurant_id,
         timestampdiff(minute, lag(created_at) over (partition by restaurant_id order by created_at, id), created_at) as gap_minutes
  from orders
  where restaurant_id between 1 and 5
) g
group by restaurant_id
order by restaurant_id;`,
        explanation:
          'LAG gives each order the time of the restaurant\'s previous order. The first order has no previous one (NULL), which MAX ignores. Minutes, because a gap can exceed a day and the two databases print long intervals differently.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: LAG', url: PG + 'functions-window.html' },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY + 'date-and-time-functions.html#function_timestampdiff' },
    ],
  },
  {
    id: 'delivery-013',
    dataset: 'delivery',
    level: 3,
    topics: ['cte', 'dates-advanced'],
    title: 'Did first-time customers come back?',
    prompt:
      'For customers whose first order was in January 2025, how many placed another order within 30 days of that first one? Show the number of such first-time customers and how many came back.',
    orderMatters: false,
    solutions: [
      {
        approach: 'First order per customer, then look ahead',
        postgres: `with firsts as (
  select customer_id, min(created_at) as first_at
  from orders
  group by customer_id
)
select count(*) as new_in_january,
       count(*) filter (where exists (
         select 1 from orders o
         where o.customer_id = f.customer_id
           and o.created_at > f.first_at
           and o.created_at <= f.first_at + interval '30 days')) as came_back
from firsts f
where f.first_at >= '2025-01-01' and f.first_at < '2025-02-01';`,
        mysql: `with firsts as (
  select customer_id, min(created_at) as first_at
  from orders
  group by customer_id
)
select count(*) as new_in_january,
       sum(exists (
         select 1 from orders o
         where o.customer_id = f.customer_id
           and o.created_at > f.first_at
           and o.created_at <= f.first_at + interval 30 day)) as came_back
from firsts f
where f.first_at >= '2025-01-01' and f.first_at < '2025-02-01';`,
        mysqlNote: 'No FILTER; EXISTS returns 1 or 0 in MySQL, so SUM counts the customers who came back.',
        explanation:
          'The CTE finds each customer\'s first order. Then, per January newcomer, EXISTS looks for any later order within 30 days. A basic retention metric: of the people who tried us, how many returned.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
      { label: 'MySQL: WITH', url: MY + 'with.html' },
    ],
  },

  // ---------- Level 4 ----------
  {
    id: 'delivery-014',
    dataset: 'delivery',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'A refund, all or nothing',
    prompt:
      'Refund order 42: create a table refunds (order_id, amount), and in one transaction set the order\'s status to \'refunded\' and record the refund. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select o.status, r.amount from orders o join refunds r on r.order_id = o.id where o.id = 42`,
    solutions: [
      {
        approach: 'Two changes in one transaction',
        postgres: `create table refunds (order_id int primary key references orders (id), amount numeric(8, 2) not null);

update orders set status = 'refunded' where id = 42;
insert into refunds (order_id, amount) select id, total from orders where id = 42;`,
        mysql: `create table refunds (order_id int primary key, amount decimal(8, 2) not null,
                      foreign key (order_id) references orders (id));

start transaction;
update orders set status = 'refunded' where id = 42;
insert into refunds (order_id, amount) select id, total from orders where id = 42;
commit;`,
        mysqlNote:
          'Create the table before START TRANSACTION: in MySQL, CREATE TABLE commits immediately and cannot be part of the transaction. In PostgreSQL DDL is transactional too.',
        explanation:
          'Either both changes happen or neither does: no refunded order without a refund record, and no refund for an order still marked delivered. If anything fails before COMMIT, ROLLBACK undoes both.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Transactions', url: PG + 'tutorial-transactions.html' },
      { label: 'MySQL: Statements that cause an implicit commit', url: MY + 'implicit-commit.html' },
    ],
  },
  {
    id: 'delivery-015',
    dataset: 'delivery',
    level: 4,
    topics: ['merge', 'upsert'],
    title: 'Apply a batch of corrections',
    prompt:
      'Support sent corrections in a table fixes(order_id, total): orders 1 and 2 get new totals, and order 999999 is a missing order that must be created for customer 1 at restaurant 1, delivered, at 2026-06-30 12:00. Create fixes, fill it, and apply it to orders in one statement.',
    orderMatters: true,
    checkSql: `select id, total, status from orders where id in (1, 2, 999999) order by id`,
    solutions: [
      {
        approach: 'MERGE',
        postgres: `create table fixes (order_id int primary key, total numeric(8, 2) not null);
insert into fixes values (1, 99.90), (2, 45.00), (999999, 70.00);

merge into orders o
using fixes f on f.order_id = o.id
when matched then
  update set total = f.total
when not matched then
  insert (id, customer_id, restaurant_id, total, status, created_at)
  values (f.order_id, 1, 1, f.total, 'delivered', timestamp '2026-06-30 12:00');`,
        mysql: null,
        mysqlNote: 'MySQL has no MERGE; see solution B.',
        explanation: 'MERGE compares two tables row by row and says what to do with matches and non-matches, all in one statement.',
      },
      {
        approach: 'INSERT … ON CONFLICT / ON DUPLICATE KEY',
        postgres: `create table fixes (order_id int primary key, total numeric(8, 2) not null);
insert into fixes values (1, 99.90), (2, 45.00), (999999, 70.00);

insert into orders (id, customer_id, restaurant_id, total, status, created_at)
select order_id, 1, 1, total, 'delivered', timestamp '2026-06-30 12:00' from fixes
on conflict (id) do update set total = excluded.total;`,
        mysql: `create table fixes (order_id int primary key, total decimal(8, 2) not null);
insert into fixes values (1, 99.90), (2, 45.00), (999999, 70.00);

insert into orders (id, customer_id, restaurant_id, total, status, created_at)
select * from (
  select order_id, 1 as customer_id, 1 as restaurant_id, total, 'delivered' as status, '2026-06-30 12:00:00' as created_at
  from fixes
) as new
on duplicate key update total = new.total;`,
        mysqlNote: 'With INSERT … SELECT, name the incoming rows by wrapping the SELECT in a derived table (as new) and refer to new.total; the older VALUES(total) form is deprecated.',
        explanation:
          'An upsert: try to insert every fix; where the id already exists, update the total instead. The values for a new row are given even for existing orders, but only total is changed for those.',
      },
    ],
    comparison:
      'Same result. MERGE can also delete or do different updates per condition; an upsert only does "insert, or update on conflict", but it is atomic per row under concurrency and exists in MySQL.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'delivery-016',
    dataset: 'delivery',
    level: 4,
    topics: ['json'],
    title: 'An order as JSON',
    prompt:
      'Build a JSON receipt for orders 1 to 3: one row per order with a JSON object holding id, restaurant (its name), total and day (the order date as YYYY-MM-DD text).',
    orderMatters: true,
    solutions: [
      {
        approach: 'jsonb_build_object / JSON_OBJECT',
        postgres: `select o.id,
       jsonb_build_object('id', o.id, 'restaurant', r.name, 'total', o.total,
                          'day', to_char(o.created_at, 'YYYY-MM-DD')) as receipt
from orders o
join restaurants r on r.id = o.restaurant_id
where o.id between 1 and 3
order by o.id;`,
        mysql: `select o.id,
       json_object('id', o.id, 'restaurant', r.name, 'total', o.total,
                   'day', date_format(o.created_at, '%Y-%m-%d')) as receipt
from orders o
join restaurants r on r.id = o.restaurant_id
where o.id between 1 and 3
order by o.id;`,
        mysqlNote: 'JSON_OBJECT takes the same key/value pairs. Format the date yourself: a DATETIME inside JSON becomes "2025-03-01 12:00:00.000000".',
        explanation:
          'Key/value pairs in, one object out. jsonb (not json) stores keys sorted, as MySQL does, so both databases print the same object. Building API responses directly in SQL is a common use.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON functions', url: PG + 'functions-json.html' },
      { label: 'MySQL: JSON_OBJECT', url: MY + 'json-creation-functions.html#function_json-object' },
    ],
  },
  {
    id: 'delivery-017',
    dataset: 'delivery',
    level: 4,
    topics: ['generated-columns'],
    title: 'The week of every order',
    prompt:
      'Reports group orders by ISO week all the time. Add a stored generated column order_week to orders holding the year and ISO week as text like "2025-W09".',
    orderMatters: true,
    checkSql: `select id, order_week from orders where id in (1, 2, 3) order by id`,
    solutions: [
      {
        approach: 'Generated column',
        postgres: `alter table orders
add column order_week text
generated always as (
  extract(isoyear from created_at)::int || '-W' || lpad(extract(week from created_at)::int::text, 2, '0')
) stored;`,
        mysql: `alter table orders
add column order_week varchar(8)
generated always as (date_format(created_at, '%x-W%v')) stored;`,
        mysqlNote: '%x is the ISO week-numbering year and %v the ISO week (01–53); %Y and %u would follow other rules around New Year.',
        explanation:
          'isoyear and week follow ISO rules: 30 December 2025 belongs to 2026-W01. The tempting to_char(created_at, \'IYYY-"W"IW\') is refused here: a generated column may only use IMMUTABLE functions, and to_char is merely STABLE because its output can depend on locale settings. The column is computed on every insert or update, so it cannot go stale.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Data type formatting', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: DATE_FORMAT', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },

  // ---------- Level 5 ----------
  {
    id: 'delivery-018',
    dataset: 'delivery',
    level: 5,
    topics: ['indexes', 'query-plans'],
    title: 'Foreign keys are not indexed for you',
    prompt:
      'select * from orders where customer_id = 42 reads all 200,000 orders in PostgreSQL (EXPLAIN shows a Seq Scan). Make it use an index.',
    hint: 'Run EXPLAIN before and after to see the plan change.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'orders' and indexdef like '%(customer_id%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'orders' and column_name = 'customer_id' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Index the foreign key',
        postgres: `create index orders_customer_id_idx on orders (customer_id);

-- explain select * from orders where customer_id = 42;
-- before: Seq Scan on orders   after: Bitmap Heap Scan … Bitmap Index Scan on orders_customer_id_idx`,
        mysql: `-- MySQL already has one: InnoDB creates an index for every foreign key.
show index from orders where column_name = 'customer_id';`,
        mysqlNote: 'InnoDB requires an index on foreign key columns and creates it automatically, so there is nothing to add.',
        explanation:
          'PostgreSQL checks the foreign key but does not index it. Lookups by customer, and deleting a customer (which must find his orders), then scan the whole table. With the index, PostgreSQL reads only that customer\'s few rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'MySQL: FOREIGN KEY constraints', url: MY + 'create-table-foreign-keys.html' },
    ],
  },
  {
    id: 'delivery-019',
    dataset: 'delivery',
    level: 5,
    topics: ['partial-covering-indexes', 'indexes'],
    title: 'An index for the problem orders',
    prompt:
      'Support only ever looks at orders that were not delivered (8% of them), newest first. Create the smallest index that serves "where status <> \'delivered\' order by created_at desc".',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'orders' and indexdef like '%created_at%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'orders' and column_name = 'created_at'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index orders_problems_idx on orders (created_at desc)
where status <> 'delivered';`,
        mysql: null,
        mysqlNote: 'MySQL has no partial indexes; solution B indexes every row.',
        explanation:
          'Only the 16,000 problem orders go into the index, so it is about 12 times smaller than a full one and cheap to maintain. A query must repeat the same WHERE condition for the planner to use it.',
      },
      {
        approach: 'Composite index',
        postgres: `create index orders_status_created_idx on orders (status, created_at desc);`,
        mysql: `create index orders_status_created_idx on orders (status, created_at desc);`,
        explanation:
          'Indexes all 200,000 rows. "status <> \'delivered\'" is not one range in it, so the database reads the cancelled and refunded parts separately and merges them, or sorts.',
      },
    ],
    comparison: 'The partial index is the clear winner where it exists: smaller, and it matches the query exactly. In MySQL the composite index is the practical choice.',
    docs: [
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
      { label: 'MySQL: Multiple-column indexes', url: MY + 'multiple-column-indexes.html' },
    ],
  },
  {
    id: 'delivery-020',
    dataset: 'delivery',
    level: 5,
    topics: ['partial-covering-indexes', 'query-plans'],
    title: 'Answer from the index alone',
    prompt:
      'The app shows a customer\'s order history: created_at and total for one customer_id, newest first. Create an index that lets the database answer without visiting the table (an index-only scan).',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'orders' and indexdef like '%(customer_id%' and indexdef like '%total%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'orders' and column_name = 'total'`,
    solutions: [
      {
        approach: 'INCLUDE',
        postgres: `create index orders_history_idx on orders (customer_id, created_at desc) include (total);

-- explain select created_at, total from orders where customer_id = 42 order by created_at desc;
-- after VACUUM orders: Index Only Scan using orders_history_idx`,
        mysql: null,
        mysqlNote: 'MySQL has no INCLUDE; put total in the key itself (solution B).',
        explanation:
          'The key (customer_id, created_at) finds and sorts the rows; INCLUDE stores total in the index leaves without making it part of the key. Every column the query needs is in the index, so the table need not be read. One catch: PostgreSQL can skip the table only for pages its visibility map marks as all-visible, which VACUUM maintains. On freshly loaded data, like this sandbox, the plan stays a bitmap scan plus sort until VACUUM has run.',
      },
      {
        approach: 'Extra key column',
        postgres: `create index orders_history_idx on orders (customer_id, created_at desc, total);`,
        mysql: `create index orders_history_idx on orders (customer_id, created_at desc, total);`,
        mysqlNote: 'In InnoDB every secondary index also carries the primary key, so "id" would be covered for free too.',
        explanation: 'The same coverage by adding total as a third key column. It works everywhere; the index is a little larger in its inner pages.',
      },
    ],
    comparison: 'Both make the query index-only. INCLUDE keeps the key narrow and is the cleaner choice in PostgreSQL; the extra key column is the portable one.',
    docs: [
      { label: 'PostgreSQL: Index-only scans and covering indexes', url: PG + 'indexes-index-only-scans.html' },
      { label: 'MySQL: Covering indexes (EXPLAIN "Using index")', url: MY + 'explain-output.html#explain-extra-information' },
    ],
  },
  {
    id: 'delivery-021',
    dataset: 'delivery',
    level: 5,
    topics: ['partitioning'],
    title: 'One partition per year',
    prompt:
      'Create orders_by_year with the same columns as orders, partitioned by created_at into 2025 and 2026, and copy all orders into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'orders_by_year'::regclass) as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where created_at >= '2026-01-01') as rows_2026`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'orders_by_year') as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where created_at >= '2026-01-01') as rows_2026`,
    solutions: [
      {
        approach: 'Range partitions',
        postgres: `create table orders_by_year (
  id            int           not null,
  customer_id   int           not null,
  restaurant_id int           not null,
  total         numeric(8, 2) not null,
  status        text          not null,
  created_at    timestamp     not null,
  primary key (id, created_at)
) partition by range (created_at);

create table orders_2025 partition of orders_by_year for values from ('2025-01-01') to ('2026-01-01');
create table orders_2026 partition of orders_by_year for values from ('2026-01-01') to ('2027-01-01');

insert into orders_by_year select * from orders;`,
        mysql: `create table orders_by_year (
  id            int           not null,
  customer_id   int           not null,
  restaurant_id int           not null,
  total         decimal(8, 2) not null,
  status        varchar(10)   not null,
  created_at    datetime      not null,
  primary key (id, created_at)
)
partition by range columns (created_at) (
  partition p2025 values less than ('2026-01-01'),
  partition p2026 values less than ('2027-01-01')
);

insert into orders_by_year select * from orders;`,
        mysqlNote: 'RANGE COLUMNS partitions directly on a DATETIME. Partitioned InnoDB tables cannot have foreign keys.',
        explanation:
          'The primary key must contain the partition key, hence (id, created_at). A query limited to 2026 then reads only that partition, and dropping a whole year is instant: drop the partition instead of deleting rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE COLUMNS partitioning', url: MY + 'partitioning-columns-range.html' },
    ],
  },
  {
    id: 'delivery-022',
    dataset: 'delivery',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'A procedure that refuses bad cancellations',
    prompt:
      'Write a procedure cancel_order(p_id) that sets the order\'s status to \'cancelled\' only if it is currently \'delivered\', and otherwise leaves it unchanged. Then call it for orders 7 and 8 (make order 8 refunded first).',
    orderMatters: true,
    checkSql: `select id, status from orders where id in (7, 8) order by id`,
    solutions: [
      {
        approach: 'IF inside a procedure',
        postgres: `create procedure cancel_order(p_id int)
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from orders where id = p_id;
  if v_status = 'delivered' then
    update orders set status = 'cancelled' where id = p_id;
  end if;
end;
$$;

update orders set status = 'refunded' where id = 8;
call cancel_order(7);
call cancel_order(8);`,
        mysql: `create procedure cancel_order(p_id int)
begin
  declare v_status varchar(10);
  select status into v_status from orders where id = p_id;
  if v_status = 'delivered' then
    update orders set status = 'cancelled' where id = p_id;
  end if;
end;

update orders set status = 'refunded' where id = 8;
call cancel_order(7);
call cancel_order(8);`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'SELECT … INTO reads one value into a variable; IF decides whether to update. A procedure (unlike a function) returns nothing and is run with CALL. In real code it would also lock the row (SELECT … FOR UPDATE) so two calls cannot race.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'delivery-023',
    dataset: 'delivery',
    level: 5,
    topics: ['triggers'],
    title: 'Log every status change',
    prompt:
      'Create a table order_status_log (order_id, old_status, new_status) and a trigger that writes a row there whenever an order\'s status changes.',
    orderMatters: true,
    checkSql: `update orders set status = 'refunded' where id = 10;
update orders set total = total + 1 where id = 11;
select order_id, old_status, new_status from order_status_log order by order_id`,
    solutions: [
      {
        approach: 'AFTER UPDATE trigger',
        postgres: `create table order_status_log (order_id int not null, old_status text not null, new_status text not null);

create function log_status_change() returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_log (order_id, old_status, new_status) values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger orders_status_log
after update on orders
for each row execute function log_status_change();`,
        mysql: `create table order_status_log (order_id int not null, old_status varchar(10) not null, new_status varchar(10) not null);

create trigger orders_status_log
after update on orders
for each row
begin
  if not (new.status <=> old.status) then
    insert into order_status_log (order_id, old_status, new_status) values (new.id, old.status, new.status);
  end if;
end;`,
        mysqlNote: `<=> is MySQL's NULL-safe equality, the counterpart of IS NOT DISTINCT FROM. ${DELIMITER_NOTE}`,
        explanation:
          'The trigger fires on every update, but only a real status change is logged: order 11\'s total change writes nothing. IS DISTINCT FROM compares safely even if a value is NULL.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Using triggers', url: MY + 'trigger-syntax.html' },
    ],
  },
  {
    id: 'delivery-024',
    dataset: 'delivery',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'A work queue with SKIP LOCKED',
    prompt:
      'Several support workers process refunded orders in parallel. Write the query one worker runs to claim the 3 oldest refunded orders (id, created_at) so that other workers running the same query at the same moment get different orders.',
    hint: 'The claim is meant to run inside a transaction; the rows stay locked until it ends.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FOR UPDATE SKIP LOCKED',
        postgres: `select id, created_at
from orders
where status = 'refunded'
order by created_at, id
limit 3
for update skip locked;`,
        mysql: `select id, created_at
from orders
where status = 'refunded'
order by created_at, id
limit 3
for update skip locked;`,
        mysqlNote: 'Same syntax since MySQL 8.0. InnoDB locks the index records it reads, so an index on (status, created_at) keeps it from locking far more rows than the three it returns.',
        explanation:
          'FOR UPDATE locks the returned rows until the transaction ends. A second worker would normally wait for those locks; SKIP LOCKED makes it skip them and take the next free rows instead, so workers never block each other or process the same order twice. Alone in a session (as here) it simply returns the three oldest.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: The locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' },
      { label: 'MySQL: Locking read concurrency with NOWAIT and SKIP LOCKED', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'delivery-025',
    dataset: 'delivery',
    level: 5,
    topics: ['locks-isolation'],
    title: 'Lock it now or give up',
    prompt: 'A support tool must lock order 5 for editing, but must not hang if someone else is editing it. Lock the row and return its id and status.',
    hint: 'Run it inside a transaction; the lock lasts until the transaction ends.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FOR UPDATE NOWAIT',
        postgres: `select id, status
from orders
where id = 5
for update nowait;`,
        mysql: `select id, status
from orders
where id = 5
for update nowait;`,
        mysqlNote: 'Same syntax since MySQL 8.0; the error then is ER_LOCK_NOWAIT (3572).',
        explanation:
          'Without NOWAIT, a second session asking for the same lock waits until the first one commits (or a timeout hits). With NOWAIT it fails immediately with "could not obtain lock", and the tool can say "someone else is editing this order".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'delivery-026',
    dataset: 'delivery',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'A report that sees one moment',
    prompt:
      'A report runs two queries: the number of delivered orders, then their total revenue. Orders keep changing meanwhile. Make both queries see the same snapshot of the data; the result is the revenue.',
    orderMatters: false,
    solutions: [
      {
        approach: 'REPEATABLE READ',
        postgres: `set transaction isolation level repeatable read;

select count(*) as delivered_orders from orders where status = 'delivered';
select sum(total) as delivered_revenue from orders where status = 'delivered';`,
        mysql: `set transaction isolation level repeatable read;
start transaction read only;

select count(*) as delivered_orders from orders where status = 'delivered';
select sum(total) as delivered_revenue from orders where status = 'delivered';

commit;`,
        mysqlNote:
          'REPEATABLE READ is already the InnoDB default; SET TRANSACTION applies to the next transaction, hence before START TRANSACTION. The snapshot is taken at the first read.',
        explanation:
          'PostgreSQL defaults to READ COMMITTED, where every statement sees the latest committed data, so an order delivered between the two queries would be in the revenue but not in the count. Under REPEATABLE READ the whole transaction reads one snapshot. SET TRANSACTION must be the first statement of the transaction.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Transaction isolation', url: PG + 'transaction-iso.html' },
      { label: 'MySQL: Transaction isolation levels', url: MY + 'innodb-transaction-isolation-levels.html' },
    ],
  },
  {
    id: 'delivery-027',
    dataset: 'delivery',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'Division that never fails',
    prompt: 'Write a function safe_ratio(a, b) that returns a / b rounded to 2 decimals, and NULL instead of an error when b is 0.',
    orderMatters: false,
    checkSql: `select safe_ratio(10, 4) as ok, safe_ratio(1, 0) as by_zero`,
    solutions: [
      {
        approach: 'Catch the exception',
        postgres: `create function safe_ratio(a numeric, b numeric)
returns numeric
language plpgsql
immutable
as $$
begin
  return round(a / b, 2);
exception
  when division_by_zero then
    return null;
end;
$$;`,
        mysql: `create function safe_ratio(a decimal(12, 2), b decimal(12, 2))
returns decimal(12, 2)
deterministic
begin
  declare exit handler for sqlstate '22012' return null;  -- 22012: division by zero
  return round(a / b, 2);
end;`,
        mysqlNote:
          'A plain SELECT 1 / 0 returns NULL with a warning in MySQL, but inside a stored function strict mode turns it into the error "Division by 0". MySQL catches errors with DECLARE … HANDLER for an SQLSTATE (22012 here) instead of an EXCEPTION block; an EXIT handler in a function may RETURN a value.',
        explanation:
          'In PostgreSQL, division by zero is an error that aborts the statement. A PL/pgSQL block with an EXCEPTION section catches it and returns NULL instead. The simpler portable form is round(a / nullif(b, 0), 2); the exception block is the tool for errors you cannot test for beforehand.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trapping errors', url: PG + 'plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING' },
      { label: 'MySQL: DECLARE … HANDLER', url: MY + 'declare-handler.html' },
    ],
  },
  {
    id: 'delivery-028',
    dataset: 'delivery',
    level: 5,
    topics: ['query-plans', 'limit'],
    title: 'Page 5,001 without reading 100,000 rows',
    prompt:
      'An admin screen lists orders by id, 20 per page. The previous page ended at id 100000. Show the next page: id, customer_id, total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'OFFSET',
        postgres: `select id, customer_id, total
from orders
order by id
limit 20 offset 100000;`,
        mysql: `select id, customer_id, total
from orders
order by id
limit 20 offset 100000;`,
        explanation: 'Simple, but the database still walks through the first 100,000 rows to throw them away, and every later page gets slower.',
      },
      {
        approach: 'Keyset (seek) pagination',
        postgres: `select id, customer_id, total
from orders
where id > 100000
order by id
limit 20;`,
        mysql: `select id, customer_id, total
from orders
where id > 100000
order by id
limit 20;`,
        explanation:
          'Remember where the last page ended and start right after it: the primary key index jumps straight to id 100001 and reads 20 entries. Page 5,001 costs the same as page 1.',
      },
    ],
    comparison:
      'Same 20 rows here because the ids have no gaps. Keyset pagination is far faster on deep pages (see the timings) and stays correct when rows are inserted meanwhile; it cannot jump to an arbitrary page number, which OFFSET can.',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: LIMIT query optimization', url: MY + 'limit-optimization.html' },
    ],
  },
  {
    id: 'delivery-029',
    dataset: 'delivery',
    level: 4,
    topics: ['normalization', 'ddl'],
    title: 'Cities as their own table',
    prompt:
      'City names are repeated as text in customers and restaurants. Create cities (id, name), add city_id to both tables pointing to it, and fill it in.',
    orderMatters: false,
    checkSql: `select (select count(*) from cities) as cities,
       (select count(*) from customers where city_id is null) as customers_unlinked,
       (select count(*) from restaurants where city_id is null) as restaurants_unlinked`,
    solutions: [
      {
        approach: 'Lookup table + foreign keys',
        postgres: `create table cities (id integer generated always as identity primary key, name text not null unique);

insert into cities (name)
select city from customers union select city from restaurants;

alter table customers   add column city_id integer references cities (id);
alter table restaurants add column city_id integer references cities (id);

update customers c   set city_id = ci.id from cities ci where ci.name = c.city;
update restaurants r set city_id = ci.id from cities ci where ci.name = r.city;`,
        mysql: `create table cities (id int auto_increment primary key, name varchar(20) not null unique);

insert into cities (name)
select city from customers union select city from restaurants;

alter table customers   add column city_id int, add foreign key (city_id) references cities (id);
alter table restaurants add column city_id int, add foreign key (city_id) references cities (id);

update customers c   join cities ci on ci.name = c.city set c.city_id = ci.id;
update restaurants r join cities ci on ci.name = r.city set r.city_id = ci.id;`,
        explanation:
          'Each city name is stored once; renaming "Tel Aviv" to "Tel Aviv-Yafo" becomes a one-row update, and a typo cannot create a sixth city. The old text columns can be dropped once nothing reads them.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Foreign keys', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' },
      { label: 'MySQL: UPDATE with a join', url: MY + 'update.html' },
    ],
  },
  {
    id: 'delivery-030',
    dataset: 'delivery',
    level: 4,
    topics: ['ddl'],
    title: 'A new column on 200,000 rows',
    prompt:
      'Add a column tip to orders: numeric with 2 decimals, never NULL, 0 by default. Existing orders must get 0.',
    orderMatters: false,
    checkSql: `select count(*) as orders, sum(tip) as tips, count(*) filter (where tip is null) as missing from orders`,
    checkSqlMysql: `select count(*) as orders, sum(tip) as tips, sum(tip is null) as missing from orders`,
    solutions: [
      {
        approach: 'ADD COLUMN … NOT NULL DEFAULT',
        postgres: `alter table orders add column tip numeric(8, 2) not null default 0;`,
        mysql: `alter table orders add column tip decimal(8, 2) not null default 0;`,
        mysqlNote: 'MySQL also adds a column instantly (ALGORITHM=INSTANT, only metadata changes): at the end of the table since 8.0.12, at any position since 8.0.29.',
        explanation:
          'With a constant default, PostgreSQL (11+) does not rewrite the table: it stores the default once and returns it for old rows, so the command is instant even on a huge table. A volatile default such as random() would force a full rewrite.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ALTER TABLE … ADD COLUMN', url: PG + 'sql-altertable.html' },
      { label: 'MySQL: Online DDL operations', url: MY + 'innodb-online-ddl-operations.html' },
    ],
  },
  {
    id: 'delivery-031',
    dataset: 'delivery',
    level: 5,
    topics: ['full-text'],
    title: 'Search by word beginnings',
    prompt:
      'Make restaurant names searchable by word, then find the restaurants with a word in their name starting with "bis" or "bow" (as a search box would while the user types): id and name.',
    orderMatters: true,
    checkSql: `select id, name from restaurants
where to_tsvector('simple', name) @@ to_tsquery('simple', 'bis:* | bow:*')
order by id`,
    checkSqlMysql: `select id, name from restaurants
where match(name) against ('bis* bow*' in boolean mode)
order by id`,
    solutions: [
      {
        approach: 'Prefix queries',
        postgres: `create index restaurants_name_fts on restaurants using gin (to_tsvector('simple', name));

-- search: to_tsquery('simple', 'bis:* | bow:*')`,
        mysql: `create fulltext index restaurants_name_ft on restaurants (name);

-- search: match(name) against ('bis* bow*' in boolean mode)`,
        mysqlNote: 'The trailing * marks a prefix in boolean mode. Prefixes shorter than the minimum token size (3 for InnoDB) find nothing.',
        explanation: ':* after a word in tsquery matches every word that starts with it. Unlike LIKE \'bis%\', it also finds the word in the middle of a name ("Green Bistro").',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Prefix matching in tsquery', url: PG + 'datatype-textsearch.html#DATATYPE-TSQUERY' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'delivery-032',
    dataset: 'delivery',
    level: 1,
    topics: ['distinct', 'aggregates'],
    title: 'How many different names',
    prompt: 'There are 50,000 customers. How many different full names do they have?',
    orderMatters: false,
    solutions: [
      {
        approach: 'count(DISTINCT …)',
        postgres: `select count(distinct name) as different_names
from customers;`,
        mysql: `select count(distinct name) as different_names
from customers;`,
        explanation:
          'Only 100: the generator combines 10 first names with 10 last names. A reminder that a name never identifies a customer; the id does.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'delivery-033',
    dataset: 'delivery',
    level: 1,
    topics: ['conditions'],
    title: 'Orders between 100 and 101',
    prompt: 'How many orders have a total from 100.00 up to and including 101.00?',
    orderMatters: false,
    solutions: [
      {
        approach: 'BETWEEN',
        postgres: `select count(*) as orders
from orders
where total between 100 and 101;`,
        mysql: `select count(*) as orders
from orders
where total between 100 and 101;`,
        explanation:
          'BETWEEN includes both ends: it means total >= 100 and total <= 101. For timestamps that is usually not what you want (it would include midnight of the next day); for amounts it is.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison predicates', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'delivery-034',
    dataset: 'delivery',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Competitors next door',
    prompt: 'List pairs of restaurants in the same city with the same cuisine: city, cuisine and both ids (smaller first). Only for Haifa.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join',
        postgres: `select a.city, a.cuisine, a.id as restaurant_1, b.id as restaurant_2
from restaurants a
join restaurants b on b.city = a.city and b.cuisine = a.cuisine and b.id > a.id
where a.city = 'Haifa'
order by a.cuisine, restaurant_1, restaurant_2;`,
        mysql: `select a.city, a.cuisine, a.id as restaurant_1, b.id as restaurant_2
from restaurants a
join restaurants b on b.city = a.city and b.cuisine = a.cuisine and b.id > a.id
where a.city = 'Haifa'
order by a.cuisine, restaurant_1, restaurant_2;`,
        explanation: 'A group of n restaurants with the same cuisine gives n × (n − 1) / 2 pairs: the self join grows quickly, which is why it is limited to one city.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'delivery-035',
    dataset: 'delivery',
    level: 2,
    topics: ['casting', 'strings'],
    title: 'Prices as text',
    prompt: 'For the 5 largest orders (ties by id), show id and the total formatted as text with a shekel sign and two decimals, like "₪249.99".',
    orderMatters: true,
    solutions: [
      {
        approach: 'Format the number',
        postgres: `select id, '₪' || to_char(total, 'FM999990.00') as price
from orders
order by total desc, id
limit 5;`,
        mysql: `select id, concat('₪', format(total, 2)) as price
from orders
order by total desc, id
limit 5;`,
        mysqlNote: 'FORMAT(x, 2) rounds to 2 decimals and adds thousands separators (1,234.50), which these amounts are too small to need.',
        explanation:
          'to_char turns a number into text by a pattern: 9 is an optional digit, 0 a forced one, and FM drops the padding spaces. A plain cast (total::text) would also work here, but would not guarantee two decimals in general.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Data type formatting', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: FORMAT', url: MY + 'string-functions.html#function_format' },
    ],
  },
  {
    id: 'delivery-036',
    dataset: 'delivery',
    level: 4,
    topics: ['temp-tables', 'indexes'],
    title: 'A temp table with its own index',
    prompt:
      'Build a temporary table customer_totals (customer_id, orders, spent) from delivered orders, give it a primary key, and use it for the check that looks up single customers.',
    orderMatters: true,
    checkSql: `select customer_id, orders, spent from customer_totals where customer_id in (1, 2, 3) order by customer_id`,
    solutions: [
      {
        approach: 'Temp table + primary key',
        postgres: `create temp table customer_totals as
select customer_id, count(*) as orders, sum(total) as spent
from orders
where status = 'delivered'
group by customer_id;

alter table customer_totals add primary key (customer_id);
analyze customer_totals;`,
        mysql: `create temporary table customer_totals as
select customer_id, count(*) as orders, sum(total) as spent
from orders
where status = 'delivered'
group by customer_id;

alter table customer_totals add primary key (customer_id);`,
        mysqlNote: 'MySQL collects statistics for new tables automatically; ANALYZE TABLE also exists.',
        explanation:
          'A temporary table is a real table: it can have indexes and statistics. With ~49,000 rows, lookups by customer then use the key. In PostgreSQL autovacuum never analyzes temp tables, so run ANALYZE yourself before heavy queries.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ANALYZE', url: PG + 'sql-analyze.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'delivery-037',
    dataset: 'delivery',
    level: 4,
    topics: ['views'],
    title: 'A customer summary view',
    prompt: 'Create a view customer_summary (id, name, city, delivered_orders, spent, last_order_at) that includes customers without orders (0 and NULLs).',
    orderMatters: true,
    checkSql: `select id, delivered_orders, spent from customer_summary where id in (1, 2, 3) order by id`,
    solutions: [
      {
        approach: 'View with LEFT JOIN and aggregates',
        postgres: `create view customer_summary as
select c.id, c.name, c.city,
       count(o.id) as delivered_orders,
       sum(o.total) as spent,
       max(o.created_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id and o.status = 'delivered'
group by c.id, c.name, c.city;`,
        mysql: `create view customer_summary as
select c.id, c.name, c.city,
       count(o.id) as delivered_orders,
       sum(o.total) as spent,
       max(o.created_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id and o.status = 'delivered'
group by c.id, c.name, c.city;`,
        explanation:
          'The status filter is part of the ON clause: in WHERE it would remove the customers without delivered orders again. count(o.id) is 0 for them, sum and max are NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'delivery-038',
    dataset: 'delivery',
    level: 4,
    topics: ['materialized-views', 'dates-advanced'],
    title: 'Daily revenue, stored and refreshed',
    prompt: 'Store delivered revenue per day (day, orders, revenue) for a dashboard that reads it hundreds of times a day and refreshes it hourly.',
    orderMatters: true,
    checkSql: `select day, orders, revenue from daily_revenue where day between '2025-03-01' and '2025-03-03' order by day`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view daily_revenue as
select created_at::date as day, count(*) as orders, sum(total) as revenue
from orders
where status = 'delivered'
group by created_at::date;

create unique index daily_revenue_day on daily_revenue (day);
-- hourly: refresh materialized view concurrently daily_revenue;`,
        mysql: `create table daily_revenue (day date primary key, orders int, revenue decimal(12, 2));

replace into daily_revenue
select date(created_at), count(*), sum(total)
from orders
where status = 'delivered'
group by date(created_at);`,
        mysqlNote: 'A table plus a scheduled REPLACE INTO plays the role of the materialized view.',
        explanation: 'Reading 540 stored rows instead of scanning 200,000 orders on every dashboard load. The unique index allows REFRESH … CONCURRENTLY, so readers are not blocked during the hourly refresh.',
      },
    ],
    docs: [{ label: 'PostgreSQL: REFRESH MATERIALIZED VIEW', url: PG + 'sql-refreshmaterializedview.html' }],
  },
  {
    id: 'delivery-039',
    dataset: 'delivery',
    level: 4,
    topics: ['constraints'],
    title: 'Rules for orders',
    prompt: 'Add CHECK constraints to orders: total must be positive, and status must be one of delivered, cancelled, refunded.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'orders'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'orders' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD CONSTRAINT … CHECK',
        postgres: `alter table orders
  add constraint orders_total_positive check (total > 0),
  add constraint orders_status_valid check (status in ('delivered', 'cancelled', 'refunded'));`,
        mysql: `alter table orders
  add constraint orders_total_positive check (total > 0),
  add constraint orders_status_valid check (status in ('delivered', 'cancelled', 'refunded'));`,
        explanation:
          'Both rules are checked against all 200,000 existing orders first. Named constraints give readable error messages ("violates check constraint orders_status_valid") and can be dropped by name later.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' }],
  },
  {
    id: 'delivery-040',
    dataset: 'delivery',
    level: 3,
    topics: ['lateral'],
    title: 'Three latest orders per customer',
    prompt: 'For customers 1 to 5, show their three most recent orders: customer_id, order id, created_at and total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 3',
        postgres: `select c.id as customer_id, o.id, o.created_at, o.total
from customers c
cross join lateral (
  select id, created_at, total from orders
  where customer_id = c.id
  order by created_at desc, id desc
  limit 3
) o
where c.id between 1 and 5
order by c.id, o.created_at desc, o.id desc;`,
        mysql: `select c.id as customer_id, o.id, o.created_at, o.total
from customers c
cross join lateral (
  select id, created_at, total from orders
  where customer_id = c.id
  order by created_at desc, id desc
  limit 3
) o
where c.id between 1 and 5
order by c.id, o.created_at desc, o.id desc;`,
        mysqlNote: 'LATERAL since MySQL 8.0.14; the index InnoDB keeps on orders.customer_id serves the inner query.',
        explanation: 'Per customer, the subquery reads that customer\'s orders, sorts and keeps three. In the browser database orders.customer_id has no index, so each run scans the table; an index on (customer_id, created_at) would make it instant.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'delivery-041',
    dataset: 'delivery',
    level: 3,
    topics: ['pivot', 'conditional-aggregates'],
    title: 'Order outcomes by city',
    prompt: 'For each customer city, show the number of delivered, cancelled and refunded orders as three columns.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts',
        postgres: `select c.city,
       count(*) filter (where o.status = 'delivered') as delivered,
       count(*) filter (where o.status = 'cancelled') as cancelled,
       count(*) filter (where o.status = 'refunded')  as refunded
from orders o
join customers c on c.id = o.customer_id
group by c.city
order by c.city;`,
        mysql: `select c.city,
       sum(o.status = 'delivered') as delivered,
       sum(o.status = 'cancelled') as cancelled,
       sum(o.status = 'refunded')  as refunded
from orders o
join customers c on c.id = o.customer_id
group by c.city
order by c.city;`,
        explanation: 'Three conditional counts turn the status values into columns. With random data the shares are nearly equal across cities.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'delivery-042',
    dataset: 'delivery',
    level: 3,
    topics: ['subtotals'],
    title: 'Revenue by city and cuisine, with totals',
    prompt:
      'Sum delivered revenue by restaurant city and cuisine, with a subtotal per city and a grand total (labels "All cuisines" and "All cities"). Each city\'s subtotal after its cuisines, the total last.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(r.city, 'All cities') as city,
       coalesce(r.cuisine, 'All cuisines') as cuisine,
       sum(o.total) as revenue
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by rollup (r.city, r.cuisine)
order by grouping(r.city), r.city, grouping(r.cuisine), r.cuisine;`,
        mysql: `select coalesce(r.city, 'All cities') as city,
       coalesce(r.cuisine, 'All cuisines') as cuisine,
       sum(o.total) as revenue
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.city, r.cuisine with rollup
order by grouping(r.city), r.city, grouping(r.cuisine), r.cuisine;`,
        explanation: 'ROLLUP (city, cuisine) adds one subtotal row per city and one grand total; GROUPING() sorts each subtotal after its detail rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'delivery-043',
    dataset: 'delivery',
    level: 3,
    topics: ['recursive', 'cte'],
    title: 'A histogram with every bucket',
    prompt: 'Show the number of orders in each 20-wide total band from 20 to 260 (20–40, 40–60, …, 240–260), including bands with no orders.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE of bands',
        postgres: `with recursive bands (lo) as (
  select 20 union all select lo + 20 from bands where lo < 240
)
select lo as band_from, lo + 20 as band_to, count(o.id) as orders
from bands
left join orders o on o.total >= lo and o.total < lo + 20
group by lo
order by lo;`,
        mysql: `with recursive bands (lo) as (
  select 20 union all select lo + 20 from bands where lo < 240
)
select lo as band_from, lo + 20 as band_to, count(o.id) as orders
from bands
left join orders o on o.total >= lo and o.total < lo + 20
group by lo
order by lo;`,
        explanation:
          'Totals run from 30 to 250, so the first band (20–40) and the last (240–260) are only half covered and the bands in between are nearly equal: the generator draws totals uniformly. Building the bands first is what keeps an empty band visible.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH RECURSIVE', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'delivery-044',
    dataset: 'delivery',
    level: 2,
    topics: ['full-join', 'dates-advanced'],
    title: 'Sign-ups and first orders by month',
    prompt:
      'For every month (YYYY-MM) with sign-ups or first orders, show how many customers signed up and how many placed their first order that month (0 if none).',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two monthly counts',
        postgres: `with signups as (
  select to_char(signed_up_at, 'YYYY-MM') as month, count(*) as signed_up from customers group by 1
),
firsts as (
  select to_char(first_at, 'YYYY-MM') as month, count(*) as first_orders
  from (select customer_id, min(created_at) as first_at from orders group by customer_id) f
  group by 1
)
select coalesce(s.month, f.month) as month, coalesce(s.signed_up, 0) as signed_up, coalesce(f.first_orders, 0) as first_orders
from signups s
full join firsts f on f.month = s.month
order by month;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Sign-ups run from January 2024, orders only start in January 2025, and sign-ups stop in August 2025: plenty of months exist on one side only.',
      },
      {
        approach: 'UNION ALL of events',
        postgres: `select month,
       sum(case when kind = 's' then 1 else 0 end) as signed_up,
       sum(case when kind = 'f' then 1 else 0 end) as first_orders
from (
  select to_char(signed_up_at, 'YYYY-MM') as month, 's' as kind from customers
  union all
  select to_char(min(created_at), 'YYYY-MM'), 'f' from orders group by customer_id
) e
group by month
order by month;`,
        mysql: `select month,
       sum(kind = 's') as signed_up,
       sum(kind = 'f') as first_orders
from (
  select date_format(signed_up_at, '%Y-%m') as month, 's' as kind from customers
  union all
  select date_format(min(created_at), '%Y-%m'), 'f' from orders group by customer_id
) e
group by month
order by month;`,
        explanation: 'One list of events, two conditional counts per month.',
      },
    ],
    comparison: 'Same rows. In a real product the two curves would follow each other; here they do not, a sign of independently generated data.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'delivery-045',
    dataset: 'delivery',
    level: 4,
    topics: ['generated-columns', 'indexes'],
    title: 'A date column you can index',
    prompt: 'Reports group orders by day. Add a stored generated column created_on (the date of created_at) and an index on it.',
    orderMatters: true,
    checkSql: `select created_on, count(*) as orders from orders where created_on between '2025-03-01' and '2025-03-03' group by created_on order by created_on`,
    solutions: [
      {
        approach: 'Generated column + index',
        postgres: `alter table orders add column created_on date generated always as (created_at::date) stored;
create index orders_created_on_idx on orders (created_on);`,
        mysql: `alter table orders add column created_on date generated always as (date(created_at)) stored;
create index orders_created_on_idx on orders (created_on);`,
        explanation:
          'created_at is a timestamp without time zone, so casting it to date is IMMUTABLE and allowed. (On a timestamptz it would depend on the session time zone and be refused.) Filters like created_on = \'2025-03-01\' are then simple and indexed.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'delivery-046',
    dataset: 'delivery',
    level: 4,
    topics: ['merge'],
    title: 'Keep a stats table in sync',
    prompt:
      'Create restaurant_stats (restaurant_id, orders) holding counts for restaurants 1–3, with a wrong count for 1, a correct one for 2, and a row for restaurant 999 that does not exist. Then sync it with the real counts of delivered orders for restaurants 1–3 in one statement: fix, add, and delete what should not be there.',
    orderMatters: true,
    checkSql: `select restaurant_id, orders from restaurant_stats order by restaurant_id`,
    solutions: [
      {
        approach: 'MERGE with all three cases',
        postgres: `create table restaurant_stats (restaurant_id integer primary key, orders integer not null);
insert into restaurant_stats
select 1, 0
union all select 2, count(*) from orders where restaurant_id = 2 and status = 'delivered'
union all select 999, 5;

merge into restaurant_stats t
using (select restaurant_id, count(*) as orders from orders
       where status = 'delivered' and restaurant_id between 1 and 3
       group by restaurant_id) s
on s.restaurant_id = t.restaurant_id
when matched and t.orders <> s.orders then update set orders = s.orders
when not matched then insert (restaurant_id, orders) values (s.restaurant_id, s.orders)
when not matched by source then delete;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL: delete the rows not in the source, then INSERT … ON DUPLICATE KEY UPDATE (see the leaderboard exercise in Lahman).',
        explanation: 'Restaurant 1 is fixed, 2 is left alone, 3 is added and 999 deleted: the table ends up equal to the source query.',
      },
      {
        approach: 'DELETE + upsert',
        postgres: `create table restaurant_stats (restaurant_id integer primary key, orders integer not null);
insert into restaurant_stats
select 1, 0
union all select 2, count(*) from orders where restaurant_id = 2 and status = 'delivered'
union all select 999, 5;

delete from restaurant_stats where restaurant_id not between 1 and 3;
insert into restaurant_stats (restaurant_id, orders)
select restaurant_id, count(*) from orders
where status = 'delivered' and restaurant_id between 1 and 3
group by restaurant_id
on conflict (restaurant_id) do update set orders = excluded.orders;`,
        mysql: `create table restaurant_stats (restaurant_id int primary key, orders int not null);
insert into restaurant_stats
select 1, 0
union all select 2, count(*) from orders where restaurant_id = 2 and status = 'delivered'
union all select 999, 5;

delete from restaurant_stats where restaurant_id not between 1 and 3;
insert into restaurant_stats (restaurant_id, orders)
select * from (select restaurant_id, count(*) as orders from orders
               where status = 'delivered' and restaurant_id between 1 and 3
               group by restaurant_id) as new
on duplicate key update orders = new.orders;`,
        explanation: 'The same sync in two statements; here "not in the source" is simply "outside 1–3".',
      },
    ],
    comparison: 'Same table. MERGE … NOT MATCHED BY SOURCE derives what to delete from the source itself, so it stays right even when the source is a complex query.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'delivery-047',
    dataset: 'delivery',
    level: 4,
    topics: ['json', 'arrays'],
    title: 'A filter passed as JSON',
    prompt: 'A dashboard passes the selected restaurants as a JSON array, [3, 7, 42]. Count delivered orders per selected restaurant using that one parameter.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Expand the JSON array',
        postgres: `select o.restaurant_id, count(*) as delivered
from orders o
where o.status = 'delivered'
  and o.restaurant_id in (select value::int from jsonb_array_elements_text('[3, 7, 42]'::jsonb))
group by o.restaurant_id
order by o.restaurant_id;`,
        mysql: `select o.restaurant_id, count(*) as delivered
from orders o
where o.status = 'delivered'
  and o.restaurant_id member of ('[3, 7, 42]')
group by o.restaurant_id
order by o.restaurant_id;`,
        mysqlNote: 'MEMBER OF tests a value against a JSON array directly.',
        explanation: 'jsonb_array_elements_text turns the array into rows of text; cast them and use IN. One parameter, any number of ids, no SQL built from strings.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON processing functions', url: PG + 'functions-json.html#FUNCTIONS-JSON-PROCESSING' },
      { label: 'MySQL: MEMBER OF', url: MY + 'json-search-functions.html#operator_member-of' },
    ],
  },
  {
    id: 'delivery-048',
    dataset: 'delivery',
    level: 4,
    topics: ['arrays'],
    title: 'The last three orders in one cell',
    prompt: 'For customers 1 to 5, show the ids of their three most recent orders as an array, newest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg, then slice',
        postgres: `select customer_id,
       (array_agg(id order by created_at desc, id desc))[1:3] as last_orders
from orders
where customer_id between 1 and 5
group by customer_id
order by customer_id;`,
        mysql: `select customer_id,
       cast(concat('[', substring_index(group_concat(id order by created_at desc, id desc), ',', 3), ']') as json) as last_orders
from orders
where customer_id between 1 and 5
group by customer_id
order by customer_id;`,
        mysqlNote: 'No arrays or slices: SUBSTRING_INDEX keeps the text up to the third comma, then it is cast to a JSON array.',
        explanation: 'array[1:3] is a slice: elements 1 to 3. Built in the aggregate\'s order, it holds the three newest ids.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Array slices', url: PG + 'arrays.html#ARRAYS-ACCESSING' }],
  },
  {
    id: 'delivery-049',
    dataset: 'delivery',
    level: 5,
    topics: ['triggers', 'strings'],
    title: 'Emails in lower case',
    prompt: 'Create a trigger that stores customers\' emails in lower case and without surrounding spaces on insert. Test it with customer 50001, "Test User", " Test.User@Mail.com ", Haifa, signed up 2025-09-01.',
    orderMatters: false,
    checkSql: `insert into customers (id, name, email, city, signed_up_at) values (50001, 'Test User', ' Test.User@Mail.com ', 'Haifa', '2025-09-01');
select id, email from customers where id = 50001`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger',
        postgres: `create function normalize_email() returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger customers_normalize_email
before insert on customers
for each row execute function normalize_email();`,
        mysql: `create trigger customers_normalize_email
before insert on customers
for each row
  set new.email = lower(trim(new.email));`,
        mysqlNote: 'A one-statement trigger body needs no BEGIN … END.',
        explanation: 'Normalizing on the way in means a unique index on email really prevents duplicates like "A@x.com" and "a@x.com", and lookups need no lower().',
      },
    ],
    docs: [{ label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' }],
  },
  {
    id: 'delivery-050',
    dataset: 'delivery',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Quiet days for one restaurant',
    prompt: 'For restaurant 1 in 2025, find the gaps without any order: the last day with an order before each gap, the next day with an order and the number of empty days between.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over distinct days',
        postgres: `with days as (
  select distinct created_at::date as day from orders
  where restaurant_id = 1 and created_at >= '2025-01-01' and created_at < '2026-01-01'
)
select day as last_order_day, next_day, next_day - day - 1 as empty_days
from (select day, lead(day) over (order by day) as next_day from days) d
where next_day - day - 1 >= 1
order by day;`,
        mysql: `with days as (
  select distinct date(created_at) as day from orders
  where restaurant_id = 1 and created_at >= '2025-01-01' and created_at < '2026-01-01'
)
select day as last_order_day, next_day, datediff(next_day, day) - 1 as empty_days
from (select day, lead(day) over (order by day) as next_day from days) d
where datediff(next_day, day) - 1 >= 1
order by day;`,
        explanation: 'With about 3.7 orders a day on average, empty days are rare and never two in a row in 2025: random data has few long gaps.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'delivery-051',
    dataset: 'delivery',
    level: 2,
    topics: ['casting', 'numbers'],
    title: 'Whole shekels, three ways',
    prompt: 'For orders 1 to 5, show total and the total as a whole number three ways: rounded, rounded down and cast to an integer.',
    orderMatters: true,
    solutions: [
      {
        approach: 'round / floor / cast',
        postgres: `select id, total,
       round(total)    as rounded,
       floor(total)    as rounded_down,
       total::integer  as cast_int
from orders
where id between 1 and 5
order by id;`,
        mysql: `select id, total,
       round(total)             as rounded,
       floor(total)             as rounded_down,
       cast(total as signed)    as cast_int
from orders
where id between 1 and 5
order by id;`,
        mysqlNote: 'CAST(… AS SIGNED) of a DECIMAL rounds as well.',
        explanation:
          'Casting a numeric to integer rounds (half away from zero), it does not cut off the decimals, so cast_int equals rounded here. floor() always goes down. Pick the one the business rule asks for, and write it out.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Mathematical functions', url: PG + 'functions-math.html' }],
  },
  {
    id: 'delivery-052',
    dataset: 'delivery',
    level: 2,
    topics: ['text-aggregation', 'distinct'],
    title: 'Cuisines in each city',
    prompt: 'For each restaurant city, list the cuisines available there, alphabetical and each once, as one text separated by ", ".',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg(DISTINCT …)',
        postgres: `select city, string_agg(distinct cuisine, ', ' order by cuisine) as cuisines
from restaurants
group by city
order by city;`,
        mysql: `select city, group_concat(distinct cuisine order by cuisine separator ', ') as cuisines
from restaurants
group by city
order by city;`,
        explanation: 'DISTINCT inside the aggregate drops repeated cuisines; with DISTINCT, PostgreSQL requires the ORDER BY to use the same expression.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'delivery-053',
    dataset: 'delivery',
    level: 3,
    topics: ['pivot', 'dates-advanced'],
    title: 'Revenue by weekday and cuisine',
    prompt: 'Show delivered revenue per cuisine as rows and Monday to Sunday as columns (ISO weekdays 1–7), rounded to 0 decimals.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional sums by weekday',
        postgres: `select r.cuisine,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 1)) as mon,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 2)) as tue,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 3)) as wed,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 4)) as thu,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 5)) as fri,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 6)) as sat,
       round(sum(o.total) filter (where extract(isodow from o.created_at) = 7)) as sun
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.cuisine
order by r.cuisine;`,
        mysql: `select r.cuisine,
       round(sum(case when weekday(o.created_at) = 0 then o.total end)) as mon,
       round(sum(case when weekday(o.created_at) = 1 then o.total end)) as tue,
       round(sum(case when weekday(o.created_at) = 2 then o.total end)) as wed,
       round(sum(case when weekday(o.created_at) = 3 then o.total end)) as thu,
       round(sum(case when weekday(o.created_at) = 4 then o.total end)) as fri,
       round(sum(case when weekday(o.created_at) = 5 then o.total end)) as sat,
       round(sum(case when weekday(o.created_at) = 6 then o.total end)) as sun
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.cuisine
order by r.cuisine;`,
        mysqlNote: 'WEEKDAY() counts Monday = 0, so the numbers are shifted by one compared with ISODOW.',
        explanation: 'Seven conditional sums turn weekdays into columns. Random data spreads orders evenly, so each row is nearly flat; real delivery data would peak at weekends.',
      },
    ],
    docs: [{ label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' }],
  },
  {
    id: 'delivery-054',
    dataset: 'delivery',
    level: 3,
    topics: ['date-series', 'dates-advanced'],
    title: 'Orders per hour of 1 March 2025',
    prompt: 'Show every hour of 2025-03-01 (00–23) with its number of orders, including hours with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Series of timestamps',
        postgres: `select to_char(h, 'HH24') as hour, count(o.id) as orders
from generate_series(timestamp '2025-03-01 00:00', timestamp '2025-03-01 23:00', interval '1 hour') as h
left join orders o on o.created_at >= h and o.created_at < h + interval '1 hour'
group by h
order by h;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'generate_series also steps through timestamps; here by one hour.',
      },
      {
        approach: 'Recursive hours',
        postgres: `with recursive hours (h) as (
  select timestamp '2025-03-01 00:00' union all select h + interval '1 hour' from hours where h < timestamp '2025-03-01 23:00'
)
select to_char(h, 'HH24') as hour, count(o.id) as orders
from hours
left join orders o on o.created_at >= h and o.created_at < h + interval '1 hour'
group by h
order by h;`,
        mysql: `with recursive hours (h) as (
  select cast('2025-03-01 00:00:00' as datetime) union all select h + interval 1 hour from hours where h < '2025-03-01 23:00:00'
)
select date_format(h, '%H') as hour, count(o.id) as orders
from hours
left join orders o on o.created_at >= h and o.created_at < h + interval 1 hour
group by h
order by h;`,
        explanation: 'The anchor is cast to DATETIME in MySQL so the recursive column has a date-time type, not a string.',
      },
    ],
    comparison: 'Same 24 rows.',
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'delivery-055',
    dataset: 'delivery',
    level: 1,
    topics: ['select-basics'],
    title: 'Restaurants in Haifa',
    prompt: 'List the restaurants in Haifa: id, name and cuisine, ordered by id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter on city',
        postgres: `select id, name, cuisine
from restaurants
where city = 'Haifa'
order by id;`,
        mysql: `select id, name, cuisine
from restaurants
where city = 'Haifa'
order by id;`,
        explanation: 'A plain filter. Text comparison is case-sensitive in PostgreSQL ("haifa" would match nothing) and case-insensitive with MySQL\'s default collation.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'delivery-056',
    dataset: 'delivery',
    level: 4,
    topics: ['normalization', 'constraints'],
    title: 'Statuses as a lookup table',
    prompt:
      'Replace free-text statuses with a lookup: create order_statuses (code primary key, label), fill it with the three statuses, and add a foreign key from orders.status to it.',
    orderMatters: true,
    checkSql: `select s.code, s.label, count(o.id) as orders
from order_statuses s left join orders o on o.status = s.code
group by s.code, s.label order by s.code`,
    solutions: [
      {
        approach: 'Lookup table + foreign key',
        postgres: `create table order_statuses (code text primary key, label text not null);
insert into order_statuses values ('cancelled', 'Cancelled'), ('delivered', 'Delivered'), ('refunded', 'Refunded');

alter table orders add constraint orders_status_fkey foreign key (status) references order_statuses (code);`,
        mysql: `create table order_statuses (code varchar(10) primary key, label varchar(20) not null);
insert into order_statuses values ('cancelled', 'Cancelled'), ('delivered', 'Delivered'), ('refunded', 'Refunded');

alter table orders add constraint orders_status_fkey foreign key (status) references order_statuses (code);`,
        mysqlNote: 'The foreign key needs an index on orders.status; InnoDB creates one automatically.',
        explanation:
          'Compared with a CHECK, a lookup table can hold more about each status (a label, a sort order, whether it counts as revenue) and grow without ALTER TABLE. Adding the foreign key validates all 200,000 existing orders first.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Foreign keys', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' }],
  },
  {
    id: 'delivery-057',
    dataset: 'delivery',
    level: 4,
    topics: ['upsert', 'aggregates'],
    title: 'Load daily stats twice, safely',
    prompt:
      'Create daily_stats (day primary key, orders, revenue). Load the delivered totals of 2025-03-01 and 2025-03-02 into it with one statement, then run the same statement again: the second run must update, not duplicate or fail.',
    orderMatters: true,
    checkSql: `select day, orders, revenue from daily_stats order by day`,
    solutions: [
      {
        approach: 'INSERT … SELECT with ON CONFLICT',
        postgres: `create table daily_stats (day date primary key, orders integer not null, revenue numeric(12, 2) not null);

insert into daily_stats
select created_at::date, count(*), sum(total) from orders
where status = 'delivered' and created_at >= '2025-03-01' and created_at < '2025-03-03'
group by created_at::date
on conflict (day) do update set orders = excluded.orders, revenue = excluded.revenue;

insert into daily_stats
select created_at::date, count(*), sum(total) from orders
where status = 'delivered' and created_at >= '2025-03-01' and created_at < '2025-03-03'
group by created_at::date
on conflict (day) do update set orders = excluded.orders, revenue = excluded.revenue;`,
        mysql: `create table daily_stats (day date primary key, orders int not null, revenue decimal(12, 2) not null);

insert into daily_stats
select * from (select date(created_at) as day, count(*) as orders, sum(total) as revenue from orders
               where status = 'delivered' and created_at >= '2025-03-01' and created_at < '2025-03-03'
               group by date(created_at)) as new
on duplicate key update orders = new.orders, revenue = new.revenue;

insert into daily_stats
select * from (select date(created_at) as day, count(*) as orders, sum(total) as revenue from orders
               where status = 'delivered' and created_at >= '2025-03-01' and created_at < '2025-03-03'
               group by date(created_at)) as new
on duplicate key update orders = new.orders, revenue = new.revenue;`,
        explanation: 'An idempotent load: running the job again (after a crash, or by accident) gives the same table. That property makes scheduled jobs safe to retry.',
      },
    ],
    docs: [{ label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'delivery-058',
    dataset: 'delivery',
    level: 1,
    topics: ['null', 'joins'],
    title: 'Never ordered, shown as text',
    prompt: 'For customers 1 to 20, show id, name and the date of their last order, or the text "never" if they have none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEFT JOIN + coalesce',
        postgres: `select c.id, c.name, coalesce(max(o.created_at)::date::text, 'never') as last_order
from customers c
left join orders o on o.customer_id = c.id
where c.id between 1 and 20
group by c.id, c.name
order by c.id;`,
        mysql: `select c.id, c.name, coalesce(cast(date(max(o.created_at)) as char), 'never') as last_order
from customers c
left join orders o on o.customer_id = c.id
where c.id between 1 and 20
group by c.id, c.name
order by c.id;`,
        explanation: 'max() over no matching orders is NULL. coalesce needs both arguments of one type, so the date is turned into text before "never" can stand in for it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' }],
  },
  {
    id: 'delivery-059',
    dataset: 'delivery',
    level: 5,
    topics: ['functions', 'conditions'],
    title: 'A delivery fee function',
    prompt: 'Write delivery_fee(p_total): 15 under 50, 10 under 100, 5 under 150, free from 150. The check sums the fees of all delivered orders.',
    orderMatters: false,
    checkSql: `select delivery_fee(49.99) as a, delivery_fee(100) as b, delivery_fee(150) as c,
       (select sum(delivery_fee(total)) from orders where status = 'delivered') as all_fees`,
    solutions: [
      {
        approach: 'Immutable function with CASE',
        postgres: `create function delivery_fee(p_total numeric) returns integer
language sql
immutable
as $$
  select case when p_total < 50 then 15 when p_total < 100 then 10 when p_total < 150 then 5 else 0 end;
$$;`,
        mysql: `create function delivery_fee(p_total decimal(8, 2)) returns int
deterministic
begin
  return case when p_total < 50 then 15 when p_total < 100 then 10 when p_total < 150 then 5 else 0 end;
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation: 'IMMUTABLE lets PostgreSQL inline the CASE into the query and use the function in an index. The boundaries are half-open: exactly 100 pays 5, exactly 150 pays nothing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Function volatility', url: PG + 'xfunc-volatility.html' }],
  },
  {
    id: 'delivery-060',
    dataset: 'delivery',
    level: 4,
    topics: ['temp-tables', 'text-aggregation'],
    title: 'Customers to call about refunds',
    prompt:
      'Support wants to call customers with 3 or more refunded orders. Put them in a temporary table (customer_id, refunds), then list per customer city: how many there are and their names separated by ", " in customer id order.',
    orderMatters: true,
    checkSql: `select c.city, count(*) as customers, string_agg(c.name, ', ' order by c.id) as names
from to_call t
join customers c on c.id = t.customer_id
group by c.city
order by c.city`,
    checkSqlMysql: `select c.city, count(*) as customers, group_concat(c.name order by c.id separator ', ') as names
from to_call t
join customers c on c.id = t.customer_id
group by c.city
order by c.city`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS',
        postgres: `create temporary table to_call as
select customer_id, count(*) as refunds
from orders
where status = 'refunded'
group by customer_id
having count(*) >= 3;`,
        mysql: `create temporary table to_call as
select customer_id, count(*) as refunds
from orders
where status = 'refunded'
group by customer_id
having count(*) >= 3;`,
        explanation:
          'The temp table holds the 32 customers once; the per-city list (and any follow-up, such as their latest orders) reads from it instead of re-scanning 200,000 orders. It disappears when the session ends and other sessions never see it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'delivery-061',
    dataset: 'delivery',
    level: 5,
    topics: ['partitioning'],
    title: 'One partition per status',
    prompt:
      'Most queries read only delivered orders. Create orders_by_status with the columns of orders, list-partitioned by status (delivered, cancelled, refunded), and copy the orders into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'orders_by_status'::regclass) as partitions,
       (select count(*) from orders_by_status) as total_rows,
       (select count(*) from orders_by_status where status = 'refunded') as refunded`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'orders_by_status') as partitions,
       (select count(*) from orders_by_status) as total_rows,
       (select count(*) from orders_by_status where status = 'refunded') as refunded`,
    solutions: [
      {
        approach: 'LIST partitioning',
        postgres: `create table orders_by_status (
  id            integer       not null,
  customer_id   integer       not null,
  restaurant_id integer       not null,
  total         numeric(8, 2) not null,
  status        text          not null,
  created_at    timestamp     not null,
  primary key (id, status)
) partition by list (status);

create table orders_delivered partition of orders_by_status for values in ('delivered');
create table orders_cancelled partition of orders_by_status for values in ('cancelled');
create table orders_refunded  partition of orders_by_status for values in ('refunded');

insert into orders_by_status select * from orders;`,
        mysql: `create table orders_by_status (
  id            int           not null,
  customer_id   int           not null,
  restaurant_id int           not null,
  total         decimal(8, 2) not null,
  status        varchar(10)   not null,
  created_at    datetime      not null,
  primary key (id, status)
)
partition by list columns (status) (
  partition p_delivered values in ('delivered'),
  partition p_cancelled values in ('cancelled'),
  partition p_refunded  values in ('refunded')
);

insert into orders_by_status select * from orders;`,
        mysqlNote: 'Plain LIST needs integers; LIST COLUMNS accepts strings. MySQL partitioned tables cannot have foreign keys.',
        explanation:
          'A query with "status = \'delivered\'" reads only that partition. A new status would fail to insert until it has a partition (or, in PostgreSQL, a DEFAULT partition catches everything else). When an order changes status, the row moves between partitions automatically.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: LIST COLUMNS partitioning', url: MY + 'partitioning-columns-list.html' },
    ],
  },
  {
    id: 'delivery-062',
    dataset: 'delivery',
    level: 4,
    topics: ['materialized-views', 'joins'],
    title: 'Revenue by city and cuisine, stored',
    prompt:
      'Store delivered revenue per restaurant city and cuisine (city, cuisine, orders, revenue) so the management report does not scan all orders each time, and make it refreshable without blocking readers.',
    orderMatters: true,
    checkSql: `select city, cuisine, orders, revenue from city_cuisine_revenue where city = 'Tel Aviv' order by revenue desc`,
    solutions: [
      {
        approach: 'Materialized view with a unique index',
        postgres: `create materialized view city_cuisine_revenue as
select r.city, r.cuisine, count(*) as orders, sum(o.total) as revenue
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.city, r.cuisine;

create unique index city_cuisine_revenue_key on city_cuisine_revenue (city, cuisine);
-- later: refresh materialized view concurrently city_cuisine_revenue;`,
        mysql: `create table city_cuisine_revenue (
  city    varchar(20),
  cuisine varchar(20),
  orders  int,
  revenue decimal(14, 2),
  primary key (city, cuisine)
);

replace into city_cuisine_revenue
select r.city, r.cuisine, count(*), sum(o.total)
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered'
group by r.city, r.cuisine;`,
        mysqlNote: 'No materialized views: a table filled by REPLACE INTO, re-run on a schedule. A combination that disappears would stay in the table unless it is deleted first.',
        explanation:
          'At most 30 stored rows instead of a join over 200,000 orders. REFRESH … CONCURRENTLY needs a unique index without a WHERE clause; it compares old and new contents and changes only what differs, so reports keep reading during the refresh.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' },
      { label: 'PostgreSQL: REFRESH MATERIALIZED VIEW', url: PG + 'sql-refreshmaterializedview.html' },
    ],
  },
  {
    id: 'delivery-063',
    dataset: 'delivery',
    level: 1,
    topics: ['text-search'],
    title: 'Anything at the old port',
    prompt: 'A user types "port" into the restaurant search. Find restaurants whose name contains it, in any letter case. Show id, name and city, ordered by id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE / LIKE',
        postgres: `select id, name, city
from restaurants
where name ilike '%port%'
order by id;`,
        mysql: `select id, name, city
from restaurants
where name like '%port%'
order by id;`,
        mysqlNote: 'MySQL\'s default collation (utf8mb4_0900_ai_ci) ignores case, so plain LIKE already matches "Port".',
        explanation:
          'In PostgreSQL LIKE is case-sensitive: \'%port%\' would find nothing, because every name has "Port" with a capital P. ILIKE ignores case. A leading % means no ordinary index can help; for search boxes on big tables, see trigram indexes.',
      },
      {
        approach: 'lower() on both sides',
        postgres: `select id, name, city
from restaurants
where lower(name) like '%port%'
order by id;`,
        mysql: `select id, name, city
from restaurants
where lower(name) like '%port%'
order by id;`,
        explanation: 'Portable: lower-case the column and write the pattern in lower case.',
      },
    ],
    comparison: 'Same 10 restaurants. ILIKE is PostgreSQL-only; lower() works everywhere.',
    docs: [{ label: 'PostgreSQL: LIKE and ILIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'delivery-064',
    dataset: 'delivery',
    level: 2,
    topics: ['full-join'],
    title: 'Customers and Thai restaurants by city',
    prompt:
      'Marketing plans a Thai campaign. For every city that has customers or Thai restaurants: number of customers and number of Thai restaurants (0 when none). Order by city.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two counts',
        postgres: `with c as (select city, count(*) as customers from customers group by city),
     t as (select city, count(*) as thai_restaurants from restaurants where cuisine = 'Thai' group by city)
select coalesce(c.city, t.city) as city,
       coalesce(c.customers, 0) as customers,
       coalesce(t.thai_restaurants, 0) as thai_restaurants
from c
full join t on t.city = c.city
order by city;`,
        mysql: `with c as (select city, count(*) as customers from customers group by city),
     t as (select city, count(*) as thai_restaurants from restaurants where cuisine = 'Thai' group by city)
select c.city, c.customers, coalesce(t.thai_restaurants, 0) as thai_restaurants
from c left join t on t.city = c.city
union all
select t.city, 0, t.thai_restaurants
from t left join c on c.city = t.city
where c.city is null
order by city;`,
        mysqlNote: 'No FULL JOIN in MySQL: LEFT JOIN plus the rows only the right side has.',
        explanation:
          'Ramat Gan has about 10,000 customers and no Thai restaurant: the row survives because the join is outer on both sides. A city with Thai restaurants but no customers would show up too, with 0 customers.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'delivery-065',
    dataset: 'delivery',
    level: 2,
    topics: ['self-cross-join', 'dates-basics'],
    title: 'Two orders within ten minutes',
    prompt:
      'Find pairs of orders by the same customer placed at most 10 minutes apart (possible double orders). Show customer_id, both order ids (lower id first) and the seconds between them, ordered by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self-join on customer and a time window',
        postgres: `select a.customer_id, a.id as first_id, b.id as second_id,
       abs(extract(epoch from b.created_at - a.created_at))::int as seconds_apart
from orders a
join orders b
  on b.customer_id = a.customer_id
 and b.id > a.id
 and b.created_at between a.created_at - interval '10 minutes' and a.created_at + interval '10 minutes'
order by a.customer_id, a.id;`,
        mysql: `select a.customer_id, a.id as first_id, b.id as second_id,
       abs(timestampdiff(second, a.created_at, b.created_at)) as seconds_apart
from orders a
join orders b
  on b.customer_id = a.customer_id
 and b.id > a.id
 and b.created_at between a.created_at - interval 10 minute and a.created_at + interval 10 minute
order by a.customer_id, a.id;`,
        explanation:
          'b.id > a.id keeps each pair once (not as a–b and b–a) and drops an order paired with itself. The window looks both ways, since a higher id is not always the later order. All 8 pairs are from different restaurants, so they look like real separate orders rather than double clicks.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'delivery-066',
    dataset: 'delivery',
    level: 2,
    topics: ['set-operations', 'joins'],
    title: 'Sushi and pizza people',
    prompt: 'How many customers have ordered both Sushi and Pizza (any status)?',
    orderMatters: false,
    solutions: [
      {
        approach: 'INTERSECT of two customer lists',
        postgres: `select count(*) as customers
from (
  select o.customer_id from orders o join restaurants r on r.id = o.restaurant_id where r.cuisine = 'Sushi'
  intersect
  select o.customer_id from orders o join restaurants r on r.id = o.restaurant_id where r.cuisine = 'Pizza'
) both_kinds;`,
        mysql: `select count(*) as customers
from (
  select o.customer_id from orders o join restaurants r on r.id = o.restaurant_id where r.cuisine = 'Sushi'
  intersect
  select o.customer_id from orders o join restaurants r on r.id = o.restaurant_id where r.cuisine = 'Pizza'
) both_kinds;`,
        mysqlNote: 'INTERSECT exists since MySQL 8.0.31.',
        explanation: 'INTERSECT keeps the customers found in both lists, each once.',
      },
      {
        approach: 'GROUP BY with a HAVING on distinct cuisines',
        postgres: `select count(*) as customers
from (
  select o.customer_id
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where r.cuisine in ('Sushi', 'Pizza')
  group by o.customer_id
  having count(distinct r.cuisine) = 2
) both_kinds;`,
        mysql: `select count(*) as customers
from (
  select o.customer_id
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where r.cuisine in ('Sushi', 'Pizza')
  group by o.customer_id
  having count(distinct r.cuisine) = 2
) both_kinds;`,
        explanation: 'One pass: keep orders of either cuisine and require both to appear per customer. It extends easily to "at least 3 of these 4 cuisines".',
      },
    ],
    comparison: 'Same 11,039 customers. INTERSECT reads like the question; GROUP BY … HAVING scans the orders once.',
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'delivery-067',
    dataset: 'delivery',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Record days in March',
    prompt:
      'Which days of March 2025 had more delivered revenue than each of the 7 days before them? Show the day, its revenue and the best of the previous 7 days.',
    orderMatters: true,
    solutions: [
      {
        approach: 'MAX over a frame that ends yesterday',
        postgres: `with daily as (
  select created_at::date as day, sum(total) as revenue
  from orders
  where status = 'delivered' and created_at >= '2025-02-20' and created_at < '2025-04-01'
  group by created_at::date
),
framed as (
  select day, revenue,
         max(revenue) over (order by day rows between 7 preceding and 1 preceding) as best_prev_7
  from daily
)
select day, revenue, best_prev_7
from framed
where day >= '2025-03-01' and revenue > best_prev_7
order by day;`,
        mysql: `with daily as (
  select date(created_at) as day, sum(total) as revenue
  from orders
  where status = 'delivered' and created_at >= '2025-02-20' and created_at < '2025-04-01'
  group by date(created_at)
),
framed as (
  select day, revenue,
         max(revenue) over (order by day rows between 7 preceding and 1 preceding) as best_prev_7
  from daily
)
select day, revenue, best_prev_7
from framed
where day >= '2025-03-01' and revenue > best_prev_7
order by day;`,
        explanation:
          'The frame "7 preceding and 1 preceding" excludes the current row, so each day is compared only with the week before it. The data starts at 20 February so that 1 March has a full week behind it; the March filter comes after the window, otherwise early March would see fewer previous days. ROWS counts rows: this works because every day has orders.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'delivery-068',
    dataset: 'delivery',
    level: 3,
    topics: ['gaps-islands'],
    title: 'Busy streaks for one restaurant',
    prompt:
      'For restaurant 36, find the 3 longest runs of consecutive days on which it received at least one order: first day, last day and length in days. Longest first, then earliest.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Day minus row number',
        postgres: `with days as (
  select distinct created_at::date as day from orders where restaurant_id = 36
),
grouped as (
  select day, day - (row_number() over (order by day))::int as grp from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from grouped
group by grp
order by days desc, first_day
limit 3;`,
        mysql: `with days as (
  select distinct date(created_at) as day from orders where restaurant_id = 36
),
grouped as (
  select day, day - interval (row_number() over (order by day)) day as grp from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from grouped
group by grp
order by days desc, first_day
limit 3;`,
        mysqlNote: 'date - integer is not date arithmetic in MySQL; subtract an INTERVAL instead.',
        explanation:
          'Within a run of consecutive days, both the day and its row number go up by one, so their difference stays constant and labels the island. A missing day breaks the run, and the difference jumps.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'delivery-069',
    dataset: 'delivery',
    level: 3,
    topics: ['subtotals'],
    title: 'Orders by city and status, every total',
    prompt:
      'Count orders by restaurant city and status, with subtotals per city, per status, and a grand total (label totals "All"). Order: city rows first, then the per-status totals, then the grand total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY CUBE',
        postgres: `select coalesce(r.city, 'All') as city, coalesce(o.status, 'All') as status, count(*) as orders
from orders o
join restaurants r on r.id = o.restaurant_id
group by cube (r.city, o.status)
order by grouping(r.city), r.city, grouping(o.status), o.status;`,
        mysql: `select city, status, orders
from (
  select coalesce(r.city, 'All') as city, coalesce(o.status, 'All') as status, count(*) as orders,
         grouping(r.city) as g_city, grouping(o.status) as g_status, r.city as c, o.status as s
  from orders o
  join restaurants r on r.id = o.restaurant_id
  group by r.city, o.status with rollup
  union all
  select 'All', o.status, count(*), 1, 0, null, o.status
  from orders o
  join restaurants r on r.id = o.restaurant_id
  group by o.status
) t
order by g_city, c, g_status, s;`,
        mysqlNote:
          'MySQL has WITH ROLLUP but no CUBE. ROLLUP (city, status) gives city × status, the city subtotals and the grand total; the per-status totals across cities are added with UNION ALL.',
        explanation:
          'CUBE produces every combination of the listed columns being grouped or totalled: 5 × 3 detail rows, 5 city totals, 3 status totals and 1 grand total, 24 rows. ROLLUP only totals from right to left, which is why it misses the status totals.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUPING SETS, CUBE and ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'delivery-070',
    dataset: 'delivery',
    level: 4,
    topics: ['views', 'constraints'],
    title: 'A Tel Aviv view that stays in Tel Aviv',
    prompt:
      'The Tel Aviv team may only see and add Tel Aviv restaurants. Create a view tel_aviv_restaurants (id, name, cuisine, city) that also refuses inserts or updates leaving Tel Aviv. Then add restaurant 101, "Port Said", Hummus, through the view.',
    orderMatters: true,
    checkSql: `select id, name, cuisine, city from restaurants where id > 100 order by id`,
    solutions: [
      {
        approach: 'Updatable view WITH CHECK OPTION',
        postgres: `create view tel_aviv_restaurants as
select id, name, cuisine, city
from restaurants
where city = 'Tel Aviv'
with check option;

insert into tel_aviv_restaurants (id, name, cuisine, city) values (101, 'Port Said', 'Hummus', 'Tel Aviv');`,
        mysql: `create view tel_aviv_restaurants as
select id, name, cuisine, city
from restaurants
where city = 'Tel Aviv'
with check option;

insert into tel_aviv_restaurants (id, name, cuisine, city) values (101, 'Port Said', 'Hummus', 'Tel Aviv');`,
        explanation:
          'A simple view over one table is updatable: the insert goes into restaurants. Without CHECK OPTION the view would accept a Haifa restaurant and then not show it; with it, such a row is rejected ("new row violates check option"). Views like this are a light form of row-level security.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Updatable views', url: PG + 'sql-createview.html#SQL-CREATEVIEW-UPDATABLE-VIEWS' },
      { label: 'MySQL: WITH CHECK OPTION', url: MY + 'view-check-option.html' },
    ],
  },
  {
    id: 'delivery-071',
    dataset: 'delivery',
    level: 5,
    topics: ['procedures', 'transactions'],
    title: 'Archive old refunds',
    prompt:
      'Create orders_archive with the structure of orders, and a procedure archive_refunds(p_before, OUT p_moved) that moves refunded orders created before p_before into it and reports how many it moved. Archive everything before 2025-02-01.',
    orderMatters: false,
    checkSql: `select (select count(*) from orders_archive) as archived,
       (select count(*) from orders where status = 'refunded' and created_at < '2025-02-01') as left_behind`,
    solutions: [
      {
        approach: 'INSERT … SELECT, DELETE, row count into an OUT parameter',
        postgres: `create table orders_archive (like orders including all);

create procedure archive_refunds(p_before date, out p_moved integer)
language plpgsql
as $$
begin
  insert into orders_archive
  select * from orders where status = 'refunded' and created_at < p_before;

  delete from orders where status = 'refunded' and created_at < p_before;
  get diagnostics p_moved = row_count;
end;
$$;

call archive_refunds('2025-02-01', null);`,
        mysql: `create table orders_archive like orders;

create procedure archive_refunds(p_before date, out p_moved int)
begin
  insert into orders_archive
  select * from orders where status = 'refunded' and created_at < p_before;

  delete from orders where status = 'refunded' and created_at < p_before;
  set p_moved = row_count();
end;

call archive_refunds('2025-02-01', @moved);
select @moved;`,
        mysqlNote: DELIMITER_NOTE + ' An OUT parameter is passed as a user variable (@moved) and read afterwards.',
        explanation:
          'In PostgreSQL the CALL returns the OUT value as a result row (447); the NULL in the call is just a placeholder for it. ROW_COUNT after the DELETE is the number of rows it removed. Both statements must succeed together: in PostgreSQL the CALL runs in one transaction, in MySQL wrap the CALL in START TRANSACTION … COMMIT.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GET DIAGNOSTICS', url: PG + 'plpgsql-statements.html#PLPGSQL-STATEMENTS-DIAGNOSTICS' },
      { label: 'MySQL: ROW_COUNT', url: MY + 'information-functions.html#function_row-count' },
    ],
  },
  {
    id: 'delivery-072',
    dataset: 'delivery',
    level: 1,
    topics: ['distinct', 'aggregates'],
    title: 'Customers active in June 2026',
    prompt: 'How many orders were placed in June 2026, and by how many different customers?',
    orderMatters: false,
    solutions: [
      {
        approach: 'COUNT(*) and COUNT(DISTINCT …)',
        postgres: `select count(*) as orders, count(distinct customer_id) as customers
from orders
where created_at >= '2026-06-01' and created_at < '2026-07-01';`,
        mysql: `select count(*) as orders, count(distinct customer_id) as customers
from orders
where created_at >= '2026-06-01' and created_at < '2026-07-01';`,
        explanation:
          'COUNT(*) counts rows, COUNT(DISTINCT customer_id) counts different values: a customer with three orders counts three times in the first and once in the second. The range "from the 1st, before the 1st of next month" catches every time of day on 30 June too.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'delivery-073',
    dataset: 'delivery',
    level: 1,
    topics: ['limit', 'conditions'],
    title: 'The latest cancellations',
    prompt: 'Show the 5 most recently created cancelled orders: id, customer_id, total and created_at, newest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE, ORDER BY … DESC, LIMIT',
        postgres: `select id, customer_id, total, created_at
from orders
where status = 'cancelled'
order by created_at desc, id desc
limit 5;`,
        mysql: `select id, customer_id, total, created_at
from orders
where status = 'cancelled'
order by created_at desc, id desc
limit 5;`,
        explanation: 'Filter first, sort newest first, keep five. id breaks a tie if two orders share a timestamp, so the five are always the same ones.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'delivery-074',
    dataset: 'delivery',
    level: 3,
    topics: ['lateral'],
    title: 'Last order of each Haifa restaurant',
    prompt: 'For every restaurant in Haifa: its id, name, and its most recent order (order id, created_at, total). Order by restaurant id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEFT JOIN LATERAL … LIMIT 1',
        postgres: `select r.id, r.name, last_order.id as order_id, last_order.created_at, last_order.total
from restaurants r
left join lateral (
  select o.id, o.created_at, o.total
  from orders o
  where o.restaurant_id = r.id
  order by o.created_at desc, o.id desc
  limit 1
) last_order on true
where r.city = 'Haifa'
order by r.id;`,
        mysql: `select r.id, r.name, last_order.id as order_id, last_order.created_at, last_order.total
from restaurants r
left join lateral (
  select o.id, o.created_at, o.total
  from orders o
  where o.restaurant_id = r.id
  order by o.created_at desc, o.id desc
  limit 1
) last_order on true
where r.city = 'Haifa'
order by r.id;`,
        explanation:
          'The lateral subquery runs once per restaurant and may use r.id, so "latest one" is a plain ORDER BY … LIMIT 1, returning all its columns at once. LEFT JOIN … ON TRUE keeps a restaurant that has no orders, with NULLs.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'delivery-075',
    dataset: 'delivery',
    level: 5,
    topics: ['triggers', 'constraints'],
    title: 'No orders before sign-up, from now on',
    prompt:
      'Add a trigger that rejects a new order whose created_at is before its customer\'s signed_up_at. Then insert a valid order: id 200001, customer 1, restaurant 3, total 80.00, delivered, created 2026-06-25 12:00.',
    orderMatters: false,
    checkSql: `select id, customer_id, restaurant_id, total, status, created_at from orders where id = 200001`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger that raises an error',
        postgres: `create function check_order_after_signup() returns trigger
language plpgsql
as $$
begin
  if new.created_at < (select signed_up_at from customers where id = new.customer_id) then
    raise exception 'order % is dated before customer % signed up', new.id, new.customer_id;
  end if;
  return new;
end;
$$;

create trigger orders_after_signup
before insert on orders
for each row execute function check_order_after_signup();

insert into orders (id, customer_id, restaurant_id, total, status, created_at)
values (200001, 1, 3, 80.00, 'delivered', '2026-06-25 12:00');`,
        mysql: `create trigger orders_after_signup
before insert on orders
for each row
begin
  if new.created_at < (select signed_up_at from customers where id = new.customer_id) then
    signal sqlstate '45000' set message_text = 'order is dated before the customer signed up';
  end if;
end;

insert into orders (id, customer_id, restaurant_id, total, status, created_at)
values (200001, 1, 3, 80.00, 'delivered', '2026-06-25 12:00');`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'A CHECK constraint cannot look at another table, so a rule across orders and customers needs a trigger. It only checks new rows: the 16,907 existing orders dated before sign-up stay as they are, and cleaning them up is a separate decision.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'delivery-076',
    dataset: 'delivery',
    level: 5,
    topics: ['full-text'],
    title: 'Search box for restaurants',
    prompt:
      'Make restaurants searchable by any word of name, cuisine and city together, with an index. A user types "urban sushi": return the restaurants matching both words (id, name, cuisine, city), by id.',
    orderMatters: true,
    checkSql: `select id, name, cuisine, city from restaurants
where to_tsvector('simple', name || ' ' || cuisine || ' ' || city) @@ plainto_tsquery('simple', 'urban sushi')
order by id`,
    checkSqlMysql: `select id, name, cuisine, city from restaurants
where match(name, cuisine, city) against ('+urban +sushi' in boolean mode)
order by id`,
    solutions: [
      {
        approach: 'Expression GIN index / multi-column FULLTEXT index',
        postgres: `create index restaurants_search_idx on restaurants
using gin (to_tsvector('simple', name || ' ' || cuisine || ' ' || city));

-- search: where to_tsvector('simple', name || ' ' || cuisine || ' ' || city) @@ plainto_tsquery('simple', 'urban sushi')`,
        mysql: `create fulltext index restaurants_search_ft on restaurants (name, cuisine, city);

-- search: where match(name, cuisine, city) against ('+urban +sushi' in boolean mode)`,
        mysqlNote: 'MATCH must list exactly the columns of one FULLTEXT index. In boolean mode + marks a word as required.',
        explanation:
          'plainto_tsquery turns free text into "urban & sushi", so both words must appear, in any of the three columns. The query must repeat the indexed expression exactly for the index to be used; a generated tsvector column avoids that repetition.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Parsing queries', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'delivery-077',
    dataset: 'delivery',
    level: 2,
    topics: ['self-cross-join', 'dates-basics'],
    title: 'Each month against the same month last year',
    prompt:
      'Compute delivered revenue per month, then put every month of 2026 next to the same month of 2025: month, revenue, revenue a year earlier, and the change in percent (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join the monthly table to itself, shifted by a year',
        postgres: `with monthly as (
  select date_trunc('month', created_at)::date as month, sum(total) as revenue
  from orders
  where status = 'delivered'
  group by date_trunc('month', created_at)
)
select to_char(cur.month, 'YYYY-MM') as month, cur.revenue, prev.revenue as revenue_year_before,
       round(100 * (cur.revenue - prev.revenue) / prev.revenue, 1) as change_pct
from monthly cur
join monthly prev on prev.month = cur.month - interval '1 year'
order by cur.month;`,
        mysql: `with monthly as (
  select cast(date_format(created_at, '%Y-%m-01') as date) as month, sum(total) as revenue
  from orders
  where status = 'delivered'
  group by cast(date_format(created_at, '%Y-%m-01') as date)
)
select date_format(cur.month, '%Y-%m') as month, cur.revenue, prev.revenue as revenue_year_before,
       round(100 * (cur.revenue - prev.revenue) / prev.revenue, 1) as change_pct
from monthly cur
join monthly prev on prev.month = cur.month - interval 1 year
order by cur.month;`,
        mysqlNote: 'No date_trunc in MySQL: format the date as the 1st of its month and cast it back.',
        explanation:
          'The same CTE plays both roles: cur is "this month", prev is "a year earlier", matched by date arithmetic. An inner join keeps only months that have a partner, so 2025 months (with nothing a year before) drop out. LAG(revenue, 12) would also work, but only if no month were ever missing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' }],
  },
  {
    id: 'delivery-078',
    dataset: 'delivery',
    level: 3,
    topics: ['cte', 'conditional-aggregates'],
    title: 'New and returning customers per month',
    prompt:
      'For each month of 2025: how many customers ordered, how many of them were ordering for the first time ever, and how many had ordered before.',
    orderMatters: true,
    solutions: [
      {
        approach: 'First order per customer, then classify',
        postgres: `with first_orders as (
  select customer_id, min(created_at) as first_at
  from orders
  group by customer_id
),
monthly as (
  select distinct date_trunc('month', o.created_at) as month, o.customer_id,
         date_trunc('month', f.first_at) as first_month
  from orders o
  join first_orders f on f.customer_id = o.customer_id
  where o.created_at >= '2025-01-01' and o.created_at < '2026-01-01'
)
select to_char(month, 'YYYY-MM') as month,
       count(*) as customers,
       count(*) filter (where first_month = month) as new_customers,
       count(*) filter (where first_month < month) as returning_customers
from monthly
group by month
order by month;`,
        mysql: `with first_orders as (
  select customer_id, min(created_at) as first_at
  from orders
  group by customer_id
),
monthly as (
  select distinct date_format(o.created_at, '%Y-%m') as month, o.customer_id,
         date_format(f.first_at, '%Y-%m') as first_month
  from orders o
  join first_orders f on f.customer_id = o.customer_id
  where o.created_at >= '2025-01-01' and o.created_at < '2026-01-01'
)
select month,
       count(*) as customers,
       sum(first_month = month) as new_customers,
       sum(first_month < month) as returning_customers
from monthly
group by month
order by month;`,
        explanation:
          'Step one finds when each customer first ordered; step two reduces orders to one row per customer and month; the last step only counts. In January everyone is new, because the data starts then; returning customers grow from 0% to 91% of the month by December.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'delivery-079',
    dataset: 'delivery',
    level: 3,
    topics: ['recursive', 'window-frames'],
    title: 'Loyalty points with a cap',
    prompt:
      'Customer 16177 earns floor(total / 10) points per delivered order, but the balance can never exceed 40. Show each order in time order with the points earned and the balance after it.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE carrying the balance',
        postgres: `with recursive numbered as (
  select row_number() over (order by created_at, id) as n, id, floor(total / 10)::int as earned
  from orders
  where customer_id = 16177 and status = 'delivered'
),
points (n, id, earned, balance) as (
  select n, id, earned, least(earned, 40) from numbered where n = 1
  union all
  select x.n, x.id, x.earned, least(p.balance + x.earned, 40)
  from points p
  join numbered x on x.n = p.n + 1
)
select n, id, earned, balance from points order by n;`,
        mysql: `with recursive numbered as (
  select row_number() over (order by created_at, id) as n, id, floor(total / 10) as earned
  from orders
  where customer_id = 16177 and status = 'delivered'
),
points (n, id, earned, balance) as (
  select n, id, earned, least(earned, 40) from numbered where n = 1
  union all
  select x.n, x.id, x.earned, least(p.balance + x.earned, 40)
  from points p
  join numbered x on x.n = p.n + 1
)
select n, id, earned, balance from points order by n;`,
        explanation:
          'A running SUM over a window cannot do this: once the cap cuts the balance, every later value depends on that cut, and SUM knows nothing of earlier results. The recursive CTE carries the previous balance from row to row, one order per step. Without the cap, SUM(earned) OVER (ORDER BY n) would be the simpler tool.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'delivery-080',
    dataset: 'delivery',
    level: 4,
    topics: ['normalization', 'ddl'],
    title: 'First and last name as separate columns',
    prompt:
      'customers.name holds "first last" in one value. Add first_name and last_name columns, fill them from name, and make them NOT NULL. Then: the 3 most common last names.',
    orderMatters: true,
    checkSql: `select last_name, count(*) as customers from customers group by last_name order by customers desc, last_name limit 3`,
    solutions: [
      {
        approach: 'Add, fill, then tighten',
        postgres: `alter table customers add column first_name text, add column last_name text;

update customers
set first_name = split_part(name, ' ', 1),
    last_name  = split_part(name, ' ', 2);

alter table customers alter column first_name set not null, alter column last_name set not null;`,
        mysql: `alter table customers add column first_name varchar(20), add column last_name varchar(20);

update customers
set first_name = substring_index(name, ' ', 1),
    last_name  = substring_index(name, ' ', -1);

alter table customers modify first_name varchar(20) not null, modify last_name varchar(20) not null;`,
        mysqlNote: 'MODIFY restates the full column definition to add NOT NULL.',
        explanation:
          'First normal form asks for atomic values: "sort by last name" or "greet by first name" should not need string surgery on every query. The columns are added nullable, filled, and only then made NOT NULL, because existing rows would violate the constraint in between. Every name here has exactly two words; real names would need more care.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ALTER TABLE', url: PG + 'sql-altertable.html' }],
  },
  {
    id: 'delivery-081',
    dataset: 'delivery',
    level: 1,
    topics: ['conditions', 'aggregates'],
    title: 'Haifa sign-ups of 2025',
    prompt: 'How many customers from Haifa signed up in 2025 or later?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Two conditions joined with AND',
        postgres: `select count(*) as customers
from customers
where city = 'Haifa' and signed_up_at >= '2025-01-01';`,
        mysql: `select count(*) as customers
from customers
where city = 'Haifa' and signed_up_at >= '2025-01-01';`,
        explanation: 'Both conditions must hold for a row to be counted. signed_up_at is a date, so comparing it with \'2025-01-01\' needs no conversion.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'delivery-082',
    dataset: 'delivery',
    level: 2,
    topics: ['full-join', 'distinct'],
    title: 'January customers and February customers',
    prompt: 'Compare the customers who ordered in January 2026 with those who ordered in February 2026: how many ordered in both months, only in January, only in February?',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two distinct customer lists',
        postgres: `with jan as (
  select distinct customer_id from orders where created_at >= '2026-01-01' and created_at < '2026-02-01'
),
feb as (
  select distinct customer_id from orders where created_at >= '2026-02-01' and created_at < '2026-03-01'
)
select count(*) filter (where j.customer_id is not null and f.customer_id is not null) as both_months,
       count(*) filter (where f.customer_id is null) as january_only,
       count(*) filter (where j.customer_id is null) as february_only
from jan j
full join feb f on f.customer_id = j.customer_id;`,
        mysql: `with jan as (
  select distinct customer_id from orders where created_at >= '2026-01-01' and created_at < '2026-02-01'
),
feb as (
  select distinct customer_id from orders where created_at >= '2026-02-01' and created_at < '2026-03-01'
)
select (select count(*) from jan j join feb f on f.customer_id = j.customer_id) as both_months,
       (select count(*) from jan j where not exists (select 1 from feb f where f.customer_id = j.customer_id)) as january_only,
       (select count(*) from feb f where not exists (select 1 from jan j where j.customer_id = f.customer_id)) as february_only;`,
        mysqlNote: 'No FULL JOIN in MySQL: a join and two anti-joins count the three groups.',
        explanation:
          'DISTINCT inside each CTE matters: without it, a customer with two January orders would appear twice and inflate the counts. Only 1,841 customers ordered in both months, against 8,336 January-only and 7,463 February-only.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'delivery-083',
    dataset: 'delivery',
    level: 2,
    topics: ['set-operations', 'dates-basics'],
    title: 'Open last New Year, quiet this one',
    prompt: 'Which restaurants received orders on 1 January 2025 but none on 1 January 2026? Show id and name, by id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'EXCEPT of two day lists',
        postgres: `select r.id, r.name
from restaurants r
where r.id in (
  select restaurant_id from orders where created_at >= '2025-01-01' and created_at < '2025-01-02'
  except
  select restaurant_id from orders where created_at >= '2026-01-01' and created_at < '2026-01-02'
)
order by r.id;`,
        mysql: `select r.id, r.name
from restaurants r
where r.id in (
  select restaurant_id from orders where created_at >= '2025-01-01' and created_at < '2025-01-02'
  except
  select restaurant_id from orders where created_at >= '2026-01-01' and created_at < '2026-01-02'
)
order by r.id;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation:
          'EXCEPT keeps the restaurant ids of the first list that are missing from the second; the outer query adds the names. Each day is a half-open range, so every time of day counts. Two restaurants: Blue Table and Night Table.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'delivery-084',
    dataset: 'delivery',
    level: 3,
    topics: ['subtotals', 'dates-advanced'],
    title: '2025 revenue by quarter and month',
    prompt:
      'Delivered revenue of 2025 by quarter and month, with a subtotal per quarter and the year total. Show quarter (\'all\' on the total), month (\'all\' on subtotals and the total) and revenue.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP over a date hierarchy',
        postgres: `select coalesce(extract(quarter from created_at)::text, 'all') as quarter,
       coalesce(to_char(date_trunc('month', created_at), 'YYYY-MM'), 'all') as month,
       sum(total) as revenue
from orders
where status = 'delivered' and created_at >= '2025-01-01' and created_at < '2026-01-01'
group by rollup (extract(quarter from created_at), date_trunc('month', created_at))
order by grouping(extract(quarter from created_at)), extract(quarter from created_at),
         grouping(date_trunc('month', created_at)), date_trunc('month', created_at);`,
        mysql: `select coalesce(cast(q as char), 'all') as quarter, coalesce(m, 'all') as month, revenue
from (
  select quarter(created_at) as q, date_format(created_at, '%Y-%m') as m, sum(total) as revenue,
         grouping(quarter(created_at)) as gq, grouping(date_format(created_at, '%Y-%m')) as gm
  from orders
  where status = 'delivered' and created_at >= '2025-01-01' and created_at < '2026-01-01'
  group by quarter(created_at), date_format(created_at, '%Y-%m') with rollup
) t
order by gq, q, gm, m;`,
        explanation:
          'ROLLUP follows the column list from left to right: month within quarter, quarter within the year. Because each month belongs to exactly one quarter, the hierarchy is clean: 12 month rows, 4 quarter subtotals, 1 total.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'delivery-085',
    dataset: 'delivery',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'A feed that adds, renames and removes',
    prompt:
      'Run the setup, then apply the restaurant feed in one statement: each row has an op, \'upsert\' (insert or update) or \'delete\'. Feed: (101, delete), (102, Harbor Fish, Sushi, Haifa, upsert), (3, Blue Fork Sushi, Sushi, Tel Aviv, upsert).\n\nSetup: insert into restaurants values (101, \'Pop-up Grill\', \'Burgers\', \'Haifa\');',
    orderMatters: true,
    checkSql: `select id, name, cuisine, city from restaurants where id in (3, 101, 102) order by id`,
    solutions: [
      {
        approach: 'MERGE with conditions on each action',
        postgres: `insert into restaurants values (101, 'Pop-up Grill', 'Burgers', 'Haifa');

merge into restaurants r
using (values (101, null, null, null, 'delete'),
              (102, 'Harbor Fish', 'Sushi', 'Haifa', 'upsert'),
              (3, 'Blue Fork Sushi', 'Sushi', 'Tel Aviv', 'upsert')) as feed (id, name, cuisine, city, op)
on r.id = feed.id
when matched and feed.op = 'delete' then
  delete
when matched then
  update set name = feed.name, cuisine = feed.cuisine, city = feed.city
when not matched and feed.op = 'upsert' then
  insert (id, name, cuisine, city) values (feed.id, feed.name, feed.cuisine, feed.city);`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation:
          'WHEN clauses are tried in order and the first match wins, so the delete test must come before the general update. A delete for an id that does not exist matches no clause and is ignored. Deleting a restaurant that has orders would still fail on the foreign key, which is why the feed only removes the pop-up.',
      },
      {
        approach: 'One statement per action',
        postgres: `insert into restaurants values (101, 'Pop-up Grill', 'Burgers', 'Haifa');

delete from restaurants where id = 101;

insert into restaurants (id, name, cuisine, city)
values (102, 'Harbor Fish', 'Sushi', 'Haifa'), (3, 'Blue Fork Sushi', 'Sushi', 'Tel Aviv')
on conflict (id) do update set name = excluded.name, cuisine = excluded.cuisine, city = excluded.city;`,
        mysql: `insert into restaurants values (101, 'Pop-up Grill', 'Burgers', 'Haifa');

delete from restaurants where id = 101;

insert into restaurants (id, name, cuisine, city)
values (102, 'Harbor Fish', 'Sushi', 'Haifa'), (3, 'Blue Fork Sushi', 'Sushi', 'Tel Aviv') as new
on duplicate key update name = new.name, cuisine = new.cuisine, city = new.city;`,
        explanation: 'Deletes first, then an upsert for the rest; wrap both in a transaction so readers never see half of the feed applied.',
      },
    ],
    comparison: 'Same three rows afterwards. MERGE reads the feed once and keeps the rules together; two statements work in MySQL.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'delivery-086',
    dataset: 'delivery',
    level: 4,
    topics: ['views', 'subqueries'],
    title: 'A "last 7 days" view that keeps up',
    prompt:
      'Create a view recent_orders with the orders of the 7 days up to the newest order in the table (not up to today: the data ends in June 2026). Then count them by status.',
    orderMatters: true,
    checkSql: `select status, count(*) as orders from recent_orders group by status order by status`,
    solutions: [
      {
        approach: 'A view relative to MAX(created_at)',
        postgres: `create view recent_orders as
select *
from orders
where created_at >= (select max(created_at) from orders) - interval '7 days';`,
        mysql: `create view recent_orders as
select *
from orders
where created_at >= (select max(created_at) from orders) - interval 7 day;`,
        explanation:
          'A view stores the query, not the rows, so the window moves forward as new orders arrive. Live systems would use now() or current_date instead of MAX; the subquery keeps the example working on sample data that ends in the past. SELECT * in a view is expanded when the view is created: a column added to orders later does not appear in the view.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'delivery-087',
    dataset: 'delivery',
    level: 5,
    topics: ['functions', 'procedures'],
    title: 'Top restaurants of a city, as a table',
    prompt:
      'Create a routine top_restaurants(p_city, p_n) returning the p_n restaurants of the city with the most delivered revenue (id, name, revenue). In PostgreSQL, let p_n default to 3. Ask for Haifa.',
    orderMatters: false,
    checkSql: `select * from top_restaurants('Haifa')`,
    checkSqlMysql: `call top_restaurants('Haifa', 3)`,
    solutions: [
      {
        approach: 'Set-returning function with a default / procedure',
        postgres: `create function top_restaurants(p_city text, p_n integer default 3)
returns table (id integer, name text, revenue numeric)
language sql
stable
as $$
  select r.id, r.name, sum(o.total)
  from restaurants r
  join orders o on o.restaurant_id = r.id
  where r.city = p_city and o.status = 'delivered'
  group by r.id, r.name
  order by sum(o.total) desc, r.id
  limit p_n;
$$;`,
        mysql: `create procedure top_restaurants(in p_city varchar(20), in p_n int)
reads sql data
begin
  select r.id, r.name, sum(o.total) as revenue
  from restaurants r
  join orders o on o.restaurant_id = r.id
  where r.city = p_city and o.status = 'delivered'
  group by r.id, r.name
  order by revenue desc, r.id
  limit p_n;
end;`,
        mysqlNote:
          DELIMITER_NOTE + ' MySQL functions return single values, so a procedure that ends in a SELECT returns the rows. Procedure parameters have no defaults: every call passes p_n. LIMIT accepts a parameter inside a routine.',
        explanation:
          'A default parameter keeps the common call short, top_restaurants(\'Haifa\'), while top_restaurants(\'Haifa\', 10) still works. Because it returns a table, the PostgreSQL function can be joined or filtered like one. Sunny Fork leads Haifa.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Functions returning tables', url: PG + 'xfunc-sql.html#XFUNC-SQL-FUNCTIONS-RETURNING-TABLE' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'delivery-088',
    dataset: 'delivery',
    level: 4,
    topics: ['upsert', 'constraints'],
    title: 'Upsert on the email, not the id',
    prompt:
      'Make customers.email unique. Then import two customers by email in one statement: noa.mizrahi2@mail.com (exists: update city to Haifa) and dana.levi.new@mail.com (new: id 50001, Dana Levi, Herzliya, signed up 2026-06-25).',
    orderMatters: true,
    checkSql: `select id, name, email, city, signed_up_at from customers where email in ('noa.mizrahi2@mail.com', 'dana.levi.new@mail.com') order by id`,
    solutions: [
      {
        approach: 'Unique index, then ON CONFLICT (email)',
        postgres: `create unique index customers_email_key on customers (email);

insert into customers (id, name, email, city, signed_up_at)
values (2, 'Noa Mizrahi', 'noa.mizrahi2@mail.com', 'Haifa', '2024-01-01'),
       (50001, 'Dana Levi', 'dana.levi.new@mail.com', 'Herzliya', '2026-06-25')
on conflict (email) do update set city = excluded.city;`,
        mysql: `create unique index customers_email_key on customers (email);

insert into customers (id, name, email, city, signed_up_at)
values (2, 'Noa Mizrahi', 'noa.mizrahi2@mail.com', 'Haifa', '2024-01-01'),
       (50001, 'Dana Levi', 'dana.levi.new@mail.com', 'Herzliya', '2026-06-25') as new
on duplicate key update city = new.city;`,
        mysqlNote:
          'ON DUPLICATE KEY reacts to a clash on ANY unique key, primary or email; you cannot name one. Here both point to the same row, so it does not matter, but with two independent unique keys the result can surprise.',
        explanation:
          'ON CONFLICT needs a unique index or constraint on exactly the named columns, which is why the index comes first. Only city is updated, so the existing sign-up date stays as it was although the feed sent a different one.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'delivery-089',
    dataset: 'delivery',
    level: 4,
    topics: ['materialized-views', 'aggregates'],
    title: 'Customer value, stored for marketing',
    prompt:
      'Store per customer, from delivered orders: orders, spent (2 decimals) and last_order (timestamp). Marketing reads it all day; it is refreshed nightly. Then: the 5 biggest spenders.',
    orderMatters: true,
    checkSql: `select customer_id, orders, spent, last_order from customer_value order by spent desc, customer_id limit 5`,
    solutions: [
      {
        approach: 'Materialized view keyed by customer',
        postgres: `create materialized view customer_value as
select customer_id, count(*) as orders, round(sum(total), 2) as spent, max(created_at) as last_order
from orders
where status = 'delivered'
group by customer_id;

create unique index customer_value_key on customer_value (customer_id);`,
        mysql: `create table customer_value (
  customer_id int primary key,
  orders      int,
  spent       decimal(12, 2),
  last_order  datetime
);

replace into customer_value
select customer_id, count(*), round(sum(total), 2), max(created_at)
from orders
where status = 'delivered'
group by customer_id;`,
        mysqlNote: 'A keyed table refreshed by REPLACE INTO stands in for the materialized view.',
        explanation:
          'Recency (last_order), frequency (orders) and monetary value (spent) are the classic RFM measures. Stored, they cost one index lookup per customer instead of an aggregate over 184,000 delivered orders.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'delivery-090',
    dataset: 'delivery',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for the fraud screen',
    prompt:
      'Fraud review looks at delivered orders of 240 or more, newest first, showing id, customer_id and total. Create an index for exactly those orders that answers the screen from the index.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'orders' and indexdef like '%total%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'orders' and column_name = 'status' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Partial covering index',
        postgres: `create index orders_fraud_idx on orders (created_at desc) include (id, customer_id, total)
where status = 'delivered' and total >= 240;

-- used by: select id, customer_id, total from orders
--          where status = 'delivered' and total >= 240 order by created_at desc limit 50`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation:
          '8,425 of 200,000 orders, already in newest-first order, with the displayed columns included. The query\'s WHERE must imply the index\'s WHERE (same or stricter), otherwise the planner cannot use it.',
      },
      {
        approach: 'Composite index',
        postgres: `create index orders_status_total_idx on orders (status, total, created_at);`,
        mysql: `create index orders_status_total_idx on orders (status, total, created_at);`,
        explanation:
          'status = \'delivered\' and total >= 240 is one range of this index, but the rows come out by total, not by date, so a sort is still needed. In InnoDB the primary key id is carried along automatically.',
      },
    ],
    comparison: 'The partial index is small and pre-sorted for the screen; the composite one is larger, needs a sort, but works in MySQL.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'delivery-091',
    dataset: 'delivery',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'Names in any order',
    prompt:
      'Support types "cohen noa". With a full-text index on customers.name, count the customers whose name contains both words, in any order. Compare with LIKE \'%cohen noa%\'.',
    orderMatters: false,
    checkSql: `select count(*) as customers from customers where to_tsvector('simple', name) @@ plainto_tsquery('simple', 'cohen noa')`,
    checkSqlMysql: `select count(*) as customers from customers where match(name) against ('+cohen +noa' in boolean mode)`,
    solutions: [
      {
        approach: 'Words, not a substring',
        postgres: `create index customers_name_fts on customers using gin (to_tsvector('simple', name));

-- search: where to_tsvector('simple', name) @@ plainto_tsquery('simple', 'cohen noa')`,
        mysql: `create fulltext index customers_name_ft on customers (name);

-- search: where match(name) against ('+cohen +noa' in boolean mode)`,
        mysqlNote: '"Noa" has exactly 3 letters, the default minimum InnoDB indexes; a 2-letter name would be ignored.',
        explanation:
          'Full-text search matches words wherever they are, so "cohen noa" finds the 479 Noa Cohens. LIKE \'%cohen noa%\' looks for that exact sequence of characters and finds nobody, because names are stored first name first.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'delivery-092',
    dataset: 'delivery',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'One customer\'s order history in a line',
    prompt: 'For customer 16177: the number of orders and the restaurant names of all their orders in time order, separated by " → ".',
    orderMatters: false,
    solutions: [
      {
        approach: 'string_agg ordered by created_at',
        postgres: `select count(*) as orders,
       string_agg(r.name, ' → ' order by o.created_at, o.id) as history
from orders o
join restaurants r on r.id = o.restaurant_id
where o.customer_id = 16177;`,
        mysql: `select count(*) as orders,
       group_concat(r.name order by o.created_at, o.id separator ' → ') as history
from orders o
join restaurants r on r.id = o.restaurant_id
where o.customer_id = 16177;`,
        explanation:
          'The ORDER BY inside the aggregate controls the order of names in the string; without it the order is whatever the join produced. Fifteen orders, the most of any customer, so this is also a quick way to eyeball a customer\'s habits.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'delivery-093',
    dataset: 'delivery',
    level: 3,
    topics: ['pivot', 'conditional-aggregates'],
    title: 'Cuisines, first and second quarter of 2026',
    prompt:
      'Delivered orders per cuisine in Q1 2026 and Q2 2026 (data ends 24 June), one column per quarter, plus the change in percent (1 decimal). Order by cuisine.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts per quarter',
        postgres: `select r.cuisine,
       count(*) filter (where o.created_at < '2026-04-01') as q1,
       count(*) filter (where o.created_at >= '2026-04-01') as q2,
       round(100.0 * (count(*) filter (where o.created_at >= '2026-04-01') - count(*) filter (where o.created_at < '2026-04-01'))
             / count(*) filter (where o.created_at < '2026-04-01'), 1) as change_pct
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered' and o.created_at >= '2026-01-01' and o.created_at < '2026-07-01'
group by r.cuisine
order by r.cuisine;`,
        mysql: `select r.cuisine,
       sum(o.created_at < '2026-04-01') as q1,
       sum(o.created_at >= '2026-04-01') as q2,
       round(100 * (sum(o.created_at >= '2026-04-01') - sum(o.created_at < '2026-04-01'))
             / sum(o.created_at < '2026-04-01'), 1) as change_pct
from orders o
join restaurants r on r.id = o.restaurant_id
where o.status = 'delivered' and o.created_at >= '2026-01-01' and o.created_at < '2026-07-01'
group by r.cuisine
order by r.cuisine;`,
        explanation:
          'Every cuisine drops a few percent in Q2, but Q2 is a week short (it ends 24 June), so most of the drop is the calendar, not demand. Comparing per day, or full quarters only, would be fairer.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'delivery-094',
    dataset: 'delivery',
    level: 3,
    topics: ['lateral'],
    title: 'Each customer\'s first order',
    prompt: 'For customers 1 to 3: id, name, and their first order ever (order id, created_at, restaurant name).',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL with a join inside',
        postgres: `select c.id, c.name, first_order.id as order_id, first_order.created_at, first_order.restaurant
from customers c
cross join lateral (
  select o.id, o.created_at, r.name as restaurant
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.customer_id = c.id
  order by o.created_at, o.id
  limit 1
) first_order
where c.id between 1 and 3
order by c.id;`,
        mysql: `select c.id, c.name, first_order.id as order_id, first_order.created_at, first_order.restaurant
from customers c
cross join lateral (
  select o.id, o.created_at, r.name as restaurant
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.customer_id = c.id
  order by o.created_at, o.id
  limit 1
) first_order
where c.id between 1 and 3
order by c.id;`,
        explanation: 'The lateral subquery may contain its own joins; here it fetches the restaurant name together with the first order, so the outer query needs no extra join. With the index on orders(customer_id) each lookup reads one customer\'s orders only.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'delivery-095',
    dataset: 'delivery',
    level: 3,
    topics: ['date-series', 'dates-advanced'],
    title: 'Sign-ups week by week, until they stopped',
    prompt: 'Count customer sign-ups for every week starting on a Monday from 4 August to 1 September 2025 (5 weeks), including weeks with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Weekly series LEFT JOIN customers',
        postgres: `select w.week_start::date as week_start, count(c.id) as signups
from generate_series('2025-08-04'::date, '2025-09-01', interval '7 days') as w (week_start)
left join customers c
  on c.signed_up_at >= w.week_start and c.signed_up_at < w.week_start + interval '7 days'
group by w.week_start
order by w.week_start;`,
        mysql: `with recursive weeks (week_start) as (
  select cast('2025-08-04' as date)
  union all
  select week_start + interval 7 day from weeks where week_start < '2025-09-01'
)
select w.week_start, count(c.id) as signups
from weeks w
left join customers c
  on c.signed_up_at >= w.week_start and c.signed_up_at < w.week_start + interval 7 day
group by w.week_start
order by w.week_start;`,
        explanation:
          'Sign-ups end on 22 August 2025, so the last two weeks show 0; without the series they would simply be missing. Starting the series on a Monday makes each week a Monday-to-Sunday range.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'delivery-096',
    dataset: 'delivery',
    level: 4,
    topics: ['json', 'group-by'],
    title: 'Cuisines per city as a JSON object',
    prompt: 'For each city, build one JSON object mapping cuisine to the number of restaurants, like {"Pizza": 2, "Sushi": 11, …}. Order by city.',
    orderMatters: true,
    solutions: [
      {
        approach: 'jsonb_object_agg / JSON_OBJECTAGG',
        postgres: `select city, jsonb_object_agg(cuisine, restaurants) as cuisines
from (select city, cuisine, count(*) as restaurants from restaurants group by city, cuisine) c
group by city
order by city;`,
        mysql: `select city, json_objectagg(cuisine, restaurants) as cuisines
from (select city, cuisine, count(*) as restaurants from restaurants group by city, cuisine) c
group by city
order by city;`,
        explanation:
          'The inner query counts per (city, cuisine); the outer one folds each city\'s rows into a single object, keys from one column and values from another. Ramat Gan\'s object has no Thai key at all, rather than "Thai": 0.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON aggregates', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_OBJECTAGG', url: MY + 'aggregate-functions.html#function_json-objectagg' },
    ],
  },
  {
    id: 'delivery-097',
    dataset: 'delivery',
    level: 2,
    topics: ['full-join', 'conditional-aggregates'],
    title: 'Refunds and cancellations, restaurant by restaurant',
    prompt: 'For June 2026, compare restaurants with refunded orders and restaurants with cancelled orders: how many restaurants have both, only refunds, only cancellations?',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two per-restaurant counts',
        postgres: `with rf as (
  select restaurant_id, count(*) as n from orders
  where status = 'refunded' and created_at >= '2026-06-01' and created_at < '2026-07-01' group by restaurant_id
),
cn as (
  select restaurant_id, count(*) as n from orders
  where status = 'cancelled' and created_at >= '2026-06-01' and created_at < '2026-07-01' group by restaurant_id
)
select count(*) filter (where rf.restaurant_id is not null and cn.restaurant_id is not null) as both_kinds,
       count(*) filter (where cn.restaurant_id is null) as refunds_only,
       count(*) filter (where rf.restaurant_id is null) as cancellations_only
from rf
full join cn on cn.restaurant_id = rf.restaurant_id;`,
        mysql: `with rf as (
  select restaurant_id, count(*) as n from orders
  where status = 'refunded' and created_at >= '2026-06-01' and created_at < '2026-07-01' group by restaurant_id
),
cn as (
  select restaurant_id, count(*) as n from orders
  where status = 'cancelled' and created_at >= '2026-06-01' and created_at < '2026-07-01' group by restaurant_id
)
select (select count(*) from rf join cn on cn.restaurant_id = rf.restaurant_id) as both_kinds,
       (select count(*) from rf where not exists (select 1 from cn where cn.restaurant_id = rf.restaurant_id)) as refunds_only,
       (select count(*) from cn where not exists (select 1 from rf where rf.restaurant_id = cn.restaurant_id)) as cancellations_only;`,
        mysqlNote: 'No FULL JOIN in MySQL: a join and two anti-joins.',
        explanation: '95 restaurants had both, 3 only refunds, 2 only cancellations. With about four problem orders per restaurant a month, a restaurant missing from one list is chance, not a sign of quality.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'delivery-098',
    dataset: 'delivery',
    level: 3,
    topics: ['recursive', 'numbers'],
    title: 'Three installments that add up',
    prompt:
      'Split each of orders 1 to 3 into 3 installments: each installment is the remaining amount divided by the installments left, rounded to 2 decimals, so the last one absorbs the rounding. Show order id, installment number and amount.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE carrying the remaining amount',
        postgres: `with recursive parts (order_id, n, amount, remaining) as (
  select id, 1, round(total / 3, 2), total - round(total / 3, 2)
  from orders where id between 1 and 3
  union all
  select order_id, n + 1, round(remaining / (3 - n), 2), remaining - round(remaining / (3 - n), 2)
  from parts
  where n < 3
)
select order_id, n as installment, amount
from parts
order by order_id, n;`,
        mysql: `with recursive parts (order_id, n, amount, remaining) as (
  select id, 1, round(total / 3, 2), total - round(total / 3, 2)
  from orders where id between 1 and 3
  union all
  select order_id, n + 1, round(remaining / (3 - n), 2), remaining - round(remaining / (3 - n), 2)
  from parts
  where n < 3
)
select order_id, n as installment, amount
from parts
order by order_id, n;`,
        explanation:
          'Dividing the original total by 3 three times would lose or gain a cent: 174.16 / 3 = 58.0533…, and 3 × 58.05 is 174.15. Recomputing from what is left keeps the sum exact (58.05 + 58.06 + 58.05). Each row depends on the previous remainder, which is what recursion carries.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'delivery-099',
    dataset: 'delivery',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'The longest silence',
    prompt: 'Across all orders, find the 2 longest gaps between one order and the next (by created_at): the order before the gap, its time, the next order time, and the gap in minutes.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over the whole order stream',
        postgres: `with stream as (
  select id, created_at, lead(created_at) over (order by created_at, id) as next_at
  from orders
)
select id, created_at, next_at,
       floor(extract(epoch from next_at - created_at) / 60)::int as gap_minutes
from stream
where next_at is not null
order by next_at - created_at desc, id
limit 2;`,
        mysql: `with stream as (
  select id, created_at, lead(created_at) over (order by created_at, id) as next_at
  from orders
)
select id, created_at, next_at,
       timestampdiff(minute, created_at, next_at) as gap_minutes
from stream
where next_at is not null
order by timestampdiff(second, created_at, next_at) desc, id
limit 2;`,
        mysqlNote: 'TIMESTAMPDIFF(MINUTE, …) counts whole minutes, like floor(… / 60).',
        explanation:
          'With an order every few minutes on average, the longest silence is only 45 minutes, on 4 April 2025 in the morning, followed by 44 minutes in November. Below that, several gaps are within seconds of each other, so a "top 3" would hinge on exact timestamps. In a live system, such a gap is what monitoring alerts on: it often means the ordering service was down, not that nobody was hungry.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'delivery-100',
    dataset: 'delivery',
    level: 4,
    topics: ['temp-tables', 'dates-advanced'],
    title: 'Customer lifetimes, computed once',
    prompt:
      'Store per customer the first and last order time and the lifetime in whole days between them in a temporary table lifetimes (customer_id, first_at, last_at, days). Then: how many customers have a lifetime of 0 days (one day of orders only), under 180 days, and 180 or more?',
    orderMatters: false,
    checkSql: `select count(*) filter (where days = 0) as one_day,
       count(*) filter (where days > 0 and days < 180) as under_180,
       count(*) filter (where days >= 180) as at_least_180
from lifetimes`,
    checkSqlMysql: `select sum(days = 0) as one_day,
       sum(days > 0 and days < 180) as under_180,
       sum(days >= 180) as at_least_180
from lifetimes`,
    solutions: [
      {
        approach: 'Aggregate once into a temporary table',
        postgres: `create temporary table lifetimes as
select customer_id, min(created_at) as first_at, max(created_at) as last_at,
       max(created_at)::date - min(created_at)::date as days
from orders
group by customer_id;`,
        mysql: `create temporary table lifetimes as
select customer_id, min(created_at) as first_at, max(created_at) as last_at,
       datediff(max(created_at), min(created_at)) as days
from orders
group by customer_id;`,
        explanation:
          'Lifetime is the span between first and last order in calendar days. Customers who never ordered are not in orders and so not in the table; for churn analysis you would LEFT JOIN from customers.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'delivery-101',
    dataset: 'delivery',
    level: 4,
    topics: ['generated-columns', 'indexes'],
    title: 'A size band the database maintains',
    prompt:
      'Add a stored generated column size_band to orders: \'small\' under 50, \'medium\' under 150, otherwise \'large\', and index it. Then count orders per band.',
    orderMatters: true,
    checkSql: `select size_band, count(*) as orders from orders group by size_band order by min(total)`,
    solutions: [
      {
        approach: 'CASE in a generated column',
        postgres: `alter table orders
add column size_band varchar(6)
generated always as (case when total < 50 then 'small' when total < 150 then 'medium' else 'large' end) stored;

create index orders_size_band_idx on orders (size_band);`,
        mysql: `alter table orders
add column size_band varchar(6)
generated always as (case when total < 50 then 'small' when total < 150 then 'medium' else 'large' end) stored;

create index orders_size_band_idx on orders (size_band);`,
        explanation:
          'The band is defined once in the schema, so every report uses the same boundaries. Adding a stored generated column rewrites all 200,000 rows; a VIRTUAL one (MySQL, PostgreSQL 18) would be computed on read instead.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'delivery-102',
    dataset: 'delivery',
    level: 5,
    topics: ['partitioning', 'ddl'],
    title: 'Archive a half-year by detaching it',
    prompt:
      'Create orders_by_half (id, customer_id, total, status, created_at) range-partitioned into 2025 H1, 2025 H2 and 2026 H1, copy the orders in, then take 2025 H1 out of the table as a standalone archive table orders_2025_h1, without copying rows.',
    orderMatters: false,
    checkSql: `select (select count(*) from orders_by_half) as still_partitioned, (select count(*) from orders_2025_h1) as archived`,
    solutions: [
      {
        approach: 'DETACH PARTITION / EXCHANGE PARTITION',
        postgres: `create table orders_by_half (
  id          integer       not null,
  customer_id integer       not null,
  total       numeric(8, 2) not null,
  status      text          not null,
  created_at  timestamp     not null,
  primary key (id, created_at)
) partition by range (created_at);

create table orders_2025_h1 partition of orders_by_half for values from ('2025-01-01') to ('2025-07-01');
create table orders_2025_h2 partition of orders_by_half for values from ('2025-07-01') to ('2026-01-01');
create table orders_2026_h1 partition of orders_by_half for values from ('2026-01-01') to ('2026-07-01');

insert into orders_by_half select id, customer_id, total, status, created_at from orders;

alter table orders_by_half detach partition orders_2025_h1;`,
        mysql: `create table orders_by_half (
  id          int           not null,
  customer_id int           not null,
  total       decimal(8, 2) not null,
  status      varchar(10)   not null,
  created_at  datetime      not null,
  primary key (id, created_at)
)
partition by range columns (created_at) (
  partition p2025_h1 values less than ('2025-07-01'),
  partition p2025_h2 values less than ('2026-01-01'),
  partition p2026_h1 values less than ('2026-07-01')
);

insert into orders_by_half select id, customer_id, total, status, created_at from orders;

create table orders_2025_h1 like orders_by_half;
alter table orders_2025_h1 remove partitioning;
alter table orders_by_half exchange partition p2025_h1 with table orders_2025_h1;
alter table orders_by_half drop partition p2025_h1;`,
        mysqlNote: 'MySQL swaps a partition with an empty, unpartitioned table of the same structure (EXCHANGE PARTITION), then drops the now-empty partition.',
        explanation:
          'Detaching only changes the catalog: the 66,786 rows of 2025 H1 stay where they are and become an ordinary table, while orders_by_half keeps the 133,214 newer ones. That is how big tables retire old data without a long DELETE.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Partition maintenance', url: PG + 'ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-MAINTENANCE' },
      { label: 'MySQL: Exchanging partitions', url: MY + 'partitioning-management-exchange.html' },
    ],
  },
]
