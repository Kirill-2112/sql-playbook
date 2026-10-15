import type { Exercise } from '../types'
import { sakilaAdvanced } from './sakilaAdvanced'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const basics: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'sakila-001',
    dataset: 'sakila',
    level: 1,
    topics: ['select-basics'],
    title: 'Long R-rated films',
    prompt: 'List R-rated films longer than 180 minutes. Show title and length, longest first; films of equal length by title.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE + ORDER BY',
        postgres: `select title, length
from film
where rating = 'R'
  and length > 180
order by length desc, title;`,
        mysql: `select title, length
from film
where rating = 'R'
  and length > 180
order by length desc, title;`,
        explanation: 'WHERE keeps the rows that pass both conditions. ORDER BY sorts by length first and uses title only to break ties.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'sakila-002',
    dataset: 'sakila',
    level: 1,
    topics: ['limit'],
    title: 'Most expensive films to replace',
    prompt: 'Show the 10 films with the highest replacement cost: title and replacement_cost. Break ties by title.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIMIT',
        postgres: `select title, replacement_cost
from film
order by replacement_cost desc, title
limit 10;`,
        mysql: `select title, replacement_cost
from film
order by replacement_cost desc, title
limit 10;`,
        explanation: 'LIMIT cuts the sorted result after 10 rows. Without the tie-breaker on title, which of the many 29.99 films you get would be arbitrary.',
      },
      {
        approach: 'FETCH FIRST (SQL standard)',
        postgres: `select title, replacement_cost
from film
order by replacement_cost desc, title
fetch first 10 rows only;`,
        mysql: null,
        mysqlNote: 'MySQL does not support FETCH FIRST. Use LIMIT.',
        explanation: 'FETCH FIRST n ROWS ONLY is the SQL-standard spelling of LIMIT. It also supports WITH TIES, which returns every row tied with the last one.',
      },
    ],
    comparison:
      'Both return the same rows. LIMIT is shorter and works in PostgreSQL, MySQL and SQLite. FETCH FIRST is the standard form (also used by Oracle and SQL Server) and adds WITH TIES.',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: SELECT … LIMIT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'sakila-003',
    dataset: 'sakila',
    level: 1,
    topics: ['distinct'],
    title: 'Which ratings exist?',
    prompt: 'List each film rating once, in alphabetical order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DISTINCT',
        postgres: `select distinct rating
from film
order by rating;`,
        mysql: `select distinct rating
from film
order by cast(rating as char);`,
        mysqlNote:
          'In MySQL, rating is an ENUM, and ORDER BY on an ENUM sorts by its position in the definition (G, PG, PG-13, R, NC-17), not alphabetically. Cast it to text to sort by name.',
        explanation: 'DISTINCT removes duplicate rows from the result.',
      },
      {
        approach: 'GROUP BY',
        postgres: `select rating
from film
group by rating
order by rating;`,
        mysql: `select rating
from film
group by rating
order by cast(rating as char);`,
        mysqlNote: 'Same ENUM sorting rule as in solution A.',
        explanation: 'Grouping by a column also gives one row per value. It is the natural choice once you add counts or other aggregates.',
      },
    ],
    comparison:
      'For a plain list of values they are equivalent and usually run the same way. Use DISTINCT to say "unique values"; switch to GROUP BY as soon as you need COUNT(*) or SUM per value.',
    docs: [
      { label: 'PostgreSQL: DISTINCT', url: PG + 'queries-select-lists.html#QUERIES-DISTINCT' },
      { label: 'MySQL: The ENUM type (sorting)', url: MY + 'enum.html' },
    ],
  },
  {
    id: 'sakila-004',
    dataset: 'sakila',
    level: 1,
    topics: ['null'],
    title: 'Rentals never returned',
    prompt: 'Find rentals that have not been returned yet (no return date). Show rental_id, rental_date and customer_id, oldest first, then by rental_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'IS NULL',
        postgres: `select rental_id, rental_date, customer_id
from rental
where return_date is null
order by rental_date, rental_id;`,
        mysql: `select rental_id, rental_date, customer_id
from rental
where return_date is null
order by rental_date, rental_id;`,
        explanation:
          'NULL means "unknown", so return_date = NULL is never true, not even for NULL values. Always test for missing values with IS NULL or IS NOT NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison operators (IS NULL)', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'sakila-005',
    dataset: 'sakila',
    level: 1,
    topics: ['text-search'],
    title: 'Actors with "gen" in the last name',
    prompt: 'Find actors whose last name contains "gen", in any letter case. Show first_name and last_name, sorted by last name, then first name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE',
        postgres: `select first_name, last_name
from actor
where last_name ilike '%gen%'
order by last_name, first_name;`,
        mysql: `select first_name, last_name
from actor
where last_name like '%gen%'
order by last_name, first_name;`,
        mysqlNote:
          'MySQL has no ILIKE. With the default utf8mb4_0900_ai_ci collation, LIKE already ignores case (and accents).',
        explanation: 'ILIKE is LIKE without case sensitivity. % matches any number of characters, so %gen% means "contains gen".',
      },
      {
        approach: 'lower() + LIKE',
        postgres: `select first_name, last_name
from actor
where lower(last_name) like '%gen%'
order by last_name, first_name;`,
        mysql: `select first_name, last_name
from actor
where lower(last_name) like '%gen%'
order by last_name, first_name;`,
        explanation: 'Lower-casing the column first makes a case-sensitive LIKE behave case-insensitively. This version is portable to every database.',
      },
    ],
    comparison:
      'Same result. ILIKE is shorter but Postgres-only. lower() + LIKE works everywhere. Neither can use a normal index because the pattern starts with %.',
    docs: [
      { label: 'PostgreSQL: LIKE and ILIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: Case sensitivity in string searches', url: MY + 'case-sensitivity.html' },
    ],
  },
  {
    id: 'sakila-006',
    dataset: 'sakila',
    level: 1,
    topics: ['conditions'],
    title: 'Label films by length',
    prompt:
      'For films with film_id 1 to 10, show film_id, title, length and a label: "short" under 60 minutes, "medium" from 60 to 120, "long" above 120. Order by film_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CASE',
        postgres: `select film_id, title, length,
       case
         when length < 60 then 'short'
         when length <= 120 then 'medium'
         else 'long'
       end as length_label
from film
where film_id between 1 and 10
order by film_id;`,
        mysql: `select film_id, title, length,
       case
         when length < 60 then 'short'
         when length <= 120 then 'medium'
         else 'long'
       end as length_label
from film
where film_id between 1 and 10
order by film_id;`,
        explanation: 'CASE checks the conditions top to bottom and returns the first match, so the second branch only sees films of 60 minutes or more.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'sakila-007',
    dataset: 'sakila',
    level: 1,
    topics: ['strings'],
    title: '"Last, First" names',
    prompt:
      'For customers of store 1 whose last name starts with "A", show customer_id and one column full_name formatted as "LAST, FIRST". Order by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: '|| operator',
        postgres: `select customer_id,
       last_name || ', ' || first_name as full_name
from customer
where store_id = 1
  and last_name like 'A%'
order by customer_id;`,
        mysql: `select customer_id,
       concat(last_name, ', ', first_name) as full_name
from customer
where store_id = 1
  and last_name like 'A%'
order by customer_id;`,
        mysqlNote:
          'In MySQL, || is a logical OR by default. last_name || \', \' returns 0 or 1 instead of text, and no error is raised. Use CONCAT().',
        explanation: '|| is the SQL-standard string concatenation operator.',
      },
      {
        approach: 'concat()',
        postgres: `select customer_id,
       concat(last_name, ', ', first_name) as full_name
from customer
where store_id = 1
  and last_name like 'A%'
order by customer_id;`,
        mysql: `select customer_id,
       concat(last_name, ', ', first_name) as full_name
from customer
where store_id = 1
  and last_name like 'A%'
order by customer_id;`,
        explanation: 'concat() exists in both databases, so the same query runs everywhere.',
      },
    ],
    comparison:
      'Same output here. The difference shows up with NULL: in PostgreSQL || returns NULL if any part is NULL, while concat() skips NULL parts. In MySQL, CONCAT() returns NULL if any part is NULL; CONCAT_WS() skips them.',
    docs: [
      { label: 'PostgreSQL: String functions', url: PG + 'functions-string.html' },
      { label: 'MySQL: CONCAT()', url: MY + 'string-functions.html#function_concat' },
    ],
  },
  {
    id: 'sakila-008',
    dataset: 'sakila',
    level: 1,
    topics: ['numbers'],
    title: 'Hours and minutes',
    prompt:
      'For films 1 to 5, show title, length, and the length split into whole hours and remaining minutes (columns hours and minutes). Order by film_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer division and %',
        postgres: `select title, length,
       length / 60 as hours,
       length % 60 as minutes
from film
where film_id between 1 and 5
order by film_id;`,
        mysql: `select title, length,
       length div 60 as hours,
       length % 60 as minutes
from film
where film_id between 1 and 5
order by film_id;`,
        mysqlNote:
          'In MySQL, / always returns a decimal: 86 / 60 is 1.4333, not 1. Integer division is DIV. In PostgreSQL, dividing two integers already drops the remainder.',
        explanation: 'Both columns are integers, so length / 60 is whole hours and % gives what is left over.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Mathematical operators', url: PG + 'functions-math.html' },
      { label: 'MySQL: Arithmetic operators (DIV)', url: MY + 'arithmetic-functions.html' },
    ],
  },
  {
    id: 'sakila-009',
    dataset: 'sakila',
    level: 1,
    topics: ['dates-basics', 'indexes'],
    title: 'Rentals on the first day',
    prompt: 'Show every rental made on 24 May 2005: rental_id and rental_date, in time order, then by rental_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date range',
        postgres: `select rental_id, rental_date
from rental
where rental_date >= '2005-05-24'
  and rental_date <  '2005-05-25'
order by rental_date, rental_id;`,
        mysql: `select rental_id, rental_date
from rental
where rental_date >= '2005-05-24'
  and rental_date <  '2005-05-25'
order by rental_date, rental_id;`,
        explanation: 'A half-open range [start of day, start of next day) catches every time on that day and leaves the column untouched.',
      },
      {
        approach: 'Cast to date',
        postgres: `select rental_id, rental_date
from rental
where rental_date::date = '2005-05-24'
order by rental_date, rental_id;`,
        mysql: `select rental_id, rental_date
from rental
where date(rental_date) = '2005-05-24'
order by rental_date, rental_id;`,
        mysqlNote: 'MySQL has no :: cast. DATE() extracts the date part.',
        explanation: 'Turning the timestamp into a date and comparing reads naturally.',
      },
    ],
    comparison:
      'Same rows, but A can use the index on rental_date and B cannot: the index stores rental_date, not rental_date::date, so B reads the whole table. Prefer ranges on large tables.',
    docs: [
      { label: 'PostgreSQL: Date/time functions', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: DATE()', url: MY + 'date-and-time-functions.html#function_date' },
    ],
  },

  // ---------- Level 2 ----------
  {
    id: 'sakila-010',
    dataset: 'sakila',
    level: 2,
    topics: ['joins'],
    title: 'Horror films',
    prompt: 'List the titles of all films in the "Horror" category, alphabetically.',
    orderMatters: true,
    solutions: [
      {
        approach: 'JOIN … ON',
        postgres: `select f.title
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
where c.name = 'Horror'
order by f.title;`,
        mysql: `select f.title
from film f
join film_category fc on fc.film_id = f.film_id
join category c on c.category_id = fc.category_id
where c.name = 'Horror'
order by f.title;`,
        explanation: 'film_category links films to categories (many-to-many), so you join through it.',
      },
      {
        approach: 'JOIN … USING',
        postgres: `select title
from film
join film_category using (film_id)
join category using (category_id)
where category.name = 'Horror'
order by title;`,
        mysql: `select title
from film
join film_category using (film_id)
join category using (category_id)
where category.name = 'Horror'
order by title;`,
        explanation: 'USING (col) is shorthand for joining on equal columns with the same name, and the result shows that column once.',
      },
    ],
    comparison:
      'Identical plans. USING is shorter when key columns share names. ON is more general and makes the join condition explicit, which helps when names differ or when you add extra conditions.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'sakila-011',
    dataset: 'sakila',
    level: 2,
    topics: ['subqueries', 'joins', 'set-operations'],
    title: 'Films with no copies',
    prompt: 'Which films have no copies in any store (no rows in inventory)? Show film_id and title, ordered by film_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select f.film_id, f.title
from film f
where not exists (
  select 1 from inventory i where i.film_id = f.film_id
)
order by f.film_id;`,
        mysql: `select f.film_id, f.title
from film f
where not exists (
  select 1 from inventory i where i.film_id = f.film_id
)
order by f.film_id;`,
        explanation: 'For each film, NOT EXISTS checks whether at least one inventory row exists, and stops at the first one it finds.',
      },
      {
        approach: 'LEFT JOIN … IS NULL',
        postgres: `select f.film_id, f.title
from film f
left join inventory i on i.film_id = f.film_id
where i.inventory_id is null
order by f.film_id;`,
        mysql: `select f.film_id, f.title
from film f
left join inventory i on i.film_id = f.film_id
where i.inventory_id is null
order by f.film_id;`,
        explanation: 'A LEFT JOIN keeps every film; films without a match get NULLs in the inventory columns, and the WHERE keeps only those.',
      },
      {
        approach: 'NOT IN',
        postgres: `select film_id, title
from film
where film_id not in (select film_id from inventory)
order by film_id;`,
        mysql: `select film_id, title
from film
where film_id not in (select film_id from inventory)
order by film_id;`,
        explanation:
          'Works here because inventory.film_id is NOT NULL. If the subquery could return a NULL, NOT IN would return no rows at all.',
      },
      {
        approach: 'EXCEPT',
        postgres: `select film_id, title from film
except
select f.film_id, f.title
from film f
join inventory i on i.film_id = f.film_id
order by film_id;`,
        mysql: `select film_id, title from film
except
select f.film_id, f.title
from film f
join inventory i on i.film_id = f.film_id
order by film_id;`,
        mysqlNote: 'EXCEPT exists in MySQL since 8.0.31.',
        explanation: 'All films minus the films that have copies. EXCEPT also removes duplicates.',
      },
    ],
    comparison:
      'All four return the same 42 films. NOT EXISTS is the safest default: it is clear, fast and has no NULL trap. LEFT JOIN … IS NULL is equally fast in both databases. NOT IN silently breaks when NULLs appear. EXCEPT is neat for comparing whole rows but compares every selected column.',
    docs: [
      { label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' },
      { label: 'PostgreSQL: NOT IN and NULL', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN' },
      { label: 'MySQL: EXCEPT', url: MY + 'except.html' },
    ],
  },
  {
    id: 'sakila-012',
    dataset: 'sakila',
    level: 2,
    topics: ['group-by', 'aggregates'],
    title: 'Films per category',
    prompt: 'How many films are in each category? Show the category name and the count, largest first; equal counts by name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY',
        postgres: `select c.name, count(*) as films
from category c
join film_category fc on fc.category_id = c.category_id
group by c.category_id, c.name
order by films desc, c.name;`,
        mysql: `select c.name, count(*) as films
from category c
join film_category fc on fc.category_id = c.category_id
group by c.category_id, c.name
order by films desc, c.name;`,
        explanation: 'GROUP BY collapses the rows of each category into one, and count(*) counts the rows that were collapsed.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'sakila-013',
    dataset: 'sakila',
    level: 2,
    topics: ['group-by'],
    title: 'Customers with 40+ rentals',
    prompt: 'Find customers with more than 40 rentals. Show customer_id, first_name, last_name and the number of rentals, most rentals first, then by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'HAVING',
        postgres: `select c.customer_id, c.first_name, c.last_name, count(*) as rentals
from customer c
join rental r on r.customer_id = c.customer_id
group by c.customer_id
having count(*) > 40
order by rentals desc, c.customer_id;`,
        mysql: `select c.customer_id, c.first_name, c.last_name, count(*) as rentals
from customer c
join rental r on r.customer_id = c.customer_id
group by c.customer_id
having count(*) > 40
order by rentals desc, c.customer_id;`,
        explanation:
          'WHERE filters rows before grouping; HAVING filters groups after. Grouping by the primary key lets you select the other customer columns, because they depend on it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
      { label: 'MySQL: GROUP BY and functional dependence', url: MY + 'group-by-functional-dependence.html' },
    ],
  },
  {
    id: 'sakila-014',
    dataset: 'sakila',
    level: 2,
    topics: ['aggregates', 'joins'],
    title: 'Payments taken by each staff member',
    prompt: 'For each staff member, show first_name, last_name, the number of payments they took and the total amount. Order by staff_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'JOIN + GROUP BY',
        postgres: `select s.first_name, s.last_name,
       count(*) as payments,
       sum(p.amount) as total
from staff s
join payment p on p.staff_id = s.staff_id
group by s.staff_id
order by s.staff_id;`,
        mysql: `select s.first_name, s.last_name,
       count(*) as payments,
       sum(p.amount) as total
from staff s
join payment p on p.staff_id = s.staff_id
group by s.staff_id
order by s.staff_id;`,
        explanation: 'One row per staff member, with two aggregates computed over the same group.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'sakila-015',
    dataset: 'sakila',
    level: 2,
    topics: ['conditional-aggregates'],
    title: 'Counting several things at once',
    prompt:
      'For each rating, show the total number of films, how many are longer than 120 minutes, and how many rent for 4.99. One row per rating; order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select rating,
       count(*) as films,
       count(*) filter (where length > 120) as long_films,
       count(*) filter (where rental_rate = 4.99) as premium
from film
group by rating;`,
        mysql: null,
        mysqlNote: 'MySQL has no FILTER clause. Use solution B or C.',
        explanation: 'FILTER restricts which rows a single aggregate sees, while the group stays the same.',
      },
      {
        approach: 'SUM(CASE …)',
        postgres: `select rating,
       count(*) as films,
       sum(case when length > 120 then 1 else 0 end) as long_films,
       sum(case when rental_rate = 4.99 then 1 else 0 end) as premium
from film
group by rating;`,
        mysql: `select rating,
       count(*) as films,
       sum(case when length > 120 then 1 else 0 end) as long_films,
       sum(case when rental_rate = 4.99 then 1 else 0 end) as premium
from film
group by rating;`,
        explanation: 'Each row adds 1 when it matches and 0 when it does not. Works in every database.',
      },
      {
        approach: 'COUNT(CASE …)',
        postgres: `select rating,
       count(*) as films,
       count(case when length > 120 then 1 end) as long_films,
       count(case when rental_rate = 4.99 then 1 end) as premium
from film
group by rating;`,
        mysql: `select rating,
       count(*) as films,
       count(case when length > 120 then 1 end) as long_films,
       count(case when rental_rate = 4.99 then 1 end) as premium
from film
group by rating;`,
        explanation: 'A CASE without ELSE returns NULL for non-matching rows, and COUNT ignores NULLs.',
      },
    ],
    comparison:
      'Same numbers. FILTER is the most readable and also works with sum(), avg() and others, but only in PostgreSQL (and SQLite). SUM(CASE …) is the portable classic. COUNT(CASE …) relies on COUNT skipping NULLs: correct, but easy to misread.',
    docs: [
      { label: 'PostgreSQL: Aggregate expressions (FILTER)', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
      { label: 'MySQL: Aggregate functions', url: MY + 'aggregate-functions.html' },
    ],
  },
  {
    id: 'sakila-016',
    dataset: 'sakila',
    level: 2,
    topics: ['text-aggregation'],
    title: 'Cast list in one cell',
    prompt:
      'For films 1 to 5, show title and the actors\' last names as one comma-separated string, alphabetical. Order by film_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg',
        postgres: `select f.title,
       string_agg(a.last_name, ', ' order by a.last_name) as actors
from film f
join film_actor fa on fa.film_id = f.film_id
join actor a on a.actor_id = fa.actor_id
where f.film_id between 1 and 5
group by f.film_id
order by f.film_id;`,
        mysql: `select f.title,
       group_concat(a.last_name order by a.last_name separator ', ') as actors
from film f
join film_actor fa on fa.film_id = f.film_id
join actor a on a.actor_id = fa.actor_id
where f.film_id between 1 and 5
group by f.film_id
order by f.film_id;`,
        mysqlNote:
          'MySQL uses GROUP_CONCAT(… ORDER BY … SEPARATOR …). Its result is cut at group_concat_max_len (1024 bytes by default) without an error.',
        explanation: 'string_agg glues the values of a group together; ORDER BY inside the call controls their order in the string.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT()', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'sakila-017',
    dataset: 'sakila',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Actors who share a last name',
    prompt:
      'Find pairs of different actors with the same last name. Show last_name and both actor ids, each pair once (smaller id first). Order by last_name, then the ids.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join',
        postgres: `select a.last_name, a.actor_id as actor_1, b.actor_id as actor_2
from actor a
join actor b
  on b.last_name = a.last_name
 and b.actor_id > a.actor_id
order by a.last_name, actor_1, actor_2;`,
        mysql: `select a.last_name, a.actor_id as actor_1, b.actor_id as actor_2
from actor a
join actor b
  on b.last_name = a.last_name
 and b.actor_id > a.actor_id
order by a.last_name, actor_1, actor_2;`,
        explanation:
          'Joining a table to itself needs two aliases. b.actor_id > a.actor_id drops pairs of an actor with themselves and keeps each pair in one direction only.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table aliases and self joins', url: PG + 'queries-table-expressions.html#QUERIES-TABLE-ALIASES' }],
  },
  {
    id: 'sakila-018',
    dataset: 'sakila',
    level: 2,
    topics: ['subqueries', 'cte'],
    title: 'Longer than average',
    prompt: 'How many films are longer than the average film length? Return one number.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Scalar subquery',
        postgres: `select count(*) as films
from film
where length > (select avg(length) from film);`,
        mysql: `select count(*) as films
from film
where length > (select avg(length) from film);`,
        explanation: 'A subquery that returns one value can be used anywhere a single value is expected.',
      },
      {
        approach: 'CTE',
        postgres: `with stats as (
  select avg(length) as avg_length from film
)
select count(*) as films
from film, stats
where film.length > stats.avg_length;`,
        mysql: `with stats as (
  select avg(length) as avg_length from film
)
select count(*) as films
from film, stats
where film.length > stats.avg_length;`,
        explanation: 'A CTE names the intermediate result first, then uses it. Handy when you need the average in several places.',
      },
    ],
    comparison:
      'Same count and essentially the same plan: the average is computed once. Use the subquery for a one-off value; use a CTE when the value is reused or the query grows.',
    docs: [
      { label: 'PostgreSQL: Scalar subqueries', url: PG + 'sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES' },
      { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
    ],
  },
  {
    id: 'sakila-019',
    dataset: 'sakila',
    level: 2,
    topics: ['subqueries', 'ranking'],
    title: 'Each customer\'s biggest payment',
    prompt:
      'For customers 1 to 5, show every payment that equals that customer\'s largest payment: customer_id, payment_id and amount. Order by customer_id, then payment_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Correlated subquery',
        postgres: `select p.customer_id, p.payment_id, p.amount
from payment p
where p.customer_id between 1 and 5
  and p.amount = (
    select max(p2.amount) from payment p2 where p2.customer_id = p.customer_id
  )
order by p.customer_id, p.payment_id;`,
        mysql: `select p.customer_id, p.payment_id, p.amount
from payment p
where p.customer_id between 1 and 5
  and p.amount = (
    select max(p2.amount) from payment p2 where p2.customer_id = p.customer_id
  )
order by p.customer_id, p.payment_id;`,
        explanation: 'The subquery refers to the outer row (p.customer_id), so it is evaluated per customer.',
      },
      {
        approach: 'Join to grouped maximums',
        postgres: `select p.customer_id, p.payment_id, p.amount
from payment p
join (
  select customer_id, max(amount) as max_amount
  from payment
  where customer_id between 1 and 5
  group by customer_id
) m on m.customer_id = p.customer_id and m.max_amount = p.amount
order by p.customer_id, p.payment_id;`,
        mysql: `select p.customer_id, p.payment_id, p.amount
from payment p
join (
  select customer_id, max(amount) as max_amount
  from payment
  where customer_id between 1 and 5
  group by customer_id
) m on m.customer_id = p.customer_id and m.max_amount = p.amount
order by p.customer_id, p.payment_id;`,
        explanation: 'Compute each customer\'s maximum once, then join payments back to it.',
      },
      {
        approach: 'Window function',
        postgres: `select customer_id, payment_id, amount
from (
  select customer_id, payment_id, amount,
         max(amount) over (partition by customer_id) as max_amount
  from payment
  where customer_id between 1 and 5
) p
where amount = max_amount
order by customer_id, payment_id;`,
        mysql: `select customer_id, payment_id, amount
from (
  select customer_id, payment_id, amount,
         max(amount) over (partition by customer_id) as max_amount
  from payment
  where customer_id between 1 and 5
) p
where amount = max_amount
order by customer_id, payment_id;`,
        explanation: 'max() OVER (PARTITION BY …) puts the group maximum on every row without collapsing rows.',
      },
    ],
    comparison:
      'All three keep ties (two payments with the same top amount both appear). The correlated subquery is easiest to read. The join is the classic pre-window approach. The window function reads the table once and is the easiest to extend, for example to "top 3".',
    docs: [
      { label: 'PostgreSQL: Window functions tutorial', url: PG + 'tutorial-window.html' },
      { label: 'MySQL: Correlated subqueries', url: MY + 'correlated-subqueries.html' },
    ],
  },
  {
    id: 'sakila-020',
    dataset: 'sakila',
    level: 2,
    topics: ['joins', 'aggregates'],
    title: 'Revenue by country',
    prompt: 'Which 10 countries brought in the most revenue? Show country and total payments, highest first; equal totals by country.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Chain of joins',
        postgres: `select co.country, sum(p.amount) as revenue
from payment p
join customer cu on cu.customer_id = p.customer_id
join address a  on a.address_id = cu.address_id
join city ci    on ci.city_id = a.city_id
join country co on co.country_id = ci.country_id
group by co.country_id, co.country
order by revenue desc, co.country
limit 10;`,
        mysql: `select co.country, sum(p.amount) as revenue
from payment p
join customer cu on cu.customer_id = p.customer_id
join address a  on a.address_id = cu.address_id
join city ci    on ci.city_id = a.city_id
join country co on co.country_id = ci.country_id
group by co.country_id, co.country
order by revenue desc, co.country
limit 10;`,
        explanation: 'Follow the foreign keys from payment to country, then group by country.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins between tables', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'sakila-021',
    dataset: 'sakila',
    level: 2,
    topics: ['set-operations', 'subqueries'],
    title: 'First names shared by actors and customers',
    prompt: 'Which first names belong to at least one actor and at least one customer? List each name once, alphabetically.',
    orderMatters: true,
    solutions: [
      {
        approach: 'INTERSECT',
        postgres: `select first_name from actor
intersect
select first_name from customer
order by first_name;`,
        mysql: `select first_name from actor
intersect
select first_name from customer
order by first_name;`,
        mysqlNote: 'INTERSECT exists in MySQL since 8.0.31.',
        explanation: 'INTERSECT returns rows present in both results, without duplicates.',
      },
      {
        approach: 'EXISTS',
        postgres: `select distinct a.first_name
from actor a
where exists (select 1 from customer c where c.first_name = a.first_name)
order by a.first_name;`,
        mysql: `select distinct a.first_name
from actor a
where exists (select 1 from customer c where c.first_name = a.first_name)
order by a.first_name;`,
        explanation: 'Keep actor names for which a customer with the same name exists. DISTINCT removes repeats.',
      },
    ],
    comparison:
      'Same names. INTERSECT states the intent directly and deduplicates for you. EXISTS is more flexible: you can return other actor columns or add conditions. Older MySQL versions only support the EXISTS form.',
    docs: [
      { label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' },
      { label: 'MySQL: INTERSECT', url: MY + 'intersect.html' },
    ],
  },

  // ---------- Level 3 ----------
  {
    id: 'sakila-022',
    dataset: 'sakila',
    level: 3,
    topics: ['ranking', 'lateral'],
    title: 'Top 3 films in each category',
    prompt:
      'For every category, find the 3 most rented films. Show category, title, rentals and place (1–3). Break ties by title. Order by category, then place.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `with film_rentals as (
  select c.name as category, f.title, count(*) as rentals
  from rental r
  join inventory i      on i.inventory_id = r.inventory_id
  join film f           on f.film_id = i.film_id
  join film_category fc on fc.film_id = f.film_id
  join category c       on c.category_id = fc.category_id
  group by c.name, f.film_id, f.title
)
select category, title, rentals, place
from (
  select *, row_number() over (partition by category order by rentals desc, title) as place
  from film_rentals
) ranked
where place <= 3
order by category, place;`,
        mysql: `with film_rentals as (
  select c.name as category, f.title, count(*) as rentals
  from rental r
  join inventory i      on i.inventory_id = r.inventory_id
  join film f           on f.film_id = i.film_id
  join film_category fc on fc.film_id = f.film_id
  join category c       on c.category_id = fc.category_id
  group by c.name, f.film_id, f.title
)
select category, title, rentals, place
from (
  select film_rentals.*, row_number() over (partition by category order by rentals desc, title) as place
  from film_rentals
) ranked
where place <= 3
order by category, place;`,
        mysqlNote: 'MySQL does not allow * next to other columns without a table qualifier, so it is written film_rentals.*.',
        explanation:
          'ROW_NUMBER restarts at 1 in each category. The ranking happens in a subquery because window functions are calculated after WHERE.',
      },
      {
        approach: 'LATERAL join',
        postgres: `select c.name as category, t.title, t.rentals,
       row_number() over (partition by c.name order by t.rentals desc, t.title) as place
from category c
cross join lateral (
  select f.title, count(*) as rentals
  from film_category fc
  join film f      on f.film_id = fc.film_id
  join inventory i on i.film_id = f.film_id
  join rental r    on r.inventory_id = i.inventory_id
  where fc.category_id = c.category_id
  group by f.film_id, f.title
  order by rentals desc, f.title
  limit 3
) t
order by category, place;`,
        mysql: `select c.name as category, t.title, t.rentals,
       row_number() over (partition by c.name order by t.rentals desc, t.title) as place
from category c
cross join lateral (
  select f.title, count(*) as rentals
  from film_category fc
  join film f      on f.film_id = fc.film_id
  join inventory i on i.film_id = f.film_id
  join rental r    on r.inventory_id = i.inventory_id
  where fc.category_id = c.category_id
  group by f.film_id, f.title
  order by rentals desc, f.title
  limit 3
) t
order by category, place;`,
        mysqlNote: 'LATERAL exists in MySQL since 8.0.14.',
        explanation: 'For each category, the lateral subquery runs its own "top 3 with LIMIT". It can see c.category_id from the outer query.',
      },
    ],
    comparison:
      'Same rows. ROW_NUMBER computes rentals for all films once and then keeps 3 per group, which suits "top N for all groups". LATERAL runs one small query per group and shines when there are few groups and a good index to stop early.',
    docs: [
      { label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' },
      { label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' },
      { label: 'MySQL: Lateral derived tables', url: MY + 'lateral-derived-tables.html' },
    ],
  },
  {
    id: 'sakila-023',
    dataset: 'sakila',
    level: 3,
    topics: ['lag-lead', 'dates-advanced'],
    title: 'Revenue change month over month',
    prompt:
      'Show revenue per month (as YYYY-MM) with the previous month\'s revenue and the difference (column difference). Months with no payments are skipped. Order by month.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG()',
        postgres: `with monthly as (
  select to_char(payment_date, 'YYYY-MM') as month, sum(amount) as revenue
  from payment
  group by 1
)
select month, revenue,
       lag(revenue) over (order by month) as previous,
       revenue - lag(revenue) over (order by month) as difference
from monthly
order by month;`,
        mysql: `with monthly as (
  select date_format(payment_date, '%Y-%m') as month, sum(amount) as revenue
  from payment
  group by 1
)
select month, revenue,
       lag(revenue) over (order by month) as previous,
       revenue - lag(revenue) over (order by month) as difference
from monthly
order by month;`,
        mysqlNote: 'to_char() becomes DATE_FORMAT() with %Y-%m.',
        explanation: 'LAG(revenue) reads the value from the previous row in month order. The first month has no previous row, so it gets NULL.',
      },
      {
        approach: 'Self join on the previous month',
        postgres: `with monthly as (
  select to_char(payment_date, 'YYYY-MM') as month, sum(amount) as revenue
  from payment
  group by 1
),
numbered as (
  select month, revenue, row_number() over (order by month) as n from monthly
)
select cur.month, cur.revenue, prev.revenue as previous, cur.revenue - prev.revenue as difference
from numbered cur
left join numbered prev on prev.n = cur.n - 1
order by cur.month;`,
        mysql: `with monthly as (
  select date_format(payment_date, '%Y-%m') as month, sum(amount) as revenue
  from payment
  group by 1
),
numbered as (
  select month, revenue, row_number() over (order by month) as n from monthly
)
select cur.month, cur.revenue, prev.revenue as previous, cur.revenue - prev.revenue as difference
from numbered cur
left join numbered prev on prev.n = cur.n - 1
order by cur.month;`,
        mysqlNote: 'Same query with DATE_FORMAT().',
        explanation: 'Number the months, then join each month to the one numbered just before it.',
      },
    ],
    comparison:
      'Same result. LAG is shorter and reads the data once. The self join is what people wrote before window functions; it is longer and needs the extra numbering step to handle gaps between months.',
    docs: [
      { label: 'PostgreSQL: lag()', url: PG + 'functions-window.html' },
      { label: 'MySQL: DATE_FORMAT()', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },
  {
    id: 'sakila-024',
    dataset: 'sakila',
    level: 3,
    topics: ['window-frames'],
    title: 'Running total for one customer',
    prompt: 'For customer 1, list payments in time order (then by payment_id) with payment_date, amount and a running total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'SUM() OVER',
        postgres: `select payment_date, amount,
       sum(amount) over (order by payment_date, payment_id) as running_total
from payment
where customer_id = 1
order by payment_date, payment_id;`,
        mysql: `select payment_date, amount,
       sum(amount) over (order by payment_date, payment_id) as running_total
from payment
where customer_id = 1
order by payment_date, payment_id;`,
        explanation:
          'With ORDER BY inside OVER, the default frame runs from the first row to the current one, which is exactly a running total. Including payment_id makes the order unique, so ties in time do not share a total.',
      },
      {
        approach: 'Correlated subquery',
        postgres: `select p.payment_date, p.amount,
       (select sum(p2.amount)
        from payment p2
        where p2.customer_id = 1
          and (p2.payment_date, p2.payment_id) <= (p.payment_date, p.payment_id)) as running_total
from payment p
where p.customer_id = 1
order by p.payment_date, p.payment_id;`,
        mysql: `select p.payment_date, p.amount,
       (select sum(p2.amount)
        from payment p2
        where p2.customer_id = 1
          and (p2.payment_date, p2.payment_id) <= (p.payment_date, p.payment_id)) as running_total
from payment p
where p.customer_id = 1
order by p.payment_date, p.payment_id;`,
        explanation: 'For each payment, add up all payments up to and including it. The row comparison (a, b) <= (c, d) compares column by column.',
      },
    ],
    comparison:
      'Same totals. The window version reads the rows once. The subquery version re-reads earlier payments for every row, so its cost grows with the square of the row count.',
    docs: [
      { label: 'PostgreSQL: Window function frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: Window function frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'sakila-025',
    dataset: 'sakila',
    level: 3,
    topics: ['date-series', 'recursive'],
    title: 'Rentals per month, including empty months',
    prompt:
      'Count rentals per month from May 2005 to February 2006, including months with no rentals (they should show 0). Show month (first day, as a date) and rentals.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select m.month::date as month,
       count(r.rental_id) as rentals
from generate_series(date '2005-05-01', date '2006-02-01', interval '1 month') as m(month)
left join rental r
       on r.rental_date >= m.month
      and r.rental_date <  m.month + interval '1 month'
group by m.month
order by m.month;`,
        mysql: null,
        mysqlNote: 'MySQL has no generate_series. Build the months with a recursive CTE (solution B).',
        explanation: 'generate_series produces one row per month; the LEFT JOIN keeps months that have no rentals, and count(r.rental_id) gives them 0.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive months(month) as (
  select date '2005-05-01'
  union all
  select (month + interval '1 month')::date from months where month < date '2006-02-01'
)
select m.month,
       count(r.rental_id) as rentals
