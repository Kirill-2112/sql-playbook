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
  {
    id: 'northwind-052',
    dataset: 'northwind',
    level: 4,
    topics: ['upsert'],
    title: 'Import customers from a CRM',
    prompt:
      'The CRM sends customers: ALFKI with a new phone 030-0074322, and NEWCO "New Company" in Oslo, Norway. Insert new customers and update the phone of existing ones in one statement.',
    orderMatters: true,
    checkSql: `select customer_id, company_name, city, phone from customers where customer_id in ('ALFKI', 'NEWCO') order by customer_id`,
    solutions: [
      {
        approach: 'ON CONFLICT … DO UPDATE',
        postgres: `insert into customers (customer_id, company_name, city, country, phone)
values ('ALFKI', 'Alfreds Futterkiste', 'Berlin', 'Germany', '030-0074322'),
       ('NEWCO', 'New Company', 'Oslo', 'Norway', null)
on conflict (customer_id) do update set phone = excluded.phone;`,
        mysql: `insert into customers (customer_id, company_name, city, country, phone)
values ('ALFKI', 'Alfreds Futterkiste', 'Berlin', 'Germany', '030-0074322'),
       ('NEWCO', 'New Company', 'Oslo', 'Norway', null) as new
on duplicate key update phone = new.phone;`,
        explanation: 'Only the listed column changes for existing customers; the rest of ALFKI\'s row stays. For NEWCO the whole row is inserted.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'northwind-053',
    dataset: 'northwind',
    level: 3,
    topics: ['date-series', 'dates-advanced'],
    title: 'Orders week by week',
    prompt: 'For the first 10 weeks of 1997 (weeks starting on Monday 1996-12-30), show each week\'s start date and its number of orders.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series with a 7-day step',
        postgres: `select w::date as week_start, count(o.order_id) as orders
from generate_series(date '1996-12-30', date '1996-12-30' + 63, interval '7 days') as w
left join orders o on o.order_date >= w and o.order_date < w + interval '7 days'
group by w
order by w;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'The step can be any interval: 7 days gives weeks. 63 days after the first Monday is the start of week 10.',
      },
      {
        approach: 'Recursive CTE of week starts',
        postgres: `with recursive weeks as (
  select date '1996-12-30' as w, 1 as n
  union all
  select (w + 7)::date, n + 1 from weeks where n < 10
)
select w as week_start, count(o.order_id) as orders
from weeks
left join orders o on o.order_date >= w and o.order_date < w + 7
group by w
order by w;`,
        mysql: `with recursive weeks as (
  select date('1996-12-30') as w, 1 as n
  union all
  select w + interval 7 day, n + 1 from weeks where n < 10
)
select w as week_start, count(o.order_id) as orders
from weeks
left join orders o on o.order_date >= w and o.order_date < w + interval 7 day
group by w
order by w;`,
        explanation: 'A counter n stops the recursion after 10 weeks.',
      },
    ],
    comparison: 'Same 10 rows. Counting weeks from a fixed Monday avoids the ISO-week edge cases around New Year.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'northwind-054',
    dataset: 'northwind',
    level: 5,
    topics: ['full-text'],
    title: 'Products that are sauces',
    prompt: 'Make product names searchable by word and find the products with the word "sauce" in their name: product_id and product_name.',
    orderMatters: true,
    checkSql: `select product_id, product_name from products
where to_tsvector('simple', product_name) @@ to_tsquery('simple', 'sauce')
order by product_id`,
    checkSqlMysql: `select product_id, product_name from products
where match(product_name) against ('+sauce' in boolean mode)
order by product_id`,
    solutions: [
      {
        approach: 'Full-text index',
        postgres: `create index products_name_fts on products using gin (to_tsvector('simple', product_name));`,
        mysql: `create fulltext index products_name_ft on products (product_name);`,
        explanation: 'Two products match. With the \'english\' configuration "sauces" would match too, because both reduce to the stem "sauc".',
      },
    ],
    docs: [{ label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'northwind-055',
    dataset: 'northwind',
    level: 5,
    topics: ['partitioning'],
    title: 'Orders by year',
    prompt:
      'Create orders_by_year (order_id, customer_id, order_date, freight) partitioned by order_date into 1996, 1997 and 1998, and copy the orders into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'orders_by_year'::regclass) as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where order_date >= '1997-01-01' and order_date < '1998-01-01') as y1997`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'orders_by_year') as partitions,
       (select count(*) from orders_by_year) as total_rows,
       (select count(*) from orders_by_year where order_date >= '1997-01-01' and order_date < '1998-01-01') as y1997`,
    solutions: [
      {
        approach: 'Yearly partitions',
        postgres: `create table orders_by_year (
  order_id    integer       not null,
  customer_id varchar(5),
  order_date  timestamp     not null,
  freight     numeric(10, 2),
  primary key (order_id, order_date)
) partition by range (order_date);

create table orders_1996 partition of orders_by_year for values from ('1996-01-01') to ('1997-01-01');
create table orders_1997 partition of orders_by_year for values from ('1997-01-01') to ('1998-01-01');
create table orders_1998 partition of orders_by_year for values from ('1998-01-01') to ('1999-01-01');

insert into orders_by_year select order_id, customer_id, order_date, freight from orders;`,
        mysql: `create table orders_by_year (
  order_id    int            not null,
  customer_id varchar(5),
  order_date  datetime       not null,
  freight     decimal(10, 2),
  primary key (order_id, order_date)
)
partition by range columns (order_date) (
  partition p1996 values less than ('1997-01-01'),
  partition p1997 values less than ('1998-01-01'),
  partition p1998 values less than ('1999-01-01')
);

insert into orders_by_year select order_id, customer_id, order_date, freight from orders;`,
        explanation:
          'order_date must be NOT NULL here: a NULL could not be placed in any range partition (PostgreSQL would need a DEFAULT partition). For 830 rows partitioning is pure practice; it starts to pay off with millions.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' }],
  },
  {
    id: 'northwind-056',
    dataset: 'northwind',
    level: 4,
    topics: ['ddl'],
    title: 'Reshape the shippers table',
    prompt:
      'In shippers: rename phone to phone_number, widen company_name to 80 characters, and add a column active (boolean / 0-1, default true) for every shipper.',
    orderMatters: true,
    checkSql: `select shipper_id, company_name, phone_number, active from shippers order by shipper_id`,
    solutions: [
      {
        approach: 'ALTER TABLE, step by step',
        postgres: `alter table shippers rename column phone to phone_number;
alter table shippers alter column company_name type varchar(80);
alter table shippers add column active boolean not null default true;`,
        mysql: `alter table shippers rename column phone to phone_number;
alter table shippers modify company_name varchar(80) not null;
alter table shippers add column active tinyint(1) not null default 1;`,
        mysqlNote:
          'MODIFY restates the whole column definition, so repeat NOT NULL or it is lost. MySQL has no real boolean: BOOLEAN is TINYINT(1), and true is 1.',
        explanation: 'Renaming keeps the data; widening a varchar is a metadata change in both databases; the default fills the new column for existing rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ALTER TABLE', url: PG + 'sql-altertable.html' },
      { label: 'MySQL: ALTER TABLE', url: MY + 'alter-table.html' },
    ],
  },
  {
    id: 'northwind-057',
    dataset: 'northwind',
    level: 4,
    topics: ['temp-tables', 'joins'],
    title: 'A reorder list to work through',
    prompt:
      'Build a temporary table to_reorder (product_id, product_name, supplier, short_by) of active products whose stock plus units on order is below the reorder level, with how many units they are short.',
    orderMatters: true,
    checkSql: `select product_id, product_name, supplier, short_by from to_reorder order by short_by desc, product_id`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table to_reorder as
select p.product_id, p.product_name, s.company_name as supplier,
       p.reorder_level - p.units_in_stock - p.units_on_order as short_by
from products p
join suppliers s on s.supplier_id = p.supplier_id
where p.discontinued = 0 and p.units_in_stock + p.units_on_order < p.reorder_level;`,
        mysql: `create temporary table to_reorder as
select p.product_id, p.product_name, s.company_name as supplier,
       p.reorder_level - p.units_in_stock - p.units_on_order as short_by
from products p
join suppliers s on s.supplier_id = p.supplier_id
where p.discontinued = 0 and p.units_in_stock + p.units_on_order < p.reorder_level;`,
        explanation: 'A snapshot the buyer can work through and update (say, mark rows as ordered) without changing the real tables.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'northwind-058',
    dataset: 'northwind',
    level: 4,
    topics: ['normalization', 'subqueries'],
    title: 'Territories nobody covers',
    prompt:
      'employee_territories links employees and territories (many-to-many). Which territories have no employee assigned? Show territory_id and territory_description.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NOT EXISTS on the junction table',
        postgres: `select t.territory_id, t.territory_description
from territories t
where not exists (select 1 from employee_territories et where et.territory_id = t.territory_id)
order by t.territory_id;`,
        mysql: `select t.territory_id, t.territory_description
from territories t
where not exists (select 1 from employee_territories et where et.territory_id = t.territory_id)
order by t.territory_id;`,
        explanation:
          'A many-to-many relationship needs a junction table with one row per pair; its primary key (employee_id, territory_id) stops a pair being stored twice. Putting a list of territories into the employees table instead would break first normal form.',
      },
    ],
    docs: [{ label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' }],
  },
  {
    id: 'northwind-059',
    dataset: 'northwind',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'Orders of 1997, with and without the index',
    prompt: 'Count the orders of 1997. order_date has an index: compare a range condition with extract(year …).',
    orderMatters: false,
    solutions: [
      {
        approach: 'Range on order_date',
        postgres: `select count(*) as orders
from orders
where order_date >= '1997-01-01' and order_date < '1998-01-01';`,
        mysql: `select count(*) as orders
from orders
where order_date >= '1997-01-01' and order_date < '1998-01-01';`,
        explanation: 'The index on order_date can answer the range directly.',
      },
      {
        approach: 'Function on the column',
        postgres: `select count(*) as orders
from orders
where extract(year from order_date) = 1997;`,
        mysql: `select count(*) as orders
from orders
where year(order_date) = 1997;`,
        explanation: 'Correct, but the index is on order_date, not on its year, so every row is read and the function applied to each.',
      },
    ],
    comparison:
      'Same count. With only 830 orders the planner may read the whole table even for the range (it is just a few pages), so check the "uses index" column rather than expecting a big time difference; on a large table the range form wins clearly.',
    docs: [{ label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' }],
  },
  {
    id: 'northwind-060',
    dataset: 'northwind',
    level: 1,
    topics: ['distinct', 'aggregates'],
    title: 'Countries shipped to each year',
    prompt: 'For each year, how many different countries received orders?',
    orderMatters: true,
    solutions: [
      {
        approach: 'count(DISTINCT) per group',
        postgres: `select extract(year from order_date)::int as year, count(distinct ship_country) as countries
from orders
group by year
order by year;`,
        mysql: `select year(order_date) as year, count(distinct ship_country) as countries
from orders
group by year
order by year;`,
        explanation: 'count(distinct …) counts each country once per year however many orders went there.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'northwind-061',
    dataset: 'northwind',
    level: 2,
    topics: ['casting', 'text-search'],
    title: 'Postal codes are not numbers',
    prompt: 'How many customer postal codes start with 0, and how many contain something other than digits?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Pattern tests on the text',
        postgres: `select count(*) filter (where postal_code like '0%') as leading_zero,
       count(*) filter (where postal_code !~ '^[0-9]+$') as not_only_digits
from customers
where postal_code is not null;`,
        mysql: `select sum(postal_code like '0%') as leading_zero,
       sum(postal_code not regexp '^[0-9]+$') as not_only_digits
from customers
where postal_code is not null;`,
        explanation:
          'Casting to an integer would turn "01307" into 1307 and fail (or, in MySQL, silently stop at the dash) on codes like "02389-673" or "WX1 6LT". Codes, phone numbers and ids that are never added up belong in text columns.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Pattern matching', url: PG + 'functions-matching.html' }],
  },
  {
    id: 'northwind-062',
    dataset: 'northwind',
    level: 4,
    topics: ['merge'],
    title: 'Sync supplier contacts',
    prompt:
      'A contacts file supplier_contacts (supplier_id, contact_name) has new names for suppliers 1 and 2 and an unknown supplier 99. Update only names that differ; ignore unknown suppliers.',
    orderMatters: true,
    checkSql: `select supplier_id, contact_name from suppliers where supplier_id in (1, 2) order by supplier_id`,
    solutions: [
      {
        approach: 'MERGE with WHEN MATCHED AND',
        postgres: `create table supplier_contacts (supplier_id integer primary key, contact_name varchar(30) not null);
insert into supplier_contacts values (1, 'Charlotte Cooper'), (2, 'Ann Devon'), (99, 'Nobody');

merge into suppliers s
using supplier_contacts c on c.supplier_id = s.supplier_id
when matched and s.contact_name is distinct from c.contact_name then
  update set contact_name = c.contact_name;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'IS DISTINCT FROM also treats a NULL contact as different, where <> would quietly skip it. Supplier 1 keeps its name (unchanged), 2 is updated, 99 is ignored.',
      },
      {
        approach: 'UPDATE with a join',
        postgres: `create table supplier_contacts (supplier_id integer primary key, contact_name varchar(30) not null);
insert into supplier_contacts values (1, 'Charlotte Cooper'), (2, 'Ann Devon'), (99, 'Nobody');

update suppliers s set contact_name = c.contact_name
from supplier_contacts c
where c.supplier_id = s.supplier_id and s.contact_name is distinct from c.contact_name;`,
        mysql: `create table supplier_contacts (supplier_id int primary key, contact_name varchar(30) not null);
insert into supplier_contacts values (1, 'Charlotte Cooper'), (2, 'Ann Devon'), (99, 'Nobody');

update suppliers s join supplier_contacts c on c.supplier_id = s.supplier_id
set s.contact_name = c.contact_name
where not (s.contact_name <=> c.contact_name);`,
        mysqlNote: '<=> is MySQL\'s NULL-safe equality.',
        explanation: 'The joined UPDATE does the same; the NULL-safe comparison is the important detail.',
      },
    ],
    comparison: 'Same result. For updates only, both are fine; use the NULL-safe comparison in either.',
    docs: [{ label: 'PostgreSQL: IS DISTINCT FROM', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'northwind-063',
    dataset: 'northwind',
    level: 4,
    topics: ['upsert'],
    title: 'Categories by id, insert or rename',
    prompt: 'Apply category changes in one statement: category 8 is renamed "Seafood & Fish", and category 9 "Bakery" is new.',
    orderMatters: true,
    checkSql: `select category_id, category_name from categories where category_id in (8, 9) order by category_id`,
    solutions: [
      {
        approach: 'Upsert on the primary key',
        postgres: `insert into categories (category_id, category_name) values (8, 'Seafood & Fish'), (9, 'Bakery')
on conflict (category_id) do update set category_name = excluded.category_name;`,
        mysql: `insert into categories (category_id, category_name) values (8, 'Seafood & Fish'), (9, 'Bakery') as new
on duplicate key update category_name = new.category_name;`,
        explanation:
          'category_id is an identity column, but explicit ids can still be inserted (GENERATED BY DEFAULT). The identity sequence does not know about id 9, so a later insert without an id could collide; in real code, let the database pick ids or reset the sequence with setval.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Identity columns', url: PG + 'ddl-identity-columns.html' }],
  },
  {
    id: 'northwind-064',
    dataset: 'northwind',
    level: 3,
    topics: ['pivot'],
    title: 'Category sales by quarter of 1997',
    prompt: 'Show 1997 revenue (rounded to 0 decimals) per category as rows and the four quarters as columns.',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional sums by quarter',
        postgres: `select c.category_name,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)) filter (where extract(quarter from o.order_date) = 1)) as q1,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)) filter (where extract(quarter from o.order_date) = 2)) as q2,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)) filter (where extract(quarter from o.order_date) = 3)) as q3,
       round(sum(od.unit_price * od.quantity * (1 - od.discount)) filter (where extract(quarter from o.order_date) = 4)) as q4
