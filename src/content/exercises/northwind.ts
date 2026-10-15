import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

// Revenue of an order line in Northwind: unit_price × quantity × (1 − discount).
const REVENUE_NOTE = 'Revenue of an order line is unit_price × quantity × (1 − discount).'

export const northwindExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'northwind-001',
    dataset: 'northwind',
    level: 1,
    topics: ['select-basics'],
    title: 'Premium products',
    prompt: 'List products that cost more than 50: product_name and unit_price, most expensive first, ties by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE + ORDER BY',
        postgres: `select product_name, unit_price
from products
where unit_price > 50
order by unit_price desc, product_id;`,
        mysql: `select product_name, unit_price
from products
where unit_price > 50
order by unit_price desc, product_id;`,
        explanation: 'Filter first, then sort. product_id is only there to make ties predictable.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'northwind-002',
    dataset: 'northwind',
    level: 1,
    topics: ['null'],
    title: 'Orders waiting to ship',
    prompt: 'Which orders have not been shipped yet? Show order_id, customer_id and order_date, oldest first, then by order_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'IS NULL',
        postgres: `select order_id, customer_id, order_date
from orders
where shipped_date is null
order by order_date, order_id;`,
        mysql: `select order_id, customer_id, order_date
from orders
where shipped_date is null
order by order_date, order_id;`,
        explanation: 'An unshipped order has no shipped_date: the value is NULL, and only IS NULL finds it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison predicates', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'northwind-003',
    dataset: 'northwind',
    level: 1,
    topics: ['conditions'],
    title: 'Stock status',
    prompt:
      'For products in category 1, show product_id, product_name, units_in_stock and a status: "out of stock" when nothing is in stock, "reorder" when stock is at or below reorder_level, otherwise "ok". Order by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CASE',
        postgres: `select product_id, product_name, units_in_stock,
       case
         when units_in_stock = 0 then 'out of stock'
         when units_in_stock <= reorder_level then 'reorder'
         else 'ok'
       end as status
from products
where category_id = 1
order by product_id;`,
        mysql: `select product_id, product_name, units_in_stock,
       case
         when units_in_stock = 0 then 'out of stock'
         when units_in_stock <= reorder_level then 'reorder'
         else 'ok'
       end as status
from products
where category_id = 1
order by product_id;`,
        explanation: 'The order of WHEN branches matters: a product with 0 in stock is also at or below its reorder level, so "out of stock" must come first.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'northwind-004',
    dataset: 'northwind',
    level: 1,
    topics: ['dates-basics'],
    title: 'December 1997 orders',
    prompt: 'Show the orders placed in December 1997: order_id, order_date and customer_id, in date order, then by order_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date range',
        postgres: `select order_id, order_date, customer_id
from orders
where order_date >= '1997-12-01'
  and order_date <  '1998-01-01'
order by order_date, order_id;`,
        mysql: `select order_id, order_date, customer_id
from orders
where order_date >= '1997-12-01'
  and order_date <  '1998-01-01'
order by order_date, order_id;`,
        explanation: 'A half-open range catches the whole month and leaves the column untouched, so an index on order_date can be used.',
      },
      {
        approach: 'Year and month parts',
        postgres: `select order_id, order_date, customer_id
from orders
where extract(year from order_date) = 1997
  and extract(month from order_date) = 12
order by order_date, order_id;`,
        mysql: `select order_id, order_date, customer_id
from orders
where year(order_date) = 1997
  and month(order_date) = 12
order by order_date, order_id;`,
        mysqlNote: 'YEAR() and MONTH() are the usual MySQL spelling; EXTRACT works too.',
        explanation: 'Reads like the question, but wraps the column in functions, so an index on order_date cannot help.',
      },
    ],
    comparison: 'Same orders. Prefer the range on big tables: it can use an index. The function version is fine for quick ad-hoc queries.',
    docs: [
      { label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: Date and time functions', url: MY + 'date-and-time-functions.html' },
    ],
  },
  {
    id: 'northwind-005',
    dataset: 'northwind',
    level: 1,
    topics: ['strings', 'null'],
    title: 'Polite names',
    prompt: 'For each employee show employee_id and a display name like "Ms. Nancy Davolio" (courtesy title, first name, last name). Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: '|| operator',
        postgres: `select employee_id,
       title_of_courtesy || ' ' || first_name || ' ' || last_name as display_name
from employees
order by employee_id;`,
        mysql: `select employee_id,
       concat(title_of_courtesy, ' ', first_name, ' ', last_name) as display_name
from employees
order by employee_id;`,
        mysqlNote: '|| is OR in MySQL by default. Use CONCAT().',
        explanation: 'Glue the parts with spaces. If any part were NULL, the whole result would be NULL.',
      },
      {
        approach: 'concat_ws()',
        postgres: `select employee_id,
       concat_ws(' ', title_of_courtesy, first_name, last_name) as display_name
from employees
order by employee_id;`,
        mysql: `select employee_id,
       concat_ws(' ', title_of_courtesy, first_name, last_name) as display_name
from employees
order by employee_id;`,
        explanation: 'concat_ws (with separator) puts the separator between parts and skips NULL parts instead of returning NULL.',
      },
    ],
    comparison:
      'Same names here because nobody is missing a title. If one were NULL, A would return NULL for that employee, while concat_ws would just leave the title out. concat_ws runs unchanged in both databases.',
    docs: [
      { label: 'PostgreSQL: concat_ws', url: PG + 'functions-string.html' },
      { label: 'MySQL: CONCAT_WS()', url: MY + 'string-functions.html#function_concat-ws' },
    ],
  },
  {
    id: 'northwind-006',
    dataset: 'northwind',
    level: 1,
    topics: ['numbers'],
    title: 'Lines of one order',
    prompt:
      'For order 10248, show each line\'s product_id, quantity, unit_price, discount and line_total (after discount, rounded to 2 decimals). Order by product_id.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Arithmetic + round()',
        postgres: `select product_id, quantity, unit_price, discount,
       round(unit_price * quantity * (1 - discount), 2) as line_total
from order_details
where order_id = 10248
order by product_id;`,
        mysql: `select product_id, quantity, unit_price, discount,
       round(unit_price * quantity * (1 - discount), 2) as line_total
from order_details
where order_id = 10248
order by product_id;`,
        explanation: 'All columns are exact decimals, so the arithmetic is exact. round(x, 2) only formats the final result.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Mathematical functions', url: PG + 'functions-math.html' }],
  },
  {
    id: 'northwind-007',
    dataset: 'northwind',
    level: 1,
    topics: ['distinct'],
    title: 'Where suppliers are',
    prompt: 'List every country that has at least one supplier, once each, alphabetically.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DISTINCT',
        postgres: `select distinct country
from suppliers
order by country;`,
        mysql: `select distinct country
from suppliers
order by country;`,
        explanation: 'DISTINCT removes repeated countries.',
      },
    ],
    docs: [{ label: 'PostgreSQL: DISTINCT', url: PG + 'queries-select-lists.html#QUERIES-DISTINCT' }],
  },
  {
    id: 'northwind-008',
    dataset: 'northwind',
    level: 1,
    topics: ['limit'],
    title: 'Latest orders',
    prompt: 'Show the 5 most recent orders: order_id, order_date and customer_id. For orders on the same day, higher order_id first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY … DESC LIMIT',
        postgres: `select order_id, order_date, customer_id
from orders
order by order_date desc, order_id desc
limit 5;`,
        mysql: `select order_id, order_date, customer_id
from orders
order by order_date desc, order_id desc
limit 5;`,
        explanation: 'Sort newest first and keep 5 rows. Several orders share a date, so the tie-breaker decides which ones make the cut.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'northwind-009',
    dataset: 'northwind',
    level: 1,
    topics: ['text-search'],
    title: 'Markets among customers',
    prompt: 'Find customers whose company name contains "market" in any letter case. Show customer_id and company_name, ordered by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE',
        postgres: `select customer_id, company_name
from customers
where company_name ilike '%market%'
order by customer_id;`,
        mysql: `select customer_id, company_name
from customers
where company_name like '%market%'
order by customer_id;`,
        mysqlNote: 'No ILIKE in MySQL; with the default collation LIKE already ignores case.',
        explanation: 'ILIKE is case-insensitive LIKE.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },

  // ---------- Level 2 ----------
  {
    id: 'northwind-010',
    dataset: 'northwind',
    level: 2,
    topics: ['joins'],
    title: 'Seafood and who supplies it',
    prompt: 'List the products in the Seafood category with product_name, unit_price and the supplier\'s company_name. Order by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two joins',
        postgres: `select p.product_name, p.unit_price, s.company_name as supplier
from products p
join categories c on c.category_id = p.category_id
join suppliers s  on s.supplier_id = p.supplier_id
where c.category_name = 'Seafood'
order by p.product_id;`,
        mysql: `select p.product_name, p.unit_price, s.company_name as supplier
from products p
join categories c on c.category_id = p.category_id
join suppliers s  on s.supplier_id = p.supplier_id
where c.category_name = 'Seafood'
order by p.product_id;`,
        explanation: 'Each product points to one category and one supplier, so both joins keep one row per product.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins between tables', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'northwind-011',
    dataset: 'northwind',
    level: 2,
    topics: ['group-by', 'aggregates'],
    title: 'Revenue by category',
    prompt: 'Show each category_name with its total revenue, rounded to 2 decimals, highest first.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Join + GROUP BY',
        postgres: `select c.category_name,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from order_details d
join products p   on p.product_id = d.product_id
join categories c on c.category_id = p.category_id
group by c.category_id, c.category_name
order by revenue desc;`,
        mysql: `select c.category_name,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from order_details d
join products p   on p.product_id = d.product_id
join categories c on c.category_id = p.category_id
group by c.category_id, c.category_name
order by revenue desc;`,
        explanation: 'Compute revenue per line, then sum per category. Round only at the end, never before summing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'northwind-012',
    dataset: 'northwind',
    level: 2,
    topics: ['group-by'],
    title: 'Customers with many orders',
    prompt: 'Which customers placed more than 20 orders? Show customer_id, company_name and the number of orders, most first, then by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'HAVING',
        postgres: `select c.customer_id, c.company_name, count(*) as orders
from customers c
join orders o on o.customer_id = c.customer_id
group by c.customer_id
having count(*) > 20
order by orders desc, c.customer_id;`,
        mysql: `select c.customer_id, c.company_name, count(*) as orders
from customers c
join orders o on o.customer_id = c.customer_id
group by c.customer_id
having count(*) > 20
order by orders desc, c.customer_id;`,
        explanation: 'HAVING filters groups after counting. company_name can be selected because it depends on the grouped primary key.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'northwind-013',
    dataset: 'northwind',
    level: 2,
    topics: ['full-join', 'set-operations'],
    title: 'Customers and suppliers by country',
    prompt:
      'For every country that has customers or suppliers (or both), show the country, the number of customers and the number of suppliers, with 0 where there are none. Order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL OUTER JOIN',
        postgres: `select coalesce(c.country, s.country) as country,
       coalesce(c.customers, 0) as customers,
       coalesce(s.suppliers, 0) as suppliers
from (select country, count(*) as customers from customers group by country) c
full join (select country, count(*) as suppliers from suppliers group by country) s
  on s.country = c.country;`,
        mysql: null,
        mysqlNote: 'MySQL has no FULL OUTER JOIN. Use solution B or C.',
        explanation:
          'A full join keeps rows from both sides: countries with only customers, only suppliers, or both. The side without a match is NULL, which coalesce turns into 0.',
      },
      {
        approach: 'LEFT JOIN ∪ RIGHT JOIN',
        postgres: `select c.country, c.customers, coalesce(s.suppliers, 0) as suppliers
from (select country, count(*) as customers from customers group by country) c
left join (select country, count(*) as suppliers from suppliers group by country) s
  on s.country = c.country
union
select s.country, coalesce(c.customers, 0), s.suppliers
from (select country, count(*) as customers from customers group by country) c
right join (select country, count(*) as suppliers from suppliers group by country) s
  on s.country = c.country;`,
        mysql: `select c.country, c.customers, coalesce(s.suppliers, 0) as suppliers
from (select country, count(*) as customers from customers group by country) c
left join (select country, count(*) as suppliers from suppliers group by country) s
  on s.country = c.country
union
select s.country, coalesce(c.customers, 0), s.suppliers
from (select country, count(*) as customers from customers group by country) c
right join (select country, count(*) as suppliers from suppliers group by country) s
  on s.country = c.country;`,
        explanation:
          'The classic emulation of a full join: everything from the left, plus everything from the right, and UNION removes the countries that appear in both halves.',
      },
      {
        approach: 'UNION ALL + GROUP BY',
        postgres: `select country,
       sum(is_customer) as customers,
       sum(is_supplier) as suppliers
from (
  select country, 1 as is_customer, 0 as is_supplier from customers
  union all
  select country, 0, 1 from suppliers
) both_sides
group by country;`,
        mysql: `select country,
       sum(is_customer) as customers,
       sum(is_supplier) as suppliers
from (
  select country, 1 as is_customer, 0 as is_supplier from customers
  union all
  select country, 0, 1 from suppliers
) both_sides
group by country;`,
        explanation: 'Stack both tables with a marker column, then count per country. No join at all.',
      },
    ],
    comparison:
      'All three give the same table. FULL JOIN says exactly what you mean but is missing in MySQL. LEFT ∪ RIGHT is the textbook workaround and repeats both subqueries. UNION ALL + GROUP BY is the shortest portable answer and reads each table once.',
    docs: [
      { label: 'PostgreSQL: Joined tables (FULL)', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN syntax', url: MY + 'join.html' },
    ],
  },
  {
    id: 'northwind-014',
    dataset: 'northwind',
    level: 2,
    topics: ['subqueries', 'joins'],
    title: 'Customers who never ordered',
    prompt: 'Which customers have never placed an order? Show customer_id, company_name and country, ordered by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select c.customer_id, c.company_name, c.country
from customers c
where not exists (select 1 from orders o where o.customer_id = c.customer_id)
order by c.customer_id;`,
        mysql: `select c.customer_id, c.company_name, c.country
from customers c
where not exists (select 1 from orders o where o.customer_id = c.customer_id)
order by c.customer_id;`,
        explanation: 'Keep a customer when no order points to them.',
      },
      {
        approach: 'NOT IN',
        postgres: `select customer_id, company_name, country
from customers
where customer_id not in (select customer_id from orders where customer_id is not null)
order by customer_id;`,
        mysql: `select customer_id, company_name, country
from customers
where customer_id not in (select customer_id from orders where customer_id is not null)
order by customer_id;`,
        explanation:
          'orders.customer_id is allowed to be NULL here, so the subquery filters NULLs out. Without that line, a single order with no customer would make NOT IN return nothing.',
      },
    ],
    comparison:
      'Same customers. NOT IN only works because of the extra "is not null"; NOT EXISTS needs no such care, which is why it is the safer habit.',
    docs: [{ label: 'PostgreSQL: NOT IN and NULL', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN' }],
  },
  {
    id: 'northwind-015',
    dataset: 'northwind',
    level: 2,
    topics: ['self-cross-join', 'dates-basics'],
    title: 'Older than their boss',
    prompt:
      'Which employees were born before their manager? Show employee first_name, last_name, birth_date and the manager\'s last name. Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join',
        postgres: `select e.first_name, e.last_name, e.birth_date, m.last_name as manager
from employees e
join employees m on m.employee_id = e.reports_to
where e.birth_date < m.birth_date
order by e.employee_id;`,
        mysql: `select e.first_name, e.last_name, e.birth_date, m.last_name as manager
from employees e
join employees m on m.employee_id = e.reports_to
where e.birth_date < m.birth_date
order by e.employee_id;`,
        explanation: 'The employees table plays two roles: e is the employee, m the manager. An inner join drops the top boss, who has no manager to compare with.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'northwind-016',
    dataset: 'northwind',
    level: 2,
    topics: ['conditional-aggregates', 'numbers'],
    title: 'Who ships late?',
    prompt:
      'For each employee: number of orders, number shipped after the required date, and the late share in percent (1 decimal). Show employee_id, orders, late, late_pct, ordered by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select employee_id,
       count(*) as orders,
       count(*) filter (where shipped_date > required_date) as late,
       round(100.0 * count(*) filter (where shipped_date > required_date) / count(*), 1) as late_pct
from orders
group by employee_id
order by employee_id;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; see solution B.',
        explanation: 'FILTER gives the same group a second, narrower count.',
      },
      {
        approach: 'SUM(CASE …)',
        postgres: `select employee_id,
       count(*) as orders,
       sum(case when shipped_date > required_date then 1 else 0 end) as late,
       round(100.0 * sum(case when shipped_date > required_date then 1 else 0 end) / count(*), 1) as late_pct
from orders
group by employee_id
order by employee_id;`,
        mysql: `select employee_id,
       count(*) as orders,
       sum(case when shipped_date > required_date then 1 else 0 end) as late,
       round(100.0 * sum(case when shipped_date > required_date then 1 else 0 end) / count(*), 1) as late_pct
from orders
group by employee_id
order by employee_id;`,
        explanation: 'Unshipped orders have a NULL shipped_date, the comparison is not true, and they count as not late.',
      },
    ],
    comparison:
      'Same numbers. Note the 100.0: in PostgreSQL, 100 * late / orders with integers would be integer division and round down to whole percents before round() ever sees it.',
    docs: [{ label: 'PostgreSQL: FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'northwind-017',
    dataset: 'northwind',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'What ALFKI ordered',
    prompt:
      'For each order of customer ALFKI, show order_id and the ordered product names in one string separated by ", ", in product_id order. Order by order_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg',
        postgres: `select o.order_id,
       string_agg(p.product_name, ', ' order by p.product_id) as products
from orders o
join order_details d on d.order_id = o.order_id
join products p      on p.product_id = d.product_id
where o.customer_id = 'ALFKI'
group by o.order_id
order by o.order_id;`,
        mysql: `select o.order_id,
       group_concat(p.product_name order by p.product_id separator ', ') as products
from orders o
join order_details d on d.order_id = o.order_id
join products p      on p.product_id = d.product_id
where o.customer_id = 'ALFKI'
group by o.order_id
order by o.order_id;`,
        mysqlNote: 'GROUP_CONCAT with ORDER BY and SEPARATOR inside the call.',
        explanation: 'One row per order, with the products folded into a string.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT()', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'northwind-018',
    dataset: 'northwind',
    level: 2,
    topics: ['subqueries', 'ranking'],
    title: 'Pricier than their category',
    prompt:
      'Find products priced above the average price of their own category. Show product_id, product_name, category_id and unit_price. Order by category_id, then price high to low, then product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Correlated subquery',
        postgres: `select p.product_id, p.product_name, p.category_id, p.unit_price
from products p
where p.unit_price > (
  select avg(p2.unit_price) from products p2 where p2.category_id = p.category_id
)
order by p.category_id, p.unit_price desc, p.product_id;`,
        mysql: `select p.product_id, p.product_name, p.category_id, p.unit_price
from products p
where p.unit_price > (
  select avg(p2.unit_price) from products p2 where p2.category_id = p.category_id
)
order by p.category_id, p.unit_price desc, p.product_id;`,
        explanation: 'For each product, compute the average of its own category and compare.',
      },
      {
        approach: 'Window average',
        postgres: `select product_id, product_name, category_id, unit_price
from (
  select p.*, avg(unit_price) over (partition by category_id) as category_avg
  from products p
) t
where unit_price > category_avg
order by category_id, unit_price desc, product_id;`,
        mysql: `select product_id, product_name, category_id, unit_price
from (
  select p.*, avg(unit_price) over (partition by category_id) as category_avg
  from products p
) t
where unit_price > category_avg
order by category_id, unit_price desc, product_id;`,
        explanation: 'avg() OVER (PARTITION BY category_id) puts the category average on every row in one pass.',
      },
    ],
    comparison:
      'Same products. The window version reads the table once and lets you also display the average. The correlated subquery is easier to read for many people and the optimizer often handles it just as well on small tables.',
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'northwind-019',
    dataset: 'northwind',
    level: 2,
    topics: ['set-operations', 'arrays', 'group-by'],
    title: 'Orders containing both products',
    prompt: 'Which orders contain both product 11 and product 42? Show order_id, ordered by order_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY … HAVING count',
        postgres: `select order_id
from order_details
where product_id in (11, 42)
group by order_id
having count(distinct product_id) = 2
order by order_id;`,
        mysql: `select order_id
from order_details
where product_id in (11, 42)
group by order_id
having count(distinct product_id) = 2
order by order_id;`,
        explanation: 'Keep only lines with either product, then require both to be present in the group. This pattern is called relational division.',
      },
      {
        approach: 'INTERSECT',
        postgres: `select order_id from order_details where product_id = 11
intersect
select order_id from order_details where product_id = 42
order by order_id;`,
        mysql: `select order_id from order_details where product_id = 11
intersect
select order_id from order_details where product_id = 42
order by order_id;`,
        mysqlNote: 'INTERSECT is available since MySQL 8.0.31.',
        explanation: 'Orders with product 11, intersected with orders with product 42.',
      },
      {
        approach: 'Array contains (@>)',
        postgres: `select order_id
from order_details
group by order_id
having array_agg(product_id) @> array[11, 42]
order by order_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no array type. Use solution A or B.',
        explanation: 'array_agg collects the products of each order into an array, and @> checks that it contains every element of the right-hand array.',
      },
    ],
    comparison:
      'Same orders. HAVING count scales to "contains all of these N products" by changing the list and the number. INTERSECT reads naturally for two or three products. The array version is the most compact in PostgreSQL but builds an array for every order.',
    docs: [
      { label: 'PostgreSQL: Array functions and operators', url: PG + 'functions-array.html' },
      { label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' },
    ],
  },
  {
    id: 'northwind-020',
    dataset: 'northwind',
    level: 2,
    topics: ['joins', 'aggregates', 'dates-basics'],
    title: 'How the shippers perform',
    prompt:
      'For each shipper: company_name, number of orders shipped with it, average freight (2 decimals) and average days from order to shipment (1 decimal, shipped orders only). Order by shipper_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date difference in days',
        postgres: `select s.company_name,
       count(*) as orders,
       round(avg(o.freight), 2) as avg_freight,
       round(avg(o.shipped_date::date - o.order_date::date), 1) as avg_days_to_ship
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.shipper_id
order by s.shipper_id;`,
        mysql: `select s.company_name,
       count(*) as orders,
       round(avg(o.freight), 2) as avg_freight,
       round(avg(datediff(o.shipped_date, o.order_date)), 1) as avg_days_to_ship
from orders o
join shippers s on s.shipper_id = o.ship_via
group by s.shipper_id
order by s.shipper_id;`,
        mysqlNote: 'DATEDIFF(later, earlier) returns whole days.',
        explanation: 'date minus date is a whole number of days in PostgreSQL. avg() skips the NULLs of unshipped orders automatically.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: DATEDIFF()', url: MY + 'date-and-time-functions.html#function_datediff' },
    ],
  },
  {
    id: 'northwind-021',
    dataset: 'northwind',
    level: 2,
    topics: ['casting', 'strings'],
    title: 'Discounts as percentages',
    prompt: 'How many order lines got each discount? Show the discount as text like "5%" (column discount_label) and the number of lines (column line_count), from the smallest discount up.',
    orderMatters: true,
    solutions: [
      {
        approach: ':: cast',
        postgres: `select (discount * 100)::int || '%' as discount_label,
       count(*) as line_count
from order_details
group by discount
order by discount;`,
        mysql: `select concat(cast(discount * 100 as signed), '%') as discount_label,
       count(*) as line_count
from order_details
group by discount
order by discount;`,
        mysqlNote:
          'No :: in MySQL, and || is not concatenation: CAST(… AS SIGNED) and CONCAT(). Also avoid naming the count "lines": LINES is a reserved word in MySQL (from LOAD DATA … LINES TERMINATED BY) but not in PostgreSQL.',
        explanation: '0.05 × 100 is 5.00; casting to an integer drops the ".00" before adding the % sign.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST()', url: MY + 'cast-functions.html#function_cast' },
    ],
  },

  // ---------- Level 3 ----------
  {
    id: 'northwind-022',
    dataset: 'northwind',
    level: 3,
    topics: ['ranking'],
    title: 'Top 3 products per category',
    prompt:
      'For each category, the 3 products with the highest revenue: category_name, product_name, revenue (2 decimals) and place. Ties by product_id. Order by category_id, then place.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `with product_revenue as (
  select p.category_id, p.product_id, p.product_name,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from order_details d
  join products p on p.product_id = d.product_id
  group by p.category_id, p.product_id, p.product_name
),
ranked as (
  select product_revenue.*,
         row_number() over (partition by category_id order by revenue desc, product_id) as place
  from product_revenue
)
select c.category_name, r.product_name, round(r.revenue, 2) as revenue, r.place
from ranked r
join categories c on c.category_id = r.category_id
where r.place <= 3
order by r.category_id, r.place;`,
        mysql: `with product_revenue as (
  select p.category_id, p.product_id, p.product_name,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from order_details d
  join products p on p.product_id = d.product_id
  group by p.category_id, p.product_id, p.product_name
),
ranked as (
  select product_revenue.*,
         row_number() over (partition by category_id order by revenue desc, product_id) as place
  from product_revenue
)
select c.category_name, r.product_name, round(r.revenue, 2) as revenue, r.place
from ranked r
join categories c on c.category_id = r.category_id
where r.place <= 3
order by r.category_id, r.place;`,
        explanation: 'Two CTEs: revenue per product, then a ranking that restarts in each category.',
      },
    ],
    docs: [{ label: 'PostgreSQL: row_number()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'northwind-023',
    dataset: 'northwind',
    level: 3,
    topics: ['lag-lead', 'dates-advanced'],
    title: 'Monthly growth in 1997',
    prompt:
      'For each month of 1997 (YYYY-MM): revenue (2 decimals) and the change versus the previous month in percent (1 decimal; NULL for January).',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG()',
        postgres: `with monthly as (
  select to_char(o.order_date, 'YYYY-MM') as month,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  where o.order_date >= '1997-01-01' and o.order_date < '1998-01-01'
  group by 1
)
select month,
       round(revenue, 2) as revenue,
       round(100.0 * (revenue - lag(revenue) over (order by month)) / lag(revenue) over (order by month), 1) as change_pct
