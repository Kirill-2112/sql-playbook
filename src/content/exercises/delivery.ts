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
]
