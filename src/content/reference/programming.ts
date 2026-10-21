import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const DELIMITER =
  'In the mysql command-line client wrap the definition in DELIMITER // … // so the semicolons inside the body do not end it early.'

const ITEMS = `create table item (id int primary key, name varchar(20), price int);
insert into item values (1, 'tea', 4), (2, 'cake', 8);`

export const programmingEntries: ReferenceEntry[] = [
  {
    id: 'create-function-sql',
    name: 'CREATE FUNCTION (SQL)',
    group: 'programming',
    summary:
      'Saves an expression or query under a name, with parameters, so it can be called like a built-in function. IMMUTABLE/STABLE tell PostgreSQL how much it may optimise.',
    postgres: 'create function with_tax(p numeric) returns numeric\nlanguage sql immutable\nreturn round(p * 1.25, 2);',
    mysql: 'create function with_tax(p decimal(10, 2)) returns decimal(10, 2)\ndeterministic\nreturn round(p * 1.25, 2);',
    mysqlNote: `MySQL functions must say DETERMINISTIC, NO SQL or READS SQL DATA when binary logging is on (the default). ${DELIMITER}`,
    example: {
      postgres: `create function with_tax(p numeric) returns numeric language sql immutable return round(p * 1.25, 2);
select with_tax(10) as price;`,
      mysql: `create function with_tax(p decimal(10, 2)) returns decimal(10, 2) deterministic return round(p * 1.25, 2);
select with_tax(10) as price;`,
    },
    match: '\\bcreate\\s+(or\\s+replace\\s+)?function\\b',
    docs: [
      { label: 'PostgreSQL: CREATE FUNCTION', url: PG + 'sql-createfunction.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'plpgsql',
    name: 'PL/pgSQL: DECLARE, IF, RETURN',
    group: 'programming',
    summary:
      'PL/pgSQL adds variables, conditions and loops to functions. The body is a string between $$ … $$: DECLARE lists variables, BEGIN … END holds the statements, := assigns.',
    postgres:
      "create function grade(score int) returns text\nlanguage plpgsql as $$\ndeclare\n  result text;\nbegin\n  if score >= 90 then result := 'A';\n  elsif score >= 75 then result := 'B';\n  else result := 'C';\n  end if;\n  return result;\nend;\n$$;",
    mysql:
      "create function grade(score int) returns varchar(1)\ndeterministic\nbegin\n  declare result varchar(1);\n  if score >= 90 then set result = 'A';\n  elseif score >= 75 then set result = 'B';\n  else set result = 'C';\n  end if;\n  return result;\nend;",
    mysqlNote: `MySQL writes the body inline (no $$), declares variables after BEGIN, assigns with SET and spells ELSEIF. ${DELIMITER}`,
    example: {
      postgres: `create function grade(score int) returns text language plpgsql as $$
declare
  result text;
begin
  if score >= 90 then result := 'A';
  elsif score >= 75 then result := 'B';
  else result := 'C';
  end if;
  return result;
end;
$$;
select grade(95) as a, grade(80) as b, grade(10) as c;`,
      mysql: `create function grade(score int) returns varchar(1) deterministic
begin
  declare result varchar(1);
  if score >= 90 then set result = 'A';
  elseif score >= 75 then set result = 'B';
  else set result = 'C';
  end if;
  return result;
end;
select grade(95) as a, grade(80) as b, grade(10) as c;`,
    },
    match: '\\blanguage\\s+plpgsql\\b|\\bdeclare\\b',
    docs: [
      { label: 'PostgreSQL: PL/pgSQL structure', url: PG + 'plpgsql-structure.html' },
      { label: 'MySQL: IF statement', url: MY + 'if.html' },
    ],
  },
  {
    id: 'loops',
    name: 'Loops: FOR, WHILE, LOOP',
    group: 'programming',
    summary: 'Repeat statements inside a function or procedure. Prefer one set-based SQL statement when you can; loops are for logic that really is step by step.',
    postgres: 'for i in 1..10 loop … end loop;\nwhile x < 100 loop … end loop;\nfor r in select … loop … end loop;',
    mysql: 'while x < 100 do … end while;\nrepeat … until x >= 100 end repeat;\nlbl: loop … leave lbl; end loop;',
    mysqlNote: 'MySQL has no FOR over a range or a query; use WHILE with a counter, or a cursor.',
    example: {
      postgres: `create function factorial(n int) returns bigint language plpgsql as $$
declare
  r bigint := 1;
begin
  for i in 2..n loop
    r := r * i;
  end loop;
  return r;
end;
$$;
select factorial(5) as f5, factorial(10) as f10;`,
      mysql: `create function factorial(n int) returns bigint deterministic
begin
  declare r bigint default 1;
  declare i int default 2;
  while i <= n do
    set r = r * i;
    set i = i + 1;
  end while;
  return r;
end;
select factorial(5) as f5, factorial(10) as f10;`,
    },
    match: '\\bend\\s+(loop|while|repeat)\\b',
    docs: [
      { label: 'PostgreSQL: control structures', url: PG + 'plpgsql-control-structures.html' },
      { label: 'MySQL: WHILE', url: MY + 'while.html' },
    ],
  },
  {
    id: 'returns-table',
    name: 'RETURNS TABLE',
    group: 'programming',
    summary: 'A function that returns rows, used in FROM like a table with parameters.',
    postgres: 'create function cheap_items(max_price int)\nreturns table (id int, name varchar)\nlanguage sql as $$\n  select id, name from item where price <= max_price\n$$;\nselect * from cheap_items(5);',
    mysql: 'create procedure cheap_items(max_price int)\nbegin\n  select id, name from item where price <= max_price;\nend;\ncall cheap_items(5);',
    mysqlNote: 'MySQL functions return a single value only. A procedure can send a result set to the client, but it cannot be used in FROM; a view or a JSON result are the other options.',
    example: {
      postgres: `${ITEMS}
create function cheap_items(max_price int) returns table (id int, name varchar)
language sql as $$ select id, name from item where price <= max_price $$;
select * from cheap_items(5);`,
      mysql: `${ITEMS}
create procedure cheap_items(max_price int)
begin
  select id, name from item where price <= max_price;
end;
call cheap_items(5);`,
    },
    match: '\\breturns\\s+(table|setof)\\b',
    docs: [{ label: 'PostgreSQL: SQL functions returning tables', url: PG + 'xfunc-sql.html#XFUNC-SQL-FUNCTIONS-RETURNING-TABLE' }],
  },
  {
    id: 'procedure',
    name: 'CREATE PROCEDURE and CALL',
    group: 'programming',
    summary:
      'A procedure performs actions instead of returning a value, and is run with CALL. In PostgreSQL a procedure (unlike a function) may COMMIT inside its body.',
    postgres: 'create procedure raise_prices(pct int)\nlanguage sql as $$\n  update item set price = price * (100 + pct) / 100\n$$;\ncall raise_prices(10);',
    mysql: 'create procedure raise_prices(pct int)\nbegin\n  update item set price = price * (100 + pct) / 100;\nend;\ncall raise_prices(10);',
    mysqlNote: DELIMITER,
    example: {
      postgres: `${ITEMS}
create procedure raise_prices(pct int) language sql as $$
  update item set price = price * (100 + pct) / 100
$$;
call raise_prices(50);
select id, price from item order by id;`,
      mysql: `${ITEMS}
create procedure raise_prices(pct int)
begin
  update item set price = price * (100 + pct) / 100;
end;
call raise_prices(50);
select id, price from item order by id;`,
    },
    match: '\\bcreate\\s+(or\\s+replace\\s+)?procedure\\b|\\bcall\\s+\\w+\\s*\\(',
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'do-block',
    name: 'DO (anonymous block)',
    group: 'programming',
    summary: 'Runs a piece of PL/pgSQL once without saving it as a function. Good for one-off scripts with loops or conditions.',
    postgres: 'do $$\nbegin\n  …\nend\n$$;',
    mysql: null,
    mysqlNote: 'MySQL has no anonymous blocks: create a procedure, CALL it, then DROP it.',
    example: {
      postgres: `${ITEMS}
do $$
begin
  for i in 3..5 loop
    insert into item values (i, 'item ' || i, i * 2);
  end loop;
end
$$;
select count(*) as items from item;`,
      mysql: `${ITEMS}
create procedure fill()
begin
  declare i int default 3;
  while i <= 5 do
    insert into item values (i, concat('item ', i), i * 2);
    set i = i + 1;
  end while;
end;
call fill();
drop procedure fill;
select count(*) as items from item;`,
    },
    match: '\\bdo\\s+\\$\\$',
    docs: [{ label: 'PostgreSQL: DO', url: PG + 'sql-do.html' }],
  },
  {
    id: 'raise-signal',
    name: 'RAISE EXCEPTION / SIGNAL',
    group: 'programming',
    summary:
      'Stops with an error from inside a function or trigger, with your own message, when data breaks a business rule. The whole statement is rolled back.',
    postgres: "if qty < 0 then\n  raise exception 'negative quantity: %', qty;\nend if;",
    mysql: "if qty < 0 then\n  signal sqlstate '45000' set message_text = 'negative quantity';\nend if;",
    mysqlNote: "SQLSTATE '45000' means a user-defined error. MySQL's message cannot contain placeholders; build it with CONCAT into a variable first.",
    example: {
      postgres: `create function checked_qty(qty int) returns int language plpgsql as $$
begin
  if qty < 0 then
    raise exception 'negative quantity: %', qty;
  end if;
  return qty;
end;
$$;
select checked_qty(3) as ok;`,
      mysql: `create function checked_qty(qty int) returns int deterministic
begin
  if qty < 0 then
    signal sqlstate '45000' set message_text = 'negative quantity';
  end if;
  return qty;
end;
select checked_qty(3) as ok;`,
    },
    match: '\\braise\\s+(exception|notice|warning)\\b|\\bsignal\\s+sqlstate\\b',
    docs: [
      { label: 'PostgreSQL: errors and messages', url: PG + 'plpgsql-errors-and-messages.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'exception-handler',
    name: 'EXCEPTION WHEN / DECLARE HANDLER',
    group: 'programming',
    summary: 'Catches an error inside a function and does something else instead, for example returns NULL for text that is not a number.',
    postgres: 'begin\n  return s::int;\nexception\n  when invalid_text_representation then return null;\nend;',
    mysql: 'begin\n  declare n int;\n  declare exit handler for sqlexception return null;\n  set n = s;\n  return n;\nend;',
    mysqlNote: 'MySQL declares handlers at the top of the block; EXIT leaves the block, CONTINUE goes on with the next statement.',
    example: {
      postgres: `create function safe_int(s text) returns int language plpgsql as $$
begin
  return s::int;
exception
  when invalid_text_representation then return null;
end;
$$;
select safe_int('42') as good, safe_int('abc') as bad;`,
      mysql: `create function safe_int(s varchar(20)) returns int deterministic
begin
  declare n int;
  declare exit handler for sqlexception return null;
  set n = s;
  return n;
end;
select safe_int('42') as good, safe_int('abc') as bad;`,
    },
    match: '\\bexception\\s+when\\b|\\bdeclare\\s+(exit|continue)\\s+handler\\b',
    docs: [
      { label: 'PostgreSQL: trapping errors', url: PG + 'plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING' },
      { label: 'MySQL: DECLARE … HANDLER', url: MY + 'declare-handler.html' },
    ],
  },
  {
    id: 'trigger-before',
    name: 'BEFORE trigger (NEW)',
    group: 'programming',
    summary:
      'Runs for each row before it is inserted or updated, and can change NEW (the row about to be written) or reject it. In PostgreSQL the logic is a separate trigger function.',
    postgres:
      "create function clean_name() returns trigger language plpgsql as $$\nbegin\n  new.name := lower(trim(new.name));\n  return new;\nend;\n$$;\ncreate trigger item_clean before insert or update on item\nfor each row execute function clean_name();",
    mysql: 'create trigger item_clean before insert on item\nfor each row\nset new.name = lower(trim(new.name));',
    mysqlNote: `MySQL writes the body inside CREATE TRIGGER (BEGIN … END for several statements) and needs one trigger per event. ${DELIMITER}`,
    example: {
      postgres: `create table item (id int, name varchar(20));
create function clean_name() returns trigger language plpgsql as $$
begin
  new.name := lower(trim(new.name));
  return new;
end;
$$;
create trigger item_clean before insert on item for each row execute function clean_name();
insert into item values (1, '  TEA ');
select id, name from item;`,
      mysql: `create table item (id int, name varchar(20));
create trigger item_clean before insert on item for each row
set new.name = lower(trim(new.name));
insert into item values (1, '  TEA ');
select id, name from item;`,
    },
    match: '\\bcreate\\s+(or\\s+replace\\s+)?trigger\\b[^;]*\\bbefore\\b',
    docs: [
      { label: 'PostgreSQL: trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: CREATE TRIGGER', url: MY + 'create-trigger.html' },
    ],
  },
  {
    id: 'trigger-audit',
    name: 'AFTER trigger (OLD and NEW)',
    group: 'programming',
    summary: 'Runs after the change is made; OLD is the row before an UPDATE or DELETE, NEW after. The classic use is an audit log of changes.',
    postgres:
      'create trigger price_audit after update of price on item\nfor each row when (old.price is distinct from new.price)\nexecute function log_price();',
    mysql: 'create trigger price_audit after update on item\nfor each row\nbegin\n  if not (old.price <=> new.price) then\n    insert into price_log values (old.id, old.price, new.price);\n  end if;\nend;',
    mysqlNote: `MySQL has no WHEN clause or UPDATE OF column list: test inside the body. ${DELIMITER}`,
    example: {
      postgres: `${ITEMS}
create table price_log (id int, old_price int, new_price int);
create function log_price() returns trigger language plpgsql as $$
begin
  insert into price_log values (old.id, old.price, new.price);
  return null;
end;
$$;
create trigger price_audit after update of price on item
for each row when (old.price is distinct from new.price) execute function log_price();
update item set price = price + 1;
update item set name = upper(name);
select id, old_price, new_price from price_log order by id;`,
      mysql: `${ITEMS}
create table price_log (id int, old_price int, new_price int);
create trigger price_audit after update on item for each row
begin
  if not (old.price <=> new.price) then
    insert into price_log values (old.id, old.price, new.price);
  end if;
end;
update item set price = price + 1;
update item set name = upper(name);
select id, old_price, new_price from price_log order by id;`,
    },
    match: '\\bcreate\\s+(or\\s+replace\\s+)?trigger\\b[^;]*\\bafter\\b',
    docs: [
      { label: 'PostgreSQL: CREATE TRIGGER', url: PG + 'sql-createtrigger.html' },
      { label: 'MySQL: trigger syntax', url: MY + 'trigger-syntax.html' },
    ],
  },
]