from monthly
order by month;`,
        mysql: `with monthly as (
  select date_format(o.order_date, '%Y-%m') as month,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  where o.order_date >= '1997-01-01' and o.order_date < '1998-01-01'
  group by 1
)
select month,
       round(revenue, 2) as revenue,
       round(100.0 * (revenue - lag(revenue) over (order by month)) / lag(revenue) over (order by month), 1) as change_pct
from monthly
order by month;`,
        mysqlNote: 'DATE_FORMAT(…, \'%Y-%m\') instead of to_char.',
        explanation: 'LAG brings the previous month\'s revenue onto the current row. Filtering to 1997 happens before the window runs, so January has no previous month.',
      },
    ],
    docs: [{ label: 'PostgreSQL: lag()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'northwind-024',
    dataset: 'northwind',
    level: 3,
    topics: ['window-frames'],
    title: 'Cumulative revenue',
    prompt: 'For every month (YYYY-MM), show the month\'s revenue and the cumulative revenue since the first order, both rounded to 2 decimals.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'SUM() OVER',
        postgres: `with monthly as (
  select to_char(o.order_date, 'YYYY-MM') as month,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by 1
)
select month,
       round(revenue, 2) as revenue,
       round(sum(revenue) over (order by month), 2) as cumulative
from monthly
order by month;`,
        mysql: `with monthly as (
  select date_format(o.order_date, '%Y-%m') as month,
         sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by 1
)
select month,
       round(revenue, 2) as revenue,
       round(sum(revenue) over (order by month), 2) as cumulative
