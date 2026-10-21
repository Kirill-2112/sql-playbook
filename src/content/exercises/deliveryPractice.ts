import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const TODAY_NOTE = 'The data ends on 24 June 2026: treat the latest order time as "now".'

// Product analytics on the big dataset: active users, cohorts, churn risk, concentration, streaks.
export const deliveryPractice: Exercise[] = [
  {
    id: 'delivery-115',
    dataset: 'delivery',
    level: 2,
    topics: ['dates-advanced', 'aggregates'],
    title: 'Monthly active customers',
    prompt: 'How many different customers received at least one delivered order in each month? Show the first day of the month and the count.',
    orderMatters: true,
    solutions: [
      {
        approach: 'COUNT(DISTINCT) per DATE_TRUNC month',
        postgres: `select date_trunc('month', created_at)::date as month,
       count(distinct customer_id) as active_customers
from orders
where status = 'delivered'
group by 1
order by 1;`,
        mysql: `select cast(date_format(created_at, '%Y-%m-01') as date) as month,
       count(distinct customer_id) as active_customers
from orders
where status = 'delivered'
group by month
order by month;`,
        mysqlNote: 'MySQL has no DATE_TRUNC; DATE_FORMAT to the first of the month does the same.',
        explanation: '"Monthly active users" is the first number every product dashboard shows. COUNT(DISTINCT) counts each customer once per month, however many times they ordered.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: COUNT(DISTINCT)', url: MY + 'aggregate-functions.html#function_count-distinct' },
    ],
  },
  {
    id: 'delivery-116',
    dataset: 'delivery',
    level: 3,
    topics: ['cte', 'dates-advanced'],
    title: 'Did the cohort come back next month?',
    prompt:
      'Group customers by the month of their first delivered order (their cohort). For each cohort show the month, the number of customers, how many ordered again in the following calendar month, and that share in percent (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'First-order cohort + LEFT JOIN to next month',
        postgres: `with first_orders as (
  select customer_id, date_trunc('month', min(created_at))::date as cohort
  from orders
  where status = 'delivered'
  group by customer_id
),
next_month as (
  select distinct f.customer_id
  from first_orders f
  join orders o
    on o.customer_id = f.customer_id
   and o.status = 'delivered'
   and o.created_at >= f.cohort + interval '1 month'
   and o.created_at < f.cohort + interval '2 months'
)
select f.cohort,
       count(*) as customers,
       count(n.customer_id) as came_back,
       round(100.0 * count(n.customer_id) / count(*), 1) as pct
from first_orders f
left join next_month n on n.customer_id = f.customer_id
group by f.cohort
order by f.cohort;`,
        mysql: `with first_orders as (
  select customer_id, cast(date_format(min(created_at), '%Y-%m-01') as date) as cohort
  from orders
  where status = 'delivered'
  group by customer_id
),
next_month as (
  select distinct f.customer_id
  from first_orders f
  join orders o
    on o.customer_id = f.customer_id
   and o.status = 'delivered'
   and o.created_at >= f.cohort + interval 1 month
   and o.created_at < f.cohort + interval 2 month
)
select f.cohort,
       count(*) as customers,
       count(n.customer_id) as came_back,
       round(100.0 * count(n.customer_id) / count(*), 1) as pct
from first_orders f
left join next_month n on n.customer_id = f.customer_id
group by f.cohort
order by f.cohort;`,
        mysqlNote: 'Only the month and interval syntax change.',
        explanation:
          'Cohort analysis compares groups that started at the same time, so growth in new customers does not hide falling loyalty. The newest cohort shows 0%: its next month has not happened yet in the data.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
      { label: 'MySQL: WITH', url: MY + 'with.html' },
    ],
  },
  {
    id: 'delivery-117',
    dataset: 'delivery',
    level: 3,
    topics: ['dates-basics', 'group-by'],
    title: 'Customers at risk',
    prompt: `${TODAY_NOTE} Count, per city, the customers whose last delivered order was more than 90 days before now. Most first, ties by city.`,
    orderMatters: true,
    solutions: [
      {
        approach: 'Last order per customer, compared with "now"',
        postgres: `with last_order as (
  select customer_id, max(created_at) as last_at
  from orders
  where status = 'delivered'
  group by customer_id
)
select c.city, count(*) as at_risk
from last_order l
join customers c on c.id = l.customer_id
where l.last_at < (select max(created_at) from orders) - interval '90 days'
group by c.city
order by at_risk desc, c.city;`,
        mysql: `with last_order as (
  select customer_id, max(created_at) as last_at
  from orders
  where status = 'delivered'
  group by customer_id
)
select c.city, count(*) as at_risk
from last_order l
join customers c on c.id = l.customer_id
where l.last_at < (select max(created_at) from orders) - interval 90 day
group by c.city
order by at_risk desc, c.city;`,
        explanation: 'A churn list: people who used to order and went quiet. Marketing would send them a voucher. On live data "now" is now(); here it is the last order in the data.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG + 'functions-datetime.html#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: DATE_SUB and intervals', url: MY + 'date-and-time-functions.html#function_date-sub' },
    ],
  },
  {
    id: 'delivery-118',
    dataset: 'delivery',
    level: 3,
    topics: ['lag-lead'],
    title: 'How often do people order?',
    prompt: 'Across all customers, what is the average time between one delivered order and the same customer\'s next one, in days (1 decimal)?',
    orderMatters: false,
    solutions: [
      {
        approach: 'LAG per customer, then average',
        postgres: `with gaps as (
  select created_at - lag(created_at) over (partition by customer_id order by created_at, id) as gap
  from orders
  where status = 'delivered'
)
select round(avg(extract(epoch from gap)) / 86400, 1) as avg_days_between_orders
from gaps
where gap is not null;`,
        mysql: `with gaps as (
  select timestampdiff(second, lag(created_at) over (partition by customer_id order by created_at, id), created_at) as gap_seconds
  from orders
  where status = 'delivered'
)
select round(avg(gap_seconds) / 86400, 1) as avg_days_between_orders
from gaps
where gap_seconds is not null;`,
        mysqlNote: 'Subtracting DATETIMEs does not give an interval in MySQL; TIMESTAMPDIFF counts the seconds.',
        explanation:
          'LAG pairs each order with the customer\'s previous one; the first order of each customer has no gap and is skipped. Average in seconds and convert to days at the end, so nothing is rounded too early.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY + 'date-and-time-functions.html#function_timestampdiff' },
    ],
  },
  {
    id: 'delivery-119',
    dataset: 'delivery',
    level: 3,
    topics: ['ranking', 'conditional-aggregates'],
    title: 'How much do the top 10% bring?',
    prompt: 'Split customers into ten equal groups by what they spent on delivered orders. What share of all revenue (percent, 1 decimal) comes from the top group?',
    orderMatters: false,
    solutions: [
      {
        approach: 'NTILE(10) + FILTER',
        postgres: `with spend as (
  select customer_id, sum(total) as spent
  from orders
  where status = 'delivered'
  group by customer_id
),
deciles as (
  select spent, ntile(10) over (order by spent desc) as decile
  from spend
)
select round(100.0 * sum(spent) filter (where decile = 1) / sum(spent), 1) as top10_share_pct
from deciles;`,
        mysql: `with spend as (
  select customer_id, sum(total) as spent
  from orders
  where status = 'delivered'
  group by customer_id
),
deciles as (
  select spent, ntile(10) over (order by spent desc) as decile
  from spend
)
select round(100.0 * sum(case when decile = 1 then spent end) / sum(spent), 1) as top10_share_pct
from deciles;`,
        mysqlNote: 'No FILTER in MySQL: CASE inside SUM does the same.',
        explanation: 'NTILE(10) deals the sorted customers into ten piles of (almost) equal size. Concentration like this answers "how dependent are we on our best customers?"',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ntile', url: PG + 'functions-window.html' },
      { label: 'MySQL: NTILE', url: MY + 'window-function-descriptions.html#function_ntile' },
    ],
  },
  {
    id: 'delivery-120',
    dataset: 'delivery',
    level: 3,
    topics: ['aggregates', 'group-by'],
    title: 'Each city\'s share of revenue',
    prompt: 'For delivered orders, show each customer city\'s revenue (2 decimals) and its share of the total in percent (1 decimal), biggest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'SUM(SUM(…)) OVER ()',
        postgres: `select c.city,
       round(sum(o.total), 2) as revenue,
       round(100.0 * sum(o.total) / sum(sum(o.total)) over (), 1) as share_pct
from orders o
join customers c on c.id = o.customer_id
where o.status = 'delivered'
group by c.city
order by revenue desc;`,
        mysql: `select c.city,
       round(sum(o.total), 2) as revenue,
       round(100.0 * sum(o.total) / sum(sum(o.total)) over (), 1) as share_pct
from orders o
join customers c on c.id = o.customer_id
where o.status = 'delivered'
group by c.city
order by revenue desc;`,
        explanation: 'The window runs after GROUP BY, so SUM(SUM(total)) OVER () adds up the per-city sums into the grand total on every row: no subquery needed.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window function processing', url: PG + 'tutorial-window.html' },
      { label: 'MySQL: window functions', url: MY + 'window-functions-usage.html' },
    ],
  },
  {
    id: 'delivery-121',
    dataset: 'delivery',
    level: 3,
    topics: ['ranking'],
    title: 'Top three restaurants of every city',
    prompt: 'Rank restaurants within their city by revenue from delivered orders and show the top 3 of each city: city, name, revenue (2 decimals) and rank.',
    orderMatters: true,
    solutions: [
      {
        approach: 'RANK over grouped revenue',
        postgres: `with ranked as (
  select r.city, r.name, sum(o.total) as revenue,
         rank() over (partition by r.city order by sum(o.total) desc) as rnk
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.status = 'delivered'
  group by r.city, r.id, r.name
)
select city, name, round(revenue, 2) as revenue, rnk
from ranked
where rnk <= 3
order by city, rnk;`,
        mysql: `with ranked as (
  select r.city, r.name, sum(o.total) as revenue,
         rank() over (partition by r.city order by sum(o.total) desc) as rnk
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.status = 'delivered'
  group by r.city, r.id, r.name
)
select city, name, round(revenue, 2) as revenue, rnk
from ranked
where rnk <= 3
order by city, rnk;`,
        explanation: 'A window function can rank an aggregate in the same query: GROUP BY first builds the revenue per restaurant, then RANK orders them inside each city.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: RANK', url: MY + 'window-function-descriptions.html#function_rank' },
    ],
  },
  {
    id: 'delivery-122',
    dataset: 'delivery',
    level: 2,
    topics: ['dates-basics', 'group-by'],
    title: 'The last seven days',
    prompt: `${TODAY_NOTE} Show delivered orders and revenue (2 decimals) for each of the last 7 calendar days, today included.`,
    orderMatters: true,
    solutions: [
      {
        approach: 'Date of "now" minus 6 days',
        postgres: `select created_at::date as day,
       count(*) as orders,
       round(sum(total), 2) as revenue
from orders
where status = 'delivered'
  and created_at >= (select max(created_at) from orders)::date - 6
group by 1
order by 1;`,
        mysql: `select date(created_at) as day,
       count(*) as orders,
       round(sum(total), 2) as revenue
from orders
where status = 'delivered'
  and created_at >= date((select max(created_at) from orders)) - interval 6 day
group by day
order by day;`,
        mysqlNote: 'DATE() takes the date part; subtract an interval instead of a number.',
        explanation: 'Seven calendar days means today and the six before it, starting at midnight. In PostgreSQL date − integer subtracts days; on live data you would use current_date - 6.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG + 'functions-datetime.html#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: DATE', url: MY + 'date-and-time-functions.html#function_date' },
    ],
  },
  {
    id: 'delivery-123',
    dataset: 'delivery',
    level: 3,
    topics: ['aggregates', 'dates-basics'],
    title: 'From sign-up to first order',
    prompt:
      'For customers who ordered after signing up, take the days from the sign-up date to the date of their first order. What is the median, rounded to 1 decimal?',
    orderMatters: false,
    solutions: [
      {
        approach: 'PERCENTILE_CONT',
        postgres: `with firsts as (
  select min(o.created_at)::date - c.signed_up_at as days
  from customers c
  join orders o on o.customer_id = c.id and o.created_at >= c.signed_up_at
  group by c.id, c.signed_up_at
)
select round(percentile_cont(0.5) within group (order by days)::numeric, 1) as median_days
from firsts;`,
        mysql: null,
        mysqlNote: 'MySQL has no PERCENTILE_CONT; use solution B.',
        explanation: 'date − date gives whole days in PostgreSQL; the median is not pulled up by the few people who waited a very long time.',
      },
      {
        approach: 'ROW_NUMBER middle rows',
        postgres: `with firsts as (
  select min(o.created_at)::date - c.signed_up_at as days
  from customers c
  join orders o on o.customer_id = c.id and o.created_at >= c.signed_up_at
  group by c.id, c.signed_up_at
),
numbered as (
  select days, row_number() over (order by days) as rn, count(*) over () as n
  from firsts
)
select round(avg(days), 1) as median_days
from numbered
where rn in (floor((n + 1) / 2), floor(n / 2) + 1);`,
        mysql: `with firsts as (
  select datediff(min(o.created_at), c.signed_up_at) as days
  from customers c
  join orders o on o.customer_id = c.id and o.created_at >= c.signed_up_at
  group by c.id, c.signed_up_at
),
numbered as (
  select days, row_number() over (order by days) as rn, count(*) over () as n
  from firsts
)
select round(avg(days), 1) as median_days
from numbered
where rn in (floor((n + 1) / 2), floor(n / 2) + 1);`,
        mysqlNote: 'DATEDIFF counts the days between the two dates.',
        explanation: 'Sort, number, and average the middle one or two rows.',
      },
    ],
    comparison: 'Same median. Prefer PERCENTILE_CONT where it exists; the ROW_NUMBER version is portable.',
    docs: [
      { label: 'PostgreSQL: ordered-set aggregates', url: PG + 'functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE' },
      { label: 'MySQL: DATEDIFF', url: MY + 'date-and-time-functions.html#function_datediff' },
    ],
  },
  {
    id: 'delivery-124',
    dataset: 'delivery',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Three months in a row',
    prompt: 'How many customers had delivered orders in three consecutive calendar months at least once?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Distinct months + LAG(…, 2)',
        postgres: `with months as (
  select distinct customer_id, date_trunc('month', created_at)::date as m
  from orders
  where status = 'delivered'
),
runs as (
  select customer_id, m, lag(m, 2) over (partition by customer_id order by m) as two_before
  from months
)
select count(distinct customer_id) as customers
from runs
where two_before = m - interval '2 months';`,
        mysql: `with months as (
  select distinct customer_id, cast(date_format(created_at, '%Y-%m-01') as date) as m
  from orders
  where status = 'delivered'
),
runs as (
  select customer_id, m, lag(m, 2) over (partition by customer_id order by m) as two_before
  from months
)
select count(distinct customer_id) as customers
from runs
where two_before = m - interval 2 month;`,
        explanation:
          'Reduce orders to one row per customer and month. If the month two rows back is exactly two calendar months earlier, the three months in between are all present: a streak of three.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: lag', url: PG + 'functions-window.html' },
      { label: 'MySQL: LAG', url: MY + 'window-function-descriptions.html#function_lag' },
    ],
  },
]
