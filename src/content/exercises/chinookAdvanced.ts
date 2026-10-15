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
]
