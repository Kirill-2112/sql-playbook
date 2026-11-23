import type { TopicExplanation } from './types'

/**
 * Explanations shown before the first lesson of a skill, for learners who have never seen the topic. One idea per
 * card, a sentence or two, always shown on real rows of the dataset the lesson's tasks use. Numbers in the text come
 * from the data ({rows} in `after`), never typed by hand. `npm run build:explanations` runs every query on PostgreSQL
 * and MySQL and writes src/content/generated/explanations.json.
 */
export const EXPLANATIONS: TopicExplanation[] = [
  {
    topic: 'select-basics',
    dataset: 'northwind',
    cards: [
      {
        title: 'Data lives in tables',
        text: 'A database is a set of tables, like the sheets of a spreadsheet. Northwind is a small food trading company: its table **products** has one row for each product.',
        table: {
          name: 'products',
          orderBy: 'product_id',
          columns: [
            { name: 'product_id', about: 'a number that tells the products apart. No two products share one.' },
            { name: 'product_name', about: 'the name of the product.' },
            { name: 'unit_price', about: 'the price of one unit.' },
            { name: 'units_in_stock', about: 'how many units are in the warehouse.' },
          ],
        },
        after: 'Each column has a name. A query asks for data by these names.',
      },
      {
        title: 'SELECT picks the columns',
        text: 'A query is a request to the database. `select` says which columns you want, `from` says which table.',
        query: 'select product_name, unit_price\nfrom products;',
        after: 'All {rows} products are still there. Only the columns you named are left.',
        tip: '`select *` gives every column of the table.',
      },
      {
        title: 'WHERE keeps some rows',
        text: '`where` adds a condition. Rows for which it is not true are left out.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price > 50;',
        after: 'Only {rows} products cost more than 50.',
        tip: 'Join conditions with `and` (both must be true) or `or` (one is enough).',
      },
      {
        title: 'ORDER BY sorts the rows',
        text: 'Without `order by` the rows come in no particular order. Add it to sort them; `desc` puts the biggest first.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price > 50\norder by unit_price desc;',
        after: 'The most expensive product comes first.',
        tip: 'Without `desc` the order goes from small to big (`asc`).',
      },
    ],
  },
  {
    topic: 'limit',
    dataset: 'northwind',
    cards: [
      {
        title: 'LIMIT keeps the first rows',
        text: '`limit 3` returns only the first three rows. Sort first: without `order by`, "first" means nothing.',
        query: 'select product_name, unit_price\nfrom products\norder by unit_price desc\nlimit 3;',
        after: 'The three most expensive products.',
      },
      {
        title: 'OFFSET skips rows',
        text: '`offset 3` skips the first three rows. With `limit` it gives the next page.',
        query: 'select product_name, unit_price\nfrom products\norder by unit_price desc\nlimit 3 offset 3;',
        after: 'Products 4 to 6 by price.',
        tip: 'PostgreSQL also knows the standard spelling `fetch first 3 rows only`; MySQL has only `limit`.',
      },
    ],
  },
  {
    topic: 'distinct',
    dataset: 'northwind',
    cards: [
      {
        title: 'Values repeat',
        text: 'Many customers are in the same country, so the column **country** has the same value many times.',
        query: 'select country\nfrom customers\norder by country;',
        shown: 5,
        after: '{rows} rows, one per customer, but far fewer countries.',
      },
      {
        title: 'DISTINCT removes repeats',
        text: '`select distinct` keeps each different value once.',
        query: 'select distinct country\nfrom customers\norder by country;',
        after: '{rows} different countries.',
        tip: 'With several columns, `distinct` drops a row only when all of its columns repeat.',
      },
    ],
  },
  {
    topic: 'null',
    dataset: 'northwind',
    cards: [
      {
        title: 'NULL: the value is unknown',
        text: 'An empty cell is **NULL**: nobody entered a value. It is not 0 and not an empty text.',
        query: 'select company_name, region\nfrom customers\norder by customer_id;',
        after: 'Many customers have no region: the cell says NULL.',
      },
      {
        title: 'IS NULL finds them',
        text: '`region = null` finds nothing: nothing equals unknown, not even unknown. Write `is null` or `is not null`.',
        query: 'select company_name\nfrom customers\nwhere region is null\norder by customer_id;',
        after: '{rows} customers have no region.',
      },
      {
        title: 'COALESCE fills the gaps',
        text: '`coalesce(a, b)` gives `a`, or `b` when `a` is NULL.',
        query: "select company_name,\n  coalesce(region, 'none') as region\nfrom customers\norder by customer_id;",
        after: 'No NULLs left: the missing regions say none.',
      },
    ],
  },
  {
    topic: 'text-search',
    dataset: 'northwind',
    cards: [
      {
        title: 'LIKE matches a pattern',
        text: 'In a `like` pattern, `%` stands for any text (even none) and `_` for exactly one character.',
        query: "select product_name\nfrom products\nwhere product_name like 'Ch%'\norder by product_id;",
        after: '{rows} products start with Ch.',
      },
      {
        title: 'Anywhere in the text',
        text: '`%` on both sides finds the word anywhere. `ilike` is `like` that ignores upper and lower case.',
        query: "select product_name\nfrom products\nwhere product_name ilike '%sauce%'\norder by product_id;",
        mysql: "select product_name\nfrom products\nwhere product_name like '%sauce%'\norder by product_id;",
        after: '{rows} products have "sauce" in the name, although it is written Sauce.',
        tip: 'MySQL has no `ilike`, but there `like` usually ignores case already.',
        mysqlText: '`%` on both sides finds the word anywhere. In MySQL `like` usually ignores upper and lower case.',
        mysqlTip: 'PostgreSQL\'s `like` cares about case: there you write `ilike` to ignore it.',
      },
    ],
  },
  {
    topic: 'conditions',
    dataset: 'northwind',
    cards: [
      {
        title: 'IN: one of a list',
        text: '`in (…)` is true when the value is one of the list: shorter than many `or`s.',
        query: "select company_name, country\nfrom customers\nwhere country in ('UK', 'France')\norder by customer_id;",
        after: '{rows} customers are in the UK or France.',
      },
      {
        title: 'BETWEEN: a range',
        text: '`between 10 and 20` includes both ends: 10 and 20 count too.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price between 10 and 20\norder by unit_price, product_id;',
        after: '{rows} products cost from 10 to 20.',
      },
      {
        title: 'CASE: a label for each row',
        text: '`case` checks its conditions in order and gives the value of the first true one; `else` covers the rest.',
        query:
          "select product_name, unit_price,\n  case\n    when unit_price > 50 then 'high'\n    when unit_price > 20 then 'mid'\n    else 'low'\n  end as price_level\nfrom products\norder by product_id;",
        after: 'Every product now has a label.',
      },
    ],
  },
  {
    topic: 'strings',
    dataset: 'northwind',
    cards: [
      {
        title: 'Gluing text together',
        text: "`||` joins texts. Put `', '` between the parts, or they stick together.",
        query: "select company_name,\n  city || ', ' || country\n    as place\nfrom customers\norder by customer_id;",
        mysql: "select company_name,\n  concat(city, ', ', country)\n    as place\nfrom customers\norder by customer_id;",
        after: 'Two columns made into one.',
        tip: 'In MySQL `||` means OR: use `concat()` there. PostgreSQL has `concat()` too.',
        mysqlText: "`concat()` joins texts. Put `', '` between the parts, or they stick together.",
        mysqlTip: 'Careful: in MySQL `||` means OR. PostgreSQL joins texts with `||`.',
      },
      {
        title: 'Functions change text',
        text: '`upper()` and `lower()` change the case of the letters, `length()` counts them.',
        query: 'select product_name,\n  lower(product_name) as small,\n  length(product_name) as len\nfrom products\norder by product_id;',
        mysql: 'select product_name,\n  lower(product_name) as small,\n  char_length(product_name) as len\nfrom products\norder by product_id;',
        tip: 'In MySQL `length()` counts bytes, so é counts twice: use `char_length()`.',
        mysqlText: '`upper()` and `lower()` change the case of the letters, `char_length()` counts them.',
        mysqlTip: 'In MySQL `length()` counts bytes, so é counts twice.',
      },
    ],
  },
  {
    topic: 'numbers',
    dataset: 'northwind',
    cards: [
      {
        title: 'Math on columns',
        text: 'Columns can be multiplied, added and divided like numbers on a calculator. `as` names the new column.',
        query: 'select unit_price, units_in_stock,\n  unit_price * units_in_stock\n    as stock_value\nfrom products\norder by product_id;',
        after: 'A new column, worked out for every row.',
      },
      {
        title: 'ROUND',
        text: '`round(x, 2)` keeps two digits after the point.',
        query: 'select unit_price,\n  round(unit_price * 1.17, 2)\n    as with_tax\nfrom products\norder by product_id;',
      },
      {
        title: 'Whole numbers divide whole',
        text: 'In PostgreSQL `7 / 2` is 3: both numbers are whole, so the answer is too. Write `7 / 2.0` to keep the fraction; `%` gives the remainder.',
        query: 'select 7 / 2 as whole,\n  round(7 / 2.0, 1) as exact,\n  7 % 2 as remainder;',
        mysql: 'select 7 div 2 as whole,\n  round(7 / 2, 1) as exact,\n  7 % 2 as remainder;',
        tip: 'In MySQL `/` always keeps the fraction; `div` divides whole numbers.',
        mysqlText: 'In MySQL `7 / 2` is 3.5: `/` keeps the fraction. `div` divides whole numbers; `%` gives the remainder.',
        mysqlTip: 'In PostgreSQL `7 / 2` is 3: whole numbers divide whole there.',
      },
    ],
  },
  {
    topic: 'dates-basics',
    dataset: 'northwind',
    cards: [
      {
        title: 'Parts of a date',
        text: '`extract(year from d)` takes one part of a date. Instead of `year`: `month`, `day`, `hour`…',
        query: 'select order_date,\n  extract(year from order_date)\n    as order_year\nfrom orders\norder by order_id;',
        after: 'Now orders can be counted by year or by month.',
      },
      {
        title: 'Moving a date',
        text: "`+ interval '7 days'` moves a date a week forward; `-` moves it back.",
        query: "select order_date,\n  order_date + interval '7 days'\n    as week_later\nfrom orders\norder by order_id;",
        mysql: 'select order_date,\n  date_add(order_date,\n           interval 7 day)\n    as week_later\nfrom orders\norder by order_id;',
        tip: 'MySQL writes it `date_add(order_date, interval 7 day)`.',
        mysqlText: '`date_add(d, interval 7 day)` moves a date a week forward; `date_sub` moves it back.',
        mysqlTip: "PostgreSQL writes it `order_date + interval '7 days'`.",
      },
    ],
  },
]
