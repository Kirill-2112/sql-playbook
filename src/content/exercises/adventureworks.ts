import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

export const adventureworksExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'adventureworks-026',
    dataset: 'adventureworks',
    level: 1,
    topics: ['select-basics', 'limit'],
    title: 'The most expensive products',
    prompt: 'Show the 10 products with the highest list price: product_id, name and list_price. Equal prices by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY … LIMIT',
        postgres: `select product_id, name, list_price
from product
order by list_price desc, product_id
limit 10;`,
        mysql: `select product_id, name, list_price
from product
order by list_price desc, product_id
limit 10;`,
        explanation: 'list_price keeps four decimals (numeric(19,4), Microsoft\'s money type converted), so prices print as 3578.2700.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'adventureworks-027',
    dataset: 'adventureworks',
    level: 1,
    topics: ['null', 'aggregates'],
    title: 'Products without a colour',
    prompt: 'How many products have no colour, and how many have one?',
    orderMatters: false,
    solutions: [
      {
        approach: 'count(*) vs count(column)',
        postgres: `select count(*) - count(color) as without_colour,
       count(color)            as with_colour
from product;`,
        mysql: `select count(*) - count(color) as without_colour,
       count(color)            as with_colour
from product;`,
        explanation: 'count(*) counts rows; count(color) counts only rows where color is not NULL. The difference is the NULLs.',
      },
      {
        approach: 'IS NULL in a condition',
        postgres: `select sum(case when color is null then 1 else 0 end)     as without_colour,
       sum(case when color is not null then 1 else 0 end) as with_colour
from product;`,
        mysql: `select sum(color is null)     as without_colour,
       sum(color is not null) as with_colour
from product;`,
        explanation: 'Each row adds 1 to exactly one of the two sums. "color = NULL" would never be true, which is why IS NULL exists.',
      },
    ],
    comparison: 'Same numbers. The count(*) − count(column) trick is short; the CASE version is explicit and easy to extend.',
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'adventureworks-028',
    dataset: 'adventureworks',
    level: 1,
    topics: ['distinct', 'conditions'],
    title: 'The colour range',
    prompt: 'List the different product colours once each, leaving out products with no colour.',
    orderMatters: false,
    solutions: [
      {
        approach: 'DISTINCT',
        postgres: `select distinct color
from product
where color is not null;`,
        mysql: `select distinct color
from product
where color is not null;`,
        explanation: 'DISTINCT removes repeated values. Without the WHERE, NULL would appear once as its own "colour".',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT DISTINCT', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },
  {
    id: 'adventureworks-029',
    dataset: 'adventureworks',
    level: 1,
    topics: ['strings'],
    title: 'User names from login ids',
    prompt:
      'login_id looks like adventure-works\\ken0. For the 5 employees with the lowest business_entity_id, show business_entity_id and the user name after the backslash.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Split at the backslash',
        postgres: `select business_entity_id,
       split_part(login_id, '\\', 2) as user_name
from employee
order by business_entity_id
limit 5;`,
        mysql: `select business_entity_id,
       substring_index(login_id, '\\\\', -1) as user_name
from employee
order by business_entity_id
limit 5;`,
        mysqlNote:
          'In a MySQL string a backslash starts an escape sequence, so one backslash is written \'\\\\\'. substring_index(text, delimiter, -1) returns the part after the last delimiter.',
        explanation:
          'In standard SQL, and in PostgreSQL since 9.1, a backslash inside \'…\' is an ordinary character, so \'\\\' is one backslash. The same query text therefore means different things in the two databases.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: String constants', url: PG + 'sql-syntax-lexical.html#SQL-SYNTAX-STRINGS' },
      { label: 'MySQL: String literals', url: MY + 'string-literals.html' },
    ],
  },

  // ---------- Level 2 ----------
  {
    id: 'adventureworks-001',
    dataset: 'adventureworks',
    level: 2,
    topics: ['joins'],
    title: 'Expensive bikes with their category path',
    prompt:
      'List bikes with a list price above 3,000: product name, subcategory name, category name and list_price. Most expensive first, then by product_id.',
    hint: 'product → product_subcategory → product_category.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two joins up the hierarchy',
        postgres: `select p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
where c.name = 'Bikes'
  and p.list_price > 3000
order by p.list_price desc, p.product_id;`,
        mysql: `select p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
where c.name = 'Bikes'
  and p.list_price > 3000
order by p.list_price desc, p.product_id;`,
        explanation: 'Products point to a subcategory, subcategories to a category: two hops up a fixed two-level hierarchy.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins between tables', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'adventureworks-002',
    dataset: 'adventureworks',
    level: 2,
    topics: ['joins', 'null', 'group-by'],
    title: 'Products per category, including the uncategorised',
    prompt:
      'How many products are in each category? Products without a subcategory belong to "Uncategorized". Show category and products, most first, then by category.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEFT JOIN + COALESCE',
        postgres: `select coalesce(c.name, 'Uncategorized') as category, count(*) as products
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id
group by coalesce(c.name, 'Uncategorized')
order by products desc, category;`,
        mysql: `select coalesce(c.name, 'Uncategorized') as category, count(*) as products
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id
group by coalesce(c.name, 'Uncategorized')
order by products desc, category;`,
        explanation:
          'An inner join would silently drop every product without a subcategory, about 40% of them. LEFT JOIN keeps them with NULLs, and COALESCE gives that group a name.',
      },
    ],
    docs: [{ label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' }],
  },
  {
    id: 'adventureworks-003',
    dataset: 'adventureworks',
    level: 2,
    topics: ['aggregates', 'joins'],
    title: 'Revenue by sales territory',
    prompt: 'For each sales territory: name, territory_group, number of orders and total revenue (sum of total_due, 2 decimals). Highest revenue first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join + GROUP BY',
        postgres: `select t.name, t.territory_group,
       count(*) as orders,
       round(sum(h.total_due), 2) as revenue
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_id, t.name, t.territory_group
order by revenue desc;`,
        mysql: `select t.name, t.territory_group,
       count(*) as orders,
       round(sum(h.total_due), 2) as revenue
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_id, t.name, t.territory_group
order by revenue desc;`,
        explanation: 'One row per territory. The original column was called Group, which is a reserved word in SQL, so this dataset names it territory_group.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'adventureworks-004',
    dataset: 'adventureworks',
    level: 2,
    topics: ['subqueries', 'set-operations'],
    title: 'Products nobody ordered',
    prompt: 'How many products never appear in a sales order line?',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as never_ordered
from product p
where not exists (select 1 from sales_order_detail d where d.product_id = p.product_id);`,
        mysql: `select count(*) as never_ordered
from product p
where not exists (select 1 from sales_order_detail d where d.product_id = p.product_id);`,
        explanation: 'Count products with no matching order line.',
      },
      {
        approach: 'EXCEPT',
        postgres: `select count(*) as never_ordered
from (
  select product_id from product
  except
  select product_id from sales_order_detail
) p;`,
        mysql: `select count(*) as never_ordered
from (
  select product_id from product
  except
  select product_id from sales_order_detail
) p;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation: 'All product ids minus the ordered ones.',
      },
    ],
    comparison: 'Same count. Many of these are parts and components, which are built in-house and never sold on their own.',
    docs: [{ label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' }],
  },
  {
    id: 'adventureworks-005',
    dataset: 'adventureworks',
    level: 2,
    topics: ['self-cross-join', 'joins', 'text-search'],
    title: 'Vice presidents and their bosses',
    prompt:
      'For every employee whose job title contains "Vice President", show their name (first and last), job title and their manager\'s name. Order by employee id (business_entity_id).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join through person',
        postgres: `select concat(p.first_name, ' ', p.last_name) as employee,
       e.job_title,
       concat(mp.first_name, ' ', mp.last_name) as manager
from employee e
join person p   on p.business_entity_id = e.business_entity_id
join employee m on m.business_entity_id = e.manager_id
join person mp  on mp.business_entity_id = m.business_entity_id
where e.job_title like '%Vice President%'
order by e.business_entity_id;`,
        mysql: `select concat(p.first_name, ' ', p.last_name) as employee,
       e.job_title,
       concat(mp.first_name, ' ', mp.last_name) as manager
from employee e
join person p   on p.business_entity_id = e.business_entity_id
join employee m on m.business_entity_id = e.manager_id
join person mp  on mp.business_entity_id = m.business_entity_id
where e.job_title like '%Vice President%'
order by e.business_entity_id;`,
        explanation:
          'Names live in person, job data in employee, so each side of the self join needs its own trip to person. In the original database the boss is encoded in a SQL Server hierarchyid; here it is a plain manager_id.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'adventureworks-006',
    dataset: 'adventureworks',
    level: 2,
    topics: ['conditional-aggregates', 'dates-basics'],
    title: 'Online versus reseller orders',
    prompt: 'For each year: total orders, orders placed online (online_order_flag = 1) and orders placed by resellers. Order by year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select extract(year from order_date)::int as year,
       count(*) as orders,
       count(*) filter (where online_order_flag = 1) as online,
       count(*) filter (where online_order_flag = 0) as reseller
from sales_order_header
group by 1
order by 1;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; use solution B.',
        explanation: 'Each count gets its own filter over the same yearly group.',
      },
      {
        approach: 'SUM(CASE …)',
        postgres: `select extract(year from order_date)::int as year,
       count(*) as orders,
       sum(case when online_order_flag = 1 then 1 else 0 end) as online,
       sum(case when online_order_flag = 0 then 1 else 0 end) as reseller
from sales_order_header
group by 1
order by 1;`,
        mysql: `select year(order_date) as year,
       count(*) as orders,
       sum(case when online_order_flag = 1 then 1 else 0 end) as online,
       sum(case when online_order_flag = 0 then 1 else 0 end) as reseller
from sales_order_header
group by 1
order by 1;`,
        mysqlNote: 'YEAR() instead of extract.',
        explanation: 'online_order_flag was a SQL Server bit; here it is a small integer 0/1 in both databases.',
      },
    ],
    comparison: 'Same numbers. FILTER is cleaner; SUM(CASE …) is portable.',
    docs: [{ label: 'PostgreSQL: FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'adventureworks-007',
    dataset: 'adventureworks',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'Salespeople per territory',
    prompt: 'For each territory that has salespeople, show the territory name and their last names, alphabetical, separated by ", ". Order by territory_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg',
        postgres: `select t.name as territory,
       string_agg(p.last_name, ', ' order by p.last_name) as salespeople
from sales_person sp
join sales_territory t on t.territory_id = sp.territory_id
join person p          on p.business_entity_id = sp.business_entity_id
group by t.territory_id, t.name
order by t.territory_id;`,
        mysql: `select t.name as territory,
       group_concat(p.last_name order by p.last_name separator ', ') as salespeople
from sales_person sp
join sales_territory t on t.territory_id = sp.territory_id
join person p          on p.business_entity_id = sp.business_entity_id
group by t.territory_id, t.name
order by t.territory_id;`,
        mysqlNote: 'GROUP_CONCAT(… ORDER BY … SEPARATOR …).',
        explanation: 'Salespeople without a territory are dropped by the inner join, as the question asks.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },

  // ---------- Level 3 ----------
  {
    id: 'adventureworks-008',
    dataset: 'adventureworks',
    level: 3,
    topics: ['recursive'],
    title: 'The sales organisation',
    prompt:
      'List everyone in the sales organisation under Brian Welcker (employee 273), at any depth: business_entity_id, job_title, level below him (1 = direct report) and manager_id. Order by level, then business_entity_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WITH RECURSIVE',
        postgres: `with recursive team as (
  select business_entity_id, job_title, 1 as level, manager_id
  from employee
  where manager_id = 273
  union all
  select e.business_entity_id, e.job_title, t.level + 1, e.manager_id
  from employee e
  join team t on e.manager_id = t.business_entity_id
)
select business_entity_id, job_title, level, manager_id
from team
order by level, business_entity_id;`,
        mysql: `with recursive team as (
  select business_entity_id, job_title, 1 as level, manager_id
  from employee
  where manager_id = 273
  union all
  select e.business_entity_id, e.job_title, t.level + 1, e.manager_id
  from employee e
  join team t on e.manager_id = t.business_entity_id
)
select business_entity_id, job_title, level, manager_id
from team
order by level, business_entity_id;`,
        explanation: 'Start from his direct reports and keep adding people whose manager is already in the result.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'adventureworks-009',
    dataset: 'adventureworks',
    level: 3,
    topics: ['recursive', 'group-by'],
    title: 'How big is each executive\'s organisation?',
    prompt:
      'For each person reporting directly to the CEO (employee 1), count everyone below them at any depth. Show business_entity_id, job_title and people, largest first, then by id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Carry the root through the recursion',
        postgres: `with recursive tree as (
  select business_entity_id as root, business_entity_id
  from employee
  where manager_id = 1
  union all
  select t.root, e.business_entity_id
  from employee e
  join tree t on e.manager_id = t.business_entity_id
)
select t.root as business_entity_id, e.job_title, count(*) - 1 as people
from tree t
join employee e on e.business_entity_id = t.root
group by t.root, e.job_title
order by people desc, t.root;`,
        mysql: `with recursive tree as (
  select business_entity_id as root, business_entity_id
  from employee
  where manager_id = 1
  union all
  select t.root, e.business_entity_id
  from employee e
  join tree t on e.manager_id = t.business_entity_id
)
select t.root as business_entity_id, e.job_title, count(*) - 1 as people
from tree t
join employee e on e.business_entity_id = t.root
group by t.root, e.job_title
order by people desc, t.root;`,
        explanation:
          'Each row remembers which executive its branch started from (root). Grouping by root then counts every branch at once; minus 1 removes the executive themself.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'adventureworks-010',
    dataset: 'adventureworks',
    level: 3,
    topics: ['ranking', 'cte'],
    title: 'Best sellers in every category',
    prompt:
      'For each product category, the 3 products with the highest sales (sum of line_total, 2 decimals): category, product, sales and place. Ties by product_id. Order by category, then place.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `with product_sales as (
  select c.name as category, p.product_id, p.name as product, sum(d.line_total) as sales
  from sales_order_detail d
  join product p             on p.product_id = d.product_id
  join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
  join product_category c    on c.product_category_id = s.product_category_id
  group by c.name, p.product_id, p.name
)
select category, product, round(sales, 2) as sales, place
from (
  select product_sales.*,
         row_number() over (partition by category order by sales desc, product_id) as place
  from product_sales
) ranked
where place <= 3
order by category, place;`,
        mysql: `with product_sales as (
  select c.name as category, p.product_id, p.name as product, sum(d.line_total) as sales
  from sales_order_detail d
  join product p             on p.product_id = d.product_id
  join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
  join product_category c    on c.product_category_id = s.product_category_id
  group by c.name, p.product_id, p.name
)
select category, product, round(sales, 2) as sales, place
from (
  select product_sales.*,
         row_number() over (partition by category order by sales desc, product_id) as place
  from product_sales
) ranked
where place <= 3
order by category, place;`,
        explanation: 'Aggregate first, rank second, filter third: each step needs the previous one finished.',
      },
    ],
    docs: [{ label: 'PostgreSQL: row_number()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'adventureworks-011',
    dataset: 'adventureworks',
    level: 3,
    topics: ['lag-lead'],
    title: 'How quotas changed',
    prompt: 'For salesperson 276, list every quota with quota_date, sales_quota and the change from the previous quota (NULL for the first). Order by date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG()',
        postgres: `select quota_date, sales_quota,
       sales_quota - lag(sales_quota) over (order by quota_date) as change_from_previous
from sales_person_quota_history
where business_entity_id = 276
order by quota_date;`,
        mysql: `select quota_date, sales_quota,
       sales_quota - lag(sales_quota) over (order by quota_date) as change_from_previous
from sales_person_quota_history
where business_entity_id = 276
order by quota_date;`,
        explanation: 'The WHERE keeps one salesperson, so the window does not need a PARTITION BY.',
      },
    ],
    docs: [{ label: 'PostgreSQL: lag()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'adventureworks-012',
    dataset: 'adventureworks',
    level: 3,
    topics: ['ranking', 'numbers'],
    title: 'Who beats their quota?',
    prompt:
      'For salespeople with a quota, show business_entity_id, last_name, sales_ytd (rounded to whole units), sales_quota, how many times over quota they are (1 decimal) and their rank by sales_ytd (1 = best). Order by rank.',
    orderMatters: true,
    solutions: [
      {
        approach: 'RANK()',
        postgres: `select sp.business_entity_id, p.last_name,
       round(sp.sales_ytd) as sales_ytd,
       sp.sales_quota,
       round(sp.sales_ytd / sp.sales_quota, 1) as times_quota,
       rank() over (order by sp.sales_ytd desc) as sales_rank
from sales_person sp
join person p on p.business_entity_id = sp.business_entity_id
where sp.sales_quota is not null
order by sales_rank;`,
        mysql: `select sp.business_entity_id, p.last_name,
       round(sp.sales_ytd) as sales_ytd,
       sp.sales_quota,
       round(sp.sales_ytd / sp.sales_quota, 1) as times_quota,
       rank() over (order by sp.sales_ytd desc) as sales_rank
from sales_person sp
join person p on p.business_entity_id = sp.business_entity_id
where sp.sales_quota is not null
order by sales_rank;`,
        explanation:
          'RANK gives tied values the same number and skips the next one. Salespeople without a quota (managers) are filtered out first, which also avoids dividing by NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: rank()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'adventureworks-013',
    dataset: 'adventureworks',
    level: 3,
    topics: ['dates-advanced', 'null'],
    title: 'Price on a given day',
    prompt:
      'What was the list price of products 707 to 712 on 2023-06-01? Use product_list_price_history (an empty end_date means the price is still valid). Show product_id and list_price, ordered by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'As-of with COALESCE',
        postgres: `select product_id, list_price
from product_list_price_history
where product_id between 707 and 712
  and start_date <= '2023-06-01'
  and coalesce(end_date, '9999-12-31') > '2023-06-01'
order by product_id;`,
        mysql: `select product_id, list_price
from product_list_price_history
where product_id between 707 and 712
  and start_date <= '2023-06-01'
  and coalesce(end_date, '9999-12-31') > '2023-06-01'
order by product_id;`,
        explanation:
          'Here an open period has end_date NULL (the Employees dataset uses 9999-01-01 instead). COALESCE turns NULL into a far-future date so one comparison covers both cases.',
      },
      {
        approach: 'OR IS NULL',
        postgres: `select product_id, list_price
from product_list_price_history
where product_id between 707 and 712
  and start_date <= '2023-06-01'
  and (end_date > '2023-06-01' or end_date is null)
order by product_id;`,
        mysql: `select product_id, list_price
from product_list_price_history
where product_id between 707 and 712
  and start_date <= '2023-06-01'
  and (end_date > '2023-06-01' or end_date is null)
order by product_id;`,
        explanation: 'Spell out the two cases. Without "or end_date is null", current prices would vanish, because NULL > date is not true.',
      },
    ],
    comparison:
      'Same prices. The OR form can use an index on end_date more easily; the COALESCE form is shorter. Both avoid the classic bug of forgetting that NULL never compares as true.',
    docs: [{ label: 'PostgreSQL: COALESCE', url: PG + 'functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL' }],
  },
  {
    id: 'adventureworks-014',
    dataset: 'adventureworks',
    level: 3,
    topics: ['pivot'],
    title: 'Revenue by region and year',
    prompt:
      'Show revenue (sum of total_due, rounded to whole units) per territory_group with one column per year: y2022, y2023, y2024, y2025. Order by territory_group.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional sums',
        postgres: `select t.territory_group,
       round(sum(case when extract(year from h.order_date) = 2022 then h.total_due else 0 end)) as y2022,
       round(sum(case when extract(year from h.order_date) = 2023 then h.total_due else 0 end)) as y2023,
       round(sum(case when extract(year from h.order_date) = 2024 then h.total_due else 0 end)) as y2024,
       round(sum(case when extract(year from h.order_date) = 2025 then h.total_due else 0 end)) as y2025
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group
order by t.territory_group;`,
        mysql: `select t.territory_group,
       round(sum(case when year(h.order_date) = 2022 then h.total_due else 0 end)) as y2022,
       round(sum(case when year(h.order_date) = 2023 then h.total_due else 0 end)) as y2023,
       round(sum(case when year(h.order_date) = 2024 then h.total_due else 0 end)) as y2024,
       round(sum(case when year(h.order_date) = 2025 then h.total_due else 0 end)) as y2025
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group
order by t.territory_group;`,
        mysqlNote: 'YEAR() instead of extract.',
        explanation: 'Rows become columns: each column sums only its own year.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'adventureworks-015',
    dataset: 'adventureworks',
    level: 3,
    topics: ['subtotals'],
    title: 'Sales by category and subcategory',
    prompt:
      'Show sales (sum of line_total, 2 decimals) per category and subcategory, with a subtotal per category ("All subcategories") and a grand total ("All categories"). Order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'ROLLUP + GROUPING()',
        postgres: `select case when grouping(c.name) = 1 then 'All categories' else c.name end as category,
       case when grouping(s.name) = 1 then 'All subcategories' else s.name end as subcategory,
       round(sum(d.line_total), 2) as sales
from sales_order_detail d
join product p             on p.product_id = d.product_id
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
group by rollup (c.name, s.name);`,
        mysql: `select case when grouping(c.name) = 1 then 'All categories' else c.name end as category,
       case when grouping(s.name) = 1 then 'All subcategories' else s.name end as subcategory,
       round(sum(d.line_total), 2) as sales
from sales_order_detail d
join product p             on p.product_id = d.product_id
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
group by c.name, s.name with rollup;`,
        mysqlNote: 'GROUP BY … WITH ROLLUP.',
        explanation: 'The two-level product hierarchy maps directly onto ROLLUP\'s levels.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'adventureworks-016',
    dataset: 'adventureworks',
    level: 3,
    topics: ['cte', 'dates-advanced'],
    title: 'Do customers come back?',
    prompt:
      'Group customers by the year of their first order. For each year: customers who started then, how many of them ordered again later, and that share in percent (1 decimal). Order by year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'First order + EXISTS',
        postgres: `with first_orders as (
  select customer_id, min(order_date) as first_date
  from sales_order_header
  group by customer_id
)
select extract(year from f.first_date)::int as first_year,
       count(*) as customers,
       count(*) filter (where exists (
         select 1 from sales_order_header h
         where h.customer_id = f.customer_id and h.order_date > f.first_date
       )) as returned,
       round(100.0 * count(*) filter (where exists (
         select 1 from sales_order_header h
         where h.customer_id = f.customer_id and h.order_date > f.first_date
       )) / count(*), 1) as returned_pct
from first_orders f
group by 1
order by 1;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; see solution B.',
        explanation: 'First find each customer\'s first order date, then ask whether a later order exists.',
      },
      {
        approach: 'Count orders per customer',
        postgres: `with per_customer as (
  select customer_id, min(order_date) as first_date, count(distinct order_date) as order_days
  from sales_order_header
  group by customer_id
)
select extract(year from first_date)::int as first_year,
       count(*) as customers,
       sum(case when order_days > 1 then 1 else 0 end) as returned,
       round(100.0 * sum(case when order_days > 1 then 1 else 0 end) / count(*), 1) as returned_pct
from per_customer
group by 1
order by 1;`,
        mysql: `with per_customer as (
  select customer_id, min(order_date) as first_date, count(distinct order_date) as order_days
  from sales_order_header
  group by customer_id
)
select year(first_date) as first_year,
       count(*) as customers,
       sum(case when order_days > 1 then 1 else 0 end) as returned,
       round(100.0 * sum(case when order_days > 1 then 1 else 0 end) / count(*), 1) as returned_pct
from per_customer
group by 1
order by 1;`,
        mysqlNote: 'YEAR() instead of extract.',
        explanation:
          'A customer came back if they ordered on more than one day. Counting distinct days, not orders, avoids counting two orders on the first day as a return.',
      },
    ],
    comparison:
      'Same table. B reads the orders once and is much cheaper than running an EXISTS per customer. A states the definition literally. Remember this dataset keeps only every 4th order, so return rates are lower than in the full database.',
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'adventureworks-017',
    dataset: 'adventureworks',
    level: 3,
    topics: ['lateral', 'ranking'],
    title: 'Biggest orders of the biggest stores',
    prompt:
      'For the 5 store customers (customers with a store_id) with the highest total revenue, show their 2 largest orders: customer_id, sales_order_id and total_due. Order by customer revenue (highest first), then total_due descending, then sales_order_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL',
        postgres: `with top_customers as (
  select h.customer_id, sum(h.total_due) as revenue
  from sales_order_header h
  join customer c on c.customer_id = h.customer_id
  where c.store_id is not null
  group by h.customer_id
  order by revenue desc, h.customer_id
  limit 5
)
select t.customer_id, o.sales_order_id, o.total_due
from top_customers t
cross join lateral (
  select sales_order_id, total_due
  from sales_order_header h
  where h.customer_id = t.customer_id
  order by total_due desc, sales_order_id
  limit 2
) o
order by t.revenue desc, t.customer_id, o.total_due desc, o.sales_order_id;`,
        mysql: `with top_customers as (
  select h.customer_id, sum(h.total_due) as revenue
  from sales_order_header h
  join customer c on c.customer_id = h.customer_id
  where c.store_id is not null
  group by h.customer_id
  order by revenue desc, h.customer_id
  limit 5
)
select t.customer_id, o.sales_order_id, o.total_due
from top_customers t
cross join lateral (
  select sales_order_id, total_due
  from sales_order_header h
  where h.customer_id = t.customer_id
  order by total_due desc, sales_order_id
  limit 2
) o
order by t.revenue desc, t.customer_id, o.total_due desc, o.sales_order_id;`,
        mysqlNote: 'LATERAL requires MySQL 8.0.14+.',
        explanation: 'First pick the top customers, then run a small "top 2 orders" query for each of them.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'adventureworks-018',
    dataset: 'adventureworks',
    level: 3,
    topics: ['aggregates', 'dates-advanced', 'joins'],
    title: 'Shipping speed by method',
    prompt: 'For each ship method: name, number of orders and average days from order to shipment (1 decimal). Order by average days.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date difference',
        postgres: `select m.name,
       count(*) as orders,
       round(avg(h.ship_date::date - h.order_date::date), 1) as avg_days
from sales_order_header h
join ship_method m on m.ship_method_id = h.ship_method_id
group by m.ship_method_id, m.name
order by avg_days, m.name;`,
        mysql: `select m.name,
       count(*) as orders,
       round(avg(datediff(h.ship_date, h.order_date)), 1) as avg_days
from sales_order_header h
join ship_method m on m.ship_method_id = h.ship_method_id
group by m.ship_method_id, m.name
order by avg_days, m.name;`,
        mysqlNote: 'DATEDIFF(later, earlier).',
        explanation: 'Only two of the five methods are actually used in sales orders; the others appear in purchasing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'adventureworks-019',
    dataset: 'adventureworks',
    level: 3,
    topics: ['group-by', 'joins'],
    title: 'Stock below the safety level',
    prompt:
      'Which products have less stock in total (all locations together) than their safety_stock_level? Show product_id, name, total quantity and safety_stock_level, smallest stock first, then by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY + HAVING',
        postgres: `select p.product_id, p.name, sum(i.quantity) as in_stock, p.safety_stock_level
from product p
join product_inventory i on i.product_id = p.product_id
group by p.product_id, p.name, p.safety_stock_level
having sum(i.quantity) < p.safety_stock_level
order by in_stock, p.product_id;`,
        mysql: `select p.product_id, p.name, sum(i.quantity) as in_stock, p.safety_stock_level
from product p
join product_inventory i on i.product_id = p.product_id
group by p.product_id, p.name, p.safety_stock_level
having sum(i.quantity) < p.safety_stock_level
order by in_stock, p.product_id;`,
        explanation: 'Sum stock across locations per product, then compare with a column of the same product in HAVING.',
      },
    ],
    docs: [{ label: 'PostgreSQL: HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'adventureworks-020',
    dataset: 'adventureworks',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'Find "aluminum" in the catalogue',
    prompt:
      'Product descriptions exist in six languages. Count the English descriptions (culture_id "en") that mention the word "aluminum".',
    hint: 'product_description ↔ product_model_product_description_culture (culture_id).',
    orderMatters: false,
    solutions: [
      {
        approach: 'Full-text search',
        postgres: `select count(*) as descriptions
from product_description d
join product_model_product_description_culture m
  on m.product_description_id = d.product_description_id
where m.culture_id = 'en'
  and to_tsvector('english', d.description) @@ to_tsquery('english', 'aluminum');`,
        mysql: null,
        mysqlNote:
          'MySQL full-text search needs a FULLTEXT index first (ALTER TABLE product_description ADD FULLTEXT (description)), then WHERE MATCH(description) AGAINST (\'aluminum\'). It has no stemming and ignores words shorter than 3 characters by default. Without the index, use solution B.',
        explanation:
          'to_tsvector splits the text into normalised words (lexemes), to_tsquery builds the search, @@ matches them. Stemming means "aluminum" would also match a plural form, and matching is on whole words, not substrings.',
      },
      {
        approach: 'LIKE',
        postgres: `select count(*) as descriptions
from product_description d
join product_model_product_description_culture m
  on m.product_description_id = d.product_description_id
where m.culture_id = 'en'
  and d.description ilike '%aluminum%';`,
        mysql: `select count(*) as descriptions
from product_description d
join product_model_product_description_culture m
  on m.product_description_id = d.product_description_id
where m.culture_id = 'en'
  and d.description like '%aluminum%';`,
        mysqlNote: 'LIKE is case-insensitive under the default collation.',
        explanation: 'A substring search. Simple, but it scans every row, and it would also match longer words containing the text.',
      },
    ],
    comparison:
      'Same count here. Full-text search understands words and can be indexed (a GIN index on to_tsvector(...) in PostgreSQL, a FULLTEXT index in MySQL), so it stays fast on large text and can rank results. LIKE \'%…%\' is fine for small tables.',
    docs: [
      { label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' },
      { label: 'MySQL: Full-text search functions', url: MY + 'fulltext-search.html' },
    ],
  },

  // ---------- Level 4–5 ----------
  {
    id: 'adventureworks-021',
    dataset: 'adventureworks',
    level: 4,
    topics: ['views', 'joins', 'null'],
    title: 'A product catalogue view',
    prompt:
      'Create a view product_catalog(product_id, product, subcategory, category, list_price) that includes every product, also those without a subcategory.',
    orderMatters: true,
    checkSql: `select * from product_catalog where product_id in (1, 680, 771, 999) order by product_id`,
    solutions: [
      {
        approach: 'View with LEFT JOINs',
        postgres: `create view product_catalog as
select p.product_id, p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id;`,
        mysql: `create view product_catalog as
select p.product_id, p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id;`,
        explanation: 'LEFT JOINs keep parts without a subcategory, with NULL category columns. The check looks at one such product.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'adventureworks-022',
    dataset: 'adventureworks',
    level: 5,
    topics: ['functions', 'recursive'],
    title: 'A recursive function: team size',
    prompt: 'Write a function team_size(p_manager_id) that returns how many people report to that employee, directly or indirectly.',
    orderMatters: false,
    checkSql: `select team_size(1) as ceo, team_size(273) as sales_vp, team_size(2) as engineering_vp, team_size(4) as nobody`,
    solutions: [
      {
        approach: 'Recursive CTE inside a function',
        postgres: `create function team_size(p_manager_id integer)
returns bigint
language sql
stable
as $$
  with recursive team as (
    select business_entity_id from employee where manager_id = p_manager_id
    union all
    select e.business_entity_id
    from employee e
    join team t on e.manager_id = t.business_entity_id
  )
  select count(*) from team;
$$;`,
        mysql: `create function team_size(p_manager_id integer)
returns integer
reads sql data
begin
  return (
    with recursive team as (
      select business_entity_id from employee where manager_id = p_manager_id
      union all
      select e.business_entity_id
      from employee e
      join team t on e.manager_id = t.business_entity_id
    )
    select count(*) from team
  );
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation: 'Wrap the recursive query from the earlier exercises in a function, and the org chart becomes one call away.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SQL functions', url: PG + 'xfunc-sql.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'adventureworks-023',
    dataset: 'adventureworks',
    level: 4,
    topics: ['upsert'],
    title: 'Receive stock',
    prompt:
      'A delivery brings 50 units of product 1 to location 1 and 50 units to location 2. Add them to the stock: increase the quantity where the product is already stored there, otherwise create the row (shelf "A", bin 1).',
    orderMatters: true,
    checkSql: `select location_id, quantity from product_inventory where product_id = 1 order by location_id`,
    solutions: [
      {
        approach: 'Upsert that adds',
        postgres: `insert into product_inventory (product_id, location_id, shelf, bin, quantity)
values (1, 1, 'A', 1, 50), (1, 2, 'A', 1, 50)
on conflict (product_id, location_id) do update
set quantity = product_inventory.quantity + excluded.quantity;`,
        mysql: `insert into product_inventory (product_id, location_id, shelf, bin, quantity)
values (1, 1, 'A', 1, 50), (1, 2, 'A', 1, 50) as delivery
on duplicate key update quantity = product_inventory.quantity + delivery.quantity;`,
        mysqlNote: 'ON DUPLICATE KEY UPDATE with a row alias (MySQL 8.0.19+).',
        explanation:
          'The update side can use both the existing row (product_inventory.quantity) and the row you tried to insert (excluded.quantity), so it adds instead of overwriting.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'adventureworks-024',
    dataset: 'adventureworks',
    level: 4,
    topics: ['normalization', 'joins'],
    title: 'Five schemas, one database',
    prompt:
      'In the original AdventureWorks, product data sits in the Production schema and sales data in Sales. Here they share one database. Show each product category with how many of its products were sold at least once.',
    orderMatters: true,
    solutions: [
      {
        approach: 'EXISTS across former schemas',
        postgres: `select c.name as category, count(*) as products_sold
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
where exists (select 1 from sales_order_detail d where d.product_id = p.product_id)
group by c.product_category_id, c.name
order by c.product_category_id;`,
        mysql: `select c.name as category, count(*) as products_sold
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
where exists (select 1 from sales_order_detail d where d.product_id = p.product_id)
group by c.product_category_id, c.name
order by c.product_category_id;`,
        mysqlNote:
          'With real schemas you would write production.product and sales.sales_order_detail. In MySQL, a schema is simply another database, so the same names point to two databases on one server.',
        explanation:
          'Schemas are namespaces inside one PostgreSQL database: they group tables and permissions but can be joined freely. Flattening them here only changes the names you type.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Schemas', url: PG + 'ddl-schemas.html' },
      { label: 'MySQL: CREATE DATABASE (= schema)', url: MY + 'create-database.html' },
    ],
  },
  {
    id: 'adventureworks-025',
    dataset: 'adventureworks',
    level: 5,
    topics: ['triggers'],
    title: 'Never sell below cost',
    prompt:
      'Create a trigger on product that rejects any update setting list_price below standard_cost (when list_price is above 0) with an error, so the update fails. Then a valid price change must still work.',
    orderMatters: false,
    checkSql: `update product set list_price = 4000 where product_id = 749;
select list_price from product where product_id = 749`,
    solutions: [
      {
        approach: 'BEFORE UPDATE trigger that raises',
        postgres: `create function check_list_price() returns trigger
language plpgsql as $$
begin
  if new.list_price > 0 and new.list_price < new.standard_cost then
    raise exception 'List price % is below cost % for product %', new.list_price, new.standard_cost, new.product_id;
  end if;
  return new;
end;
$$;

create trigger product_price_guard
before update of list_price on product
for each row execute function check_list_price();`,
        mysql: `create trigger product_price_guard
before update on product
for each row
begin
  if new.list_price > 0 and new.list_price < new.standard_cost then
    signal sqlstate '45000' set message_text = 'List price is below cost';
  end if;
end;`,
        mysqlNote: 'SIGNAL raises the error in MySQL. ' + DELIMITER_NOTE,
        explanation:
          'A BEFORE trigger sees the new row before it is written and can refuse it by raising an error, which aborts the whole statement. The check runs a valid change; try "update product set list_price = 1 where product_id = 749" yourself to see the error.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'adventureworks-030',
    dataset: 'adventureworks',
    level: 1,
    topics: ['conditions'],
    title: 'Product lines in words',
    prompt:
      'product_line is a code: R road, M mountain, T touring, S standard; it may be empty. Count the products per line with the line written out ("road", …, "none").',
    orderMatters: false,
    solutions: [
      {
        approach: 'Simple CASE',
        postgres: `select case product_line
         when 'R' then 'road' when 'M' then 'mountain'
         when 'T' then 'touring' when 'S' then 'standard'
         else 'none' end as line,
       count(*) as products
from product
group by line;`,
        mysql: `select case product_line
         when 'R' then 'road' when 'M' then 'mountain'
         when 'T' then 'touring' when 'S' then 'standard'
         else 'none' end as line,
       count(*) as products
from product
group by line;`,
        explanation: 'A NULL product_line matches no WHEN (NULL = \'R\' is not true) and falls to ELSE.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'adventureworks-031',
    dataset: 'adventureworks',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Year-to-date sales',
    prompt:
      'For every month, show the month (YYYY-MM), its sales (sum of sub_total, rounded to 2 decimals) and the year-to-date total that restarts every January.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Window partitioned by year',
        postgres: `with monthly as (
  select date_trunc('month', order_date) as month_start, sum(sub_total) as sales
  from sales_order_header
  group by date_trunc('month', order_date)
)
select to_char(month_start, 'YYYY-MM') as month,
       round(sales, 2) as sales,
       round(sum(sales) over (partition by extract(year from month_start) order by month_start), 2) as year_to_date
from monthly
order by month_start;`,
        mysql: `with monthly as (
  select date_format(order_date, '%Y-%m-01') as month_start, sum(sub_total) as sales
  from sales_order_header
  group by date_format(order_date, '%Y-%m-01')
)
select left(month_start, 7) as month,
       round(sales, 2) as sales,
       round(sum(sales) over (partition by left(month_start, 4) order by month_start), 2) as year_to_date
from monthly
order by month_start;`,
        mysqlNote: 'No date_trunc in MySQL: DATE_FORMAT(…, \'%Y-%m-01\') gives the first day of the month as text, which sorts correctly.',
        explanation:
          'PARTITION BY year restarts the running sum each January; within a year the default frame adds every earlier month. The jump in mid-2024 is when online orders start flowing in large numbers.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: DATE_FORMAT', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },
  {
    id: 'adventureworks-032',
    dataset: 'adventureworks',
    level: 3,
    topics: ['pivot', 'joins'],
    title: 'Sales by territory group and year',
    prompt: 'Show the order count per territory group (North America, Europe, Pacific) as rows and the years 2023, 2024 and 2025 as columns.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts',
        postgres: `select t.territory_group,
       count(*) filter (where extract(year from h.order_date) = 2023) as y2023,
       count(*) filter (where extract(year from h.order_date) = 2024) as y2024,
       count(*) filter (where extract(year from h.order_date) = 2025) as y2025
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group
order by t.territory_group;`,
        mysql: `select t.territory_group,
       sum(year(h.order_date) = 2023) as y2023,
       sum(year(h.order_date) = 2024) as y2024,
       sum(year(h.order_date) = 2025) as y2025
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group
order by t.territory_group;`,
        explanation: 'One conditional count per year column. Note the sample keeps every 4th order, so these are a quarter of the real counts.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'adventureworks-033',
    dataset: 'adventureworks',
    level: 4,
    topics: ['json', 'group-by'],
    title: 'Catalog sizes as JSON',
    prompt:
      'For each product category, return one JSON object mapping each of its subcategory names to the number of products in it, like {"Gloves": 6, "Caps": 1, …}.',
    orderMatters: true,
    solutions: [
      {
        approach: 'jsonb_object_agg / JSON_OBJECTAGG',
        postgres: `select c.name as category,
       jsonb_object_agg(s.name, n) as products_per_subcategory
from (
  select product_subcategory_id, count(*) as n
  from product
  where product_subcategory_id is not null
  group by product_subcategory_id
) p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
group by c.name
order by c.name;`,
        mysql: `select c.name as category,
       json_objectagg(s.name, n) as products_per_subcategory
from (
  select product_subcategory_id, count(*) as n
  from product
  where product_subcategory_id is not null
  group by product_subcategory_id
) p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
join product_category c    on c.product_category_id = s.product_category_id
group by c.name
order by c.name;`,
        explanation:
          'The object aggregate takes a key and a value per row and builds one object per group. Count first, then aggregate: an aggregate cannot be nested directly inside another.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: jsonb_object_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_OBJECTAGG', url: MY + 'aggregate-functions.html#function_json-objectagg' },
    ],
  },
  {
    id: 'adventureworks-034',
    dataset: 'adventureworks',
    level: 4,
    topics: ['views', 'joins'],
    title: 'A catalog view',
    prompt:
      'Create a view product_catalog (product_id, product, subcategory, category, list_price) that includes products without a subcategory too.',
    orderMatters: true,
    checkSql: `select coalesce(category, '(none)') as category, count(*) as products
from product_catalog
group by coalesce(category, '(none)')
order by category`,
    solutions: [
      {
        approach: 'View over LEFT JOINs',
        postgres: `create view product_catalog as
select p.product_id, p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id;`,
        mysql: `create view product_catalog as
select p.product_id, p.name as product, s.name as subcategory, c.name as category, p.list_price
from product p
left join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
left join product_category c    on c.product_category_id = s.product_category_id;`,
        explanation:
          'With inner joins the 209 products without a subcategory (parts and components) would vanish from the view, and every report built on it would undercount without any error.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: CREATE VIEW', url: MY + 'create-view.html' },
    ],
  },
  {
    id: 'adventureworks-035',
    dataset: 'adventureworks',
    level: 5,
    topics: ['partial-covering-indexes', 'indexes'],
    title: 'Order history from the index',
    prompt:
      'The customer portal shows a customer\'s orders: order_date and total_due, newest first. Create an index on sales_order_header that answers this without reading the table.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'sales_order_header' and indexdef like '%(customer_id%' and indexdef like '%total_due%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'sales_order_header' and column_name = 'total_due'`,
    solutions: [
      {
        approach: 'Key + INCLUDE',
        postgres: `create index soh_customer_history_idx on sales_order_header (customer_id, order_date desc) include (total_due);`,
        mysql: null,
        mysqlNote: 'No INCLUDE in MySQL; add total_due to the key (solution B).',
        explanation: 'customer_id finds the customer, order_date gives the order, and total_due rides along in the leaf pages: an index-only scan once the table is vacuumed.',
      },
      {
        approach: 'Three-column key',
        postgres: `create index soh_customer_history_idx on sales_order_header (customer_id, order_date desc, total_due);`,
        mysql: `create index soh_customer_history_idx on sales_order_header (customer_id, order_date desc, total_due);`,
        explanation: 'The portable way to cover the query: every needed column is part of the key.',
      },
    ],
    comparison: 'Both cover the query. INCLUDE keeps total_due out of the sort order and the inner pages; the extra key column works everywhere.',
    docs: [
      { label: 'PostgreSQL: Index-only scans', url: PG + 'indexes-index-only-scans.html' },
      { label: 'MySQL: Optimizing with covering indexes', url: MY + 'explain-output.html#explain-extra-information' },
    ],
  },
  {
    id: 'adventureworks-036',
    dataset: 'adventureworks',
    level: 1,
    topics: ['numbers'],
    title: 'The best margins',
    prompt:
      'For products with a list price, the margin is (list_price − standard_cost) / list_price. Show the 10 products with the highest margin: product_id, name and the margin in percent with 1 decimal.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Arithmetic and ROUND',
        postgres: `select product_id, name,
       round(100 * (list_price - standard_cost) / list_price, 1) as margin_pct
from product
where list_price > 0
order by margin_pct desc, product_id
limit 10;`,
        mysql: `select product_id, name,
       round(100 * (list_price - standard_cost) / list_price, 1) as margin_pct
from product
where list_price > 0
order by margin_pct desc, product_id
limit 10;`,
        explanation: 'The WHERE keeps out components with list price 0, which would divide by zero. Both columns are numeric, so there is no integer division to worry about.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Mathematical functions', url: PG + 'functions-math.html' }],
  },
  {
    id: 'adventureworks-037',
    dataset: 'adventureworks',
    level: 1,
    topics: ['dates-basics'],
    title: 'Years of service',
    prompt: 'As of 2025-06-30, show the 10 longest-serving employees: business_entity_id, job_title, hire_date and full years of service. Ties by id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'age() / TIMESTAMPDIFF',
        postgres: `select business_entity_id, job_title, hire_date,
       extract(year from age(date '2025-06-30', hire_date))::int as years
from employee
order by hire_date, business_entity_id
limit 10;`,
        mysql: `select business_entity_id, job_title, hire_date,
       timestampdiff(year, hire_date, '2025-06-30') as years
from employee
order by hire_date, business_entity_id
limit 10;`,
        explanation: 'age() returns years, months and days; extract(year …) keeps the whole years, like TIMESTAMPDIFF(YEAR, …). The earliest hire is first.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: age', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY + 'date-and-time-functions.html#function_timestampdiff' },
    ],
  },
  {
    id: 'adventureworks-038',
    dataset: 'adventureworks',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'Subcategories in one line',
    prompt: 'For each product category, list its subcategories alphabetically in one text, separated by ", ".',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg / GROUP_CONCAT',
        postgres: `select c.name as category,
       string_agg(s.name, ', ' order by s.name) as subcategories
from product_category c
join product_subcategory s on s.product_category_id = c.product_category_id
group by c.name
order by c.name;`,
        mysql: `select c.name as category,
       group_concat(s.name order by s.name separator ', ') as subcategories
from product_category c
join product_subcategory s on s.product_category_id = c.product_category_id
group by c.name
order by c.name;`,
        mysqlNote: 'GROUP_CONCAT output is cut at group_concat_max_len (1,024 bytes by default); raise it for long lists.',
        explanation: 'One row per category, with all its subcategory names glued together in the order given inside the aggregate.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'adventureworks-039',
    dataset: 'adventureworks',
    level: 2,
    topics: ['self-cross-join', 'joins'],
    title: 'Who reports to whom',
    prompt: 'For the employees at organization level 2, show their business_entity_id, job_title and their manager\'s job_title.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join employee to itself',
        postgres: `select e.business_entity_id, e.job_title, m.job_title as manager_title
from employee e
join employee m on m.business_entity_id = e.manager_id
where e.organization_level = 2
order by e.business_entity_id;`,
        mysql: `select e.business_entity_id, e.job_title, m.job_title as manager_title
from employee e
join employee m on m.business_entity_id = e.manager_id
where e.organization_level = 2
order by e.business_entity_id;`,
        explanation: 'manager_id points to another row of the same table. Two aliases make it one table in two roles: the employee (e) and the manager (m). Level 2 employees report to the six level-1 executives; the CEO at the top has no level (NULL) and no manager.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'adventureworks-040',
    dataset: 'adventureworks',
    level: 2,
    topics: ['full-join'],
    title: 'Approved vendors and actual orders',
    prompt:
      'product_vendor lists the vendors approved for some product; purchase_order_header the vendors actually ordered from in 2024. Count vendors that are approved and ordered from, approved only, and ordered from only.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two vendor lists',
        postgres: `with approved as (select distinct business_entity_id as vendor_id from product_vendor),
     ordered  as (select distinct vendor_id from purchase_order_header
                  where order_date >= '2024-01-01' and order_date < '2025-01-01')
select count(*) filter (where a.vendor_id is not null and o.vendor_id is not null) as approved_and_ordered,
       count(*) filter (where o.vendor_id is null) as approved_only,
       count(*) filter (where a.vendor_id is null) as ordered_only
from approved a
full join ordered o on o.vendor_id = a.vendor_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: '"ordered_only" would flag purchases from vendors never approved for any product: worth an audit if it is not 0.',
      },
      {
        approach: 'UNION of vendors, then two EXISTS',
        postgres: `select sum(case when a and o then 1 else 0 end) as approved_and_ordered,
       sum(case when a and not o then 1 else 0 end) as approved_only,
       sum(case when o and not a then 1 else 0 end) as ordered_only
from (
  select v.vendor_id,
         exists (select 1 from product_vendor pv where pv.business_entity_id = v.vendor_id) as a,
         exists (select 1 from purchase_order_header h where h.vendor_id = v.vendor_id
                   and h.order_date >= '2024-01-01' and h.order_date < '2025-01-01') as o
  from (select business_entity_id as vendor_id from product_vendor
        union select vendor_id from purchase_order_header) v
) flags;`,
        mysql: `select sum(a and o) as approved_and_ordered,
       sum(a and not o) as approved_only,
       sum(o and not a) as ordered_only
from (
  select v.vendor_id,
         exists (select 1 from product_vendor pv where pv.business_entity_id = v.vendor_id) as a,
         exists (select 1 from purchase_order_header h where h.vendor_id = v.vendor_id
                   and h.order_date >= '2024-01-01' and h.order_date < '2025-01-01') as o
  from (select business_entity_id as vendor_id from product_vendor
        union select vendor_id from purchase_order_header) v
) flags
where a or o;`,
        explanation: 'Build the list of all vendors from both sources, then flag each one. The outer WHERE (in MySQL) and the CASE sums ignore vendors in neither 2024 list.',
      },
    ],
    comparison: 'Same counts. Note the business key differs by table (business_entity_id vs vendor_id): the same vendor, two column names.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: EXISTS', url: MY + 'exists-and-not-exists-subqueries.html' },
    ],
  },
  {
    id: 'adventureworks-041',
    dataset: 'adventureworks',
    level: 4,
    topics: ['materialized-views', 'dates-advanced'],
    title: 'Monthly sales per territory group, stored',
    prompt: 'Store monthly sales (sum of sub_total, rounded to 2 decimals) per territory group and month (first day of the month), for a sales dashboard.',
    orderMatters: true,
    checkSql: `select territory_group, month_start, sales from territory_monthly_sales
where month_start >= '2025-01-01' and month_start < '2025-04-01'
order by territory_group, month_start`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view territory_monthly_sales as
select t.territory_group,
       date_trunc('month', h.order_date)::date as month_start,
       round(sum(h.sub_total), 2) as sales
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group, date_trunc('month', h.order_date)::date;`,
        mysql: `create table territory_monthly_sales as
select t.territory_group,
       cast(date_format(h.order_date, '%Y-%m-01') as date) as month_start,
       round(sum(h.sub_total), 2) as sales
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
group by t.territory_group, cast(date_format(h.order_date, '%Y-%m-01') as date);`,
        mysqlNote: 'No materialized views and no date_trunc in MySQL: a table, and the month start built with DATE_FORMAT and cast back to a DATE.',
        explanation: 'The month is stored as a real date (its first day) rather than text, so the dashboard can filter it by range and sort it naturally.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' },
      { label: 'MySQL: CREATE TABLE … SELECT', url: MY + 'create-table-select.html' },
    ],
  },
  {
    id: 'adventureworks-042',
    dataset: 'adventureworks',
    level: 4,
    topics: ['merge'],
    title: 'Sync an inventory count',
    prompt:
      'A stock-take at location 1 produced counts(product_id, quantity): product 1 → 400, product 2 → 0, product 999 does not exist in inventory yet → skip it. Update inventory at location 1 with the counts, and delete rows whose count is 0.',
    orderMatters: true,
    checkSql: `select product_id, quantity from product_inventory where location_id = 1 and product_id in (1, 2) order by product_id`,
    solutions: [
      {
        approach: 'MERGE with two WHEN MATCHED branches',
        postgres: `create table counts (product_id integer primary key, quantity smallint not null);
insert into counts values (1, 400), (2, 0), (999, 5);

merge into product_inventory i
using counts c on c.product_id = i.product_id and i.location_id = 1
when matched and c.quantity = 0 then delete
when matched then update set quantity = c.quantity;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation:
          'Branches are tried in order: a zero count deletes the row, any other match updates it. Without a WHEN NOT MATCHED clause, product 999 is ignored.',
      },
      {
        approach: 'DELETE and UPDATE with joins',
        postgres: `create table counts (product_id integer primary key, quantity smallint not null);
insert into counts values (1, 400), (2, 0), (999, 5);

delete from product_inventory i using counts c
where c.product_id = i.product_id and i.location_id = 1 and c.quantity = 0;

update product_inventory i set quantity = c.quantity
from counts c
where c.product_id = i.product_id and i.location_id = 1;`,
        mysql: `create table counts (product_id int primary key, quantity smallint not null);
insert into counts values (1, 400), (2, 0), (999, 5);

delete i from product_inventory i join counts c on c.product_id = i.product_id
where i.location_id = 1 and c.quantity = 0;

update product_inventory i join counts c on c.product_id = i.product_id
set i.quantity = c.quantity
where i.location_id = 1;`,
        explanation: 'Delete the zero counts first, then update what is left; together they do what the MERGE does.',
      },
    ],
    comparison: 'Same result. MERGE expresses "delete or update depending on the count" in one statement; the two-statement version needs a transaction around it.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: DELETE (multiple-table syntax)', url: MY + 'delete.html' },
    ],
  },
  {
    id: 'adventureworks-043',
    dataset: 'adventureworks',
    level: 5,
    topics: ['partitioning'],
    title: 'Orders split by year',
    prompt:
      'Create orders_by_year (sales_order_id, order_date, customer_id, sub_total) range-partitioned by order_date into one partition per year 2022–2025, and copy those columns from sales_order_header.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'orders_by_year'::regclass) as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where order_date >= '2024-01-01' and order_date < '2025-01-01') as y2024`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'orders_by_year') as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where order_date >= '2024-01-01' and order_date < '2025-01-01') as y2024`,
    solutions: [
      {
        approach: 'Yearly range partitions',
        postgres: `create table orders_by_year (
  sales_order_id integer        not null,
  order_date     timestamp      not null,
  customer_id    integer        not null,
  sub_total      numeric(19, 4) not null,
  primary key (sales_order_id, order_date)
) partition by range (order_date);

create table orders_2022 partition of orders_by_year for values from ('2022-01-01') to ('2023-01-01');
create table orders_2023 partition of orders_by_year for values from ('2023-01-01') to ('2024-01-01');
create table orders_2024 partition of orders_by_year for values from ('2024-01-01') to ('2025-01-01');
create table orders_2025 partition of orders_by_year for values from ('2025-01-01') to ('2026-01-01');

insert into orders_by_year select sales_order_id, order_date, customer_id, sub_total from sales_order_header;`,
        mysql: `create table orders_by_year (
  sales_order_id int            not null,
  order_date     datetime       not null,
  customer_id    int            not null,
  sub_total      decimal(19, 4) not null,
  primary key (sales_order_id, order_date)
)
partition by range (year(order_date)) (
  partition p2022 values less than (2023),
  partition p2023 values less than (2024),
  partition p2024 values less than (2025),
  partition p2025 values less than (2026)
);

insert into orders_by_year select sales_order_id, order_date, customer_id, sub_total from sales_order_header;`,
        explanation:
          'Yearly partitions keep "this year" small and fast, and an old year can be archived by detaching its partition. A query for 2024 reads one partition (partition pruning, visible in EXPLAIN).',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Partition pruning', url: PG + 'ddl-partitioning.html#DDL-PARTITION-PRUNING' },
      { label: 'MySQL: Partition pruning', url: MY + 'partitioning-pruning.html' },
    ],
  },
  {
    id: 'adventureworks-044',
    dataset: 'adventureworks',
    level: 3,
    topics: ['date-series'],
    title: 'The quiet first weeks',
    prompt: 'Show every day of June 2022 with its number of sales orders, including days with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select d::date as day, count(h.sales_order_id) as orders
from generate_series(date '2022-06-01', date '2022-06-30', interval '1 day') as d
left join sales_order_header h on h.order_date >= d and h.order_date < d + interval '1 day'
group by d
order by d;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'In its first weeks the sample has orders on only some days; the calendar keeps the empty ones with 0.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive days as (
  select date '2022-06-01' as day
  union all
  select (day + 1)::date from days where day < date '2022-06-30'
)
select d.day, count(h.sales_order_id) as orders
from days d
left join sales_order_header h on h.order_date >= d.day and h.order_date < d.day + 1
group by d.day
order by d.day;`,
        mysql: `with recursive days as (
  select date('2022-06-01') as day
  union all
  select day + interval 1 day from days where day < '2022-06-30'
)
select d.day, count(h.sales_order_id) as orders
from days d
left join sales_order_header h on h.order_date >= d.day and h.order_date < d.day + interval 1 day
group by d.day
order by d.day;`,
        explanation: 'The same 30-day calendar, built by recursion.',
      },
    ],
    comparison: 'Same rows. Without a calendar, a chart of this month would silently connect non-adjacent days.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'adventureworks-045',
    dataset: 'adventureworks',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Receive stock',
    prompt:
      'Write a procedure receive_stock(p_product_id, p_location_id, p_qty) that adds p_qty to the inventory row, or creates the row (shelf \'N/A\', bin 0) if the product is not stocked there yet. Then receive 50 of product 1 at location 1 and 20 of product 1 at location 7.',
    orderMatters: true,
    checkSql: `call receive_stock(1, 1, 50);
call receive_stock(1, 7, 20);
select product_id, location_id, quantity from product_inventory where product_id = 1 order by location_id`,
    solutions: [
      {
        approach: 'UPDATE, then INSERT if nothing was updated',
        postgres: `create procedure receive_stock(p_product_id integer, p_location_id integer, p_qty integer)
language plpgsql
as $$
begin
  update product_inventory set quantity = quantity + p_qty
  where product_id = p_product_id and location_id = p_location_id;
  if not found then
    insert into product_inventory (product_id, location_id, shelf, bin, quantity)
    values (p_product_id, p_location_id, 'N/A', 0, p_qty);
  end if;
end;
$$;`,
        mysql: `create procedure receive_stock(p_product_id int, p_location_id smallint, p_qty int)
begin
  update product_inventory set quantity = quantity + p_qty
  where product_id = p_product_id and location_id = p_location_id;
  if row_count() = 0 then
    insert into product_inventory (product_id, location_id, shelf, bin, quantity)
    values (p_product_id, p_location_id, 'N/A', 0, p_qty);
  end if;
end;`,
        mysqlNote: `ROW_COUNT() returns the number of rows the previous statement changed, the counterpart of PL/pgSQL's FOUND. ${DELIMITER_NOTE}`,
        explanation:
          'After an UPDATE, FOUND tells whether any row was affected. A single INSERT … ON CONFLICT DO UPDATE would do the same atomically; this form shows the flow control, and in a busy system needs that atomic version to avoid two sessions inserting at once.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Obtaining the result status (FOUND)', url: PG + 'plpgsql-statements.html#PLPGSQL-STATEMENTS-DIAGNOSTICS' },
      { label: 'MySQL: ROW_COUNT()', url: MY + 'information-functions.html#function_row-count' },
    ],
  },
  {
    id: 'adventureworks-046',
    dataset: 'adventureworks',
    level: 4,
    topics: ['constraints'],
    title: 'Never sell below cost',
    prompt: 'Add a CHECK constraint to product: list_price must not be lower than standard_cost.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'product'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'product' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'CHECK comparing two columns',
        postgres: `alter table product add constraint product_price_not_below_cost check (list_price >= standard_cost);`,
        mysql: `alter table product add constraint product_price_not_below_cost check (list_price >= standard_cost);`,
        explanation: 'The rule holds for all 504 existing products, including the components with both values 0, so the constraint can be added. From now on a price update below cost is rejected.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' }],
  },
  {
    id: 'adventureworks-047',
    dataset: 'adventureworks',
    level: 4,
    topics: ['generated-columns'],
    title: 'Margin as a column',
    prompt: 'Add a stored generated column margin to product: list_price − standard_cost.',
    orderMatters: true,
    checkSql: `select product_id, list_price, standard_cost, margin from product order by margin desc, product_id limit 3`,
    solutions: [
      {
        approach: 'Generated column',
        postgres: `alter table product add column margin numeric(19, 4) generated always as (list_price - standard_cost) stored;`,
        mysql: `alter table product add column margin decimal(19, 4) generated always as (list_price - standard_cost) stored;`,
        explanation: 'Always equal to the two prices it is computed from, and indexable for "highest margin" lists.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'adventureworks-048',
    dataset: 'adventureworks',
    level: 4,
    topics: ['temp-tables'],
    title: 'Best customers, step one',
    prompt: 'Put each customer\'s order count and total spent (sum of total_due, rounded to 2 decimals) into a temporary table customer_value (customer_id, orders, spent).',
    orderMatters: true,
    checkSql: `select customer_id, orders, spent from customer_value order by spent desc, customer_id limit 3`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table customer_value as
select customer_id, count(*) as orders, round(sum(total_due), 2) as spent
from sales_order_header
group by customer_id;`,
        mysql: `create temporary table customer_value as
select customer_id, count(*) as orders, round(sum(total_due), 2) as spent
from sales_order_header
group by customer_id;`,
        explanation: 'Step one of a segmentation: later steps (quartiles, top lists, joins to territories) read this small table instead of the orders.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'adventureworks-049',
    dataset: 'adventureworks',
    level: 4,
    topics: ['arrays'],
    title: 'Colours of each subcategory',
    prompt: 'For each subcategory that has coloured products, show its name, the array of its distinct colours (alphabetical) and how many colours that is.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg and cardinality',
        postgres: `select s.name as subcategory,
       array_agg(distinct p.color order by p.color) as colours,
       cardinality(array_agg(distinct p.color)) as n
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
where p.color is not null
group by s.name
order by n desc, s.name
limit 10;`,
        mysql: `select s.name as subcategory,
       cast(concat('["', group_concat(distinct p.color order by p.color separator '", "'), '"]') as json) as colours,
       count(distinct p.color) as n
from product p
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
where p.color is not null
group by s.name
order by n desc, s.name
limit 10;`,
        mysqlNote: 'No arrays: a JSON array built from GROUP_CONCAT, and count(DISTINCT) for its size.',
        explanation: 'cardinality() is the number of elements of an array; here it equals count(distinct color).',
      },
    ],
    docs: [{ label: 'PostgreSQL: Array functions', url: PG + 'functions-array.html' }],
  },
  {
    id: 'adventureworks-050',
    dataset: 'adventureworks',
    level: 5,
    topics: ['full-text'],
    title: 'Black frames',
    prompt: 'Make product names searchable by word, then find products whose name contains both "frame" and "black": product_id and name.',
    orderMatters: true,
    checkSql: `select product_id, name from product
where to_tsvector('simple', name) @@ to_tsquery('simple', 'frame & black')
order by product_id`,
    checkSqlMysql: `select product_id, name from product
where match(name) against ('+frame +black' in boolean mode)
order by product_id`,
    solutions: [
      {
        approach: 'Full-text index on the name',
        postgres: `create index product_name_fts on product using gin (to_tsvector('simple', name));`,
        mysql: `create fulltext index product_name_ft on product (name);`,
        explanation:
          'Names like "HL Road Frame - Black, 58" are split into words (hl, road, frame, black, 58), punctuation dropped. Both words must be present, in any order and position, which two LIKE conditions could only approximate.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Parsing documents', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-DOCUMENTS' },
      { label: 'MySQL: Full-text search', url: MY + 'fulltext-search.html' },
    ],
  },
  {
    id: 'adventureworks-051',
    dataset: 'adventureworks',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'A ratings table from scratch',
    prompt:
      'Create product_rating: product_id (references product), customer_id (references customer), rating from 1 to 5, rated_at defaulting to the current time; one rating per customer and product. Then add two ratings for product 1.',
    orderMatters: true,
    checkSql: `select product_id, customer_id, rating from product_rating order by customer_id`,
    solutions: [
      {
        approach: 'Composite key, FKs, CHECK and DEFAULT',
        postgres: `create table product_rating (
  product_id  integer   not null references product (product_id),
  customer_id integer   not null references customer (customer_id),
  rating      smallint  not null check (rating between 1 and 5),
  rated_at    timestamp not null default current_timestamp,
  primary key (product_id, customer_id)
);

insert into product_rating (product_id, customer_id, rating) values (1, 11002, 5), (1, 11005, 3);`,
        mysql: `create table product_rating (
  product_id  int      not null,
  customer_id int      not null,
  rating      smallint not null check (rating between 1 and 5),
  rated_at    datetime not null default current_timestamp,
  primary key (product_id, customer_id),
  foreign key (product_id)  references product (product_id),
  foreign key (customer_id) references customer (customer_id)
);

insert into product_rating (product_id, customer_id, rating) values (1, 11002, 5), (1, 11005, 3);`,
        mysqlNote: 'Foreign keys as separate clauses: MySQL 8.4 ignores a REFERENCES written inside a column definition.',
        explanation:
          'The composite primary key enforces "one rating per customer and product". The check rejects a 6, the default fills rated_at, and the foreign keys refuse ratings for products or customers that do not exist.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE', url: PG + 'sql-createtable.html' },
      { label: 'MySQL: CREATE TABLE', url: MY + 'create-table.html' },
    ],
  },
  {
    id: 'adventureworks-052',
    dataset: 'adventureworks',
    level: 5,
    topics: ['locks-isolation', 'dml'],
    title: 'Take stock without overselling',
    prompt:
      'Reserve 5 units of product 1 at location 1, but only if at least 5 are there, in a way that stays correct when many orders arrive at once. The check shows the new quantity.',
    orderMatters: false,
    checkSql: `select quantity from product_inventory where product_id = 1 and location_id = 1`,
    solutions: [
      {
        approach: 'Conditional UPDATE',
        postgres: `update product_inventory
set quantity = quantity - 5
where product_id = 1 and location_id = 1 and quantity >= 5;`,
        mysql: `update product_inventory
set quantity = quantity - 5
where product_id = 1 and location_id = 1 and quantity >= 5;`,
        explanation:
          'The check and the change happen in one statement on a locked row: a concurrent order waits, then re-reads the new quantity. Reading the stock in one query and updating in another (without FOR UPDATE) lets two orders both see 6 and both take 5. If the UPDATE reports 0 rows, there was not enough.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Read Committed and UPDATE', url: PG + 'transaction-iso.html#XACT-READ-COMMITTED' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'adventureworks-053',
    dataset: 'adventureworks',
    level: 5,
    topics: ['query-plans', 'aggregates'],
    title: 'Best sellers, two ways',
    prompt: 'Find the 5 products with the most units sold (sum of order_qty): product_id, name and units.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Aggregate, then join',
        postgres: `select p.product_id, p.name, d.units
from (select product_id, sum(order_qty) as units from sales_order_detail group by product_id) d
join product p on p.product_id = d.product_id
order by d.units desc, p.product_id
limit 5;`,
        mysql: `select p.product_id, p.name, d.units
from (select product_id, sum(order_qty) as units from sales_order_detail group by product_id) d
join product p on p.product_id = d.product_id
order by d.units desc, p.product_id
limit 5;`,
        explanation: 'One pass over the 31,000 order lines builds the totals; only then are the ~260 sold products matched with their names.',
      },
      {
        approach: 'Correlated subquery per product',
        postgres: `select product_id, name, units
from (select p.product_id, p.name,
             (select sum(d.order_qty) from sales_order_detail d where d.product_id = p.product_id) as units
      from product p) x
where units is not null
order by units desc, product_id
limit 5;`,
        mysql: `select product_id, name, units
from (select p.product_id, p.name,
             (select sum(d.order_qty) from sales_order_detail d where d.product_id = p.product_id) as units
      from product p) x
where units is not null
order by units desc, product_id
limit 5;`,
        explanation: 'Sums the lines of each of the 504 products separately. Fine with an index on sales_order_detail(product_id), slow without one.',
      },
    ],
    comparison:
      'Same five rows. Compare the timings: aggregating first and joining the small result is the usual winner; the correlated form depends entirely on an index for the inner lookup.',
    docs: [
      { label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'MySQL: Optimizing subqueries', url: MY + 'subquery-optimization.html' },
    ],
  },
  {
    id: 'adventureworks-054',
    dataset: 'adventureworks',
    level: 2,
    topics: ['casting', 'text-search'],
    title: 'Sizes that are numbers',
    prompt: 'size holds either a number ("44") or a letter size ("M"). For products with a numeric size, show the smallest, largest and average size (1 decimal) per product line.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter by pattern, then cast',
        postgres: `select product_line,
       min(size::int) as smallest, max(size::int) as largest,
       round(avg(size::int), 1) as average
from product
where size ~ '^[0-9]+$'
group by product_line
order by product_line;`,
        mysql: `select product_line,
       min(cast(size as unsigned)) as smallest, max(cast(size as unsigned)) as largest,
       round(avg(cast(size as unsigned)), 1) as average
from product
where size regexp '^[0-9]+$'
group by product_line
order by product_line;`,
        mysqlNote: 'MySQL would cast \'M\' to 0 with a warning instead of failing, so the filter matters even more: without it the letter sizes would silently become zeros.',
        explanation:
          'Casting \'M\' to integer is an error in PostgreSQL, so keep only the all-digit sizes first. max(size) on the text would also be wrong: as text, "62" < "8".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: POSIX regular expressions', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html' },
    ],
  },
  {
    id: 'adventureworks-055',
    dataset: 'adventureworks',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Days without a sale',
    prompt: 'Find the gaps of at least 2 days without any order: the last day with orders before the gap, the next day with orders and the number of empty days.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over distinct days',
        postgres: `with days as (
  select distinct order_date::date as day from sales_order_header
)
select day as last_sale, next_day as next_sale, next_day - day - 1 as empty_days
from (select day, lead(day) over (order by day) as next_day from days) d
where next_day - day - 1 >= 2
order by day;`,
        mysql: `with days as (
  select distinct date(order_date) as day from sales_order_header
)
select day as last_sale, next_day as next_sale, datediff(next_day, day) - 1 as empty_days
from (select day, lead(day) over (order by day) as next_day from days) d
where datediff(next_day, day) - 1 >= 2
order by day;`,
        mysqlNote: 'DATEDIFF(a, b) counts days; date − date is not day arithmetic in MySQL.',
        explanation: 'date − date gives a number of days in PostgreSQL. There are only two such gaps, both in summer 2022, when the sample (every 4th order) still had few orders per day; single empty days are more common.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'adventureworks-056',
    dataset: 'adventureworks',
    level: 4,
    topics: ['transactions'],
    title: 'Keep the good lines',
    prompt:
      'Raise list prices of products 1 and 2 by 10%. Then set a savepoint, accidentally set product 3\'s price to 0, and undo only that mistake. In PostgreSQL you are already inside a transaction.',
    orderMatters: true,
    checkSql: `select product_id, list_price from product where product_id in (1, 2, 3) order by product_id`,
    solutions: [
      {
        approach: 'SAVEPOINT and ROLLBACK TO',
        postgres: `update product set list_price = round(list_price * 1.1, 2) where product_id in (1, 2);
savepoint before_mistake;
update product set list_price = 0 where product_id = 3;
rollback to savepoint before_mistake;`,
        mysql: `start transaction;
update product set list_price = round(list_price * 1.1, 2) where product_id in (1, 2);
savepoint before_mistake;
update product set list_price = 0 where product_id = 3;
rollback to savepoint before_mistake;
commit;`,
        explanation: 'ROLLBACK TO SAVEPOINT undoes only what happened after the savepoint; the price raise stays and the transaction remains open.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SAVEPOINT', url: PG + 'sql-savepoint.html' },
      { label: 'MySQL: SAVEPOINT', url: MY + 'savepoint.html' },
    ],
  },
  {
    id: 'adventureworks-057',
    dataset: 'adventureworks',
    level: 5,
    topics: ['locks-isolation'],
    title: 'Workers pulling purchase orders',
    prompt:
      'Several workers approve pending purchase orders (status 1) in parallel. Write the query a worker runs to take the 5 oldest pending orders that no other worker has taken: purchase_order_id and order_date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FOR UPDATE SKIP LOCKED',
        postgres: `select purchase_order_id, order_date
from purchase_order_header
where status = 1
order by order_date, purchase_order_id
limit 5
for update skip locked;`,
        mysql: `select purchase_order_id, order_date
from purchase_order_header
where status = 1
order by order_date, purchase_order_id
limit 5
for update skip locked;`,
        explanation: 'Each worker gets a different batch: rows locked by others are skipped rather than waited for. The worker then sets the status and commits, releasing the locks.',
      },
    ],
    docs: [{ label: 'PostgreSQL: The locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' }],
  },
  {
    id: 'adventureworks-058',
    dataset: 'adventureworks',
    level: 2,
    topics: ['full-join'],
    title: 'Products sold in 2023 vs 2025',
    prompt: 'Count the products sold in both 2023 and 2025, only in 2023 and only in 2025.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two years',
        postgres: `with y23 as (select distinct d.product_id from sales_order_detail d join sales_order_header h on h.sales_order_id = d.sales_order_id
             where h.order_date >= '2023-01-01' and h.order_date < '2024-01-01'),
     y25 as (select distinct d.product_id from sales_order_detail d join sales_order_header h on h.sales_order_id = d.sales_order_id
             where h.order_date >= '2025-01-01' and h.order_date < '2026-01-01')
select count(*) filter (where a.product_id is not null and b.product_id is not null) as both_years,
       count(*) filter (where b.product_id is null) as only_2023,
       count(*) filter (where a.product_id is null) as only_2025
from y23 a full join y25 b on b.product_id = a.product_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Products that disappear (only 2023) and new ones (only 2025) show how the range changed.',
      },
      {
        approach: 'Flags per product',
        postgres: `select sum(case when a = 1 and b = 1 then 1 else 0 end) as both_years,
       sum(case when a = 1 and b = 0 then 1 else 0 end) as only_2023,
       sum(case when a = 0 and b = 1 then 1 else 0 end) as only_2025
from (
  select d.product_id,
         max(case when h.order_date >= '2023-01-01' and h.order_date < '2024-01-01' then 1 else 0 end) as a,
         max(case when h.order_date >= '2025-01-01' and h.order_date < '2026-01-01' then 1 else 0 end) as b
  from sales_order_detail d join sales_order_header h on h.sales_order_id = d.sales_order_id
  group by d.product_id
) p;`,
        mysql: `select sum(a = 1 and b = 1) as both_years, sum(a = 1 and b = 0) as only_2023, sum(a = 0 and b = 1) as only_2025
from (
  select d.product_id,
         max(h.order_date >= '2023-01-01' and h.order_date < '2024-01-01') as a,
         max(h.order_date >= '2025-01-01' and h.order_date < '2026-01-01') as b
  from sales_order_detail d join sales_order_header h on h.sales_order_id = d.sales_order_id
  group by d.product_id
) p;`,
        explanation: 'One row per product with a flag per year; products sold in neither year count nowhere.',
      },
    ],
    comparison: 'Same counts; the flag version reads the order tables once.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'adventureworks-059',
    dataset: 'adventureworks',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for store orders',
    prompt: 'Store orders (online_order_flag = 0) are a minority, and the sales team lists them by customer. Create an index that holds only those orders.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'sales_order_header' and indexdef like '%online_order_flag%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'sales_order_header' and column_name = 'online_order_flag'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index soh_store_orders_idx on sales_order_header (customer_id) where online_order_flag = 0;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'Only store orders are indexed; online orders, the large majority since mid-2024, stay out.',
      },
      {
        approach: 'Flag first in a composite index',
        postgres: `create index soh_flag_customer_idx on sales_order_header (online_order_flag, customer_id);`,
        mysql: `create index soh_flag_customer_idx on sales_order_header (online_order_flag, customer_id);`,
        explanation: 'With the flag as the first column, "flag = 0, by customer" is one range of the index.',
      },
    ],
    comparison: 'Both serve the list. A low-cardinality column like a flag is rarely worth indexing alone, but as a filter of a partial index or as a prefix it works well.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'adventureworks-060',
    dataset: 'adventureworks',
    level: 5,
    topics: ['partitioning'],
    title: 'Purchase orders by status',
    prompt:
      'Create po_by_status (purchase_order_id, status, order_date, total_due), list-partitioned by status: pending (1), approved and rejected (2, 3), complete (4). Copy the purchase orders into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'po_by_status'::regclass) as partitions,
       (select count(*) from po_by_status) as total_rows,
       (select count(*) from po_by_status where status = 4) as complete`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'po_by_status') as partitions,
       (select count(*) from po_by_status) as total_rows,
       (select count(*) from po_by_status where status = 4) as complete`,
    solutions: [
      {
        approach: 'LIST partitions on an integer',
        postgres: `create table po_by_status (
  purchase_order_id integer not null,
  status smallint not null,
  order_date timestamp not null,
  total_due numeric(19, 4) not null,
  primary key (purchase_order_id, status)
) partition by list (status);

create table po_pending  partition of po_by_status for values in (1);
create table po_decided  partition of po_by_status for values in (2, 3);
create table po_complete partition of po_by_status for values in (4);

insert into po_by_status select purchase_order_id, status, order_date, total_due from purchase_order_header;`,
        mysql: `create table po_by_status (
  purchase_order_id int not null,
  status smallint not null,
  order_date datetime not null,
  total_due decimal(19, 4) not null,
  primary key (purchase_order_id, status)
)
partition by list (status) (
  partition p_pending  values in (1),
  partition p_decided  values in (2, 3),
  partition p_complete values in (4)
);

insert into po_by_status select purchase_order_id, status, order_date, total_due from purchase_order_header;`,
        explanation:
          'Open work (225 pending orders) lives in a small partition, history in a big one. Updating an order\'s status moves its row to another partition; PostgreSQL does that automatically on UPDATE.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'adventureworks-061',
    dataset: 'adventureworks',
    level: 3,
    topics: ['date-series'],
    title: 'Orders week by week',
    prompt: 'For the 13 weeks starting Monday 2024-12-30, show each week\'s start date and its number of sales orders.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series by week',
        postgres: `select w::date as week_start, count(h.sales_order_id) as orders
from generate_series(date '2024-12-30', date '2024-12-30' + 84, interval '7 days') as w
left join sales_order_header h on h.order_date >= w and h.order_date < w + interval '7 days'
group by w
order by w;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: '84 days after the first Monday is the start of week 13. Weeks starting on Monday match ISO weeks.',
      },
      {
        approach: 'Recursive weeks',
        postgres: `with recursive weeks (w, n) as (
  select date '2024-12-30', 1
  union all
  select (w + 7)::date, n + 1 from weeks where n < 13
)
select w as week_start, count(h.sales_order_id) as orders
from weeks
left join sales_order_header h on h.order_date >= w and h.order_date < w + 7
group by w
order by w;`,
        mysql: `with recursive weeks (w, n) as (
  select date('2024-12-30'), 1
  union all
  select w + interval 7 day, n + 1 from weeks where n < 13
)
select w as week_start, count(h.sales_order_id) as orders
from weeks
left join sales_order_header h on h.order_date >= w and h.order_date < w + interval 7 day
group by w
order by w;`,
        explanation: 'A counter stops the recursion after 13 weeks.',
      },
    ],
    comparison: 'Same 13 rows.',
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'adventureworks-062',
    dataset: 'adventureworks',
    level: 5,
    topics: ['triggers'],
    title: 'Keep a price history automatically',
    prompt:
      'When a product\'s list_price changes, a trigger should close the product\'s open row in product_list_price_history (end_date NULL) and add a new open row with the new price. Test it with product 707.',
    orderMatters: false,
    checkSql: `update product set list_price = list_price + 1 where product_id = 707;
select count(*) as history_rows,
       sum(case when end_date is null then 1 else 0 end) as open_rows,
       max(case when end_date is null then list_price end) = (select list_price from product where product_id = 707) as open_matches
from product_list_price_history where product_id = 707`,
    solutions: [
      {
        approach: 'AFTER UPDATE trigger with a condition',
        postgres: `create function track_price() returns trigger
language plpgsql
as $$
begin
  if new.list_price <> old.list_price then
    update product_list_price_history set end_date = now()
    where product_id = new.product_id and end_date is null;
    insert into product_list_price_history (product_id, start_date, end_date, list_price)
    values (new.product_id, now(), null, new.list_price);
  end if;
  return new;
end;
$$;

create trigger product_track_price
after update of list_price on product
for each row execute function track_price();`,
        mysql: `create trigger product_track_price
after update on product
for each row
begin
  if new.list_price <> old.list_price then
    update product_list_price_history set end_date = now()
    where product_id = new.product_id and end_date is null;
    insert into product_list_price_history (product_id, start_date, end_date, list_price)
    values (new.product_id, now(), null, new.list_price);
  end if;
end;`,
        mysqlNote: 'MySQL triggers fire on any UPDATE of the row (no "OF column"), hence the IF. In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'UPDATE OF list_price fires only when that column is in the SET list, and the IF skips "updates" to the same value. The history then always has exactly one open row holding the current price.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TRIGGER … UPDATE OF', url: PG + 'sql-createtrigger.html' },
      { label: 'MySQL: CREATE TRIGGER', url: MY + 'create-trigger.html' },
    ],
  },
  {
    id: 'adventureworks-063',
    dataset: 'adventureworks',
    level: 3,
    topics: ['lateral'],
    title: 'Two priciest products per subcategory',
    prompt: 'For the subcategories of category 1 (Bikes), show the two most expensive products of each: subcategory name, product name and list_price.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 2',
        postgres: `select s.name as subcategory, p.name as product, p.list_price
from product_subcategory s
cross join lateral (
  select name, list_price, product_id from product
  where product_subcategory_id = s.product_subcategory_id
  order by list_price desc, product_id
  limit 2
) p
where s.product_category_id = 1
order by s.name, p.list_price desc, p.product_id;`,
        mysql: `select s.name as subcategory, p.name as product, p.list_price
from product_subcategory s
cross join lateral (
  select name, list_price, product_id from product
  where product_subcategory_id = s.product_subcategory_id
  order by list_price desc, product_id
  limit 2
) p
where s.product_category_id = 1
order by s.name, p.list_price desc, p.product_id;`,
        explanation: 'Bikes has three subcategories (Mountain, Road, Touring); each contributes its two top prices.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'adventureworks-064',
    dataset: 'adventureworks',
    level: 3,
    topics: ['subtotals'],
    title: 'Sales by group and territory, with totals',
    prompt: 'Sum 2024 sales (sub_total, rounded to 0 decimals) by territory group and territory, with a subtotal per group and a grand total (labels "All").',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(t.territory_group, 'All') as territory_group, coalesce(t.name, 'All') as territory, round(sum(h.sub_total)) as sales
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
where h.order_date >= '2024-01-01' and h.order_date < '2025-01-01'
group by rollup (t.territory_group, t.name)
order by grouping(t.territory_group), t.territory_group, grouping(t.name), t.name;`,
        mysql: `select coalesce(t.territory_group, 'All') as territory_group, coalesce(t.name, 'All') as territory, round(sum(h.sub_total)) as sales
from sales_order_header h
join sales_territory t on t.territory_id = h.territory_id
where h.order_date >= '2024-01-01' and h.order_date < '2025-01-01'
group by t.territory_group, t.name with rollup
order by grouping(t.territory_group), t.territory_group, grouping(t.name), t.name;`,
        explanation: 'Three groups (Europe, North America, Pacific), their territories, a subtotal for each group and the total.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'adventureworks-065',
    dataset: 'adventureworks',
    level: 1,
    topics: ['limit'],
    title: 'Page 3 of the catalog',
    prompt: 'The catalog lists products by name, 20 per page. Show page 3: product_id and name. Same name: by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIMIT … OFFSET',
        postgres: `select product_id, name
from product
order by name collate "C", product_id
limit 20 offset 40;`,
        mysql: `select product_id, name
from product
order by name collate utf8mb4_bin, product_id
limit 20 offset 40;`,
        mysqlNote: 'utf8mb4_bin compares bytes, like PostgreSQL\'s "C" collation, so both databases sort the names identically.',
        explanation:
          'Page n starts after (n − 1) × 20 rows. Sorting text depends on the collation (case, accents, punctuation); naming the same byte-wise collation in both makes the pages match. Without it, each database could put different names on page 3.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Collation support', url: PG + 'collation.html' },
      { label: 'MySQL: COLLATE in SQL statements', url: MY + 'charset-collate.html' },
    ],
  },
  {
    id: 'adventureworks-066',
    dataset: 'adventureworks',
    level: 1,
    topics: ['select-basics', 'conditions'],
    title: 'Vendors by credit rating',
    prompt: 'List the active vendors (active_flag = 1) with a credit rating of 3 or worse (higher is worse): business_entity_id, name, credit_rating.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two conditions',
        postgres: `select business_entity_id, name, credit_rating
from vendor
where active_flag = 1 and credit_rating >= 3
order by credit_rating desc, business_entity_id;`,
        mysql: `select business_entity_id, name, credit_rating
from vendor
where active_flag = 1 and credit_rating >= 3
order by credit_rating desc, business_entity_id;`,
        explanation: 'Most vendors have rating 1 (superior); the few weak ones are worth a review before new purchase orders.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'adventureworks-067',
    dataset: 'adventureworks',
    level: 4,
    topics: ['ddl'],
    title: 'Rename a table and a column',
    prompt: 'Rename the table shift to work_shift and its column name to shift_name, then show the shifts.',
    orderMatters: true,
    checkSql: `select shift_id, shift_name from work_shift order by shift_id`,
    solutions: [
      {
        approach: 'ALTER TABLE … RENAME',
        postgres: `alter table shift rename to work_shift;
alter table work_shift rename column name to shift_name;`,
        mysql: `rename table shift to work_shift;
alter table work_shift rename column name to shift_name;`,
        mysqlNote: 'MySQL has RENAME TABLE (and also accepts ALTER TABLE … RENAME TO); RENAME COLUMN exists since 8.0.',
        explanation: 'Renaming is a metadata change: no data is copied. Views and functions that used the old names must be updated; PostgreSQL views follow the rename automatically, because they store the table by identity, not by name.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ALTER TABLE', url: PG + 'sql-altertable.html' },
      { label: 'MySQL: RENAME TABLE', url: MY + 'rename-table.html' },
    ],
  },
  {
    id: 'adventureworks-068',
    dataset: 'adventureworks',
    level: 4,
    topics: ['merge'],
    title: 'A vendor price list',
    prompt:
      'Vendor 1508 sends new standard prices vendor_prices (product_id, standard_price): 355 → 1.45, 535 → 3.32 (unchanged), 940 → 61.50. Apply them to product_vendor in one statement, only where the price changes.',
    orderMatters: true,
    checkSql: `select product_id, standard_price from product_vendor where business_entity_id = 1508 order by product_id`,
    solutions: [
      {
        approach: 'MERGE on the vendor and product',
        postgres: `create table vendor_prices (product_id integer primary key, standard_price numeric(19, 4) not null);
insert into vendor_prices values (355, 1.45), (535, 3.32), (940, 61.50);

merge into product_vendor pv
using vendor_prices n on n.product_id = pv.product_id and pv.business_entity_id = 1508
when matched and pv.standard_price <> n.standard_price then
  update set standard_price = n.standard_price;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'The vendor condition belongs in ON, so only that vendor\'s rows match; in WHEN it would be checked too late to restrict the join.',
      },
      {
        approach: 'UPDATE with a join',
        postgres: `create table vendor_prices (product_id integer primary key, standard_price numeric(19, 4) not null);
insert into vendor_prices values (355, 1.45), (535, 3.32), (940, 61.50);

update product_vendor pv set standard_price = n.standard_price
from vendor_prices n
where n.product_id = pv.product_id and pv.business_entity_id = 1508 and pv.standard_price <> n.standard_price;`,
        mysql: `create table vendor_prices (product_id int primary key, standard_price decimal(19, 4) not null);
insert into vendor_prices values (355, 1.45), (535, 3.32), (940, 61.50);

update product_vendor pv join vendor_prices n on n.product_id = pv.product_id
set pv.standard_price = n.standard_price
where pv.business_entity_id = 1508 and pv.standard_price <> n.standard_price;`,
        explanation: 'For price updates alone, the joined UPDATE is enough.',
      },
    ],
    comparison: 'Same prices afterwards.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'adventureworks-069',
    dataset: 'adventureworks',
    level: 4,
    topics: ['temp-tables'],
    title: 'Subcategory revenue to work with',
    prompt: 'Put revenue per subcategory (sum of line_total, rounded to 2 decimals) into a temporary table subcat_revenue (subcategory, revenue).',
    orderMatters: true,
    checkSql: `select subcategory, revenue from subcat_revenue order by revenue desc, subcategory limit 5`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table subcat_revenue as
select s.name as subcategory, round(sum(d.line_total), 2) as revenue
from sales_order_detail d
join product p on p.product_id = d.product_id
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
group by s.name;`,
        mysql: `create temporary table subcat_revenue as
select s.name as subcategory, round(sum(d.line_total), 2) as revenue
from sales_order_detail d
join product p on p.product_id = d.product_id
join product_subcategory s on s.product_subcategory_id = p.product_subcategory_id
group by s.name;`,
        explanation: 'The three-table join over 31,000 lines runs once; follow-up questions (top 5, share of total) read about 35 rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'adventureworks-070',
    dataset: 'adventureworks',
    level: 3,
    topics: ['window-frames'],
    title: 'A three-month moving average',
    prompt: 'For each month of 2024, show sales (sum of sub_total, rounded to 0 decimals) and the average of that month and the two before it (rounded to 0 decimals).',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROWS BETWEEN 2 PRECEDING',
        postgres: `with monthly as (
  select date_trunc('month', order_date)::date as month, sum(sub_total) as sales
  from sales_order_header
  where order_date >= '2023-11-01' and order_date < '2025-01-01'
  group by 1
)
select to_char(month, 'YYYY-MM') as month, round(sales) as sales, avg_3
from (select month, sales, round(avg(sales) over (order by month rows between 2 preceding and current row)) as avg_3 from monthly) m
where month >= '2024-01-01'
order by month;`,
        mysql: `with monthly as (
  select cast(date_format(order_date, '%Y-%m-01') as date) as month, sum(sub_total) as sales
  from sales_order_header
  where order_date >= '2023-11-01' and order_date < '2025-01-01'
  group by 1
)
select date_format(month, '%Y-%m') as month, round(sales) as sales, avg_3
from (select month, sales, round(avg(sales) over (order by month rows between 2 preceding and current row)) as avg_3 from monthly) m
where month >= '2024-01-01'
order by month;`,
        explanation: 'The data starts in November 2023 so that January 2024 already has two months of history. The jump in mid-2024 shows up in the average one or two months later: smoothing always lags.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'adventureworks-071',
    dataset: 'adventureworks',
    level: 5,
    topics: ['full-text'],
    title: 'Aluminum alloy',
    prompt: 'Make product descriptions searchable and count the descriptions that mention both "aluminum" and "alloy".',
    orderMatters: false,
    checkSql: `select count(*) as descriptions from product_description
where to_tsvector('simple', description) @@ to_tsquery('simple', 'aluminum & alloy')`,
    checkSqlMysql: `select count(*) as descriptions from product_description
where match(description) against ('+aluminum +alloy' in boolean mode)`,
    solutions: [
      {
        approach: 'AND query on a full-text index',
        postgres: `create index product_description_fts on product_description using gin (to_tsvector('simple', description));`,
        mysql: `create fulltext index product_description_ft on product_description (description);`,
        explanation: 'Two required words anywhere in the text. The descriptions include translations; words in other languages simply never match this query.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Text search operators', url: PG + 'functions-textsearch.html' }],
  },
  {
    id: 'adventureworks-072',
    dataset: 'adventureworks',
    level: 4,
    topics: ['normalization'],
    title: 'Does the subcategory decide the category?',
    prompt:
      'product stores only product_subcategory_id, and the category comes from the subcategory. Check the design: how many subcategories, and how many of them belong to more than one category?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Count categories per subcategory',
        postgres: `select count(*) as subcategories,
       count(*) filter (where categories > 1) as in_several_categories
from (select product_subcategory_id, count(distinct product_category_id) as categories
      from product_subcategory group by product_subcategory_id) s;`,
        mysql: `select count(*) as subcategories,
       sum(categories > 1) as in_several_categories
from (select product_subcategory_id, count(distinct product_category_id) as categories
      from product_subcategory group by product_subcategory_id) s;`,
        explanation:
          'Each subcategory has exactly one category, so storing the category on product as well would be redundant: product → subcategory → category is a chain of dependencies, and 3NF keeps each fact at its own level.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'adventureworks-073',
    dataset: 'adventureworks',
    level: 2,
    topics: ['set-operations'],
    title: 'Bought, sold, or both',
    prompt:
      'How many products appear only on purchase orders (bought from vendors), only on sales orders, and on both? One row with three counts.',
    orderMatters: false,
    solutions: [
      {
        approach: 'EXCEPT and INTERSECT',
        postgres: `select
  (select count(*) from (select product_id from purchase_order_detail
                         except
                         select product_id from sales_order_detail) x) as bought_only,
  (select count(*) from (select product_id from sales_order_detail
                         except
                         select product_id from purchase_order_detail) x) as sold_only,
  (select count(*) from (select product_id from purchase_order_detail
                         intersect
                         select product_id from sales_order_detail) x) as both_ways;`,
        mysql: `select
  (select count(*) from (select product_id from purchase_order_detail
                         except
                         select product_id from sales_order_detail) x) as bought_only,
  (select count(*) from (select product_id from sales_order_detail
                         except
                         select product_id from purchase_order_detail) x) as sold_only,
  (select count(*) from (select product_id from purchase_order_detail
                         intersect
                         select product_id from sales_order_detail) x) as both_ways;`,
        mysqlNote: 'INTERSECT and EXCEPT exist since MySQL 8.0.31.',
        explanation:
          'Set operations remove duplicates, so each product counts once however many order lines it has. 76 products are both bought and sold (helmets, socks, tyres: resold goods); the rest are either components or bikes built in-house.',
      },
      {
        approach: 'FULL JOIN of the two product lists',
        postgres: `select count(*) filter (where s.product_id is null) as bought_only,
       count(*) filter (where p.product_id is null) as sold_only,
       count(*) filter (where p.product_id is not null and s.product_id is not null) as both_ways
from (select distinct product_id from purchase_order_detail) p
full join (select distinct product_id from sales_order_detail) s on s.product_id = p.product_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; solution A works there.',
        explanation: 'One pass that classifies every product by which side it was found on.',
      },
    ],
    comparison: 'Same three numbers. The set operations read like the question; the FULL JOIN computes all three at once.',
    docs: [
      { label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' },
      { label: 'MySQL: INTERSECT', url: MY + 'intersect.html' },
    ],
  },
  {
    id: 'adventureworks-074',
    dataset: 'adventureworks',
    level: 3,
    topics: ['distinct', 'ranking'],
    title: 'The priciest product in each subcategory',
    prompt:
      'For each product subcategory, show the subcategory name and its most expensive product (name and list_price). On a tie, take the lower product_id. Order by product_subcategory_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DISTINCT ON',
        postgres: `select distinct on (p.product_subcategory_id)
       sc.name as subcategory, p.name as product, p.list_price
from product p
join product_subcategory sc on sc.product_subcategory_id = p.product_subcategory_id
order by p.product_subcategory_id, p.list_price desc, p.product_id;`,
        mysql: null,
        mysqlNote: 'No DISTINCT ON in MySQL; see solution B.',
        explanation:
          'DISTINCT ON keeps the first row of each group in ORDER BY order, so the ORDER BY must start with the DISTINCT ON columns and then say which row is "first".',
      },
      {
        approach: 'ROW_NUMBER() = 1',
        postgres: `select subcategory, product, list_price
from (
  select sc.name as subcategory, p.name as product, p.list_price, p.product_subcategory_id,
         row_number() over (partition by p.product_subcategory_id order by p.list_price desc, p.product_id) as n
  from product p
  join product_subcategory sc on sc.product_subcategory_id = p.product_subcategory_id
) ranked
where n = 1
order by product_subcategory_id;`,
        mysql: `select subcategory, product, list_price
from (
  select sc.name as subcategory, p.name as product, p.list_price, p.product_subcategory_id,
         row_number() over (partition by p.product_subcategory_id order by p.list_price desc, p.product_id) as n
  from product p
  join product_subcategory sc on sc.product_subcategory_id = p.product_subcategory_id
) ranked
where n = 1
order by product_subcategory_id;`,
        explanation: 'The portable form: number the rows in each subcategory and keep number 1.',
      },
    ],
    comparison: 'Same 37 rows. DISTINCT ON is shorter and often faster in PostgreSQL; ROW_NUMBER works everywhere and extends to "top 3 per group".',
    docs: [{ label: 'PostgreSQL: DISTINCT ON', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },
  {
    id: 'adventureworks-075',
    dataset: 'adventureworks',
    level: 1,
    topics: ['strings', 'group-by'],
    title: 'Product number prefixes',
    prompt: 'product_number starts with a code before the first hyphen (BK-R93R-62 → BK). Show the 5 most common codes with their number of products.',
    orderMatters: true,
    solutions: [
      {
        approach: 'split_part / substring_index',
        postgres: `select split_part(product_number, '-', 1) as prefix, count(*) as products
from product
group by prefix
order by products desc, prefix
limit 5;`,
        mysql: `select substring_index(product_number, '-', 1) as prefix, count(*) as products
from product
group by prefix
order by products desc, prefix
limit 5;`,
        mysqlNote: 'substring_index(text, \'-\', 1) returns everything before the first hyphen.',
        explanation: 'BK is bikes and FR frames: the code is a category hidden inside an identifier. Such "smart keys" are handy for humans but best not relied on in queries when a real column exists.',
      },
    ],
    docs: [{ label: 'PostgreSQL: split_part', url: PG + 'functions-string.html' }],
  },
  {
    id: 'adventureworks-076',
    dataset: 'adventureworks',
    level: 1,
    topics: ['distinct', 'null'],
    title: 'Colour and size combinations',
    prompt: 'Among products that have both a colour and a size, how many different (colour, size) combinations exist?',
    orderMatters: false,
    solutions: [
      {
        approach: 'SELECT DISTINCT in a subquery',
        postgres: `select count(*) as combinations
from (select distinct color, size from product where color is not null and size is not null) c;`,
        mysql: `select count(*) as combinations
from (select distinct color, size from product where color is not null and size is not null) c;`,
        explanation: 'DISTINCT applies to the whole row, so it removes repeated pairs, not repeated colours.',
      },
      {
        approach: 'COUNT(DISTINCT …) of two columns',
        postgres: `select count(distinct (color, size)) as combinations
from product
where color is not null and size is not null;`,
        mysql: `select count(distinct color, size) as combinations
from product
where color is not null and size is not null;`,
        mysqlNote: 'MySQL accepts several expressions in COUNT(DISTINCT …) and skips a row if any of them is NULL.',
        explanation:
          'PostgreSQL wants one value, so the pair is wrapped in a row (color, size). Without the WHERE the two would disagree: a row value with one NULL inside, like (NULL, \'M\'), still counts in PostgreSQL, while MySQL skips it.',
      },
    ],
    comparison: 'Same 60 combinations. The subquery is the clearest; COUNT(DISTINCT …) is shorter, but its NULL rules differ between the databases.',
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'adventureworks-077',
    dataset: 'adventureworks',
    level: 2,
    topics: ['conditional-aggregates', 'joins'],
    title: 'Who works in each department',
    prompt:
      'For each department, count its current employees (end_date is NULL in employee_department_history): total, women, men, married and single. Order by department_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'COUNT with FILTER / SUM(CASE)',
        postgres: `select d.department_id, d.name,
       count(*) as employees,
       count(*) filter (where e.gender = 'F') as women,
       count(*) filter (where e.gender = 'M') as men,
       count(*) filter (where e.marital_status = 'M') as married,
       count(*) filter (where e.marital_status = 'S') as single
from employee_department_history h
join department d on d.department_id = h.department_id
join employee e on e.business_entity_id = h.business_entity_id
where h.end_date is null
group by d.department_id, d.name
order by d.department_id;`,
        mysql: `select d.department_id, d.name,
       count(*) as employees,
       sum(e.gender = 'F') as women,
       sum(e.gender = 'M') as men,
       sum(e.marital_status = 'M') as married,
       sum(e.marital_status = 'S') as single
from employee_department_history h
join department d on d.department_id = h.department_id
join employee e on e.business_entity_id = h.business_entity_id
where h.end_date is null
group by d.department_id, d.name
order by d.department_id;`,
        mysqlNote: 'A comparison is 1 or 0 in MySQL, so SUM counts the matches.',
        explanation: 'Note the two different M\'s: in gender it means male, in marital_status married. Codes like these are why a lookup table or a CHECK constraint with readable values pays off.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'adventureworks-078',
    dataset: 'adventureworks',
    level: 4,
    topics: ['json', 'text-aggregation'],
    title: 'A sales order as one document',
    prompt:
      'Return sales order 43672 as one JSON object: id, date (YYYY-MM-DD) and lines, an array of {product, qty} in line order.',
    orderMatters: false,
    solutions: [
      {
        approach: 'jsonb_agg inside jsonb_build_object',
        postgres: `select jsonb_build_object(
         'id', h.sales_order_id,
         'date', to_char(h.order_date, 'YYYY-MM-DD'),
         'lines', jsonb_agg(jsonb_build_object('product', p.name, 'qty', d.order_qty) order by d.sales_order_detail_id)
       ) as sales_order
from sales_order_header h
join sales_order_detail d on d.sales_order_id = h.sales_order_id
join product p on p.product_id = d.product_id
where h.sales_order_id = 43672
group by h.sales_order_id, h.order_date;`,
        mysql: `select json_object(
         'id', h.sales_order_id,
         'date', date_format(h.order_date, '%Y-%m-%d'),
         'lines', cast(concat('[',
                    group_concat(json_object('product', p.name, 'qty', d.order_qty) order by d.sales_order_detail_id),
                  ']') as json)
       ) as sales_order
from sales_order_header h
join sales_order_detail d on d.sales_order_id = h.sales_order_id
join product p on p.product_id = d.product_id
where h.sales_order_id = 43672
group by h.sales_order_id, h.order_date;`,
        mysqlNote:
          'JSON_ARRAYAGG has no ORDER BY in MySQL, so the array would come out in no guaranteed order. GROUP_CONCAT can order its parts; wrapped in [ ] and cast, it becomes a JSON array.',
        explanation:
          'The aggregate builds the inner array per order; the outer object adds the header fields. An API can return this as is, instead of reassembling header and lines from two queries.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON functions', url: PG + 'functions-json.html' },
      { label: 'MySQL: JSON creation functions', url: MY + 'json-creation-functions.html' },
    ],
  },
  {
    id: 'adventureworks-079',
    dataset: 'adventureworks',
    level: 5,
    topics: ['functions'],
    title: 'A margin function for orders',
    prompt:
      'Write a function order_margin(p_order_id) that returns the order\'s line totals minus the products\' standard cost (quantity × standard_cost), rounded to 2 decimals.',
    orderMatters: false,
    checkSql: `select order_margin(43672) as o43672, order_margin(43844) as o43844, order_margin(1) as missing`,
    solutions: [
      {
        approach: 'SQL function / stored function',
        postgres: `create function order_margin(p_order_id integer)
returns numeric
language sql
stable
as $$
  select round(sum(d.line_total - d.order_qty * p.standard_cost), 2)
  from sales_order_detail d
  join product p on p.product_id = d.product_id
  where d.sales_order_id = p_order_id;
$$;`,
        mysql: `create function order_margin(p_order_id integer)
returns decimal(19, 2)
reads sql data
begin
  return (
    select round(sum(d.line_total - d.order_qty * p.standard_cost), 2)
    from sales_order_detail d
    join product p on p.product_id = d.product_id
    where d.sales_order_id = p_order_id
  );
end;`,
        mysqlNote: DELIMITER_NOTE + ' READS SQL DATA tells MySQL the function only reads.',
        explanation:
          'STABLE promises PostgreSQL the result does not change within one statement, so it may call the function fewer times. A missing order gives NULL, because SUM over no rows is NULL. standard_cost is today\'s cost; an exact margin would use product_cost_history at the order date.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Function volatility', url: PG + 'xfunc-volatility.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'adventureworks-080',
    dataset: 'adventureworks',
    level: 4,
    topics: ['materialized-views'],
    title: 'Product sales, stored',
    prompt:
      'Store total quantity and revenue per product (product_id, name, units, revenue rounded to 2 decimals) for a dashboard, refreshable without blocking readers. Then: the top 5 by revenue.',
    orderMatters: true,
    checkSql: `select name, units, revenue from product_sales order by revenue desc, product_id limit 5`,
    solutions: [
      {
        approach: 'Materialized view with a unique index',
        postgres: `create materialized view product_sales as
select p.product_id, p.name, sum(d.order_qty) as units, round(sum(d.line_total), 2) as revenue
from sales_order_detail d
join product p on p.product_id = d.product_id
group by p.product_id, p.name;

create unique index product_sales_key on product_sales (product_id);
-- later: refresh materialized view concurrently product_sales;`,
        mysql: `create table product_sales (
  product_id int primary key,
  name       varchar(50),
  units      int,
  revenue    decimal(14, 2)
);

replace into product_sales
select p.product_id, p.name, sum(d.order_qty), round(sum(d.line_total), 2)
from sales_order_detail d
join product p on p.product_id = d.product_id
group by p.product_id, p.name;`,
        mysqlNote: 'No materialized views: a table refreshed by REPLACE INTO on a schedule.',
        explanation:
          '265 stored rows instead of aggregating every order line on each dashboard load. The Mountain-200 bikes lead. CONCURRENTLY needs the unique index; without it a refresh locks the view and readers wait.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'adventureworks-081',
    dataset: 'adventureworks',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'Reprice a subcategory with history',
    prompt:
      'Write a procedure reprice_subcategory(p_subcategory_id, p_pct, p_date) that raises list_price of every product in the subcategory by p_pct percent (rounded to 2 decimals), closes the open product_list_price_history row the day before p_date, and opens a new one from p_date. Raise Helmets (31) by 10% on 2025-07-01.',
    orderMatters: true,
    checkSql: `select h.product_id, h.start_date, h.end_date, h.list_price, p.list_price as current_price
from product_list_price_history h
join product p on p.product_id = h.product_id
where h.product_id = 707 and h.start_date >= '2024-01-01'
order by h.start_date`,
    solutions: [
      {
        approach: 'Three statements in a procedure',
        postgres: `create procedure reprice_subcategory(p_subcategory_id integer, p_pct numeric, p_date date)
language plpgsql
as $$
begin
  update product
  set list_price = round(list_price * (1 + p_pct / 100), 2)
  where product_subcategory_id = p_subcategory_id;

  update product_list_price_history h
  set end_date = p_date - 1
  from product p
  where p.product_id = h.product_id and p.product_subcategory_id = p_subcategory_id and h.end_date is null;

  insert into product_list_price_history (product_id, start_date, end_date, list_price)
  select product_id, p_date, null, list_price
  from product
  where product_subcategory_id = p_subcategory_id;
end;
$$;

call reprice_subcategory(31, 10, '2025-07-01');`,
        mysql: `create procedure reprice_subcategory(p_subcategory_id int, p_pct decimal(5, 2), p_date date)
begin
  update product
  set list_price = round(list_price * (1 + p_pct / 100), 2)
  where product_subcategory_id = p_subcategory_id;

  update product_list_price_history h
  join product p on p.product_id = h.product_id
  set h.end_date = p_date - interval 1 day
  where p.product_subcategory_id = p_subcategory_id and h.end_date is null;

  insert into product_list_price_history (product_id, start_date, end_date, list_price)
  select product_id, p_date, null, list_price
  from product
  where product_subcategory_id = p_subcategory_id;
end;

call reprice_subcategory(31, 10, '2025-07-01');`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'The price is changed first, so the new history row copies the new price. 34.99 × 1.1 = 38.489 is stored as 38.49. The history keeps the old period closed on 2025-06-30, so "price on a given day" queries keep working.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: Multiple-table UPDATE', url: MY + 'update.html' },
    ],
  },
]