from monthly
order by month;`,
        explanation: 'A window sum with ORDER BY adds up all rows up to the current one. Round after summing, not before, or the cumulative total drifts.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'northwind-025',
    dataset: 'northwind',
    level: 3,
    topics: ['cte', 'window-frames'],
    title: 'Share of the biggest customers',
    prompt:
      'Show the 10 customers with the highest revenue: customer_id, revenue (2 decimals) and their share of total revenue in percent (2 decimals). Ties by customer_id.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Window total',
        postgres: `with customer_revenue as (
  select o.customer_id, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by o.customer_id
)
select customer_id,
       round(revenue, 2) as revenue,
       round(100 * revenue / sum(revenue) over (), 2) as share_pct
from customer_revenue
order by revenue desc, customer_id
limit 10;`,
        mysql: `with customer_revenue as (
  select o.customer_id, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by o.customer_id
)
select customer_id,
       round(revenue, 2) as revenue,
       round(100 * revenue / sum(revenue) over (), 2) as share_pct
from customer_revenue
order by revenue desc, customer_id
limit 10;`,
        explanation: 'sum() OVER () with an empty window is the grand total, repeated on every row. Window functions run before LIMIT, so the total covers all customers.',
      },
      {
        approach: 'Cross join with the total',
        postgres: `with customer_revenue as (
  select o.customer_id, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by o.customer_id
),
total as (
  select sum(revenue) as all_revenue from customer_revenue
)
select c.customer_id,
       round(c.revenue, 2) as revenue,
       round(100 * c.revenue / t.all_revenue, 2) as share_pct
