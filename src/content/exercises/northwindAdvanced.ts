import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const REVENUE_NOTE = 'Revenue of an order line is unit_price × quantity × (1 − discount).'
const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

// Levels 4–5: changing data, structure and logic in the database.
export const northwindAdvanced: Exercise[] = [
  {
    id: 'northwind-032',
    dataset: 'northwind',
    level: 4,
    topics: ['views'],
    title: 'A view of order revenue',
    prompt: 'Create a view order_revenue (order_id, customer_id, order_date, revenue) with each order\'s revenue rounded to 2 decimals.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    checkSql: `select order_id, customer_id, revenue from order_revenue order by revenue desc, order_id limit 5`,
    solutions: [
      {
        approach: 'Aggregating view',
        postgres: `create view order_revenue as
select o.order_id, o.customer_id, o.order_date,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by o.order_id, o.customer_id, o.order_date;`,
        mysql: `create view order_revenue as
select o.order_id, o.customer_id, o.order_date,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by o.order_id, o.customer_id, o.order_date;`,
        explanation:
          'The revenue formula is written once, in the view, instead of in every report. A view stores the query, not the result: it is recomputed each time it is read, so it is always current.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: CREATE VIEW', url: MY + 'create-view.html' },
    ],
  },
  {
    id: 'northwind-033',
    dataset: 'northwind',
    level: 4,
    topics: ['normalization', 'dml'],
    title: 'Move shipping addresses to their own table',
    prompt:
      'orders repeats the same ship_name, ship_address, ship_city and ship_country over and over. Create ship_addresses (id, those four columns) holding each combination once, add ship_address_id to orders and fill it.',
    orderMatters: false,
    checkSql: `select (select count(*) from ship_addresses) as addresses,
       (select count(*) from orders where ship_address_id is null) as unlinked_orders`,
    solutions: [
      {
        approach: 'Extract, then link with UPDATE … FROM',
        postgres: `create table ship_addresses (
  id           integer generated always as identity primary key,
  ship_name    varchar(40) not null,
  ship_address varchar(60) not null,
  ship_city    varchar(15) not null,
  ship_country varchar(15) not null,
  unique (ship_name, ship_address, ship_city, ship_country)
);

insert into ship_addresses (ship_name, ship_address, ship_city, ship_country)
select distinct ship_name, ship_address, ship_city, ship_country from orders;

alter table orders add column ship_address_id integer references ship_addresses (id);

update orders o
set ship_address_id = a.id
from ship_addresses a
where a.ship_name = o.ship_name and a.ship_address = o.ship_address
  and a.ship_city = o.ship_city and a.ship_country = o.ship_country;`,
        mysql: `create table ship_addresses (
  id           int auto_increment primary key,
  ship_name    varchar(40) not null,
  ship_address varchar(60) not null,
  ship_city    varchar(15) not null,
  ship_country varchar(15) not null,
  unique (ship_name, ship_address, ship_city, ship_country)
);

insert into ship_addresses (ship_name, ship_address, ship_city, ship_country)
select distinct ship_name, ship_address, ship_city, ship_country from orders;

alter table orders add column ship_address_id int, add foreign key (ship_address_id) references ship_addresses (id);

update orders o
join ship_addresses a
  on a.ship_name = o.ship_name and a.ship_address = o.ship_address
 and a.ship_city = o.ship_city and a.ship_country = o.ship_country
set o.ship_address_id = a.id;`,
        mysqlNote: 'MySQL writes an update that reads another table as UPDATE … JOIN … SET; PostgreSQL uses UPDATE … SET … FROM.',
        explanation:
          'A step towards third normal form: the address facts live in one place, and orders point to them. The old columns could now be dropped. The UNIQUE constraint stops the same address from being stored twice later.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: UPDATE … FROM', url: PG + 'sql-update.html' },
      { label: 'MySQL: UPDATE (multiple-table syntax)', url: MY + 'update.html' },
    ],
  },
  {
    id: 'northwind-034',
    dataset: 'northwind',
    level: 4,
    topics: ['dml', 'joins'],
    title: 'Drop discontinued products from open orders',
    prompt:
      'Discontinued products can no longer be shipped. Delete their order lines from the orders that have not shipped yet (shipped_date is NULL).',
    orderMatters: false,
    checkSql: `select count(*) as order_lines from order_details`,
    solutions: [
      {
        approach: 'DELETE with a join',
        postgres: `delete from order_details od
using orders o, products p
where o.order_id = od.order_id
  and p.product_id = od.product_id
  and o.shipped_date is null
  and p.discontinued = 1;`,
        mysql: `delete od
from order_details od
join orders o   on o.order_id = od.order_id
join products p on p.product_id = od.product_id
where o.shipped_date is null
  and p.discontinued = 1;`,
        mysqlNote: 'MySQL names the table to delete from right after DELETE, then lists the join in FROM.',
        explanation: 'PostgreSQL adds the other tables with USING; the WHERE joins them and filters. Only rows of order_details are deleted.',
      },
      {
        approach: 'DELETE … WHERE EXISTS',
        postgres: `delete from order_details od
where exists (select 1 from orders o where o.order_id = od.order_id and o.shipped_date is null)
  and exists (select 1 from products p where p.product_id = od.product_id and p.discontinued = 1);`,
        mysql: `delete from order_details od
where exists (select 1 from orders o where o.order_id = od.order_id and o.shipped_date is null)
  and exists (select 1 from products p where p.product_id = od.product_id and p.discontinued = 1);`,
        mysqlNote: 'A table alias in single-table DELETE is allowed since MySQL 8.0.16.',
        explanation: 'The portable form: delete the lines for which a matching open order and a matching discontinued product exist.',
      },
    ],
    comparison: 'Same rows deleted. The join form differs between databases; EXISTS is standard SQL and reads like the rule itself.',
    docs: [
      { label: 'PostgreSQL: DELETE', url: PG + 'sql-delete.html' },
      { label: 'MySQL: DELETE', url: MY + 'delete.html' },
    ],
  },
  {
    id: 'northwind-035',
    dataset: 'northwind',
    level: 4,
    topics: ['dml'],
    title: 'Add a shipper and get its id',
    prompt: 'Add the shipper Speedy Couriers, phone (503) 555-0199, letting the database choose the id, and get that id back in the same step.',
    orderMatters: false,
    checkSql: `select shipper_id, company_name from shippers where company_name = 'Speedy Couriers'`,
    solutions: [
      {
        approach: 'INSERT … RETURNING',
        postgres: `insert into shippers (company_name, phone)
values ('Speedy Couriers', '(503) 555-0199')
returning shipper_id;`,
        mysql: `insert into shippers (company_name, phone)
values ('Speedy Couriers', '(503) 555-0199');

select last_insert_id() as shipper_id;`,
        mysqlNote: 'No RETURNING in MySQL. LAST_INSERT_ID() gives the last AUTO_INCREMENT value generated on this connection.',
        explanation:
          'RETURNING sends back columns of the inserted row, including values the database filled in. No second query, and no risk of reading another session\'s id.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Returning data from modified rows', url: PG + 'dml-returning.html' },
      { label: 'MySQL: LAST_INSERT_ID()', url: MY + 'information-functions.html#function_last-insert-id' },
    ],
  },
  {
    id: 'northwind-036',
    dataset: 'northwind',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Place an order, all or nothing',
    prompt:
      'Customer ALFKI orders 10 of product 1 and 5 of product 2 at today\'s list prices, taken by employee 1 on 1998-05-07. Record order 12000, its two lines and the lower stock as one transaction. In PostgreSQL you are already inside a transaction.',
    orderMatters: true,
    checkSql: `select p.product_id, p.units_in_stock, od.quantity
from products p
join order_details od on od.product_id = p.product_id and od.order_id = 12000
order by p.product_id`,
    solutions: [
      {
        approach: 'Three statements, one transaction',
        postgres: `insert into orders (order_id, customer_id, employee_id, order_date)
values (12000, 'ALFKI', 1, '1998-05-07');

insert into order_details (order_id, product_id, unit_price, quantity, discount)
select 12000, product_id, unit_price, case product_id when 1 then 10 else 5 end, 0
from products where product_id in (1, 2);

update products
set units_in_stock = units_in_stock - case product_id when 1 then 10 else 5 end
where product_id in (1, 2);`,
        mysql: `start transaction;

insert into orders (order_id, customer_id, employee_id, order_date)
values (12000, 'ALFKI', 1, '1998-05-07');

insert into order_details (order_id, product_id, unit_price, quantity, discount)
select 12000, product_id, unit_price, case product_id when 1 then 10 else 5 end, 0
from products where product_id in (1, 2);

update products
set units_in_stock = units_in_stock - case product_id when 1 then 10 else 5 end
where product_id in (1, 2);

commit;`,
        mysqlNote: 'In MySQL every statement commits on its own (autocommit) unless you START TRANSACTION first.',
        explanation:
          'If the stock update failed, an order without a stock change must not remain, and the other way round. A transaction makes the three changes appear together or not at all. The price is copied from products at order time, so later price changes do not rewrite history.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Transactions', url: PG + 'tutorial-transactions.html' },
      { label: 'MySQL: START TRANSACTION', url: MY + 'commit.html' },
    ],
  },
  {
    id: 'northwind-037',
    dataset: 'northwind',
    level: 4,
    topics: ['constraints'],
    title: 'Guard the order lines',
    prompt: 'Add two CHECK constraints to order_details: quantity must be positive, and discount must be between 0 and 1.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'order_details'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'order_details' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD CHECK',
        postgres: `alter table order_details
  add constraint order_details_quantity_check check (quantity > 0),
  add constraint order_details_discount_check check (discount between 0 and 1);`,
        mysql: `alter table order_details
  add constraint order_details_quantity_check check (quantity > 0),
  add constraint order_details_discount_check check (discount between 0 and 1);`,
        explanation:
          'The existing rows are checked first, so success also proves the data is clean. Afterwards a negative quantity or a 150% discount is rejected whatever program writes it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' },
      { label: 'MySQL: CHECK constraints', url: MY + 'create-table-check-constraints.html' },
    ],
  },
  {
    id: 'northwind-038',
    dataset: 'northwind',
    level: 4,
    topics: ['temp-tables'],
    title: 'Monthly revenue as a scratch table',
    prompt: 'Put the revenue of every month (YYYY-MM, rounded to 2 decimals) into a temporary table monthly_revenue (month, revenue).',
    hint: REVENUE_NOTE,
    orderMatters: true,
    checkSql: `select month, revenue from monthly_revenue order by revenue desc limit 3`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table monthly_revenue as
select to_char(o.order_date, 'YYYY-MM') as month,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by month;`,
        mysql: `create temporary table monthly_revenue as
select date_format(o.order_date, '%Y-%m') as month,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by month;`,
        mysqlNote: 'CREATE TEMPORARY TABLE; it cannot be referenced twice in one query (no self-join), unlike a PostgreSQL temp table.',
        explanation:
          'The table disappears when the session ends and nobody else sees it. Good for an analysis in steps: compute once, then query the small result many times.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'northwind-039',
    dataset: 'northwind',
    level: 4,
    topics: ['json', 'text-aggregation'],
    title: 'Order lines as a JSON array',
    prompt:
      'For orders 10248 to 10250, return one row per order with a JSON array of its lines, each an object with product (name), qty and price, in product_id order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'jsonb_agg with ORDER BY',
        postgres: `select od.order_id,
       jsonb_agg(jsonb_build_object('product', p.product_name, 'qty', od.quantity, 'price', od.unit_price)
                 order by od.product_id) as order_lines
from order_details od
join products p on p.product_id = od.product_id
where od.order_id between 10248 and 10250
group by od.order_id
order by od.order_id;`,
        mysql: `select od.order_id,
       cast(concat('[', group_concat(json_object('product', p.product_name, 'qty', od.quantity, 'price', od.unit_price)
                                     order by od.product_id separator ','), ']') as json) as order_lines
from order_details od
join products p on p.product_id = od.product_id
where od.order_id between 10248 and 10250
group by od.order_id
order by od.order_id;`,
        mysqlNote:
          'MySQL has JSON_ARRAYAGG, but it accepts no ORDER BY, so the element order is not guaranteed. GROUP_CONCAT can order, so the array is glued together as text and cast to JSON.',
        explanation: 'jsonb_agg collects one JSON value per row into an array, and its ORDER BY fixes the order of the elements.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON aggregates', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_ARRAYAGG', url: MY + 'aggregate-functions.html#function_json-arrayagg' },
    ],
  },
  {
    id: 'northwind-040',
    dataset: 'northwind',
    level: 4,
    topics: ['materialized-views'],
    title: 'A stored customer summary',
    prompt: 'Store a summary per customer: customer_id, number of orders and revenue (rounded to 2 decimals), so dashboards can read it without recomputing.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    checkSql: `select customer_id, orders, revenue from customer_sales order by revenue desc limit 3`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view customer_sales as
select o.customer_id,
       count(distinct o.order_id) as orders,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by o.customer_id;`,
        mysql: `create table customer_sales as
select o.customer_id,
       count(distinct o.order_id) as orders,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)), 2) as revenue
from orders o
join order_details od on od.order_id = o.order_id
group by o.customer_id;`,
        mysqlNote: 'No materialized views in MySQL: a table built with CREATE TABLE … AS SELECT, reloaded on a schedule, is the usual substitute.',
        explanation:
          'count(distinct o.order_id) because the join repeats each order once per line. The stored result is fast to read and goes stale until REFRESH MATERIALIZED VIEW customer_sales runs.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' },
      { label: 'MySQL: CREATE TABLE … SELECT', url: MY + 'create-table-select.html' },
    ],
  },
  {
    id: 'northwind-041',
    dataset: 'northwind',
    level: 5,
    topics: ['functions'],
    title: 'Revenue of one order',
    prompt: 'Write a function order_total(p_order_id) that returns the order\'s revenue rounded to 2 decimals, or NULL for an unknown order.',
    hint: REVENUE_NOTE,
    orderMatters: false,
    checkSql: `select order_total(10248) as a, order_total(10249) as b, order_total(1) as unknown`,
    solutions: [
      {
        approach: 'SQL function',
        postgres: `create function order_total(p_order_id integer)
returns numeric
language sql
stable
as $$
  select round(sum(unit_price * quantity * (1 - discount)), 2)
  from order_details
  where order_id = p_order_id;
$$;`,
        mysql: `create function order_total(p_order_id int)
returns decimal(12, 2)
reads sql data
begin
  return (
    select round(sum(unit_price * quantity * (1 - discount)), 2)
    from order_details
    where order_id = p_order_id
  );
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation: 'SUM over no rows is NULL, so an unknown order gives NULL without any special case.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SQL functions', url: PG + 'xfunc-sql.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'northwind-042',
    dataset: 'northwind',
    level: 5,
    topics: ['triggers'],
    title: 'Stock goes down with every sale',
    prompt: 'Create a trigger that lowers products.units_in_stock by the quantity of every new order line.',
    orderMatters: false,
    checkSql: `insert into order_details (order_id, product_id, unit_price, quantity, discount) values (10248, 1, 18.00, 3, 0);
select product_id, units_in_stock from products where product_id = 1`,
    solutions: [
      {
        approach: 'AFTER INSERT trigger',
        postgres: `create function take_from_stock() returns trigger
language plpgsql
as $$
begin
  update products set units_in_stock = units_in_stock - new.quantity
  where product_id = new.product_id;
  return new;
end;
$$;

create trigger order_details_take_from_stock
after insert on order_details
for each row execute function take_from_stock();`,
        mysql: `create trigger order_details_take_from_stock
after insert on order_details
for each row
  update products set units_in_stock = units_in_stock - new.quantity
  where product_id = new.product_id;`,
        mysqlNote: 'A single-statement body needs no BEGIN … END (and then no DELIMITER either).',
        explanation:
          'The trigger runs inside the same transaction as the insert: if the insert is rolled back, so is the stock change. Product 1 had 39 units; after selling 3 it has 36.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TRIGGER', url: PG + 'sql-createtrigger.html' },
      { label: 'MySQL: CREATE TRIGGER', url: MY + 'create-trigger.html' },
    ],
  },
  {
    id: 'northwind-043',
    dataset: 'northwind',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Reorder what is running low',
    prompt:
      'Write a procedure reorder_low_stock() that, for every active product (discontinued = 0) whose units_in_stock + units_on_order is below its reorder_level, adds 2 × reorder_level to units_on_order. Process the products one by one in a loop, then call it.',
    orderMatters: false,
    checkSql: `call reorder_low_stock();
select count(*) filter (where units_in_stock + units_on_order < reorder_level) as still_short,
       sum(units_on_order) as on_order
from products where discontinued = 0`,
    checkSqlMysql: `call reorder_low_stock();
select sum(units_in_stock + units_on_order < reorder_level) as still_short,
       sum(units_on_order) as on_order
from products where discontinued = 0`,
    solutions: [
      {
        approach: 'FOR loop / cursor',
        postgres: `create procedure reorder_low_stock()
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select product_id, reorder_level from products
    where discontinued = 0 and units_in_stock + units_on_order < reorder_level
  loop
    update products set units_on_order = units_on_order + 2 * r.reorder_level
    where product_id = r.product_id;
  end loop;
end;
$$;`,
        mysql: `create procedure reorder_low_stock()
begin
  declare done int default 0;
  declare v_id int;
  declare v_level int;
  declare cur cursor for
    select product_id, reorder_level from products
    where discontinued = 0 and units_in_stock + units_on_order < reorder_level;
  declare continue handler for not found set done = 1;

  open cur;
  read_loop: loop
    fetch cur into v_id, v_level;
    if done then leave read_loop; end if;
    update products set units_on_order = units_on_order + 2 * v_level where product_id = v_id;
  end loop;
  close cur;
end;`,
        mysqlNote: `MySQL loops over a query with an explicit cursor; the NOT FOUND handler sets a flag when the rows run out. ${DELIMITER_NOTE}`,
        explanation:
          'PL/pgSQL\'s FOR … IN query LOOP opens, fetches and closes the cursor for you. Here a single UPDATE … WHERE … would do the same job faster; loops earn their place when each row needs different logic, a call to another procedure, or error handling of its own.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Looping through query results', url: PG + 'plpgsql-control-structures.html#PLPGSQL-RECORDS-ITERATING' },
      { label: 'MySQL: Cursors', url: MY + 'cursors.html' },
    ],
  },
  {
    id: 'northwind-044',
    dataset: 'northwind',
    level: 2,
    topics: ['full-join'],
    title: 'Countries of suppliers and customers',
    prompt:
      'List every country that has suppliers, customers or both, with two yes/no columns has_suppliers and has_customers, ordered by country.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN',
        postgres: `select coalesce(s.country, c.country) as country,
       s.country is not null as has_suppliers,
       c.country is not null as has_customers
from (select distinct country from suppliers) s
full join (select distinct country from customers) c on c.country = s.country
order by country;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'FULL JOIN keeps unmatched rows from both sides; whichever side is NULL tells which list the country is missing from.',
      },
      {
        approach: 'UNION of all countries, then look up',
        postgres: `select country,
       exists (select 1 from suppliers s where s.country = a.country) as has_suppliers,
       exists (select 1 from customers c where c.country = a.country) as has_customers
from (select country from suppliers union select country from customers) a
order by country;`,
        mysql: `select country,
       exists (select 1 from suppliers s where s.country = a.country) as has_suppliers,
       exists (select 1 from customers c where c.country = a.country) as has_customers
from (select country from suppliers union select country from customers) a
order by country;`,
        explanation: 'UNION (without ALL) builds the list of all countries once each; two EXISTS checks fill in the flags.',
      },
    ],
    comparison: 'Same rows. 12 countries have both, 4 only suppliers, 9 only customers. The UNION version is the usual portable replacement for FULL JOIN.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: UNION', url: MY + 'union.html' },
    ],
  },
  {
    id: 'northwind-045',
    dataset: 'northwind',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'A procedure to discontinue a product',
    prompt:
      'Write a procedure discontinue_product(p_id) that marks the product discontinued and removes it from orders that have not shipped yet. Then discontinue product 11.',
    orderMatters: false,
    checkSql: `call discontinue_product(11);
select (select discontinued from products where product_id = 11) as discontinued,
       (select count(*) from order_details od join orders o on o.order_id = od.order_id
        where od.product_id = 11 and o.shipped_date is null) as open_lines,
       (select count(*) from order_details where product_id = 11) as all_lines`,
    solutions: [
      {
        approach: 'Two statements in a procedure',
        postgres: `create procedure discontinue_product(p_id integer)
language sql
as $$
  update products set discontinued = 1 where product_id = p_id;
  delete from order_details
  where product_id = p_id
    and order_id in (select order_id from orders where shipped_date is null);
$$;`,
        mysql: `create procedure discontinue_product(p_id int)
begin
  update products set discontinued = 1 where product_id = p_id;
  delete from order_details
  where product_id = p_id
    and order_id in (select order_id from orders where shipped_date is null);
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'A procedure bundles a business rule so every caller applies it the same way. A LANGUAGE sql procedure is just a list of statements; it needs plpgsql only for variables, IF or loops. Shipped orders keep their lines: history is not rewritten.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'northwind-046',
    dataset: 'northwind',
    level: 4,
    topics: ['generated-columns'],
    title: 'Line totals the database maintains',
    prompt: 'Add a stored generated column line_total to order_details: unit_price × quantity × (1 − discount), rounded to 2 decimals.',
    orderMatters: true,
    checkSql: `select order_id, product_id, line_total from order_details where order_id = 10248 order by product_id`,
    solutions: [
      {
        approach: 'GENERATED ALWAYS AS … STORED',
        postgres: `alter table order_details
add column line_total numeric(12, 2)
generated always as (round(unit_price * quantity * (1 - discount), 2)) stored;`,
        mysql: `alter table order_details
add column line_total decimal(12, 2)
generated always as (round(unit_price * quantity * (1 - discount), 2)) stored;`,
        explanation:
          'STORED computes the value on write and keeps it on disk, so reads cost nothing and it can be indexed. MySQL also offers VIRTUAL (computed on read); PostgreSQL 18 added virtual generated columns too, and makes them the default.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'northwind-047',
    dataset: 'northwind',
    level: 5,
    topics: ['full-text'],
    title: 'Who speaks French or German',
    prompt:
      'Using full-text search on employees.notes, find the employees whose notes mention French or German (either word). Show employee_id, first_name and last_name.',
    orderMatters: true,
    checkSql: `select employee_id, first_name, last_name from employees
where to_tsvector('simple', notes) @@ to_tsquery('simple', 'french | german')
order by employee_id`,
    checkSqlMysql: `select employee_id, first_name, last_name from employees
where match(notes) against ('french german' in boolean mode)
order by employee_id`,
    solutions: [
      {
        approach: 'OR in a text query',
        postgres: `create index employees_notes_fts on employees using gin (to_tsvector('simple', notes));

-- search: where to_tsvector('simple', notes) @@ to_tsquery('simple', 'french | german')`,
        mysql: `create fulltext index employees_notes_ft on employees (notes);

-- search: where match(notes) against ('french german' in boolean mode)`,
        mysqlNote:
          'In boolean mode, words without + or - are optional: \'french german\' matches either. Natural-language mode would ignore words found in more than half of the rows, which in a 9-row table hits easily; boolean mode has no such rule.',
        explanation: 'In tsquery the operators are & (and), | (or) and ! (not). MySQL boolean mode marks required words with + and excluded ones with -.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: to_tsquery', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'northwind-048',
    dataset: 'northwind',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for open orders only',
    prompt:
      'The warehouse screen lists orders that have not shipped yet (shipped_date is NULL), by required_date. Create an index that holds only those orders.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'orders' and indexdef like '%required_date%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'orders' and column_name = 'required_date'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index orders_open_idx on orders (required_date)
where shipped_date is null;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; index (shipped_date, required_date) instead (solution B).',
        explanation:
          'Only the 21 open orders out of 830 are in the index, and it stays small as history grows. The query must include "shipped_date is null" for the planner to use it.',
      },
      {
        approach: 'Composite index with the NULL test first',
        postgres: `create index orders_shipped_required_idx on orders (shipped_date, required_date);`,
        mysql: `create index orders_shipped_required_idx on orders (shipped_date, required_date);`,
        explanation: 'B-tree indexes store NULLs too, so "shipped_date is null" is an ordinary range at one end of the index, already sorted by required_date.',
      },
    ],
    comparison: 'Both serve the screen. The partial index is tiny and only for this query; the composite one indexes all 830 rows but works in MySQL.',
    docs: [
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
      { label: 'MySQL: IS NULL optimization', url: MY + 'is-null-optimization.html' },
    ],
  },
  {
    id: 'northwind-049',
    dataset: 'northwind',
    level: 3,
    topics: ['gaps-islands', 'dates-advanced'],
    title: 'Months in a row',
    prompt:
      'For each customer, find the longest run of consecutive calendar months with at least one order. Show the 5 longest runs: customer_id, first month, last month (YYYY-MM) and number of months.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month number minus row number',
        postgres: `with months as (
  select distinct customer_id,
         extract(year from order_date)::int * 12 + extract(month from order_date)::int - 1 as m
  from orders
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
  select distinct customer_id, year(order_date) * 12 + month(order_date) - 1 as m
  from orders
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
        mysqlNote: 'DIV for integer division, concat() instead of ||.',
        explanation:
          'Number every month with one integer, year × 12 + (month − 1), so consecutive months differ by exactly 1, also from December to January. Within a run the month number minus the row number stays constant; that constant groups the run. Dividing by 12 and taking the remainder + 1 turns the numbers back into year and month.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'northwind-050',
    dataset: 'northwind',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Lock in a fixed order',
    prompt:
      'Move 5 units of stock from product 2 to product 1. Two such transfers running in opposite directions at the same time could deadlock. Lock both rows in a fixed order first, then update. In PostgreSQL you are already inside a transaction.',
    orderMatters: true,
    checkSql: `select product_id, units_in_stock from products where product_id in (1, 2) order by product_id`,
    solutions: [
      {
        approach: 'FOR UPDATE … ORDER BY',
        postgres: `select product_id from products where product_id in (1, 2) order by product_id for update;

update products set units_in_stock = units_in_stock - 5 where product_id = 2;
update products set units_in_stock = units_in_stock + 5 where product_id = 1;`,
        mysql: `start transaction;

select product_id from products where product_id in (1, 2) order by product_id for update;

update products set units_in_stock = units_in_stock - 5 where product_id = 2;
update products set units_in_stock = units_in_stock + 5 where product_id = 1;

commit;`,
        explanation:
          'A deadlock needs two transactions each holding a lock the other wants: A locks 2 then waits for 1, while B locks 1 then waits for 2. If every transfer locks the lower id first, whatever its direction, the second one simply waits for the first instead. The database would detect a deadlock and abort one transaction, but avoiding it is cheaper.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Deadlocks', url: PG + 'explicit-locking.html#LOCKING-DEADLOCKS' },
      { label: 'MySQL: How to minimize and handle deadlocks', url: MY + 'innodb-deadlocks-handling.html' },
    ],
  },
  {
    id: 'northwind-051',
    dataset: 'northwind',
    level: 4,
    topics: ['merge'],
    title: 'Import a supplier price list',
    prompt:
      'A price list arrives as product_prices (product_name, unit_price): Chai 19.00, Chang 19.00, Kvass 12.50. Apply it in one statement: update the price of products that exist, and add products that do not (discontinued = 0).',
    orderMatters: true,
    checkSql: `select product_name, unit_price, discontinued from products where product_name in ('Chai', 'Chang', 'Kvass') order by product_name`,
    solutions: [
      {
        approach: 'MERGE',
        postgres: `create table product_prices (product_name varchar(40) primary key, unit_price numeric(10, 2) not null);
insert into product_prices values ('Chai', 19.00), ('Chang', 19.00), ('Kvass', 12.50);

merge into products p
using product_prices n on n.product_name = p.product_name
when matched and p.unit_price <> n.unit_price then
  update set unit_price = n.unit_price
when not matched then
  insert (product_name, unit_price, discontinued) values (n.product_name, n.unit_price, 0);`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B. ON DUPLICATE KEY would need a unique key on product_name, which products does not have.',
        explanation:
          'MERGE matches on any condition, not just a unique key: here the product name. Chai changes from 18.00, Chang stays, Kvass is inserted with an id from the identity column.',
      },
      {
        approach: 'UPDATE with a join, then INSERT … WHERE NOT EXISTS',
        postgres: `create table product_prices (product_name varchar(40) primary key, unit_price numeric(10, 2) not null);
insert into product_prices values ('Chai', 19.00), ('Chang', 19.00), ('Kvass', 12.50);

update products p set unit_price = n.unit_price
from product_prices n
where n.product_name = p.product_name and p.unit_price <> n.unit_price;

insert into products (product_name, unit_price, discontinued)
select n.product_name, n.unit_price, 0 from product_prices n
where not exists (select 1 from products p where p.product_name = n.product_name);`,
        mysql: `create table product_prices (product_name varchar(40) primary key, unit_price decimal(10, 2) not null);
insert into product_prices values ('Chai', 19.00), ('Chang', 19.00), ('Kvass', 12.50);

update products p join product_prices n on n.product_name = p.product_name
set p.unit_price = n.unit_price
where p.unit_price <> n.unit_price;

insert into products (product_name, unit_price, discontinued)
select n.product_name, n.unit_price, 0 from product_prices n
where not exists (select 1 from products p where p.product_name = n.product_name);`,
        explanation: 'The two halves of the merge as separate statements; run them in one transaction so nobody sees a half-applied list.',
      },
    ],
    comparison: 'Same result. MERGE does it atomically in one statement; the two-statement version works in MySQL and needs no unique key either.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: INSERT … SELECT', url: MY + 'insert-select.html' },
    ],
  },
]
