import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

interface Options {
  mysql?: string | null
  mysqlNote?: string
  orderMatters?: boolean
  hint?: string
}

/** One step of a Northwind lab (src/content/labs.ts): a level 2 exercise like any other, verified on both databases. */
function step(
  id: string,
  topics: string[],
  title: string,
  prompt: string,
  postgres: string,
  approach: string,
  explanation: string,
  docs: Exercise['docs'],
  options: Options = {},
): Exercise {
  return {
    id,
    dataset: 'northwind',
    level: 2,
    topics,
    title,
    prompt,
    hint: options.hint,
    orderMatters: options.orderMatters ?? true,
    solutions: [
      { approach, postgres, mysql: options.mysql === undefined ? postgres : options.mysql, mysqlNote: options.mysqlNote, explanation },
    ],
    docs,
  }
}

const AGG_DOCS = [
  { label: 'PostgreSQL: aggregate functions', url: PG + 'functions-aggregate.html' },
  { label: 'MySQL: aggregate functions', url: MY + 'aggregate-functions.html' },
]
const GROUP_DOCS = [
  { label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
  { label: 'MySQL: GROUP BY', url: MY + 'group-by-handling.html' },
]
const DATE_DOCS = [
  { label: 'PostgreSQL: date/time functions', url: PG + 'functions-datetime.html' },
  { label: 'MySQL: date and time functions', url: MY + 'date-and-time-functions.html' },
]
const CASE_DOCS = [
  { label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' },
  { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
]

// Lab "Did sales drop in 1998?" — the year looks a third smaller, until you notice where the data ends.
const salesLab: Exercise[] = [
  step(
    'northwind-195',
    ['group-by', 'aggregates', 'dates-basics'],
    'Revenue by year',
    'For each year: the year, the number of orders and the revenue (unit_price × quantity × (1 − discount) over all order lines), rounded to 2 decimals, by year.',
    `select extract(year from o.order_date)::int as year,
       count(distinct o.order_id) as orders,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from orders o
join order_details d on d.order_id = o.order_id
group by extract(year from o.order_date)
order by year;`,
    'GROUP BY the year',
    'Revenue sits on the order lines, so orders are joined to order_details. One order has several lines, which is why the order count needs DISTINCT.',
    [...GROUP_DOCS, ...DATE_DOCS],
    {
      mysql: `select year(o.order_date) as year,
       count(distinct o.order_id) as orders,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from orders o
join order_details d on d.order_id = o.order_id
group by year(o.order_date)
order by year;`,
      mysqlNote: 'MySQL has year(date); PostgreSQL uses extract(year from …).',
    },
  ),
  step(
    'northwind-196',
    ['aggregates', 'dates-basics'],
    'Where the data starts and ends',
    'Show the date of the first order and of the last order: first_order and last_order.',
    `select min(order_date) as first_order,
       max(order_date) as last_order
from orders;`,
    'MIN and MAX of the date',
    'The last order is from 6 May 1998: the data stops there. A year that is only four months long cannot be compared with a full one.',
    AGG_DOCS,
    { orderMatters: false },
  ),
  step(
    'northwind-197',
    ['group-by', 'dates-basics'],
    'Orders per month at the end',
    'Count the orders per month from November 1997 on: month as YYYY-MM and orders, by month.',
    `select to_char(order_date, 'YYYY-MM') as month,
       count(*) as orders
from orders
where order_date >= '1997-11-01'
group by to_char(order_date, 'YYYY-MM')
order by month;`,
    'GROUP BY a formatted month',
    'Orders were growing every month, then May 1998 has only 14: the export was taken in early May. The “drop” is missing data, not missing sales.',
    [...GROUP_DOCS, ...DATE_DOCS],
    {
      mysql: `select date_format(order_date, '%Y-%m') as month,
       count(*) as orders
from orders
where order_date >= '1997-11-01'
group by date_format(order_date, '%Y-%m')
order by month;`,
      mysqlNote: "MySQL formats dates with date_format(d, '%Y-%m'); PostgreSQL uses to_char(d, 'YYYY-MM').",
    },
  ),
  step(
    'northwind-198',
    ['conditional-aggregates', 'dates-basics'],
    'Compare like with like',
    'Compare the same four months of two years: revenue from January to April 1997 and from January to April 1998, as jan_apr_1997 and jan_apr_1998, each rounded to 2 decimals.',
    `select round(sum(case when o.order_date >= '1997-01-01' and o.order_date < '1997-05-01'
                      then d.unit_price * d.quantity * (1 - d.discount) end), 2) as jan_apr_1997,
       round(sum(case when o.order_date >= '1998-01-01' and o.order_date < '1998-05-01'
                      then d.unit_price * d.quantity * (1 - d.discount) end), 2) as jan_apr_1998
from orders o
join order_details d on d.order_id = o.order_id;`,
    'SUM of CASE, one column per period',
    'The same months more than doubled, from about 191 thousand to 422 thousand. Sales did not drop: they grew fast, and the year was simply not over.',
    CASE_DOCS,
    { hint: 'A CASE inside SUM adds only the rows that match; the others count as nothing.', orderMatters: false },
  ),
  step(
    'northwind-199',
    ['conditional-aggregates', 'subqueries', 'joins'],
    'Which categories grew most',
    'For each category: category_name, revenue in January–April 1997 and 1998 (y1997, y1998, rounded to 2 decimals) and the growth in percent (growth_pct, rounded to 1 decimal), biggest growth first.',
    `select category_name,
       round(y1997, 2) as y1997,
       round(y1998, 2) as y1998,
       round(100 * (y1998 - y1997) / y1997, 1) as growth_pct
from (
  select c.category_name,
         sum(case when o.order_date >= '1997-01-01' and o.order_date < '1997-05-01'
                  then d.unit_price * d.quantity * (1 - d.discount) else 0 end) as y1997,
         sum(case when o.order_date >= '1998-01-01' and o.order_date < '1998-05-01'
                  then d.unit_price * d.quantity * (1 - d.discount) else 0 end) as y1998
  from orders o
  join order_details d on d.order_id = o.order_id
  join products p on p.product_id = d.product_id
  join categories c on c.category_id = p.category_id
  group by c.category_name
) t
order by growth_pct desc;`,
    'Aggregate in a subquery, then compute',
    'The inner query adds up each period per category; the outer one compares them. Seafood almost quadrupled and Beverages more than doubled, so the growth is broad, not one lucky product.',
    [...CASE_DOCS, { label: 'PostgreSQL: subqueries in FROM', url: PG + 'queries-table-expressions.html#QUERIES-SUBQUERIES' }],
  ),
]

// Lab "Late deliveries" — who ships late, and how to compare fairly when some do more work than others.
const lateLab: Exercise[] = [
  step(
    'northwind-200',
    ['conditional-aggregates'],
    'How many orders were late?',
    'Count the orders shipped after their required date (late), the orders not shipped yet (not_shipped) and all orders (total).',
    `select count(*) filter (where shipped_date > required_date) as late,
       count(*) filter (where shipped_date is null) as not_shipped,
       count(*) as total
from orders;`,
    'COUNT … FILTER',
    'FILTER counts only the rows that match its condition, all in one pass. An order without a shipped_date is neither late nor on time yet: comparing NULL gives no answer, so it is not counted as late.',
    [{ label: 'PostgreSQL: aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }, ...CASE_DOCS],
    {
      mysql: `select sum(case when shipped_date > required_date then 1 else 0 end) as late,
       sum(case when shipped_date is null then 1 else 0 end) as not_shipped,
       count(*) as total
from orders;`,
      mysqlNote: 'MySQL has no FILTER: a SUM of CASE … THEN 1 ELSE 0 counts the same rows.',
      orderMatters: false,
    },
  ),
  step(
    'northwind-201',
    ['conditional-aggregates', 'joins'],
    'Late rate per shipper',
    'For each shipping company: company_name, orders shipped (shipped), late orders (late) and the late share in percent (late_pct, rounded to 1 decimal), highest share first.',
    `select s.company_name,
       count(o.shipped_date) as shipped,
       count(*) filter (where o.shipped_date > o.required_date) as late,
       round(100.0 * count(*) filter (where o.shipped_date > o.required_date) / count(o.shipped_date), 1) as late_pct
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.company_name
order by late_pct desc;`,
    'Count, then divide',
    'United Package has the most late orders, and also the most orders. The share puts companies of different size on one scale. count(column) skips NULLs, so unshipped orders do not count as shipped.',
    [...GROUP_DOCS, ...CASE_DOCS],
    {
      mysql: `select s.company_name,
       count(o.shipped_date) as shipped,
       sum(case when o.shipped_date > o.required_date then 1 else 0 end) as late,
       round(100.0 * sum(case when o.shipped_date > o.required_date then 1 else 0 end) / count(o.shipped_date), 1) as late_pct
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.company_name
order by late_pct desc;`,
      mysqlNote: 'SUM of CASE instead of FILTER.',
    },
  ),
  step(
    'northwind-202',
    ['conditional-aggregates', 'joins'],
    'Is it one employee?',
    'For each employee: last_name, orders shipped (shipped), late orders (late) and late_pct (rounded to 1 decimal). Highest share first, then by last_name.',
    `select e.last_name,
       count(o.shipped_date) as shipped,
       count(*) filter (where o.shipped_date > o.required_date) as late,
       round(100.0 * count(*) filter (where o.shipped_date > o.required_date) / count(o.shipped_date), 1) as late_pct
from orders o
join employees e on e.employee_id = o.employee_id
group by e.last_name
order by late_pct desc, e.last_name;`,
    'The same rate, per employee',
    'Peacock has the most late orders, but she also shipped the most. By share, Dodsworth comes first, yet from only 42 orders, where four late ones weigh a lot. Before blaming anyone, look at the share and at how many orders it is based on.',
    [...GROUP_DOCS, ...CASE_DOCS],
    {
      mysql: `select e.last_name,
       count(o.shipped_date) as shipped,
       sum(case when o.shipped_date > o.required_date then 1 else 0 end) as late,
       round(100.0 * sum(case when o.shipped_date > o.required_date then 1 else 0 end) / count(o.shipped_date), 1) as late_pct
from orders o
join employees e on e.employee_id = o.employee_id
group by e.last_name
order by late_pct desc, e.last_name;`,
      mysqlNote: 'SUM of CASE instead of FILTER.',
    },
  ),
  step(
    'northwind-203',
    ['conditional-aggregates', 'dates-basics', 'joins'],
    'How late, on average?',
    'For each shipping company: company_name and the average number of days late of its late orders (avg_days_late, rounded to 1 decimal), by company_name.',
    `select s.company_name,
       round(avg(o.shipped_date::date - o.required_date::date)
             filter (where o.shipped_date > o.required_date), 1) as avg_days_late
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.company_name
order by s.company_name;`,
    'AVG of a date difference',
    'Speedy Express is late less often than United Package, but when it is late, it is late by longer. Two measures, two different stories.',
    DATE_DOCS,
    {
      mysql: `select s.company_name,
       round(avg(case when o.shipped_date > o.required_date
                      then datediff(o.shipped_date, o.required_date) end), 1) as avg_days_late
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.company_name
order by s.company_name;`,
      mysqlNote: 'MySQL counts days with datediff(later, earlier); in PostgreSQL subtracting two dates gives the days.',
    },
  ),
  step(
    'northwind-204',
    ['joins', 'dates-basics'],
    'The five latest deliveries',
    'Show the five orders that were the most days late: order_id, the customer’s company_name and days_late. Ties by order_id.',
    `select o.order_id, c.company_name,
       o.shipped_date::date - o.required_date::date as days_late
from orders o
join customers c on c.customer_id = o.customer_id
where o.shipped_date > o.required_date
order by days_late desc, o.order_id
limit 5;`,
    'Filter, compute, sort, limit',
    'Gourmet Lanchonetes appears twice, including the worst case of 23 days: a customer worth a call.',
    DATE_DOCS,
    {
      mysql: `select o.order_id, c.company_name,
       datediff(o.shipped_date, o.required_date) as days_late
from orders o
join customers c on c.customer_id = o.customer_id
where o.shipped_date > o.required_date
order by days_late desc, o.order_id
limit 5;`,
      mysqlNote: 'datediff(later, earlier) instead of subtracting dates.',
    },
  ),
]

export const northwindLabs: Exercise[] = [...salesLab, ...lateLab]
