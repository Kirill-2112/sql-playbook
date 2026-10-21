import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const CURRENT_PAY = `with current_pay as (
  select emp_no, salary
  from salaries
  where to_date = '9999-01-01'
)`

const BATTING_2025 = `with hitters as (
  select player_id, sum(hr) as hr
  from batting
  where year_id = 2025
  group by player_id
)`

export const employeesPractice: Exercise[] = [
  {
    id: 'employees-122',
    dataset: 'employees',
    level: 3,
    topics: ['ranking', 'subqueries'],
    title: 'The third-highest salary',
    prompt: 'Among current salaries (to_date 9999-01-01), find the third-highest distinct amount and how many employees earn exactly that.',
    orderMatters: false,
    solutions: [
      {
        approach: 'DENSE_RANK = 3',
        postgres: `${CURRENT_PAY},
ranked as (
  select salary, dense_rank() over (order by salary desc) as rnk
  from current_pay
)
select salary, count(*) as employees
from ranked
where rnk = 3
group by salary;`,
        mysql: `${CURRENT_PAY},
ranked as (
  select salary, dense_rank() over (order by salary desc) as rnk
  from current_pay
)
select salary, count(*) as employees
from ranked
where rnk = 3
group by salary;`,
        explanation: 'DENSE_RANK numbers distinct amounts 1, 2, 3… even when several people share one. The classic interview question "N-th highest salary" is exactly this.',
      },
      {
        approach: 'DISTINCT + LIMIT 1 OFFSET 2',
        postgres: `${CURRENT_PAY},
third as (
  select distinct salary
  from current_pay
  order by salary desc
  limit 1 offset 2
)
select t.salary, count(*) as employees
from third t
join current_pay c on c.salary = t.salary
group by t.salary;`,
        mysql: `${CURRENT_PAY},
third as (
  select distinct salary
  from current_pay
  order by salary desc
  limit 1 offset 2
)
select t.salary, count(*) as employees
from third t
join current_pay c on c.salary = t.salary
group by t.salary;`,
        explanation: 'Sort the distinct amounts and skip two. Without DISTINCT, two people on the top salary would make the "third" one wrong.',
      },
    ],
    comparison: 'Same answer. DENSE_RANK generalises to "N-th per department" with PARTITION BY; LIMIT/OFFSET is the shortest for one global N.',
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: DENSE_RANK', url: MY + 'window-function-descriptions.html#function_dense-rank' },
    ],
  },
  {
    id: 'employees-123',
    dataset: 'employees',
    level: 3,
    topics: ['self-cross-join', 'joins'],
    title: 'Paid more than the boss',
    prompt:
      'Count, per department, the employees whose current salary is higher than the current salary of their department\'s current manager (managers themselves excluded). Most first, ties by department name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join employee pay to manager pay',
        postgres: `${CURRENT_PAY}
select d.dept_name, count(*) as employees
from dept_emp de
join current_pay ep on ep.emp_no = de.emp_no
join dept_manager dm on dm.dept_no = de.dept_no and dm.to_date = '9999-01-01'
join current_pay mp on mp.emp_no = dm.emp_no
join departments d on d.dept_no = de.dept_no
where de.to_date = '9999-01-01'
  and de.emp_no <> dm.emp_no
  and ep.salary > mp.salary
group by d.dept_name
order by employees desc, d.dept_name;`,
        mysql: `${CURRENT_PAY}
select d.dept_name, count(*) as employees
from dept_emp de
join current_pay ep on ep.emp_no = de.emp_no
join dept_manager dm on dm.dept_no = de.dept_no and dm.to_date = '9999-01-01'
join current_pay mp on mp.emp_no = dm.emp_no
join departments d on d.dept_no = de.dept_no
where de.to_date = '9999-01-01'
  and de.emp_no <> dm.emp_no
  and ep.salary > mp.salary
group by d.dept_name
order by employees desc, d.dept_name;`,
        explanation: 'The same pay table is joined twice: once for the employee, once for the manager. Every history table needs its "current" filter, or old rows multiply the result.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: table aliases', url: PG + 'queries-table-expressions.html#QUERIES-TABLE-ALIASES' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'employees-124',
    dataset: 'employees',
    level: 3,
    topics: ['lag-lead'],
    title: 'First pay and latest pay',
    prompt: 'For employees 10050 to 10250, show the first salary they ever had, their latest one, and the growth in percent (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'FIRST_VALUE / LAST_VALUE over the full history',
        postgres: `select distinct emp_no,
       first_value(salary) over w as first_salary,
       last_value(salary) over w as latest_salary,
       round(100.0 * (last_value(salary) over w - first_value(salary) over w) / first_value(salary) over w, 1) as growth_pct
from salaries
where emp_no between 10050 and 10250
window w as (partition by emp_no order by from_date
             rows between unbounded preceding and unbounded following)
order by emp_no;`,
        mysql: `select distinct emp_no,
       first_value(salary) over w as first_salary,
       last_value(salary) over w as latest_salary,
       round(100.0 * (last_value(salary) over w - first_value(salary) over w) / first_value(salary) over w, 1) as growth_pct
from salaries
where emp_no between 10050 and 10250
window w as (partition by emp_no order by from_date
             rows between unbounded preceding and unbounded following)
order by emp_no;`,
        explanation:
          'LAST_VALUE needs the frame to reach the end of the partition; with the default frame it would return the current row. DISTINCT collapses the identical rows of each employee into one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: FIRST_VALUE', url: MY + 'window-function-descriptions.html#function_first-value' },
    ],
  },
  {
    id: 'employees-125',
    dataset: 'employees',
    level: 3,
    topics: ['aggregates', 'ranking'],
    title: 'Salary quartiles',
    prompt: 'Show the 25th, 50th and 75th percentile of current salaries, as actual salary values from the data.',
    orderMatters: false,
    solutions: [
      {
        approach: 'PERCENTILE_DISC',
        postgres: `${CURRENT_PAY}
select percentile_disc(0.25) within group (order by salary) as p25,
       percentile_disc(0.50) within group (order by salary) as p50,
       percentile_disc(0.75) within group (order by salary) as p75
from current_pay;`,
        mysql: null,
        mysqlNote: 'MySQL has no PERCENTILE_DISC; use solution B.',
        explanation: 'percentile_disc returns a value that really occurs (no averaging), unlike percentile_cont.',
      },
      {
        approach: 'Row at position ceil(p × n)',
        postgres: `${CURRENT_PAY},
numbered as (
  select salary, row_number() over (order by salary) as rn, count(*) over () as n
  from current_pay
)
select max(case when rn = ceil(0.25 * n) then salary end) as p25,
       max(case when rn = ceil(0.50 * n) then salary end) as p50,
       max(case when rn = ceil(0.75 * n) then salary end) as p75
from numbered;`,
        mysql: `${CURRENT_PAY},
numbered as (
  select salary, row_number() over (order by salary) as rn, count(*) over () as n
  from current_pay
)
select max(case when rn = ceil(0.25 * n) then salary end) as p25,
       max(case when rn = ceil(0.50 * n) then salary end) as p50,
       max(case when rn = ceil(0.75 * n) then salary end) as p75
from numbered;`,
        explanation: 'The discrete percentile p is the first value whose position reaches p of the way through the sorted list: row ceil(p·n).',
      },
    ],
    comparison: 'Same three salaries. PERCENTILE_DISC states the intent; the ROW_NUMBER version shows the definition and runs anywhere.',
    docs: [
      { label: 'PostgreSQL: ordered-set aggregates', url: PG + 'functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE' },
      { label: 'MySQL: ROW_NUMBER', url: MY + 'window-function-descriptions.html#function_row-number' },
    ],
  },
  {
    id: 'employees-126',
    dataset: 'employees',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Two raises, keep one',
    prompt:
      'In one transaction: give employee 10050 a raise of 1,000 on the current salary, set a savepoint, give employee 10100 the same raise, then roll back to the savepoint and commit. Only the first raise should remain.',
    orderMatters: true,
    checkSql: `select emp_no, salary from salaries
where emp_no in (10050, 10100) and to_date = '9999-01-01'
order by emp_no`,
    solutions: [
      {
        approach: 'SAVEPOINT + ROLLBACK TO + COMMIT',
        postgres: `begin;
update salaries set salary = salary + 1000 where emp_no = 10050 and to_date = '9999-01-01';
savepoint second_raise;
update salaries set salary = salary + 1000 where emp_no = 10100 and to_date = '9999-01-01';
rollback to savepoint second_raise;
commit;`,
        mysql: `start transaction;
update salaries set salary = salary + 1000 where emp_no = 10050 and to_date = '9999-01-01';
savepoint second_raise;
update salaries set salary = salary + 1000 where emp_no = 10100 and to_date = '9999-01-01';
rollback to savepoint second_raise;
commit;`,
        explanation: 'ROLLBACK TO SAVEPOINT undoes only what came after the savepoint; the transaction stays open, and COMMIT saves the first raise.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: SAVEPOINT', url: PG + 'sql-savepoint.html' },
      { label: 'MySQL: SAVEPOINT', url: MY + 'savepoint.html' },
    ],
  },
]

