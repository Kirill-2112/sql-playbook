export interface Pitfall {
  title: string
  body: string
  sql?: string
}

export interface Exercise {
  prompt: string
  starterSql: string
  solutionSql: string
}

export interface Situation {
  slug: string
  title: string
  /** The question a person actually types into Google. */
  question: string
  /** The one-line answer: which tool solves this. */
  answer: string
  keywords: string[]
  explanation: string[]
  exampleSql: string
  pitfalls: Pitfall[]
  exercise: Exercise
}

export const situations: Situation[] = [
  {
    slug: 'top-n-per-group',
    title: 'Top N in every group',
    question: 'How do I get the top 3 restaurants in each cuisine?',
    answer: 'Number the rows inside each group with ROW_NUMBER() OVER (PARTITION BY …), then keep rows numbered 1 to N.',
    keywords: ['ROW_NUMBER', 'PARTITION BY', 'WITH'],
    explanation: [
      'ORDER BY … LIMIT 3 gives you the top 3 of the whole table, not of each group. You need a number that restarts for every group.',
      'ROW_NUMBER() OVER (PARTITION BY cuisine ORDER BY revenue DESC) does exactly that: it splits the rows by cuisine, sorts each part by revenue and numbers them 1, 2, 3… within that part.',
      'Window functions are calculated after WHERE, so you cannot filter on the number in the same query. Put the ranking in a CTE (WITH) or a subquery and filter outside.',
    ],
    exampleSql: `with revenue as (
  select r.cuisine, r.id, r.name, sum(o.total) as revenue
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.status = 'delivered'
  group by r.cuisine, r.id, r.name
),
ranked as (
  select *,
         row_number() over (partition by cuisine order by revenue desc) as place
  from revenue
)
select cuisine, name, revenue, place
from ranked
where place <= 3
order by cuisine, place;`,
    pitfalls: [
      {
        title: 'Filtering on the window function directly',
        body: 'WHERE runs before window functions exist, so Postgres reports that the column does not exist. Wrap the query and filter outside.',
        sql: `-- ❌ error: window functions are not allowed in WHERE
select name, row_number() over (order by id) as place
from restaurants
where row_number() over (order by id) <= 3;`,
      },
      {
        title: 'Ties: ROW_NUMBER vs RANK vs DENSE_RANK',
        body: 'ROW_NUMBER always gives 1, 2, 3 and breaks ties arbitrarily. RANK gives tied rows the same number and skips the next (1, 1, 3). DENSE_RANK does not skip (1, 1, 2). Pick RANK if tied rows should all be included.',
      },
      {
        title: 'Forgetting PARTITION BY',
        body: 'Without PARTITION BY the numbering runs over the whole result, which brings you back to a plain LIMIT.',
      },
    ],
    exercise: {
      prompt: 'For each city, find the most recent order. Show city, the order id and when it was created.',
      starterSql: `select c.city, o.id, o.created_at
from orders o
join customers c on c.id = o.customer_id
-- your turn
limit 20;`,
      solutionSql: `select city, id, created_at
from (
  select c.city, o.id, o.created_at,
         row_number() over (partition by c.city order by o.created_at desc) as place
  from orders o
  join customers c on c.id = o.customer_id
) ranked
where place = 1
order by city;`,
    },
  },
  {
    slug: 'compare-with-previous-row',
    title: 'Compare with the previous row',
    question: 'How do I calculate the change from last month?',
    answer: 'LAG(column) OVER (ORDER BY …) brings the previous row’s value into the current row, so you can subtract.',
    keywords: ['LAG', 'LEAD', 'date_trunc', 'NULLIF'],
    explanation: [
      'Plain SQL compares values within one row. To compare a month with the month before, you need the previous row’s value on the current row.',
      'LAG(revenue) OVER (ORDER BY month) returns revenue from the row before, in month order. LEAD does the same with the next row.',
      'Before window functions people joined the table to itself on month = month - 1. It works, but it is longer, slower and breaks when a month is missing.',
    ],
    exampleSql: `with monthly as (
  select date_trunc('month', created_at)::date as month,
         sum(total) as revenue
  from orders
  where status = 'delivered'
  group by 1
)
select month,
       revenue,
       lag(revenue) over (order by month) as previous_month,
       round(
         100.0 * (revenue - lag(revenue) over (order by month))
         / nullif(lag(revenue) over (order by month), 0),
         1
       ) as change_pct
from monthly
order by month;`,
    pitfalls: [
      {
        title: 'The first row is NULL',
        body: 'There is no row before the first one, so LAG returns NULL. Use LAG(revenue, 1, 0) to get 0 instead, or COALESCE.',
      },
      {
        title: 'Dividing by zero',
        body: 'If the previous value can be 0, wrap it in NULLIF(previous, 0). The result becomes NULL instead of an error.',
      },
      {
        title: 'Comparing per customer, not overall',
        body: 'Add PARTITION BY customer_id inside OVER, otherwise one customer’s order is compared with another customer’s.',
      },
      {
        title: 'Partial periods',
        body: 'The last month in this dataset ends mid-month, so it always looks like a drop. Check date ranges before drawing conclusions.',
      },
    ],
    exercise: {
      prompt: 'List every order of customer 7 in time order, with the time that passed since their previous order (call it since_previous).',
      starterSql: `select id, created_at
from orders
where customer_id = 7
order by created_at;`,
      solutionSql: `select id, created_at,
       created_at - lag(created_at) over (order by created_at) as since_previous
from orders
where customer_id = 7
order by created_at;`,
    },
  },
  {
    slug: 'rows-missing-in-another-table',
    title: 'Rows with no match in another table',
    question: 'How do I find customers who never placed an order?',
    answer: 'WHERE NOT EXISTS (SELECT 1 FROM orders WHERE orders.customer_id = customers.id).',
    keywords: ['NOT EXISTS', 'LEFT JOIN', 'IS NULL', 'NOT IN'],
    explanation: [
      'You are asking about something that is absent, so a normal JOIN cannot help: it only returns rows that do match.',
      'NOT EXISTS checks, for each customer, whether at least one matching order exists, and keeps the customer only if none does. Postgres stops at the first match, so it is fast.',
      'LEFT JOIN orders … WHERE orders.id IS NULL gives the same answer and is also common. Postgres usually runs both the same way (an anti-join).',
    ],
    exampleSql: `select c.id, c.name, c.city
from customers c
where not exists (
  select 1
  from orders o
  where o.customer_id = c.id
)
order by c.id;`,
    pitfalls: [
      {
        title: 'NOT IN and NULL',
        body: 'If the subquery returns even one NULL, NOT IN returns no rows at all, because “x is not equal to unknown” is unknown. NOT EXISTS has no such trap.',
        sql: `-- returns nothing: the list contains NULL
select 1 where 5 not in (1, 2, null);`,
      },
      {
        title: 'LEFT JOIN with the condition in WHERE',
        body: 'A filter on the right table, such as o.status = \'delivered\', belongs in the ON clause. In WHERE it turns the LEFT JOIN back into an inner join.',
      },
    ],
    exercise: {
      prompt: 'Find customers from Haifa who signed up in 2025 and have never ordered. Show id and name, sorted by id.',
      starterSql: `select c.id, c.name
from customers c
where c.city = 'Haifa'
-- your turn
order by c.id;`,
      solutionSql: `select c.id, c.name
from customers c
where c.city = 'Haifa'
  and c.signed_up_at >= '2025-01-01'
  and c.signed_up_at <  '2026-01-01'
  and not exists (select 1 from orders o where o.customer_id = c.id)
order by c.id;`,
    },
  },
]

export function findSituation(slug: string | undefined): Situation | undefined {
  return situations.find((s) => s.slug === slug)
}