from customer_revenue c
cross join total t
order by c.revenue desc, c.customer_id
limit 10;`,
        mysql: `with customer_revenue as (
  select o.customer_id, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by o.customer_id
),
total as (
  select sum(revenue) as all_revenue from customer_revenue
)
select c.customer_id,
       round(c.revenue, 2) as revenue,
       round(100 * c.revenue / t.all_revenue, 2) as share_pct
from customer_revenue c
cross join total t
order by c.revenue desc, c.customer_id
limit 10;`,
        explanation: 'Compute the total in its own one-row CTE and attach it to every customer with a cross join.',
      },
    ],
    comparison:
      'Same figures. The window version is shorter. The cross-join version makes the total an explicit step, which is easier to reuse and works in databases without window functions.',
    docs: [{ label: 'PostgreSQL: Window function calls', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'northwind-026',
    dataset: 'northwind',
    level: 3,
    topics: ['recursive'],
    title: 'Everyone under Andrew Fuller',
    prompt:
      'List everyone who reports to employee 2 (Andrew Fuller) directly or indirectly: employee_id, first_name, last_name and level (1 = direct report). Order by level, then employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WITH RECURSIVE',
        postgres: `with recursive team as (
  select employee_id, first_name, last_name, 1 as level
  from employees
  where reports_to = 2
  union all
  select e.employee_id, e.first_name, e.last_name, t.level + 1
  from employees e
  join team t on e.reports_to = t.employee_id
)
select employee_id, first_name, last_name, level
from team
order by level, employee_id;`,
        mysql: `with recursive team as (
  select employee_id, first_name, last_name, 1 as level
  from employees
  where reports_to = 2
  union all
  select e.employee_id, e.first_name, e.last_name, t.level + 1
  from employees e
  join team t on e.reports_to = t.employee_id
)
select employee_id, first_name, last_name, level
from team
order by level, employee_id;`,
        explanation: 'Start from the direct reports, then repeatedly add the people who report to someone already found.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'northwind-027',
    dataset: 'northwind',
    level: 3,
    topics: ['pivot'],
    title: 'Orders per employee per year',
    prompt: 'Show employee_id, last_name and the number of orders they took in 1996, 1997 and 1998 as three columns. Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional aggregation',
        postgres: `select e.employee_id, e.last_name,
       count(case when extract(year from o.order_date) = 1996 then 1 end) as y1996,
       count(case when extract(year from o.order_date) = 1997 then 1 end) as y1997,
       count(case when extract(year from o.order_date) = 1998 then 1 end) as y1998