export const lahmanPractice: Exercise[] = [
  {
    id: 'lahman-128',
    dataset: 'lahman',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Birthplaces as one label',
    prompt: 'For players whose last name starts with "Mc" and who were born in 1995 or later, show player_id, the full name and one birthplace label "city, state, country" that skips missing parts.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CONCAT_WS',
        postgres: `select player_id,
       name_first || ' ' || name_last as name,
       concat_ws(', ', birth_city, birth_state, birth_country) as birthplace
from people
where name_last like 'Mc%'
  and birth_year >= 1995
order by player_id;`,
        mysql: `select player_id,
       concat(name_first, ' ', name_last) as name,
       concat_ws(', ', birth_city, birth_state, birth_country) as birthplace
from people
where name_last like 'Mc%'
  and birth_year >= 1995
order by player_id;`,
        mysqlNote: '|| is OR in MySQL, so the name uses CONCAT.',
        explanation: 'CONCAT_WS skips NULLs, so a player born outside the US without a state gets "city, country" instead of "city, , country".',
      },
    ],
    docs: [
      { label: 'PostgreSQL: concat_ws', url: PG + 'functions-string.html' },
      { label: 'MySQL: CONCAT_WS', url: MY + 'string-functions.html#function_concat-ws' },
    ],
  },
  {
    id: 'lahman-129',
    dataset: 'lahman',
    level: 3,
    topics: ['ranking'],
    title: 'Home-run tiers of 2025',
    prompt: 'Take 2025 batters with at least 300 at-bats (summed over their teams). Split them into four equal tiers by home runs, most first, and show each tier\'s number of players and the fewest and most home runs in it.',
    orderMatters: true,
    solutions: [
      {
        approach: 'NTILE(4)',
        postgres: `with hitters as (
  select player_id, sum(hr) as hr
  from batting
  where year_id = 2025
  group by player_id
  having sum(ab) >= 300
),
tiers as (
  select hr, ntile(4) over (order by hr desc, player_id) as tier
  from hitters
)
select tier, count(*) as players, min(hr) as fewest, max(hr) as most
from tiers
group by tier
order by tier;`,
        mysql: `with hitters as (
  select player_id, sum(hr) as hr
  from batting
  where year_id = 2025
  group by player_id
  having sum(ab) >= 300
),
tiers as (
  select hr, ntile(4) over (order by hr desc, player_id) as tier
  from hitters
)
select tier, count(*) as players, min(hr) as fewest, max(hr) as most
from tiers
group by tier
order by tier;`,
        explanation: 'NTILE deals sorted rows into equal piles; if the count does not divide evenly, the first tiers get one extra player. Players traded mid-season have one batting row per team, hence the SUM.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ntile', url: PG + 'functions-window.html' },
      { label: 'MySQL: NTILE', url: MY + 'window-function-descriptions.html#function_ntile' },
    ],
  },
  {
    id: 'lahman-130',
    dataset: 'lahman',
    level: 3,
    topics: ['subqueries'],
    title: 'Better than a pennant winner',
    prompt: 'Which 2025 teams won more games than at least one of the two 2024 pennant winners (lg_win = \'Y\')? Show team_id, name and wins, most first.',
    orderMatters: true,
    solutions: [
      {
        approach: '> ANY (subquery)',
        postgres: `select team_id, name, w
from teams
where year_id = 2025
  and w > any (select w from teams where year_id = 2024 and lg_win = 'Y')
order by w desc, team_id;`,
        mysql: `select team_id, name, w
from teams
where year_id = 2025
  and w > any (select w from teams where year_id = 2024 and lg_win = 'Y')
order by w desc, team_id;`,
        explanation: '> ANY is true if the value beats at least one row of the subquery; > ALL would need it to beat every row. The 2024 pennant winners won 98 and 94 games, so here it means more than 94.',
      },
      {
        approach: '> (SELECT MIN(…))',
        postgres: `select team_id, name, w
from teams
where year_id = 2025
  and w > (select min(w) from teams where year_id = 2024 and lg_win = 'Y')
order by w desc, team_id;`,
        mysql: `select team_id, name, w
from teams
where year_id = 2025
  and w > (select min(w) from teams where year_id = 2024 and lg_win = 'Y')
order by w desc, team_id;`,
        explanation: 'Beating at least one value is the same as beating the smallest one.',
      },
    ],
    comparison: 'Same teams. > ANY reads like the question; MIN/MAX makes the threshold explicit. Beware: with an empty subquery > ANY is false, while comparing with MIN of nothing gives NULL.',
    docs: [
      { label: 'PostgreSQL: ANY/SOME', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-ANY-SOME' },
      { label: 'MySQL: ANY, IN, SOME', url: MY + 'any-in-some-subqueries.html' },
    ],
  },
  {
    id: 'lahman-131',
    dataset: 'lahman',
    level: 2,
    topics: ['pagination'],
    title: 'The next page of home-run leaders',
    prompt:
      'A leaderboard shows 2025 home runs per player (summed over teams), most first, ties by player_id, 10 per page. Page 1 ended with greenri02 on 36. Show page 2 without OFFSET: player_id and hr.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Keyset after the last row',
        postgres: `${BATTING_2025}
select player_id, hr
from hitters
where hr < 36 or (hr = 36 and player_id > 'greenri02')
order by hr desc, player_id
limit 10;`,
        mysql: `${BATTING_2025}
select player_id, hr
from hitters
where hr < 36 or (hr = 36 and player_id > 'greenri02')
order by hr desc, player_id
limit 10;`,
        explanation: 'Continue right after the last row shown, in the same order. The tie-breaker player_id is what makes the position exact when several players share 36.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: LIMIT optimization', url: MY + 'limit-optimization.html' },
    ],
  },
]