from order_details od
join orders o     on o.order_id = od.order_id
join products p   on p.product_id = od.product_id
join categories c on c.category_id = p.category_id
where o.order_date >= '1997-01-01' and o.order_date < '1998-01-01'
group by c.category_id, c.category_name
order by c.category_id;`,
        mysql: `select c.category_name,
       round(sum(case when quarter(o.order_date) = 1 then od.unit_price * od.quantity * (1 - od.discount) end)) as q1,
       round(sum(case when quarter(o.order_date) = 2 then od.unit_price * od.quantity * (1 - od.discount) end)) as q2,
       round(sum(case when quarter(o.order_date) = 3 then od.unit_price * od.quantity * (1 - od.discount) end)) as q3,
       round(sum(case when quarter(o.order_date) = 4 then od.unit_price * od.quantity * (1 - od.discount) end)) as q4
from order_details od
join orders o     on o.order_id = od.order_id
join products p   on p.product_id = od.product_id
join categories c on c.category_id = p.category_id
where o.order_date >= '1997-01-01' and o.order_date < '1998-01-01'
group by c.category_id, c.category_name
order by c.category_id;`,
        explanation: 'One conditional sum per quarter; the year filter in WHERE keeps the work to 1997.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'northwind-065',
    dataset: 'northwind',
    level: 4,
    topics: ['views', 'dates-basics'],
    title: 'A view of late shipments',
    prompt: 'Create a view late_orders (order_id, customer_id, required_date, shipped_date, days_late) of orders shipped after their required date.',
    orderMatters: true,
    checkSql: `select order_id, customer_id, days_late from late_orders order by days_late desc, order_id limit 5`,
    solutions: [
      {
        approach: 'View with a date difference',
        postgres: `create view late_orders as
