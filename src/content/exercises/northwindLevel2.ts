import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

interface Options {
  mysql?: string | null
  mysqlNote?: string
  orderMatters?: boolean
  hint?: string
}

/** A level 2 Northwind exercise with one solution; MySQL gets the same text unless given. */
function level2(
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

const JOIN_DOCS = [
  { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
  { label: 'MySQL: JOIN', url: MY + 'join.html' },
]

// Level 2 on the home dataset: joins, grouping and subqueries on one familiar schema.
export const northwindLevel2: Exercise[] = [
  level2(
    'northwind-179',
    ['joins'],
    'Expensive products and their category',
    'For products that cost more than 40, show product_id, product_name and the category name, by product_id.',
    `select p.product_id, p.product_name, c.category_name
from products p
join categories c on c.category_id = p.category_id
where p.unit_price > 40
order by p.product_id;`,
    'JOIN … ON',
    'The category name lives in categories; the join matches each product to its category through category_id.',
    JOIN_DOCS,
  ),
  level2(
    'northwind-180',
    ['joins'],
    'Who took the orders of Alfreds?',
    "For customer 'ALFKI', show each order_id, its order_date and the last name of the employee who took it, by order_id.",
    `select o.order_id, o.order_date, e.last_name
from orders o
join employees e on e.employee_id = o.employee_id
where o.customer_id = 'ALFKI'
order by o.order_id;`,
    'JOIN to the employee',
    'orders.employee_id points to employees. Filtering on the customer first keeps the result to six orders.',
    JOIN_DOCS,
  ),
  level2(
    'northwind-181',
    ['full-join'],
    'Categories and their discontinued products',
    'Pair every category with its discontinued products (discontinued = 1). Categories with none still appear, with an empty product. Show category_name and product_name.',
    `select c.category_name, p.product_name
from categories c
full join (select * from products where discontinued = 1) p
  on p.category_id = c.category_id;`,
    'FULL JOIN',
    'A full join keeps unmatched rows from both sides. Filtering products inside the subquery (not in WHERE) keeps the categories without a discontinued product.',
    [{ label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
    {
      orderMatters: false,
      mysql: `select c.category_name, p.product_name
from categories c
left join (select * from products where discontinued = 1) p
  on p.category_id = c.category_id
union all
select null, p.product_name
from products p
where p.discontinued = 1
  and not exists (select 1 from categories c where c.category_id = p.category_id);`,
      mysqlNote: 'No FULL JOIN in MySQL: a LEFT JOIN plus the unmatched rows of the other side.',
    },
  ),
  level2(
    'northwind-182',
    ['self-cross-join'],
    'Who reports to whom',
    "Show every employee's employee_id, last_name and their manager's last name (empty for the top boss), by employee_id.",
    `select e.employee_id, e.last_name, m.last_name as manager
from employees e
left join employees m on m.employee_id = e.reports_to
order by e.employee_id;`,
    'Self-join',
    'The same table appears twice: once as the employee, once as the manager. LEFT JOIN keeps the boss, who reports to nobody.',
    [
      { label: 'PostgreSQL: table aliases', url: PG + 'queries-table-expressions.html#QUERIES-TABLE-ALIASES' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  ),
  level2(
    'northwind-183',
    ['self-cross-join'],
    'Every shipper for every category',
    'Logistics wants a planning grid: every shipper with every category. Show the shipper company_name and category_name.',
    `select s.company_name, c.category_name
from shippers s
cross join categories c;`,
    'CROSS JOIN',
    'A cross join pairs every row with every row: 3 shippers × 8 categories = 24 rows.',
    JOIN_DOCS,
    { orderMatters: false },
  ),
  level2(
    'northwind-184',
    ['group-by'],
    'Orders per country',
    'Count orders per customer country (from customers, not the ship address). Show country and the number of orders.',
    `select c.country, count(*) as orders
from orders o
join customers c on c.customer_id = o.customer_id
group by c.country;`,
    'JOIN + GROUP BY',
    'Join each order to its customer, then GROUP BY country turns 830 orders into one row per country.',
    [
      { label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
      { label: 'MySQL: GROUP BY handling', url: MY + 'group-by-handling.html' },
    ],
    { orderMatters: false },
  ),
  level2(
    'northwind-185',
    ['group-by'],
    'Employees with more than 100 orders',
    'Which employees took more than 100 orders? Show employee_id, last_name and the number of orders, most first.',
    `select e.employee_id, e.last_name, count(*) as orders
from orders o
join employees e on e.employee_id = o.employee_id
group by e.employee_id, e.last_name
having count(*) > 100
order by orders desc, e.employee_id;`,
    'HAVING',
    'WHERE filters orders before grouping; HAVING filters the groups after counting.',
    [
      { label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  level2(
    'northwind-186',
    ['aggregates'],
    'Average freight per shipper',
    'For each shipper, show shipper_id, company_name, the number of orders and the average freight rounded to 2 decimals, by shipper_id.',
    `select s.shipper_id, s.company_name, count(*) as orders, round(avg(o.freight), 2) as avg_freight
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.shipper_id, s.company_name
order by s.shipper_id;`,
    'COUNT and AVG per group',
    'Round averages you show: PostgreSQL and MySQL print a different number of decimals otherwise.',
    [
      { label: 'PostgreSQL: aggregate functions', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: AVG', url: MY + 'aggregate-functions.html#function_avg' },
    ],
  ),
  level2(
    'northwind-187',
    ['aggregates'],
    'The biggest order line',
    'What is the largest value of a single order line (unit_price × quantity, before discount), and how many lines are there in total?',
    `select max(unit_price * quantity) as biggest_line,
       count(*) as lines_total
from order_details;`,
    'MAX of an expression',
    'Aggregates work on expressions too: compute the line value inside MAX.',
    [
      { label: 'PostgreSQL: aggregate functions', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: MAX', url: MY + 'aggregate-functions.html#function_max' },
    ],
    { orderMatters: false },
  ),
  level2(
    'northwind-188',
    ['text-aggregation'],
    'Each supplier\'s products in one line',
    'For suppliers 1 to 5, show supplier_id and their product names in one text, separated by ", ", in product_id order.',
    `select supplier_id,
       string_agg(product_name, ', ' order by product_id) as products
from products
where supplier_id <= 5
group by supplier_id
order by supplier_id;`,
    'STRING_AGG',
    'STRING_AGG joins the values of a group into one string; ORDER BY inside it fixes the order of the names.',
    [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
    {
      mysql: `select supplier_id,
       group_concat(product_name order by product_id separator ', ') as products
from products
where supplier_id <= 5
group by supplier_id
order by supplier_id;`,
      mysqlNote: 'MySQL calls it GROUP_CONCAT, with SEPARATOR at the end.',
    },
  ),
  level2(
    'northwind-189',
    ['conditional-aggregates'],
    'Late shipments per shipper',
    'For each shipper_id, count the shipped orders and how many of them were shipped after the required date.',
    `select ship_via as shipper_id,
       count(*) as shipped,
       count(*) filter (where shipped_date > required_date) as late
from orders
where shipped_date is not null
group by ship_via
order by ship_via;`,
    'COUNT … FILTER',
    'FILTER counts only the rows that match its condition, next to the plain count in the same query.',
    [
      { label: 'PostgreSQL: aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
      { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
    ],
    {
      mysql: `select ship_via as shipper_id,
       count(*) as shipped,
       sum(case when shipped_date > required_date then 1 else 0 end) as late
from orders
where shipped_date is not null
group by ship_via
order by ship_via;`,
      mysqlNote: 'No FILTER in MySQL: SUM of a CASE that is 1 for late orders.',
    },
  ),
  level2(
    'northwind-190',
    ['set-operations'],
    'Countries with customers and suppliers',
    'Which countries have both customers and suppliers?',
    `select country from customers
intersect
select country from suppliers;`,
    'INTERSECT',
    'INTERSECT keeps the rows that appear in both queries, once each.',
    [
      { label: 'PostgreSQL: combining queries', url: PG + 'queries-union.html' },
      { label: 'MySQL: INTERSECT', url: MY + 'intersect.html' },
    ],
    { orderMatters: false, mysqlNote: 'INTERSECT exists since MySQL 8.0.31.' },
  ),
  level2(
    'northwind-191',
    ['subqueries'],
    'More expensive than average',
    'List the products that cost more than the average product price: product_id, product_name and unit_price, most expensive first, ties by product_id.',
    `select product_id, product_name, unit_price
from products
where unit_price > (select avg(unit_price) from products)
order by unit_price desc, product_id;`,
    'Scalar subquery',
    'The subquery returns one number, the average, which the outer WHERE compares each product with.',
    [
      { label: 'PostgreSQL: scalar subqueries', url: PG + 'sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES' },
      { label: 'MySQL: scalar subqueries', url: MY + 'scalar-subqueries.html' },
    ],
  ),
  level2(
    'northwind-192',
    ['subqueries'],
    'Not ordered in 1998',
    'Which products were never ordered in 1998? Show product_id and product_name, by product_id.',
    `select p.product_id, p.product_name
from products p
where not exists (
  select 1
  from order_details d
  join orders o on o.order_id = d.order_id
  where d.product_id = p.product_id
    and o.order_date >= date '1998-01-01'
)
order by p.product_id;`,
    'NOT EXISTS',
    'NOT EXISTS keeps a product when the subquery finds no 1998 order line for it.',
    [
      { label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' },
      { label: 'MySQL: EXISTS', url: MY + 'exists-and-not-exists-subqueries.html' },
    ],
    {
      mysql: `select p.product_id, p.product_name
from products p
where not exists (
  select 1
  from order_details d
  join orders o on o.order_id = d.order_id
  where d.product_id = p.product_id
    and o.order_date >= '1998-01-01'
)
order by p.product_id;`,
    },
  ),
  level2(
    'northwind-193',
    ['casting', 'dates-basics'],
    'Just the date',
    'For orders 10248 to 10252, show order_id and order_date without the time part.',
    `select order_id, order_date::date as order_day
from orders
where order_id between 10248 and 10252
order by order_id;`,
    '::date',
    'Casting a timestamp to date drops the time of day. CAST(order_date AS date) is the standard spelling.',
    [
      { label: 'PostgreSQL: type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html#function_cast' },
    ],
    {
      mysql: `select order_id, cast(order_date as date) as order_day
from orders
where order_id between 10248 and 10252
order by order_id;`,
      mysqlNote: 'No :: in MySQL; use CAST(… AS date) or DATE().',
    },
  ),
  level2(
    'northwind-194',
    ['casting', 'numbers'],
    'Freight in whole numbers',
    'For orders 10248 to 10252, show order_id, freight and freight cast to an integer.',
    `select order_id, freight, cast(freight as integer) as freight_whole
from orders
where order_id between 10248 and 10252
order by order_id;`,
    'CAST AS integer',
    'Casting a decimal to an integer rounds it to the nearest whole number; it does not just cut the decimals.',
    [
      { label: 'PostgreSQL: type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html#function_cast' },
    ],
    {
      mysql: `select order_id, freight, cast(freight as signed) as freight_whole
from orders
where order_id between 10248 and 10252
order by order_id;`,
      mysqlNote: 'MySQL casts to SIGNED instead of INTEGER.',
    },
  ),
]