export const airlinesPractice: Exercise[] = [
  {
    id: 'airlines-127',
    dataset: 'airlines',
    level: 2,
    topics: ['dates-basics', 'group-by'],
    title: 'The next 24 hours',
    prompt: 'The snapshot is taken at 2025-12-01 00:00 UTC. Count the flights scheduled to depart in the 24 hours after it, by status.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Half-open range from "now"',
        postgres: `select status, count(*) as flights
from flights
where scheduled_departure >= timestamptz '2025-12-01 00:00:00+00'
  and scheduled_departure < timestamptz '2025-12-01 00:00:00+00' + interval '24 hours'
group by status
order by status;`,
        mysql: `select status, count(*) as flights
from flights
where scheduled_departure >= '2025-12-01 00:00:00'
  and scheduled_departure < '2025-12-01 00:00:00' + interval 24 hour
group by status
order by status;`,
        mysqlNote: 'The MySQL copy stores times as DATETIME in UTC, so the plain literal is UTC too.',
        explanation: 'On a live system this is now() and now() + interval \'24 hours\'. A timestamptz literal with +00 is unambiguous whatever the session time zone.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date/time types', url: PG + 'datatype-datetime.html' },
      { label: 'MySQL: DATE_ADD and intervals', url: MY + 'date-and-time-functions.html#function_date-add' },
    ],
  },
  {
    id: 'airlines-128',
    dataset: 'airlines',
    level: 3,
    topics: ['dates-advanced'],
    title: 'Bookings week by week',
    prompt: 'Count bookings made in November 2025 per week (UTC). Show the Monday that starts each week and the count.',
    orderMatters: true,
    solutions: [
      {
        approach: "DATE_TRUNC('week')",
        postgres: `select date_trunc('week', book_date)::date as week_start,
       count(*) as bookings
from bookings
where book_date >= timestamptz '2025-11-01 00:00:00+00'
  and book_date < timestamptz '2025-12-01 00:00:00+00'
group by 1
order by 1;`,
        mysql: `select date(book_date - interval weekday(book_date) day) as week_start,
       count(*) as bookings
from bookings
where book_date >= '2025-11-01'
  and book_date < '2025-12-01'
group by week_start
order by week_start;`,
        mysqlNote: 'Step back WEEKDAY() days to reach Monday.',
        explanation: 'date_trunc on a timestamptz works in the session time zone, set to UTC for this dataset. With another zone, weeks would start at that zone\'s midnight.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: WEEKDAY', url: MY + 'date-and-time-functions.html#function_weekday' },
    ],
  },
  {
    id: 'airlines-129',
    dataset: 'airlines',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Cancel, then think again',
    prompt:
      'Flights 11048 and 11049 are boarding. In one transaction mark 11048 as Cancelled, then roll back. In a second transaction mark 11049 as Delayed and commit.',
    orderMatters: true,
    checkSql: 'select flight_id, status from flights where flight_id in (11048, 11049) order by flight_id',
    solutions: [
      {
        approach: 'ROLLBACK, then COMMIT',
        postgres: `begin;
update flights set status = 'Cancelled' where flight_id = 11048;
rollback;

begin;
update flights set status = 'Delayed' where flight_id = 11049;
commit;`,
        mysql: `start transaction;
update flights set status = 'Cancelled' where flight_id = 11048;
rollback;

start transaction;
update flights set status = 'Delayed' where flight_id = 11049;
commit;`,
        explanation: 'Flight 11048 stays Boarding: its change was rolled back. Only the committed change to 11049 survives.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ROLLBACK', url: PG + 'sql-rollback.html' },
      { label: 'MySQL: START TRANSACTION, COMMIT, ROLLBACK', url: MY + 'commit.html' },
    ],
  },
]

