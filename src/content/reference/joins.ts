import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const PEOPLE = `with person(id, name) as (
  select 1, 'Ann' union all select 2, 'Bob' union all select 3, 'Cy'
),
pet(owner_id, pet) as (
  select 1, 'cat' union all select 1, 'dog' union all select 4, 'fish'
)`

export const joinEntries: ReferenceEntry[] = [
  {
    id: 'inner-join',
    name: 'INNER JOIN',
    group: 'joins',
    summary: 'Pairs each row of one table with the matching rows of another. Rows without a match on either side disappear.',
    postgres: 'from a\njoin b on b.a_id = a.id',
    mysql: 'from a\njoin b on b.a_id = a.id',
    example: {
      postgres: `${PEOPLE}
select person.name, pet.pet
from person
join pet on pet.owner_id = person.id
order by pet.pet;`,
    },
    match: '\\b(inner\\s+)?join\\b',
    docs: [
      { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'left-join',
    name: 'LEFT JOIN',
    group: 'joins',
    summary:
      'Keeps every row of the left table; where the right table has no match its columns are NULL. "LEFT JOIN … WHERE right.id IS NULL" finds rows with no match.',
    postgres: 'from a\nleft join b on b.a_id = a.id',
    mysql: 'from a\nleft join b on b.a_id = a.id',
    example: {
      postgres: `${PEOPLE}
select person.name, pet.pet
from person
left join pet on pet.owner_id = person.id
order by person.name, pet.pet;`,
    },
    match: '\\bleft\\s+(outer\\s+)?join\\b',
    docs: [
      { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'full-join',
    name: 'FULL JOIN',
    group: 'joins',
    summary: 'Keeps unmatched rows from both sides, with NULLs where the other side is missing. Useful for comparing two lists.',
    postgres: 'from a\nfull join b on b.a_id = a.id',
    mysql: null,
    mysqlNote: 'Not in MySQL. Combine a LEFT JOIN with the unmatched rows of a RIGHT JOIN (or a second LEFT JOIN the other way) using UNION ALL.',
    example: {
      postgres: `${PEOPLE}
select person.name, pet.pet
from person
full join pet on pet.owner_id = person.id
order by person.name, pet.pet;`,
      mysql: `${PEOPLE}
select person.name, pet.pet
from person
left join pet on pet.owner_id = person.id
union all
select null, pet.pet
from pet
where not exists (select 1 from person where person.id = pet.owner_id);`,
    },
    match: '\\bfull\\s+(outer\\s+)?join\\b',
    docs: [{ label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'cross-join',
    name: 'CROSS JOIN',
    group: 'joins',
    summary: 'Pairs every row of one table with every row of the other. Used to build all combinations, such as every product for every month.',
    postgres: 'from a\ncross join b',
    mysql: 'from a\ncross join b',
    example: {
      postgres: `with size(s) as (select 'S' union all select 'L'),
colour(c) as (select 'red' union all select 'blue')
select s, c from size cross join colour order by s, c;`,
    },
    match: '\\bcross\\s+join\\b',
    docs: [
      { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'join-using',
    name: 'JOIN … USING',
    group: 'joins',
    summary: 'A shorter join condition when both tables name the key column the same way. The column appears once in SELECT *.',
    postgres: 'from a\njoin b using (customer_id)',
    mysql: 'from a\njoin b using (customer_id)',
    example: {
      postgres: `with orders(customer_id, total) as (select 1, 50 union all select 2, 20),
customer(customer_id, name) as (select 1, 'Ann' union all select 2, 'Bob')
select customer_id, name, total
from orders
join customer using (customer_id)
order by customer_id;`,
    },
    match: '\\busing\\s*\\(',
    docs: [
      { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'union',
    name: 'UNION / UNION ALL',
    group: 'joins',
    summary:
      'Stacks the rows of two queries with the same number of columns. UNION removes duplicates (and has to sort or hash to do it); UNION ALL keeps every row and is faster.',
    postgres: 'select … from a\nunion all\nselect … from b',
    mysql: 'select … from a\nunion all\nselect … from b',
    example: {
      postgres: `select 'tea' as item union all select 'tea' union all select 'cake'
union
select 'cake';`,
    },
    match: '\\bunion\\b',
    docs: [
      { label: 'PostgreSQL: combining queries', url: PG + 'queries-union.html' },
      { label: 'MySQL: UNION', url: MY + 'union.html' },
    ],
  },
  {
    id: 'intersect-except',
    name: 'INTERSECT / EXCEPT',
    group: 'joins',
    summary: 'INTERSECT returns rows found in both queries; EXCEPT returns rows of the first query that are not in the second. Both remove duplicates.',
    postgres: 'select id from a\nexcept\nselect id from b',
    mysql: 'select id from a\nexcept\nselect id from b',
    mysqlNote: 'Supported since MySQL 8.0.31. Older versions need NOT EXISTS or a LEFT JOIN.',
    example: {
      postgres: `with a(x) as (select 1 union all select 2 union all select 3),
b(x) as (select 2 union all select 3 union all select 4)
select x from a except select x from b;`,
    },
    match: '\\b(intersect|except)\\b(?!\\s*\\()',
    docs: [
      { label: 'PostgreSQL: combining queries', url: PG + 'queries-union.html' },
      { label: 'MySQL: EXCEPT', url: MY + 'except.html' },
    ],
  },
  {
    id: 'exists',
    name: 'EXISTS / NOT EXISTS',
    group: 'joins',
    summary:
      'True when the subquery returns at least one row. NOT EXISTS is the safest way to find rows with no match: unlike NOT IN it is not confused by NULLs.',
    postgres: 'where exists (\n  select 1 from b where b.a_id = a.id\n)',
    mysql: 'where exists (\n  select 1 from b where b.a_id = a.id\n)',
    example: {
      postgres: `${PEOPLE}
select name
from person
where not exists (select 1 from pet where pet.owner_id = person.id)
order by name;`,
    },
    match: '\\bexists\\s*\\(',
    docs: [
      { label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' },
      { label: 'MySQL: EXISTS', url: MY + 'exists-and-not-exists-subqueries.html' },
    ],
  },
  {
    id: 'in-subquery',
    name: 'IN / NOT IN (subquery)',
    group: 'joins',
    summary:
      'Checks whether a value is among the values a subquery returns. Careful with NOT IN: if the subquery returns a single NULL, NOT IN matches nothing.',
    postgres: 'where id in (select a_id from b)',
    mysql: 'where id in (select a_id from b)',
    example: {
      postgres: `${PEOPLE}
select name from person where id in (select owner_id from pet);`,
    },
    match: '\\bin\\s*\\(\\s*select\\b',
    docs: [
      { label: 'PostgreSQL: IN', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-IN' },
      { label: 'MySQL: subqueries with IN', url: MY + 'any-in-some-subqueries.html' },
    ],
  },
  {
    id: 'any-all',
    name: 'ANY / ALL',
    group: 'joins',
    summary: 'Compares a value with every value of a subquery: > ALL means bigger than all of them, > ANY means bigger than at least one.',
    postgres: 'where price > all (select price from t where …)',
    mysql: 'where price > all (select price from t where …)',
    mysqlNote: 'In MySQL ANY and ALL take only a subquery. PostgreSQL also accepts an array: = any(array[…]).',
    example: {
      postgres: `with item(name, price) as (
  select 'tea', 3 union all select 'cake', 7 union all select 'pie', 5
)
select name from item
where price > all (select price from item where name <> 'cake');`,
    },
    match: '\\b(any|all|some)\\s*\\(\\s*select\\b',
    docs: [
      { label: 'PostgreSQL: ANY/SOME, ALL', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-ANY-SOME' },
      { label: 'MySQL: ALL', url: MY + 'all-subqueries.html' },
    ],
  },
  {
    id: 'self-join',
    name: 'Self-join',
    group: 'joins',
    summary: 'Joins a table to itself under two aliases, for example to put each employee next to their manager from the same table.',
    postgres: 'from employee e\nleft join employee m on m.id = e.manager_id',
    mysql: 'from employee e\nleft join employee m on m.id = e.manager_id',
    example: {
      postgres: `with employee(id, name, manager_id) as (
  select 1, 'Ann', null union all select 2, 'Bob', 1 union all select 3, 'Cy', 1
)
select e.name, m.name as manager
from employee e
left join employee m on m.id = e.manager_id
order by e.id;`,
    },
    match: '\\b(from|join)\\s+(\\w+)\\s+(as\\s+)?\\w+\\b[^;]*?\\bjoin\\s+\\2\\s+(as\\s+)?\\w+',
    docs: [
      { label: 'PostgreSQL: table aliases', url: PG + 'queries-table-expressions.html#QUERIES-TABLE-ALIASES' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
]
