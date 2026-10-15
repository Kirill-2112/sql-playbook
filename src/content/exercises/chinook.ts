import type { Exercise } from '../types'
import { chinookAdvanced } from './chinookAdvanced'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const basics: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'chinook-001',
    dataset: 'chinook',
    level: 1,
    topics: ['select-basics'],
    title: 'Tracks longer than 15 minutes',
    prompt: 'List tracks longer than 15 minutes (900 000 ms): name and milliseconds, longest first, then by track_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE + ORDER BY',
        postgres: `select name, milliseconds
from track
where milliseconds > 900000
order by milliseconds desc, track_id;`,
        mysql: `select name, milliseconds
from track
where milliseconds > 900000
order by milliseconds desc, track_id;`,
        explanation: 'You can sort by a column that is not selected, such as track_id, to make the order fully predictable.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Sorting rows', url: PG + 'queries-order.html' }],
  },
  {
    id: 'chinook-002',
    dataset: 'chinook',
    level: 1,
    topics: ['limit'],
    title: 'The biggest files',
    prompt: 'Show the 5 largest tracks by file size: track_id, name and bytes, largest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY + LIMIT',
        postgres: `select track_id, name, bytes
from track
order by bytes desc, track_id
limit 5;`,
        mysql: `select track_id, name, bytes
from track
order by bytes desc, track_id
limit 5;`,
        explanation: 'Sort descending, then keep the first 5 rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'chinook-003',
    dataset: 'chinook',
    level: 1,
    topics: ['distinct', 'group-by'],
    title: 'Countries, alphabetically — but whose alphabet?',
    prompt: 'List the countries customers live in, each once, in alphabetical order ignoring letter case.',
    hint: 'Look closely at where "USA" and "United Kingdom" end up.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY + ORDER BY lower()',
        postgres: `select country
from customer
group by country
order by lower(country);`,
        mysql: `select country
from customer
group by country
order by country;`,
        mysqlNote:
          'MySQL\'s default collation (utf8mb4_0900_ai_ci) already ignores case, so a plain ORDER BY gives "United Kingdom" before "USA".',
        explanation:
          'Sorting depends on the collation. This PostgreSQL database uses the C collation, which compares raw character codes: every uppercase letter comes before every lowercase one, so plain ORDER BY puts "USA" before "United Kingdom". lower() compares "usa" with "united kingdom" instead. GROUP BY gives one row per country; with SELECT DISTINCT, PostgreSQL would reject ORDER BY lower(country) because that expression is not in the select list.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Collation support', url: PG + 'collation.html' },
      { label: 'MySQL: Character sets and collations', url: MY + 'charset-general.html' },
    ],
  },
  {
    id: 'chinook-004',
    dataset: 'chinook',
    level: 1,
    topics: ['null'],
    title: 'Customers without a fax',
    prompt: 'Which customers have no fax number? Show first_name, last_name and country, ordered by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'IS NULL',
        postgres: `select first_name, last_name, country
from customer
where fax is null
order by customer_id;`,
        mysql: `select first_name, last_name, country
from customer
where fax is null
order by customer_id;`,
        explanation: 'A missing value is NULL, and only IS NULL finds it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: IS NULL', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'chinook-005',
    dataset: 'chinook',
    level: 1,
    topics: ['text-search'],
    title: 'Songs about love',
    prompt: 'Find tracks with "love" anywhere in the name, in any letter case. Show track_id and name, ordered by track_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE',
        postgres: `select track_id, name
from track
where name ilike '%love%'
order by track_id;`,
        mysql: `select track_id, name
from track
where name like '%love%'
order by track_id;`,
        mysqlNote: 'No ILIKE in MySQL; LIKE ignores case under the default collation.',
        explanation: 'ILIKE matches the pattern without caring about case.',
      },
      {
        approach: 'Regular expression',
        postgres: `select track_id, name
from track
where name ~* 'love'
order by track_id;`,
        mysql: `select track_id, name
from track
where name regexp 'love'
order by track_id;`,
        mysqlNote: 'MySQL uses REGEXP (or REGEXP_LIKE()), which follows the column collation and so ignores case here.',
        explanation: '~* is a case-insensitive regex match. Regexes can express much more than LIKE, for example whole words with \\m and \\M.',
      },
    ],
    comparison:
      'Same tracks. LIKE/ILIKE is simpler and enough for "contains". Reach for regular expressions when you need word boundaries, alternatives or character classes. In MySQL, both follow the collation, so case-insensitivity comes for free.',
    docs: [
      { label: 'PostgreSQL: Pattern matching', url: PG + 'functions-matching.html' },
      { label: 'MySQL: Regular expressions', url: MY + 'regexp.html' },
    ],
  },
  {
    id: 'chinook-006',
    dataset: 'chinook',
    level: 1,
    topics: ['conditions'],
    title: 'Short, medium or long?',
    prompt:
      'For the tracks of album 1, show track_id, name and a label: "short" under 3 minutes, "medium" from 3 to 5 minutes, "long" over 5. Order by track_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CASE',
        postgres: `select track_id, name,
       case
         when milliseconds < 180000 then 'short'
         when milliseconds <= 300000 then 'medium'
         else 'long'
       end as length_label
from track
where album_id = 1
order by track_id;`,
        mysql: `select track_id, name,
       case
         when milliseconds < 180000 then 'short'
         when milliseconds <= 300000 then 'medium'
         else 'long'
       end as length_label
from track
where album_id = 1
order by track_id;`,
        explanation: 'The first matching WHEN wins, so the order of the branches matters.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'chinook-007',
    dataset: 'chinook',
    level: 1,
    topics: ['strings'],
    title: 'Email domains',
    prompt: 'For customers in Canada, show first_name, last_name and the part of the email after "@" (column domain). Order by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'split_part()',
        postgres: `select first_name, last_name,
       split_part(email, '@', 2) as domain
from customer
where country = 'Canada'
order by customer_id;`,
        mysql: `select first_name, last_name,
       substring_index(email, '@', -1) as domain
from customer
where country = 'Canada'
order by customer_id;`,
        mysqlNote: 'MySQL has no split_part. SUBSTRING_INDEX(str, delim, -1) returns everything after the last delimiter.',
        explanation: 'split_part(text, delimiter, n) cuts the text at the delimiter and returns piece n.',
      },
      {
        approach: 'substring() + position()',
        postgres: `select first_name, last_name,
       substring(email from position('@' in email) + 1) as domain
from customer
where country = 'Canada'
order by customer_id;`,
        mysql: `select first_name, last_name,
       substring(email from position('@' in email) + 1) as domain
from customer
where country = 'Canada'
order by customer_id;`,
        explanation: 'Find where "@" is, then take everything after it. This standard SQL form runs unchanged in both databases.',
      },
    ],
    comparison:
      'Same output. split_part and SUBSTRING_INDEX are each tied to one database but read well. substring(… from position(…)) is longer but portable.',
    docs: [
      { label: 'PostgreSQL: split_part', url: PG + 'functions-string.html' },
      { label: 'MySQL: SUBSTRING_INDEX()', url: MY + 'string-functions.html#function_substring-index' },
    ],
  },
  {
    id: 'chinook-008',
    dataset: 'chinook',
    level: 1,
    topics: ['numbers'],
    title: 'Minutes and megabytes',
    prompt:
      'For album 1, show each track\'s name, its length in whole minutes (column minutes) and its size in MB rounded to 1 decimal (column size_mb, 1 MB = 1 048 576 bytes). Order by track_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer and decimal division',
        postgres: `select name,
       milliseconds / 60000 as minutes,
       round(bytes / 1048576.0, 1) as size_mb
from track
where album_id = 1
order by track_id;`,
        mysql: `select name,
       milliseconds div 60000 as minutes,
       round(bytes / 1048576, 1) as size_mb
from track
where album_id = 1
order by track_id;`,
        mysqlNote:
          'In MySQL, / always gives a decimal, so whole minutes need DIV. In PostgreSQL, integer / integer drops the remainder, so you add .0 to get a decimal result.',
        explanation: 'The same symbol / behaves differently depending on the types of its operands, and on the database.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Mathematical operators', url: PG + 'functions-math.html' },
      { label: 'MySQL: DIV', url: MY + 'arithmetic-functions.html#operator_div' },
    ],
  },
  {
    id: 'chinook-009',
    dataset: 'chinook',
    level: 1,
    topics: ['dates-basics'],
    title: 'Invoices from March 2025',
    prompt: 'Show the invoices issued in March 2025: invoice_id, invoice_date and total, in date order, then by invoice_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date range',
        postgres: `select invoice_id, invoice_date, total
from invoice
where invoice_date >= '2025-03-01'
  and invoice_date <  '2025-04-01'
order by invoice_date, invoice_id;`,
        mysql: `select invoice_id, invoice_date, total
from invoice
where invoice_date >= '2025-03-01'
  and invoice_date <  '2025-04-01'
order by invoice_date, invoice_id;`,
        explanation: 'From the first moment of March up to, but not including, the first moment of April.',
      },
      {
        approach: 'Extract year and month',
        postgres: `select invoice_id, invoice_date, total
from invoice
where extract(year from invoice_date) = 2025
  and extract(month from invoice_date) = 3
order by invoice_date, invoice_id;`,
        mysql: `select invoice_id, invoice_date, total
from invoice
where year(invoice_date) = 2025
  and month(invoice_date) = 3
order by invoice_date, invoice_id;`,
        mysqlNote: 'MySQL also supports EXTRACT(YEAR FROM …), but YEAR() and MONTH() are more common there.',
        explanation: 'Pull the year and month out of each date and compare them.',
      },
    ],
    comparison:
      'Same invoices. The range keeps the column untouched, so an index on invoice_date can be used. Extracting parts reads more like the question but forces a full scan on large tables.',
    docs: [
      { label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: YEAR(), MONTH()', url: MY + 'date-and-time-functions.html' },
    ],
  },

  // ---------- Level 2 ----------
  {
    id: 'chinook-010',
    dataset: 'chinook',
    level: 2,
    topics: ['joins'],
    title: 'Everything by AC/DC',
    prompt: 'List every AC/DC track with its album title. Show album title and track name, ordered by album_id, then track_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two joins',
        postgres: `select al.title as album, t.name as track
from artist ar
join album al on al.artist_id = ar.artist_id
join track t  on t.album_id = al.album_id
where ar.name = 'AC/DC'
order by al.album_id, t.track_id;`,
        mysql: `select al.title as album, t.name as track
from artist ar
join album al on al.artist_id = ar.artist_id
join track t  on t.album_id = al.album_id
where ar.name = 'AC/DC'
order by al.album_id, t.track_id;`,
        explanation: 'Artist → album → track, following the foreign keys.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins between tables', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'chinook-011',
    dataset: 'chinook',
    level: 2,
    topics: ['subqueries', 'joins'],
    title: 'Artists without albums',
    prompt: 'How many artists have no albums in the store?',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as artists
from artist a
where not exists (select 1 from album b where b.artist_id = a.artist_id);`,
        mysql: `select count(*) as artists
from artist a
where not exists (select 1 from album b where b.artist_id = a.artist_id);`,
        explanation: 'Count artists for whom no album row exists.',
      },
      {
        approach: 'LEFT JOIN … IS NULL',
        postgres: `select count(*) as artists
from artist a
left join album b on b.artist_id = a.artist_id
where b.album_id is null;`,
        mysql: `select count(*) as artists
from artist a
left join album b on b.artist_id = a.artist_id
where b.album_id is null;`,
        explanation: 'Unmatched artists come out of the LEFT JOIN with NULL album columns.',
      },
      {
        approach: 'Count difference',
        postgres: `select (select count(*) from artist)
     - (select count(distinct artist_id) from album) as artists;`,
        mysql: `select (select count(*) from artist)
     - (select count(distinct artist_id) from album) as artists;`,
        explanation: 'All artists minus artists that appear in album.',
      },
    ],
    comparison:
      'All give 71. NOT EXISTS and LEFT JOIN are the general patterns and also let you list the artists. The subtraction only works for a count, and only because every album.artist_id points to an existing artist (the foreign key guarantees it).',
    docs: [{ label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' }],
  },
  {
    id: 'chinook-012',
    dataset: 'chinook',
    level: 2,
    topics: ['group-by', 'aggregates'],
    title: 'Tracks per genre',
    prompt: 'How many tracks does each genre have? Show genre name and count, most tracks first, then by genre_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY',
        postgres: `select g.name, count(*) as tracks
from genre g
join track t on t.genre_id = g.genre_id
group by g.genre_id, g.name
order by tracks desc, g.genre_id;`,
        mysql: `select g.name, count(*) as tracks
from genre g
join track t on t.genre_id = g.genre_id
group by g.genre_id, g.name
order by tracks desc, g.genre_id;`,
        explanation: 'Group the joined rows by genre and count each group.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'chinook-013',
    dataset: 'chinook',
    level: 2,
    topics: ['group-by'],
    title: 'Best customers',
    prompt: 'Which customers spent more than 45 in total? Show first_name, last_name and total, highest first, then by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'HAVING',
        postgres: `select c.first_name, c.last_name, sum(i.total) as total
from customer c
join invoice i on i.customer_id = c.customer_id
group by c.customer_id
having sum(i.total) > 45
order by total desc, c.customer_id;`,
        mysql: `select c.first_name, c.last_name, sum(i.total) as total
from customer c
join invoice i on i.customer_id = c.customer_id
group by c.customer_id
having sum(i.total) > 45
order by total desc, c.customer_id;`,
        explanation: 'HAVING filters after grouping, so it can use sum().',
      },
    ],
    docs: [{ label: 'PostgreSQL: HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'chinook-014',
    dataset: 'chinook',
    level: 2,
    topics: ['aggregates', 'numbers'],
    title: 'Sales by billing country',
    prompt:
      'For each billing country: number of invoices, total revenue and average invoice rounded to 2 decimals. Highest revenue first, then by country.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Several aggregates',
        postgres: `select billing_country,
       count(*) as invoices,
       sum(total) as revenue,
       round(avg(total), 2) as avg_invoice
from invoice
group by billing_country
order by revenue desc, billing_country;`,
        mysql: `select billing_country,
       count(*) as invoices,
       sum(total) as revenue,
       round(avg(total), 2) as avg_invoice
from invoice
group by billing_country
order by revenue desc, billing_country;`,
        explanation:
          'Always round averages you plan to show or compare. PostgreSQL returns avg() of a numeric with up to 16 decimals, MySQL with 4 more than the column.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: avg()', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: AVG()', url: MY + 'aggregate-functions.html#function_avg' },
    ],
  },
  {
    id: 'chinook-015',
    dataset: 'chinook',
    level: 2,
    topics: ['joins', 'aggregates'],
    title: 'Sales by support agent',
    prompt:
      'For each employee who supports customers, show first_name, last_name, how many customers they support and the total sales of those customers. Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'COUNT(DISTINCT)',
        postgres: `select e.first_name, e.last_name,
       count(distinct c.customer_id) as customers,
       sum(i.total) as sales
from employee e
join customer c on c.support_rep_id = e.employee_id
join invoice i  on i.customer_id = c.customer_id
group by e.employee_id
order by e.employee_id;`,
        mysql: `select e.first_name, e.last_name,
       count(distinct c.customer_id) as customers,
       sum(i.total) as sales
from employee e
join customer c on c.support_rep_id = e.employee_id
join invoice i  on i.customer_id = c.customer_id
group by e.employee_id
order by e.employee_id;`,
        explanation:
          'After joining invoices, each customer appears once per invoice. count(*) would count invoices; count(distinct customer_id) counts customers.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'chinook-016',
    dataset: 'chinook',
    level: 2,
    topics: ['text-aggregation', 'group-by'],
    title: 'Tiny playlists',
    prompt:
      'For playlists with at most 3 tracks, show the playlist name and its track names in one string separated by " | ", in track_id order. Order by playlist_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg',
        postgres: `select p.name,
       string_agg(t.name, ' | ' order by t.track_id) as tracks
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
group by p.playlist_id
having count(*) <= 3
order by p.playlist_id;`,
        mysql: `select p.name,
       group_concat(t.name order by t.track_id separator ' | ') as tracks
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
group by p.playlist_id
having count(*) <= 3
order by p.playlist_id;`,
        mysqlNote: 'GROUP_CONCAT instead of string_agg; the separator goes after SEPARATOR.',
        explanation: 'string_agg builds the list per group; HAVING keeps only small playlists.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT()', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'chinook-017',
    dataset: 'chinook',
    level: 2,
    topics: ['self-cross-join', 'null'],
    title: 'Who reports to whom',
    prompt:
      'List every employee with their manager: employee first and last name, and the manager\'s first and last name (NULL for the top boss). Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEFT self join',
        postgres: `select e.first_name, e.last_name,
       m.first_name as manager_first_name,
       m.last_name  as manager_last_name
from employee e
left join employee m on m.employee_id = e.reports_to
order by e.employee_id;`,
        mysql: `select e.first_name, e.last_name,
       m.first_name as manager_first_name,
       m.last_name  as manager_last_name
from employee e
left join employee m on m.employee_id = e.reports_to
order by e.employee_id;`,
        explanation: 'The same table plays two roles. LEFT JOIN keeps the general manager, who reports to nobody.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'chinook-018',
    dataset: 'chinook',
    level: 2,
    topics: ['conditional-aggregates'],
    title: 'Genre statistics in one pass',
    prompt:
      'For each genre: total tracks, tracks shorter than 3 minutes, and tracks with no composer. Show genre_id with the three counts; order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select genre_id,
       count(*) as tracks,
       count(*) filter (where milliseconds < 180000) as short_tracks,
       count(*) filter (where composer is null) as no_composer
from track
group by genre_id;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL. Use SUM(CASE …) as in solution B.',
        explanation: 'Each aggregate gets its own row filter.',
      },
      {
        approach: 'SUM(CASE …)',
        postgres: `select genre_id,
       count(*) as tracks,
       sum(case when milliseconds < 180000 then 1 else 0 end) as short_tracks,
       sum(case when composer is null then 1 else 0 end) as no_composer
from track
group by genre_id;`,
        mysql: `select genre_id,
       count(*) as tracks,
       sum(case when milliseconds < 180000 then 1 else 0 end) as short_tracks,
       sum(case when composer is null then 1 else 0 end) as no_composer
from track
group by genre_id;`,
        explanation: 'Add 1 for every matching row.',
      },
    ],
    comparison: 'Same counts. FILTER is clearer and PostgreSQL-specific; SUM(CASE …) runs everywhere.',
    docs: [{ label: 'PostgreSQL: FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'chinook-019',
    dataset: 'chinook',
    level: 2,
    topics: ['set-operations'],
    title: 'Cities with both customers and staff',
    prompt: 'Which (city, country) pairs have at least one customer and at least one employee?',
    orderMatters: false,
    solutions: [
      {
        approach: 'INTERSECT',
        postgres: `select city, country from customer
intersect
select city, country from employee;`,
        mysql: `select city, country from customer
intersect
select city, country from employee;`,
        explanation: 'Rows that appear in both results.',
      },
      {
        approach: 'EXISTS',
        postgres: `select distinct c.city, c.country
from customer c
where exists (
  select 1 from employee e where e.city = c.city and e.country = c.country
);`,
        mysql: `select distinct c.city, c.country
from customer c
where exists (
  select 1 from employee e where e.city = c.city and e.country = c.country
);`,
        explanation: 'Customer locations for which a matching employee location exists.',
      },
    ],
    comparison:
      'Same answer. INTERSECT compares whole rows and treats two NULLs as equal; EXISTS with = does not match NULL to NULL. Here no city is NULL, so they agree.',
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'chinook-020',
    dataset: 'chinook',
    level: 2,
    topics: ['subqueries', 'set-operations'],
    title: 'Tracks nobody bought',
    prompt: 'How many tracks have never been sold?',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as never_sold
from track t
where not exists (select 1 from invoice_line l where l.track_id = t.track_id);`,
        mysql: `select count(*) as never_sold
from track t
where not exists (select 1 from invoice_line l where l.track_id = t.track_id);`,
        explanation: 'Count tracks with no invoice line.',
      },
      {
        approach: 'EXCEPT',
        postgres: `select count(*) as never_sold
from (
  select track_id from track
  except
  select track_id from invoice_line
) t;`,
        mysql: `select count(*) as never_sold
from (
  select track_id from track
  except
  select track_id from invoice_line
) t;`,
        explanation: 'All track ids minus sold track ids, then count them.',
      },
      {
        approach: 'LEFT JOIN … IS NULL',
        postgres: `select count(*) as never_sold
from track t
left join invoice_line l on l.track_id = t.track_id
where l.invoice_line_id is null;`,
        mysql: `select count(*) as never_sold
from track t
left join invoice_line l on l.track_id = t.track_id
where l.invoice_line_id is null;`,
        explanation: 'Keep tracks whose join produced no invoice line.',
      },
    ],
    comparison:
      'All return 1 519. NOT EXISTS and LEFT JOIN are planned as the same anti-join. EXCEPT works on sets of ids and needs a subquery to count, but it reads very close to the question.',
    docs: [{ label: 'PostgreSQL: Subquery expressions', url: PG + 'functions-subquery.html' }],
  },
  {
    id: 'chinook-021',
    dataset: 'chinook',
    level: 2,
    topics: ['casting', 'strings'],
    title: 'Whole dollars and price tags',
    prompt:
      'For invoices 1 to 10, show invoice_id, total, the total rounded to whole dollars as an integer (column dollars), and a text label like "$1.98" (column label). Order by invoice_id.',
    orderMatters: true,
    solutions: [
      {
        approach: ':: cast',
        postgres: `select invoice_id, total,
       total::integer as dollars,
       '$' || total::text as label
from invoice
where invoice_id <= 10
order by invoice_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no :: operator. Use CAST() as in solution B.',
        explanation: 'expression::type is PostgreSQL shorthand for CAST(expression AS type). Casting a numeric to integer rounds it.',
      },
      {
        approach: 'CAST()',
        postgres: `select invoice_id, total,
       cast(total as integer) as dollars,
       concat('$', cast(total as text)) as label
from invoice
where invoice_id <= 10
order by invoice_id;`,
        mysql: `select invoice_id, total,
       cast(total as signed) as dollars,
       concat('$', cast(total as char)) as label
from invoice
where invoice_id <= 10
order by invoice_id;`,
        mysqlNote: 'MySQL casts to SIGNED (not INTEGER) and to CHAR (not TEXT).',
        explanation: 'CAST is standard SQL. The target type names differ between databases.',
      },
    ],
    comparison: 'Same values. :: is compact and very common in PostgreSQL code; CAST() is portable apart from the type names.',
    docs: [
      { label: 'PostgreSQL: Type casts', url: PG + 'sql-expressions.html#SQL-SYNTAX-TYPE-CASTS' },
      { label: 'MySQL: CAST()', url: MY + 'cast-functions.html#function_cast' },
    ],
  },

  // ---------- Level 3 ----------
  {
    id: 'chinook-022',
    dataset: 'chinook',
    level: 3,
    topics: ['ranking', 'distinct'],
    title: 'Best seller in each genre',
    prompt:
      'For each genre, find the track sold in the largest quantity (ties go to the lower track_id). Show genre_id, track_id, track name and quantity sold. Order by genre_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `with sales as (
  select t.genre_id, t.track_id, t.name, sum(l.quantity) as sold
  from invoice_line l
  join track t on t.track_id = l.track_id
  group by t.genre_id, t.track_id, t.name
)
select genre_id, track_id, name, sold
from (
  select sales.*, row_number() over (partition by genre_id order by sold desc, track_id) as place
  from sales
) ranked
where place = 1
order by genre_id;`,
        mysql: `with sales as (
  select t.genre_id, t.track_id, t.name, sum(l.quantity) as sold
  from invoice_line l
  join track t on t.track_id = l.track_id
  group by t.genre_id, t.track_id, t.name
)
select genre_id, track_id, name, sold
from (
  select sales.*, row_number() over (partition by genre_id order by sold desc, track_id) as place
  from sales
) ranked
where place = 1
order by genre_id;`,
        explanation: 'Number tracks within each genre by sales and keep number 1.',
      },
      {
        approach: 'DISTINCT ON',
        postgres: `select distinct on (t.genre_id)
       t.genre_id, t.track_id, t.name, sum(l.quantity) as sold
from invoice_line l
join track t on t.track_id = l.track_id
group by t.genre_id, t.track_id, t.name
order by t.genre_id, sold desc, t.track_id;`,
        mysql: null,
        mysqlNote: 'DISTINCT ON is PostgreSQL-only. Use ROW_NUMBER() (solution A).',
        explanation:
          'DISTINCT ON (genre_id) keeps the first row of each genre according to ORDER BY, so the ORDER BY decides which track wins.',
      },
    ],
    comparison:
      'Same winners. DISTINCT ON is the shortest way to get "first row per group" in PostgreSQL. ROW_NUMBER is portable and extends to "top 3" by changing one number.',
    docs: [
      { label: 'PostgreSQL: DISTINCT ON', url: PG + 'sql-select.html#SQL-DISTINCT' },
      { label: 'PostgreSQL: row_number()', url: PG + 'functions-window.html' },
    ],
  },
  {
    id: 'chinook-023',
    dataset: 'chinook',
    level: 3,
    topics: ['recursive', 'strings'],
    title: 'The org chart',
    prompt:
      'Build the reporting tree: for every employee show employee_id, full name, depth (the general manager is 1) and the chain of names from the top, joined by " > ". Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WITH RECURSIVE',
        postgres: `with recursive org as (
  select employee_id,
         first_name || ' ' || last_name as name,
         1 as depth,
         first_name || ' ' || last_name as chain
  from employee
  where reports_to is null
  union all
  select e.employee_id,
         e.first_name || ' ' || e.last_name,
         o.depth + 1,
         o.chain || ' > ' || e.first_name || ' ' || e.last_name
  from employee e
  join org o on e.reports_to = o.employee_id
)
select employee_id, name, depth, chain
from org
order by employee_id;`,
        mysql: `with recursive org as (
  select employee_id,
         concat(first_name, ' ', last_name) as name,
         1 as depth,
         cast(concat(first_name, ' ', last_name) as char(500)) as chain
  from employee
  where reports_to is null
  union all
  select e.employee_id,
         concat(e.first_name, ' ', e.last_name),
         o.depth + 1,
         concat(o.chain, ' > ', e.first_name, ' ', e.last_name)
  from employee e
  join org o on e.reports_to = o.employee_id
)
select employee_id, name, depth, chain
from org
order by employee_id;`,
        mysqlNote:
          'In MySQL the column types of a recursive CTE come from the first (anchor) part only. Without CAST(… AS CHAR(500)), chain would be as wide as the top manager\'s name, and longer chains fail with "Data too long".',
        explanation:
          'The first SELECT finds the top of the tree. The second joins employees to rows already found, one level at a time, until no new rows appear.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'chinook-024',
    dataset: 'chinook',
    level: 3,
    topics: ['lag-lead', 'numbers'],
    title: 'Yearly growth',
    prompt:
      'Show revenue per year and the growth versus the previous year in percent, rounded to 1 decimal (NULL for the first year). Order by year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG()',
        postgres: `with yearly as (
  select extract(year from invoice_date)::int as year, sum(total) as revenue
  from invoice
  group by 1
)
select year, revenue,
       round(100.0 * (revenue - lag(revenue) over (order by year))
             / lag(revenue) over (order by year), 1) as growth_pct
from yearly
order by year;`,
        mysql: `with yearly as (
  select year(invoice_date) as year, sum(total) as revenue
  from invoice
  group by 1
)
select year, revenue,
       round(100.0 * (revenue - lag(revenue) over (order by year))
             / lag(revenue) over (order by year), 1) as growth_pct
from yearly
order by year;`,
        mysqlNote: 'YEAR() instead of extract(year …)::int.',
        explanation: 'LAG gives last year\'s revenue on this year\'s row; the rest is arithmetic.',
      },
    ],
    docs: [{ label: 'PostgreSQL: lag()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'chinook-025',
    dataset: 'chinook',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Three-month moving average',
    prompt:
      'For each month (YYYY-MM), show revenue and the average of that month and the two before it, rounded to 2 decimals. Order by month.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROWS BETWEEN 2 PRECEDING',
        postgres: `with monthly as (
  select to_char(invoice_date, 'YYYY-MM') as month, sum(total) as revenue
  from invoice
  group by 1
)
select month, revenue,
       round(avg(revenue) over (order by month rows between 2 preceding and current row), 2) as moving_avg
from monthly
order by month;`,
        mysql: `with monthly as (
  select date_format(invoice_date, '%Y-%m') as month, sum(total) as revenue
  from invoice
  group by 1
)
select month, revenue,
       round(avg(revenue) over (order by month rows between 2 preceding and current row), 2) as moving_avg
from monthly
order by month;`,
        mysqlNote: 'Only the month formatting changes: DATE_FORMAT(…, \'%Y-%m\').',
        explanation:
          'The frame "rows between 2 preceding and current row" limits the average to a sliding window of three rows. The first two months average over fewer rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: Window function frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'chinook-026',
    dataset: 'chinook',
    level: 3,
    topics: ['cte', 'ranking'],
    title: 'Customer cohorts',
    prompt: 'Group customers by the month of their first purchase (YYYY-MM). Show each month and how many customers started then. Order by month.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CTE with min()',
        postgres: `with first_purchase as (
  select customer_id, min(invoice_date) as first_date
  from invoice
  group by customer_id
)
select to_char(first_date, 'YYYY-MM') as cohort, count(*) as customers
from first_purchase
group by 1
order by 1;`,
        mysql: `with first_purchase as (
  select customer_id, min(invoice_date) as first_date
  from invoice
  group by customer_id
)
select date_format(first_date, '%Y-%m') as cohort, count(*) as customers
from first_purchase
group by 1
order by 1;`,
        mysqlNote: 'DATE_FORMAT instead of to_char.',
        explanation: 'First find each customer\'s first purchase, then count customers per month.',
      },
      {
        approach: 'ROW_NUMBER()',
        postgres: `select to_char(invoice_date, 'YYYY-MM') as cohort, count(*) as customers
from (
  select customer_id, invoice_date,
         row_number() over (partition by customer_id order by invoice_date, invoice_id) as n
  from invoice
) i
where n = 1
group by 1
order by 1;`,
        mysql: `select date_format(invoice_date, '%Y-%m') as cohort, count(*) as customers
from (
  select customer_id, invoice_date,
         row_number() over (partition by customer_id order by invoice_date, invoice_id) as n
  from invoice
) i
where n = 1
group by 1
order by 1;`,
        mysqlNote: 'DATE_FORMAT instead of to_char.',
        explanation: 'Mark each customer\'s first invoice with n = 1 and count those.',
      },
    ],
    comparison:
      'Same cohorts. min() is simpler when you only need the date. ROW_NUMBER gives you the whole first invoice row, for example to see what the first purchase was.',
    docs: [{ label: 'PostgreSQL: to_char', url: PG + 'functions-formatting.html' }],
  },
  {
    id: 'chinook-027',
    dataset: 'chinook',
    level: 3,
    topics: ['pivot', 'conditional-aggregates'],
    title: 'Revenue by year, one column per year',
    prompt:
      'For USA, Canada, Brazil, France and Germany, show the billing country and its revenue in 2021, 2022, 2023, 2024 and 2025 as five columns (y2021 … y2025). Order by country.',
    orderMatters: true,
    solutions: [
      {
        approach: 'SUM(CASE …)',
        postgres: `select billing_country,
       sum(case when extract(year from invoice_date) = 2021 then total else 0 end) as y2021,
       sum(case when extract(year from invoice_date) = 2022 then total else 0 end) as y2022,
       sum(case when extract(year from invoice_date) = 2023 then total else 0 end) as y2023,
       sum(case when extract(year from invoice_date) = 2024 then total else 0 end) as y2024,
       sum(case when extract(year from invoice_date) = 2025 then total else 0 end) as y2025
from invoice
where billing_country in ('USA', 'Canada', 'Brazil', 'France', 'Germany')
group by billing_country
order by billing_country;`,
        mysql: `select billing_country,
       sum(case when year(invoice_date) = 2021 then total else 0 end) as y2021,
       sum(case when year(invoice_date) = 2022 then total else 0 end) as y2022,
       sum(case when year(invoice_date) = 2023 then total else 0 end) as y2023,
       sum(case when year(invoice_date) = 2024 then total else 0 end) as y2024,
       sum(case when year(invoice_date) = 2025 then total else 0 end) as y2025
from invoice
where billing_country in ('USA', 'Canada', 'Brazil', 'France', 'Germany')
group by billing_country
order by billing_country;`,
        explanation: 'Each column adds up only the rows of its year. This is "pivoting" with plain aggregates.',
      },
      {
        approach: 'FILTER',
        postgres: `select billing_country,
       coalesce(sum(total) filter (where extract(year from invoice_date) = 2021), 0) as y2021,
       coalesce(sum(total) filter (where extract(year from invoice_date) = 2022), 0) as y2022,
       coalesce(sum(total) filter (where extract(year from invoice_date) = 2023), 0) as y2023,
       coalesce(sum(total) filter (where extract(year from invoice_date) = 2024), 0) as y2024,
       coalesce(sum(total) filter (where extract(year from invoice_date) = 2025), 0) as y2025
from invoice
where billing_country in ('USA', 'Canada', 'Brazil', 'France', 'Germany')
group by billing_country
order by billing_country;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; use solution A.',
        explanation: 'sum() FILTER (WHERE …) returns NULL when no row matches, so coalesce turns that into 0.',
      },
    ],
    comparison:
      'Same table. SUM(CASE …) works everywhere. FILTER reads better but returns NULL for empty cells, hence the coalesce. For years you do not know in advance, SQL cannot add columns by itself: you generate the query, or use the crosstab() extension in PostgreSQL.',
    docs: [{ label: 'PostgreSQL: tablefunc crosstab', url: PG + 'tablefunc.html' }],
  },
  {
    id: 'chinook-028',
    dataset: 'chinook',
    level: 3,
    topics: ['lag-lead', 'dates-advanced'],
    title: 'Days between purchases',
    prompt:
      'For customers 1 to 5, show customer_id and the average number of days between consecutive invoices, rounded to 1 decimal. Order by customer_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG() + date difference',
        postgres: `with gaps as (
  select customer_id,
         invoice_date::date - lag(invoice_date::date) over (partition by customer_id order by invoice_date, invoice_id) as days
  from invoice
  where customer_id between 1 and 5
)
select customer_id, round(avg(days), 1) as avg_days
from gaps
group by customer_id
order by customer_id;`,
        mysql: `with gaps as (
  select customer_id,
         datediff(invoice_date, lag(invoice_date) over (partition by customer_id order by invoice_date, invoice_id)) as days
  from invoice
  where customer_id between 1 and 5
)
select customer_id, round(avg(days), 1) as avg_days
from gaps
group by customer_id
order by customer_id;`,
        mysqlNote: 'DATEDIFF(later, earlier) returns days. In PostgreSQL, date minus date already is a number of days.',
        explanation: 'LAG brings the previous invoice date onto each row; the first invoice has none, and avg() ignores that NULL.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: DATEDIFF()', url: MY + 'date-and-time-functions.html#function_datediff' },
    ],
  },
  {
    id: 'chinook-029',
    dataset: 'chinook',
    level: 3,
    topics: ['subtotals'],
    title: 'Revenue by country and city, with subtotals',
    prompt:
      'For invoices billed to the USA or Canada, show revenue per country and city, a subtotal per country and a grand total. Order does not matter.',
    orderMatters: false,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select billing_country, billing_city, sum(total) as revenue
from invoice
where billing_country in ('USA', 'Canada')
group by rollup (billing_country, billing_city);`,
        mysql: `select billing_country, billing_city, sum(total) as revenue
from invoice
where billing_country in ('USA', 'Canada')
group by billing_country, billing_city with rollup;`,
        mysqlNote: 'MySQL syntax: GROUP BY … WITH ROLLUP.',
        explanation: 'ROLLUP adds a row per country (city = NULL) and one grand-total row (both NULL).',
      },
      {
        approach: 'GROUPING SETS',
        postgres: `select billing_country, billing_city, sum(total) as revenue
from invoice
where billing_country in ('USA', 'Canada')
group by grouping sets ((billing_country, billing_city), (billing_country), ());`,
        mysql: null,
        mysqlNote: 'MySQL has no GROUPING SETS; use WITH ROLLUP.',
        explanation: 'GROUPING SETS lists the grouping levels explicitly. ROLLUP (a, b) is shorthand for exactly these three sets.',
      },
    ],
    comparison:
      'Identical rows. ROLLUP is the shortcut for hierarchical subtotals; GROUPING SETS lets you choose any combination of levels, for example per city and per country but no grand total.',
    docs: [{ label: 'PostgreSQL: GROUPING SETS', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'chinook-030',
    dataset: 'chinook',
    level: 3,
    topics: ['ranking', 'lateral'],
    title: 'Two longest tracks in each genre',
    prompt:
      'For each genre, show its two longest tracks: genre name, track name, milliseconds and place (1 or 2). Ties go to the lower track_id. Order by genre_id, then place.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `select genre, track, milliseconds, place
from (
  select g.genre_id, g.name as genre, t.name as track, t.milliseconds,
         row_number() over (partition by g.genre_id order by t.milliseconds desc, t.track_id) as place
  from genre g
  join track t on t.genre_id = g.genre_id
) ranked
where place <= 2
order by genre_id, place;`,
        mysql: `select genre, track, milliseconds, place
from (
  select g.genre_id, g.name as genre, t.name as track, t.milliseconds,
         row_number() over (partition by g.genre_id order by t.milliseconds desc, t.track_id) as place
  from genre g
  join track t on t.genre_id = g.genre_id
) ranked
where place <= 2
order by genre_id, place;`,
        explanation: 'Rank tracks inside each genre and keep the first two.',
      },
      {
        approach: 'LATERAL',
        postgres: `select g.name as genre, t.name as track, t.milliseconds, t.place
from genre g
cross join lateral (
  select tr.name, tr.milliseconds,
         row_number() over (order by tr.milliseconds desc, tr.track_id) as place
  from track tr
  where tr.genre_id = g.genre_id
  order by tr.milliseconds desc, tr.track_id
  limit 2
) t
order by g.genre_id, t.place;`,
        mysql: `select g.name as genre, t.name as track, t.milliseconds, t.place
from genre g
cross join lateral (
  select tr.name, tr.milliseconds,
         row_number() over (order by tr.milliseconds desc, tr.track_id) as place
  from track tr
  where tr.genre_id = g.genre_id
  order by tr.milliseconds desc, tr.track_id
  limit 2
) t
order by g.genre_id, t.place;`,
        mysqlNote: 'LATERAL is available in MySQL 8.0.14 and later.',
        explanation: 'For each genre, run a small "top 2" query that can see g.genre_id.',
      },
    ],
    comparison:
      'Same rows. ROW_NUMBER ranks every track once. LATERAL runs one query per genre; with an index on (genre_id, milliseconds) each of those can stop after two rows, which pays off on big tables.',
    docs: [
      { label: 'PostgreSQL: LATERAL', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' },
      { label: 'MySQL: Lateral derived tables', url: MY + 'lateral-derived-tables.html' },
    ],
  },
]

export const chinookExercises: Exercise[] = [...basics, ...chinookAdvanced]