export const adventureworksPractice: Exercise[] = [
  {
    id: 'adventureworks-130',
    dataset: 'adventureworks',
    level: 2,
    topics: ['data-cleaning', 'strings'],
    title: 'Models without the size',
    prompt:
      'Many product names end in a size or colour after the last comma ("HL Road Frame - Black, 58"). How many products have such a suffix (a comma, a space, then letters or digits), and how many different names remain once it is removed?',
    orderMatters: false,
    solutions: [
      {
        approach: 'REGEXP_REPLACE the last part',
        postgres: `select count(*) as with_suffix,
       count(distinct regexp_replace(name, ',[^,]*$', '')) as base_names
from product
where name ~ ', [0-9A-Z]+$';`,
        mysql: `select count(*) as with_suffix,
       count(distinct regexp_replace(name, ',[^,]*$', '')) as base_names
from product
where regexp_like(name, ', [0-9A-Z]+$', 'c');`,
        mysqlNote: "REGEXP_LIKE with 'c' keeps the match case-sensitive, like PostgreSQL's ~.",
        explanation: ',[^,]*$ matches the last comma and everything after it. Stripping variants down to a base name is how you group a catalogue by model.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: POSIX regular expressions', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: REGEXP_REPLACE', url: MY + 'regexp.html#function_regexp-replace' },
    ],
  },
  {
    id: 'adventureworks-131',
    dataset: 'adventureworks',
    level: 4,
    topics: ['dml', 'ddl'],
    title: 'Empty the staging table and restart the numbers',
    prompt:
      'staging (created for you) holds yesterday\'s import with ids 1–3. Empty it in one fast statement that also restarts the id numbering, then insert a row with note \'fresh\'.',
    orderMatters: true,
    setupSql: `create table staging (id int generated by default as identity primary key, note varchar(20));
insert into staging (note) values ('a'), ('b'), ('c');`,
    setupSqlMysql: `create table staging (id int auto_increment primary key, note varchar(20));
insert into staging (note) values ('a'), ('b'), ('c');`,
    checkSql: 'select id, note from staging order by id',
    solutions: [
      {
        approach: 'TRUNCATE … RESTART IDENTITY',
        postgres: `truncate staging restart identity;
insert into staging (note) values ('fresh');`,
        mysql: `truncate table staging;
insert into staging (note) values ('fresh');`,
        mysqlNote: 'MySQL\'s TRUNCATE always resets AUTO_INCREMENT; it also commits at once and cannot be rolled back.',
        explanation:
          'TRUNCATE drops all rows without scanning them, much faster than DELETE on a big table. DELETE FROM staging would keep counting: the new row would get id 4. In PostgreSQL TRUNCATE can still be rolled back inside a transaction.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: TRUNCATE', url: PG + 'sql-truncate.html' },
      { label: 'MySQL: TRUNCATE TABLE', url: MY + 'truncate-table.html' },
    ],
  },
  {
    id: 'adventureworks-132',
    dataset: 'adventureworks',
    level: 4,
    topics: ['privileges'],
    title: 'Remove a role completely',
    prompt:
      'A temporary role temp_staff was given SELECT and INSERT on product and SELECT on vendor (do that first). The contract ended: remove the role entirely.',
    orderMatters: false,
    checkSql: "select count(*) as roles_left from pg_roles where rolname = 'temp_staff'",
    checkSqlMysql: "select count(*) as roles_left from mysql.user where user = 'temp_staff'",
    solutions: [
      {
        approach: 'REVOKE, then DROP ROLE',
        postgres: `create role temp_staff nologin;
grant select, insert on product to temp_staff;
grant select on vendor to temp_staff;

revoke all on product, vendor from temp_staff;
drop role temp_staff;`,
        mysql: `create role temp_staff;
grant select, insert on product to temp_staff;
grant select on vendor to temp_staff;

drop role temp_staff;`,
        mysqlNote: 'MySQL removes an account\'s privileges together with it, so DROP ROLE alone is enough.',
        explanation: 'PostgreSQL refuses to drop a role that still holds privileges ("role cannot be dropped because some objects depend on it"), so revoke them first.',
      },
      {
        approach: 'DROP OWNED BY, then DROP ROLE',
        postgres: `create role temp_staff nologin;
grant select, insert on product to temp_staff;
grant select on vendor to temp_staff;

drop owned by temp_staff;
drop role temp_staff;`,
        mysql: `create role temp_staff;
grant select, insert on product to temp_staff;
grant select on vendor to temp_staff;

drop role temp_staff;`,
        explanation: 'DROP OWNED BY removes every privilege granted to the role (and any objects it owns) in this database, without listing tables.',
      },
    ],
    comparison:
      'Both end with no role. REVOKE is precise when you know the grants; DROP OWNED BY is the standard clean-up when you do not, but it also drops objects the role owns, so check that first.',
    docs: [
      { label: 'PostgreSQL: DROP ROLE', url: PG + 'sql-droprole.html' },
      { label: 'PostgreSQL: DROP OWNED', url: PG + 'sql-drop-owned.html' },
      { label: 'MySQL: DROP ROLE', url: MY + 'drop-role.html' },
    ],
  },
]
