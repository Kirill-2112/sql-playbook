import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

interface Options {
  mysqlNote?: string
  orderMatters?: boolean
  hint?: string
}

/** One step of a Delivery lab (src/content/labs.ts): a level 3 exercise, verified on both databases. */
function step(
  id: string,
  topics: string[],
  title: string,
  prompt: string,
  postgres: string,
  mysql: string,
  approach: string,
  explanation: string,
  docs: Exercise['docs'],
  options: Options = {},
): Exercise {
  return {
    id,
    dataset: 'delivery',
    level: 3,
    topics,
    title,
    prompt,
    hint: options.hint,
    orderMatters: options.orderMatters ?? true,
    solutions: [{ approach, postgres, mysql, mysqlNote: options.mysqlNote, explanation }],
    docs,
  }
}

const WINDOW_DOCS = [
  { label: 'PostgreSQL: window functions', url: PG + 'tutorial-window.html' },
  { label: 'MySQL: window functions', url: MY + 'window-functions-usage.html' },
]
const CTE_DOCS = [
  { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
  { label: 'MySQL: WITH (common table expressions)', url: MY + 'with.html' },
]

// Lab "Is the retention chart right?" — a flat retention curve, and the data check that explains it.
export const deliveryLabs: Exercise[] = [
  step(
    'delivery-125',
    ['ranking', 'cte'],
    'Cohorts by first order',
    "Put every customer in the month of their first order (YYYY-MM): count the customers per month, by month. Number each customer's orders by created_at (then id) and keep the first.",
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select to_char(created_at, 'YYYY-MM') as cohort, count(*) as customers
from ranked
where n = 1
group by to_char(created_at, 'YYYY-MM')
order by cohort;`,
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select date_format(created_at, '%Y-%m') as cohort, count(*) as customers
from ranked
where n = 1
group by date_format(created_at, '%Y-%m')
order by cohort;`,
    'ROW_NUMBER per customer, keep 1',
    'January 2025 has over 10,000 “new” customers, the most of any month and fifty times June 2026, while sign-ups run steady at about 2,500 a month. Orders in this data start on 1 January 2025, so everyone who was already a customer gets their “first” order in January.',
    WINDOW_DOCS,
    { mysqlNote: "date_format(d, '%Y-%m') instead of to_char(d, 'YYYY-MM')." },
  ),
  step(
    'delivery-126',
    ['ranking', 'cte', 'joins'],
    'Who are the January newcomers?',
    'Take the customers whose first order is in January 2025. How many of them signed up in 2024 and how many in 2025? Show signup_year and customers, by year.',
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select extract(year from c.signed_up_at)::int as signup_year, count(*) as customers
from ranked r
join customers c on c.id = r.customer_id
where r.n = 1 and r.created_at < '2025-02-01'
group by extract(year from c.signed_up_at)
order by signup_year;`,
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select year(c.signed_up_at) as signup_year, count(*) as customers
from ranked r
join customers c on c.id = r.customer_id
where r.n = 1 and r.created_at < '2025-02-01'
group by year(c.signed_up_at)
order by signup_year;`,
    'Join the first orders to the customers',
    'Six in ten of the “January newcomers” signed up in 2024. The data is cut on the left: a first order inside the data is not a first order ever. A cohort needs a date that really is the start, here the sign-up date.',
    CTE_DOCS,
    { mysqlNote: 'year(d) instead of extract(year from d).' },
  ),
  step(
    'delivery-127',
    ['cte', 'pivot', 'dates-advanced'],
    'The retention table',
    'For customers who signed up from January to June 2025: per sign-up month (cohort, YYYY-MM), the number of customers and the share in percent (1 decimal) who placed any order 1, 2 and 3 calendar months after their sign-up month: month_1, month_2, month_3.',
    `with c as (
  select id, signed_up_at, to_char(signed_up_at, 'YYYY-MM') as cohort
  from customers
  where signed_up_at >= '2025-01-01' and signed_up_at < '2025-07-01'
), a as (
  select distinct c.id,
         (extract(year from o.created_at) * 12 + extract(month from o.created_at))
         - (extract(year from c.signed_up_at) * 12 + extract(month from c.signed_up_at)) as month_no
  from c
  join orders o on o.customer_id = c.id
)
select c.cohort,
       count(distinct c.id) as customers,
       round(100.0 * count(distinct case when a.month_no = 1 then c.id end) / count(distinct c.id), 1) as month_1,
       round(100.0 * count(distinct case when a.month_no = 2 then c.id end) / count(distinct c.id), 1) as month_2,
       round(100.0 * count(distinct case when a.month_no = 3 then c.id end) / count(distinct c.id), 1) as month_3
from c
left join a on a.id = c.id
group by c.cohort
order by c.cohort;`,
    `with c as (
  select id, signed_up_at, date_format(signed_up_at, '%Y-%m') as cohort
  from customers
  where signed_up_at >= '2025-01-01' and signed_up_at < '2025-07-01'
), a as (
  select distinct c.id,
         period_diff(date_format(o.created_at, '%Y%m'), date_format(c.signed_up_at, '%Y%m')) as month_no
  from c
  join orders o on o.customer_id = c.id
)
select c.cohort,
       count(distinct c.id) as customers,
       round(100.0 * count(distinct case when a.month_no = 1 then c.id end) / count(distinct c.id), 1) as month_1,
       round(100.0 * count(distinct case when a.month_no = 2 then c.id end) / count(distinct c.id), 1) as month_2,
       round(100.0 * count(distinct case when a.month_no = 3 then c.id end) / count(distinct c.id), 1) as month_3
from c
left join a on a.id = c.id
group by c.cohort
order by c.cohort;`,
    'Month number since sign-up, then one column per month',
    'Year × 12 + month turns two dates into a count of calendar months between them. Every cohort keeps 18–22% in every month: no drop after the first month, no difference between cohorts. Real customers fade: a flat line this even is a warning, not good news.',
    CTE_DOCS,
    {
      hint: 'COUNT(DISTINCT CASE WHEN … THEN id END) counts each customer once per column, however many orders they placed.',
      mysqlNote: "MySQL counts calendar months with period_diff('YYYYMM', 'YYYYMM'); year() * 12 + month() would fail on negative results, because those functions return unsigned numbers.",
    },
  ),
  step(
    'delivery-128',
    ['ranking', 'cte', 'joins'],
    'Orders from before the account',
    'For customers who signed up in 2025: per sign-up month (signed_up, YYYY-MM), the customers with orders, how many of them have a first order dated before their sign-up (first_order_before) and that share in percent (pct, 1 decimal).',
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select to_char(c.signed_up_at, 'YYYY-MM') as signed_up,
       count(*) as customers,
       count(*) filter (where r.created_at < c.signed_up_at) as first_order_before,
       round(100.0 * count(*) filter (where r.created_at < c.signed_up_at) / count(*), 1) as pct
from ranked r
join customers c on c.id = r.customer_id
where r.n = 1 and c.signed_up_at >= '2025-01-01'
group by to_char(c.signed_up_at, 'YYYY-MM')
order by signed_up;`,
    `with ranked as (
  select customer_id, created_at,
         row_number() over (partition by customer_id order by created_at, id) as n
  from orders
)
select date_format(c.signed_up_at, '%Y-%m') as signed_up,
       count(*) as customers,
       sum(case when r.created_at < c.signed_up_at then 1 else 0 end) as first_order_before,
       round(100.0 * sum(case when r.created_at < c.signed_up_at then 1 else 0 end) / count(*), 1) as pct
from ranked r
join customers c on c.id = r.customer_id
where r.n = 1 and c.signed_up_at >= '2025-01-01'
group by date_format(c.signed_up_at, '%Y-%m')
order by signed_up;`,
    'First order vs sign-up date',
    'An order cannot come before the account exists, yet 10% of January sign-ups and 83% of August ones have one. The later the sign-up, the more of the order history lies before it: orders are attached to customers at random. The retention table was measuring noise.',
    WINDOW_DOCS,
    { mysqlNote: 'SUM of CASE instead of FILTER.' },
  ),
]
