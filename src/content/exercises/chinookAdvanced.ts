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
  {
    id: 'chinook-052',
    dataset: 'chinook',
    level: 3,
    topics: ['gaps-islands', 'dates-advanced'],
    title: 'Customers buying month after month',
    prompt: 'Find each customer\'s longest run of consecutive months with at least one invoice. Show the 5 longest: customer_id, first and last month (YYYY-MM) and months.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month number minus row number',
        postgres: `with months as (
  select distinct customer_id,
         extract(year from invoice_date)::int * 12 + extract(month from invoice_date)::int - 1 as m
  from invoice
),
runs as (
  select customer_id, m, m - row_number() over (partition by customer_id order by m) as grp
  from months
)
select customer_id,
       min(m) / 12 || '-' || lpad((min(m) % 12 + 1)::text, 2, '0') as first_month,
       max(m) / 12 || '-' || lpad((max(m) % 12 + 1)::text, 2, '0') as last_month,
       count(*) as months
from runs
group by customer_id, grp
order by months desc, customer_id, first_month
limit 5;`,
        mysql: `with months as (
  select distinct customer_id, year(invoice_date) * 12 + month(invoice_date) - 1 as m
  from invoice
),
runs as (
  select customer_id, m, m - row_number() over (partition by customer_id order by m) as grp
  from months
)
select customer_id,
       concat(min(m) div 12, '-', lpad(min(m) % 12 + 1, 2, '0')) as first_month,
       concat(max(m) div 12, '-', lpad(max(m) % 12 + 1, 2, '0')) as last_month,
       count(*) as months
from runs
group by customer_id, grp
order by months desc, customer_id, first_month
limit 5;`,
        explanation:
          'Chinook invoices follow a fixed rhythm, so the longest runs are only 2 months: customers buy every few months, never three months in a row. The month number year × 12 + month − 1 makes December and the next January consecutive.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'chinook-053',
    dataset: 'chinook',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'Label a track by length',
    prompt: 'Write a function track_label(p_ms) that returns \'short\' under 3 minutes, \'normal\' up to 6 minutes, \'long\' up to 10 and \'epic\' above, using IF/ELSIF.',
    orderMatters: true,
    checkSql: `select track_label(milliseconds) as label, count(*) as tracks from track group by track_label(milliseconds) order by label`,
    solutions: [
      {
        approach: 'IF … ELSIF … ELSE',
        postgres: `create function track_label(p_ms integer)
returns text
language plpgsql
immutable
as $$
begin
  if p_ms < 180000 then
    return 'short';
  elsif p_ms <= 360000 then
    return 'normal';
  elsif p_ms <= 600000 then
    return 'long';
  else
    return 'epic';
  end if;
end;
$$;`,
        mysql: `create function track_label(p_ms int)
returns varchar(10)
deterministic
begin
  if p_ms < 180000 then
    return 'short';
  elseif p_ms <= 360000 then
    return 'normal';
  elseif p_ms <= 600000 then
    return 'long';
  else
    return 'epic';
  end if;
end;`,
        mysqlNote: `MySQL spells it ELSEIF; PL/pgSQL accepts ELSIF (and ELSEIF too). ${DELIMITER_NOTE}`,
        explanation:
          'The branches are tested top to bottom and the first true one wins, so each later test can assume the earlier ones failed. In plain SQL a CASE expression does the same; IF/ELSIF is the statement form for procedural code.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Conditionals', url: PG + 'plpgsql-control-structures.html#PLPGSQL-CONDITIONALS' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'chinook-054',
    dataset: 'chinook',
    level: 5,
    topics: ['query-plans', 'subqueries'],
    title: 'Jazz buyers, three ways',
    prompt: 'Which customers bought at least one Jazz track? Show customer_id, in order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'EXISTS',
        postgres: `select c.customer_id
from customer c
where exists (
  select 1 from invoice i
  join invoice_line il on il.invoice_id = i.invoice_id
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  where i.customer_id = c.customer_id and g.name = 'Jazz')
order by c.customer_id;`,
        mysql: `select c.customer_id
from customer c
where exists (
  select 1 from invoice i
  join invoice_line il on il.invoice_id = i.invoice_id
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  where i.customer_id = c.customer_id and g.name = 'Jazz')
order by c.customer_id;`,
        explanation: 'A semi-join: each customer is kept once, as soon as one Jazz purchase is found.',
      },
      {
        approach: 'IN',
        postgres: `select customer_id
from customer
where customer_id in (
  select i.customer_id from invoice i
  join invoice_line il on il.invoice_id = i.invoice_id
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  where g.name = 'Jazz')
order by customer_id;`,
        mysql: `select customer_id
from customer
where customer_id in (
  select i.customer_id from invoice i
  join invoice_line il on il.invoice_id = i.invoice_id
  join track t on t.track_id = il.track_id
  join genre g on g.genre_id = t.genre_id
  where g.name = 'Jazz')
order by customer_id;`,
        explanation: 'Usually planned as the same semi-join as EXISTS.',
      },
      {
        approach: 'JOIN + DISTINCT',
        postgres: `select distinct i.customer_id
from invoice i
join invoice_line il on il.invoice_id = i.invoice_id
join track t on t.track_id = il.track_id
join genre g on g.genre_id = t.genre_id
where g.name = 'Jazz'
order by i.customer_id;`,
        mysql: `select distinct i.customer_id
from invoice i
join invoice_line il on il.invoice_id = i.invoice_id
join track t on t.track_id = il.track_id
join genre g on g.genre_id = t.genre_id
where g.name = 'Jazz'
order by i.customer_id;`,
        explanation: 'Produces one row per Jazz purchase, then removes the duplicates: more work when customers buy many Jazz tracks.',
      },
    ],
    comparison:
      'Same customers. EXISTS and IN express "is there any", which lets the planner stop early; JOIN + DISTINCT builds every match first. Compare the timings in the table.',
    docs: [{ label: 'PostgreSQL: Subquery expressions', url: PG + 'functions-subquery.html' }],
  },
  {
    id: 'chinook-055',
    dataset: 'chinook',
    level: 3,
    topics: ['date-series', 'window-frames'],
    title: 'Monthly revenue of 2024 with a running total',
    prompt: 'For every month of 2024 (YYYY-MM), show revenue (sum of invoice totals, 0 if none) and the running total since January.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month series + window',
        postgres: `select to_char(m, 'YYYY-MM') as month,
       coalesce(sum(i.total), 0) as revenue,
       sum(coalesce(sum(i.total), 0)) over (order by m) as running
from generate_series(date '2024-01-01', date '2024-12-01', interval '1 month') as m
left join invoice i on i.invoice_date >= m and i.invoice_date < m + interval '1 month'
group by m
order by m;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'The series guarantees all 12 months; the window then adds up the monthly sums in order.',
      },
      {
        approach: 'Recursive months + window',
        postgres: `with recursive months as (
  select date '2024-01-01' as m
  union all
  select (m + interval '1 month')::date from months where m < date '2024-12-01'
)
select to_char(m, 'YYYY-MM') as month,
       coalesce(sum(i.total), 0) as revenue,
       sum(coalesce(sum(i.total), 0)) over (order by m) as running
from months
left join invoice i on i.invoice_date >= m and i.invoice_date < m + interval '1 month'
group by m
order by m;`,
        mysql: `with recursive months as (
  select date('2024-01-01') as m
  union all
  select m + interval 1 month from months where m < '2024-12-01'
)
select date_format(m, '%Y-%m') as month,
       coalesce(sum(i.total), 0) as revenue,
       sum(coalesce(sum(i.total), 0)) over (order by m) as running
from months
left join invoice i on i.invoice_date >= m and i.invoice_date < m + interval 1 month
group by m
order by m;`,
        explanation: 'The same, with the twelve months built by recursion.',
      },
    ],
    comparison: 'Same 12 rows. Note sum(coalesce(sum(…), 0)) over (…): the inner sum is per month, the outer one runs across months.',
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'chinook-056',
    dataset: 'chinook',
    level: 5,
    topics: ['full-text'],
    title: 'Greatest hits',
    prompt: 'Make album titles searchable by word and find the albums whose title contains both "greatest" and "hits": album_id and title.',
    orderMatters: true,
    checkSql: `select album_id, title from album
where to_tsvector('simple', title) @@ to_tsquery('simple', 'greatest & hits')
order by album_id`,
    checkSqlMysql: `select album_id, title from album
where match(title) against ('+greatest +hits' in boolean mode)
order by album_id`,
    solutions: [
      {
        approach: 'Full-text index on titles',
        postgres: `create index album_title_fts on album using gin (to_tsvector('simple', title));`,
        mysql: `create fulltext index album_title_ft on album (title);`,
        explanation: 'Both words must be present, in any order and with anything between, which matches titles like "Greatest Hits II" and "The Best Of … Greatest Hits".',
      },
    ],
    docs: [{ label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'chinook-057',
    dataset: 'chinook',
    level: 4,
    topics: ['normalization', 'joins'],
    title: 'The price at the time of sale',
    prompt:
      'invoice_line.unit_price repeats track.unit_price. Is that redundant? Count the invoice lines whose price differs from the track\'s current price.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Join and compare',
        postgres: `select count(*) as invoice_lines,
       count(*) filter (where il.unit_price <> t.unit_price) as price_differs
from invoice_line il
join track t on t.track_id = il.track_id;`,
        mysql: `select count(*) as invoice_lines,
       sum(il.unit_price <> t.unit_price) as price_differs
from invoice_line il
join track t on t.track_id = il.track_id;`,
        explanation:
          'Today they match, but this copy is not redundant: an invoice must keep the price actually charged. When a track\'s price changes, old invoices must not change with it. Copying a value to freeze it in time is deliberate denormalization.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'chinook-058',
    dataset: 'chinook',
    level: 3,
    topics: ['pivot'],
    title: 'Media types by year',
    prompt: 'Show sales (unit_price × quantity) per media type as rows and the years 2021 to 2025 as columns.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional sums',
        postgres: `select m.name as media_type,
       sum(il.unit_price * il.quantity) filter (where extract(year from i.invoice_date) = 2021) as y2021,
       sum(il.unit_price * il.quantity) filter (where extract(year from i.invoice_date) = 2022) as y2022,
       sum(il.unit_price * il.quantity) filter (where extract(year from i.invoice_date) = 2023) as y2023,
       sum(il.unit_price * il.quantity) filter (where extract(year from i.invoice_date) = 2024) as y2024,
       sum(il.unit_price * il.quantity) filter (where extract(year from i.invoice_date) = 2025) as y2025
from invoice_line il
join invoice i    on i.invoice_id = il.invoice_id
join track t      on t.track_id = il.track_id
join media_type m on m.media_type_id = t.media_type_id
group by m.media_type_id, m.name
order by m.media_type_id;`,
        mysql: `select m.name as media_type,
       sum(case when year(i.invoice_date) = 2021 then il.unit_price * il.quantity end) as y2021,
       sum(case when year(i.invoice_date) = 2022 then il.unit_price * il.quantity end) as y2022,
       sum(case when year(i.invoice_date) = 2023 then il.unit_price * il.quantity end) as y2023,
       sum(case when year(i.invoice_date) = 2024 then il.unit_price * il.quantity end) as y2024,
       sum(case when year(i.invoice_date) = 2025 then il.unit_price * il.quantity end) as y2025
from invoice_line il
join invoice i    on i.invoice_id = il.invoice_id
join track t      on t.track_id = il.track_id
join media_type m on m.media_type_id = t.media_type_id
group by m.media_type_id, m.name
order by m.media_type_id;`,
        mysqlNote: 'CASE without ELSE instead of FILTER, so a year without sales shows NULL as in PostgreSQL.',
        explanation: 'With FILTER, a year without sales gives NULL (a sum over no rows); use coalesce(…, 0) if a report needs zeros.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'chinook-059',
    dataset: 'chinook',
    level: 4,
    topics: ['constraints'],
    title: 'Sane tracks',
    prompt: 'Add CHECK constraints to track: milliseconds must be positive and unit_price must not be negative.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'track'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'track' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'Two CHECKs',
        postgres: `alter table track
  add constraint track_length_positive check (milliseconds > 0),
  add constraint track_price_not_negative check (unit_price >= 0);`,
        mysql: `alter table track
  add constraint track_length_positive check (milliseconds > 0),
  add constraint track_price_not_negative check (unit_price >= 0);`,
        explanation: 'Free tracks (price 0) stay allowed; a negative price or a zero-length track is rejected from now on.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' }],
  },
  {
    id: 'chinook-060',
    dataset: 'chinook',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Add a line and fix the total, safely',
    prompt:
      'Add track 3 (0.99, quantity 1) to invoice 1 as line 2241, and raise the invoice total by the same amount, so that two clerks doing this at once cannot lose an update. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select invoice_id, total, (select count(*) from invoice_line where invoice_id = 1) as lines_count from invoice where invoice_id = 1`,
    solutions: [
      {
        approach: 'Lock the invoice row first',
        postgres: `select invoice_id from invoice where invoice_id = 1 for update;

insert into invoice_line (invoice_line_id, invoice_id, track_id, unit_price, quantity) values (2241, 1, 3, 0.99, 1);
update invoice set total = total + 0.99 where invoice_id = 1;`,
        mysql: `start transaction;

select invoice_id from invoice where invoice_id = 1 for update;

insert into invoice_line (invoice_line_id, invoice_id, track_id, unit_price, quantity) values (2241, 1, 3, 0.99, 1);
update invoice set total = total + 0.99 where invoice_id = 1;

commit;`,
        explanation:
          'Locking the invoice makes a second clerk wait until this transaction commits. "total = total + 0.99" is itself safe, because it reads the latest value; the lock matters when the new total is computed from a value read earlier, in application code.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' }],
  },
  {
    id: 'chinook-061',
    dataset: 'chinook',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'Quarter labels',
    prompt: 'Count invoices per quarter of 2024, labelled like "2024 Q1".',
    orderMatters: true,
    solutions: [
      {
        approach: 'Format the date',
        postgres: `select to_char(invoice_date, 'YYYY "Q"Q') as quarter, count(*) as invoices
from invoice
where invoice_date >= '2024-01-01' and invoice_date < '2025-01-01'
group by quarter
order by quarter;`,
        mysql: `select concat(year(invoice_date), ' Q', quarter(invoice_date)) as quarter, count(*) as invoices
from invoice
where invoice_date >= '2024-01-01' and invoice_date < '2025-01-01'
group by quarter
order by quarter;`,
        mysqlNote: 'DATE_FORMAT has no quarter code; QUARTER() returns 1–4 and concat() turns it into text.',
        explanation: 'In to_char, text in double quotes is copied literally and Q is the quarter number. The label sorts correctly because the year comes first.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: to_char patterns', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: QUARTER', url: MY + 'date-and-time-functions.html#function_quarter' },
    ],
  },
  {
    id: 'chinook-062',
    dataset: 'chinook',
    level: 2,
    topics: ['full-join'],
    title: 'Artists with albums, artists with sales',
    prompt: 'Count artists that have albums and sold something, have albums but never sold, and (to check) sold without having albums.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two artist lists',
        postgres: `with with_albums as (select distinct artist_id from album),
     with_sales as (
       select distinct al.artist_id
       from invoice_line il join track t on t.track_id = il.track_id join album al on al.album_id = t.album_id
     )
select count(*) filter (where a.artist_id is not null and s.artist_id is not null) as albums_and_sales,
       count(*) filter (where s.artist_id is null) as albums_no_sales,
       count(*) filter (where a.artist_id is null) as sales_no_albums
from with_albums a
full join with_sales s on s.artist_id = a.artist_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'The third count must be 0: a sale goes through a track and an album, so an artist with sales always has an album. A FULL JOIN makes such a consistency check explicit.',
      },
      {
        approach: 'Flags from EXISTS',
        postgres: `select sum(case when s then 1 else 0 end) as albums_and_sales,
       sum(case when not s then 1 else 0 end) as albums_no_sales,
       0 as sales_no_albums
from (
  select a.artist_id,
         exists (select 1 from album al join track t on t.album_id = al.album_id
                 join invoice_line il on il.track_id = t.track_id where al.artist_id = a.artist_id) as s
  from (select distinct artist_id from album) a
) x;`,
        mysql: `select sum(s) as albums_and_sales,
       sum(not s) as albums_no_sales,
       0 as sales_no_albums
from (
  select a.artist_id,
         exists (select 1 from album al join track t on t.album_id = al.album_id
                 join invoice_line il on il.track_id = t.track_id where al.artist_id = a.artist_id) as s
  from (select distinct artist_id from album) a
) x;`,
        explanation: 'Starting from artists with albums, one EXISTS flag tells whether anything sold. The third number is 0 by construction, which is exactly what the FULL JOIN version verifies.',
      },
    ],
    comparison: 'Same counts. The FULL JOIN version tests the data; the EXISTS version assumes what it tests, which is fine once you know it holds.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'chinook-063',
    dataset: 'chinook',
    level: 5,
    topics: ['full-text'],
    title: 'Who composed it',
    prompt: 'Make the composer column searchable by word and find the tracks credited to Mozart: track_id, name and composer.',
    orderMatters: true,
    checkSql: `select track_id, name, composer from track
where to_tsvector('simple', coalesce(composer, '')) @@ to_tsquery('simple', 'mozart')
order by track_id`,
    checkSqlMysql: `select track_id, name, composer from track
where match(composer) against ('+mozart' in boolean mode)
order by track_id`,
    solutions: [
      {
        approach: 'Full-text index on a nullable column',
        postgres: `create index track_composer_fts on track using gin (to_tsvector('simple', coalesce(composer, '')));`,
        mysql: `create fulltext index track_composer_ft on track (composer);`,
        explanation:
          'Many tracks have no composer (NULL). to_tsvector(NULL) is NULL, so the expression wraps it in coalesce; the query must use exactly the same expression as the index for the index to be used.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Creating indexes for text search', url: PG + 'textsearch-tables.html#TEXTSEARCH-TABLES-INDEX' }],
  },
  {
    id: 'chinook-064',
    dataset: 'chinook',
    level: 4,
    topics: ['generated-columns', 'strings'],
    title: 'A one-line billing address',
    prompt: 'Add a stored generated column billing_line to invoice: address, city and country joined with ", ", skipping missing parts.',
    orderMatters: true,
    checkSql: `select invoice_id, billing_line from invoice where invoice_id in (1, 2) order by invoice_id`,
    solutions: [
      {
        approach: 'concat_ws in a generated column',
        postgres: `alter table invoice add column billing_line text
generated always as (
  coalesce(billing_address || ', ', '') || coalesce(billing_city || ', ', '') || coalesce(billing_country, '')
) stored;`,
        mysql: `alter table invoice add column billing_line varchar(200)
generated always as (concat_ws(', ', billing_address, billing_city, billing_country)) stored;`,
        mysqlNote: 'MySQL accepts CONCAT_WS in a generated column; it skips NULL arguments, so a missing part leaves no ", ," behind.',
        explanation:
          'In PostgreSQL concat_ws is only STABLE (it accepts arguments of any type, whose text form could depend on settings), so a generated column refuses it. || with coalesce does the same job: "part || \', \'" is NULL when the part is NULL, and coalesce turns that into an empty string.',
      },
    ],
    docs: [{ label: 'PostgreSQL: concat_ws', url: PG + 'functions-string.html' }],
  },
  {
    id: 'chinook-065',
    dataset: 'chinook',
    level: 4,
    topics: ['materialized-views', 'joins'],
    title: 'Artist revenue, stored',
    prompt: 'Store revenue per artist (artist_id, name, revenue = unit_price × quantity summed) for a royalties report run once a month.',
    orderMatters: true,
    checkSql: `select artist_id, name, revenue from artist_revenue order by revenue desc, artist_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view artist_revenue as
select ar.artist_id, ar.name, sum(il.unit_price * il.quantity) as revenue
from invoice_line il
join track t   on t.track_id = il.track_id
join album al  on al.album_id = t.album_id
join artist ar on ar.artist_id = al.artist_id
group by ar.artist_id, ar.name;`,
        mysql: `create table artist_revenue as
select ar.artist_id, ar.name, sum(il.unit_price * il.quantity) as revenue
from invoice_line il
join track t   on t.track_id = il.track_id
join album al  on al.album_id = t.album_id
join artist ar on ar.artist_id = al.artist_id
group by ar.artist_id, ar.name;`,
        mysqlNote: 'A table refreshed monthly replaces the materialized view.',
        explanation: 'A four-table join collapsed into one stored row per artist; the monthly report reads the result instead of recomputing it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'chinook-066',
    dataset: 'chinook',
    level: 5,
    topics: ['partitioning'],
    title: 'Invoice lines split by hash',
    prompt: 'Create invoice_line_hashed with the columns of invoice_line, hash-partitioned by invoice_id into 3 partitions, and copy the lines into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'invoice_line_hashed'::regclass) as partitions,
       (select count(*) from invoice_line_hashed) as total_rows`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'invoice_line_hashed') as partitions,
       (select count(*) from invoice_line_hashed) as total_rows`,
    solutions: [
      {
        approach: 'HASH partitions on a non-key column',
        postgres: `create table invoice_line_hashed (like invoice_line, primary key (invoice_line_id, invoice_id))
partition by hash (invoice_id);

create table invoice_line_hashed_0 partition of invoice_line_hashed for values with (modulus 3, remainder 0);
create table invoice_line_hashed_1 partition of invoice_line_hashed for values with (modulus 3, remainder 1);
create table invoice_line_hashed_2 partition of invoice_line_hashed for values with (modulus 3, remainder 2);

insert into invoice_line_hashed select * from invoice_line;`,
        mysql: `create table invoice_line_hashed like invoice_line;

alter table invoice_line_hashed drop primary key, add primary key (invoice_line_id, invoice_id);

alter table invoice_line_hashed partition by hash (invoice_id) partitions 3;

insert into invoice_line_hashed select * from invoice_line;`,
        mysqlNote: 'CREATE TABLE … LIKE keeps the indexes; the primary key must be widened to include invoice_id before partitioning by it.',
        explanation:
          'Partitioning by invoice_id keeps all lines of an invoice in the same partition, so "lines of invoice X" reads one partition. The key must contain the partition column, hence (invoice_line_id, invoice_id).',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'chinook-067',
    dataset: 'chinook',
    level: 4,
    topics: ['upsert', 'constraints'],
    title: 'Upsert needs a unique key',
    prompt:
      'Genre names should be unique and imports should not create duplicates. Add a unique constraint on genre.name, then insert genres "Jazz" (exists) and "K-Pop" (new, id 26) so that the existing one is left alone.',
    orderMatters: true,
    checkSql: `select genre_id, name from genre where name in ('Jazz', 'K-Pop') order by genre_id`,
    solutions: [
      {
        approach: 'UNIQUE, then ON CONFLICT (name) DO NOTHING',
        postgres: `alter table genre add constraint genre_name_key unique (name);

insert into genre (genre_id, name) values (2, 'Jazz'), (26, 'K-Pop')
on conflict (name) do nothing;`,
        mysql: `alter table genre add constraint genre_name_key unique (name);

insert into genre (genre_id, name) values (2, 'Jazz'), (26, 'K-Pop') as new
on duplicate key update name = new.name;`,
        mysqlNote: 'ON DUPLICATE KEY reacts to a clash on any unique key, here the primary key or the new one on name; the no-op update leaves Jazz untouched.',
        explanation:
          'ON CONFLICT needs a unique index or constraint that matches its target; without UNIQUE (name), PostgreSQL refuses the statement and MySQL would happily insert a second "Jazz" with another id.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'chinook-068',
    dataset: 'chinook',
    level: 1,
    topics: ['conditions'],
    title: 'Price tiers',
    prompt: 'Count tracks by price tier: "standard" for 0.99, "premium" for 1.99, anything else "other".',
    orderMatters: false,
    solutions: [
      {
        approach: 'CASE on exact values',
        postgres: `select case unit_price when 0.99 then 'standard' when 1.99 then 'premium' else 'other' end as tier,
       count(*) as tracks
from track
group by tier;`,
        mysql: `select case unit_price when 0.99 then 'standard' when 1.99 then 'premium' else 'other' end as tier,
       count(*) as tracks
from track
group by tier;`,
        explanation: 'unit_price is numeric, so comparing it with 0.99 is exact; with floating-point columns, equality tests on prices are a trap. Video tracks cost 1.99.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'chinook-069',
    dataset: 'chinook',
    level: 3,
    topics: ['lateral'],
    title: 'Two longest tracks of each album',
    prompt: 'For albums 1 to 5, show album_id, and the two longest tracks of each (name and milliseconds).',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 2',
        postgres: `select a.album_id, t.name, t.milliseconds
from album a
cross join lateral (
  select name, milliseconds from track
  where album_id = a.album_id
  order by milliseconds desc, track_id
  limit 2
) t
where a.album_id between 1 and 5
order by a.album_id, t.milliseconds desc;`,
        mysql: `select a.album_id, t.name, t.milliseconds
from album a
cross join lateral (
  select name, milliseconds from track
  where album_id = a.album_id
  order by milliseconds desc, track_id
  limit 2
) t
where a.album_id between 1 and 5
order by a.album_id, t.milliseconds desc;`,
        explanation: 'Album 2 has a single track, so it contributes one row: LIMIT 2 is "up to two".',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'chinook-070',
    dataset: 'chinook',
    level: 1,
    topics: ['limit', 'ranking'],
    title: 'Top 5, ties included',
    prompt: 'Show the 5 invoices with the highest totals, plus every invoice tied with the 5th: invoice_id, customer_id, total.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FETCH FIRST … WITH TIES',
        postgres: `select invoice_id, customer_id, total
from invoice
order by total desc
fetch first 5 rows with ties;`,
        mysql: null,
        mysqlNote: 'MySQL has no WITH TIES; see solution B.',
        explanation: 'WITH TIES keeps adding rows as long as they equal the last one by the ORDER BY key, so the cut never splits a tie. Note the ORDER BY must not include a tie-breaker, or nothing would ever tie.',
      },
      {
        approach: 'RANK',
        postgres: `select invoice_id, customer_id, total
from (select invoice_id, customer_id, total, rank() over (order by total desc) as r from invoice) x
where r <= 5;`,
        mysql: `select invoice_id, customer_id, total
from (select invoice_id, customer_id, total, rank() over (order by total desc) as r from invoice) x
where r <= 5;`,
        explanation: 'RANK gives tied rows the same rank, so r <= 5 keeps the whole tie at fifth place.',
      },
    ],
    comparison: 'Same rows. WITH TIES is the compact standard form; RANK works everywhere.',
    docs: [{ label: 'PostgreSQL: SELECT … FETCH', url: PG + 'sql-select.html#SQL-LIMIT' }],
  },
  {
    id: 'chinook-071',
    dataset: 'chinook',
    level: 4,
    topics: ['json', 'joins'],
    title: 'A playlist as a JSON document',
    prompt: 'Return playlist 18 as one JSON object: {"name": …, "tracks": [{"id": …, "title": …}, …]} with tracks in track_id order.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Nested object with an ordered array',
        postgres: `select jsonb_build_object(
         'name', p.name,
         'tracks', jsonb_agg(jsonb_build_object('id', t.track_id, 'title', t.name) order by t.track_id)
       ) as playlist
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
where p.playlist_id = 18
group by p.playlist_id, p.name;`,
        mysql: `select json_object(
         'name', p.name,
         'tracks', cast(concat('[', group_concat(json_object('id', t.track_id, 'title', t.name) order by t.track_id), ']') as json)
       ) as playlist
from playlist p
join playlist_track pt on pt.playlist_id = p.playlist_id
join track t on t.track_id = pt.track_id
where p.playlist_id = 18
group by p.playlist_id, p.name;`,
        mysqlNote: 'JSON_ARRAYAGG cannot order its elements; an ordered GROUP_CONCAT of JSON objects, cast to JSON, can.',
        explanation: 'One row, one document: the shape an API returns. Playlist 18 is short, so the whole document stays readable.',
      },
    ],
    docs: [{ label: 'PostgreSQL: jsonb_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'chinook-072',
    dataset: 'chinook',
    level: 3,
    topics: ['date-series'],
    title: 'Invoices every week of January 2025',
    prompt: 'Show the 5 weeks starting Monday 2024-12-30 with the number of invoices each, including weeks with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Weekly series',
        postgres: `select w::date as week_start, count(i.invoice_id) as invoices
from generate_series(date '2024-12-30', date '2024-12-30' + 28, interval '7 days') as w
left join invoice i on i.invoice_date >= w and i.invoice_date < w + interval '7 days'
group by w
order by w;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'Chinook issues invoices on a fixed rhythm, a few per week, so some weeks are empty and show 0.',
      },
      {
        approach: 'Recursive weeks',
        postgres: `with recursive weeks (w, n) as (
  select date '2024-12-30', 1 union all select (w + 7)::date, n + 1 from weeks where n < 5
)
select w as week_start, count(i.invoice_id) as invoices
from weeks
left join invoice i on i.invoice_date >= w and i.invoice_date < w + 7
group by w
order by w;`,
        mysql: `with recursive weeks (w, n) as (
  select date('2024-12-30'), 1 union all select w + interval 7 day, n + 1 from weeks where n < 5
)
select w as week_start, count(i.invoice_id) as invoices
from weeks
left join invoice i on i.invoice_date >= w and i.invoice_date < w + interval 7 day
group by w
order by w;`,
        explanation: 'Five week starts built by recursion.',
      },
    ],
    comparison: 'Same 5 rows.',
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'chinook-073',
    dataset: 'chinook',
    level: 1,
    topics: ['select-basics'],
    title: 'Tracks over ten minutes',
    prompt: 'How many tracks are longer than 10 minutes, and what is the longest one\'s length in minutes (1 decimal)?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Filter and aggregate',
        postgres: `select count(*) as long_tracks, round(max(milliseconds) / 60000.0, 1) as longest_minutes
from track
where milliseconds > 600000;`,
        mysql: `select count(*) as long_tracks, round(max(milliseconds) / 60000.0, 1) as longest_minutes
from track
where milliseconds > 600000;`,
        explanation: '10 minutes = 600,000 ms. Dividing by 60000.0 (not 60000) avoids integer division in PostgreSQL. Most of the very long tracks are TV episodes.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'chinook-074',
    dataset: 'chinook',
    level: 4,
    topics: ['arrays', 'group-by'],
    title: 'Genres of each artist',
    prompt: 'For artists whose tracks span at least 3 genres, show the artist name and the array of genre names (alphabetical).',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg(DISTINCT … ORDER BY)',
        postgres: `select ar.name as artist, array_agg(distinct g.name order by g.name) as genres
from artist ar
join album al on al.artist_id = ar.artist_id
join track t on t.album_id = al.album_id
join genre g on g.genre_id = t.genre_id
group by ar.artist_id, ar.name
having count(distinct g.genre_id) >= 3
order by ar.artist_id;`,
        mysql: `select ar.name as artist,
       cast(concat('["', group_concat(distinct g.name order by g.name separator '", "'), '"]') as json) as genres
from artist ar
join album al on al.artist_id = ar.artist_id
join track t on t.album_id = al.album_id
join genre g on g.genre_id = t.genre_id
group by ar.artist_id, ar.name
having count(distinct g.genre_id) >= 3
order by ar.artist_id;`,
        mysqlNote: 'A JSON array built from GROUP_CONCAT instead of an array.',
        explanation: 'Mostly compilation-style "artists" span many genres; HAVING keeps only those with three or more.',
      },
    ],
    docs: [{ label: 'PostgreSQL: array_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'chinook-075',
    dataset: 'chinook',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for big invoices',
    prompt: 'Finance reviews invoices above 10.00 by date. Create the smallest index that serves "total > 10 order by invoice_date".',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'invoice' and indexdef like '%invoice_date%' and indexdef like '%total%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'invoice' and column_name = 'total'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index invoice_big_idx on invoice (invoice_date) where total > 10;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: '64 of 412 invoices qualify. The query must contain total > 10 (or a stricter condition the planner can prove implies it) to use the index.',
      },
      {
        approach: 'Composite index',
        postgres: `create index invoice_total_date_idx on invoice (total, invoice_date);`,
        mysql: `create index invoice_total_date_idx on invoice (total, invoice_date);`,
        explanation: 'Finds totals above 10 as one range, but the dates come out sorted only within each total, so the database still sorts.',
      },
    ],
    comparison: 'The partial index serves both the filter and the date order; the composite one serves only the filter efficiently.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'chinook-076',
    dataset: 'chinook',
    level: 4,
    topics: ['views', 'joins'],
    title: 'A view of track details',
    prompt: 'Create a view track_details (track_id, track, album, artist, genre, minutes) with minutes rounded to 1 decimal, so that reports do not repeat the four joins.',
    orderMatters: true,
    checkSql: `select track_id, track, album, artist, genre, minutes from track_details where track_id in (1, 2) order by track_id`,
    solutions: [
      {
        approach: 'View over four joins',
        postgres: `create view track_details as
select t.track_id, t.name as track, al.title as album, ar.name as artist, g.name as genre,
       round(t.milliseconds / 60000.0, 1) as minutes
from track t
join album al  on al.album_id = t.album_id
join artist ar on ar.artist_id = al.artist_id
left join genre g on g.genre_id = t.genre_id;`,
        mysql: `create view track_details as
select t.track_id, t.name as track, al.title as album, ar.name as artist, g.name as genre,
       round(t.milliseconds / 60000.0, 1) as minutes
from track t
join album al  on al.album_id = t.album_id
join artist ar on ar.artist_id = al.artist_id
left join genre g on g.genre_id = t.genre_id;`,
        explanation: 'genre_id may be NULL, so that join is a LEFT JOIN: a track without a genre still belongs in the view.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'chinook-077',
    dataset: 'chinook',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'The longest pause between purchases',
    prompt: 'For each customer, find the longest gap in days between two consecutive invoices. Show the 5 customers with the longest gaps.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG, then MAX per customer',
        postgres: `select customer_id, max(gap_days) as longest_gap_days
from (
  select customer_id,
         invoice_date::date - (lag(invoice_date) over (partition by customer_id order by invoice_date))::date as gap_days
  from invoice
) g
group by customer_id
order by longest_gap_days desc, customer_id
limit 5;`,
        mysql: `select customer_id, max(gap_days) as longest_gap_days
from (
  select customer_id,
         datediff(invoice_date, lag(invoice_date) over (partition by customer_id order by invoice_date)) as gap_days
  from invoice
) g
group by customer_id
order by longest_gap_days desc, customer_id
limit 5;`,
        explanation: 'The first invoice of each customer has no previous one (NULL gap), which MAX ignores. Chinook\'s invoices follow a fixed generated cycle: many customers share exactly the same longest gap, 584 days, so the tie-breaker on customer_id decides the list.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LAG', url: PG + 'functions-window.html' }],
  },
  {
    id: 'chinook-078',
    dataset: 'chinook',
    level: 5,
    topics: ['query-plans', 'group-by'],
    title: 'Group by id or by name',
    prompt: 'Count tracks per genre name. Compare grouping by the name directly with grouping by genre_id first and joining the names afterwards.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join, then group by name',
        postgres: `select g.name, count(*) as tracks
from track t join genre g on g.genre_id = t.genre_id
group by g.name
order by tracks desc, g.name;`,
        mysql: `select g.name, count(*) as tracks
from track t join genre g on g.genre_id = t.genre_id
group by g.name
order by tracks desc, g.name;`,
        explanation: 'Joins 3,503 tracks to their genres, then groups by the text.',
      },
      {
        approach: 'Group by id, then join',
        postgres: `select g.name, c.tracks
from (select genre_id, count(*) as tracks from track group by genre_id) c
join genre g on g.genre_id = c.genre_id
order by c.tracks desc, g.name;`,
        mysql: `select g.name, c.tracks
from (select genre_id, count(*) as tracks from track group by genre_id) c
join genre g on g.genre_id = c.genre_id
order by c.tracks desc, g.name;`,
        explanation: 'Groups by a small integer first, then joins only 25 rows to the genre names.',
      },
    ],
    comparison:
      'Same rows. "Aggregate early, join late" usually does less work, and grouping by the key also stays correct if two genres ever shared a name. Compare the measured timings; at this size both are fast.',
    docs: [{ label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' }],
  },
  {
    id: 'chinook-079',
    dataset: 'chinook',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'Followers of playlists',
    prompt:
      'Create playlist_follow (customer_id, playlist_id, followed_at): one row per customer and playlist, both foreign keys, and deleting a playlist removes its follows automatically. Add two follows, then delete playlist 18.',
    orderMatters: true,
    checkSql: `delete from playlist_track where playlist_id = 18;
delete from playlist where playlist_id = 18;
select customer_id, playlist_id from playlist_follow order by customer_id, playlist_id`,
    solutions: [
      {
        approach: 'Composite key and ON DELETE CASCADE',
        postgres: `create table playlist_follow (
  customer_id integer   not null references customer (customer_id),
  playlist_id integer   not null references playlist (playlist_id) on delete cascade,
  followed_at timestamp not null default current_timestamp,
  primary key (customer_id, playlist_id)
);

insert into playlist_follow (customer_id, playlist_id) values (1, 1), (1, 18);`,
        mysql: `create table playlist_follow (
  customer_id int      not null,
  playlist_id int      not null,
  followed_at datetime not null default current_timestamp,
  primary key (customer_id, playlist_id),
  foreign key (customer_id) references customer (customer_id),
  foreign key (playlist_id) references playlist (playlist_id) on delete cascade
);

insert into playlist_follow (customer_id, playlist_id) values (1, 1), (1, 18);`,
        explanation: 'When playlist 18 is deleted, its follow row goes with it; the follow of playlist 1 stays. (playlist_track has no CASCADE, so the check empties playlist 18 first.)',
      },
    ],
    docs: [{ label: 'PostgreSQL: Foreign keys', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' }],
  },
  {
    id: 'chinook-080',
    dataset: 'chinook',
    level: 4,
    topics: ['merge'],
    title: 'Sync a playlist with a list of tracks',
    prompt:
      'Playlist 18 must contain exactly the tracks in wanted (track_id): 1, 2 and 3. Add the missing ones and remove the others from playlist 18 in one statement.',
    orderMatters: true,
    checkSql: `select track_id from playlist_track where playlist_id = 18 order by track_id`,
    solutions: [
      {
        approach: 'MERGE into a view of one playlist',
        postgres: `create table wanted (track_id integer primary key);
insert into wanted values (1), (2), (3);

create view playlist_18 as select * from playlist_track where playlist_id = 18;

merge into playlist_18 p
using wanted w on w.track_id = p.track_id
when not matched then insert (playlist_id, track_id) values (18, w.track_id)
when not matched by source then delete;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'The view limits the target to playlist 18, so NOT MATCHED BY SOURCE removes only its extra tracks, never those of other playlists.',
      },
      {
        approach: 'DELETE the extras, INSERT the missing',
        postgres: `create table wanted (track_id integer primary key);
insert into wanted values (1), (2), (3);

delete from playlist_track where playlist_id = 18 and track_id not in (select track_id from wanted);
insert into playlist_track (playlist_id, track_id)
select 18, track_id from wanted
on conflict do nothing;`,
        mysql: `create table wanted (track_id int primary key);
insert into wanted values (1), (2), (3);

delete from playlist_track where playlist_id = 18 and track_id not in (select track_id from wanted);
insert ignore into playlist_track (playlist_id, track_id)
select 18, track_id from wanted;`,
        mysqlNote: 'INSERT IGNORE is acceptable here because the only possible error is the duplicate key.',
        explanation: 'Two statements: remove what should not be there, add what is missing.',
      },
    ],
    comparison: 'Same final playlist. A "make it exactly this list" sync is MERGE\'s strongest use case.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'chinook-081',
    dataset: 'chinook',
    level: 4,
    topics: ['temp-tables', 'subqueries'],
    title: 'Tracks nobody bought',
    prompt:
      'Put the tracks that never appear on an invoice line into a temporary table unsold (track_id, genre_id, unit_price). Then: the 5 genres with the most unsold tracks.',
    orderMatters: true,
    checkSql: `select g.name as genre, count(*) as unsold_tracks
from unsold u
join genre g on g.genre_id = u.genre_id
group by g.name
order by unsold_tracks desc, genre
limit 5`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS with NOT EXISTS',
        postgres: `create temporary table unsold as
select t.track_id, t.genre_id, t.unit_price
from track t
where not exists (select 1 from invoice_line l where l.track_id = t.track_id);`,
        mysql: `create temporary table unsold as
select t.track_id, t.genre_id, t.unit_price
from track t
where not exists (select 1 from invoice_line l where l.track_id = t.track_id);`,
        explanation:
          '1,519 of 3,503 tracks were never sold. Kept in a temp table, they can be counted by genre, priced for a sale and joined to albums without repeating the anti-join each time.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'chinook-082',
    dataset: 'chinook',
    level: 5,
    topics: ['triggers', 'json'],
    title: 'Keep the old version of every invoice',
    prompt:
      'Create invoice_audit (invoice_id, old_data, new_data) and a trigger that, on every update of an invoice, stores the row before and after as JSON. (In MySQL, billing_country and total are enough.)',
    orderMatters: true,
    checkSql: `update invoice set total = 0.99 where invoice_id = 1;
update invoice set billing_country = 'Deutschland' where invoice_id = 2;
select invoice_id,
       old_data ->> 'billing_country' as old_country, new_data ->> 'billing_country' as new_country,
       (old_data ->> 'total')::numeric as old_total, (new_data ->> 'total')::numeric as new_total
from invoice_audit
order by invoice_id`,
    checkSqlMysql: `update invoice set total = 0.99 where invoice_id = 1;
update invoice set billing_country = 'Deutschland' where invoice_id = 2;
select invoice_id,
       old_data ->> '$.billing_country' as old_country, new_data ->> '$.billing_country' as new_country,
       cast(old_data ->> '$.total' as decimal(10, 2)) as old_total, cast(new_data ->> '$.total' as decimal(10, 2)) as new_total
from invoice_audit
order by invoice_id`,
    solutions: [
      {
        approach: 'Row to JSON in an AFTER UPDATE trigger',
        postgres: `create table invoice_audit (
  invoice_id integer     not null,
  changed_at timestamptz not null default now(),
  old_data   jsonb       not null,
  new_data   jsonb       not null
);

create function audit_invoice() returns trigger
language plpgsql
as $$
begin
  insert into invoice_audit (invoice_id, old_data, new_data)
  values (old.invoice_id, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger invoice_audit_trg
after update on invoice
for each row execute function audit_invoice();`,
        mysql: `create table invoice_audit (
  invoice_id int      not null,
  changed_at datetime not null default current_timestamp,
  old_data   json     not null,
  new_data   json     not null
);

create trigger invoice_audit_trg
after update on invoice
for each row
  insert into invoice_audit (invoice_id, old_data, new_data)
  values (old.invoice_id,
          json_object('billing_country', old.billing_country, 'total', old.total),
          json_object('billing_country', new.billing_country, 'total', new.total));`,
        mysqlNote: 'MySQL cannot turn a whole row into JSON: JSON_OBJECT needs every column listed, so a new column is not audited until the trigger is changed.',
        explanation:
          'to_jsonb(old) captures every column, including ones added later, so one audit table can serve many tables. ->> reads a field back as text.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON functions', url: PG + 'functions-json.html' },
      { label: 'MySQL: JSON_OBJECT', url: MY + 'json-creation-functions.html#function_json-object' },
    ],
  },
  {
    id: 'chinook-083',
    dataset: 'chinook',
    level: 2,
    topics: ['full-join', 'group-by'],
    title: 'Customers and staff by country',
    prompt:
      'For every country that has customers or employees: the number of customers and the number of employees (0 when there are none). Most customers first, then by country.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two counts',
        postgres: `with c as (select country, count(*) as customers from customer group by country),
     e as (select country, count(*) as employees from employee group by country)
select coalesce(c.country, e.country) as country,
       coalesce(c.customers, 0) as customers,
       coalesce(e.employees, 0) as employees
from c
full join e on e.country = c.country
order by customers desc, employees desc, country;`,
        mysql: `with c as (select country, count(*) as customers from customer group by country),
     e as (select country, count(*) as employees from employee group by country)
select c.country, c.customers, coalesce(e.employees, 0) as employees
from c left join e on e.country = c.country
union all
select e.country, 0, e.employees
from e left join c on c.country = e.country
where c.country is null
order by customers desc, employees desc, country;`,
        mysqlNote: 'No FULL JOIN in MySQL: a LEFT JOIN, plus the rows only the right side has.',
        explanation:
          'Counting first and joining the two small results avoids multiplying rows. Here all employees are in Canada, so the "employees only" half is empty, but the query does not rely on that.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'chinook-084',
    dataset: 'chinook',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'A loyalty tier from lifetime spend',
    prompt:
      'Write a function customer_tier(p_customer_id) that adds up the customer\'s invoices and returns \'gold\' from 45.00, \'silver\' from 40.00, otherwise \'standard\' (and NULL for an unknown customer). Then count customers per tier.',
    orderMatters: true,
    checkSql: `select customer_tier(customer_id) as tier, count(*) as customers
from customer
group by customer_tier(customer_id)
order by tier`,
    solutions: [
      {
        approach: 'Query into a variable, then a CASE statement',
        postgres: `create function customer_tier(p_customer_id integer) returns text
language plpgsql
stable
as $$
declare
  v_spend numeric;
begin
  if not exists (select 1 from customer where customer_id = p_customer_id) then
    return null;
  end if;

  select coalesce(sum(total), 0) into v_spend from invoice where customer_id = p_customer_id;

  case
    when v_spend >= 45 then return 'gold';
    when v_spend >= 40 then return 'silver';
    else return 'standard';
  end case;
end;
$$;`,
        mysql: `create function customer_tier(p_customer_id int) returns varchar(10)
reads sql data
begin
  declare v_spend decimal(10, 2);

  if not exists (select 1 from customer where customer_id = p_customer_id) then
    return null;
  end if;

  select coalesce(sum(total), 0) into v_spend from invoice where customer_id = p_customer_id;

  case
    when v_spend >= 45 then return 'gold';
    when v_spend >= 40 then return 'silver';
    else return 'standard';
  end case;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'The CASE statement (not the CASE expression) chooses which RETURN runs; the first true branch wins, so silver only needs its lower bound. The existence check separates "unknown customer" from "customer who never bought". 5 customers are gold, 9 silver, 45 standard.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Conditionals', url: PG + 'plpgsql-control-structures.html#PLPGSQL-CONDITIONALS' },
      { label: 'MySQL: CASE statement', url: MY + 'case.html' },
    ],
  },
  {
    id: 'chinook-085',
    dataset: 'chinook',
    level: 3,
    topics: ['date-series', 'set-operations'],
    title: 'Days in December without a sale',
    prompt: 'List the days of December 2025 on which no invoice was issued.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Day series EXCEPT invoice days',
        postgres: `select d::date as day
from generate_series('2025-12-01'::date, '2025-12-31', interval '1 day') as d
except
select invoice_date::date from invoice
order by day;`,
        mysql: `with recursive days (day) as (
  select cast('2025-12-01' as date)
  union all
  select day + interval 1 day from days where day < '2025-12-31'
)
select day from days
except
select date(invoice_date) from invoice
order by day;`,
        mysqlNote: 'A recursive CTE stands in for generate_series; EXCEPT needs MySQL 8.0.31 or later.',
        explanation:
          'Generate every day that should be there, subtract the days that are: 25 of 31 December days had no invoice. EXCEPT compares whole values, so invoice_date is cut to a date first; otherwise a timestamp never equals a date.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'chinook-086',
    dataset: 'chinook',
    level: 2,
    topics: ['text-aggregation', 'distinct'],
    title: 'Billing cities of each country',
    prompt: 'For countries with invoices from at least 3 different billing cities: the country, the number of cities, and the cities in one line, alphabetically, separated by ", ".',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg(DISTINCT …) / GROUP_CONCAT(DISTINCT …)',
        postgres: `select billing_country, count(distinct billing_city) as cities,
       string_agg(distinct billing_city, ', ' order by billing_city) as city_list
from invoice
group by billing_country
having count(distinct billing_city) >= 3
order by billing_country;`,
        mysql: `select billing_country, count(distinct billing_city) as cities,
       group_concat(distinct billing_city order by billing_city separator ', ') as city_list
from invoice
group by billing_country
having count(distinct billing_city) >= 3
order by billing_country;`,
        explanation:
          'invoice has one row per invoice, so each city appears many times; DISTINCT inside the aggregate lists it once. In PostgreSQL, with DISTINCT the ORDER BY of string_agg may only use the aggregated value itself, which is exactly what is needed here.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'chinook-087',
    dataset: 'chinook',
    level: 3,
    topics: ['subtotals', 'dates-basics'],
    title: 'Quarterly sales with yearly totals',
    prompt:
      'Revenue per quarter of 2024 and 2025, with a total per year and a grand total. Show year, quarter (\'all\' on total rows; the grand total has year \'all\' too) and revenue.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP over year and quarter',
        postgres: `select coalesce(extract(year from invoice_date)::text, 'all') as year,
       coalesce(extract(quarter from invoice_date)::text, 'all') as quarter,
       sum(total) as revenue
from invoice
where invoice_date >= '2024-01-01' and invoice_date < '2026-01-01'
group by rollup (extract(year from invoice_date), extract(quarter from invoice_date))
order by grouping(extract(year from invoice_date)), extract(year from invoice_date),
         grouping(extract(quarter from invoice_date)), extract(quarter from invoice_date);`,
        mysql: `select coalesce(cast(y as char), 'all') as year, coalesce(cast(q as char), 'all') as quarter, revenue
from (
  select year(invoice_date) as y, quarter(invoice_date) as q, sum(total) as revenue,
         grouping(year(invoice_date)) as gy, grouping(quarter(invoice_date)) as gq
  from invoice
  where invoice_date >= '2024-01-01' and invoice_date < '2026-01-01'
  group by year(invoice_date), quarter(invoice_date) with rollup
) t
order by gy, y, gq, q;`,
        mysqlNote: 'WITH ROLLUP goes after the GROUP BY list. Labels are added outside, where the NULLs of the total rows are plain values.',
        explanation:
          'ROLLUP (year, quarter) adds a subtotal for each year and one grand total. Numbers are turned into text before COALESCE, because a column cannot hold both 2024 and \'all\'. 2024 brought 477.53, 2025 450.58.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'chinook-088',
    dataset: 'chinook',
    level: 4,
    topics: ['ddl'],
    title: 'A new flag, one old column gone',
    prompt:
      'Two schema changes: add explicit to track (true/false, not null, default false), and drop the fax column from customer, which nobody uses any more.',
    orderMatters: false,
    checkSql: `select (select count(*) from information_schema.columns where table_name = 'customer' and column_name = 'fax') as customer_fax,
       (select count(*) from track where explicit) as explicit_tracks,
       (select count(*) from information_schema.columns where table_name = 'track' and column_name = 'explicit' and is_nullable = 'NO') as explicit_not_null`,
    checkSqlMysql: `select (select count(*) from information_schema.columns where table_schema = database() and table_name = 'customer' and column_name = 'fax') as customer_fax,
       (select count(*) from track where explicit) as explicit_tracks,
       (select count(*) from information_schema.columns where table_schema = database() and table_name = 'track' and column_name = 'explicit' and is_nullable = 'NO') as explicit_not_null`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD COLUMN / DROP COLUMN',
        postgres: `alter table track add column explicit boolean not null default false;

alter table customer drop column fax;`,
        mysql: `alter table track add column explicit boolean not null default false;

alter table customer drop column fax;`,
        mysqlNote: 'BOOLEAN is TINYINT(1) in MySQL; false is stored as 0.',
        explanation:
          'With a constant default, adding a NOT NULL column fills every existing row with it; PostgreSQL even does this without rewriting the table. DROP COLUMN cannot be undone without a backup, and fails if a view still uses the column, which is a useful safety net.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Modifying tables', url: PG + 'ddl-alter.html' },
      { label: 'MySQL: ALTER TABLE', url: MY + 'alter-table.html' },
    ],
  },
  {
    id: 'chinook-089',
    dataset: 'chinook',
    level: 4,
    topics: ['upsert', 'aggregates'],
    title: 'Play counts from a batch of events',
    prompt:
      'Create track_plays (track_id primary key, plays). A batch of play events arrives: tracks 1, 2, 1, 3, 1. Add them to the counters in one statement (new tracks start from their count in the batch). Then run the same batch once more.',
    orderMatters: true,
    checkSql: `select track_id, plays from track_plays order by track_id`,
    solutions: [
      {
        approach: 'Aggregate the batch first, then upsert',
        postgres: `create table track_plays (track_id integer primary key references track (track_id), plays integer not null);

insert into track_plays (track_id, plays)
select track_id, count(*) from (values (1), (2), (1), (3), (1)) as batch (track_id) group by track_id
on conflict (track_id) do update set plays = track_plays.plays + excluded.plays;

insert into track_plays (track_id, plays)
select track_id, count(*) from (values (1), (2), (1), (3), (1)) as batch (track_id) group by track_id
on conflict (track_id) do update set plays = track_plays.plays + excluded.plays;`,
        mysql: `create table track_plays (track_id int primary key, plays int not null, foreign key (track_id) references track (track_id));

insert into track_plays (track_id, plays)
select * from (select track_id, count(*) as n from (select 1 as track_id union all select 2 union all select 1 union all select 3 union all select 1) batch group by track_id) as b
on duplicate key update plays = track_plays.plays + b.n;

insert into track_plays (track_id, plays)
select * from (select track_id, count(*) as n from (select 1 as track_id union all select 2 union all select 1 union all select 3 union all select 1) batch group by track_id) as b
on duplicate key update plays = track_plays.plays + b.n;`,
        mysqlNote: 'MySQL would accept the raw events too, applying them one by one; aggregating first is still fewer row updates.',
        explanation:
          'Without the GROUP BY, PostgreSQL refuses the statement: "ON CONFLICT DO UPDATE command cannot affect row a second time", because track 1 appears three times in one batch. Counting per track first turns the batch into one row per key. After two runs: track 1 has 6 plays, track 2 has 2, track 3 has 2.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'chinook-090',
    dataset: 'chinook',
    level: 4,
    topics: ['generated-columns'],
    title: 'File size in megabytes, kept in sync',
    prompt: 'Add a stored generated column size_mb to track: bytes / 1,048,576, rounded to 1 decimal. Then: the 3 largest tracks by size_mb with name and size.',
    orderMatters: true,
    checkSql: `select track_id, name, size_mb from track order by size_mb desc, track_id limit 3`,
    solutions: [
      {
        approach: 'GENERATED ALWAYS AS … STORED',
        postgres: `alter table track
add column size_mb numeric(8, 1)
generated always as (round(bytes / 1048576.0, 1)) stored;`,
        mysql: `alter table track
add column size_mb decimal(8, 1)
generated always as (round(bytes / 1048576, 1)) stored;`,
        mysqlNote: 'In MySQL / always gives a decimal result, so no .0 is needed.',
        explanation:
          'In PostgreSQL bytes / 1048576 with two integers would be integer division (a 3.9 MB track would become 3); the .0 makes it numeric. The largest "tracks" are TV episodes of about 1 GB.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'chinook-091',
    dataset: 'chinook',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for the video catalogue',
    prompt:
      'The video page lists the 1.99 tracks (videos) of an album, by name. Only 213 of 3,503 tracks cost 1.99. Create an index that holds only those tracks and serves this page.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'track' and indexdef like '%unit_price%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'track' and column_name = 'unit_price' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index track_video_album_idx on track (album_id, name)
where unit_price = 1.99;

-- used by: select name from track where unit_price = 1.99 and album_id = 229 order by name`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'The index holds 213 entries instead of 3,503, already sorted by album and name, so the page needs neither a sort nor a table scan.',
      },
      {
        approach: 'Composite index with the price first',
        postgres: `create index track_price_album_idx on track (unit_price, album_id, name);`,
        mysql: `create index track_price_album_idx on track (unit_price, album_id, name);`,
        explanation: 'unit_price = 1.99 and album_id = 229 are both equalities, so the matching entries form one range, sorted by name.',
      },
    ],
    comparison: 'Both serve the page from the index. The partial one is about 16 times smaller; the composite one works in MySQL.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'chinook-092',
    dataset: 'chinook',
    level: 1,
    topics: ['select-basics', 'strings'],
    title: 'A staff list with full names',
    prompt: 'List the employees with employee_id, a column full_name ("first last") and their title as job_title, ordered by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Concatenation and column aliases',
        postgres: `select employee_id,
       first_name || ' ' || last_name as full_name,
       title as job_title
from employee
order by employee_id;`,
        mysql: `select employee_id,
       concat(first_name, ' ', last_name) as full_name,
       title as job_title
from employee
order by employee_id;`,
        mysqlNote: 'In MySQL || means OR by default, so strings are joined with CONCAT (which also works in PostgreSQL).',
        explanation: 'AS gives a computed column a name the reader (and the application) can use. || returns NULL if any part is NULL; concat_ws or coalesce help when names can be missing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: String functions', url: PG + 'functions-string.html' }],
  },
  {
    id: 'chinook-093',
    dataset: 'chinook',
    level: 3,
    topics: ['lateral'],
    title: 'Each customer\'s biggest invoice',
    prompt: 'For customers 1 to 5: customer_id, last_name, and their largest invoice (invoice_id, invoice_date, total). On equal totals take the earliest invoice.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CROSS JOIN LATERAL … LIMIT 1',
        postgres: `select c.customer_id, c.last_name, top.invoice_id, top.invoice_date, top.total
from customer c
cross join lateral (
  select i.invoice_id, i.invoice_date, i.total
  from invoice i
  where i.customer_id = c.customer_id
  order by i.total desc, i.invoice_date, i.invoice_id
  limit 1
) top
where c.customer_id between 1 and 5
order by c.customer_id;`,
        mysql: `select c.customer_id, c.last_name, top.invoice_id, top.invoice_date, top.total
from customer c
cross join lateral (
  select i.invoice_id, i.invoice_date, i.total
  from invoice i
  where i.customer_id = c.customer_id
  order by i.total desc, i.invoice_date, i.invoice_id
  limit 1
) top
where c.customer_id between 1 and 5
order by c.customer_id;`,
        explanation:
          'MAX(total) alone would give the amount but not which invoice it was; the lateral subquery returns the whole row. CROSS JOIN drops customers without invoices; LEFT JOIN … ON TRUE would keep them.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'chinook-094',
    dataset: 'chinook',
    level: 4,
    topics: ['views'],
    title: 'A view built on a view',
    prompt:
      'Create invoice_totals (invoice_id, customer_id, lines, total) from invoice_line, then customer_value (customer_id, invoices, revenue) on top of invoice_totals. Show the 3 customers with the highest revenue.',
    orderMatters: true,
    checkSql: `select customer_id, invoices, revenue from customer_value order by revenue desc, customer_id limit 3`,
    solutions: [
      {
        approach: 'Two layered views',
        postgres: `create view invoice_totals as
select i.invoice_id, i.customer_id, count(*) as lines, sum(l.unit_price * l.quantity) as total
from invoice i
join invoice_line l on l.invoice_id = i.invoice_id
group by i.invoice_id, i.customer_id;

create view customer_value as
select customer_id, count(*) as invoices, sum(total) as revenue
from invoice_totals
group by customer_id;`,
        mysql: `create view invoice_totals as
select i.invoice_id, i.customer_id, count(*) as \`lines\`, sum(l.unit_price * l.quantity) as total
from invoice i
join invoice_line l on l.invoice_id = i.invoice_id
group by i.invoice_id, i.customer_id;

create view customer_value as
select customer_id, count(*) as invoices, sum(total) as revenue
from invoice_totals
group by customer_id;`,
        mysqlNote: 'LINES is a reserved word in MySQL, so the column name needs backticks.',
        explanation:
          'Views can stack: each layer names one idea. The database now tracks the dependency, so dropping or changing invoice_totals fails while customer_value uses it (PostgreSQL), or leaves customer_value broken until it is fixed (MySQL).',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'chinook-095',
    dataset: 'chinook',
    level: 5,
    topics: ['triggers', 'ddl'],
    title: 'A track counter on each album',
    prompt:
      'Add album.track_count, fill it, and keep it correct with triggers when tracks are inserted or deleted. Test: add track 3504 "Bonus Track" to album 1 (media type 1, genre 1, 200000 ms, 0.99).',
    orderMatters: true,
    checkSql: `insert into track (track_id, name, album_id, media_type_id, genre_id, milliseconds, unit_price) values (3504, 'Bonus Track', 1, 1, 1, 200000, 0.99);
select album_id, track_count from album where album_id in (1, 2) order by album_id`,
    solutions: [
      {
        approach: 'One trigger function for both events / two triggers',
        postgres: `alter table album add column track_count integer not null default 0;
update album a set track_count = (select count(*) from track t where t.album_id = a.album_id);

create function maintain_track_count() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update album set track_count = track_count + 1 where album_id = new.album_id;
  elsif tg_op = 'DELETE' then
    update album set track_count = track_count - 1 where album_id = old.album_id;
  end if;
  return null;
end;
$$;

create trigger track_count_trg
after insert or delete on track
for each row execute function maintain_track_count();`,
        mysql: `alter table album add column track_count int not null default 0;
update album a set track_count = (select count(*) from track t where t.album_id = a.album_id);

create trigger track_count_ins after insert on track
for each row update album set track_count = track_count + 1 where album_id = new.album_id;

create trigger track_count_del after delete on track
for each row update album set track_count = track_count - 1 where album_id = old.album_id;`,
        mysqlNote: 'A MySQL trigger handles one event, so INSERT and DELETE get one trigger each.',
        explanation:
          'TG_OP tells the PostgreSQL function which event fired it. An AFTER trigger\'s return value is ignored, hence RETURN NULL. Moving a track to another album (UPDATE of album_id) would need a third case; a stored counter is only as correct as the triggers that cover every change.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Using triggers', url: MY + 'triggers.html' },
    ],
  },
  {
    id: 'chinook-096',
    dataset: 'chinook',
    level: 1,
    topics: ['text-search'],
    title: 'Live recordings',
    prompt: 'How many tracks have "(Live" in their name, as in "My Funny Valentine (Live)"?',
    orderMatters: false,
    solutions: [
      {
        approach: 'LIKE with the parenthesis in the pattern',
        postgres: `select count(*) as live_tracks
from track
where name like '%(Live%';`,
        mysql: `select count(*) as live_tracks
from track
where name like '%(Live%';`,
        explanation:
          'Only % and _ are special in LIKE; a parenthesis is an ordinary character, so \'%(Live%\' finds names containing "(Live" anywhere. Including the parenthesis avoids matching words such as "Liver" or "Lives". To search for a real % or _, escape it: LIKE \'%10\\%%\'.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'chinook-097',
    dataset: 'chinook',
    level: 2,
    topics: ['self-cross-join', 'distinct'],
    title: 'The same song on different albums',
    prompt:
      'Count pairs of tracks with exactly the same name (same letters, case and accents) on different albums, and how many different names are involved.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Self-join on the name, exact comparison',
        postgres: `select count(*) as pairs, count(distinct a.name) as names
from track a
join track b
  on b.name = a.name
 and b.track_id > a.track_id
 and b.album_id <> a.album_id;`,
        mysql: `select count(*) as pairs, count(distinct a.name collate utf8mb4_bin) as names
from track a
join track b
  on b.name = a.name collate utf8mb4_bin
 and b.track_id > a.track_id
 and b.album_id <> a.album_id;`,
        mysqlNote:
          'MySQL\'s default collation ignores case and accents, so without COLLATE utf8mb4_bin "Minha Historia" would equal "Minha História" and the count would be higher. COUNT(DISTINCT …) compares with the collation too, so it needs the same COLLATE.',
        explanation:
          'Live versions and compilations repeat songs: 309 pairs over 192 names. Text equality depends on the collation: PostgreSQL here compares exactly, MySQL by default does not. Decide which you mean and say it in the query.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Collation support', url: PG + 'collation.html' },
      { label: 'MySQL: Collations', url: MY + 'charset-collation-names.html' },
    ],
  },
  {
    id: 'chinook-098',
    dataset: 'chinook',
    level: 3,
    topics: ['gaps-islands', 'dates-advanced'],
    title: 'Months in a row with US sales',
    prompt: 'Find the 3 longest runs of consecutive calendar months with at least one invoice billed to the USA: first month, last month (YYYY-MM) and length. Longest first, then earliest.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month number minus row number',
        postgres: `with months as (
  select distinct extract(year from invoice_date)::int * 12 + extract(month from invoice_date)::int - 1 as m
  from invoice
  where billing_country = 'USA'
),
runs as (
  select m, m - row_number() over (order by m) as grp from months
)
select to_char(make_date(min(m) / 12, min(m) % 12 + 1, 1), 'YYYY-MM') as first_month,
       to_char(make_date(max(m) / 12, max(m) % 12 + 1, 1), 'YYYY-MM') as last_month,
       count(*) as months
from runs
group by grp
order by months desc, first_month
limit 3;`,
        mysql: `with months as (
  select distinct year(invoice_date) * 12 + month(invoice_date) - 1 as m
  from invoice
  where billing_country = 'USA'
),
runs as (
  select m, m - row_number() over (order by m) as grp from months
)
select concat(min(m) div 12, '-', lpad(min(m) % 12 + 1, 2, '0')) as first_month,
       concat(max(m) div 12, '-', lpad(max(m) % 12 + 1, 2, '0')) as last_month,
       count(*) as months
from runs
group by grp
order by months desc, first_month
limit 3;`,
        mysqlNote: 'DIV is integer division in MySQL; / would give a decimal.',
        explanation:
          'Turning each month into one number (year × 12 + month) makes "consecutive months" mean "consecutive integers", and the usual number-minus-row-number trick finds the runs. The longest: September 2021 to June 2022, ten months.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'chinook-099',
    dataset: 'chinook',
    level: 4,
    topics: ['temp-tables', 'aggregates'],
    title: 'Tracks on many playlists',
    prompt:
      'Store each track\'s number of playlists in a temporary table track_reach (track_id, playlists). Then: how many tracks are on 5 playlists, and the average reach per genre for the 3 genres with the highest average (2 decimals).',
    orderMatters: true,
    checkSql: `select g.name as genre, round(avg(r.playlists), 2) as avg_playlists
from track_reach r
join track t on t.track_id = r.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name
order by avg_playlists desc, genre
limit 3`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS, keyed',
        postgres: `create temporary table track_reach as
select track_id, count(*) as playlists
from playlist_track
group by track_id;

alter table track_reach add primary key (track_id);

select count(*) as tracks_on_5 from track_reach where playlists = 5;`,
        mysql: `create temporary table track_reach as
select track_id, count(*) as playlists
from playlist_track
group by track_id;

alter table track_reach add primary key (track_id);

select count(*) as tracks_on_5 from track_reach where playlists = 5;`,
        explanation:
          'The count is computed once and reused for several questions. 41 tracks sit on 5 playlists, the maximum. Tracks on no playlist are not in the table at all; a LEFT JOIN from track with coalesce(playlists, 0) would include them.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'chinook-100',
    dataset: 'chinook',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Add a track to a playlist, safely',
    prompt:
      'Write a procedure add_to_playlist(p_playlist_id, p_track_id) that raises an error if the playlist or the track does not exist, does nothing if the track is already on the playlist, and inserts it otherwise. Add track 1 to playlist 18, twice.',
    orderMatters: true,
    checkSql: `select playlist_id, track_id from playlist_track where playlist_id = 18 order by track_id`,
    solutions: [
      {
        approach: 'Checks, then an insert that ignores duplicates',
        postgres: `create procedure add_to_playlist(p_playlist_id integer, p_track_id integer)
language plpgsql
as $$
begin
  if not exists (select 1 from playlist where playlist_id = p_playlist_id) then
    raise exception 'playlist % does not exist', p_playlist_id;
  end if;
  if not exists (select 1 from track where track_id = p_track_id) then
    raise exception 'track % does not exist', p_track_id;
  end if;

  insert into playlist_track (playlist_id, track_id)
  values (p_playlist_id, p_track_id)
  on conflict do nothing;
end;
$$;

call add_to_playlist(18, 1);
call add_to_playlist(18, 1);`,
        mysql: `create procedure add_to_playlist(p_playlist_id int, p_track_id int)
begin
  if not exists (select 1 from playlist where playlist_id = p_playlist_id) then
    signal sqlstate '45000' set message_text = 'playlist does not exist';
  end if;
  if not exists (select 1 from track where track_id = p_track_id) then
    signal sqlstate '45000' set message_text = 'track does not exist';
  end if;

  insert into playlist_track (playlist_id, track_id)
  values (p_playlist_id, p_track_id)
  on duplicate key update track_id = track_id;
end;

call add_to_playlist(18, 1);
call add_to_playlist(18, 1);`,
        mysqlNote: DELIMITER_NOTE + ' The no-op ON DUPLICATE KEY UPDATE plays the role of DO NOTHING.',
        explanation:
          'Foreign keys would also reject a missing playlist or track, but with a generic message; the procedure says which one. The second call finds the pair already there and changes nothing, so the procedure is safe to retry.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' }],
  },
  {
    id: 'chinook-101',
    dataset: 'chinook',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'An index nobody needs',
    prompt:
      'playlist_track has a primary key (playlist_id, track_id) and separate indexes on playlist_id and on track_id. One of the separate indexes is redundant. Find it, explain why, and drop it.',
    orderMatters: false,
    checkSql: `select count(*) as indexes from pg_indexes where tablename = 'playlist_track'`,
    checkSqlMysql: `select count(distinct index_name) as indexes from information_schema.statistics where table_schema = database() and table_name = 'playlist_track'`,
    solutions: [
      {
        approach: 'Drop the index that is a prefix of the primary key',
        postgres: `drop index playlist_track_playlist_id_idx;`,
        mysql: `drop index playlist_track_playlist_id_idx on playlist_track;`,
        mysqlNote: 'MySQL needs the table name in DROP INDEX.',
        explanation:
          'The primary key index is sorted by playlist_id first, so it already serves every lookup by playlist_id alone. The separate index only costs space and slows down every insert and delete. The index on track_id stays: track_id is the second key column, and a lookup by it alone cannot use the primary key.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Multicolumn indexes', url: PG + 'indexes-multicolumn.html' },
      { label: 'MySQL: DROP INDEX', url: MY + 'drop-index.html' },
    ],
  },
  {
    id: 'chinook-102',
    dataset: 'chinook',
    level: 3,
    topics: ['recursive'],
    title: 'Fill a time budget, greedily',
    prompt:
      'Build a playlist from album 1 with at most 1,420,000 ms of music: go through its tracks in track_id order, take a track if it still fits, otherwise skip it and try the next. Show the chosen track_ids with the running total.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE carrying the used time',
        postgres: `with recursive tracks as (
  select row_number() over (order by track_id) as n, track_id, milliseconds
  from track
  where album_id = 1
),
fill (n, track_id, taken, used) as (
  select n, track_id, milliseconds <= 1420000, case when milliseconds <= 1420000 then milliseconds else 0 end
  from tracks where n = 1
  union all
  select t.n, t.track_id,
         f.used + t.milliseconds <= 1420000,
         case when f.used + t.milliseconds <= 1420000 then f.used + t.milliseconds else f.used end
  from fill f
  join tracks t on t.n = f.n + 1
)
select track_id, used as running_ms
from fill
where taken
order by n;`,
        mysql: `with recursive tracks as (
  select row_number() over (order by track_id) as n, track_id, milliseconds
  from track
  where album_id = 1
),
fill (n, track_id, taken, used) as (
  select n, track_id, milliseconds <= 1420000, case when milliseconds <= 1420000 then milliseconds else 0 end
  from tracks where n = 1
  union all
  select t.n, t.track_id,
         f.used + t.milliseconds <= 1420000,
         case when f.used + t.milliseconds <= 1420000 then f.used + t.milliseconds else f.used end
  from fill f
  join tracks t on t.n = f.n + 1
)
select track_id, used as running_ms
from fill
where taken
order by n;`,
        explanation:
          'Whether a track is taken depends on what was taken before, including the skips, so a running SUM cannot express it; the recursion carries "time used so far" from row to row. Track 10 does not fit, but the shorter track 11 after it does: six tracks, 1,397,079 ms.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'chinook-103',
    dataset: 'chinook',
    level: 4,
    topics: ['normalization'],
    title: 'Is the genre a property of the album?',
    prompt:
      'Someone suggests storing genre_id on album instead of on every track. Check it: list the albums whose tracks belong to more than one genre, with the number of genres. Order by genres descending, then album_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Test album_id → genre_id with GROUP BY … HAVING',
        postgres: `select al.album_id, al.title, count(distinct t.genre_id) as genres
from album al
join track t on t.album_id = al.album_id
group by al.album_id, al.title
having count(distinct t.genre_id) > 1
order by genres desc, al.album_id;`,
        mysql: `select al.album_id, al.title, count(distinct t.genre_id) as genres
from album al
join track t on t.album_id = al.album_id
group by al.album_id, al.title
having count(distinct t.genre_id) > 1
order by genres desc, al.album_id;`,
        explanation:
          'If album_id determined genre_id, every album would have exactly one genre and the column could move to album without losing anything. Eleven albums, such as compilations and a TV season, break the rule, so the genre belongs to the track.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'chinook-104',
    dataset: 'chinook',
    level: 4,
    topics: ['arrays', 'json'],
    title: 'Playlists that share a track with Grunge',
    prompt: 'Collect the track ids of every playlist into a list, then find the playlists (other than Grunge, id 16) whose list has at least one track in common with Grunge\'s. Show playlist_id and name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array && array / JSON_OVERLAPS',
        postgres: `with lists as (
  select playlist_id, array_agg(track_id) as tracks
  from playlist_track
  group by playlist_id
)
select p.playlist_id, p.name
from lists l
join playlist p on p.playlist_id = l.playlist_id
where l.playlist_id <> 16
  and l.tracks && (select tracks from lists where playlist_id = 16)
order by p.playlist_id;`,
        mysql: `with lists as (
  select playlist_id, json_arrayagg(track_id) as tracks
  from playlist_track
  group by playlist_id
)
select p.playlist_id, p.name
from lists l
join playlist p on p.playlist_id = l.playlist_id
where l.playlist_id <> 16
  and json_overlaps(l.tracks, (select tracks from lists where playlist_id = 16))
order by p.playlist_id;`,
        mysqlNote: 'JSON_OVERLAPS (MySQL 8.0.17+) is true when two JSON arrays have at least one element in common.',
        explanation:
          '&& means "overlaps": at least one shared element, as opposed to @> "contains all". Three playlists share Grunge tracks: the two Music playlists and 90\'s Music.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' },
      { label: 'MySQL: JSON_OVERLAPS', url: MY + 'json-search-functions.html#function_json-overlaps' },
    ],
  },
  {
    id: 'chinook-105',
    dataset: 'chinook',
    level: 5,
    topics: ['partitioning'],
    title: 'Audio and video tracks apart',
    prompt:
      'Create track_by_media (track_id, name, album_id, media_type_id, milliseconds) list-partitioned by media_type_id: video (3) in one partition, the four audio types (1, 2, 4, 5) in another. Copy the tracks in.',
    orderMatters: false,
    checkSql: `select (select count(*) from track_video) as video, (select count(*) from track_audio) as audio`,
    checkSqlMysql: `select (select count(*) from track_by_media partition (p_video)) as video,
       (select count(*) from track_by_media partition (p_audio)) as audio`,
    solutions: [
      {
        approach: 'LIST partitions on an integer key',
        postgres: `create table track_by_media (
  track_id      integer      not null,
  name          varchar(200) not null,
  album_id      integer,
  media_type_id integer      not null,
  milliseconds  integer      not null,
  primary key (track_id, media_type_id)
) partition by list (media_type_id);

create table track_video partition of track_by_media for values in (3);
create table track_audio partition of track_by_media for values in (1, 2, 4, 5);

insert into track_by_media select track_id, name, album_id, media_type_id, milliseconds from track;`,
        mysql: `create table track_by_media (
  track_id      int          not null,
  name          varchar(200) not null,
  album_id      int,
  media_type_id int          not null,
  milliseconds  int          not null,
  primary key (track_id, media_type_id)
)
partition by list (media_type_id) (
  partition p_video values in (3),
  partition p_audio values in (1, 2, 4, 5)
);

insert into track_by_media select track_id, name, album_id, media_type_id, milliseconds from track;`,
        mysqlNote: 'Plain LIST works here because the key is an integer.',
        explanation:
          '214 video tracks and 3,289 audio tracks. Big video rows and small audio rows now live apart, and queries that filter on media_type_id read one partition. A sixth media type would fail to insert until a partition lists it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'chinook-106',
    dataset: 'chinook',
    level: 5,
    topics: ['locks-isolation'],
    title: 'A lock that lets invoices through',
    prompt:
      'Change customer 1\'s email to luis.goncalves@embraer.com.br, locking the row first. Other sessions keep creating invoices for this customer and must not be blocked by your lock. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select customer_id, email from customer where customer_id = 1`,
    solutions: [
      {
        approach: 'FOR NO KEY UPDATE',
        postgres: `select email from customer where customer_id = 1 for no key update;

update customer set email = 'luis.goncalves@embraer.com.br' where customer_id = 1;`,
        mysql: `start transaction;

select email from customer where customer_id = 1 for update;

update customer set email = 'luis.goncalves@embraer.com.br' where customer_id = 1;

commit;`,
        mysqlNote: 'MySQL has no FOR NO KEY UPDATE. In InnoDB an INSERT into invoice takes a shared lock on the referenced customer row, so it waits for this FOR UPDATE until COMMIT; keep such transactions short.',
        explanation:
          'Inserting an invoice checks the foreign key by taking FOR KEY SHARE on the customer. FOR UPDATE conflicts with that, so invoices would wait; FOR NO KEY UPDATE promises not to change the key and lets them through. A plain UPDATE that leaves the key alone already takes this weaker lock in PostgreSQL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' }],
  },
  {
    id: 'chinook-107',
    dataset: 'chinook',
    level: 3,
    topics: ['cte', 'ranking'],
    title: 'Support reps, their revenue and their best customer',
    prompt:
      'For each support rep: last_name, customers, revenue (invoice totals of their customers), share of all revenue in percent (1 decimal), and their highest-spending customer\'s id. Order by revenue descending.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Per-customer CTE feeding two summaries',
        postgres: `with per_customer as (
  select c.support_rep_id, c.customer_id, sum(i.total) as spent
  from customer c
  join invoice i on i.customer_id = c.customer_id
  group by c.support_rep_id, c.customer_id
),
per_rep as (
  select support_rep_id, count(*) as customers, sum(spent) as revenue
  from per_customer
  group by support_rep_id
),
best as (
  select support_rep_id, customer_id,
         row_number() over (partition by support_rep_id order by spent desc, customer_id) as n
  from per_customer
)
select e.last_name, r.customers, r.revenue,
       round(100 * r.revenue / sum(r.revenue) over (), 1) as share_pct,
       b.customer_id as best_customer
from per_rep r
join employee e on e.employee_id = r.support_rep_id
join best b on b.support_rep_id = r.support_rep_id and b.n = 1
order by r.revenue desc;`,
        mysql: `with per_customer as (
  select c.support_rep_id, c.customer_id, sum(i.total) as spent
  from customer c
  join invoice i on i.customer_id = c.customer_id
  group by c.support_rep_id, c.customer_id
),
per_rep as (
  select support_rep_id, count(*) as customers, sum(spent) as revenue
  from per_customer
  group by support_rep_id
),
best as (
  select support_rep_id, customer_id,
         row_number() over (partition by support_rep_id order by spent desc, customer_id) as n
  from per_customer
)
select e.last_name, r.customers, r.revenue,
       round(100 * r.revenue / sum(r.revenue) over (), 1) as share_pct,
       b.customer_id as best_customer
from per_rep r
join employee e on e.employee_id = r.support_rep_id
join best b on b.support_rep_id = r.support_rep_id and b.n = 1
order by r.revenue desc;`,
        explanation:
          'per_customer is computed once and used twice: summed per rep and ranked per rep. SUM(…) OVER () with an empty window adds up all reps for the share. Peacock leads with 21 customers and 833.04.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'chinook-108',
    dataset: 'chinook',
    level: 3,
    topics: ['window-frames'],
    title: 'The last_value trap',
    prompt: 'For customer 2\'s invoices in date order: invoice_id, invoice_date, total, the total of the customer\'s first invoice and of their last invoice, on every row.',
    orderMatters: true,
    solutions: [
      {
        approach: 'first_value and last_value with a full frame',
        postgres: `select invoice_id, invoice_date, total,
       first_value(total) over w as first_total,
       last_value(total) over w as last_total
from invoice
where customer_id = 2
window w as (order by invoice_date, invoice_id rows between unbounded preceding and unbounded following)
order by invoice_date, invoice_id;`,
        mysql: `select invoice_id, invoice_date, total,
       first_value(total) over w as first_total,
       last_value(total) over w as last_total
from invoice
where customer_id = 2
window w as (order by invoice_date, invoice_id rows between unbounded preceding and unbounded following)
order by invoice_date, invoice_id;`,
        explanation:
          'With ORDER BY and no frame, the window ends at the current row, so last_value would just repeat each row\'s own total. Extending the frame to UNBOUNDED FOLLOWING makes it see the whole partition: 0.99, the July 2024 invoice. The WINDOW clause names the definition once for both functions.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'chinook-109',
    dataset: 'chinook',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'A genre list from the label',
    prompt:
      'The label sends its genre list: (2, Jazz), (5, Rock & Roll), (26, K-Pop). Apply it in one statement: rename where the name differs, add the new genre, leave identical rows untouched.',
    orderMatters: true,
    checkSql: `select genre_id, name from genre where genre_id in (2, 5, 26) order by genre_id`,
    solutions: [
      {
        approach: 'MERGE with a change test',
        postgres: `merge into genre g
using (values (2, 'Jazz'), (5, 'Rock & Roll'), (26, 'K-Pop')) as feed (genre_id, name)
on g.genre_id = feed.genre_id
when matched and g.name is distinct from feed.name then
  update set name = feed.name
when not matched then
  insert (genre_id, name) values (feed.genre_id, feed.name);`,
        mysql: `insert into genre (genre_id, name)
values (2, 'Jazz'), (5, 'Rock & Roll'), (26, 'K-Pop') as feed
on duplicate key update name = feed.name;`,
        mysqlNote: 'No MERGE in MySQL; an upsert does the same here, and MySQL skips rows whose value does not change.',
        explanation:
          '"Rock And Roll" becomes "Rock & Roll", K-Pop is added as genre 26, Jazz is matched but not rewritten. IS DISTINCT FROM also counts a NULL name replaced by a value as a change.',
      },
    ],
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'chinook-110',
    dataset: 'chinook',
    level: 3,
    topics: ['pivot', 'joins'],
    title: 'Sales by media type, 2024 and 2025',
    prompt: 'Count invoice lines per media type in 2024 and in 2025, one column per year, for all five media types (0 where none). Order by media_type_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEFT JOIN from media_type, conditional counts',
        postgres: `select m.media_type_id, m.name,
       count(*) filter (where extract(year from i.invoice_date) = 2024) as y2024,
       count(*) filter (where extract(year from i.invoice_date) = 2025) as y2025
from media_type m
left join track t on t.media_type_id = m.media_type_id
left join invoice_line l on l.track_id = t.track_id
left join invoice i on i.invoice_id = l.invoice_id
group by m.media_type_id, m.name
order by m.media_type_id;`,
        mysql: `select m.media_type_id, m.name,
       sum(year(i.invoice_date) = 2024) as y2024,
       sum(year(i.invoice_date) = 2025) as y2025
from media_type m
left join track t on t.media_type_id = m.media_type_id
left join invoice_line l on l.track_id = t.track_id
left join invoice i on i.invoice_id = l.invoice_id
group by m.media_type_id, m.name
order by m.media_type_id;`,
        mysqlNote: 'Where the outer join finds nothing, year(NULL) = 2024 is NULL, which SUM ignores; with no lines at all the sum would be NULL instead of 0, so wrap it in COALESCE if that can happen.',
        explanation:
          'Starting from media_type keeps "Purchased AAC audio file" in the result although it never sold in these years. Protected (DRM) AAC and video sales fall sharply in 2025, while plain MPEG audio grows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'chinook-111',
    dataset: 'chinook',
    level: 4,
    topics: ['materialized-views', 'aggregates'],
    title: 'Genre sales, stored',
    prompt: 'Store per genre: genre_id, name, lines sold and revenue (unit_price × quantity, 2 decimals) for the label\'s weekly report. Then: the 3 best genres by lines sold.',
    orderMatters: true,
    checkSql: `select name, lines_sold, revenue from genre_sales order by lines_sold desc, genre_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view keyed by genre',
        postgres: `create materialized view genre_sales as
select g.genre_id, g.name, count(*) as lines_sold, round(sum(l.unit_price * l.quantity), 2) as revenue
from invoice_line l
join track t on t.track_id = l.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name;

create unique index genre_sales_key on genre_sales (genre_id);`,
        mysql: `create table genre_sales (
  genre_id   int primary key,
  name       varchar(120),
  lines_sold int,
  revenue    decimal(10, 2)
);

replace into genre_sales
select g.genre_id, g.name, count(*), round(sum(l.unit_price * l.quantity), 2)
from invoice_line l
join track t on t.track_id = l.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name;`,
        mysqlNote: 'A keyed table refreshed by REPLACE INTO stands in for the materialized view.',
        explanation: 'Rock sells by far the most lines (835), then Latin and Metal. A weekly report can read the stored rows directly; REFRESH (or the REPLACE) runs once a week before it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'chinook-112',
    dataset: 'chinook',
    level: 1,
    topics: ['limit', 'conditions'],
    title: 'The shortest audio tracks',
    prompt: 'Among tracks that are not videos (media_type_id is not 3), show the 5 shortest: name and milliseconds, shortest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter, sort ascending, LIMIT',
        postgres: `select name, milliseconds
from track
where media_type_id <> 3
order by milliseconds, track_id
limit 5;`,
        mysql: `select name, milliseconds
from track
where media_type_id <> 3
order by milliseconds, track_id
limit 5;`,
        explanation: 'The shortest lasts about one second. <> means "not equal"; != works too in both databases.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'chinook-113',
    dataset: 'chinook',
    level: 2,
    topics: ['text-aggregation', 'group-by'],
    title: 'Discographies in one line',
    prompt: 'For artists with at least 5 albums: name, the number of albums, and the album titles in album_id order, separated by " | ". Most albums first, then name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg ordered by album_id',
        postgres: `select ar.name, count(*) as albums,
       string_agg(al.title, ' | ' order by al.album_id) as titles
from artist ar
join album al on al.artist_id = ar.artist_id
group by ar.artist_id, ar.name
having count(*) >= 5
order by albums desc, ar.name;`,
        mysql: `select ar.name, count(*) as albums,
       group_concat(al.title order by al.album_id separator ' | ') as titles
from artist ar
join album al on al.artist_id = ar.artist_id
group by ar.artist_id, ar.name
having count(*) >= 5
order by albums desc, ar.name;`,
        mysqlNote: 'Iron Maiden\'s 21 titles fit easily into the default group_concat_max_len of 1,024 bytes; longer lists are cut off silently unless you raise it.',
        explanation: 'Seven artists have five or more albums, led by Iron Maiden with 21. Ordering by album_id keeps the catalogue order; ordering by title would depend on the collation.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'chinook-114',
    dataset: 'chinook',
    level: 3,
    topics: ['date-series', 'joins'],
    title: 'One customer, quarter by quarter',
    prompt: 'For customer 1: spending per quarter from 2024 Q1 to 2025 Q4, showing every quarter (0 when nothing was bought), labelled like "2024 Q1".',
    orderMatters: true,
    solutions: [
      {
        approach: 'Quarter series LEFT JOIN invoices',
        postgres: `select to_char(q.start, 'YYYY') || ' Q' || extract(quarter from q.start) as quarter,
       coalesce(sum(i.total), 0) as spent
from generate_series('2024-01-01'::timestamp, '2025-10-01', interval '3 months') as q (start)
left join invoice i
  on i.customer_id = 1 and i.invoice_date >= q.start and i.invoice_date < q.start + interval '3 months'
group by q.start
order by q.start;`,
        mysql: `with recursive quarters (start) as (
  select cast('2024-01-01' as datetime)
  union all
  select start + interval 3 month from quarters where start < '2025-10-01'
)
select concat(year(q.start), ' Q', quarter(q.start)) as quarter,
       coalesce(sum(i.total), 0) as spent
from quarters q
left join invoice i
  on i.customer_id = 1 and i.invoice_date >= q.start and i.invoice_date < q.start + interval 3 month
group by q.start
order by q.start;`,
        explanation:
          'Customer 1 bought in only three of the eight quarters. The customer filter belongs in ON: in WHERE it would remove the empty quarters, because their invoice columns are NULL. COALESCE turns the NULL sum of an empty quarter into 0.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'chinook-115',
    dataset: 'chinook',
    level: 4,
    topics: ['upsert', 'ddl'],
    title: 'A wishlist that refreshes',
    prompt:
      'Create wishlist (customer_id, track_id, added_at) with one row per customer and track. Customer 1 adds tracks 1 and 2 on 2025-07-01, then adds track 2 again and track 3 on 2025-07-05. Adding an existing track only refreshes added_at.',
    orderMatters: true,
    checkSql: `select customer_id, track_id, added_at from wishlist order by track_id`,
    solutions: [
      {
        approach: 'Composite primary key and an upsert',
        postgres: `create table wishlist (
  customer_id integer not null references customer (customer_id),
  track_id    integer not null references track (track_id),
  added_at    date    not null,
  primary key (customer_id, track_id)
);

insert into wishlist values (1, 1, '2025-07-01'), (1, 2, '2025-07-01');

insert into wishlist values (1, 2, '2025-07-05'), (1, 3, '2025-07-05')
on conflict (customer_id, track_id) do update set added_at = excluded.added_at;`,
        mysql: `create table wishlist (
  customer_id int  not null,
  track_id    int  not null,
  added_at    date not null,
  primary key (customer_id, track_id),
  foreign key (customer_id) references customer (customer_id),
  foreign key (track_id) references track (track_id)
);

insert into wishlist values (1, 1, '2025-07-01'), (1, 2, '2025-07-01');

insert into wishlist values (1, 2, '2025-07-05'), (1, 3, '2025-07-05') as new
on duplicate key update added_at = new.added_at;`,
        explanation: 'Track 1 keeps 2025-07-01, track 2 moves to 2025-07-05, track 3 is new. Without the composite key the second insert would simply create a duplicate wish.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'chinook-116',
    dataset: 'chinook',
    level: 4,
    topics: ['generated-columns', 'strings'],
    title: 'Track length as m:ss, stored',
    prompt: 'Add a stored generated column duration_text to track showing the length as minutes:seconds, like "5:43". Show it for tracks 1 to 3.',
    orderMatters: true,
    checkSql: `select track_id, milliseconds, duration_text from track where track_id between 1 and 3 order by track_id`,
    solutions: [
      {
        approach: 'Integer division and padding inside a generated column',
        postgres: `alter table track
add column duration_text varchar(10)
generated always as ((milliseconds / 60000)::text || ':' || lpad(((milliseconds / 1000) % 60)::text, 2, '0')) stored;`,
        mysql: `alter table track
add column duration_text varchar(10)
generated always as (concat(milliseconds div 60000, ':', lpad((milliseconds div 1000) % 60, 2, '0'))) stored;`,
        mysqlNote: 'DIV is integer division in MySQL; / would give decimals.',
        explanation:
          'Integer division cuts the fraction: 343,719 ms is 5 minutes and 43 seconds (the 719 ms are dropped). to_char would be the obvious tool, but it is not immutable, so PostgreSQL refuses it in a generated column; ::text, || and lpad are fine.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'chinook-117',
    dataset: 'chinook',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for business customers',
    prompt: 'Account managers list customers with a company (10 of 59) by country. Create an index that holds only customers with a company and serves that list.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'customer' and indexdef like '%company%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'customer' and column_name = 'company'`,
    solutions: [
      {
        approach: 'Partial index on IS NOT NULL',
        postgres: `create index customer_business_idx on customer (country) include (company)
where company is not null;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'Private customers (company NULL) stay out of the index. With 59 rows this is about principle; with millions of consumers and a few thousand businesses, it saves real space.',
      },
      {
        approach: 'Composite index with company first',
        postgres: `create index customer_company_country_idx on customer (company, country);`,
        mysql: `create index customer_company_country_idx on customer (company, country);`,
        explanation: 'company IS NOT NULL is a range of this index (NULLs sit together at one end), but the result is ordered by company, not by country.',
      },
    ],
    comparison: 'The partial index is smaller and already in country order; the composite one works in MySQL.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'chinook-118',
    dataset: 'chinook',
    level: 2,
    topics: ['full-join', 'aggregates'],
    title: 'Catalogue size and sales, genre by genre',
    prompt: 'For every genre: the number of tracks in the catalogue and the number of invoice lines sold, side by side, with 0 where a genre sold nothing. Only show genres with fewer than 5 lines sold, by genre name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two per-genre counts',
        postgres: `with catalogue as (
  select genre_id, count(*) as tracks from track group by genre_id
),
sales as (
  select t.genre_id, count(*) as lines from invoice_line l join track t on t.track_id = l.track_id group by t.genre_id
)
select g.name, coalesce(c.tracks, 0) as tracks, coalesce(s.lines, 0) as lines_sold
from catalogue c
full join sales s on s.genre_id = c.genre_id
join genre g on g.genre_id = coalesce(c.genre_id, s.genre_id)
where coalesce(s.lines, 0) < 5
order by g.name;`,
        mysql: `with catalogue as (
  select genre_id, count(*) as tracks from track group by genre_id
),
sales as (
  select t.genre_id, count(*) as \`lines\` from invoice_line l join track t on t.track_id = l.track_id group by t.genre_id
)
select g.name, c.tracks, coalesce(s.\`lines\`, 0) as lines_sold
from catalogue c
left join sales s on s.genre_id = c.genre_id
join genre g on g.genre_id = c.genre_id
where coalesce(s.\`lines\`, 0) < 5
order by g.name;`,
        mysqlNote: 'No FULL JOIN in MySQL; every sold genre also has tracks, so a LEFT JOIN from the catalogue is enough. LINES is a reserved word and needs backticks.',
        explanation:
          'Opera has one track and never sold. A FULL JOIN keeps genres missing on either side; joining genre on coalesce(c.genre_id, s.genre_id) names them whichever side they came from.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'chinook-119',
    dataset: 'chinook',
    level: 3,
    topics: ['window-frames'],
    title: 'A customer\'s biggest purchase so far',
    prompt: 'For customer 5\'s invoices in date order: invoice_date, total, and the largest total up to and including that invoice.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Running MAX over a growing frame',
        postgres: `select invoice_date, total,
       max(total) over (order by invoice_date, invoice_id rows between unbounded preceding and current row) as best_so_far
from invoice
where customer_id = 5
order by invoice_date, invoice_id;`,
        mysql: `select invoice_date, total,
       max(total) over (order by invoice_date, invoice_id rows between unbounded preceding and current row) as best_so_far
from invoice
where customer_id = 5
order by invoice_date, invoice_id;`,
        explanation:
          'Any aggregate can run over a frame, not just SUM. The record stays at 5.94 until the 16.86 invoice of September 2024 sets a new one. A row where best_so_far equals total is a new personal record.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'chinook-120',
    dataset: 'chinook',
    level: 4,
    topics: ['views', 'aggregates'],
    title: 'A view of the top customers',
    prompt: 'Create a view vip_customers (customer_id, name, country, spent) for customers who spent more than 45 in total. Then list them, biggest spender first.',
    orderMatters: true,
    checkSql: `select customer_id, name, country, spent from vip_customers order by spent desc, customer_id`,
    solutions: [
      {
        approach: 'A view with GROUP BY and HAVING',
        postgres: `create view vip_customers as
select c.customer_id, c.first_name || ' ' || c.last_name as name, c.country, sum(i.total) as spent
from customer c
join invoice i on i.customer_id = c.customer_id
group by c.customer_id, c.first_name, c.last_name, c.country
having sum(i.total) > 45;`,
        mysql: `create view vip_customers as
select c.customer_id, concat(c.first_name, ' ', c.last_name) as name, c.country, sum(i.total) as spent
from customer c
join invoice i on i.customer_id = c.customer_id
group by c.customer_id, c.first_name, c.last_name, c.country
having sum(i.total) > 45;`,
        explanation:
          'Five customers qualify. The threshold is fixed inside the view; views take no parameters, so a variable threshold needs a function returning a table instead. An aggregating view like this is read-only.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'chinook-121',
    dataset: 'chinook',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'Invoices of a date range',
    prompt: 'Monthly reports filter invoice by invoice_date ranges, but invoice only has indexes on its id and customer_id. Add an index for the date filter, and write the March 2025 report (invoices and revenue) so that it can use it.',
    orderMatters: false,
    checkSql: `select count(*) as invoices, sum(total) as revenue from invoice where invoice_date >= '2025-03-01' and invoice_date < '2025-04-01'`,
    solutions: [
      {
        approach: 'Index the date, query with a half-open range',
        postgres: `create index invoice_date_idx on invoice (invoice_date) include (total);

-- explain select count(*), sum(total) from invoice where invoice_date >= '2025-03-01' and invoice_date < '2025-04-01';`,
        mysql: `create index invoice_date_idx on invoice (invoice_date, total);

-- explain select count(*), sum(total) from invoice where invoice_date >= '2025-03-01' and invoice_date < '2025-04-01';`,
        mysqlNote: 'MySQL has no INCLUDE; adding total as a second key column makes the index covering.',
        explanation:
          'The range is written on the bare column, so the index can find it; date_trunc(\'month\', invoice_date) = … would hide it. With 412 invoices the planner may still prefer a scan, which is the right choice for tiny tables: indexes pay off as tables grow.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Index-only scans', url: PG + 'indexes-index-only-scans.html' }],
  },
  {
    id: 'chinook-122',
    dataset: 'chinook',
    level: 1,
    topics: ['text-search', 'conditions'],
    title: 'Compilations by their title',
    prompt: 'How many albums have "Greatest" or "Best Of" in the title, in any letter case?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Two patterns joined with OR',
        postgres: `select count(*) as compilations
from album
where title ilike '%greatest%' or title ilike '%best of%';`,
        mysql: `select count(*) as compilations
from album
where title like '%greatest%' or title like '%best of%';`,
        mysqlNote: 'MySQL\'s default collation ignores case, so plain LIKE matches "The Best of Ed Motta" and "The Best Of Billy Cobham" alike.',
        explanation: '22 albums. Case matters here: the data writes both "Best Of" and "Best of". ILIKE (or lower() on both sides) catches both spellings.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE and ILIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'chinook-123',
    dataset: 'chinook',
    level: 3,
    topics: ['pivot', 'joins'],
    title: 'Invoices per support rep and year',
    prompt: 'For each support rep: last_name and the number of their customers\' invoices in 2023, 2024 and 2025, one column per year. Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts per year',
        postgres: `select e.last_name,
       count(*) filter (where extract(year from i.invoice_date) = 2023) as y2023,
       count(*) filter (where extract(year from i.invoice_date) = 2024) as y2024,
       count(*) filter (where extract(year from i.invoice_date) = 2025) as y2025
from invoice i
join customer c on c.customer_id = i.customer_id
join employee e on e.employee_id = c.support_rep_id
group by e.employee_id, e.last_name
order by e.employee_id;`,
        mysql: `select e.last_name,
       sum(year(i.invoice_date) = 2023) as y2023,
       sum(year(i.invoice_date) = 2024) as y2024,
       sum(year(i.invoice_date) = 2025) as y2025
from invoice i
join customer c on c.customer_id = i.customer_id
join employee e on e.employee_id = c.support_rep_id
group by e.employee_id, e.last_name
order by e.employee_id;`,
        explanation: 'Peacock\'s customers grew to 31 invoices in 2025 while Johnson\'s shrank to 23. Invoices are credited to the customer\'s current rep, so a reassigned customer moves all past invoices with them.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'chinook-124',
    dataset: 'chinook',
    level: 4,
    topics: ['temp-tables', 'joins'],
    title: '2025 sales lines, enriched once',
    prompt: 'Store every 2025 invoice line with its genre name and line amount in a temporary table sales_2025 (invoice_line_id, genre, amount). Then: the 3 genres with the most lines and their revenue.',
    orderMatters: true,
    checkSql: `select genre, count(*) as lines_sold, sum(amount) as revenue from sales_2025 group by genre order by lines_sold desc, genre limit 3`,
    solutions: [
      {
        approach: 'Join once, aggregate many times',
        postgres: `create temporary table sales_2025 as
select l.invoice_line_id, g.name as genre, l.unit_price * l.quantity as amount
from invoice_line l
join invoice i on i.invoice_id = l.invoice_id
join track t on t.track_id = l.track_id
join genre g on g.genre_id = t.genre_id
where i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01';`,
        mysql: `create temporary table sales_2025 as
select l.invoice_line_id, g.name as genre, l.unit_price * l.quantity as amount
from invoice_line l
join invoice i on i.invoice_id = l.invoice_id
join track t on t.track_id = l.track_id
join genre g on g.genre_id = t.genre_id
where i.invoice_date >= '2025-01-01' and i.invoice_date < '2026-01-01';`,
        explanation: 'Four tables joined once; Rock (176 lines), Latin and Alternative & Punk lead. Any further slice of 2025 sales (by month, by customer country) now reads 442 prepared rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'chinook-125',
    dataset: 'chinook',
    level: 5,
    topics: ['functions', 'normalization'],
    title: 'Do invoice totals add up?',
    prompt: 'Write a function lines_total(p_invoice_id) that sums unit_price × quantity of the invoice\'s lines. Use it to count invoices whose stored total differs from their lines.',
    orderMatters: false,
    checkSql: `select count(*) as invoices, count(*) filter (where total <> lines_total(invoice_id)) as mismatches from invoice`,
    checkSqlMysql: `select count(*) as invoices, sum(total <> lines_total(invoice_id)) as mismatches from invoice`,
    solutions: [
      {
        approach: 'A scalar SQL function used in a check query',
        postgres: `create function lines_total(p_invoice_id integer) returns numeric
language sql
stable
as $$
  select coalesce(sum(unit_price * quantity), 0) from invoice_line where invoice_id = p_invoice_id;
$$;`,
        mysql: `create function lines_total(p_invoice_id int) returns decimal(10, 2)
reads sql data
begin
  return (select coalesce(sum(unit_price * quantity), 0) from invoice_line where invoice_id = p_invoice_id);
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'All 412 totals agree with their lines today. invoice.total is derived data stored for speed; a function like this turns "is it still right?" into a one-line audit you can run any time.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SQL functions', url: PG + 'xfunc-sql.html' }],
  },
  {
    id: 'chinook-126',
    dataset: 'chinook',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'A consistent export without stopping readers',
    prompt:
      'An export reads invoice and invoice_line in several queries. Nobody may change invoices while it runs, but other sessions may keep reading. Lock invoice accordingly, then run the export\'s first query (invoices and revenue of 2025). In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select count(*) as invoices, sum(total) as revenue from invoice where invoice_date >= '2025-01-01' and invoice_date < '2026-01-01'`,
    solutions: [
      {
        approach: 'LOCK TABLE … IN SHARE MODE / LOCK TABLES … READ',
        postgres: `lock table invoice, invoice_line in share mode;

select count(*) as invoices, sum(total) as revenue
from invoice
where invoice_date >= '2025-01-01' and invoice_date < '2026-01-01';`,
        mysql: `lock tables invoice read, invoice_line read;

select count(*) as invoices, sum(total) as revenue
from invoice
where invoice_date >= '2025-01-01' and invoice_date < '2026-01-01';

unlock tables;`,
        mysqlNote: 'LOCK TABLES … READ lets every session read but nobody write, including this session. It must list every table the session will touch, and UNLOCK TABLES releases them.',
        explanation:
          'SHARE mode conflicts with writers but not with readers or other SHARE locks: inserts and updates wait, queries go on. In PostgreSQL a REPEATABLE READ transaction would give a consistent export without blocking writers at all; the lock is for when the data must also not change underneath other readers.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table-level locks', url: PG + 'explicit-locking.html#LOCKING-TABLES' }],
  },
]
