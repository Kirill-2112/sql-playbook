import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const REVENUE = 'd.unit_price * d.quantity * (1 - d.discount)'

const MESSY_CUSTOMERS = `create table customer_import (id int, name varchar(40), email varchar(60), country varchar(20));
insert into customer_import values
  (1, '  Alfreds Futterkiste ', 'Maria@Alfreds.DE ', 'Germany'),
  (2, 'Ana Trujillo', '', ' mexico'),
  (3, 'Antonio Moreno', 'antonio@moreno.mx', 'Mexico '),
  (4, 'Around the Horn ', null, 'UK'),
  (5, 'Berglunds snabbkop', ' christina@berglunds.se', 'sweden');`

const SIGNUPS = `create table signup (id int primary key, email varchar(60), signed_up date);
insert into signup values
  (1, 'ann@x.io', '2025-01-03'),
  (2, 'Ann@X.io ', '2025-01-05'),
  (3, 'bob@y.io', '2025-01-04'),
  (4, 'cy@z.io', '2025-01-06'),
  (5, 'BOB@y.io', '2025-01-09'),
  (6, 'ann@x.io', '2025-01-10');`

const CONTACTS = `create table contact (id int, phone varchar(20));
insert into contact values (1, '555-01'), (2, ''), (3, null), (4, '  '), (5, '555-02');`

const MONTHLY_PG = `with monthly as (
  select date_trunc('month', o.order_date)::date as month,
         sum(${REVENUE}) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by 1
)`
const MONTHLY_MY = `with monthly as (
  select cast(date_format(o.order_date, '%Y-%m-01') as date) as month,
         sum(${REVENUE}) as revenue
  from orders o
  join order_details d on d.order_id = o.order_id
  group by month
)`

const ORDER_VALUES = `with v as (
  select order_id, sum(unit_price * quantity * (1 - discount)) as value
  from order_details
  group by order_id
)`