select order_id, customer_id, required_date, shipped_date,
       shipped_date::date - required_date::date as days_late
from orders
where shipped_date > required_date;`,
        mysql: `create view late_orders as
select order_id, customer_id, required_date, shipped_date,
       datediff(shipped_date, required_date) as days_late
from orders
where shipped_date > required_date;`,
        explanation: 'Unshipped orders (NULL shipped_date) fail the comparison and stay out. The columns are timestamps, so they are cast to date before subtracting to get whole days.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'northwind-066',
    dataset: 'northwind',
    level: 3,
    topics: ['lateral'],
    title: 'Top 3 products per category',
    prompt: 'For every category, show its three most expensive products: category_name, product_name and unit_price. Ties by product_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 3',
        postgres: `select c.category_name, p.product_name, p.unit_price
from categories c
cross join lateral (
  select product_name, unit_price, product_id from products
  where category_id = c.category_id
  order by unit_price desc, product_id
  limit 3
) p
order by c.category_id, p.unit_price desc, p.product_id;`,
        mysql: `select c.category_name, p.product_name, p.unit_price
from categories c
cross join lateral (
  select product_name, unit_price, product_id from products
  where category_id = c.category_id
  order by unit_price desc, product_id
  limit 3
) p
order by c.category_id, p.unit_price desc, p.product_id;`,
        explanation: 'For each category the inner query sorts its products and keeps three, with access to c.category_id.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'northwind-067',
    dataset: 'northwind',
    level: 4,
    topics: ['materialized-views'],
    title: 'Product sales, stored',
    prompt: 'Store per product: units sold and revenue (rounded to 2 decimals), for a buyer\'s report refreshed nightly.',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    checkSql: `select product_id, units, revenue from product_sales order by revenue desc, product_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view product_sales as
select product_id, sum(quantity) as units, round(sum(unit_price * quantity * (1 - discount)), 2) as revenue
from order_details
group by product_id;`,
        mysql: `create table product_sales as