from employees e
join orders o on o.employee_id = e.employee_id
group by e.employee_id
order by e.employee_id;`,
        mysql: `select e.employee_id, e.last_name,
       count(case when year(o.order_date) = 1996 then 1 end) as y1996,
       count(case when year(o.order_date) = 1997 then 1 end) as y1997,
       count(case when year(o.order_date) = 1998 then 1 end) as y1998
from employees e
join orders o on o.employee_id = e.employee_id
group by e.employee_id
order by e.employee_id;`,
        mysqlNote: 'YEAR() instead of extract.',
        explanation: 'Each column counts only the rows of its year: rows become columns ("pivot").',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'northwind-028',
    dataset: 'northwind',
    level: 3,
    topics: ['dates-advanced', 'aggregates'],
    title: 'Shipping, year by year',
    prompt:
      'For each year: number of orders, average days from order to shipment (1 decimal, shipped orders only) and the share of orders shipped late in percent (1 decimal). Order by year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Group by year',
        postgres: `select extract(year from order_date)::int as year,
       count(*) as orders,
       round(avg(shipped_date::date - order_date::date), 1) as avg_days_to_ship,
       round(100.0 * sum(case when shipped_date > required_date then 1 else 0 end) / count(*), 1) as late_pct
from orders
group by 1
order by 1;`,
        mysql: `select year(order_date) as year,
       count(*) as orders,
       round(avg(datediff(shipped_date, order_date)), 1) as avg_days_to_ship,
       round(100.0 * sum(case when shipped_date > required_date then 1 else 0 end) / count(*), 1) as late_pct