// Everyday work that the first batches covered thinly: report dates, cleaning, paging, exploring a database,
// privileges, explicit transactions and interview classics.
export const northwindPractice: Exercise[] = [
  // ---------- Dates for reports ----------
  {
    id: 'northwind-130',
    dataset: 'northwind',
    level: 2,
    topics: ['dates-advanced', 'group-by'],
    title: 'Orders per month',
    prompt: 'Count the orders placed in each month. Show the first day of the month as a date, and the number of orders, in date order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DATE_TRUNC',
        postgres: `select date_trunc('month', order_date)::date as month,
       count(*) as orders
from orders
group by 1
order by 1;`,
        mysql: `select cast(date_format(order_date, '%Y-%m-01') as date) as month,
       count(*) as orders
from orders
group by month
order by month;`,
        mysqlNote: 'MySQL has no DATE_TRUNC: format the date as the first of its month and cast it back to a date.',
        explanation:
          'date_trunc cuts every timestamp down to the start of its month, so all orders of a month fall into one group. It is the standard first step of almost every monthly report. GROUP BY 1 means "the first selected column".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: DATE_FORMAT', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },
  {
    id: 'northwind-131',
    dataset: 'northwind',
    level: 2,
    topics: ['dates-advanced', 'aggregates'],
    title: 'Revenue by quarter',
    prompt: 'Show revenue per calendar quarter: the first day of the quarter and the revenue rounded to 2 decimals, in date order.',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: "DATE_TRUNC('quarter')",
        postgres: `select date_trunc('quarter', o.order_date)::date as quarter,
       round(sum(${REVENUE}), 2) as revenue
from orders o
join order_details d on d.order_id = o.order_id
group by 1
order by 1;`,
        mysql: `select makedate(year(o.order_date), 1) + interval (quarter(o.order_date) - 1) quarter as quarter,
       round(sum(${REVENUE}), 2) as revenue
from orders o
join order_details d on d.order_id = o.order_id
group by quarter
order by quarter;`,
        mysqlNote: 'Build the quarter start from the year and QUARTER(): 1 January plus (quarter − 1) quarters.',
        explanation: 'date_trunc works with any unit: year, quarter, month, week, day, hour. The first and last quarters are partial: the data runs from July 1996 to early May 1998.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: QUARTER', url: MY + 'date-and-time-functions.html#function_quarter' },
    ],
  },
  {
    id: 'northwind-132',
    dataset: 'northwind',
    level: 2,
    topics: ['dates-basics', 'group-by'],
    title: 'The last 30 days',
    prompt:
      'The data stops in May 1998, so treat the latest order date as "today". For the 30 days up to it, count the orders each employee took: employee_id, last_name and orders, most orders first (ties by employee_id).',
    orderMatters: true,
    solutions: [
      {
        approach: 'max(order_date) − interval',
        postgres: `select e.employee_id, e.last_name, count(*) as orders
from orders o
join employees e on e.employee_id = o.employee_id
where o.order_date > (select max(order_date) from orders) - interval '30 days'
group by e.employee_id, e.last_name
order by orders desc, e.employee_id;`,
        mysql: `select e.employee_id, e.last_name, count(*) as orders
from orders o
join employees e on e.employee_id = o.employee_id
where o.order_date > (select max(order_date) from orders) - interval 30 day
group by e.employee_id, e.last_name
order by orders desc, e.employee_id;`,
        mysqlNote: 'MySQL writes the interval as interval 30 day, without quotes.',
        explanation:
          'On live data you would write order_date > now() - interval \'30 days\'. Sample databases are frozen in the past, so the latest date in the data plays the role of now().',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG + 'functions-datetime.html#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: DATE_ADD and intervals', url: MY + 'date-and-time-functions.html#function_date-add' },
    ],
  },
  {
    id: 'northwind-133',
    dataset: 'northwind',
    level: 3,
    topics: ['lag-lead', 'dates-advanced'],
    title: 'Month-over-month growth',
    prompt:
      'For each month show the revenue (rounded to 2 decimals) and its growth versus the previous month in percent, rounded to 1 decimal. The first month has no growth (NULL).',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG over monthly revenue',
        postgres: `${MONTHLY_PG}
select month,
       round(revenue, 2) as revenue,
       round(100.0 * (revenue - lag(revenue) over (order by month))
             / lag(revenue) over (order by month), 1) as growth_pct
from monthly
order by month;`,
        mysql: `${MONTHLY_MY}
select month,
       round(revenue, 2) as revenue,
       round(100.0 * (revenue - lag(revenue) over (order by month))
             / lag(revenue) over (order by month), 1) as growth_pct
from monthly
order by month;`,
        mysqlNote: 'Only the month expression changes.',
        explanation:
          'LAG brings the previous month\'s revenue onto the current row, so growth is a simple formula. The last month looks like a crash only because the data ends on 6 May 1998: always check whether the latest period is complete.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: LAG', url: MY + 'window-function-descriptions.html#function_lag' },
    ],
  },
  {
    id: 'northwind-134',
    dataset: 'northwind',
    level: 2,
    topics: ['dates-basics', 'group-by'],
    title: 'Orders by day of the week',
    prompt: 'Count the orders placed on each day of the week. Show the day name and the count, Monday first.',
    orderMatters: true,
    solutions: [
      {
        approach: "to_char 'Day' + ISO day number",
        postgres: `select to_char(order_date, 'FMDay') as weekday,
       count(*) as orders
from orders
group by weekday, extract(isodow from order_date)
order by extract(isodow from order_date);`,
        mysql: `select dayname(order_date) as weekday,
       count(*) as orders
from orders
group by weekday, weekday(order_date)
order by weekday(order_date);`,
        mysqlNote: 'DAYNAME gives the name; WEEKDAY numbers Monday as 0, so it sorts the same way as isodow.',
        explanation:
          'Sorting by the name would put Friday first. Group by the day number as well and sort by it. FM removes the padding spaces to_char adds. Northwind has no orders at weekends, so only five days appear.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: to_char', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: DAYNAME', url: MY + 'date-and-time-functions.html#function_dayname' },
    ],
  },
  {
    id: 'northwind-135',
    dataset: 'northwind',
    level: 3,
    topics: ['dates-advanced'],
    title: 'Week by week in April 1998',
    prompt: 'Count the orders of April 1998 per week. Show the Monday that starts each week and the count.',
    orderMatters: true,
    solutions: [
      {
        approach: "DATE_TRUNC('week')",
        postgres: `select date_trunc('week', order_date)::date as week_start,
       count(*) as orders
from orders
where order_date >= date '1998-04-01'
  and order_date < date '1998-05-01'
group by 1
order by 1;`,
        mysql: `select date(order_date - interval weekday(order_date) day) as week_start,
       count(*) as orders
from orders
where order_date >= '1998-04-01'
  and order_date < '1998-05-01'
group by week_start
order by week_start;`,
        mysqlNote: 'Go back WEEKDAY(date) days to reach Monday.',
        explanation:
          'PostgreSQL weeks start on Monday (ISO). The first week starts on 30 March, but only its April orders count because of the WHERE. The half-open range (>= first day, < next month) keeps every order of 30 April, whatever its time.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: WEEKDAY', url: MY + 'date-and-time-functions.html#function_weekday' },
    ],
  },

  // ---------- Cleaning data ----------
  {
    id: 'northwind-136',
    dataset: 'northwind',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Phone numbers as digits',
    prompt: 'Phone numbers come in many formats. For customers in the UK, show customer_id, phone and the phone with every non-digit removed.',
    orderMatters: true,
    solutions: [
      {
        approach: 'REGEXP_REPLACE',
        postgres: `select customer_id, phone,
       regexp_replace(phone, '[^0-9]', '', 'g') as digits
from customers
where country = 'UK'
order by customer_id;`,
        mysql: `select customer_id, phone,
       regexp_replace(phone, '[^0-9]', '') as digits
from customers
where country = 'UK'
order by customer_id;`,
        mysqlNote: 'MySQL replaces every match by default, so there is no g flag.',
        explanation: '[^0-9] matches any character that is not a digit. Without the g flag PostgreSQL would remove only the first one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: regexp_replace', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: REGEXP_REPLACE', url: MY + 'regexp.html#function_regexp-replace' },
    ],
  },
  {
    id: 'northwind-137',
    dataset: 'northwind',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Clean a messy import',
    prompt:
      'A spreadsheet of new customers was loaded into customer_import (created for you). Show id, the name without surrounding spaces, the e-mail trimmed and in lower case with empty values as NULL, and the country trimmed and in capitals.',
    orderMatters: true,
    setupSql: MESSY_CUSTOMERS,
    solutions: [
      {
        approach: 'TRIM, LOWER, UPPER, NULLIF',
        postgres: `select id,
       trim(name) as name,
       nullif(lower(trim(email)), '') as email,
       upper(trim(country)) as country
from customer_import
order by id;`,
        mysql: `select id,
       trim(name) as name,
       nullif(lower(trim(email)), '') as email,
       upper(trim(country)) as country
from customer_import
order by id;`,
        explanation:
          'Imports bring stray spaces, mixed case and empty strings. TRIM, LOWER/UPPER and NULLIF fix them; NULLIF turns the empty e-mail into a real NULL, so COUNT(email) and IS NULL treat it as missing.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string functions', url: PG + 'functions-string.html' },
      { label: 'MySQL: TRIM', url: MY + 'string-functions.html#function_trim' },
    ],
  },
  {
    id: 'northwind-138',
    dataset: 'northwind',
    level: 2,
    topics: ['data-cleaning', 'group-by'],
    title: 'Duplicate sign-ups',
    prompt:
      'The signup table (created for you) has the same people signing up more than once, with the e-mail typed differently. Show each e-mail that appears more than once once it is trimmed and lower-cased, how many sign-ups it has, and the first sign-up date.',
    orderMatters: true,
    setupSql: SIGNUPS,
    solutions: [
      {
        approach: 'GROUP BY the normalised value',
        postgres: `select lower(trim(email)) as email,
       count(*) as signups,
       min(signed_up) as first_signup
from signup
group by lower(trim(email))
having count(*) > 1
order by email;`,
        mysql: `select lower(trim(email)) as email,
       count(*) as signups,
       min(signed_up) as first_signup
from signup
group by lower(trim(email))
having count(*) > 1
order by email;`,
        explanation: 'Group by the cleaned value, not the raw one: "Ann@X.io " and "ann@x.io" are the same person. HAVING keeps only the groups with more than one row.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
      { label: 'MySQL: GROUP BY handling', url: MY + 'group-by-handling.html' },
    ],
  },
  {
    id: 'northwind-139',
    dataset: 'northwind',
    level: 4,
    topics: ['data-cleaning', 'dml'],
    title: 'Delete the duplicates, keep the first',
    prompt:
      'In the signup table (created for you), delete repeated sign-ups so that each person (e-mail trimmed and lower-cased) keeps only the earliest one; if two have the same date, keep the smaller id.',
    orderMatters: true,
    setupSql: SIGNUPS,
    checkSql: 'select id, email, signed_up from signup order by id',
    solutions: [
      {
        approach: 'ROW_NUMBER, delete rn > 1',
        postgres: `delete from signup
where id in (
  select id
  from (
    select id,
           row_number() over (partition by lower(trim(email)) order by signed_up, id) as rn
    from signup
  ) numbered
  where rn > 1
);`,
        mysql: `delete from signup
where id in (
  select id
  from (
    select id,
           row_number() over (partition by lower(trim(email)) order by signed_up, id) as rn
    from signup
  ) numbered
  where rn > 1
);`,
        mysqlNote: 'The extra derived table matters in MySQL: it may not read the table it is deleting from directly in a subquery (error 1093).',
        explanation: 'Number the rows of each person by date; everything after number 1 is a duplicate. Run the inner SELECT on its own first to see exactly what will be deleted.',
      },
      {
        approach: 'Self-join: an earlier copy exists',
        postgres: `delete from signup s
using signup keep
where lower(trim(keep.email)) = lower(trim(s.email))
  and (keep.signed_up, keep.id) < (s.signed_up, s.id);`,
        mysql: `delete s
from signup s
join signup keep
  on lower(trim(keep.email)) = lower(trim(s.email))
 and (keep.signed_up, keep.id) < (s.signed_up, s.id);`,
        mysqlNote: 'MySQL names the table to delete from before FROM and joins the copy; PostgreSQL uses DELETE … USING.',
        explanation: 'A row is deleted when another row of the same person is earlier. The row comparison (date, id) < (date, id) settles ties by id.',
      },
    ],
    comparison:
      'Both keep ids 1, 3 and 4. ROW_NUMBER reads more naturally and lets you check the rows first; the self-join avoids a window function. On big tables the ROW_NUMBER version usually scans less.',
    docs: [
      { label: 'PostgreSQL: DELETE', url: PG + 'sql-delete.html' },
      { label: 'MySQL: DELETE', url: MY + 'delete.html' },
    ],
  },
  {
    id: 'northwind-140',
    dataset: 'northwind',
    level: 2,
    topics: ['data-cleaning', 'null'],
    title: 'Empty is not missing',
    prompt:
      'The contact table (created for you) has some phones that are NULL and some that are empty or only spaces. Show three numbers: all rows, rows where phone is not NULL, and rows with a real phone number.',
    orderMatters: false,
    setupSql: CONTACTS,
    solutions: [
      {
        approach: 'COUNT with NULLIF(TRIM())',
        postgres: `select count(*) as all_rows,
       count(phone) as not_null,
       count(nullif(trim(phone), '')) as real_phone
from contact;`,
        mysql: `select count(*) as all_rows,
       count(phone) as not_null,
       count(nullif(trim(phone), '')) as real_phone
from contact;`,
        explanation: 'COUNT(column) skips NULLs only: an empty string still counts. Trimming and turning empty strings into NULL with NULLIF gives the number you actually want: 2 of 5.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: NULLIF', url: PG + 'functions-conditional.html#FUNCTIONS-NULLIF' },
      { label: 'MySQL: NULLIF', url: MY + 'flow-control-functions.html#function_nullif' },
    ],
  },

  // ---------- Pagination ----------
  {
    id: 'northwind-141',
    dataset: 'northwind',
    level: 2,
    topics: ['pagination'],
    title: 'Page 3 of the price list',
    prompt:
      'A shop lists products from the most expensive down (ties by product_id), 10 per page. Page 2 ended with product 64 at 33.25. Show page 3: product_id, product_name and unit_price.',
    orderMatters: true,
    solutions: [
      {
        approach: 'OFFSET',
        postgres: `select product_id, product_name, unit_price
from products
order by unit_price desc, product_id
limit 10 offset 20;`,
        mysql: `select product_id, product_name, unit_price
from products
order by unit_price desc, product_id
limit 10 offset 20;`,
        explanation: 'Skip the first two pages (20 rows) and take 10. Simple, but the database still reads and throws away all skipped rows.',
      },
      {
        approach: 'Keyset: continue after the last row',
        postgres: `select product_id, product_name, unit_price
from products
where unit_price < 33.25
   or (unit_price = 33.25 and product_id > 64)
order by unit_price desc, product_id
limit 10;`,
        mysql: `select product_id, product_name, unit_price
from products
where unit_price < 33.25
   or (unit_price = 33.25 and product_id > 64)
order by unit_price desc, product_id
limit 10;`,
        explanation: 'Remember where the previous page ended and continue right after it, in the same sort order. An index on (unit_price, product_id) can jump straight there.',
      },
    ],
    comparison:
      'Same 10 rows. OFFSET is fine for small lists and for jumping to page N. Keyset ("seek") paging stays fast on page 1,000 and does not skip or repeat rows when new ones are inserted while someone is paging; it is what APIs and infinite scroll use.',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: LIMIT optimization', url: MY + 'limit-optimization.html' },
    ],
  },
  {
    id: 'northwind-142',
    dataset: 'northwind',
    level: 2,
    topics: ['pagination', 'numbers'],
    title: 'How many pages?',
    prompt: 'With 10 products per page, how many pages does the full product list need?',
    orderMatters: false,
    solutions: [
      {
        approach: 'CEIL(count / page size)',
        postgres: `select ceil(count(*) / 10.0) as pages
from products;`,
        mysql: `select ceil(count(*) / 10) as pages
from products;`,
        mysqlNote: 'In MySQL / always returns a decimal, so plain 10 works.',
        explanation: '77 products / 10 = 7.7, and the last, partly filled page still counts: 8. In PostgreSQL 77 / 10 would be integer division (7), hence 10.0.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ceil', url: PG + 'functions-math.html' },
      { label: 'MySQL: CEIL', url: MY + 'mathematical-functions.html#function_ceil' },
    ],
  },

  // ---------- Exploring a database ----------
  {
    id: 'northwind-143',
    dataset: 'northwind',
    level: 4,
    topics: ['introspection'],
    title: 'Which tables are the widest?',
    prompt: 'Without looking at the schema diagram, list every table of the database with its number of columns, widest first (ties by table name).',
    orderMatters: true,
    solutions: [
      {
        approach: 'information_schema.columns',
        postgres: `select table_name, count(*) as columns
from information_schema.columns
where table_schema = 'public'
group by table_name
order by columns desc, table_name;`,
        mysql: `select table_name, count(*) as columns
from information_schema.columns
where table_schema = database()
group by table_name
order by columns desc, table_name;`,
        mysqlNote: 'In MySQL the schema is the database, so filter on database().',
        explanation: 'information_schema is a set of standard views describing the database itself: tables, columns, keys, privileges. It is how you explore an unfamiliar database with SQL alone.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: information_schema.columns', url: PG + 'infoschema-columns.html' },
      { label: 'MySQL: INFORMATION_SCHEMA COLUMNS', url: MY + 'information-schema-columns-table.html' },
    ],
  },
  {
    id: 'northwind-144',
    dataset: 'northwind',
    level: 4,
    topics: ['introspection'],
    title: 'Every column that looks like a key',
    prompt: 'Find every column whose name ends in "_id": table_name and column_name.',
    orderMatters: true,
    solutions: [
      {
        approach: "LIKE '%\\_id'",
        postgres: `select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name like '%\\_id'
order by table_name, column_name;`,
        mysql: `select table_name, column_name
from information_schema.columns
where table_schema = database()
  and column_name like '%\\_id'
order by table_name, column_name;`,
        explanation: 'In LIKE, _ means "any one character", so escape it as \\_ to match a real underscore. Matching names is a quick way to guess how tables join before reading the foreign keys.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: INFORMATION_SCHEMA COLUMNS', url: MY + 'information-schema-columns-table.html' },
    ],
  },
  {
    id: 'northwind-145',
    dataset: 'northwind',
    level: 4,
    topics: ['introspection', 'constraints'],
    title: 'What does order_details point to?',
    prompt: 'Using the system catalog, list the foreign keys of order_details: the column and the table it references.',
    orderMatters: true,
    solutions: [
      {
        approach: 'table_constraints + key_column_usage',
        postgres: `select kcu.column_name, ccu.table_name as references_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'order_details'
  and tc.constraint_type = 'FOREIGN KEY'
order by kcu.column_name;`,
        mysql: `select column_name, referenced_table_name as references_table
from information_schema.key_column_usage
where table_schema = database()
  and table_name = 'order_details'
  and referenced_table_name is not null
order by column_name;`,
        mysqlNote: 'MySQL adds referenced_table_name to key_column_usage, so one view is enough.',
        explanation: 'Foreign keys are the real map of how tables join. PostgreSQL follows the standard: the constraint, its columns, and the columns it points to live in three views.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: key_column_usage', url: PG + 'infoschema-key-column-usage.html' },
      { label: 'MySQL: KEY_COLUMN_USAGE', url: MY + 'information-schema-key-column-usage-table.html' },
    ],
  },

  // ---------- Users, roles and privileges ----------
  {
    id: 'northwind-146',
    dataset: 'northwind',
    level: 4,
    topics: ['privileges'],
    title: 'A read-only role for reports',
    prompt: 'Create a role report_reader that can read orders and order_details, and nothing else.',
    orderMatters: false,
    checkSql: `select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'report_reader'
order by table_name, privilege_type`,
    checkSqlMysql: `select table_name, privilege_type
from information_schema.table_privileges
where grantee = '''report_reader''@''%'''
order by table_name, privilege_type`,
    solutions: [
      {
        approach: 'CREATE ROLE + GRANT SELECT',
        postgres: `create role report_reader nologin;
grant select on orders, order_details to report_reader;`,
        mysql: `create role report_reader;
grant select on orders to report_reader;
grant select on order_details to report_reader;`,
        mysqlNote: 'A MySQL GRANT names one table at a time. Roles are accounts too: report_reader@%.',
        explanation:
          'Grant privileges to a role, then give the role to people. NOLOGIN marks it as a group, not someone who signs in. Granting only SELECT is the principle of least privilege: reports can read, never change.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GRANT', url: PG + 'sql-grant.html' },
      { label: 'MySQL: GRANT', url: MY + 'grant.html' },
    ],
  },
  {
    id: 'northwind-147',
    dataset: 'northwind',
    level: 4,
    topics: ['privileges'],
    title: 'Take a privilege back',
    prompt: 'Create a role clerk with SELECT, INSERT and UPDATE on products. Then take INSERT and UPDATE away again, so the clerk can only read products.',
    orderMatters: true,
    checkSql: `select privilege_type
from information_schema.role_table_grants
where grantee = 'clerk' and table_name = 'products'
order by privilege_type`,
    checkSqlMysql: `select privilege_type
from information_schema.table_privileges
where grantee = '''clerk''@''%''' and table_name = 'products'
order by privilege_type`,
    solutions: [
      {
        approach: 'GRANT, then REVOKE',
        postgres: `create role clerk nologin;
grant select, insert, update on products to clerk;
revoke insert, update on products from clerk;`,
        mysql: `create role clerk;
grant select, insert, update on products to clerk;
revoke insert, update on products from clerk;`,
        explanation: 'REVOKE mirrors GRANT: TO becomes FROM. Revoking is how you tighten access when someone changes jobs, without dropping and recreating the role.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: REVOKE', url: PG + 'sql-revoke.html' },
      { label: 'MySQL: REVOKE', url: MY + 'revoke.html' },
    ],
  },
  {
    id: 'northwind-148',
    dataset: 'northwind',
    level: 4,
    topics: ['privileges'],
    title: 'Only some columns',
    prompt: 'A partner may see the catalogue but not stock levels. Create a role catalog_viewer that can read only product_id, product_name and unit_price of products.',
    orderMatters: true,
    checkSql: `select column_name, privilege_type
from information_schema.role_column_grants
where grantee = 'catalog_viewer'
order by column_name`,
    checkSqlMysql: `select column_name, privilege_type
from information_schema.column_privileges
where grantee = '''catalog_viewer''@''%'''
order by column_name`,
    solutions: [
      {
        approach: 'Column-level GRANT',
        postgres: `create role catalog_viewer nologin;
grant select (product_id, product_name, unit_price) on products to catalog_viewer;`,
        mysql: `create role catalog_viewer;
grant select (product_id, product_name, unit_price) on products to catalog_viewer;`,
        explanation: 'A column list after the privilege limits it to those columns: SELECT * would now fail for this role, while selecting the three columns works. A view of those columns is the other common way.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GRANT on columns', url: PG + 'sql-grant.html' },
      { label: 'MySQL: column privileges', url: MY + 'grant.html#grant-column-privileges' },
    ],
  },
  {
    id: 'northwind-149',
    dataset: 'northwind',
    level: 4,
    topics: ['privileges'],
    title: 'Give the role to a person',
    prompt: 'Create a role analyst (no login) and a login maria, and make maria a member of analyst.',
    orderMatters: false,
    checkSql: `select r.rolname as role
from pg_auth_members m
join pg_roles r on r.oid = m.roleid
join pg_roles u on u.oid = m.member
where u.rolname = 'maria'`,
    checkSqlMysql: `select from_user as role
from mysql.role_edges
where to_user = 'maria'`,
    solutions: [
      {
        approach: 'GRANT role TO user',
        postgres: `create role analyst nologin;
create role maria login;
grant analyst to maria;`,
        mysql: `create role analyst;
create user maria;
grant analyst to maria;`,
        mysqlNote: 'MySQL has CREATE USER for people and CREATE ROLE for groups; membership is stored in mysql.role_edges.',
        explanation:
          'Privileges go to roles, people get roles. When Maria moves team you change one membership instead of a dozen grants. In PostgreSQL users are simply roles with LOGIN.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: role membership', url: PG + 'role-membership.html' },
      { label: 'MySQL: using roles', url: MY + 'roles.html' },
    ],
  },

  // ---------- Transactions ----------
  {
    id: 'northwind-150',
    dataset: 'northwind',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Move stock, all or nothing',
    prompt: 'Move 10 units of stock from product 1 (Chai) to product 2 (Chang) inside one transaction: BEGIN, the two updates, COMMIT.',
    orderMatters: true,
    checkSql: 'select product_id, units_in_stock from products where product_id in (1, 2) order by product_id',
    solutions: [
      {
        approach: 'BEGIN … COMMIT',
        postgres: `begin;
update products set units_in_stock = units_in_stock - 10 where product_id = 1;
update products set units_in_stock = units_in_stock + 10 where product_id = 2;
commit;`,
        mysql: `start transaction;
update products set units_in_stock = units_in_stock - 10 where product_id = 1;
update products set units_in_stock = units_in_stock + 10 where product_id = 2;
commit;`,
        mysqlNote: 'START TRANSACTION is the usual MySQL spelling; BEGIN works too outside stored programs.',
        explanation:
          'If anything fails between the two updates, nothing is saved, so stock never disappears or doubles. Chai goes from 39 to 29 and Chang from 17 to 27. (Here everything is still rolled back after the check, as in every exercise.)',
      },
    ],
    docs: [
      { label: 'PostgreSQL: transactions', url: PG + 'tutorial-transactions.html' },
      { label: 'MySQL: START TRANSACTION, COMMIT, ROLLBACK', url: MY + 'commit.html' },
    ],
  },
  {
    id: 'northwind-151',
    dataset: 'northwind',
    level: 4,
    topics: ['transactions'],
    title: 'Keep one change, undo the other',
    prompt:
      'In one transaction raise Chai (product 1) by 1.00 and COMMIT. In a second transaction set Chang (product 2) to 0, then change your mind and ROLLBACK.',
    orderMatters: true,
    checkSql: 'select product_id, unit_price from products where product_id in (1, 2) order by product_id',
    solutions: [
      {
        approach: 'COMMIT, then ROLLBACK',
        postgres: `begin;
update products set unit_price = unit_price + 1 where product_id = 1;
commit;

begin;
update products set unit_price = 0 where product_id = 2;
rollback;`,
        mysql: `start transaction;
update products set unit_price = unit_price + 1 where product_id = 1;
commit;

start transaction;
update products set unit_price = 0 where product_id = 2;
rollback;`,
        explanation: 'COMMIT makes the first change permanent; ROLLBACK throws away everything since its BEGIN. Chai ends at 19.00, Chang keeps 19.00.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ROLLBACK', url: PG + 'sql-rollback.html' },
      { label: 'MySQL: START TRANSACTION, COMMIT, ROLLBACK', url: MY + 'commit.html' },
    ],
  },
  {
    id: 'northwind-152',
    dataset: 'northwind',
    level: 4,
    topics: ['transactions', 'dml', 'constraints'],
    title: 'Delete an order with its lines',
    prompt: 'Delete order 10248 completely, in one transaction. Mind the order of the statements: order_details has a foreign key to orders.',
    orderMatters: false,
    checkSql: `select (select count(*) from orders where order_id = 10248) as orders,
       (select count(*) from order_details where order_id = 10248) as order_lines`,
    solutions: [
      {
        approach: 'Children first, then the parent',
        postgres: `begin;
delete from order_details where order_id = 10248;
delete from orders where order_id = 10248;
commit;`,
        mysql: `start transaction;
delete from order_details where order_id = 10248;
delete from orders where order_id = 10248;
commit;`,
        explanation:
          'Deleting the order first would fail: its three lines still point to it. Delete the lines first. The transaction makes sure you never end up with lines but no order, or the other way round.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: foreign keys', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' },
      { label: 'MySQL: FOREIGN KEY constraints', url: MY + 'create-table-foreign-keys.html' },
    ],
  },
  {
    id: 'northwind-153',
    dataset: 'northwind',
    level: 4,
    topics: ['dml', 'transactions'],
    title: 'Archive the 1996 order lines',
    prompt:
      'Create order_details_archive with the same columns as order_details, move into it every line of orders placed before 1997, and delete those lines from order_details. Show how many lines were archived and how many remain.',
    orderMatters: false,
    checkSql: `select (select count(*) from order_details_archive) as archived,
       (select count(*) from order_details) as remaining`,
    solutions: [
      {
        approach: 'Data-modifying CTE',
        postgres: `create table order_details_archive (like order_details);

with moved as (
  delete from order_details d
  using orders o
  where o.order_id = d.order_id
    and o.order_date < date '1997-01-01'
  returning d.*
)
insert into order_details_archive
select * from moved;`,
        mysql: null,
        mysqlNote: 'MySQL has no DELETE … RETURNING inside WITH; use solution B.',
        explanation: 'DELETE … RETURNING hands the deleted rows straight to the INSERT, in one statement: nothing can be deleted without being archived.',
      },
      {
        approach: 'INSERT … SELECT, then DELETE, in a transaction',
        postgres: `create table order_details_archive (like order_details);

begin;
insert into order_details_archive
select d.*
from order_details d
join orders o on o.order_id = d.order_id
where o.order_date < date '1997-01-01';

delete from order_details d
using orders o
where o.order_id = d.order_id
  and o.order_date < date '1997-01-01';
commit;`,
        mysql: `create table order_details_archive like order_details;

start transaction;
insert into order_details_archive
select d.*
from order_details d
join orders o on o.order_id = d.order_id
where o.order_date < '1997-01-01';

delete d
from order_details d
join orders o on o.order_id = d.order_id
where o.order_date < '1997-01-01';
commit;`,
        explanation: 'Copy first, delete second, both with the same condition, inside one transaction.',
      },
    ],
    comparison:
      'Same result. The CTE cannot drift apart because one statement does both; the two-statement version works everywhere but repeats the condition, so keep both copies identical.',
    docs: [
      { label: 'PostgreSQL: data-modifying WITH', url: PG + 'queries-with.html#QUERIES-WITH-MODIFYING' },
      { label: 'MySQL: INSERT … SELECT', url: MY + 'insert-select.html' },
    ],
  },

  // ---------- Interview classics ----------
  {
    id: 'northwind-154',
    dataset: 'northwind',
    level: 3,
    topics: ['ranking'],
    title: 'Three priciest per category, ties included',
    prompt:
      'For each category show the products with the three highest prices; products with the same price share a place, so a category may show more than three. Show category_name, product_id, product_name, unit_price and the price rank.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DENSE_RANK',
        postgres: `with ranked as (
  select c.category_name, p.product_id, p.product_name, p.unit_price,
         dense_rank() over (partition by p.category_id order by p.unit_price desc) as price_rank
  from products p
  join categories c on c.category_id = p.category_id
)
select category_name, product_id, product_name, unit_price, price_rank
from ranked
where price_rank <= 3
order by category_name, price_rank, product_id;`,
        mysql: `with ranked as (
  select c.category_name, p.product_id, p.product_name, p.unit_price,
         dense_rank() over (partition by p.category_id order by p.unit_price desc) as price_rank
  from products p
  join categories c on c.category_id = p.category_id
)
select category_name, product_id, product_name, unit_price, price_rank
from ranked
where price_rank <= 3
order by category_name, price_rank, product_id;`,
        explanation:
          'DENSE_RANK gives equal prices the same rank and does not skip numbers, so "top 3 prices" keeps every tie. ROW_NUMBER would cut ties arbitrarily; RANK would skip a place after a tie. A favourite interview question.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: DENSE_RANK', url: MY + 'window-function-descriptions.html#function_dense-rank' },
    ],
  },
  {
    id: 'northwind-155',
    dataset: 'northwind',
    level: 3,
    topics: ['ranking'],
    title: 'The second most expensive product',
    prompt: 'In each category, find the product(s) with the second highest price: category_name, product_id, product_name, unit_price.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DENSE_RANK = 2',
        postgres: `with ranked as (
  select category_id, product_id, product_name, unit_price,
         dense_rank() over (partition by category_id order by unit_price desc) as rnk
  from products
)
select c.category_name, r.product_id, r.product_name, r.unit_price
from ranked r
join categories c on c.category_id = r.category_id
where r.rnk = 2
order by c.category_name, r.product_id;`,
        mysql: `with ranked as (
  select category_id, product_id, product_name, unit_price,
         dense_rank() over (partition by category_id order by unit_price desc) as rnk
  from products
)
select c.category_name, r.product_id, r.product_name, r.unit_price
from ranked r
join categories c on c.category_id = r.category_id
where r.rnk = 2
order by c.category_name, r.product_id;`,
        explanation: '"N-th highest" is DENSE_RANK = N: if two products tie for the top price, the next price is still the second highest.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: DENSE_RANK', url: MY + 'window-function-descriptions.html#function_dense-rank' },
    ],
  },
  {
    id: 'northwind-156',
    dataset: 'northwind',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Revenue so far this period',
    prompt: 'For each month show the revenue and the running total from the first month, both rounded to 2 decimals.',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: 'SUM … OVER (ORDER BY month)',
        postgres: `${MONTHLY_PG}
select month,
       round(revenue, 2) as revenue,
       round(sum(revenue) over (order by month rows between unbounded preceding and current row), 2) as running_total
from monthly
order by month;`,
        mysql: `${MONTHLY_MY}
select month,
       round(revenue, 2) as revenue,
       round(sum(revenue) over (order by month rows between unbounded preceding and current row), 2) as running_total
from monthly
order by month;`,
        explanation: 'A window SUM with ORDER BY adds everything from the first row to the current one. Round at the end, not inside the sum, or rounding errors pile up.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: window frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'northwind-157',
    dataset: 'northwind',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'A three-month moving average',
    prompt: 'For each month show the revenue and the average of that month and the two before it, both rounded to 2 decimals.',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: 'AVG … ROWS BETWEEN 2 PRECEDING',
        postgres: `${MONTHLY_PG}
select month,
       round(revenue, 2) as revenue,
       round(avg(revenue) over (order by month rows between 2 preceding and current row), 2) as moving_avg_3m
from monthly
order by month;`,
        mysql: `${MONTHLY_MY}
select month,
       round(revenue, 2) as revenue,
       round(avg(revenue) over (order by month rows between 2 preceding and current row), 2) as moving_avg_3m
from monthly
order by month;`,
        explanation: 'A moving average smooths out noisy months. The first two months average over fewer rows: the frame cannot reach before the first row.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: window frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'northwind-158',
    dataset: 'northwind',
    level: 3,
    topics: ['aggregates'],
    title: 'The median order',
    prompt: 'What is the median order value? An order\'s value is the sum of its lines. Round to 2 decimals.',
    hint: 'Line value: unit_price × quantity × (1 − discount).',
    orderMatters: false,
    solutions: [
      {
        approach: 'PERCENTILE_CONT',
        postgres: `${ORDER_VALUES}
select round(percentile_cont(0.5) within group (order by value)::numeric, 2) as median
from v;`,
        mysql: null,
        mysqlNote: 'MySQL has no PERCENTILE_CONT; use solution B.',
        explanation: 'percentile_cont(0.5) is the median: with an even number of orders (830) it averages the two middle values.',
      },
      {
        approach: 'Number the rows, average the middle one(s)',
        postgres: `${ORDER_VALUES},
numbered as (
  select value,
         row_number() over (order by value) as rn,
         count(*) over () as n
  from v
)
select round(avg(value), 2) as median
from numbered
where rn in (floor((n + 1) / 2), floor(n / 2) + 1);`,
        mysql: `${ORDER_VALUES},
numbered as (
  select value,
         row_number() over (order by value) as rn,
         count(*) over () as n
  from v
)
select round(avg(value), 2) as median
from numbered
where rn in (floor((n + 1) / 2), floor(n / 2) + 1);`,
        explanation: 'For 830 orders the middle rows are 415 and 416; for an odd count both formulas point to the same row.',
      },
    ],
    comparison:
      'Same median. PERCENTILE_CONT is one line and also gives any other percentile; the ROW_NUMBER version works in every database and shows how a median is defined. The median is much lower than the average here: a few large orders pull the average up.',
    docs: [
      { label: 'PostgreSQL: ordered-set aggregates', url: PG + 'functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE' },
      { label: 'MySQL: ROW_NUMBER', url: MY + 'window-function-descriptions.html#function_row-number' },
    ],
  },
  // ---------- Loading files ----------
  {
    id: 'northwind-159',
    dataset: 'northwind',
    level: 4,
    topics: ['data-loading', 'ddl'],
    title: 'Load new customers from a CSV file',
    prompt:
      'Sales sent new_customers.csv (it comes with this exercise). Create a table customer_import (customer_id varchar(5), company_name varchar(40), country varchar(15)) and load the file into it. Note that one company name contains a comma.',
    orderMatters: true,
    files: [
      {
        name: 'new_customers.csv',
        content: 'customer_id,company_name,country\nNEWCO,New Coffee Co,Norway\nSMJON,"Smith, Jones & Co",UK\nBLUEB,Blue Bay Foods,Ireland\n',
      },
    ],
    checkSql: 'select customer_id, company_name, country from customer_import order by customer_id',
    solutions: [
      {
        approach: 'COPY … FROM with CSV options',
        postgres: `create table customer_import (
  customer_id varchar(5),
  company_name varchar(40),
  country varchar(15)
);

copy customer_import from 'new_customers.csv' with (format csv, header);`,
        mysql: `create table customer_import (
  customer_id varchar(5),
  company_name varchar(40),
  country varchar(15)
);

load data local infile 'new_customers.csv'
into table customer_import
fields terminated by ',' optionally enclosed by '"'
ignore 1 lines;`,
        mysqlNote:
          'MySQL uses LOAD DATA; LOCAL reads the file from the client. Spell out the separator, the quotes and the header line to skip. The server must allow it (local_infile).',
        explanation:
          'Bulk loading is how real data arrives: one statement reads the whole file, much faster than row-by-row INSERTs. format csv understands the quoted "Smith, Jones & Co"; header skips the first line. On a server, COPY reads the server\'s disk; from your laptop use psql\'s \\copy, which sends a local file.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: COPY', url: PG + 'sql-copy.html' },
      { label: 'MySQL: LOAD DATA', url: MY + 'load-data.html' },
    ],
  },
  {
    id: 'northwind-160',
    dataset: 'northwind',
    level: 4,
    topics: ['data-loading', 'dml', 'temp-tables'],
    title: 'Load price changes and apply them',
    prompt:
      'Purchasing sent price_update.csv (it comes with this exercise) with new prices for some products. Load it into a temporary table and update products from it in one statement.',
    orderMatters: true,
    files: [{ name: 'price_update.csv', content: 'product_id,unit_price\n1,19.50\n2,20.00\n3,10.75\n' }],
    checkSql: 'select product_id, unit_price from products where product_id <= 4 order by product_id',
    solutions: [
      {
        approach: 'COPY into a temp table, UPDATE … FROM',
        postgres: `create temporary table price_update (product_id int, unit_price numeric(10, 2));

copy price_update from 'price_update.csv' with (format csv, header);

update products p
set unit_price = u.unit_price
from price_update u
where u.product_id = p.product_id;`,
        mysql: `create temporary table price_update (product_id int, unit_price decimal(10, 2));

load data local infile 'price_update.csv'
into table price_update
fields terminated by ','
ignore 1 lines;

update products p
join price_update u on u.product_id = p.product_id
set p.unit_price = u.unit_price;`,
        mysqlNote: 'MySQL joins the staging table in the UPDATE instead of using FROM.',
        explanation:
          'Load into a staging table first, then apply: you can inspect, clean or reject the file before touching the real table. Product 4 is not in the file and keeps its price.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: COPY', url: PG + 'sql-copy.html' },
      { label: 'MySQL: LOAD DATA', url: MY + 'load-data.html' },
    ],
  },
]