select product_id, sum(quantity) as units, round(sum(unit_price * quantity * (1 - discount)), 2) as revenue
from order_details
group by product_id;`,
        mysqlNote: 'A table rebuilt nightly replaces the materialized view.',
        explanation: '77 stored rows; the nightly REFRESH MATERIALIZED VIEW product_sales brings in the day\'s orders.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'northwind-068',
    dataset: 'northwind',
    level: 3,
    topics: ['subtotals'],
    title: 'Customers by country and city, with totals',
    prompt: 'Count customers by country and city, with a subtotal per country and a grand total (labels "All cities", "All countries"). Only countries starting with A to F.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(country, 'All countries') as country, coalesce(city, 'All cities') as city, count(*) as customers
from customers
where country < 'G'
group by rollup (country, city)
order by grouping(country), country, grouping(city), city collate "C";`,
        mysql: `select coalesce(country, 'All countries') as country, coalesce(city, 'All cities') as city, count(*) as customers
from customers
where country < 'G'
group by country, city with rollup
order by grouping(country), country, grouping(city), city collate utf8mb4_bin;`,
        mysqlNote: 'utf8mb4_bin sorts by bytes like PostgreSQL\'s "C"; with the default accent-insensitive collation Århus would sort before Kobenhavn.',
        explanation: 'country < \'G\' keeps Argentina to France. ROLLUP adds one subtotal per country and the grand total, GROUPING() puts them after their details. The cities are sorted byte-wise in both databases, so "Kobenhavn" comes before "Århus".',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'northwind-069',
    dataset: 'northwind',
    level: 1,
    topics: ['conditions', 'dates-basics'],
    title: 'How fast did it ship',
    prompt: 'Count orders by shipping speed: "same week" within 7 days of ordering, "slow" after more than 7, "not shipped" if shipped_date is NULL.',
    orderMatters: false,
    solutions: [
      {
        approach: 'CASE with a NULL check first',
        postgres: `select case when shipped_date is null then 'not shipped'
            when shipped_date <= order_date + interval '7 days' then 'same week'
            else 'slow' end as speed,
       count(*) as orders
from orders
group by speed;`,
        mysql: `select case when shipped_date is null then 'not shipped'
            when shipped_date <= order_date + interval 7 day then 'same week'
            else 'slow' end as speed,
       count(*) as orders
from orders
group by speed;`,
        explanation: 'The NULL test comes first: a comparison with NULL is neither true nor false, so without it unshipped orders would fall into ELSE and be counted as "slow".',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'northwind-070',
    dataset: 'northwind',
    level: 1,
    topics: ['select-basics'],
    title: 'Out of stock',
    prompt: 'List the products with no units in stock: product_id, product_name, units_on_order and whether they are discontinued.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Equality filter',
        postgres: `select product_id, product_name, units_on_order, discontinued
from products
where units_in_stock = 0
order by product_id;`,
        mysql: `select product_id, product_name, units_on_order, discontinued
from products
where units_in_stock = 0
order by product_id;`,
        explanation: 'Discontinued products with no stock are fine; active ones with nothing on order need a buyer\'s attention.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'northwind-071',
    dataset: 'northwind',
    level: 4,
    topics: ['arrays', 'self-cross-join'],
    title: 'Orders with products in common',
    prompt: 'For orders 10248 to 10260, find the pairs of different orders that share at least one product: both order ids and the shared product ids as an array.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Product arrays and the overlap operator',
        postgres: `with prods as (
  select order_id, array_agg(product_id order by product_id) as products
  from order_details
  where order_id between 10248 and 10260
  group by order_id
)
select a.order_id as order_1, b.order_id as order_2,
       array(select unnest(a.products) intersect select unnest(b.products) order by 1) as shared
from prods a
join prods b on b.order_id > a.order_id and a.products && b.products
order by order_1, order_2;`,
        mysql: null,
        mysqlNote: 'MySQL has no arrays; see solution B.',
        explanation: '&& means "the arrays have at least one element in common"; the shared elements come from INTERSECT over the two unnested arrays.',
      },
      {
        approach: 'Self join on order lines',
        postgres: `select a.order_id as order_1, b.order_id as order_2,
       array_agg(a.product_id order by a.product_id) as shared
from order_details a
join order_details b on b.product_id = a.product_id and b.order_id > a.order_id
where a.order_id between 10248 and 10260 and b.order_id between 10248 and 10260
group by a.order_id, b.order_id
order by order_1, order_2;`,
        mysql: `select a.order_id as order_1, b.order_id as order_2,
       cast(concat('[', group_concat(a.product_id order by a.product_id), ']') as json) as shared
from order_details a
join order_details b on b.product_id = a.product_id and b.order_id > a.order_id
where a.order_id between 10248 and 10260 and b.order_id between 10248 and 10260
group by a.order_id, b.order_id
order by order_1, order_2;`,
        explanation: 'Joining order lines on the product gives one row per shared product; grouping by the order pair collects them.',
      },
    ],
    comparison: 'Same pairs. The array version reads like the question; the self join is the relational way and works in MySQL with a JSON array.',
    docs: [{ label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' }],
  },
  {
    id: 'northwind-072',
    dataset: 'northwind',
    level: 5,
    topics: ['full-text'],
    title: 'Categories about bread',
    prompt: 'Make category descriptions searchable by word and find the categories whose description contains "breads": category_id and category_name.',
    orderMatters: true,
    checkSql: `select category_id, category_name from categories
where to_tsvector('simple', description) @@ to_tsquery('simple', 'breads')
order by category_id`,
    checkSqlMysql: `select category_id, category_name from categories
where match(description) against ('+breads' in boolean mode)
order by category_id`,
    solutions: [
      {
        approach: 'Full-text index on a text column',
        postgres: `create index categories_description_fts on categories using gin (to_tsvector('simple', description));`,
        mysql: `create fulltext index categories_description_ft on categories (description);`,
        explanation: 'Two categories mention "breads" ("sweet breads" and "Breads, crackers"). With \'english\', "bread" would find them too, since both reduce to the stem "bread".',
      },
    ],
    docs: [{ label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'northwind-073',
    dataset: 'northwind',
    level: 5,
    topics: ['query-plans', 'subqueries'],
    title: 'NOT IN and its NULL trap',
    prompt: 'Which customers have never placed an order? Count them in two ways and compare.',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as no_orders
from customers c
where not exists (select 1 from orders o where o.customer_id = c.customer_id);`,
        mysql: `select count(*) as no_orders
from customers c
where not exists (select 1 from orders o where o.customer_id = c.customer_id);`,
        explanation: 'Planned as an anti-join, and correct whatever NULLs orders.customer_id might contain.',
      },
      {
        approach: 'NOT IN with the NULLs filtered out',
        postgres: `select count(*) as no_orders
from customers
where customer_id not in (select customer_id from orders where customer_id is not null);`,
        mysql: `select count(*) as no_orders
from customers
where customer_id not in (select customer_id from orders where customer_id is not null);`,
        explanation:
          'orders.customer_id is nullable in Northwind. If a single order had a NULL customer, "x NOT IN (…, NULL)" could never be true and the count would drop to 0; the IS NOT NULL filter makes NOT IN safe.',
      },
    ],
    comparison: 'Same count (2). NOT EXISTS needs no special care and plans as an anti-join; NOT IN is correct only with the NULL filter.',
    docs: [{ label: 'PostgreSQL: NOT IN', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN' }],
  },
  {
    id: 'northwind-074',
    dataset: 'northwind',
    level: 3,
    topics: ['cte', 'query-plans'],
    title: 'A CTE used twice',
    prompt:
      'Using one CTE of revenue per customer, show the customers whose revenue is more than twice the average customer revenue: customer_id and revenue (rounded to 2 decimals).',
    hint: 'Revenue of an order line is unit_price × quantity × (1 − discount).',
    orderMatters: true,
    solutions: [
      {
        approach: 'CTE referenced twice',
        postgres: `with revenue as (
  select o.customer_id, sum(od.unit_price * od.quantity * (1 - od.discount)) as total
  from orders o join order_details od on od.order_id = o.order_id
  group by o.customer_id
)
select customer_id, round(total, 2) as revenue
from revenue
where total > 2 * (select avg(total) from revenue)
order by total desc;`,
        mysql: `with revenue as (
  select o.customer_id, sum(od.unit_price * od.quantity * (1 - od.discount)) as total
  from orders o join order_details od on od.order_id = o.order_id
  group by o.customer_id
)
select customer_id, round(total, 2) as revenue
from revenue
where total > 2 * (select avg(total) from revenue)
order by total desc;`,
        explanation:
          'A CTE referenced more than once is computed once and reused (PostgreSQL "materializes" it). A CTE used once is inlined into the query like a subquery; WITH … AS MATERIALIZED / NOT MATERIALIZED overrides that choice.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CTE materialization', url: PG + 'queries-with.html#QUERIES-WITH-CTE-MATERIALIZATION' }],
  },
  {
    id: 'northwind-075',
    dataset: 'northwind',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'What happens on delete',
    prompt:
      'Add a column preferred_shipper_id to customers referencing shippers, so that deleting a shipper sets it to NULL rather than failing. Set ALFKI\'s preferred shipper to 3, then delete shipper 3.',
    orderMatters: false,
    checkSql: `delete from order_details where order_id in (select order_id from orders where ship_via = 3);
delete from orders where ship_via = 3;
delete from shippers where shipper_id = 3;
select customer_id, preferred_shipper_id from customers where customer_id = 'ALFKI'`,
    solutions: [
      {
        approach: 'Foreign key with ON DELETE SET NULL',
        postgres: `alter table customers add column preferred_shipper_id integer
  references shippers (shipper_id) on delete set null;

update customers set preferred_shipper_id = 3 where customer_id = 'ALFKI';`,
        mysql: `alter table customers add column preferred_shipper_id int,
  add foreign key (preferred_shipper_id) references shippers (shipper_id) on delete set null;

update customers set preferred_shipper_id = 3 where customer_id = 'ALFKI';`,
        mysqlNote: 'The FK column type must match shippers.shipper_id exactly.',
        explanation:
          'The default action, NO ACTION, refuses to delete a shipper still referenced. SET NULL clears the reference instead, CASCADE would delete the referencing rows. (The check first removes shipper 3\'s orders and their lines, whose own foreign keys would otherwise block the delete.)',
      },
    ],
    docs: [{ label: 'PostgreSQL: Foreign keys (ON DELETE)', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-FK' }],
  },
  {
    id: 'northwind-076',
    dataset: 'northwind',
    level: 5,
    topics: ['generated-columns', 'partial-covering-indexes'],
    title: 'Days late, and an index for late orders',
    prompt:
      'Add a stored generated column days_late to orders: shipped_date minus required_date in whole days (NULL while not shipped). Then index days_late for the late orders only (days_late > 0).',
    orderMatters: false,
    checkSql: `select count(*) as late_orders, sum(days_late) as total_days_late, max(days_late) as worst from orders where days_late > 0`,
    solutions: [
      {
        approach: 'Generated column plus a partial index',
        postgres: `alter table orders
add column days_late integer
generated always as (shipped_date::date - required_date::date) stored;

create index orders_late_idx on orders (days_late) where days_late > 0;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation:
          'Casting a timestamp (without time zone) to date is immutable, so it is allowed in a generated column; subtracting two dates gives whole days. The partial index holds only the 37 late orders, not all 830.',
      },
      {
        approach: 'Generated column plus an ordinary index',
        postgres: `alter table orders
add column days_late integer
generated always as (shipped_date::date - required_date::date) stored;

create index orders_days_late_idx on orders (days_late);`,
        mysql: `alter table orders
add column days_late int
generated always as (datediff(shipped_date, required_date)) stored;

create index orders_days_late_idx on orders (days_late);`,
        mysqlNote: 'DATEDIFF ignores the time part and is deterministic, so MySQL accepts it in a generated column.',
        explanation: 'A full index on days_late also serves "days_late > 0" as a range scan; it just carries every order, including the NULLs of unshipped ones.',
      },
    ],
    comparison: 'Same column, same answers (37 late orders, 236 days in total, 23 at worst). The partial index is smaller; the ordinary one works in both databases.',
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
    ],
  },
  {
    id: 'northwind-077',
    dataset: 'northwind',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'A procedure that ships an order',
    prompt:
      'Write a procedure ship_order(p_order_id, p_date) that sets shipped_date, but raises an error if the order does not exist, is already shipped, or p_date is before the order date. Then ship order 11008 on 1998-05-01.',
    orderMatters: false,
    checkSql: `select order_id, shipped_date from orders where order_id = 11008`,
    solutions: [
      {
        approach: 'Checks with IF, errors with RAISE / SIGNAL',
        postgres: `create procedure ship_order(p_order_id int, p_date date)
language plpgsql
as $$
declare
  v_ordered timestamp;
  v_shipped timestamp;
begin
  select order_date, shipped_date into v_ordered, v_shipped
  from orders where order_id = p_order_id for update;

  if not found then
    raise exception 'order % does not exist', p_order_id;
  elsif v_shipped is not null then
    raise exception 'order % was already shipped on %', p_order_id, v_shipped::date;
  elsif p_date < v_ordered::date then
    raise exception 'order % cannot ship before it was placed', p_order_id;
  end if;

  update orders set shipped_date = p_date where order_id = p_order_id;
end;
$$;

call ship_order(11008, '1998-05-01');`,
        mysql: `create procedure ship_order(p_order_id int, p_date date)
begin
  declare v_ordered datetime;
  declare v_shipped datetime;
  declare v_found int;

  select count(*), max(order_date), max(shipped_date) into v_found, v_ordered, v_shipped
  from orders where order_id = p_order_id for update;

  if v_found = 0 then
    signal sqlstate '45000' set message_text = 'order does not exist';
  elseif v_shipped is not null then
    signal sqlstate '45000' set message_text = 'order was already shipped';
  elseif p_date < date(v_ordered) then
    signal sqlstate '45000' set message_text = 'order cannot ship before it was placed';
  end if;

  update orders set shipped_date = p_date where order_id = p_order_id;
end;

call ship_order(11008, '1998-05-01');`,
        mysqlNote:
          DELIMITER_NOTE +
          ' MySQL has no FOUND: count(*) always returns one row, so it tells whether the order exists. SIGNAL cannot format values into the message the way RAISE does.',
        explanation:
          'An error stops the procedure and rolls back its statement, so a bad call changes nothing. Calling ship_order(11008, …) a second time would now fail with "already shipped".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Errors and messages', url: PG + 'plpgsql-errors-and-messages.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'northwind-078',
    dataset: 'northwind',
    level: 3,
    topics: ['date-series', 'conditional-aggregates'],
    title: 'Due, on time, late and open by month',
    prompt:
      'For every month from July 1996 to June 1998, by required_date: how many orders were due, how many shipped on time (on or before required_date), how many late, and how many are not shipped. Show the month as YYYY-MM.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month series, LEFT JOIN, counts with FILTER',
        postgres: `select to_char(m.month, 'YYYY-MM') as month,
       count(o.order_id) as due,
       count(*) filter (where o.shipped_date <= o.required_date) as on_time,
       count(*) filter (where o.shipped_date > o.required_date) as late,
       count(o.order_id) filter (where o.shipped_date is null) as not_shipped
from generate_series('1996-07-01'::timestamp, '1998-06-01', interval '1 month') as m (month)
left join orders o
  on o.required_date >= m.month and o.required_date < m.month + interval '1 month'
group by m.month
order by m.month;`,
        mysql: `with recursive months (month) as (
  select cast('1996-07-01' as datetime)
  union all
  select month + interval 1 month from months where month < '1998-06-01'
)
select date_format(m.month, '%Y-%m') as month,
       count(o.order_id) as due,
       sum(case when o.shipped_date <= o.required_date then 1 else 0 end) as on_time,
       sum(case when o.shipped_date > o.required_date then 1 else 0 end) as late,
       sum(case when o.order_id is not null and o.shipped_date is null then 1 else 0 end) as not_shipped
from months m
left join orders o
  on o.required_date >= m.month and o.required_date < m.month + interval 1 month
group by m.month
order by m.month;`,
        mysqlNote: 'No generate_series or FILTER in MySQL: a recursive CTE makes the months and SUM(CASE …) does the counting.',
        explanation:
          'The series guarantees all 24 months appear. The open count must check that a joined order exists: in a month with no orders the LEFT JOIN row has every order column NULL, and "shipped_date is null" alone would count it as open.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
    ],
  },
  {
    id: 'northwind-079',
    dataset: 'northwind',
    level: 1,
    topics: ['limit'],
    title: 'Top 11 prices, ties included',
    prompt: 'Show the 11 most expensive products (product_name, unit_price), but if more products share the 11th price, include them too.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FETCH FIRST … WITH TIES',
        postgres: `select product_name, unit_price
from products
order by unit_price desc
fetch first 11 rows with ties;`,
        mysql: null,
        mysqlNote: 'MySQL has no WITH TIES; see solution B.',
        explanation: 'WITH TIES keeps going past row 11 while the ORDER BY value is equal: 43.90 is shared by two products, so 12 rows come out. Ties after the cut are returned in no particular order unless the ORDER BY says more.',
      },
      {
        approach: 'RANK() ≤ 11',
        postgres: `select product_name, unit_price
from (select product_name, unit_price, rank() over (order by unit_price desc) as r from products) ranked
where r <= 11
order by unit_price desc, product_name;`,
        mysql: `select product_name, unit_price
from (select product_name, unit_price, rank() over (order by unit_price desc) as r from products) ranked
where r <= 11
order by unit_price desc, product_name;`,
        explanation: 'RANK gives equal prices the same number, so every product tied at rank 11 passes the filter.',
      },
    ],
    comparison: 'Same 12 products. WITH TIES is shorter and stops early; RANK works everywhere.',
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'northwind-080',
    dataset: 'northwind',
    level: 4,
    topics: ['json', 'joins'],
    title: 'Price a cart sent as JSON',
    prompt:
      'A web shop sends the cart as JSON: [{"product_id": 11, "qty": 12}, {"product_id": 42, "qty": 10}, {"product_id": 72, "qty": 5}]. Turn it into rows and price it: product_name, qty, unit_price and line_total, in cart order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'JSON_TABLE',
        postgres: `select p.product_name, c.qty, p.unit_price, c.qty * p.unit_price as line_total
from json_table(
       '[{"product_id": 11, "qty": 12}, {"product_id": 42, "qty": 10}, {"product_id": 72, "qty": 5}]',
       '$[*]' columns (pos for ordinality, product_id integer path '$.product_id', qty integer path '$.qty')
     ) c
join products p on p.product_id = c.product_id
order by c.pos;`,
        mysql: `select p.product_name, c.qty, p.unit_price, c.qty * p.unit_price as line_total
from json_table(
       '[{"product_id": 11, "qty": 12}, {"product_id": 42, "qty": 10}, {"product_id": 72, "qty": 5}]',
       '$[*]' columns (pos for ordinality, product_id int path '$.product_id', qty int path '$.qty')
     ) c
join products p on p.product_id = c.product_id
order by c.pos;`,
        explanation:
          'JSON_TABLE is standard SQL: MySQL has had it since 8.0, PostgreSQL since 17. FOR ORDINALITY numbers the array elements, which keeps the cart order. Prices come from the database, never from the cart, so a client cannot send its own.',
      },
      {
        approach: 'jsonb_to_recordset WITH ORDINALITY',
        postgres: `select p.product_name, c.qty, p.unit_price, c.qty * p.unit_price as line_total
from rows from (
       jsonb_to_recordset('[{"product_id": 11, "qty": 12}, {"product_id": 42, "qty": 10}, {"product_id": 72, "qty": 5}]')
         as (product_id integer, qty integer)
     ) with ordinality as c (product_id, qty, pos)
join products p on p.product_id = c.product_id
order by c.pos;`,
        mysql: null,
        mysqlNote: 'PostgreSQL-only; solution A works in both.',
        explanation: 'The older PostgreSQL way: jsonb_to_recordset maps object keys to the listed columns by name. A function that needs a column list can only take WITH ORDINALITY inside ROWS FROM ( … ).',
      },
    ],
    comparison: 'Same three lines. JSON_TABLE is portable between the two; jsonb_to_recordset is shorter and works in older PostgreSQL versions.',
    docs: [
      { label: 'PostgreSQL: JSON_TABLE', url: PG + 'functions-json.html#FUNCTIONS-SQLJSON-TABLE' },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'northwind-081',
    dataset: 'northwind',
    level: 5,
    topics: ['triggers'],
    title: 'The catalog price as the default',
    prompt:
      'Make the database fill in order_details.unit_price from products.unit_price whenever a line is inserted without a price. Test: add 3 × product 11 to order 11077 without giving a price.',
    orderMatters: false,
    checkSql: `insert into order_details (order_id, product_id, quantity, discount) values (11077, 11, 3, 0);
select order_id, product_id, unit_price, quantity from order_details where order_id = 11077 and product_id = 11`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger',
        postgres: `create function default_line_price() returns trigger
language plpgsql
as $$
begin
  if new.unit_price is null then
    select unit_price into new.unit_price from products where product_id = new.product_id;
  end if;
  return new;
end;
$$;

create trigger order_details_default_price
before insert on order_details
for each row execute function default_line_price();`,
        mysql: `create trigger order_details_default_price
before insert on order_details
for each row
begin
  if new.unit_price is null then
    set new.unit_price = (select unit_price from products where product_id = new.product_id);
  end if;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'A BEFORE trigger may change the row before it is written, and NOT NULL is checked only after it runs, so the insert succeeds. A column DEFAULT could not do this: defaults cannot look up another table.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Trigger syntax', url: MY + 'trigger-syntax.html' },
    ],
  },
  {
    id: 'northwind-082',
    dataset: 'northwind',
    level: 3,
    topics: ['recursive', 'strings'],
    title: 'The chain of command, upwards',
    prompt:
      'For every employee, show the chain from them up to the top as text, like "Dodsworth > Buchanan > Fuller", and how many levels it has. Order by employee_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE walking up reports_to',
        postgres: `with recursive chain (employee_id, boss_id, path, levels) as (
  select employee_id, reports_to, last_name::text, 1
  from employees
  union all
  select c.employee_id, e.reports_to, c.path || ' > ' || e.last_name, c.levels + 1
  from chain c
  join employees e on e.employee_id = c.boss_id
)
select employee_id, path, levels
from chain
where boss_id is null
order by employee_id;`,
        mysql: `with recursive chain (employee_id, boss_id, path, levels) as (
  select employee_id, reports_to, cast(last_name as char(200)), 1
  from employees
  union all
  select c.employee_id, e.reports_to, concat(c.path, ' > ', e.last_name), c.levels + 1
  from chain c
  join employees e on e.employee_id = c.boss_id
)
select employee_id, path, levels
from chain
where boss_id is null
order by employee_id;`,
        mysqlNote: 'The anchor CASTs the path wide enough: a recursive CTE takes its column types from the anchor, and a 20-character last_name column would truncate the chain.',
        explanation:
          'Every employee starts a walk, and each step moves to the current boss. The walk ends at the person with no boss, so "boss_id is null" keeps exactly one finished row per employee. Fuller\'s own chain is just "Fuller", 1 level.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'northwind-083',
    dataset: 'northwind',
    level: 5,
    topics: ['partitioning'],
    title: 'Customers split by continent',
    prompt:
      'Create customers_by_region (customer_id, company_name, country) list-partitioned by country into americas (Argentina, Brazil, Canada, Mexico, USA, Venezuela) and europe (every other country in the data), and copy the customers in.',
    orderMatters: false,
    checkSql: `select (select count(*) from customers_americas) as americas, (select count(*) from customers_europe) as europe`,
    checkSqlMysql: `select (select count(*) from customers_by_region partition (americas)) as americas,
       (select count(*) from customers_by_region partition (europe)) as europe`,
    solutions: [
      {
        approach: 'LIST partitions with several values each',
        postgres: `create table customers_by_region (
  customer_id  varchar(5)  not null,
  company_name varchar(40) not null,
  country      varchar(15) not null,
  primary key (customer_id, country)
) partition by list (country);

create table customers_americas partition of customers_by_region
  for values in ('Argentina', 'Brazil', 'Canada', 'Mexico', 'USA', 'Venezuela');
create table customers_europe partition of customers_by_region
  for values in ('Austria', 'Belgium', 'Denmark', 'Finland', 'France', 'Germany', 'Ireland', 'Italy',
                 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'UK');

insert into customers_by_region select customer_id, company_name, country from customers;`,
        mysql: `create table customers_by_region (
  customer_id  varchar(5)  not null,
  company_name varchar(40) not null,
  country      varchar(15) not null,
  primary key (customer_id, country)
)
partition by list columns (country) (
  partition americas values in ('Argentina', 'Brazil', 'Canada', 'Mexico', 'USA', 'Venezuela'),
  partition europe   values in ('Austria', 'Belgium', 'Denmark', 'Finland', 'France', 'Germany', 'Ireland', 'Italy',
                                'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'UK')
);

insert into customers_by_region select customer_id, company_name, country from customers;`,
        mysqlNote: 'A MySQL partition is not a table you can query by name in FROM; use PARTITION (americas) after the table name, or a WHERE on the key.',
        explanation:
          'Each partition lists its values; a customer from a country in neither list would be rejected. In PostgreSQL a DEFAULT partition can catch "everything else" instead. 37 customers land in americas and 54 in europe.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: LIST COLUMNS partitioning', url: MY + 'partitioning-columns-list.html' },
    ],
  },
  {
    id: 'northwind-084',
    dataset: 'northwind',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Keep the product while you sell it',
    prompt:
      'Add 2 × product 11 at 21.00 to order 11077, but only if the product is not discontinued, and make sure nobody can discontinue or delete it until your transaction ends. Other sessions may still read it and sell it too. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select order_id, product_id, unit_price, quantity from order_details where order_id = 11077 and product_id = 11`,
    solutions: [
      {
        approach: 'SELECT … FOR SHARE, then insert',
        postgres: `select discontinued from products where product_id = 11 for share;

insert into order_details (order_id, product_id, unit_price, quantity, discount)
select 11077, 11, 21.00, 2, 0
from products
where product_id = 11 and discontinued = 0;`,
        mysql: `start transaction;

select discontinued from products where product_id = 11 for share;

insert into order_details (order_id, product_id, unit_price, quantity, discount)
select 11077, 11, 21.00, 2, 0
from products
where product_id = 11 and discontinued = 0;

commit;`,
        mysqlNote: 'FOR SHARE is the MySQL 8 name; older versions wrote LOCK IN SHARE MODE.',
        explanation:
          'FOR SHARE is a read lock: other transactions can also take FOR SHARE (so two salespeople can sell the product at once), but an UPDATE or DELETE of the row waits until both commit. FOR UPDATE would also block the other salesperson. The foreign key from order_details takes a similar share lock on the product by itself; the explicit one also protects the discontinued check.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'northwind-085',
    dataset: 'northwind',
    level: 5,
    topics: ['partial-covering-indexes', 'indexes'],
    title: 'Unique names among active products',
    prompt:
      'Two products may share a name only if at least one of them is discontinued. Enforce this with a unique index: product_name must be unique among products with discontinued = 0.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_unique_index from pg_indexes where tablename = 'products' and indexdef like 'CREATE UNIQUE INDEX%' and indexdef like '%discontinued%'`,
    checkSqlMysql: `select count(*) > 0 as has_unique_index
from information_schema.statistics
where table_schema = database() and table_name = 'products' and non_unique = 0 and expression is not null`,
    solutions: [
      {
        approach: 'Partial unique index',
        postgres: `create unique index products_active_name_key on products (product_name)
where discontinued = 0;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation:
          'The index only holds active products, so uniqueness is checked only among them; any number of discontinued products can keep an old name. A UNIQUE constraint on the whole column could not express "only when active".',
      },
      {
        approach: 'Unique index on an expression that is NULL for discontinued products',
        postgres: `create unique index products_active_name_key on products ((case when discontinued = 0 then product_name end));`,
        mysql: `create unique index products_active_name_key on products ((case when discontinued = 0 then product_name end));`,
        mysqlNote: 'Functional indexes (note the double parentheses) exist since MySQL 8.0.13.',
        explanation: 'A unique index allows any number of NULLs. Mapping discontinued products to NULL leaves only active names to be compared, which gives the same rule.',
      },
    ],
    comparison: 'Same rule. The partial index is clearer and smaller; the NULL trick works in MySQL.',
    docs: [
      { label: 'PostgreSQL: Partial unique indexes', url: PG + 'indexes-partial.html' },
      { label: 'MySQL: Functional key parts', url: MY + 'create-index.html#create-index-functional-key-parts' },
    ],
  },
  {
    id: 'northwind-086',
    dataset: 'northwind',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Customers who went quiet for a year',
    prompt:
      'Find every gap of more than 365 days between two consecutive orders of the same customer: customer_id, the order before the gap, the order after it (dates) and the gap in days. Longest first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG to the previous order, then filter',
        postgres: `with seq as (
  select customer_id, order_date,
         lag(order_date) over (partition by customer_id order by order_date, order_id) as prev_date
  from orders
)
select customer_id, prev_date::date as before_gap, order_date::date as after_gap,
       order_date::date - prev_date::date as gap_days
from seq
where order_date::date - prev_date::date > 365
order by gap_days desc, customer_id;`,
        mysql: `with seq as (
  select customer_id, order_date,
         lag(order_date) over (partition by customer_id order by order_date, order_id) as prev_date
  from orders
)
select customer_id, date(prev_date) as before_gap, date(order_date) as after_gap,
       datediff(order_date, prev_date) as gap_days
from seq
where datediff(order_date, prev_date) > 365
order by gap_days desc, customer_id;`,
        explanation:
          'A gap lives between two rows, so LAG puts the previous order next to each order; the filter must sit outside the CTE, because a window function cannot appear in WHERE. Seven gaps; customer ROMEY went 532 days without ordering, then came back.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'northwind-087',
    dataset: 'northwind',
    level: 3,
    topics: ['window-frames'],
    title: 'A centred moving average of freight',
    prompt:
      'For each day with orders in March 1998: the day, its total freight, and the average daily freight over the 7 order-days centred on it (3 before, the day itself, 3 after), rounded to 2 decimals.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Frame with PRECEDING and FOLLOWING',
        postgres: `with daily as (
  select order_date::date as day, sum(freight) as freight
  from orders
  where order_date >= '1998-03-01' and order_date < '1998-04-01'
  group by order_date::date
)
select day, freight,
       round(avg(freight) over (order by day rows between 3 preceding and 3 following), 2) as centred_avg
from daily
order by day;`,
        mysql: `with daily as (
  select date(order_date) as day, sum(freight) as freight
  from orders
  where order_date >= '1998-03-01' and order_date < '1998-04-01'
  group by date(order_date)
)
select day, freight,
       round(avg(freight) over (order by day rows between 3 preceding and 3 following), 2) as centred_avg
from daily
order by day;`,
        explanation:
          'A frame can reach forward too: FOLLOWING looks at later rows. A centred average does not lag behind the data the way a trailing one does, but it needs the future, so it suits analysis, not a live dashboard. At the edges of the month the frame is cut short and averages fewer days.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'northwind-088',
    dataset: 'northwind',
    level: 4,
    topics: ['materialized-views'],
    title: 'Sales per employee and year, stored',
    prompt:
      'Store revenue per employee and year (employee_id, year, orders, revenue with 2 decimals) for the sales leaderboard, refreshable without blocking it. Then: the top 3 of 1997.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    checkSql: `select employee_id, orders, revenue from employee_sales where year = 1997 order by revenue desc, employee_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view with a unique index',
        postgres: `create materialized view employee_sales as
select o.employee_id, extract(year from o.order_date)::int as year,
       count(distinct o.order_id) as orders,
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2) as revenue
from orders o
join order_details d on d.order_id = o.order_id
group by o.employee_id, extract(year from o.order_date);

create unique index employee_sales_key on employee_sales (employee_id, year);`,
        mysql: `create table employee_sales (
  employee_id int,
  year        int,
  orders      int,
  revenue     decimal(12, 2),
  primary key (employee_id, year)
);

replace into employee_sales
select o.employee_id, year(o.order_date), count(distinct o.order_id),
       round(sum(d.unit_price * d.quantity * (1 - d.discount)), 2)
from orders o
join order_details d on d.order_id = o.order_id
group by o.employee_id, year(o.order_date);`,
        mysqlNote: 'A table refreshed by REPLACE INTO on a schedule stands in for the materialized view.',
        explanation:
          'count(distinct order_id), because the join repeats each order once per line. The unique index on (employee_id, year) is what REFRESH … CONCURRENTLY needs to match old and new rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: REFRESH MATERIALIZED VIEW', url: PG + 'sql-refreshmaterializedview.html' }],
  },
  {
    id: 'northwind-089',
    dataset: 'northwind',
    level: 2,
    topics: ['text-aggregation', 'group-by'],
    title: 'Suppliers with a wide range',
    prompt: 'For suppliers with at least 4 products: company_name, the number of products, and the product names in one line, alphabetically, separated by ", ". Order by supplier_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg / GROUP_CONCAT with ORDER BY',
        postgres: `select s.company_name, count(*) as products,
       string_agg(p.product_name, ', ' order by p.product_name) as product_list
from suppliers s
join products p on p.supplier_id = s.supplier_id
group by s.supplier_id, s.company_name
having count(*) >= 4
order by s.supplier_id;`,
        mysql: `select s.company_name, count(*) as products,
       group_concat(p.product_name order by p.product_name separator ', ') as product_list
from suppliers s
join products p on p.supplier_id = s.supplier_id
group by s.supplier_id, s.company_name
having count(*) >= 4
order by s.supplier_id;`,
        mysqlNote: 'GROUP_CONCAT is cut at group_concat_max_len (1,024 bytes by default); raise it for long lists.',
        explanation:
          'HAVING filters groups after counting, which WHERE cannot do. Four suppliers qualify, two of them with five products. Grouping by supplier_id as well as the name keeps two suppliers with the same name apart.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'northwind-090',
    dataset: 'northwind',
    level: 3,
    topics: ['pivot'],
    title: 'Order lines per category, one column per year',
    prompt: 'For each category: the number of order lines in 1996, 1997 and 1998, one column per year, plus the total. Order by category_name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts per year',
        postgres: `select c.category_name,
       count(*) filter (where extract(year from o.order_date) = 1996) as y1996,
       count(*) filter (where extract(year from o.order_date) = 1997) as y1997,
       count(*) filter (where extract(year from o.order_date) = 1998) as y1998,
       count(*) as total
from order_details d
join orders o on o.order_id = d.order_id
join products p on p.product_id = d.product_id
join categories c on c.category_id = p.category_id
group by c.category_id, c.category_name
order by c.category_name;`,
        mysql: `select c.category_name,
       sum(year(o.order_date) = 1996) as y1996,
       sum(year(o.order_date) = 1997) as y1997,
       sum(year(o.order_date) = 1998) as y1998,
       count(*) as total
from order_details d
join orders o on o.order_id = d.order_id
join products p on p.product_id = d.product_id
join categories c on c.category_id = p.category_id
group by c.category_id, c.category_name
order by c.category_name;`,
        explanation:
          'Rows of different years become columns of one row. 1998 only runs to early May, so its column is not comparable with the full year 1997 without scaling.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'northwind-091',
    dataset: 'northwind',
    level: 4,
    topics: ['upsert'],
    title: 'Upsert only what changed',
    prompt:
      'A phone list arrives: shipper 1 (503) 555-9831 (unchanged), shipper 2 (503) 555-0000 (new number), shipper 4 Fast Freight (503) 555-4444 (new shipper). Upsert it so that unchanged rows are not rewritten at all.',
    orderMatters: true,
    checkSql: `select shipper_id, company_name, phone from shippers order by shipper_id`,
    solutions: [
      {
        approach: 'ON CONFLICT … DO UPDATE … WHERE',
        postgres: `insert into shippers (shipper_id, company_name, phone)
values (1, 'Speedy Express', '(503) 555-9831'),
       (2, 'United Package', '(503) 555-0000'),
       (4, 'Fast Freight', '(503) 555-4444')
on conflict (shipper_id) do update
  set phone = excluded.phone
  where shippers.phone is distinct from excluded.phone;`,
        mysql: `insert into shippers (shipper_id, company_name, phone)
values (1, 'Speedy Express', '(503) 555-9831'),
       (2, 'United Package', '(503) 555-0000'),
       (4, 'Fast Freight', '(503) 555-4444') as new
on duplicate key update phone = new.phone;`,
        mysqlNote:
          'MySQL has no WHERE on the update part, but it notices when the new values equal the old ones, leaves such rows unchanged and counts them as 0 affected rows.',
        explanation:
          'The WHERE makes PostgreSQL leave shipper 1 alone instead of writing an identical new row version (which also fires update triggers and creates dead rows). IS DISTINCT FROM treats NULLs as comparable values, so a NULL phone replaced by a number still counts as a change.',
      },
    ],
    docs: [{ label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'northwind-092',
    dataset: 'northwind',
    level: 5,
    topics: ['functions', 'dates-advanced'],
    title: 'Shipping time in working days',
    prompt:
      'Write a function working_days(p_from, p_to) that counts the Mondays to Fridays after p_from up to and including p_to. Then show orders 10248–10250 with their calendar days and working days from order to shipment.',
    orderMatters: true,
    checkSql: `select order_id, shipped_date::date - order_date::date as calendar_days, working_days(order_date::date, shipped_date::date) as working_days
from orders where order_id between 10248 and 10250 order by order_id`,
    checkSqlMysql: `select order_id, datediff(shipped_date, order_date) as calendar_days, working_days(date(order_date), date(shipped_date)) as working_days
from orders where order_id between 10248 and 10250 order by order_id`,
    solutions: [
      {
        approach: 'Count weekdays in a day series / loop',
        postgres: `create function working_days(p_from date, p_to date) returns integer
language sql
immutable
as $$
  select count(*)::integer
  from generate_series(p_from + 1, p_to, interval '1 day') as d
  where extract(isodow from d) < 6;
$$;`,
        mysql: `create function working_days(p_from date, p_to date) returns int
deterministic
begin
  declare d date default p_from + interval 1 day;
  declare n int default 0;
  while d <= p_to do
    if weekday(d) < 5 then
      set n = n + 1;
    end if;
    set d = d + interval 1 day;
  end while;
  return n;
end;`,
        mysqlNote: DELIMITER_NOTE + ' WEEKDAY() is 0 for Monday … 6 for Sunday.',
        explanation:
          'Order 10248 took 12 calendar days but 8 working days (two weekends in between). The function is IMMUTABLE / DETERMINISTIC: the same dates always give the same count. Real calendars also need holidays, usually from a table of dates to subtract.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SQL functions', url: PG + 'xfunc-sql.html' },
      { label: 'MySQL: WHILE', url: MY + 'while.html' },
    ],
  },
  {
    id: 'northwind-093',
    dataset: 'northwind',
    level: 5,
    topics: ['partitioning'],
    title: 'Order lines spread by hash',
    prompt:
      'Create order_details_hashed with the columns of order_details, hash-partitioned by order_id into 4 partitions, and copy the lines in.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'order_details_hashed'::regclass) as partitions,
       (select count(*) from order_details_hashed) as total_rows,
       (select count(*) from order_details_hashed where order_id = 10248) as lines_of_10248`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'order_details_hashed') as partitions,
       (select count(*) from order_details_hashed) as total_rows,
       (select count(*) from order_details_hashed where order_id = 10248) as lines_of_10248`,
    solutions: [
      {
        approach: 'HASH partitioning',
        postgres: `create table order_details_hashed (
  order_id   integer       not null,
  product_id integer       not null,
  unit_price numeric(10, 2) not null,
  quantity   smallint      not null,
  discount   numeric(4, 2) not null,
  primary key (order_id, product_id)
) partition by hash (order_id);

create table order_details_h0 partition of order_details_hashed for values with (modulus 4, remainder 0);
create table order_details_h1 partition of order_details_hashed for values with (modulus 4, remainder 1);
create table order_details_h2 partition of order_details_hashed for values with (modulus 4, remainder 2);
create table order_details_h3 partition of order_details_hashed for values with (modulus 4, remainder 3);

insert into order_details_hashed select * from order_details;`,
        mysql: `create table order_details_hashed (
  order_id   int           not null,
  product_id int           not null,
  unit_price decimal(10, 2) not null,
  quantity   smallint      not null,
  discount   decimal(4, 2) not null,
  primary key (order_id, product_id)
)
partition by hash (order_id) partitions 4;

insert into order_details_hashed select * from order_details;`,
        mysqlNote: 'One clause creates all four partitions. MySQL\'s HASH is plain order_id MOD 4, so which partition a row lands in differs from PostgreSQL\'s.',
        explanation:
          'Hash partitioning spreads rows evenly when there is no natural range, and all lines of one order stay in one partition, so a query for one order reads one partition. It does not help range queries such as "orders of March".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: HASH partitioning', url: MY + 'partitioning-hash.html' },
    ],
  },
  {
    id: 'northwind-094',
    dataset: 'northwind',
    level: 1,
    topics: ['limit', 'conditions'],
    title: 'The emptiest shelves',
    prompt: 'Among products that are not discontinued, show the 5 with the fewest units in stock: product_id, product_name, units_in_stock. On a tie, lower product_id first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter, sort ascending, LIMIT',
        postgres: `select product_id, product_name, units_in_stock
from products
where discontinued = 0
order by units_in_stock, product_id
limit 5;`,
        mysql: `select product_id, product_name, units_in_stock
from products
where discontinued = 0
order by units_in_stock, product_id
limit 5;`,
        explanation: 'Ascending order puts the smallest values first, so LIMIT 5 keeps the five lowest stocks. Gorgonzola Telino is out of stock entirely.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'northwind-095',
    dataset: 'northwind',
    level: 2,
    topics: ['set-operations', 'joins'],
    title: 'Sold in 1996, never in 1998',
    prompt: 'Which products were ordered in 1996 but not at all in 1998? Show product_id and product_name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'EXCEPT of two product lists',
        postgres: `select p.product_id, p.product_name
from products p
where p.product_id in (
  select d.product_id from order_details d join orders o on o.order_id = d.order_id
  where o.order_date >= '1996-01-01' and o.order_date < '1997-01-01'
  except
  select d.product_id from order_details d join orders o on o.order_id = d.order_id
  where o.order_date >= '1998-01-01' and o.order_date < '1999-01-01'
)
order by p.product_id;`,
        mysql: `select p.product_id, p.product_name
from products p
where p.product_id in (
  select d.product_id from order_details d join orders o on o.order_id = d.order_id
  where o.order_date >= '1996-01-01' and o.order_date < '1997-01-01'
  except
  select d.product_id from order_details d join orders o on o.order_id = d.order_id
  where o.order_date >= '1998-01-01' and o.order_date < '1999-01-01'
)
order by p.product_id;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation:
          'Only Genen Shouyu. Keep in mind that 1998 covers just four months here, so "not in 1998" means "not since January"; on such data, a gap may be the calendar rather than lost interest.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'northwind-096',
    dataset: 'northwind',
    level: 3,
    topics: ['cte', 'aggregates'],
    title: 'Big customers for their country',
    prompt:
      'Compare each customer\'s revenue with the average customer revenue of their country. Show the 5 customers with the highest ratio: customer_id, country, revenue, country average and ratio (all 2 decimals). Ties by customer_id.',
    hint: REVENUE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Revenue per customer, then average per country',
        postgres: `with per_customer as (
  select o.customer_id, c.country, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join customers c on c.customer_id = o.customer_id
  join order_details d on d.order_id = o.order_id
  group by o.customer_id, c.country
),
per_country as (
  select country, avg(revenue) as country_avg from per_customer group by country
)
select p.customer_id, p.country, round(p.revenue, 2) as revenue, round(k.country_avg, 2) as country_avg,
       round(p.revenue / k.country_avg, 2) as ratio
from per_customer p
join per_country k on k.country = p.country
order by ratio desc, p.customer_id
limit 5;`,
        mysql: `with per_customer as (
  select o.customer_id, c.country, sum(d.unit_price * d.quantity * (1 - d.discount)) as revenue
  from orders o
  join customers c on c.customer_id = o.customer_id
  join order_details d on d.order_id = o.order_id
  group by o.customer_id, c.country
),
per_country as (
  select country, avg(revenue) as country_avg from per_customer group by country
)
select p.customer_id, p.country, round(p.revenue, 2) as revenue, round(k.country_avg, 2) as country_avg,
       round(p.revenue / k.country_avg, 2) as ratio
from per_customer p
join per_country k on k.country = p.country
order by ratio desc, p.customer_id
limit 5;`,
        explanation:
          'Two levels of aggregation: first per customer, then the average of those totals per country. Averaging order lines directly would weight customers by how many lines they have. SAVEA earns over five times the average US customer.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'northwind-097',
    dataset: 'northwind',
    level: 4,
    topics: ['generated-columns', 'conditions'],
    title: 'A reorder flag the database keeps',
    prompt:
      'Add a stored generated column needs_reorder to products: true when units_in_stock + units_on_order is at or below reorder_level. Then count the products that need reordering.',
    orderMatters: false,
    checkSql: `select count(*) as to_reorder from products where needs_reorder`,
    solutions: [
      {
        approach: 'A boolean generated column',
        postgres: `alter table products
add column needs_reorder boolean
generated always as (units_in_stock + units_on_order <= reorder_level) stored;`,
        mysql: `alter table products
add column needs_reorder boolean
generated always as (units_in_stock + units_on_order <= reorder_level) stored;`,
        mysqlNote: 'In MySQL the comparison yields 1 or 0, stored in a TINYINT(1) column.',
        explanation:
          'A comparison is itself a true/false value, so it can be the whole expression. Stock arriving (units_on_order) counts too, otherwise products already on the way would be flagged again. Six products need reordering.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'northwind-098',
    dataset: 'northwind',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Wait for a lock, but not forever',
    prompt:
      'A price update on product 11 might wait behind another session\'s lock. Make this transaction wait at most 2 seconds for any lock, then raise the price of product 11 by 5% (2 decimals). In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select product_id, unit_price from products where product_id = 11`,
    solutions: [
      {
        approach: 'lock_timeout / innodb_lock_wait_timeout',
        postgres: `set local lock_timeout = '2s';

update products set unit_price = round(unit_price * 1.05, 2) where product_id = 11;`,
        mysql: `set session innodb_lock_wait_timeout = 2;
start transaction;

update products set unit_price = round(unit_price * 1.05, 2) where product_id = 11;

commit;`,
        mysqlNote: 'innodb_lock_wait_timeout is in whole seconds (default 50). On timeout MySQL rolls back only the statement, not the whole transaction.',
        explanation:
          'Without a limit, a session can hang behind a forgotten open transaction. With one, it fails fast ("canceling statement due to lock timeout") and the application can retry or report. SET LOCAL lasts only until the end of the transaction. 21.00 becomes 22.05.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: lock_timeout', url: PG + 'runtime-config-client.html#GUC-LOCK-TIMEOUT' },
      { label: 'MySQL: innodb_lock_wait_timeout', url: MY + 'innodb-parameters.html#sysvar_innodb_lock_wait_timeout' },
    ],
  },
]
