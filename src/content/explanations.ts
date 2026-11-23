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
  {
    topic: 'cte',
    dataset: 'northwind',
    cards: [
      {
        title: 'WITH gives a step a name',
        text: '`with` names a query, and the next query uses it like a table. A hard query becomes steps you read from the top. Here: first the big orders, then count them per customer.',
        query:
          'with big_orders as (\n  select order_id, customer_id\n  from orders\n  where freight > 500\n)\nselect customer_id,\n  count(*) as big\nfrom big_orders\ngroup by customer_id\norder by customer_id;',
        after: '{rows} customers, each with their number of big orders.',
        tip: 'The name exists only inside this one query.',
      },
      {
        title: 'Several steps',
        text: 'Steps are separated by commas, and each step can use the ones before it. Here: customers per country first, then only the countries with 5 or more.',
        query:
          'with per_country as (\n  select country,\n    count(*) as customers\n  from customers\n  group by country\n),\nbig as (\n  select * from per_country\n  where customers >= 5\n)\nselect * from big\norder by country;',
        after: '{rows} countries.',
      },
    ],
  },
  {
    topic: 'ranking',
    dataset: 'northwind',
    cards: [
      {
        title: 'ROW_NUMBER numbers the rows',
        text: '`row_number() over (order by …)` numbers the rows in that order: 1, 2, 3… The rows themselves stay. Here: products from the most expensive.',
        query:
          'select product_name, unit_price,\n  row_number() over (\n    order by unit_price desc,\n      product_id\n  ) as place\nfrom products\norder by place;',
        after: 'Every product keeps its row and gets a place.',
      },
      {
        title: 'Places inside each group',
        text: '`partition by category_id` starts the numbering again in each category. `rank()` gives equal prices the same place.',
        query:
          'select category_id, product_name,\n  rank() over (\n    partition by category_id\n    order by unit_price desc\n  ) as place\nfrom products\norder by category_id, place,\n  product_id;',
        shown: 5,
        after: 'Each category has its own 1st place.',
        tip: '`dense_rank()` is like `rank()` but leaves no gaps after a tie: 1, 1, 2 instead of 1, 1, 3.',
      },
    ],
  },
  {
    topic: 'lag-lead',
    dataset: 'northwind',
    cards: [
      {
        title: 'The previous row',
        text: '`lag(x)` takes x from the previous row, `lead(x)` from the next one, in the order of `over (order by …)`. The first row has no previous one, so it gets NULL.',
        query:
          'select order_id, freight,\n  lag(freight) over (\n    order by order_id\n  ) as previous\nfrom orders\norder by order_id;',
      },
      {
        title: 'The previous order of the same customer',
        text: 'With `partition by customer_id`, each customer gets their own chain: `lag` looks only at the earlier orders of the same customer.',
        query:
          'select customer_id, order_date,\n  lag(order_date) over (\n    partition by customer_id\n    order by order_id\n  ) as previous\nfrom orders\norder by customer_id, order_id;',
        shown: 5,
        after: 'Now you can see how long each customer waited between orders.',
      },
    ],
  },
  {
    topic: 'window-frames',
    dataset: 'northwind',
    cards: [
      {
        title: 'A running total',
        text: '`sum(x) over (order by …)` adds up the rows so far: each row shows the total up to and including itself.',
        query:
          'select order_id, freight,\n  sum(freight) over (\n    order by order_id\n  ) as running\nfrom orders\norder by order_id;',
        after: 'The total grows with every order.',
      },
      {
        title: 'A moving window',
        text: '`rows between 2 preceding and current row` looks at this row and the two before it. Here: the average freight of the last 3 orders.',
        query:
          'select order_id, freight,\n  round(avg(freight) over (\n    order by order_id\n    rows between 2 preceding\n      and current row\n  ), 2) as avg3\nfrom orders\norder by order_id;',
        tip: 'Without `rows between …`, the window runs from the first row to this one: a running total.',
      },
    ],
  },
  {
    topic: 'subtotals',
    dataset: 'northwind',
    cards: [
      {
        title: 'ROLLUP adds a total',
        text: '`rollup` adds a total row after the groups. In that row the grouped column is NULL: there it means "all".',
        query:
          'select category_id,\n  count(*) as products\nfrom products\nwhere category_id <= 3\ngroup by rollup (category_id)\norder by grouping(category_id),\n  category_id;',
        mysql:
          'select category_id,\n  count(*) as products\nfrom products\nwhere category_id <= 3\ngroup by category_id with rollup\norder by grouping(category_id),\n  category_id;',
        after: 'The last row counts all three categories together.',
        tip: 'MySQL writes it `group by category_id with rollup`.',
        mysqlText: '`with rollup` adds a total row after the groups. In that row the grouped column is NULL: there it means "all".',
        mysqlTip: 'PostgreSQL writes it `group by rollup (category_id)`, and also has `cube` and `grouping sets`.',
      },
    ],
  },
  {
    topic: 'lateral',
    dataset: 'northwind',
    cards: [
      {
        title: 'A small query for each row',
        text: '`lateral` lets a subquery in `from` use the columns of the row next to it. Here: for each category, its 2 most expensive products.',
        query:
          'select c.category_name,\n  p.product_name, p.unit_price\nfrom categories c\ncross join lateral (\n  select product_id, product_name,\n    unit_price\n  from products\n  where category_id = c.category_id\n  order by unit_price desc,\n    product_id\n  limit 2\n) p\norder by c.category_id,\n  p.unit_price desc, p.product_id;',
        shown: 4,
        after: 'Two rows for each category.',
      },
    ],
  },
  {
    topic: 'date-series',
    dataset: 'northwind',
    cards: [
      {
        title: 'Every day, also the empty ones',
        text: 'A day without orders is not in `group by` at all. `generate_series` makes every day of a range, and `left join` adds the orders: empty days get 0.',
        query:
          "select d::date as day,\n  count(o.order_id) as orders\nfrom generate_series(\n  date '1996-07-01',\n  date '1996-07-10',\n  interval '1 day') d\nleft join orders o\n  on o.order_date::date = d::date\ngroup by d\norder by d;",
        mysql:
          "with recursive days as (\n  select date '1996-07-01' as day\n  union all\n  select day + interval 1 day\n  from days\n  where day < '1996-07-10'\n)\nselect days.day,\n  count(o.order_id) as orders\nfrom days\nleft join orders o\n  on date(o.order_date) = days.day\ngroup by days.day\norder by days.day;",
        shown: 6,
        after: 'The first order came on 4 July; the days before it are there too, with 0.',
        tip: 'MySQL has no `generate_series`: a recursive `with` makes the days there.',
        mysqlText: 'A day without orders is not in `group by` at all. MySQL has no `generate_series`, so a recursive `with` makes every day of the range, and `left join` adds the orders.',
        mysqlTip: 'PostgreSQL makes the days in one go: `generate_series(start, end, interval \'1 day\')`.',
      },
    ],
  },
  {
    topic: 'pivot',
    dataset: 'northwind',
    cards: [
      {
        title: 'Values into columns',
        text: 'A pivot turns values into columns. Write one `sum(case …)` per value: here a column for each shipping company (ship_via 1, 2, 3) and a row for each employee.',
        query:
          'select employee_id,\n  sum(case when ship_via = 1\n      then 1 else 0 end) as ship1,\n  sum(case when ship_via = 2\n      then 1 else 0 end) as ship2,\n  sum(case when ship_via = 3\n      then 1 else 0 end) as ship3\nfrom orders\ngroup by employee_id\norder by employee_id;',
        after: 'A small table: employees down, shipping companies across.',
      },
    ],
  },
  {
    topic: 'recursive',
    dataset: 'northwind',
    cards: [
      {
        title: 'Walking down a hierarchy',
        text: 'A recursive `with` repeats its second part on the rows it found the time before, until nothing new comes. Here: the boss, then their staff, then the staff of those.',
        query:
          'with recursive chain as (\n  select employee_id, last_name,\n    1 as depth\n  from employees\n  where reports_to is null\n  union all\n  select e.employee_id, e.last_name,\n    c.depth + 1\n  from employees e\n  join chain c\n    on e.reports_to = c.employee_id\n)\nselect * from chain\norder by depth, employee_id;',
        shown: 5,
        after: 'depth 1 is the boss, depth 2 reports to the boss, and so on.',
      },
    ],
  },
  {
    topic: 'gaps-islands',
    dataset: 'northwind',
    cards: [
      {
        title: 'Runs of days in a row',
        text: 'An island is a run without gaps: here, days with orders one after another. Take away the row number from the date: inside a run the result stays the same.',
        query:
          "with days as (\n  select distinct\n    order_date::date as day\n  from orders\n  where order_date < '1996-08-01'\n),\nmarked as (\n  select day, day - cast(\n    row_number() over (order by day)\n    as int) as grp\n  from days\n)\nselect min(day) as first_day,\n  max(day) as last_day,\n  count(*) as n_days\nfrom marked\ngroup by grp\norder by first_day;",
        mysql:
          "with days as (\n  select distinct\n    cast(order_date as date) as day\n  from orders\n  where order_date < '1996-08-01'\n),\nmarked as (\n  select day, date_sub(day,\n    interval row_number() over\n    (order by day) day) as grp\n  from days\n)\nselect min(day) as first_day,\n  max(day) as last_day,\n  count(*) as n_days\nfrom marked\ngroup by grp\norder by first_day;",
        after: 'Each row is one run of days with orders in July 1996: Monday to Friday, with the weekends as gaps.',
      },
    ],
  },
  {
    topic: 'dates-advanced',
    dataset: 'northwind',
    cards: [
      {
        title: 'Cutting dates to the month',
        text: "`date_trunc('month', d)` turns a date into the first day of its month, so all the orders of one month fall into one group.",
        query:
          "select\n  date_trunc('month', order_date)\n    ::date as month,\n  count(*) as orders\nfrom orders\ngroup by 1\norder by 1;",
        mysql:
          "select\n  cast(date_format(order_date,\n    '%Y-%m-01') as date) as month,\n  count(*) as orders\nfrom orders\ngroup by 1\norder by 1;",
        after: 'One row for each month of orders.',
        tip: "`group by 1` means: group by the first column of `select`.",
        mysqlText: "MySQL has no `date_trunc`: `date_format(d, '%Y-%m-01')` writes the first day of the month, and `cast` turns that text back into a date.",
        mysqlTip: "PostgreSQL does it in one step: `date_trunc('month', order_date)`.",
      },
    ],
  },
  {
    topic: 'ddl',
    dataset: 'northwind',
    cards: [
      {
        title: 'CREATE TABLE describes a table',
        text: '`create table` names a new table and lists its columns, each with a type: whole numbers, text, dates… Here we make a table, add a row and read it back.',
        query: "create table notes (\n  id integer primary key,\n  title text not null,\n  added date\n);\ninsert into notes\nvalues (1, 'Hello', '2026-01-05');\nselect * from notes;",
        tip: 'Nothing here is saved: examples run in a sandbox that is thrown away.',
      },
      {
        title: 'An id that fills itself in',
        text: '`generated always as identity` makes the database number the rows itself: 1, 2, 3… You insert only the other columns.',
        query: "create table tags (\n  id integer generated always\n    as identity primary key,\n  name text\n);\ninsert into tags (name)\nvalues ('red'), ('blue');\nselect * from tags;",
        mysql: "create table tags (\n  id integer auto_increment\n    primary key,\n  name text\n);\ninsert into tags (name)\nvalues ('red'), ('blue');\nselect * from tags;",
        tip: 'MySQL writes it `auto_increment`.',
        mysqlText: '`auto_increment` makes the database number the rows itself: 1, 2, 3… You insert only the other columns.',
        mysqlTip: 'PostgreSQL writes it `generated always as identity`.',
      },
    ],
  },
  {
    topic: 'constraints',
    dataset: 'northwind',
    cards: [
      {
        title: 'Rules the data must follow',
        text: 'Constraints are rules the database checks on every change: `primary key`, `unique`, `not null`, `check (…)`. Here the age is negative, so the row is refused.',
        query: "create table people (\n  id integer primary key,\n  email varchar(100) unique,\n  age integer check (age >= 0)\n);\ninsert into people\nvalues (1, 'ann@mail.com', -5);",
        fails: true,
        after: 'Nothing was added: the database refused the row.',
      },
      {
        title: 'A foreign key points to a row',
        text: 'A foreign key says: this column must match a row in another table. There is no team 7, so the player is refused.',
        query: "create table teams (\n  id integer primary key\n);\ncreate table players (\n  name text,\n  team_id integer,\n  foreign key (team_id)\n    references teams (id)\n);\ninsert into players\nvalues ('Ann', 7);",
        fails: true,
        after: 'Add team 7 first, and the same insert works.',
      },
    ],
  },
  {
    topic: 'dml',
    dataset: 'northwind',
    cards: [
      {
        title: 'UPDATE changes rows',
        text: '`update` changes rows: `set` says what to change, `where` which rows. Without `where`, every row of the table changes!',
        query: 'update products\nset unit_price = unit_price * 2\nwhere product_id = 1;\nselect product_name, unit_price\nfrom products\nwhere product_id = 1;',
        after: 'Chai now costs twice as much (only inside this example).',
      },
      {
        title: 'INSERT adds, DELETE removes',
        text: '`insert into` adds rows: list the columns, then the values in the same order. `delete from … where …` removes the rows that match.',
        query: "insert into categories\n  (category_id, category_name)\nvalues (9, 'Snacks');\nselect category_id, category_name\nfrom categories\norder by category_id desc;",
        shown: 3,
        after: 'Snacks is category 9 now.',
        tip: 'PostgreSQL can show the changed rows at once with `returning *`; MySQL cannot.',
      },
    ],
  },
  {
    topic: 'upsert',
    dataset: 'northwind',
    cards: [
      {
        title: 'Insert, or update if it exists',
        text: 'An upsert adds a row, or updates it when a row with that key is already there. Category 1 exists, so its name changes to Drinks.',
        query:
          "insert into categories\n  (category_id, category_name)\nvalues (1, 'Drinks')\non conflict (category_id)\ndo update set category_name =\n  excluded.category_name;\nselect category_id, category_name\nfrom categories\nwhere category_id = 1;",
        mysql:
          "insert into categories\n  (category_id, category_name)\nvalues (1, 'Drinks') as new\non duplicate key update\n  category_name =\n    new.category_name;\nselect category_id, category_name\nfrom categories\nwhere category_id = 1;",
        tip: '`excluded` is the row you tried to insert. MySQL writes `on duplicate key update`.',
        mysqlText: 'An upsert adds a row, or updates it when a row with that key is already there. In MySQL: `on duplicate key update`. Category 1 exists, so its name changes.',
        mysqlTip: 'PostgreSQL writes `on conflict (category_id) do update set …`.',
      },
    ],
  },
  {
    topic: 'merge',
    dataset: 'northwind',
    cards: [
      {
        title: 'MERGE: update or insert, row by row',
        text: '`merge` compares new rows with a table: it updates the ones that match and inserts the others. Here category 1 is renamed and category 9 is added.',
        query:
          "merge into categories c\nusing (values (1, 'Drinks'),\n  (9, 'Snacks')) as v(id, name)\non c.category_id = v.id\nwhen matched then\n  update set category_name = v.name\nwhen not matched then\n  insert (category_id,\n    category_name)\n  values (v.id, v.name);\nselect category_id, category_name\nfrom categories\norder by category_id;",
        mysql: null,
        mysqlText: 'MySQL has no `merge`. The same job is done by `insert … on duplicate key update` (see Upsert). This example is in PostgreSQL.',
      },
    ],
  },
  {
    topic: 'transactions',
    dataset: 'northwind',
    cards: [
      {
        title: 'All or nothing',
        text: 'Changes between `begin` and `commit` happen together or not at all. `rollback` cancels all of them. Here the stock is set to 0, then rolled back.',
        query: 'begin;\nupdate products\nset units_in_stock = 0\nwhere product_id = 1;\nrollback;\nselect units_in_stock\nfrom products\nwhere product_id = 1;',
        after: 'The stock is still there: the rollback undid the update.',
        tip: '`savepoint` marks a point you can roll back to without losing everything.',
        mysqlTip: 'In MySQL `create`, `alter` and `drop` commit at once and cannot be rolled back.',
      },
    ],
  },
  {
    topic: 'data-loading',
    dataset: 'northwind',
    cards: [
      {
        title: 'Loading a whole file',
        text: "`copy … from 'file.csv'` loads a file into a table in one go, much faster than many inserts. `header` skips the line with the column names.",
        code: "copy customer_import\nfrom 'customers.csv'\nwith (format csv, header);",
        mysqlCode: "load data local infile\n  'customers.csv'\ninto table customer_import\nfields terminated by ','\nignore 1 lines;",
        tip: 'Load into a staging table first, check and clean the rows there, then copy the good ones on.',
        mysqlText: "MySQL loads a file with `load data local infile`. `fields terminated by ','` says how values are split, `ignore 1 lines` skips the header.",
      },
    ],
  },
  {
    topic: 'temp-tables',
    dataset: 'northwind',
    cards: [
      {
        title: 'A table for this session only',
        text: 'A temporary table lives until you disconnect, and only you can see it. Handy to keep the result of a step and use it several times.',
        query: 'create temp table big as\nselect order_id, freight\nfrom orders\nwhere freight > 500;\nselect count(*) as big_orders\nfrom big;',
        mysql: 'create temporary table big as\nselect order_id, freight\nfrom orders\nwhere freight > 500;\nselect count(*) as big_orders\nfrom big;',
        tip: 'MySQL writes `create temporary table`.',
        mysqlText: '`create temporary table` makes a table that lives until you disconnect, and only you can see it. Handy to keep the result of a step and use it several times.',
      },
    ],
  },
  {
    topic: 'views',
    dataset: 'northwind',
    cards: [
      {
        title: 'A saved query with a name',
        text: 'A view is a query saved under a name, used like a table. It stores no data: each time you read it, its query runs again on fresh data.',
        query: 'create view expensive as\nselect product_name, unit_price\nfrom products\nwhere unit_price > 50;\nselect * from expensive\norder by unit_price desc;',
        after: 'The view hides the condition: everyone reads the same list the same way.',
      },
    ],
  },
  {
    topic: 'materialized-views',
    dataset: 'northwind',
    cards: [
      {
        title: 'A view that keeps its result',
        text: 'A materialized view stores the result of its query, so reading it is fast. It does not follow changes: `refresh materialized view` updates it.',
        query: 'create materialized view\n  per_category as\nselect category_id,\n  count(*) as products\nfrom products\ngroup by category_id;\nselect * from per_category\norder by category_id;',
        mysql: null,
        mysqlText: 'MySQL has no materialized views. The usual way is an ordinary table you fill with `insert … select` and refresh yourself. This example is in PostgreSQL.',
      },
    ],
  },
  {
    topic: 'normalization',
    dataset: 'northwind',
    cards: [
      {
        title: 'Each fact in one place',
        text: "Normalization means each fact is stored once. An order keeps only the customer's id; the company name lives in **customers**, so you change it in one place.",
        tables: [
          {
            name: 'orders',
            orderBy: 'order_id',
            where: "customer_id = 'ALFKI'",
            rows: 4,
            columns: [
              { name: 'order_id', about: 'the number of the order.' },
              { name: 'customer_id', about: 'who ordered: a pointer to a row of **customers**, not a copy of its name.' },
              { name: 'order_date', about: 'when the order was placed.' },
            ],
          },
          {
            name: 'customers',
            orderBy: 'customer_id',
            where: "customer_id = 'ALFKI'",
            columns: [
              { name: 'customer_id', about: 'the id that orders point to.' },
              { name: 'company_name', about: 'stored once, here, whatever the number of orders.' },
            ],
          },
        ],
        after: "All of ALFKI's orders point to one row of customers.",
      },
    ],
  },
  {
    topic: 'json',
    dataset: 'northwind',
    cards: [
      {
        title: 'Reading values out of JSON',
        text: "`->>` takes a value out of JSON as text: `doc ->> 'name'`. `->` keeps it as JSON so you can go deeper: `doc -> 'tags' ->> 0` is the first tag.",
        query:
          "select doc ->> 'name' as name,\n  doc -> 'tags' ->> 0 as first_tag\nfrom (select '{\"name\": \"Chai\",\n  \"tags\": [\"tea\", \"hot\"]}'::jsonb\n  as doc) t;",
        mysql:
          "select doc ->> '$.name' as name,\n  doc ->> '$.tags[0]' as first_tag\nfrom (select cast('{\"name\":\n  \"Chai\", \"tags\": [\"tea\",\n  \"hot\"]}' as json) as doc) t;",
        mysqlText: "In MySQL `->>` takes a path: `doc ->> '$.name'` is the name, `'$.tags[0]'` the first tag (counting from 0).",
        mysqlTip: "PostgreSQL writes keys straight away: `doc ->> 'name'`.",
        tip: "MySQL writes a path instead: `doc ->> '$.name'`.",
      },
    ],
  },
  {
    topic: 'arrays',
    dataset: 'northwind',
    cards: [
      {
        title: 'Several values in one cell',
        text: 'An array holds a list in one cell. `array_agg` collects values into one, `unnest` turns an array back into rows. Here: the products of each order.',
        query: 'select order_id,\n  array_agg(product_id\n    order by product_id) as items\nfrom order_details\nwhere order_id < 10251\ngroup by order_id\norder by order_id;',
        mysql: null,
        mysqlText: 'MySQL has no arrays. Keep one value per row in a separate table, or use a JSON array. This example is in PostgreSQL.',
      },
    ],
  },
  {
    topic: 'generated-columns',
    dataset: 'northwind',
    cards: [
      {
        title: 'A column worked out by itself',
        text: 'A generated column is computed from other columns of the row, and the database keeps it up to date. You never insert it yourself.',
        query:
          'create table basket (\n  price numeric(10, 2),\n  qty integer,\n  total numeric(10, 2)\n    generated always as\n    (price * qty) stored\n);\ninsert into basket (price, qty)\nvalues (2.50, 4);\nselect * from basket;',
        after: 'total is 10.00: 2.50 × 4, worked out on insert.',
      },
    ],
  },
  {
    topic: 'introspection',
    dataset: 'northwind',
    cards: [
      {
        title: 'The database describes itself',
        text: 'Every database lists its own tables and columns in `information_schema`. Here: the columns of the table categories, in order.',
        query: "select column_name\nfrom information_schema.columns\nwhere table_name = 'categories'\norder by ordinal_position;",
        mysql: "select column_name\nfrom information_schema.columns\nwhere table_name = 'categories'\n  and table_schema = database()\norder by ordinal_position;",
        mysqlText: 'Every database lists its own tables and columns in `information_schema`. In MySQL add `table_schema = database()`: the server holds many databases.',
        tip: 'In MySQL add `table_schema = database()`: one server holds many databases.',
      },
    ],
  },
  {
    topic: 'privileges',
    dataset: 'northwind',
    cards: [
      {
        title: 'Who may do what',
        text: 'A role is a user or a group. `grant` gives it a right on a table, `revoke` takes it back. Here reader may read products, but not change them.',
        query:
          "create role reader;\ngrant select on products\n  to reader;\nselect has_table_privilege(\n    'reader', 'products', 'select'\n  ) as can_read,\n  has_table_privilege(\n    'reader', 'products', 'update'\n  ) as can_update;",
        mysql: null,
        mysqlText: "In MySQL accounts are `'name'@'host'`: `create user 'reader'@'%'`, then `grant select on shop.products to 'reader'@'%'`. This example is in PostgreSQL.",
      },
    ],
  },
  {
    topic: 'functions',
    dataset: 'northwind',
    cards: [
      {
        title: 'Your own function',
        text: 'A function is SQL with a name and inputs, used like `round()` or `upper()`. Here `with_tax` adds 17% to a price.',
        query:
          'create function with_tax(\n  price numeric\n) returns numeric\nlanguage sql\nreturn round(price * 1.17, 2);\nselect product_name,\n  with_tax(unit_price) as price\nfrom products\norder by product_id;',
        mysql:
          'create function with_tax(\n  price decimal(10, 2)\n) returns decimal(10, 2)\ndeterministic\nreturn round(price * 1.17, 2);\nselect product_name,\n  with_tax(unit_price) as price\nfrom products\norder by product_id;',
        tip: 'MySQL wants `deterministic` when the same input always gives the same answer.',
      },
    ],
  },
  {
    topic: 'procedures',
    dataset: 'northwind',
    cards: [
      {
        title: 'A procedure does steps',
        text: 'A procedure is a named set of steps you start with `call`. It can change data: here it adds stock to a product.',
        query:
          'create procedure restock(\n  pid integer, amount integer)\nlanguage sql\nas $$\n  update products\n  set units_in_stock =\n    units_in_stock + amount\n  where product_id = pid;\n$$;\ncall restock(1, 10);\nselect units_in_stock\nfrom products\nwhere product_id = 1;',
        mysql:
          'create procedure restock(\n  pid integer, amount integer)\n  update products\n  set units_in_stock =\n    units_in_stock + amount\n  where product_id = pid;\ncall restock(1, 10);\nselect units_in_stock\nfrom products\nwhere product_id = 1;',
        after: 'Product 1 got 10 more units.',
        tip: 'A function returns a value you use in a query; a procedure is run on its own with `call`.',
      },
    ],
  },
  {
    topic: 'control-flow',
    dataset: 'northwind',
    cards: [
      {
        title: 'IF inside a function',
        text: 'Inside a function you can use `if … then … else`, variables and loops, as in other programming languages. Here the answer depends on a number.',
        query:
          "create function size_of(n bigint)\nreturns text language plpgsql as $$\nbegin\n  if n > 50 then return 'big';\n  elsif n > 10 then return 'mid';\n  else return 'small';\n  end if;\nend $$;\nselect size_of(count(*)) as verdict\nfrom products;",
        mysql:
          "create function size_of(n bigint)\nreturns text deterministic\nbegin\n  if n > 50 then return 'big';\n  elseif n > 10 then return 'mid';\n  else return 'small';\n  end if;\nend;\nselect size_of(count(*)) as verdict\nfrom products;",
        tip: 'MySQL writes `elseif`; PostgreSQL writes `elsif`.',
      },
    ],
  },
  {
    topic: 'triggers',
    dataset: 'northwind',
    cards: [
      {
        title: 'Code that runs by itself',
        text: 'A trigger runs by itself when rows change. Here every price change is written to a log: `new` is the row after the change.',
        query:
          'create table price_log (\n  product_id integer,\n  new_price numeric\n);\ncreate function log_price()\nreturns trigger\nlanguage plpgsql as $$\nbegin\n  insert into price_log\n  values (new.product_id,\n    new.unit_price);\n  return new;\nend $$;\ncreate trigger on_price\nafter update on products\nfor each row\nexecute function log_price();\nupdate products\nset unit_price = 20\nwhere product_id = 1;\nselect * from price_log;',
        mysql:
          'create table price_log (\n  product_id integer,\n  new_price decimal(10, 2)\n);\ncreate trigger on_price\nafter update on products\nfor each row\ninsert into price_log\nvalues (new.product_id,\n  new.unit_price);\nupdate products\nset unit_price = 20\nwhere product_id = 1;\nselect * from price_log;',
        after: 'The update wrote its own log row.',
        mysqlText: 'A trigger runs by itself when rows change. In MySQL its body is written right inside `create trigger`. Here every price change goes to a log.',
        tip: 'In PostgreSQL the trigger calls a function; MySQL writes the body inside `create trigger`.',
      },
    ],
  },
  {
    topic: 'indexes',
    dataset: 'delivery',
    cards: [
      {
        title: 'Without an index: read everything',
        text: '`explain` shows how the database will run a query. With no index on customer_id, it has to read every order and check each one: a Seq Scan.',
        query: 'explain (costs off)\nselect * from orders\nwhere customer_id = 1234;',
        mysql: null,
        mysqlText: 'MySQL also has `explain`, but it prints a table: the type column says ALL when every row is read. This example is in PostgreSQL.',
        after: 'Seq Scan means: read the whole table, row by row.',
      },
      {
        title: 'With an index: jump to the rows',
        text: 'An index is a sorted copy of a column with pointers to the rows, like the index at the back of a book. Now the database jumps straight to customer 1234.',
        query: 'create index on orders\n  (customer_id);\nanalyze orders;\nexplain (costs off)\nselect * from orders\nwhere customer_id = 1234;',
        mysql: null,
        mysqlText: 'MySQL indexes work the same way: `create index … on orders (customer_id)`. Its `explain` then names the index in the key column.',
        after: 'Index Scan (here Bitmap Index Scan) means the index is used: only the matching rows are read.',
        tip: 'Indexes make reading faster and writing a little slower: each change updates them too.',
      },
    ],
  },
  {
    topic: 'partial-covering-indexes',
    dataset: 'delivery',
    cards: [
      {
        title: 'An index of some rows only',
        text: 'A partial index keeps only some rows: here only refunded orders. It is small, and a query asking for exactly those rows can use it.',
        query:
          "create index on orders (created_at)\n  where status = 'refunded';\nanalyze orders;\nexplain (costs off)\nselect * from orders\nwhere status = 'refunded'\n  and created_at >= '2026-06-01';",
        mysql: null,
        mysqlText: 'MySQL has no partial indexes and no `include`. An index on (status, created_at) does a similar job. This example is in PostgreSQL.',
        tip: '`include (total)` adds a column to an index, so a query can be answered from the index alone.',
      },
    ],
  },
  {
    topic: 'query-plans',
    dataset: 'delivery',
    cards: [
      {
        title: 'Reading a plan',
        text: '`explain` shows the plan: the steps the database will take. Read it from the innermost line out: here two tables are read, joined, then grouped.',
        query: 'explain (costs off)\nselect c.city, count(*)\nfrom orders o\njoin customers c\n  on c.id = o.customer_id\ngroup by c.city;',
        mysql: null,
        tip: '`explain analyze` also runs the query and shows the real time of each step.',
        mysqlText: 'MySQL has `explain` too, but prints a table with a row per table read. This plan is from PostgreSQL.',
      },
    ],
  },
  {
    topic: 'full-text',
    dataset: 'northwind',
    cards: [
      {
        title: 'Searching for words',
        text: 'Full-text search finds words, not letters: `to_tsvector` cuts a text into words, `to_tsquery` is what you look for, `@@` checks if they match.',
        query: "select product_name\nfrom products\nwhere to_tsvector('english',\n    product_name)\n  @@ to_tsquery('english', 'sauce')\norder by product_id;",
        mysql: "alter table products\n  add fulltext (product_name);\nselect product_name\nfrom products\nwhere match (product_name)\n  against ('sauce')\norder by product_id;",
        mysqlText: 'MySQL needs a `fulltext` index first. Then `match (column) against (\'word\')` finds the rows that contain the word.',
        mysqlTip: 'PostgreSQL works without an index too (`to_tsvector … @@ to_tsquery`); a GIN index makes it fast.',
        tip: "With an `english` dictionary, 'sauce' also finds 'sauces'. A GIN index makes the search fast.",
      },
    ],
  },
  {
    topic: 'partitioning',
    dataset: 'northwind',
    cards: [
      {
        title: 'One table in parts',
        text: 'Partitioning splits a big table into parts by a key, here by year. You read and write the table as usual; each row goes into its part by itself.',
        query:
          "create table sales (\n  sold_on date, amount integer\n) partition by range (sold_on);\ncreate table sales_2025\n  partition of sales for values\n  from ('2025-01-01')\n  to ('2026-01-01');\ncreate table sales_2026\n  partition of sales for values\n  from ('2026-01-01')\n  to ('2027-01-01');\ninsert into sales values\n  ('2025-05-01', 10),\n  ('2026-02-01', 20);\nselect tableoid::regclass\n  as part, sold_on, amount\nfrom sales\norder by sold_on;",
        mysql: null,
        mysqlText: 'MySQL lists the parts inside `create table`: `partition by range (year(sold_on)) (partition p2025 values less than (2026), …)`. This example is in PostgreSQL.',
        after: 'Each row went into the part for its year.',
      },
    ],
  },
  {
    topic: 'locks-isolation',
    dataset: 'northwind',
    cards: [
      {
        title: 'Two people, one row',
        text: 'When two sessions change the same row, the first one locks it, and the second waits until the first commits or rolls back.',
        steps: [
          { session: 'A', sql: 'begin;\nupdate products\nset units_in_stock = 0\nwhere product_id = 1;', note: 'A changes the row and holds a lock on it until the end of its transaction.' },
          { session: 'B', sql: 'update products\nset units_in_stock = 5\nwhere product_id = 1;', note: 'B wants the same row, so it waits.' },
          { session: 'A', sql: 'commit;', note: "A finishes. Now B's update goes through, and the stock ends up 5." },
        ],
        tip: '`select … for update` locks rows you are about to change; `nowait` or `skip locked` say what to do instead of waiting.',
        mysqlTip: "MySQL locks rows the same way. Its default isolation level is repeatable read; PostgreSQL's is read committed.",
      },
    ],
  },
]