from months m
left join rental r
       on r.rental_date >= m.month
      and r.rental_date <  m.month + interval '1 month'
group by m.month
order by m.month;`,
        mysql: `with recursive months(month) as (
  select date '2005-05-01'
  union all
  select month + interval 1 month from months where month < '2006-02-01'
)
select m.month,
       count(r.rental_id) as rentals
from months m
left join rental r
       on r.rental_date >= m.month
      and r.rental_date <  m.month + interval 1 month
group by m.month
order by m.month;`,
        mysqlNote: 'Interval syntax differs: interval 1 month without quotes, and no ::date cast needed.',
        explanation: 'The recursive part adds one month at a time until February 2006.',
      },
    ],
    comparison:
      'Same 10 months, five of them with 0. generate_series is shorter but PostgreSQL-only. The recursive CTE works in both databases. Count r.rental_id, not *, or empty months would show 1.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'sakila-026',
    dataset: 'sakila',
    level: 3,
    topics: ['cte', 'subqueries'],
    title: 'Customers who spend above average',
    prompt:
      'Which customers spent more in total than the average customer? Show customer_id and total spent, highest first, then by customer_id. Return only the first 10.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CTE',
        postgres: `with totals as (
  select customer_id, sum(amount) as total
  from payment
  group by customer_id
)
select customer_id, total
from totals
where total > (select avg(total) from totals)
order by total desc, customer_id
limit 10;`,
        mysql: `with totals as (
  select customer_id, sum(amount) as total
  from payment
  group by customer_id
)
select customer_id, total
from totals
where total > (select avg(total) from totals)
order by total desc, customer_id
limit 10;`,
        explanation: 'Per-customer totals are needed twice: once to list them, once to average them. A CTE computes them once and names them.',
      },
      {
        approach: 'Window average',
        postgres: `select customer_id, total
