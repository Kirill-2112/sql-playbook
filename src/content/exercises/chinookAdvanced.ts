import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

// Level 4–5: exercises that change the database. Each is judged by checkSql, run after the learner's statements.
export const chinookAdvanced: Exercise[] = [
  {
    id: 'chinook-031',
    dataset: 'chinook',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'A reviews table with proper keys',
    prompt:
      'Create a table review: review_id (generated automatically, primary key), track_id (must exist in track), rating (1 to 5 only), created_at (defaults to now). Then add two reviews: track 1 rated 5 and track 2 rated 4.',
    orderMatters: true,
    checkSql: `select review_id, track_id, rating from review order by review_id`,
    solutions: [
      {
        approach: 'Identity column + constraints',
        postgres: `create table review (
  review_id  integer generated always as identity primary key,
  track_id   integer not null references track (track_id),
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamp not null default current_timestamp
);

insert into review (track_id, rating) values (1, 5), (2, 4);`,
        mysql: `create table review (
  review_id  integer auto_increment primary key,
  track_id   integer not null,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamp not null default current_timestamp,
  foreign key (track_id) references track (track_id)
);

insert into review (track_id, rating) values (1, 5), (2, 4);`,
        mysqlNote:
          'AUTO_INCREMENT instead of an identity column. MySQL ignores REFERENCES written next to a column, so the foreign key must be a separate FOREIGN KEY clause, or it silently is not created.',
        explanation:
          'Constraints make bad data impossible instead of just unlikely: the foreign key rejects reviews of tracks that do not exist, the CHECK rejects a rating of 7.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Identity columns', url: PG + 'ddl-identity-columns.html' },
      { label: 'PostgreSQL: Constraints', url: PG + 'ddl-constraints.html' },
      { label: 'MySQL: FOREIGN KEY constraints', url: MY + 'create-table-foreign-keys.html' },
    ],
  },
  {
    id: 'chinook-032',
    dataset: 'chinook',
    level: 4,
    topics: ['json'],
    title: 'Track details as JSON',
    prompt:
      'Create a table track_meta(track_id, info) where info is a JSON document per track with the keys composer, ms (milliseconds) and price (unit_price).',
    orderMatters: true,
    checkSql: `select track_id, info->>'composer' as composer, (info->>'ms')::int as ms
from track_meta
where track_id <= 3
order by track_id`,
    checkSqlMysql: `select track_id, info->>'$.composer' as composer, cast(info->>'$.ms' as signed) as ms
from track_meta
where track_id <= 3
order by track_id`,
    solutions: [
      {
        approach: 'jsonb_build_object',
        postgres: `create table track_meta (
  track_id integer primary key,
  info     jsonb not null
);

insert into track_meta
select track_id,
       jsonb_build_object('composer', composer, 'ms', milliseconds, 'price', unit_price)
from track;`,
        mysql: `create table track_meta (
  track_id integer primary key,
  info     json not null
);

insert into track_meta
select track_id,
       json_object('composer', composer, 'ms', milliseconds, 'price', unit_price)
from track;`,
        mysqlNote:
          'MySQL uses JSON and JSON_OBJECT(), and paths look like \'$.composer\'. Watch out: for a JSON null, PostgreSQL ->> returns SQL NULL while MySQL ->> returns the text "null".',
        explanation:
          'jsonb stores JSON in a parsed binary form: keys are deduplicated, it can be indexed, and ->> extracts a value as text.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON functions and operators', url: PG + 'functions-json.html' },
      { label: 'MySQL: The JSON data type', url: MY + 'json.html' },
    ],
  },
  {
    id: 'chinook-033',
    dataset: 'chinook',
    level: 5,
    topics: ['functions', 'procedures'],
    title: 'Return a table from the database',
    prompt:
      'Create a routine tracks_of_artist(artist_name) that returns every track of that artist with its album title (columns album and track), in album and track order.',
    orderMatters: false,
    checkSql: `select * from tracks_of_artist('AC/DC')`,
    checkSqlMysql: `call tracks_of_artist('AC/DC')`,
    solutions: [
      {
        approach: 'Set-returning function',
        postgres: `create function tracks_of_artist(p_artist text)
returns table (album text, track text)
language sql
stable
as $$
  select al.title::text, t.name::text
  from artist ar
  join album al on al.artist_id = ar.artist_id
  join track t  on t.album_id = al.album_id
  where ar.name = p_artist
  order by al.album_id, t.track_id;
$$;`,
        mysql: `create procedure tracks_of_artist(in p_artist varchar(120))
reads sql data
begin
  select al.title as album, t.name as track
  from artist ar
  join album al on al.artist_id = ar.artist_id
  join track t  on t.album_id = al.album_id
  where ar.name = p_artist
  order by al.album_id, t.track_id;
end;`,
        mysqlNote:
          'MySQL functions can only return a single value, so a procedure that ends with a SELECT is the usual substitute. You call it with CALL and cannot join or filter its result in SQL. ' +
          DELIMITER_NOTE,
        explanation:
          'RETURNS TABLE makes the function usable like a table: select from it, join it, filter it. The ::text casts make the column types match the declared ones exactly.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SQL functions returning tables', url: PG + 'xfunc-sql.html#XFUNC-SQL-FUNCTIONS-RETURNING-TABLE' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'chinook-034',
    dataset: 'chinook',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'A procedure that reassigns customers',
    prompt:
      'Write a procedure reassign_customers(p_from, p_to) that moves every customer supported by employee p_from to employee p_to.',
    orderMatters: true,
    checkSql: `call reassign_customers(3, 4);
select support_rep_id, count(*) as customers from customer group by support_rep_id order by support_rep_id`,
    solutions: [
      {
        approach: 'SQL procedure',
        postgres: `create procedure reassign_customers(p_from integer, p_to integer)
language sql
as $$
  update customer set support_rep_id = p_to where support_rep_id = p_from;
$$;`,
        mysql: `create procedure reassign_customers(in p_from integer, in p_to integer)
modifies sql data
begin
  update customer set support_rep_id = p_to where support_rep_id = p_from;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'A procedure is called with CALL and returns nothing by default. Unlike a function, a PostgreSQL procedure can also COMMIT inside its body when it is called outside a transaction block.',
      },
      {
        approach: 'PL/pgSQL procedure with a guard',
        postgres: `create procedure reassign_customers(p_from integer, p_to integer)
language plpgsql
as $$
begin
  if not exists (select 1 from employee where employee_id = p_to) then
    raise exception 'Employee % does not exist', p_to;
  end if;
  update customer set support_rep_id = p_to where support_rep_id = p_from;
end;
$$;`,
        mysql: `create procedure reassign_customers(in p_from integer, in p_to integer)
modifies sql data
begin
  if not exists (select 1 from employee where employee_id = p_to) then
    signal sqlstate '45000' set message_text = 'Target employee does not exist';
  end if;
  update customer set support_rep_id = p_to where support_rep_id = p_from;
end;`,
        mysqlNote: 'MySQL raises errors with SIGNAL SQLSTATE. ' + DELIMITER_NOTE,
        explanation: 'Check the input first and stop with a clear error instead of silently moving customers to nobody.',
      },
    ],
    comparison:
      'Same effect on valid input. B refuses an invalid target with an explicit error (RAISE EXCEPTION in PostgreSQL, SIGNAL in MySQL), which is what you want in anything other people will call.',
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'PostgreSQL: Errors and messages (RAISE)', url: PG + 'plpgsql-errors-and-messages.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'chinook-035',
    dataset: 'chinook',
    level: 5,
    topics: ['partial-covering-indexes', 'indexes'],
    title: 'Index only the rows you query',
    prompt: 'Reports only ever look at invoices with a total above 10 (64 of 412). Create an index for queries with WHERE total > 10.',
    orderMatters: false,
    checkSql: `select count(*) as indexes_on_total
from pg_indexes
where tablename = 'invoice' and indexdef like '%(total%'`,
    checkSqlMysql: `select count(distinct index_name) as indexes_on_total
from information_schema.statistics
where table_schema = database() and table_name = 'invoice'
  and column_name = 'total' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index invoice_big_total_idx on invoice (total)
where total > 10;`,
        mysql: null,
        mysqlNote: 'MySQL has no partial indexes. Index the whole column (solution B).',
        explanation:
          'A partial index only contains rows matching its WHERE, here 64 instead of 412: smaller, faster to update, and used by queries whose condition implies total > 10.',
      },
      {
        approach: 'Full index',
        postgres: `create index invoice_total_idx on invoice (total);`,
        mysql: `create index invoice_total_idx on invoice (total);`,
        explanation: 'Indexes every invoice. Works for any condition on total, at the cost of a bigger index.',
      },
    ],
    comparison:
      'Both serve WHERE total > 10. The partial index is about six times smaller here and only maintained for big invoices, but the planner uses it only when the query\'s WHERE clearly implies total > 10.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'chinook-036',
    dataset: 'chinook',
    level: 4,
    topics: ['normalization', 'strings', 'recursive'],
    title: 'One composer per row',
    prompt:
      'track.composer holds several names separated by commas. Create a table composer_credit(track_id, composer) with one row per name, trimmed of spaces. Skip tracks without a composer.',
    orderMatters: false,
    checkSql: `select count(*) as credits, count(distinct track_id) as tracks from composer_credit`,
    solutions: [
      {
        approach: 'string_to_array + unnest',
        postgres: `create table composer_credit as
select t.track_id, trim(c.name) as composer
from track t
cross join lateral unnest(string_to_array(t.composer, ',')) as c(name)
where t.composer is not null;`,
        mysql: `create table composer_credit (
  track_id integer not null,
  composer varchar(220) not null
);

insert into composer_credit
with recursive parts as (
  select track_id,
         trim(substring_index(composer, ',', 1)) as composer,
         substring(composer, char_length(substring_index(composer, ',', 1)) + 2) as rest
  from track
  where composer is not null
  union all
  select track_id,
         trim(substring_index(rest, ',', 1)),
         substring(rest, char_length(substring_index(rest, ',', 1)) + 2)
  from parts
  where rest <> ''
)
select track_id, composer from parts;`,
        mysqlNote:
          'MySQL has no function that splits a string into rows. A recursive CTE peels off one name at a time with SUBSTRING_INDEX. Use CHAR_LENGTH, not LENGTH, which counts bytes and breaks on accented names.',
        explanation:
          'string_to_array turns the text into an array, unnest turns the array into rows, and LATERAL lets unnest see each track\'s composer.',
      },
      {
        approach: 'regexp_split_to_table',
        postgres: `create table composer_credit as
select track_id, trim(part) as composer
from track, regexp_split_to_table(composer, ',') as part
where composer is not null;`,
        mysql: null,
        mysqlNote: 'MySQL has no regexp_split_to_table. Use the recursive CTE from solution A.',
        explanation: 'Splits on a regular expression, so you could split on commas and ampersands at once with \'\\s*[,&]\\s*\'.',
      },
    ],
    comparison:
      'Same rows. Both PostgreSQL versions are one-liners; MySQL needs a recursive CTE. This is also why the table exists at all: names packed into one column cannot be counted, joined or indexed properly (first normal form).',
    docs: [
      { label: 'PostgreSQL: Array functions', url: PG + 'functions-array.html' },
      { label: 'PostgreSQL: regexp_split_to_table', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: SUBSTRING_INDEX()', url: MY + 'string-functions.html#function_substring-index' },
    ],
  },
  {
    id: 'chinook-037',
    dataset: 'chinook',
    level: 5,
    topics: ['full-text', 'indexes'],
    title: 'Search track names by word',
    prompt:
      'Make track names searchable by whole word with a full-text index. Then the search for the word "symphony" should return track_id and name of the matching tracks.',
    orderMatters: true,
    checkSql: `select track_id, name from track
where to_tsvector('simple', name) @@ to_tsquery('simple', 'symphony')
order by track_id`,
    checkSqlMysql: `select track_id, name from track
where match(name) against ('symphony' in boolean mode)
order by track_id`,
    solutions: [
      {
        approach: 'GIN index / FULLTEXT index',
        postgres: `create index track_name_fts on track using gin (to_tsvector('simple', name));

-- search: where to_tsvector('simple', name) @@ to_tsquery('simple', 'symphony')`,
        mysql: `create fulltext index track_name_ft on track (name);

-- search: where match(name) against ('symphony' in boolean mode)`,
        mysqlNote:
          'MATCH … AGAINST only works on columns with a FULLTEXT index. InnoDB ignores words shorter than 3 characters and a list of stopwords by default.',
        explanation:
          'Full-text search splits text into words (tokens) and finds rows containing a word, which LIKE \'%symphony%\' cannot do efficiently. In PostgreSQL the index is on the expression to_tsvector(…), and the query must use the same expression. The \'simple\' configuration only lower-cases words; \'english\' would also reduce "symphonies" to "symphoni" so both match.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' },
      { label: 'MySQL: Full-text search functions', url: MY + 'fulltext-search.html' },
    ],
  },
  {
    id: 'chinook-038',
    dataset: 'chinook',
    level: 4,
    topics: ['arrays', 'group-by'],
    title: 'Playlists with the whole first album',
    prompt: 'Which playlists contain every track of album 1? Show playlist_id and name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Array containment',
        postgres: `select p.playlist_id, p.name
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
group by p.playlist_id, p.name
having array_agg(pt.track_id) @> (select array_agg(track_id) from track where album_id = 1)
order by p.playlist_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no arrays; see solution B.',
        explanation: 'Collect each playlist\'s tracks into an array and ask whether it contains (@>) the array of album 1\'s tracks.',
      },
      {
        approach: 'Count the matches',
        postgres: `select p.playlist_id, p.name
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
where t.album_id = 1
group by p.playlist_id, p.name
having count(*) = (select count(*) from track where album_id = 1)
order by p.playlist_id;`,
        mysql: `select p.playlist_id, p.name
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
where t.album_id = 1
group by p.playlist_id, p.name
having count(*) = (select count(*) from track where album_id = 1)
order by p.playlist_id;`,
        explanation:
          'Keep only the album\'s tracks in each playlist and compare their number with the album size. It works because a track appears at most once per playlist (the primary key is playlist_id, track_id).',
      },
    ],
    comparison: 'Same playlists. This is "relational division"; the array version states it directly, the counting version works everywhere.',
    docs: [
      { label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' },
      { label: 'PostgreSQL: array_agg', url: PG + 'functions-aggregate.html' },
    ],
  },
  {
    id: 'chinook-039',
    dataset: 'chinook',
    level: 4,
    topics: ['generated-columns', 'strings'],
    title: 'Track length as m:ss',
    prompt: 'Add a stored generated column length_text to track that shows milliseconds as minutes and seconds, like "5:43".',
    orderMatters: true,
    checkSql: `select track_id, milliseconds, length_text from track where track_id in (1, 2, 3) order by track_id`,
    solutions: [
      {
        approach: 'Integer arithmetic in a generated column',
        postgres: `alter table track
add column length_text text
generated always as (
  (milliseconds / 60000)::text || ':' || lpad(((milliseconds / 1000) % 60)::text, 2, '0')
) stored;`,
        mysql: `alter table track
add column length_text varchar(10)
generated always as (
  concat(milliseconds div 60000, ':', lpad((milliseconds div 1000) % 60, 2, '0'))
) stored;`,
        mysqlNote: 'DIV is integer division in MySQL; concat() converts the numbers to text by itself.',
        explanation:
          'Whole minutes, then the seconds left over, padded to two digits with lpad (which needs text, hence the ::text cast). A generated column accepts only IMMUTABLE expressions; integer arithmetic, casts to text, || and lpad all are.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'chinook-040',
    dataset: 'chinook',
    level: 5,
    topics: ['partitioning'],
    title: 'Invoices split by region',
    prompt:
      'Create invoice_by_region with the same columns as invoice, list-partitioned by billing_country into North America (USA, Canada), South America (Brazil, Argentina, Chile) and everything else, then copy all invoices into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'invoice_by_region'::regclass) as partitions,
       (select count(*) from invoice_by_region) as total_rows,
       (select count(*) from invoice_by_region where billing_country in ('USA', 'Canada')) as north_america`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'invoice_by_region') as partitions,
       (select count(*) from invoice_by_region) as total_rows,
       (select count(*) from invoice_by_region where billing_country in ('USA', 'Canada')) as north_america`,
    solutions: [
      {
        approach: 'LIST partitions',
        postgres: `create table invoice_by_region (like invoice) partition by list (billing_country);

create table invoice_north_america partition of invoice_by_region for values in ('USA', 'Canada');
create table invoice_south_america partition of invoice_by_region for values in ('Brazil', 'Argentina', 'Chile');
create table invoice_rest_of_world partition of invoice_by_region default;

insert into invoice_by_region select * from invoice;`,
        mysql: `create table invoice_by_region (
  invoice_id          int            not null,
  customer_id         int            not null,
  invoice_date        datetime       not null,
  billing_address     varchar(70),
  billing_city        varchar(40),
  billing_state       varchar(40),
  billing_country     varchar(40)    not null,
  billing_postal_code varchar(10),
  total               decimal(10, 2) not null,
  primary key (invoice_id, billing_country)
)
partition by list columns (billing_country) (
  partition north_america values in ('USA', 'Canada'),
  partition south_america values in ('Brazil', 'Argentina', 'Chile'),
  partition rest_of_world values in ('Australia', 'Austria', 'Belgium', 'Czech Republic', 'Denmark', 'Finland',
    'France', 'Germany', 'Hungary', 'India', 'Ireland', 'Italy', 'Netherlands', 'Norway', 'Poland', 'Portugal',
    'Spain', 'Sweden', 'United Kingdom')
);

insert into invoice_by_region select * from invoice;`,
        mysqlNote:
          'MySQL list partitions have no DEFAULT: every value must be listed, and an insert with a new country fails until a partition is added. The partitioning column must be in the primary key.',
        explanation:
          'Each country goes to one partition; the DEFAULT partition catches any country not listed. CREATE TABLE … (LIKE invoice) copies the columns. A query filtered on billing_country reads only the partitions it needs.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: LIST COLUMNS partitioning', url: MY + 'partitioning-columns-list.html' },
    ],
  },
  {
    id: 'chinook-041',
    dataset: 'chinook',
    level: 3,
    topics: ['subtotals'],
    title: 'Sales by genre and media type, every way',
    prompt:
      'For the genres Rock and Jazz, total the invoice lines (unit_price × quantity) by genre and media type, with subtotals per genre, per media type, and a grand total. Label rolled-up values "All".',
    orderMatters: true,
    solutions: [
      {
        approach: 'CUBE',
        postgres: `select coalesce(g.name, 'All') as genre,
       coalesce(m.name, 'All') as media_type,
       sum(il.unit_price * il.quantity) as sales
from invoice_line il
join track t      on t.track_id = il.track_id
join genre g      on g.genre_id = t.genre_id
join media_type m on m.media_type_id = t.media_type_id
where g.name in ('Rock', 'Jazz')
group by cube (g.name, m.name)
order by grouping(g.name), g.name, grouping(m.name), m.name;`,
        mysql: null,
        mysqlNote: 'MySQL has only WITH ROLLUP, no CUBE; see solution B.',
        explanation:
          'CUBE (a, b) produces every combination of groupings: (a, b), (a), (b) and (). ROLLUP would skip the "per media type, all genres" rows.',
      },
      {
        approach: 'ROLLUP plus the missing level',
        postgres: `select genre, media_type, sales
from (
  select coalesce(g.name, 'All') as genre, coalesce(m.name, 'All') as media_type,
         sum(il.unit_price * il.quantity) as sales,
         grouping(g.name) as g1, grouping(m.name) as g2
  from invoice_line il
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  join media_type m on m.media_type_id = t.media_type_id
  where g.name in ('Rock', 'Jazz')
  group by rollup (g.name, m.name)
  union all
  select 'All', m.name, sum(il.unit_price * il.quantity), 1, 0
  from invoice_line il
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  join media_type m on m.media_type_id = t.media_type_id
  where g.name in ('Rock', 'Jazz')
  group by m.name
) cube_rows
order by g1, genre, g2, media_type;`,
        mysql: `select genre, media_type, sales
from (
  select coalesce(g.name, 'All') as genre, coalesce(m.name, 'All') as media_type,
         sum(il.unit_price * il.quantity) as sales,
         grouping(g.name) as g1, grouping(m.name) as g2
  from invoice_line il
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  join media_type m on m.media_type_id = t.media_type_id
  where g.name in ('Rock', 'Jazz')
  group by g.name, m.name with rollup
  union all
  select 'All', m.name, sum(il.unit_price * il.quantity), 1, 0
  from invoice_line il
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  join media_type m on m.media_type_id = t.media_type_id
  where g.name in ('Rock', 'Jazz')
  group by m.name
) cube_rows
order by g1, genre, g2, media_type;`,
        mysqlNote: 'WITH ROLLUP after the GROUP BY list instead of ROLLUP (…).',
        explanation: 'ROLLUP gives (genre, media), (genre) and the total; the second query adds the (media) level that ROLLUP leaves out.',
      },
    ],
    comparison: 'Same rows, but the CUBE version states the intent in one line and scans the data once; the emulation needs a second pass.',
    docs: [
      { label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' },
      { label: 'MySQL: WITH ROLLUP', url: MY + 'group-by-modifiers.html' },
    ],
  },
  {
    id: 'chinook-042',
    dataset: 'chinook',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Customers in the same city',
    prompt: 'List pairs of different customers who live in the same city: city, and the two customer_ids with the smaller one first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join with a < condition',
        postgres: `select a.city, a.customer_id as customer_1, b.customer_id as customer_2
from customer a
join customer b on b.city = a.city and b.customer_id > a.customer_id
order by a.city, customer_1, customer_2;`,
        mysql: `select a.city, a.customer_id as customer_1, b.customer_id as customer_2
from customer a
join customer b on b.city = a.city and b.customer_id > a.customer_id
order by a.city, customer_1, customer_2;`,
        explanation:
          'Joining the table to itself on city pairs every customer with every neighbour, including himself and each pair twice (A–B and B–A). Requiring b.customer_id > a.customer_id keeps each pair once.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'chinook-043',
    dataset: 'chinook',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'Album running time',
    prompt: 'Show the 5 longest albums: title and total running time as hh:mm:ss (rounded down to whole seconds).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Milliseconds to an interval',
        postgres: `select a.title,
       make_interval(secs => sum(t.milliseconds) / 1000) as running_time
from album a
join track t on t.album_id = a.album_id
group by a.album_id, a.title
order by sum(t.milliseconds) desc, a.album_id
limit 5;`,
        mysql: `select a.title,
       sec_to_time(sum(t.milliseconds) div 1000) as running_time
from album a
join track t on t.album_id = a.album_id
group by a.album_id, a.title
order by sum(t.milliseconds) desc, a.album_id
limit 5;`,
        mysqlNote: 'SEC_TO_TIME turns a number of seconds into a TIME, which can exceed 24 hours.',
        explanation:
          'sum(milliseconds) / 1000 is integer division in PostgreSQL, dropping the fraction of a second; make_interval(secs => …) turns the seconds into an interval. Under 24 hours it prints as hh:mm:ss in both databases.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: make_interval', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: SEC_TO_TIME', url: MY + 'date-and-time-functions.html#function_sec-to-time' },
    ],
  },
  {
    id: 'chinook-044',
    dataset: 'chinook',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'Apply a price list',
    prompt:
      'Create price_updates (track_id, unit_price) with new prices: track 1 → 1.29, track 2 → 0.99 (unchanged), track 3 → 1.49. Apply it to track, changing only the prices that really differ.',
    orderMatters: true,
    checkSql: `select track_id, unit_price from track where track_id in (1, 2, 3) order by track_id`,
    solutions: [
      {
        approach: 'MERGE with a condition',
        postgres: `create table price_updates (track_id integer primary key, unit_price numeric(10, 2) not null);
insert into price_updates values (1, 1.29), (2, 0.99), (3, 1.49);

merge into track t
using price_updates p on p.track_id = t.track_id
when matched and t.unit_price <> p.unit_price then
  update set unit_price = p.unit_price;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'WHEN MATCHED AND … adds a condition to the action, so unchanged rows are not rewritten (no needless row versions or trigger calls).',
      },
      {
        approach: 'UPDATE with a join',
        postgres: `create table price_updates (track_id integer primary key, unit_price numeric(10, 2) not null);
insert into price_updates values (1, 1.29), (2, 0.99), (3, 1.49);

update track t
set unit_price = p.unit_price
from price_updates p
where p.track_id = t.track_id and t.unit_price <> p.unit_price;`,
        mysql: `create table price_updates (track_id int primary key, unit_price decimal(10, 2) not null);
insert into price_updates values (1, 1.29), (2, 0.99), (3, 1.49);

update track t
join price_updates p on p.track_id = t.track_id
set t.unit_price = p.unit_price
where t.unit_price <> p.unit_price;`,
        explanation: 'When only updates are needed, a joined UPDATE does the same job in every database.',
      },
    ],
    comparison: 'Same result. MERGE is worth it when one statement must also insert or delete; for updates alone the joined UPDATE is simpler.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: UPDATE', url: MY + 'update.html' },
    ],
  },
  {
    id: 'chinook-045',
    dataset: 'chinook',
    level: 4,
    topics: ['temp-tables', 'joins'],
    title: 'Customer spend as a working table',
    prompt: 'Put every customer\'s total spend into a temporary table customer_spend (customer_id, spend), to reuse it in later queries.',
    orderMatters: true,
    checkSql: `select customer_id, spend from customer_spend order by spend desc, customer_id limit 5`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table customer_spend as
select customer_id, sum(total) as spend
from invoice
group by customer_id;`,
        mysql: `create temporary table customer_spend as
select customer_id, sum(total) as spend
from invoice
group by customer_id;`,
        mysqlNote: 'CREATE TEMPORARY TABLE; remember a MySQL temporary table cannot appear twice in one query.',
        explanation: 'The totals are computed once. Later queries (top customers, averages, buckets) read 59 rows instead of re-summing 412 invoices each time.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'chinook-046',
    dataset: 'chinook',
    level: 4,
    topics: ['views', 'dml'],
    title: 'A view that guards its rows',
    prompt:
      'Create a view usa_customers (customer_id, first_name, last_name, email, country) of the customers in the USA that refuses inserts and updates which would put a row outside the view. Then add customer 60, Pat Lee, pat@example.com, through the view.',
    orderMatters: false,
    checkSql: `select customer_id, first_name, last_name, country from customer where customer_id = 60`,
    solutions: [
      {
        approach: 'Updatable view WITH CHECK OPTION',
        postgres: `create view usa_customers as
select customer_id, first_name, last_name, email, country
from customer
where country = 'USA'
with check option;

insert into usa_customers (customer_id, first_name, last_name, email, country)
values (60, 'Pat', 'Lee', 'pat@example.com', 'USA');`,
        mysql: `create view usa_customers as
select customer_id, first_name, last_name, email, country
from customer
where country = 'USA'
with check option;

insert into usa_customers (customer_id, first_name, last_name, email, country)
values (60, 'Pat', 'Lee', 'pat@example.com', 'USA');`,
        explanation:
          'A simple view over one table is updatable: inserts and updates go to customer. WITH CHECK OPTION rejects a change that the view itself could not show, so inserting a customer from France through usa_customers fails instead of silently disappearing from the view.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Updatable views', url: PG + 'sql-createview.html#SQL-CREATEVIEW-UPDATABLE-VIEWS' },
      { label: 'MySQL: WITH CHECK OPTION', url: MY + 'view-check-option.html' },
    ],
  },
  {
    id: 'chinook-047',
    dataset: 'chinook',
    level: 4,
    topics: ['materialized-views', 'indexes'],
    title: 'Refresh without blocking readers',
    prompt:
      'Store sales per genre (genre_id, name, sales = unit_price × quantity summed) so it can be refreshed while dashboards keep reading it.',
    orderMatters: true,
    checkSql: `select genre_id, name, sales from genre_sales order by sales desc, genre_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view + unique index',
        postgres: `create materialized view genre_sales as
select g.genre_id, g.name, sum(il.unit_price * il.quantity) as sales
from invoice_line il
join track t on t.track_id = il.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name;

create unique index genre_sales_genre_id on genre_sales (genre_id);

refresh materialized view concurrently genre_sales;`,
        mysql: `create table genre_sales (genre_id int primary key, name varchar(120), sales decimal(12, 2));

replace into genre_sales
select g.genre_id, g.name, sum(il.unit_price * il.quantity)
from invoice_line il
join track t on t.track_id = il.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name;`,
        mysqlNote: 'No materialized views: a table refreshed with REPLACE INTO (delete-and-insert per key) keeps the old rows readable during the reload. Genres that stop selling would need a separate DELETE.',
        explanation:
          'A plain REFRESH locks the view against reads until it finishes. REFRESH … CONCURRENTLY builds the new result on the side and applies only the differences, which requires a unique index to match rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: REFRESH MATERIALIZED VIEW', url: PG + 'sql-refreshmaterializedview.html' },
      { label: 'MySQL: REPLACE', url: MY + 'replace.html' },
    ],
  },
  {
    id: 'chinook-048',
    dataset: 'chinook',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Copy the address while it cannot change',
    prompt:
      'Create invoice 413 for customer 5, dated 2025-12-31 with total 0, copying the customer\'s address, city and country into the billing fields. Make sure nobody can change the customer\'s row between reading it and writing the invoice. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select invoice_id, customer_id, billing_city, billing_country from invoice where invoice_id = 413`,
    solutions: [
      {
        approach: 'SELECT … FOR SHARE',
        postgres: `select address, city, country from customer where customer_id = 5 for share;

insert into invoice (invoice_id, customer_id, invoice_date, billing_address, billing_city, billing_country, total)
select 413, customer_id, '2025-12-31', address, city, country, 0
from customer where customer_id = 5;`,
        mysql: `start transaction;

select address, city, country from customer where customer_id = 5 for share;

insert into invoice (invoice_id, customer_id, invoice_date, billing_address, billing_city, billing_country, total)
select 413, customer_id, '2025-12-31', address, city, country, 0
from customer where customer_id = 5;

commit;`,
        mysqlNote: 'FOR SHARE is the MySQL 8.0 spelling of the older LOCK IN SHARE MODE.',
        explanation:
          'FOR SHARE lets other sessions read the row and take their own share locks, but blocks UPDATE and DELETE on it until this transaction ends. FOR UPDATE would also block other share-lockers, which is more than needed here. (The foreign key check alone only guarantees the customer exists, not that the address stays the same.)',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Row-level lock modes', url: PG + 'explicit-locking.html#LOCKING-ROWS' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'chinook-049',
    dataset: 'chinook',
    level: 4,
    topics: ['upsert'],
    title: 'Add tracks, skip duplicates',
    prompt: 'Add tracks 1 to 5 to playlist 1. Some are already in it: add only the missing ones, without an error.',
    orderMatters: false,
    checkSql: `select count(*) as tracks_in_playlist from playlist_track where playlist_id = 1`,
    solutions: [
      {
        approach: 'ON CONFLICT DO NOTHING',
        postgres: `insert into playlist_track (playlist_id, track_id)
values (1, 1), (1, 2), (1, 3), (1, 4), (1, 5)
on conflict do nothing;`,
        mysql: `insert into playlist_track (playlist_id, track_id)
values (1, 1), (1, 2), (1, 3), (1, 4), (1, 5) as new
on duplicate key update track_id = new.track_id;`,
        mysqlNote:
          'INSERT IGNORE also skips duplicates, but it turns other errors into warnings too (a bad foreign key, a value too long), so data can silently go wrong. The no-op ON DUPLICATE KEY UPDATE skips only key clashes.',
        explanation: 'Rows that would violate a unique constraint are skipped; the others are inserted. Without the clause, the first duplicate aborts the whole statement.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT IGNORE vs strict mode', url: MY + 'sql-mode.html#ignore-strict-comparison' },
    ],
  },
  {
    id: 'chinook-050',
    dataset: 'chinook',
    level: 2,
    topics: ['full-join', 'cte'],
    title: 'Genre sales, 2021 against 2025',
    prompt:
      'Show each genre that sold anything in 2021 or 2025, with its sales (unit_price × quantity) in each of the two years; NULL where it sold nothing that year. Order by genre_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two yearly totals',
        postgres: `with y2021 as (
  select t.genre_id, sum(il.unit_price * il.quantity) as sales
  from invoice_line il
  join invoice i on i.invoice_id = il.invoice_id
  join track t   on t.track_id = il.track_id
  where i.invoice_date >= '2021-01-01' and i.invoice_date < '2022-01-01'
  group by t.genre_id
),
y2025 as (
  select t.genre_id, sum(il.unit_price * il.quantity) as sales
  from invoice_line il
  join invoice i on i.invoice_id = il.invoice_id
  join track t   on t.track_id = il.track_id
  where i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01'
  group by t.genre_id
)
select coalesce(a.genre_id, b.genre_id) as genre_id, a.sales as sales_2021, b.sales as sales_2025
from y2021 a
full join y2025 b on b.genre_id = a.genre_id
order by genre_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Each side is one year\'s totals; FULL JOIN lines them up and keeps genres present in only one year.',
      },
      {
        approach: 'Conditional sums, one pass',
        postgres: `select t.genre_id,
       sum(case when i.invoice_date >= '2021-01-01' and i.invoice_date < '2022-01-01' then il.unit_price * il.quantity end) as sales_2021,
       sum(case when i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01' then il.unit_price * il.quantity end) as sales_2025
from invoice_line il
join invoice i on i.invoice_id = il.invoice_id
join track t   on t.track_id = il.track_id
where i.invoice_date >= '2021-01-01' and i.invoice_date < '2022-01-01'
   or i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01'
group by t.genre_id
order by t.genre_id;`,
        mysql: `select t.genre_id,
       sum(case when i.invoice_date >= '2021-01-01' and i.invoice_date < '2022-01-01' then il.unit_price * il.quantity end) as sales_2021,
       sum(case when i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01' then il.unit_price * il.quantity end) as sales_2025
from invoice_line il
join invoice i on i.invoice_id = il.invoice_id
join track t   on t.track_id = il.track_id
where i.invoice_date >= '2021-01-01' and i.invoice_date < '2022-01-01'
   or i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01'
group by t.genre_id
order by t.genre_id;`,
        explanation: 'A CASE without ELSE yields NULL, and SUM of only NULLs is NULL, so a year with no sales shows NULL just like the FULL JOIN version.',
      },
    ],
    comparison: 'Same rows. FULL JOIN is natural when the two sides come from different queries; for two slices of one table, conditional sums read it once and work everywhere.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: CASE', url: MY + 'flow-control-functions.html#operator_case' },
    ],
  },
  {
    id: 'chinook-051',
    dataset: 'chinook',
    level: 5,
    topics: ['triggers'],
    title: 'Keep the invoice total in step',
    prompt: 'invoice.total is the sum of its lines. Create a trigger that adds unit_price × quantity of every new invoice line to its invoice\'s total.',
    orderMatters: false,
    checkSql: `insert into invoice_line (invoice_line_id, invoice_id, track_id, unit_price, quantity) values (2241, 1, 3, 0.99, 2);
select invoice_id, total from invoice where invoice_id = 1`,
    solutions: [
      {
        approach: 'AFTER INSERT trigger',
        postgres: `create function add_line_to_total() returns trigger
language plpgsql
as $$
begin
  update invoice set total = total + new.unit_price * new.quantity
  where invoice_id = new.invoice_id;
  return new;
end;
$$;

create trigger invoice_line_add_to_total
after insert on invoice_line
for each row execute function add_line_to_total();`,
        mysql: `create trigger invoice_line_add_to_total
after insert on invoice_line
for each row
  update invoice set total = total + new.unit_price * new.quantity
  where invoice_id = new.invoice_id;`,
        mysqlNote: 'A one-statement trigger body needs no BEGIN … END.',
        explanation:
          'Invoice 1 had two lines totalling 1.98; after the new line it is 3.96. A complete solution would also handle UPDATE and DELETE of lines, or recompute the sum instead of adding to it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TRIGGER', url: PG + 'sql-createtrigger.html' },
      { label: 'MySQL: CREATE TRIGGER', url: MY + 'create-trigger.html' },
    ],
  },
]
