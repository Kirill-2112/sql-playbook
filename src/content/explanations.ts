import type { TopicExplanation } from './types'

/**
 * Explanations shown before the first lesson of a skill, for learners who have never seen the topic. One idea per
 * card, a sentence or two, always shown on real rows of the dataset the lesson's tasks use. Numbers in the text come
 * from the data ({rows} in `after`), never typed by hand. `npm run build:explanations` runs every query on PostgreSQL
 * and MySQL and writes src/content/generated/explanations.json.
 *
 * How a card's text is written: first what the command does, in everyday words; then the same thing on the card's
 * own query ("Here …"). No definitions, no double negatives.
 */
export const EXPLANATIONS: TopicExplanation[] = [
  {
    topic: 'select-basics',
    dataset: 'northwind',
    cards: [
      {
        title: 'Data lives in tables',
        text: 'A database keeps its data in tables, like sheets in Excel. Northwind is a small food company; its table **products** lists what it sells, one product per row.',
        tables: [
          {
            name: 'products',
            orderBy: 'product_id',
            columns: [
              { name: 'product_id', about: 'the number of the product. Every product has its own.' },
              { name: 'product_name', about: 'the name of the product.' },
              { name: 'unit_price', about: 'the price of one unit.' },
              { name: 'units_in_stock', about: 'how many units are in the warehouse.' },
            ],
          },
        ],
        after: 'Each column has a name. In a query you ask for data by these names.',
      },
      {
        title: 'SELECT picks the columns',
        text: 'A query asks the database for data. `select` says which columns to show, `from` says which table to take them from.',
        query: 'select product_name, unit_price\nfrom products;',
        after: 'You get all {rows} products, but only the two columns you asked for.',
        tip: 'Want every column? Write `select *`.',
      },
      {
        title: 'WHERE filters the rows',
        text: '`where` is a filter: only the rows that match the condition stay. Here the condition is `unit_price > 50`, so only products that cost more than 50 are left.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price > 50;',
        after: 'Only {rows} products cost more than 50.',
        tip: 'Two conditions: `and` means both must be true, `or` means one is enough.',
      },
      {
        title: 'ORDER BY sorts the rows',
        text: '`order by` sorts the rows by a column. Here `order by unit_price desc` puts the most expensive first: `desc` means from big to small.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price > 50\norder by unit_price desc;',
        after: 'Now the most expensive product is at the top.',
        tip: 'Without `desc` it sorts from small to big. Without `order by` the database may return rows in any order.',
      },
    ],
  },
  {
    topic: 'limit',
    dataset: 'northwind',
    cards: [
      {
        title: 'LIMIT keeps the first rows',
        text: '`limit` keeps only the first rows of the result. Here we sort by price, most expensive first, and keep 3.',
        query: 'select product_name, unit_price\nfrom products\norder by unit_price desc\nlimit 3;',
        after: 'The 3 most expensive products.',
        tip: 'Sort before `limit`: without `order by`, "the first 3" can be any 3.',
      },
      {
        title: 'OFFSET skips rows',
        text: '`offset` skips rows from the top. `limit 3 offset 3` skips the first 3 and shows the next 3, like page 2 of a list.',
        query: 'select product_name, unit_price\nfrom products\norder by unit_price desc\nlimit 3 offset 3;',
        after: 'Products 4, 5 and 6 by price.',
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
        text: 'Here each row is one customer, and many customers are in the same country. So the same country shows up many times.',
        query: 'select country\nfrom customers\norder by country;',
        shown: 5,
        after: '{rows} rows, one per customer, with lots of repeats.',
      },
      {
        title: 'DISTINCT removes repeats',
        text: '`select distinct` removes repeats: each value shows up only once. Here each country appears once.',
        query: 'select distinct country\nfrom customers\norder by country;',
        after: '{rows} different countries.',
        tip: 'With several columns, a row counts as a repeat only when all its columns are the same.',
      },
    ],
  },
  {
    topic: 'null',
    dataset: 'northwind',
    cards: [
      {
        title: 'NULL: no value',
        text: '**NULL** means "no value": nobody filled this cell in. It is not 0 and not an empty text, it is simply unknown.',
        query: 'select company_name, region\nfrom customers\norder by customer_id;',
        after: 'Many customers have no region, so their cell says NULL.',
      },
      {
        title: 'IS NULL finds them',
        text: 'To find cells with no value, write `where region is null`. Careful: `= null` finds nothing, because SQL cannot compare anything with an unknown value.',
        query: 'select company_name\nfrom customers\nwhere region is null\norder by customer_id;',
        after: '{rows} customers have no region.',
        tip: 'The opposite, `is not null`, keeps the rows that do have a value.',
      },
      {
        title: 'COALESCE fills the gaps',
        text: "`coalesce` puts a value in place of NULL. Here `coalesce(region, 'none')` shows the region, or the word none when there is no region.",
        query: "select company_name,\n  coalesce(region, 'none') as region\nfrom customers\norder by customer_id;",
        after: 'No NULLs left: the missing regions now say none.',
      },
    ],
  },
  {
    topic: 'text-search',
    dataset: 'northwind',
    cards: [
      {
        title: 'LIKE searches by a pattern',
        text: "`like` finds texts that fit a pattern. In the pattern `%` means \"any text here\", so `'Ch%'` finds names that start with Ch.",
        query: "select product_name\nfrom products\nwhere product_name like 'Ch%'\norder by product_id;",
        after: '{rows} product names start with Ch.',
        tip: "`_` means exactly one character: `'_hai'` finds Chai.",
      },
      {
        title: 'Anywhere in the text',
        text: '`%` on both sides finds the word anywhere in the text. `ilike` works like `like`, but does not care about capital letters.',
        query: "select product_name\nfrom products\nwhere product_name ilike '%sauce%'\norder by product_id;",
        mysql: "select product_name\nfrom products\nwhere product_name like '%sauce%'\norder by product_id;",
        after: '{rows} products have "sauce" in the name, even though it is written with a capital S.',
        tip: 'MySQL has no `ilike`, but there `like` usually ignores capital letters already.',
        mysqlText: '`%` on both sides finds the word anywhere in the text. In MySQL `like` usually does not care about capital letters.',
        mysqlTip: 'In PostgreSQL `like` does care about capital letters: there you write `ilike` instead.',
      },
    ],
  },
  {
    topic: 'conditions',
    dataset: 'northwind',
    cards: [
      {
        title: 'IN: one of a list',
        text: "`in` checks if a value is in a list. `country in ('UK', 'France')` is a short way to write `country = 'UK' or country = 'France'`.",
        query: "select company_name, country\nfrom customers\nwhere country in ('UK', 'France')\norder by customer_id;",
        after: '{rows} customers are in the UK or France.',
      },
      {
        title: 'BETWEEN: a range',
        text: '`between` keeps values in a range. `between 10 and 20` means from 10 to 20, and 10 and 20 themselves count too.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price between 10 and 20\norder by unit_price, product_id;',
        after: '{rows} products cost from 10 to 20.',
      },
      {
        title: 'CASE: a label for each row',
        text: '`case` gives each row a label by rules. It checks the `when` lines from the top and uses the first one that is true; `else` is for all the rest.',
        query:
          "select product_name, unit_price,\n  case\n    when unit_price > 50 then 'high'\n    when unit_price > 20 then 'mid'\n    else 'low'\n  end as price_level\nfrom products\norder by product_id;",
        after: 'Every product now has a price label: high, mid or low.',
      },
    ],
  },
  {
    topic: 'strings',
    dataset: 'northwind',
    cards: [
      {
        title: 'Gluing text together',
        text: "`||` glues texts together. Here `city || ', ' || country` turns two columns into one text, with a comma and a space between them.",
        query: "select company_name,\n  city || ', ' || country\n    as place\nfrom customers\norder by customer_id;",
        mysql: "select company_name,\n  concat(city, ', ', country)\n    as place\nfrom customers\norder by customer_id;",
        after: 'Two columns turned into one.',
        tip: 'In MySQL `||` means OR: use `concat()` there. PostgreSQL has `concat()` too.',
        mysqlText: "`concat()` glues texts together. Here `concat(city, ', ', country)` turns two columns into one text, with a comma and a space between them.",
        mysqlTip: 'Careful: in MySQL `||` means OR. PostgreSQL glues texts with `||`.',
      },
      {
        title: 'Changing text',
        text: '`lower()` writes a text in small letters, `upper()` in capitals. `length()` counts its characters.',
        query: 'select product_name,\n  lower(product_name) as small,\n  length(product_name) as len\nfrom products\norder by product_id;',
        mysql: 'select product_name,\n  lower(product_name) as small,\n  char_length(product_name) as len\nfrom products\norder by product_id;',
        tip: 'In MySQL `length()` counts bytes, so é counts twice: use `char_length()`.',
        mysqlText: '`lower()` writes a text in small letters, `upper()` in capitals. `char_length()` counts its characters.',
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
        text: 'You can do math with columns, like on a calculator. Here price × units in stock gives what the stock is worth; `as` names the new column.',
        query: 'select unit_price, units_in_stock,\n  unit_price * units_in_stock\n    as stock_value\nfrom products\norder by product_id;',
        after: 'The new column is worked out for every row.',
      },
      {
        title: 'Rounding',
        text: '`round(x, 2)` rounds a number to two digits after the point, like money. Here it tidies up the price with 17% tax added (`* 1.17`).',
        query: 'select unit_price,\n  round(unit_price * 1.17, 2)\n    as with_tax\nfrom products\norder by product_id;',
      },
      {
        title: 'Whole numbers divide whole',
        text: 'In PostgreSQL `7 / 2` gives 3, not 3.5: when both numbers are whole, the answer is whole too. Write `7 / 2.0` to get 3.5. `%` gives what is left over.',
        query: 'select 7 / 2 as whole,\n  round(7 / 2.0, 1) as exact,\n  7 % 2 as remainder;',
        mysql: 'select 7 div 2 as whole,\n  round(7 / 2, 1) as exact,\n  7 % 2 as remainder;',
        tip: 'In MySQL `/` always keeps the fraction; `div` divides whole numbers.',
        mysqlText: 'In MySQL `7 / 2` gives 3.5. To divide without the fraction, write `7 div 2`: that gives 3. `%` gives what is left over.',
        mysqlTip: 'In PostgreSQL `7 / 2` gives 3: whole numbers divide whole there.',
      },
    ],
  },
  {
    topic: 'dates-basics',
    dataset: 'northwind',
    cards: [
      {
        title: 'Parts of a date',
        text: '`extract` takes one part out of a date. Here `extract(year from order_date)` gives just the year; it works with `month` and `day` too.',
        query: 'select order_date,\n  extract(year from order_date)\n    as order_year\nfrom orders\norder by order_id;',
        after: 'Now you could count the orders of each year.',
      },
      {
        title: 'Moving a date',
        text: "To move a date, add an interval. Here `order_date + interval '7 days'` gives the date one week after the order.",
        query: "select order_date,\n  order_date + interval '7 days'\n    as week_later\nfrom orders\norder by order_id;",
        mysql: 'select order_date,\n  date_add(order_date,\n           interval 7 day)\n    as week_later\nfrom orders\norder by order_id;',
        tip: 'MySQL writes it `date_add(order_date, interval 7 day)`.',
        mysqlText: '`date_add` moves a date. Here `date_add(order_date, interval 7 day)` gives the date one week after the order.',
        mysqlTip: "PostgreSQL writes it `order_date + interval '7 days'`.",
      },
    ],
  },
  {
    topic: 'joins',
    dataset: 'northwind',
    cards: [
      {
        title: 'Tables are linked',
        text: 'Data is split across tables. Each product has a **category_id**: the number of its row in **categories**. That number links the two tables.',
        tables: [
          {
            name: 'products',
            orderBy: 'product_id',
            rows: 4,
            columns: [
              { name: 'product_id', about: 'the number of the product.' },
              { name: 'product_name', about: 'the name of the product.' },
              { name: 'category_id', about: 'the number of the product\'s category: find it in **categories**.' },
            ],
          },
          {
            name: 'categories',
            orderBy: 'category_id',
            rows: 4,
            columns: [
              { name: 'category_id', about: 'the number of the category. Products point to it.' },
              { name: 'category_name', about: 'the name of the category.' },
            ],
          },
        ],
        after: 'Chai has category_id 1, and row 1 of categories is Beverages: Chai is a drink.',
      },
      {
        title: 'JOIN puts linked rows together',
        text: '`join` glues each row to its partner in another table. `on` says which columns must match: here the category_id of the product and of the category.',
        query: 'select p.product_name,\n  c.category_name\nfrom products p\njoin categories c\n  on c.category_id = p.category_id\norder by p.product_id;',
        after: 'Every product now has its category name next to it.',
        tip: '`p` and `c` are short names for the tables, so `p.product_name` means "product_name of products".',
      },
      {
        title: 'JOIN drops rows without a partner',
        text: 'With `join`, a row that has no partner disappears. Customer FISSA has never ordered anything, GROSR has.',
        query:
          "select c.customer_id, o.order_id\nfrom customers c\njoin orders o\n  on o.customer_id = c.customer_id\nwhere c.customer_id\n  in ('FISSA', 'GROSR')\norder by c.customer_id, o.order_id;",
        after: 'Only the {rows} orders of GROSR are here. FISSA is gone.',
      },
      {
        title: 'LEFT JOIN keeps them',
        text: '`left join` keeps every row of the first table. Where there is no partner, the columns of the other table are NULL.',
        query:
          "select c.customer_id, o.order_id\nfrom customers c\nleft join orders o\n  on o.customer_id = c.customer_id\nwhere c.customer_id\n  in ('FISSA', 'GROSR')\norder by c.customer_id, o.order_id;",
        after: 'FISSA is back, with NULL where its order would be.',
        tip: '`right join` is the same the other way round: it keeps every row of the second table.',
      },
    ],
  },
  {
    topic: 'full-join',
    dataset: 'northwind',
    cards: [
      {
        title: 'FULL JOIN keeps both sides',
        text: '`full join` keeps the rows without a partner from both tables. Here: countries with customers but no suppliers, and countries with suppliers but no customers.',
        query:
          'select distinct\n  c.country as customers,\n  s.country as suppliers\nfrom customers c\nfull join suppliers s\n  on s.country = c.country\nwhere c.country is null\n   or s.country is null\norder by suppliers, customers;',
        mysql:
          'select c.country as customers,\n  s.country as suppliers\nfrom customers c\nleft join suppliers s\n  on s.country = c.country\nwhere s.country is null\nunion\nselect c.country, s.country\nfrom customers c\nright join suppliers s\n  on s.country = c.country\nwhere c.country is null;',
        unordered: true,
        shown: 5,
        after: '{rows} countries have only one side: the other column is NULL.',
        tip: 'MySQL has no `full join`: there you glue a `left join` and a `right join` with `union`.',
        mysqlText: 'A full join keeps the rows without a partner from both tables. MySQL has no `full join`, so here a `left join` and a `right join` are glued with `union`.',
        mysqlTip: 'PostgreSQL writes it in one go: `customers c full join suppliers s on …`.',
      },
    ],
  },
  {
    topic: 'self-cross-join',
    dataset: 'northwind',
    cards: [
      {
        title: 'A table joined to itself',
        text: 'Each employee has **reports_to**: the employee_id of their manager, in the same table. Join the table to itself under two names: `e` for the employee, `m` for the manager.',
        query: 'select e.last_name,\n  m.last_name as manager\nfrom employees e\njoin employees m\n  on m.employee_id = e.reports_to\norder by e.employee_id;',
        after: '{rows} employees have a manager. The top boss has none, so `join` leaves them out.',
      },
      {
        title: 'CROSS JOIN: every pair',
        text: '`cross join` pairs every row of one table with every row of the other, with no `on`. Useful when you need all combinations.',
        query: 'select e.last_name, c.category_name\nfrom employees e\ncross join categories c\norder by e.employee_id,\n  c.category_id;',
        after: '{rows} rows: every employee with every category.',
      },
    ],
  },
  {
    topic: 'group-by',
    dataset: 'northwind',
    cards: [
      {
        title: 'GROUP BY makes groups',
        text: '`group by country` puts the customers of each country into one group, and the result has one row per group. `count(*)` counts the rows of each group.',
        query: 'select country,\n  count(*) as customers\nfrom customers\ngroup by country\norder by country;',
        after: '{rows} countries, one row each.',
        tip: 'Every column in `select` must either be in `group by` or sit inside `count()`, `sum()` and the like.',
      },
      {
        title: 'HAVING filters the groups',
        text: '`where` filters rows before grouping; `having` filters the groups after. Here only countries with at least 5 customers stay.',
        query: 'select country,\n  count(*) as customers\nfrom customers\ngroup by country\nhaving count(*) >= 5\norder by country;',
        after: '{rows} countries have 5 or more customers.',
      },
    ],
  },
  {
    topic: 'aggregates',
    dataset: 'northwind',
    cards: [
      {
        title: 'Many rows into one number',
        text: '`count` counts rows, `sum` adds up, `avg` gives the average, `min` and `max` the smallest and the biggest. Here: one row about all the products.',
        query: 'select count(*) as products,\n  sum(units_in_stock) as stock,\n  max(unit_price) as top_price,\n  round(avg(unit_price), 2)\n    as avg_price\nfrom products;',
        tip: 'With `group by`, you get these numbers for each group instead of for the whole table.',
      },
      {
        title: 'Counting different values',
        text: '`count(distinct x)` counts each different value once. Here: how many orders there are, and how many different customers placed them.',
        query: 'select count(*) as orders,\n  count(distinct customer_id)\n    as customers\nfrom orders;',
      },
    ],
  },
  {
    topic: 'text-aggregation',
    dataset: 'northwind',
    cards: [
      {
        title: 'Many values into one text',
        text: '`string_agg` glues the values of a group into one text, with a separator between them. Here: the last names of the employees with each job title.',
        query: "select title,\n  string_agg(last_name, ', '\n    order by last_name) as names\nfrom employees\ngroup by title\norder by title;",
        mysql: "select title,\n  group_concat(last_name\n    order by last_name\n    separator ', ') as names\nfrom employees\ngroup by title\norder by title;",
        tip: "MySQL calls it `group_concat(x separator ', ')`.",
        mysqlText: '`group_concat` glues the values of a group into one text, with a separator between them. Here: the last names of the employees with each job title.',
        mysqlTip: "PostgreSQL calls it `string_agg(x, ', ')`.",
      },
    ],
  },
  {
    topic: 'conditional-aggregates',
    dataset: 'northwind',
    cards: [
      {
        title: 'Counting only some rows',
        text: '`count(*) filter (where …)` counts only the rows that match. Here, for each employee: all their orders, and the big ones with freight over 100.',
        query: 'select employee_id,\n  count(*) as orders,\n  count(*) filter\n    (where freight > 100) as big\nfrom orders\ngroup by employee_id\norder by employee_id;',
        mysql: 'select employee_id,\n  count(*) as orders,\n  sum(case when freight > 100\n      then 1 else 0 end) as big\nfrom orders\ngroup by employee_id\norder by employee_id;',
        after: 'Two counts side by side, in one query.',
        tip: 'MySQL has no `filter`: `sum(case when … then 1 else 0 end)` adds 1 for each matching row.',
        mysqlText: '`sum(case when … then 1 else 0 end)` adds 1 for each matching row, so it counts only those. Here, for each employee: all orders, and the ones with freight over 100.',
        mysqlTip: 'PostgreSQL can also write it `count(*) filter (where freight > 100)`.',
      },
    ],
  },
  {
    topic: 'set-operations',
    dataset: 'northwind',
    cards: [
      {
        title: 'UNION stacks results',
        text: '`union` puts the rows of two queries one under the other and removes repeats. Here: every country that has a customer or a supplier.',
        query: 'select country from customers\nunion\nselect country from suppliers\norder by country;',
        after: '{rows} countries in all.',
        tip: '`union all` keeps the repeats, and is faster.',
      },
      {
        title: 'EXCEPT and INTERSECT',
        text: '`except` keeps the rows of the first query that are not in the second; `intersect` keeps those in both. Here: countries with customers but no suppliers.',
        query: 'select country from customers\nexcept\nselect country from suppliers\norder by country;',
        after: '{rows} such countries.',
      },
    ],
  },
  {
    topic: 'subqueries',
    dataset: 'northwind',
    cards: [
      {
        title: 'A query inside a query',
        text: 'A query in brackets gives its answer to the outer query. Here the inner query works out the average price, and the outer one keeps the products above it.',
        query: 'select product_name, unit_price\nfrom products\nwhere unit_price > (\n  select avg(unit_price)\n  from products\n)\norder by unit_price desc,\n  product_id;',
        after: '{rows} products cost more than the average.',
      },
      {
        title: 'IN with a list from a query',
        text: '`in (select …)` checks a value against a list that another query makes. Here: the customers with at least one order whose freight is over 500.',
        query: 'select company_name\nfrom customers\nwhere customer_id in (\n  select customer_id\n  from orders\n  where freight > 500\n)\norder by customer_id;',
        after: '{rows} customers.',
        tip: '`exists (select …)` asks the same question: is there at least one such row?',
      },
    ],
  },
  {
    topic: 'casting',
    dataset: 'northwind',
    cards: [
      {
        title: 'Changing the type',
        text: '`cast(x as type)` turns a value into another type. Here: the date and time into just a date, and the freight into a whole number.',
        query: 'select order_date,\n  cast(order_date as date)\n    as order_day,\n  freight,\n  cast(freight as integer)\n    as whole\nfrom orders\norder by order_id;',
        mysql: 'select order_date,\n  cast(order_date as date)\n    as order_day,\n  freight,\n  cast(freight as signed)\n    as whole\nfrom orders\norder by order_id;',
        tip: 'PostgreSQL also writes it `order_date::date`. MySQL knows only `cast`.',
        mysqlText: '`cast(x as type)` turns a value into another type. Here: the date and time into just a date, and the freight into a whole number (`signed`).',
        mysqlTip: 'In MySQL a whole number is `signed`; PostgreSQL says `integer` and also has the short form `x::integer`.',
      },
    ],
  },
  {
    topic: 'data-cleaning',
    dataset: 'northwind',
    cards: [
      {
        title: 'Tidying text',
        text: 'Data typed by people is messy. `trim` cuts the spaces at the ends, `lower` writes in small letters, `nullif(x, \'\')` turns an empty text into NULL.',
        query: "select trim('  Alice  ') as name,\n  lower('ALICE@MAIL.COM')\n    as email,\n  nullif('', '') as phone;",
        after: 'Clean values, ready to compare and to count.',
      },
      {
        title: 'Finding repeats',
        text: 'To find values that appear more than once, group by them and keep the groups with `having count(*) > 1`. Here: cities with several customers.',
        query: 'select city, count(*) as customers\nfrom customers\ngroup by city\nhaving count(*) > 1\norder by city;',
        after: '{rows} cities have more than one customer.',
      },
    ],
  },
  {
    topic: 'pagination',
    dataset: 'northwind',
    cards: [
      {
        title: 'Pages with OFFSET',
        text: 'To show page 3 with 5 rows on a page, skip two pages (`offset 10`) and take 5 (`limit 5`). Sort by something unique, like the id, so pages never overlap.',
        query: 'select product_id, product_name\nfrom products\norder by product_id\nlimit 5 offset 10;',
        after: 'Products 11 to 15.',
      },
      {
        title: 'Continue after the last row',
        text: 'On big tables `offset` gets slow: the skipped rows are still read. Instead, remember the last id shown and ask for the rows after it.',
        query: 'select product_id, product_name\nfrom products\nwhere product_id > 15\norder by product_id\nlimit 5;',
        after: 'The next page, without reading the first 15 rows.',
      },
    ],
  },
]
