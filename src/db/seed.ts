// A small food-delivery dataset: 50k customers, 100 restaurants, 200k orders.
// setseed() makes random() deterministic, so every visitor gets identical data
// and exercise answers stay stable.
export const SEED_SQL = `
select setseed(0.42);

create table customers (
  id           int primary key,
  name         text not null,
  email        text not null,
  city         text not null,
  signed_up_at date not null
);

create table restaurants (
  id      int primary key,
  name    text not null,
  cuisine text not null,
  city    text not null
);

create table orders (
  id            int primary key,
  customer_id   int not null references customers(id),
  restaurant_id int not null references restaurants(id),
  total         numeric(8, 2) not null,
  status        text not null,
  created_at    timestamp not null
);

insert into customers
select g,
       first_name || ' ' || last_name,
       lower(first_name) || '.' || lower(last_name) || g || '@mail.com',
       (array['Tel Aviv', 'Haifa', 'Jerusalem', 'Ramat Gan', 'Herzliya'])[1 + floor(random() * 5)::int],
       date '2024-01-01' + floor(random() * 600)::int
from (
  select g,
         (array['Noa', 'Yael', 'Daniel', 'Itai', 'Maya', 'Omer', 'Tamar', 'Ariel', 'Shira', 'Eitan'])[1 + floor(random() * 10)::int] as first_name,
         (array['Levi', 'Cohen', 'Mizrahi', 'Peretz', 'Biton', 'Friedman', 'Katz', 'Azoulay', 'Shapiro', 'Golan'])[1 + floor(random() * 10)::int] as last_name
  from generate_series(1, 50000) g
) people;

insert into restaurants
select g,
       (array['Golden', 'Little', 'Blue', 'Urban', 'Old Port', 'Green', 'Night', 'Sunny', 'Corner', 'Royal'])[1 + (g - 1) % 10]
         || ' ' ||
       (array['Fork', 'Grill', 'Kitchen', 'Bowl', 'Oven', 'Garden', 'Table', 'Spoon', 'Bistro', 'House'])[1 + (g - 1) / 10],
       (array['Pizza', 'Sushi', 'Burgers', 'Hummus', 'Thai', 'Salads'])[1 + floor(random() * 6)::int],
       (array['Tel Aviv', 'Haifa', 'Jerusalem', 'Ramat Gan', 'Herzliya'])[1 + floor(random() * 5)::int]
from generate_series(1, 100) g;

insert into orders
select g,
       1 + floor(random() * 50000)::int,
       1 + floor(random() * 100)::int,
       round((30 + random() * 220)::numeric, 2),
       case when random() < 0.92 then 'delivered'
            when random() < 0.5  then 'cancelled'
            else 'refunded' end,
       date_trunc('second', timestamp '2025-01-01' + random() * interval '540 days')
from generate_series(1, 200000) g;

analyze;
`
