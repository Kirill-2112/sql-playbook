import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const ITEMS = `create table item (id int primary key, name varchar(20), price int);
insert into item values (1, 'tea', 3), (2, 'cake', 7);`

export const modifyEntries: ReferenceEntry[] = [
  {
    id: 'insert',
    name: 'INSERT … VALUES',
    group: 'modify',
    summary: 'Adds rows. List the columns explicitly so the statement keeps working when the table gets new columns; omitted columns get their default.',
    postgres: "insert into item (id, name)\nvalues (3, 'pie'), (4, 'jam');",
    mysql: "insert into item (id, name)\nvalues (3, 'pie'), (4, 'jam');",
    example: {
      postgres: `${ITEMS}
insert into item (id, name) values (3, 'pie');
select id, name, price from item order by id;`,
    },
    match: '\\binsert\\s+into\\b[^;]*\\bvalues\\b',
    docs: [
      { label: 'PostgreSQL: INSERT', url: PG + 'sql-insert.html' },
      { label: 'MySQL: INSERT', url: MY + 'insert.html' },
    ],
  },
  {
    id: 'insert-select',
    name: 'INSERT … SELECT',
    group: 'modify',
    summary: 'Inserts the result of a query, for copying, archiving or summarising rows into another table in one statement.',
    postgres: 'insert into archive (id, name)\nselect id, name from item where price < 5;',
    mysql: 'insert into archive (id, name)\nselect id, name from item where price < 5;',
    example: {
      postgres: `${ITEMS}
create table cheap (id int, name varchar(20));
insert into cheap (id, name) select id, name from item where price < 5;
select id, name from cheap;`,
    },
    match: '\\binsert\\s+into\\s+\\w+(\\s*\\([^)]*\\))?\\s*(with\\b[\\s\\S]*?)?select\\b',
    docs: [
      { label: 'PostgreSQL: INSERT', url: PG + 'sql-insert.html' },
      { label: 'MySQL: INSERT … SELECT', url: MY + 'insert-select.html' },
    ],
  },
  {
    id: 'update',
    name: 'UPDATE … SET',
    group: 'modify',
    summary: 'Changes columns in the rows that match WHERE. Without WHERE every row changes, so write the WHERE first.',
    postgres: 'update item\nset price = price + 1\nwhere id = 1;',
    mysql: 'update item\nset price = price + 1\nwhere id = 1;',
    example: {
      postgres: `${ITEMS}
update item set price = price * 2 where name = 'tea';
select id, price from item order by id;`,
    },
    match: '\\bupdate\\s+\\w+(\\s+\\w+)?\\s+set\\b',
    docs: [
      { label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' },
      { label: 'MySQL: UPDATE', url: MY + 'update.html' },
    ],
  },
  {
    id: 'update-join',
    name: 'UPDATE with another table',
    group: 'modify',
    summary: 'Updates rows using values from a second table. PostgreSQL adds a FROM clause; MySQL joins the tables before SET.',
    postgres: 'update item\nset price = p.new_price\nfrom price_list p\nwhere p.id = item.id;',
    mysql: 'update item\njoin price_list p on p.id = item.id\nset item.price = p.new_price;',
    example: {
      postgres: `${ITEMS}
create table price_list (id int, new_price int);
insert into price_list values (2, 9);
update item set price = p.new_price from price_list p where p.id = item.id;
select id, price from item order by id;`,
      mysql: `${ITEMS}
create table price_list (id int, new_price int);
insert into price_list values (2, 9);
update item join price_list p on p.id = item.id set item.price = p.new_price;
select id, price from item order by id;`,
    },
    match: '\\bupdate\\s+\\w+(\\s+\\w+)?\\s+(set\\b[^;]*\\bfrom\\b|(inner\\s+|left\\s+)?join\\b)',
    docs: [
      { label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' },
      { label: 'MySQL: UPDATE', url: MY + 'update.html' },
    ],
  },
  {
    id: 'delete',
    name: 'DELETE',
    group: 'modify',
    summary: 'Removes the rows that match WHERE. To delete based on another table, PostgreSQL uses USING and MySQL a join.',
    postgres: 'delete from item where price is null;\ndelete from item using banned b where b.id = item.id;',
    mysql: 'delete from item where price is null;\ndelete item from item join banned b on b.id = item.id;',
    example: {
      postgres: `${ITEMS}
delete from item where price > 5;
select id, name from item;`,
    },
    match: '\\bdelete\\s+(\\w+\\s+)?from\\b',
    docs: [
      { label: 'PostgreSQL: DELETE', url: PG + 'sql-delete.html' },
      { label: 'MySQL: DELETE', url: MY + 'delete.html' },
    ],
  },
  {
    id: 'upsert',
    name: 'ON CONFLICT (upsert)',
    group: 'modify',
    summary:
      'Inserts a row, or updates the existing one when it would break a unique key. EXCLUDED is the row you tried to insert. DO NOTHING just skips duplicates.',
    postgres: 'insert into item (id, name) values (1, \'tea\')\non conflict (id) do update set name = excluded.name;',
    mysql: "insert into item (id, name) values (1, 'tea') as new\non duplicate key update name = new.name;",
    mysqlNote: 'MySQL 8.0.19+ uses a row alias (AS new); the older VALUES(name) form is deprecated. INSERT IGNORE is the DO NOTHING equivalent, but it also hides other errors.',
    example: {
      postgres: `${ITEMS}
insert into item (id, name, price) values (2, 'cheesecake', 8), (3, 'pie', 5)
on conflict (id) do update set name = excluded.name, price = excluded.price;
select id, name, price from item order by id;`,
      mysql: `${ITEMS}
insert into item (id, name, price) values (2, 'cheesecake', 8), (3, 'pie', 5) as new
on duplicate key update name = new.name, price = new.price;
select id, name, price from item order by id;`,
    },
    match: '\\bon\\s+conflict\\b|\\bon\\s+duplicate\\s+key\\b|\\binsert\\s+ignore\\b',
    docs: [
      { label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'returning',
    name: 'RETURNING',
    group: 'modify',
    summary: 'Returns the inserted, updated or deleted rows, including generated ids and defaults, without a second query.',
    postgres: 'insert into item (name) values (\'pie\') returning id;\ndelete from item where … returning *;',
    mysql: null,
    mysqlNote: 'Not in MySQL. After an insert, LAST_INSERT_ID() gives the first auto-increment id of the statement; otherwise select the rows again.',
    example: {
      postgres: `create table note (id int generated always as identity, body varchar(20));
insert into note (body) values ('a'), ('b') returning id, body;`,
      mysql: `create table note (id int auto_increment primary key, body varchar(20));
insert into note (body) values ('a'), ('b');
select id, body from note where id >= last_insert_id();`,
    },
    match: '\\breturning\\b|\\blast_insert_id\\s*\\(',
    docs: [{ label: 'PostgreSQL: returning data', url: PG + 'dml-returning.html' }],
  },
  {
    id: 'merge',
    name: 'MERGE',
    group: 'modify',
    summary:
      'Compares a source with a target table and, per row, updates, inserts or deletes depending on whether it matched. One statement for synchronising data.',
    postgres:
      'merge into item t\nusing incoming s on s.id = t.id\nwhen matched then update set price = s.price\nwhen not matched then insert (id, name, price) values (s.id, s.name, s.price);',
    mysql: null,
    mysqlNote: 'Not in MySQL. INSERT … ON DUPLICATE KEY UPDATE covers insert-or-update; deletes need a separate statement.',
    example: {
      postgres: `${ITEMS}
create table incoming (id int, name varchar(20), price int);
insert into incoming values (2, 'cake', 8), (3, 'pie', 5);
merge into item t
using incoming s on s.id = t.id
when matched then update set price = s.price
when not matched then insert (id, name, price) values (s.id, s.name, s.price);
select id, name, price from item order by id;`,
      mysql: `${ITEMS}
create table incoming (id int, name varchar(20), price int);
insert into incoming values (2, 'cake', 8), (3, 'pie', 5);
insert into item (id, name, price)
select id, name, price from incoming s
on duplicate key update price = s.price;
select id, name, price from item order by id;`,
    },
    match: '\\bmerge\\s+into\\b',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'truncate',
    name: 'TRUNCATE',
    group: 'modify',
    summary: 'Empties a whole table at once, much faster than DELETE without WHERE. It does not fire DELETE triggers.',
    postgres: 'truncate item restart identity;',
    mysql: 'truncate table item;',
    mysqlNote: 'In MySQL TRUNCATE commits immediately and always resets AUTO_INCREMENT; in PostgreSQL it can be rolled back.',
    example: {
      postgres: `${ITEMS}
truncate item;
select count(*) as left_over from item;`,
      mysql: `${ITEMS}
truncate table item;
select count(*) as left_over from item;`,
    },
    match: '\\btruncate\\s+(table\\s+)?\\w',
    docs: [
      { label: 'PostgreSQL: TRUNCATE', url: PG + 'sql-truncate.html' },
      { label: 'MySQL: TRUNCATE TABLE', url: MY + 'truncate-table.html' },
    ],
  },
  {
    id: 'writable-cte',
    name: 'Data-modifying CTE',
    group: 'modify',
    summary:
      'PostgreSQL lets INSERT, UPDATE or DELETE … RETURNING run inside WITH, so one statement can move rows: delete them and insert what was deleted into an archive.',
    postgres: 'with moved as (\n  delete from item where price > 5 returning *\n)\ninsert into archive select * from moved;',
    mysql: null,
    mysqlNote: 'Not in MySQL: run the INSERT … SELECT and the DELETE as two statements in one transaction.',
    example: {
      postgres: `${ITEMS}
create table archive (id int, name varchar(20), price int);
with moved as (delete from item where price > 5 returning *)
insert into archive select * from moved;
select (select count(*) from item) as kept, (select count(*) from archive) as archived;`,
      mysql: `${ITEMS}
create table archive (id int, name varchar(20), price int);
insert into archive select * from item where price > 5;
delete from item where price > 5;
select (select count(*) from item) as kept, (select count(*) from archive) as archived;`,
    },
    match: '\\bwith\\s+\\w+\\s+as\\s*\\(\\s*(delete|update|insert)\\b',
    docs: [{ label: 'PostgreSQL: data-modifying statements in WITH', url: PG + 'queries-with.html#QUERIES-WITH-MODIFYING' }],
  },
]