from (
  select customer_id, sum(amount) as total,
         avg(sum(amount)) over () as avg_total
  from payment
  group by customer_id
) t
where total > avg_total
order by total desc, customer_id
limit 10;`,
        mysql: `select customer_id, total
from (
  select customer_id, sum(amount) as total,
         avg(sum(amount)) over () as avg_total
  from payment
  group by customer_id
) t
where total > avg_total
order by total desc, customer_id
limit 10;`,
        explanation: 'A window function can wrap an aggregate: avg(sum(amount)) OVER () averages the per-customer sums across all groups.',
      },
    ],
    comparison:
      'Same customers. The CTE spells out each step and is easier to debug. The window version is compact but nests an aggregate inside a window function, which surprises many readers.',
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'sakila-027',
    dataset: 'sakila',
    level: 3,
    topics: ['ranking'],
    title: 'Customer spending quartiles',
    prompt:
      'Split customers into 4 equal groups by total spending (group 1 = top spenders; order ties by customer_id). For each group show the number of customers and the lowest and highest total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NTILE(4)',
        postgres: `with totals as (
  select customer_id, sum(amount) as total
  from payment
  group by customer_id
),
grouped as (
  select total, ntile(4) over (order by total desc, customer_id) as quartile
  from totals
)
select quartile, count(*) as customers, min(total) as lowest, max(total) as highest
from grouped
group by quartile
order by quartile;`,
        mysql: `with totals as (
  select customer_id, sum(amount) as total
  from payment
  group by customer_id
),
grouped as (
  select total, ntile(4) over (order by total desc, customer_id) as quartile
  from totals
)
select quartile, count(*) as customers, min(total) as lowest, max(total) as highest
from grouped
group by quartile
order by quartile;`,
        explanation: 'NTILE(4) deals the ordered rows into 4 buckets of (almost) equal size. With 599 customers, the first three get 150 and the last 149.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ntile()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'sakila-028',
    dataset: 'sakila',
    level: 3,
    topics: ['gaps-islands'],
    title: 'Streaks of business days',
    prompt:
      'Rentals happened only on some days. Find each streak of consecutive days that had at least one rental: first day, last day and number of days. Order by first day.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date minus row number',
        postgres: `with days as (
  select distinct rental_date::date as day from rental
),
grouped as (
  select day, day - (row_number() over (order by day))::int as streak
  from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from grouped
group by streak
order by first_day;`,
        mysql: `with days as (
  select distinct date(rental_date) as day from rental
),
grouped as (
  select day, date_sub(day, interval row_number() over (order by day) day) as streak
  from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from grouped
group by streak
order by first_day;`,
        mysqlNote: 'date - integer becomes DATE_SUB(date, INTERVAL n DAY); ::date becomes DATE().',
        explanation:
          'Within a streak, the day and its row number both grow by 1, so day minus row number stays constant. That constant identifies the streak; when a day is skipped, it jumps.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'sakila-029',
    dataset: 'sakila',
    level: 3,
    topics: ['dates-advanced', 'aggregates'],
    title: 'How long rentals last, by category',
    prompt:
      'For each category, show the average rental duration in days (return date minus rental date, ignoring unreturned rentals), rounded to 2 decimals. Longest first, then by category.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Interval to seconds',
        postgres: `select c.name as category,
       round(avg(extract(epoch from r.return_date - r.rental_date)) / 86400, 2) as avg_days
from rental r
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
where r.return_date is not null
group by c.category_id, c.name
order by avg_days desc, category;`,
        mysql: `select c.name as category,
       round(avg(timestampdiff(second, r.rental_date, r.return_date)) / 86400, 2) as avg_days
from rental r
join inventory i      on i.inventory_id = r.inventory_id
join film_category fc on fc.film_id = i.film_id
join category c       on c.category_id = fc.category_id
where r.return_date is not null
group by c.category_id, c.name
order by avg_days desc, category;`,
        mysqlNote:
          'Subtracting timestamps in MySQL does not give an interval. TIMESTAMPDIFF(SECOND, start, end) returns the difference as a number.',
        explanation:
          'In PostgreSQL, timestamp minus timestamp is an interval; extract(epoch …) turns it into seconds, and 86 400 seconds make a day.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: TIMESTAMPDIFF()', url: MY + 'date-and-time-functions.html#function_timestampdiff' },
    ],
  },
  {
    id: 'sakila-030',
    dataset: 'sakila',
    level: 3,
    topics: ['subtotals'],
    title: 'Rentals by store and rating, with subtotals',
    prompt:
      'Count rentals per store and film rating, plus a subtotal row per store and a grand total. Subtotal and total rows show NULL in the columns they add up. Order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select i.store_id, f.rating, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f      on f.film_id = i.film_id
group by rollup (i.store_id, f.rating);`,
        mysql: `select i.store_id, f.rating, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f      on f.film_id = i.film_id
group by i.store_id, f.rating with rollup;`,
        mysqlNote: 'MySQL writes it as GROUP BY … WITH ROLLUP. It has no GROUPING SETS or CUBE.',
        explanation: 'ROLLUP (a, b) groups by (a, b), then by (a), then by nothing, and stacks the results.',
      },
      {
        approach: 'UNION ALL of three queries',
        postgres: `select i.store_id, f.rating, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
group by i.store_id, f.rating
union all
select i.store_id, null, count(*)
from rental r
join inventory i on i.inventory_id = r.inventory_id
group by i.store_id
union all
select null, null, count(*)
from rental;`,
        mysql: `select i.store_id, f.rating, count(*) as rentals
from rental r
join inventory i on i.inventory_id = r.inventory_id
join film f on f.film_id = i.film_id
group by i.store_id, f.rating
union all
select i.store_id, null, count(*)
from rental r
join inventory i on i.inventory_id = r.inventory_id
group by i.store_id
union all
select null, null, count(*)
from rental;`,
        explanation: 'Write each grouping level as its own query and stack them.',
      },
    ],
    comparison:
      'Same 13 rows. ROLLUP reads the data once and keeps the levels in sync automatically. UNION ALL reads it three times and every level must be kept consistent by hand, but it works in any database.',
    docs: [
      { label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' },
      { label: 'MySQL: WITH ROLLUP', url: MY + 'group-by-modifiers.html' },
    ],
  },
]

export const sakilaExercises: Exercise[] = [...basics, ...sakilaAdvanced]
