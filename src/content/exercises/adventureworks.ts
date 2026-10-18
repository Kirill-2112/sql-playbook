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
]
