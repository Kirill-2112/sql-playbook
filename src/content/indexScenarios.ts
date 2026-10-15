export type IndexVerdict = 'helps' | 'no-help' | 'partly'

export interface IndexScenario {
  slug: string
  title: string
  query: string
  table: 'customers' | 'orders'
  indexSql: string
  verdict: IndexVerdict
  lesson: string
  /** A better index for the same query, when the first one disappoints. */
  fix?: { indexSql: string; note: string }
}

// Every index created here is named lab_* so the lab can clean up after itself.
export const indexScenarios: IndexScenario[] = [
  {
    slug: 'exact-lookup',
    title: 'Looking up one value',
    query: `select * from orders where customer_id = 1234`,
    table: 'orders',
    indexSql: `create index lab_orders_customer on orders (customer_id)`,
    verdict: 'helps',
    lesson:
      'Without an index Postgres reads all 200,000 orders to find about 40. With an index it jumps straight to them. This is the classic case: a selective filter on a column you search by often.',
  },
  {
    slug: 'prefix-search',
    title: 'Text that starts with…',
    query: `select * from customers where email like 'noa.levi12%'`,
    table: 'customers',
    indexSql: `create index lab_customers_email on customers (email)`,
    verdict: 'helps',
    lesson:
      'A B-tree index keeps values sorted, so “starts with noa.levi12” is a range in that order and the index can find it. In databases with a non-C collation you would need text_pattern_ops for this.',
  },
  {
    slug: 'leading-wildcard',
    title: 'Text that contains…',
    query: `select * from customers where email like '%levi123%'`,
    table: 'customers',
    indexSql: `create index lab_customers_email on customers (email)`,
    verdict: 'no-help',
    lesson:
      'A % at the start means the match can be anywhere, so sorted order is useless and Postgres scans everything. For “contains” searches use a trigram index (pg_trgm) or full-text search.',
  },
  {
    slug: 'function-on-column',
    title: 'Wrapping the column in a function',
    query: `select * from customers where lower(email) = 'noa.levi12@mail.com'`,
    table: 'customers',
    indexSql: `create index lab_customers_email on customers (email)`,
    verdict: 'no-help',
    lesson:
      'The index stores email, but the query asks about lower(email), which is a different value. Postgres cannot use the index and scans every row.',
    fix: {
      indexSql: `create index lab_customers_email_lower on customers (lower(email))`,
      note: 'An expression index stores lower(email) itself, so the same query becomes an index lookup.',
    },
  },
  {
    slug: 'low-selectivity',
    title: 'A value most rows have',
    query: `select * from orders where status = 'delivered'`,
    table: 'orders',
    indexSql: `create index lab_orders_status on orders (status)`,
    verdict: 'no-help',
    lesson:
      'About 92% of orders are delivered. Reading almost the whole table through an index is slower than just reading the table, so the planner ignores the index. Indexes pay off when a filter keeps a small share of rows.',
  },
  {
    slug: 'composite-order',
    title: 'Composite index in the wrong order',
    query: `select * from orders where created_at >= '2026-06-20'`,
    table: 'orders',
    indexSql: `create index lab_orders_customer_created on orders (customer_id, created_at)`,
    verdict: 'no-help',
    lesson:
      'A (customer_id, created_at) index is sorted by customer first. A filter on created_at alone cannot use that order, so Postgres reads the table instead. Think of a phone book sorted by last name, then first name: it does not help you find everyone named Noa. Postgres 18 can sometimes “skip scan” such an index, but only when the first column has few distinct values. Here there are 50,000 customers.',
    fix: {
      indexSql: `create index lab_orders_created on orders (created_at)`,
      note: 'Put the column you filter on alone first, or give it its own index.',
    },
  },
]
