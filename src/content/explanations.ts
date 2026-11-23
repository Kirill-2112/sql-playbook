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
        table: {
          name: 'products',
          orderBy: 'product_id',
          columns: [
            { name: 'product_id', about: 'the number of the product. Every product has its own.' },
            { name: 'product_name', about: 'the name of the product.' },
            { name: 'unit_price', about: 'the price of one unit.' },
            { name: 'units_in_stock', about: 'how many units are in the warehouse.' },
          ],
        },
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
]