from orders
group by 1
order by 1;`,
        mysqlNote: 'YEAR() and DATEDIFF().',
        explanation: 'Three different measures over the same year groups. avg() ignores unshipped orders; count(*) does not.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time functions', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'northwind-029',
    dataset: 'northwind',
    level: 3,
    topics: ['gaps-islands', 'dates-advanced'],
    title: 'Ordering streaks of one customer',
    prompt:
      'Customer SAVEA ordered in many months. Find each streak of consecutive months with at least one order: first month and last month (YYYY-MM) and the number of months. Order by first month.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month number minus row number',
        postgres: `with months as (
  select distinct extract(year from order_date)::int * 12 + extract(month from order_date)::int - 1 as m
  from orders
  where customer_id = 'SAVEA'
),
grouped as (
  select m, m - row_number() over (order by m) as streak from months
)
select min(m) / 12 || '-' || lpad((min(m) % 12 + 1)::text, 2, '0') as first_month,
       max(m) / 12 || '-' || lpad((max(m) % 12 + 1)::text, 2, '0') as last_month,
       count(*) as months
from grouped
group by streak
order by min(m);`,
        mysql: `with months as (
  select distinct year(order_date) * 12 + month(order_date) - 1 as m
  from orders
  where customer_id = 'SAVEA'
),
grouped as (
  select m, m - row_number() over (order by m) as streak from months
)
select concat(min(m) div 12, '-', lpad(min(m) % 12 + 1, 2, '0')) as first_month,
       concat(max(m) div 12, '-', lpad(max(m) % 12 + 1, 2, '0')) as last_month,
       count(*) as months
