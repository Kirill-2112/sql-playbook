import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

/** One-solution exercise whose SQL is the same in both databases unless mysql is given. */
function basic(
  id: string,
  topics: string[],
  title: string,
  prompt: string,
  postgres: string,
  approach: string,
  explanation: string,
  docs: Exercise['docs'],
  options: { mysql?: string; mysqlNote?: string; orderMatters?: boolean } = {},
): Exercise {
  return {
    id,
    dataset: 'northwind',
    level: 1,
    topics,
    title,
    prompt,
    orderMatters: options.orderMatters ?? true,
    solutions: [{ approach, postgres, mysql: options.mysql ?? postgres, mysqlNote: options.mysqlNote, explanation }],
    docs,
  }
}

// More level 1 on the home dataset, so the first lessons stay on one familiar schema.
export const northwindLevel1: Exercise[] = [
  basic(
    'northwind-161',
    ['select-basics'],
    'The seafood shelf',
    'List the products in category 8 (Seafood): product_id, product_name and unit_price, by product_id.',
    `select product_id, product_name, unit_price
from products
where category_id = 8
order by product_id;`,
    'WHERE on a key',
    'WHERE keeps only the rows of category 8. Sorting by the id keeps the order predictable.',
    [
      { label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  basic(
    'northwind-162',
    ['select-basics'],
    'German customers',
    'Show the customers in Germany: customer_id, company_name and city, by customer_id.',
    `select customer_id, company_name, city
from customers
where country = 'Germany'
order by customer_id;`,
    'WHERE on text',
    "Text goes in single quotes. In PostgreSQL it must match exactly: 'germany' would find nothing.",
    [
      { label: 'PostgreSQL: WHERE', url: PG + 'sql-select.html#SQL-WHERE' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  basic(
    'northwind-163',
    ['limit'],
    'The five most expensive shipments',
    'Show the 5 orders with the highest freight: order_id, customer_id and freight, highest first, ties by order_id.',
    `select order_id, customer_id, freight
from orders
order by freight desc, order_id
limit 5;`,
    'ORDER BY … LIMIT',
    'Sort first; LIMIT then keeps the first rows. Without ORDER BY the "first five" would be any five.',
    [
      { label: 'PostgreSQL: LIMIT', url: PG + 'queries-limit.html' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  basic(
    'northwind-164',
    ['limit', 'pagination'],
    'Employees, second page',
    'Employees are listed 3 per page, by employee_id. Show the second page: employee_id, first_name and last_name.',
    `select employee_id, first_name, last_name
from employees
order by employee_id
limit 3 offset 3;`,
    'LIMIT … OFFSET',
    'OFFSET 3 skips the first page; LIMIT 3 takes the next three.',
    [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  basic(
    'northwind-165',
    ['distinct'],
    'Countries we ship to',
    'List every country orders were shipped to, once each, alphabetically.',
    `select distinct ship_country
from orders
order by ship_country;`,
    'SELECT DISTINCT',
    'DISTINCT removes repeated rows: 830 orders, but only a few countries.',
    [
      { label: 'PostgreSQL: DISTINCT', url: PG + 'sql-select.html#SQL-DISTINCT' },
      { label: 'MySQL: SELECT', url: MY + 'select.html' },
    ],
  ),
  basic(
    'northwind-166',
    ['distinct', 'aggregates'],
    'How many cities?',
    'How many customers are there, and in how many different cities do they live?',
    `select count(*) as customers,
       count(distinct city) as cities
from customers;`,
    'COUNT(DISTINCT)',
    'COUNT(*) counts rows; COUNT(DISTINCT city) counts different cities.',
    [
      { label: 'PostgreSQL: aggregate functions', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: COUNT(DISTINCT)', url: MY + 'aggregate-functions.html#function_count-distinct' },
    ],
    { orderMatters: false },
  ),
  basic(
    'northwind-167',
    ['null'],
    'Suppliers without a website',
    'Which suppliers have no home page? Show supplier_id and company_name, by supplier_id.',
    `select supplier_id, company_name
from suppliers
where home_page is null
order by supplier_id;`,
    'IS NULL',
    'A missing value is NULL, and only IS NULL finds it: home_page = null is never true.',
    [
      { label: 'PostgreSQL: comparison predicates', url: PG + 'functions-comparison.html#FUNCTIONS-COMPARISON-PRED-TABLE' },
      { label: 'MySQL: IS NULL', url: MY + 'comparison-operators.html#operator_is-null' },
    ],
  ),
  basic(
    'northwind-168',
    ['null'],
    'A region or a dash',
    "For customers in the UK and the USA, show customer_id, city and the region, or '-' when there is none. By customer_id.",
    `select customer_id, city, coalesce(region, '-') as region
from customers
where country in ('UK', 'USA')
order by customer_id;`,
    'COALESCE',
    'COALESCE returns its first argument that is not NULL: a clean way to show a default.',
    [
      { label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' },
      { label: 'MySQL: COALESCE', url: MY + 'comparison-operators.html#function_coalesce' },
    ],
  ),
  basic(
    'northwind-169',
    ['text-search'],
    'Sold by the bottle',
    'Which products are sold in bottles (the word "bottle" anywhere in quantity_per_unit, in any case)? Show product_id, product_name and quantity_per_unit, by product_id.',
    `select product_id, product_name, quantity_per_unit
from products
where quantity_per_unit ilike '%bottle%'
order by product_id;`,
    'ILIKE with %',
    '% matches any text, so "24 - 12 oz bottles" and "12 - 550 ml bottles" both match. ILIKE ignores case.',
    [
      { label: 'PostgreSQL: LIKE and ILIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: LIKE', url: MY + 'string-comparison-functions.html#operator_like' },
    ],
    {
      mysql: `select product_id, product_name, quantity_per_unit
from products
where quantity_per_unit like '%bottle%'
order by product_id;`,
      mysqlNote: 'No ILIKE in MySQL; its LIKE already ignores case with the default collation.',
    },
  ),
  basic(
    'northwind-170',
    ['text-search'],
    'Names that start with "La "',
    'Find customers whose company name starts with "La " (with the space). Show customer_id and company_name, by customer_id.',
    `select customer_id, company_name
from customers
where company_name like 'La %'
order by customer_id;`,
    'LIKE with a prefix',
    "'La %' means: starts with La and a space. Without the space, \"Laughing Bacchus Wine Cellars\" would match too.",
    [
      { label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: LIKE', url: MY + 'string-comparison-functions.html#operator_like' },
    ],
  ),
  basic(
    'northwind-171',
    ['conditions'],
    'Price bands',
    "For beverages (category 1), show product_id, product_name, unit_price and a band: 'cheap' under 15, 'regular' under 40, otherwise 'premium'. By product_id.",
    `select product_id, product_name, unit_price,
       case
         when unit_price < 15 then 'cheap'
         when unit_price < 40 then 'regular'
         else 'premium'
       end as band
from products
where category_id = 1
order by product_id;`,
    'CASE WHEN',
    'CASE checks the conditions from the top and stops at the first true one, so the second only needs "< 40".',
    [
      { label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' },
      { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
    ],
  ),
  basic(
    'northwind-172',
    ['conditions'],
    'Two of the three shippers',
    'How many orders were shipped by shipper 1 (Speedy Express) or shipper 3 (Federal Shipping)?',
    `select count(*) as orders
from orders
where ship_via in (1, 3);`,
    'IN (list)',
    'IN is a short way to write ship_via = 1 or ship_via = 3.',
    [
      { label: 'PostgreSQL: IN', url: PG + 'functions-comparisons.html#FUNCTIONS-COMPARISONS-IN-SCALAR' },
      { label: 'MySQL: IN()', url: MY + 'comparison-operators.html#operator_in' },
    ],
    { orderMatters: false },
  ),
  basic(
    'northwind-173',
    ['strings'],
    'Contacts in capitals',
    'For customers in France, show customer_id and the contact name in capital letters, by customer_id.',
    `select customer_id, upper(contact_name) as contact
from customers
where country = 'France'
order by customer_id;`,
    'UPPER',
    'UPPER changes only how the value is shown; the stored name stays as it is.',
    [
      { label: 'PostgreSQL: string functions', url: PG + 'functions-string.html' },
      { label: 'MySQL: UPPER', url: MY + 'string-functions.html#function_upper' },
    ],
  ),
  basic(
    'northwind-174',
    ['strings'],
    'First names only',
    'For customers in Spain, show customer_id and the first word of the contact name, by customer_id.',
    `select customer_id, split_part(contact_name, ' ', 1) as first_name
from customers
where country = 'Spain'
order by customer_id;`,
    'SPLIT_PART',
    'split_part cuts the text at each space and returns piece number 1.',
    [
      { label: 'PostgreSQL: split_part', url: PG + 'functions-string.html' },
      { label: 'MySQL: SUBSTRING_INDEX', url: MY + 'string-functions.html#function_substring-index' },
    ],
    {
      mysql: `select customer_id, substring_index(contact_name, ' ', 1) as first_name
from customers
where country = 'Spain'
order by customer_id;`,
      mysqlNote: 'SUBSTRING_INDEX with 1 returns everything before the first space.',
    },
  ),
  basic(
    'northwind-175',
    ['numbers'],
    'Prices with VAT',
    'For condiments (category 2), show product_id, unit_price and the price with 20% VAT, rounded to 2 decimals. By product_id.',
    `select product_id, unit_price, round(unit_price * 1.2, 2) as with_vat
from products
where category_id = 2
order by product_id;`,
    'ROUND',
    'Multiply by 1.2 to add 20%, then round to cents. Always round the money you show.',
    [
      { label: 'PostgreSQL: mathematical functions', url: PG + 'functions-math.html' },
      { label: 'MySQL: ROUND', url: MY + 'mathematical-functions.html#function_round' },
    ],
  ),
  basic(
    'northwind-176',
    ['numbers'],
    'Discounts in percent',
    'For order 10250, show product_id, quantity and the discount as a whole percentage (0.15 → 15), by product_id.',
    `select product_id, quantity, round(discount * 100) as discount_pct
from order_details
where order_id = 10250
order by product_id;`,
    'Multiply and ROUND',
    'Discounts are stored as fractions; multiplying by 100 turns them into percentages.',
    [
      { label: 'PostgreSQL: mathematical functions', url: PG + 'functions-math.html' },
      { label: 'MySQL: ROUND', url: MY + 'mathematical-functions.html#function_round' },
    ],
  ),
  basic(
    'northwind-177',
    ['dates-basics'],
    'Orders on Christmas Eve 1997',
    'Show the orders placed on 24 December 1997: order_id, customer_id and order_date, by order_id.',
    `select order_id, customer_id, order_date
from orders
where order_date >= date '1997-12-24'
  and order_date < date '1997-12-25'
order by order_id;`,
    'A one-day range',
    'order_date has a time part, so compare with a range from midnight to the next midnight rather than with = on the date.',
    [
      { label: 'PostgreSQL: date/time types', url: PG + 'datatype-datetime.html' },
      { label: 'MySQL: date and time types', url: MY + 'date-and-time-types.html' },
    ],
    {
      mysql: `select order_id, customer_id, order_date
from orders
where order_date >= '1997-12-24'
  and order_date < '1997-12-25'
order by order_id;`,
      mysqlNote: 'MySQL reads the date strings directly; the DATE keyword is optional.',
    },
  ),
  basic(
    'northwind-178',
    ['dates-basics'],
    'Hired in which year?',
    "Show each employee's employee_id, last_name and the year they were hired, by employee_id.",
    `select employee_id, last_name, extract(year from hire_date) as hire_year
from employees
order by employee_id;`,
    'EXTRACT',
    'EXTRACT pulls one part out of a date: year, month, day, hour…',
    [
      { label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: EXTRACT', url: MY + 'date-and-time-functions.html#function_extract' },
    ],
  ),
]