from grouped
group by streak
order by min(m);`,
        mysqlNote: 'Integer division is DIV in MySQL, and strings are glued with CONCAT().',
        explanation:
          'Number every month as year × 12 + month. Inside a streak, that number and the row number both grow by 1, so their difference stays the same and identifies the streak.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'northwind-030',
    dataset: 'northwind',
    level: 3,
    topics: ['subtotals'],
    title: 'Labelled subtotals',
    prompt:
      'For customers in Germany and the USA, show revenue (2 decimals) per country and city, with a subtotal per country labelled "All cities" and a grand total labelled "All countries". Order does not matter.',
    hint: REVENUE_NOTE,
    orderMatters: false,
    solutions: [
      {
        approach: 'ROLLUP + GROUPING()',
        postgres: `select case when grouping(c.country) = 1 then 'All countries' else c.country end as country,
       case when grouping(c.city) = 1 then 'All cities' else c.city end as city,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from customers c
join orders o        on o.customer_id = c.customer_id
join order_details d on d.order_id = o.order_id
where c.country in ('Germany', 'USA')
group by rollup (c.country, c.city);`,
        mysql: `select case when grouping(c.country) = 1 then 'All countries' else c.country end as country,
       case when grouping(c.city) = 1 then 'All cities' else c.city end as city,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from customers c
join orders o        on o.customer_id = c.customer_id
join order_details d on d.order_id = o.order_id
where c.country in ('Germany', 'USA')
group by c.country, c.city with rollup;`,
        mysqlNote: 'WITH ROLLUP after the GROUP BY list; GROUPING() exists since MySQL 8.0.1.',
        explanation:
          'GROUPING(col) is 1 on rows where col was rolled up. Use it instead of testing for NULL: a real NULL city and a subtotal row would otherwise look the same.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GROUPING', url: PG + 'functions-aggregate.html#FUNCTIONS-GROUPING-TABLE' },
      { label: 'MySQL: GROUPING()', url: MY + 'miscellaneous-functions.html#function_grouping' },
    ],
  },
  {
    id: 'northwind-031',
    dataset: 'northwind',
    level: 3,
    topics: ['lateral', 'ranking'],
    title: 'Two latest orders of each Mexican customer',
    prompt:
      'For each customer in Mexico, show their two most recent orders: customer_id, order_id and order_date. Order by customer_id, then newest first (ties by higher order_id).',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL + LIMIT',
        postgres: `select c.customer_id, o.order_id, o.order_date
from customers c
cross join lateral (
  select order_id, order_date
  from orders
  where orders.customer_id = c.customer_id
  order by order_date desc, order_id desc
  limit 2
) o
where c.country = 'Mexico'
order by c.customer_id, o.order_date desc, o.order_id desc;`,
        mysql: `select c.customer_id, o.order_id, o.order_date
from customers c
cross join lateral (
  select order_id, order_date
  from orders
  where orders.customer_id = c.customer_id
  order by order_date desc, order_id desc
  limit 2
) o
where c.country = 'Mexico'
order by c.customer_id, o.order_date desc, o.order_id desc;`,
        mysqlNote: 'LATERAL needs MySQL 8.0.14 or later.',
        explanation: 'For each customer, a small query picks their two latest orders.',
      },
      {
        approach: 'ROW_NUMBER()',
        postgres: `select customer_id, order_id, order_date
from (
  select o.customer_id, o.order_id, o.order_date,
         row_number() over (partition by o.customer_id order by o.order_date desc, o.order_id desc) as n
  from orders o
  join customers c on c.customer_id = o.customer_id
  where c.country = 'Mexico'
) t
where n <= 2
order by customer_id, order_date desc, order_id desc;`,
        mysql: `select customer_id, order_id, order_date
from (
  select o.customer_id, o.order_id, o.order_date,
         row_number() over (partition by o.customer_id order by o.order_date desc, o.order_id desc) as n
  from orders o
  join customers c on c.customer_id = o.customer_id
  where c.country = 'Mexico'
) t
where n <= 2
order by customer_id, order_date desc, order_id desc;`,
        explanation: 'Number each customer\'s orders from newest to oldest and keep numbers 1 and 2.',
      },
    ],
    comparison:
      'Same rows. LATERAL stops after two rows per customer when an index on (customer_id, order_date) exists; ROW_NUMBER numbers all of each customer\'s orders first. With few orders per customer the difference is negligible.',
    docs: [
      { label: 'PostgreSQL: LATERAL', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' },
      { label: 'MySQL: Lateral derived tables', url: MY + 'lateral-derived-tables.html' },
    ],
  },
]
