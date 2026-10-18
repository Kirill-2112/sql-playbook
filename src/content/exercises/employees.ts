import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const CURRENT_NOTE = 'A row is current when its to_date is 9999-01-01. The data ends in August 2002; use 2002-08-01 as "today".'
const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

export const employeesExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'employees-001',
    dataset: 'employees',
    level: 1,
    topics: ['select-basics', 'dates-basics'],
    title: 'The first hires',
    prompt: 'Who was hired on the company\'s first day, 1 January 1985? Show emp_no, first_name and last_name, ordered by emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Compare with a date',
        postgres: `select emp_no, first_name, last_name
from employees
where hire_date = '1985-01-01'
order by emp_no;`,
        mysql: `select emp_no, first_name, last_name
from employees
where hire_date = '1985-01-01'
order by emp_no;`,
        explanation: 'hire_date is a DATE, so comparing it with the text \'1985-01-01\' converts the text to a date first.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time input', url: PG + 'datatype-datetime.html#DATATYPE-DATETIME-INPUT' }],
  },
  {
    id: 'employees-002',
    dataset: 'employees',
    level: 1,
    topics: ['dates-basics', 'limit'],
    title: 'The most recent hires',
    prompt: 'Show the 10 most recently hired employees: emp_no, first_name, last_name and hire_date. Same day: higher emp_no first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY … DESC LIMIT',
        postgres: `select emp_no, first_name, last_name, hire_date
from employees
order by hire_date desc, emp_no desc
limit 10;`,
        mysql: `select emp_no, first_name, last_name, hire_date
from employees
order by hire_date desc, emp_no desc
limit 10;`,
        explanation: 'Sort newest first; the second sort key makes the choice among same-day hires predictable.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'employees-003',
    dataset: 'employees',
    level: 1,
    topics: ['conditions', 'strings'],
    title: 'Readable gender',
    prompt: 'For the 10 employees with the lowest emp_no, show emp_no, full name ("First Last") and gender written out as "male" or "female".',
    orderMatters: true,
    solutions: [
      {
        approach: 'CASE + concat',
        postgres: `select emp_no,
       concat(first_name, ' ', last_name) as full_name,
       case gender when 'M' then 'male' when 'F' then 'female' end as gender
from employees
order by emp_no
limit 10;`,
        mysql: `select emp_no,
       concat(first_name, ' ', last_name) as full_name,
       case gender when 'M' then 'male' when 'F' then 'female' end as gender
from employees
order by emp_no
limit 10;`,
        explanation: 'The "simple" CASE form compares one expression with each WHEN value. concat() works the same in both databases.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'employees-004',
    dataset: 'employees',
    level: 1,
    topics: ['select-basics', 'limit'],
    title: 'Highest current salaries',
    prompt: 'Show the 10 highest current salaries with emp_no, highest first; equal salaries by emp_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter on the sentinel date',
        postgres: `select emp_no, salary
from salaries
where to_date = '9999-01-01'
order by salary desc, emp_no
limit 10;`,
        mysql: `select emp_no, salary
from salaries
where to_date = '9999-01-01'
order by salary desc, emp_no
limit 10;`,
        explanation:
          'salaries keeps the whole history. A far-future end date marks the row that is still valid; without that filter, old salaries of the same person would compete too.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'employees-005',
    dataset: 'employees',
    level: 1,
    topics: ['distinct'],
    title: 'Every job title',
    prompt: 'List every job title that has ever been used, once each, alphabetically.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DISTINCT',
        postgres: `select distinct title
from titles
order by title;`,
        mysql: `select distinct title
from titles
order by title;`,
        explanation: 'Each employee has several title rows over time; DISTINCT keeps one per title.',
      },
    ],
    docs: [{ label: 'PostgreSQL: DISTINCT', url: PG + 'queries-select-lists.html#QUERIES-DISTINCT' }],
  },

  // ---------- Level 2 ----------
  {
    id: 'employees-006',
    dataset: 'employees',
    level: 2,
    topics: ['joins'],
    title: 'Where the first hires work now',
    prompt: 'For employees hired on 1985-01-01 who still work here, show emp_no, last_name and their current department name. Order by emp_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Join on the current row',
        postgres: `select e.emp_no, e.last_name, d.dept_name
from employees e
join dept_emp de   on de.emp_no = e.emp_no and de.to_date = '9999-01-01'
join departments d on d.dept_no = de.dept_no
where e.hire_date = '1985-01-01'
order by e.emp_no;`,
        mysql: `select e.emp_no, e.last_name, d.dept_name
from employees e
join dept_emp de   on de.emp_no = e.emp_no and de.to_date = '9999-01-01'
join departments d on d.dept_no = de.dept_no
where e.hire_date = '1985-01-01'
order by e.emp_no;`,
        explanation:
          'Putting "to_date = 9999-01-01" in the join condition picks the current department. People who left have no current row and drop out of the inner join.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'employees-007',
    dataset: 'employees',
    level: 2,
    topics: ['group-by', 'aggregates'],
    title: 'Headcount and pay by department',
    prompt: 'For each department, show dept_name, the number of current employees and their average current salary rounded to whole numbers. Order by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Three joins on current rows',
        postgres: `select d.dept_name,
       count(*) as employees,
       round(avg(s.salary)) as avg_salary
from departments d
join dept_emp de on de.dept_no = d.dept_no and de.to_date = '9999-01-01'
join salaries s  on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        mysql: `select d.dept_name,
       count(*) as employees,
       round(avg(s.salary)) as avg_salary
from departments d
join dept_emp de on de.dept_no = d.dept_no and de.to_date = '9999-01-01'
join salaries s  on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        explanation:
          'Both history tables need the "current" filter. Forget it on salaries and every employee is counted once per past salary, inflating the headcount roughly tenfold.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'employees-008',
    dataset: 'employees',
    level: 2,
    topics: ['group-by'],
    title: 'Well-paid departments',
    prompt: 'Which departments pay their current employees more than 70,000 on average? Show dept_no and the average rounded to whole numbers, highest first.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'HAVING',
        postgres: `select de.dept_no, round(avg(s.salary)) as avg_salary
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no
having avg(s.salary) > 70000
order by avg_salary desc;`,
        mysql: `select de.dept_no, round(avg(s.salary)) as avg_salary
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no
having avg(s.salary) > 70000
order by avg_salary desc;`,
        explanation: 'HAVING compares the unrounded average; rounding is only for display.',
      },
    ],
    docs: [{ label: 'PostgreSQL: HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'employees-009',
    dataset: 'employees',
    level: 2,
    topics: ['subqueries', 'group-by'],
    title: 'People who left',
    prompt: 'How many employees no longer work at the company (they have no current salary)?',
    hint: CURRENT_NOTE,
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS a current row',
        postgres: `select count(*) as left_company
from employees e
where not exists (
  select 1 from salaries s where s.emp_no = e.emp_no and s.to_date = '9999-01-01'
);`,
        mysql: `select count(*) as left_company
from employees e
where not exists (
  select 1 from salaries s where s.emp_no = e.emp_no and s.to_date = '9999-01-01'
);`,
        explanation: 'Count employees for whom no current salary exists.',
      },
      {
        approach: 'Last salary ended',
        postgres: `select count(*) as left_company
from (
  select emp_no
  from salaries
  group by emp_no
  having max(to_date) < '9999-01-01'
) ended;`,
        mysql: `select count(*) as left_company
from (
  select emp_no
  from salaries
  group by emp_no
  having max(to_date) < '9999-01-01'
) ended;`,
        explanation: 'Group each employee\'s salaries; if even the latest one has ended, they are gone.',
      },
    ],
    comparison:
      'Same count. NOT EXISTS starts from employees, so it would also count someone who never had a salary row at all. The HAVING version only sees people who appear in salaries. Here every employee has salaries, so they agree.',
    docs: [{ label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' }],
  },
  {
    id: 'employees-010',
    dataset: 'employees',
    level: 2,
    topics: ['conditional-aggregates', 'numbers'],
    title: 'Gender balance by department',
    prompt:
      'For each department: current men, current women and the share of women in percent (1 decimal). Show dept_no, men, women, women_pct, ordered by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select de.dept_no,
       count(*) filter (where e.gender = 'M') as men,
       count(*) filter (where e.gender = 'F') as women,
       round(100.0 * count(*) filter (where e.gender = 'F') / count(*), 1) as women_pct
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; see solution B.',
        explanation: 'Three counts over the same groups, each with its own filter.',
      },
      {
        approach: 'SUM(boolean)',
        postgres: `select de.dept_no,
       sum(case when e.gender = 'M' then 1 else 0 end) as men,
       sum(case when e.gender = 'F' then 1 else 0 end) as women,
       round(100.0 * sum(case when e.gender = 'F' then 1 else 0 end) / count(*), 1) as women_pct
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        mysql: `select de.dept_no,
       sum(e.gender = 'M') as men,
       sum(e.gender = 'F') as women,
       round(100.0 * sum(e.gender = 'F') / count(*), 1) as women_pct
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        mysqlNote: 'In MySQL a comparison is a number (1 or 0), so SUM(gender = \'F\') counts directly. PostgreSQL booleans are not numbers, hence the CASE.',
        explanation: 'Add 1 for each matching row.',
      },
    ],
    comparison:
      'Same numbers. FILTER is clearest in PostgreSQL. MySQL\'s SUM(condition) is a well-known shortcut but does not port: in PostgreSQL you would need SUM((gender = \'F\')::int).',
    docs: [{ label: 'PostgreSQL: FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'employees-011',
    dataset: 'employees',
    level: 2,
    topics: ['aggregates', 'dates-advanced'],
    title: 'Seniority by title',
    prompt:
      'For each current title, show the number of employees holding it and their average years of service as of 2002-08-01 (1 decimal, days ÷ 365.25). Order by average years, longest first, then by title.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Date difference in days',
        postgres: `select t.title,
       count(*) as employees,
       round(avg((date '2002-08-01' - e.hire_date) / 365.25), 1) as avg_years
from titles t
join employees e on e.emp_no = t.emp_no
where t.to_date = '9999-01-01'
group by t.title
order by avg_years desc, t.title;`,
        mysql: `select t.title,
       count(*) as employees,
       round(avg(datediff('2002-08-01', e.hire_date) / 365.25), 1) as avg_years
from titles t
join employees e on e.emp_no = t.emp_no
where t.to_date = '9999-01-01'
group by t.title
order by avg_years desc, t.title;`,
        mysqlNote: 'DATEDIFF(later, earlier) gives days; PostgreSQL subtracts dates directly.',
        explanation: 'Days of service divided by the average length of a year.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: DATEDIFF()', url: MY + 'date-and-time-functions.html#function_datediff' },
    ],
  },
  {
    id: 'employees-012',
    dataset: 'employees',
    level: 2,
    topics: ['text-aggregation'],
    title: 'Career paths',
    prompt:
      'For employees numbered 10001 to 10300 who are in the sample, show emp_no and their titles in time order joined by " → ". Order by emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg … ORDER BY',
        postgres: `select emp_no,
       string_agg(title, ' → ' order by from_date) as career
from titles
where emp_no between 10001 and 10300
group by emp_no
order by emp_no;`,
        mysql: `select emp_no,
       group_concat(title order by from_date separator ' → ') as career
from titles
where emp_no between 10001 and 10300
group by emp_no
order by emp_no;`,
        mysqlNote: 'GROUP_CONCAT(… ORDER BY … SEPARATOR …).',
        explanation: 'The order inside the aggregate is what turns a set of titles into a path.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'employees-013',
    dataset: 'employees',
    level: 2,
    topics: ['set-operations', 'group-by'],
    title: 'Promoted engineers',
    prompt: 'How many employees have held both the "Engineer" and the "Senior Engineer" title at some point?',
    orderMatters: false,
    solutions: [
      {
        approach: 'INTERSECT',
        postgres: `select count(*) as promoted
from (
  select emp_no from titles where title = 'Engineer'
  intersect
  select emp_no from titles where title = 'Senior Engineer'
) both_titles;`,
        mysql: `select count(*) as promoted
from (
  select emp_no from titles where title = 'Engineer'
  intersect
  select emp_no from titles where title = 'Senior Engineer'
) both_titles;`,
        explanation: 'Employees with one title, intersected with employees with the other.',
      },
      {
        approach: 'GROUP BY … HAVING',
        postgres: `select count(*) as promoted
from (
  select emp_no
  from titles
  where title in ('Engineer', 'Senior Engineer')
  group by emp_no
  having count(distinct title) = 2
) both_titles;`,
        mysql: `select count(*) as promoted
from (
  select emp_no
  from titles
  where title in ('Engineer', 'Senior Engineer')
  group by emp_no
  having count(distinct title) = 2
) both_titles;`,
        explanation: 'Keep only the two titles, then require both in each employee\'s group.',
      },
    ],
    comparison: 'Same count. INTERSECT is the most literal; HAVING count(distinct …) extends to "all of these N titles".',
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'employees-014',
    dataset: 'employees',
    level: 2,
    topics: ['numbers', 'casting'],
    title: 'Monthly pay',
    prompt:
      'For the 5 highest current salaries, show emp_no, salary, monthly pay with cents (2 decimals) and monthly pay in whole currency units (remainder dropped). Order by salary, highest first, then emp_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer vs decimal division',
        postgres: `select emp_no, salary,
       round(salary / 12.0, 2) as monthly,
       salary / 12 as monthly_whole
from salaries
where to_date = '9999-01-01'
order by salary desc, emp_no
limit 5;`,
        mysql: `select emp_no, salary,
       round(salary / 12, 2) as monthly,
       salary div 12 as monthly_whole
from salaries
where to_date = '9999-01-01'
order by salary desc, emp_no
limit 5;`,
        mysqlNote: 'In MySQL, salary / 12 is already a decimal; whole division is DIV.',
        explanation: 'In PostgreSQL, integer / integer drops the remainder, so salary / 12 is the whole amount and salary / 12.0 keeps the cents.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Mathematical operators', url: PG + 'functions-math.html' },
      { label: 'MySQL: DIV', url: MY + 'arithmetic-functions.html#operator_div' },
    ],
  },

  // ---------- Level 3 ----------
  {
    id: 'employees-015',
    dataset: 'employees',
    level: 3,
    topics: ['lag-lead'],
    title: 'The biggest raises',
    prompt:
      'Find the 5 biggest single raises: emp_no, the date of the raise, the previous salary, the new salary and the raise. Ties by emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG()',
        postgres: `select emp_no, from_date as raised_on, previous, salary, salary - previous as raise
from (
  select emp_no, from_date, salary,
         lag(salary) over (partition by emp_no order by from_date) as previous
  from salaries
) s
where previous is not null
order by raise desc, emp_no
limit 5;`,
        mysql: `select emp_no, from_date as raised_on, previous, salary, salary - previous as raise
from (
  select emp_no, from_date, salary,
         lag(salary) over (partition by emp_no order by from_date) as previous
  from salaries
) s
where previous is not null
order by raise desc, emp_no
limit 5;`,
        explanation: 'LAG(salary) within each employee, ordered by date, gives the salary just before each change.',
      },
    ],
    docs: [{ label: 'PostgreSQL: lag()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-016',
    dataset: 'employees',
    level: 3,
    topics: ['lag-lead', 'conditional-aggregates'],
    title: 'Pay cuts',
    prompt:
      'Salaries sometimes went down. How many employees had at least one decrease, how many decreases were there in total, and what was the largest single drop?',
    orderMatters: false,
    solutions: [
      {
        approach: 'LAG() then aggregate',
        postgres: `with changes as (
  select emp_no, salary - lag(salary) over (partition by emp_no order by from_date) as diff
  from salaries
)
select count(distinct emp_no) as employees,
       count(*) as decreases,
       -min(diff) as largest_drop
from changes
where diff < 0;`,
        mysql: `with changes as (
  select emp_no, salary - lag(salary) over (partition by emp_no order by from_date) as diff
  from salaries
)
select count(distinct emp_no) as employees,
       count(*) as decreases,
       -min(diff) as largest_drop
from changes
where diff < 0;`,
        mysqlNote: 'Do not call the column "change": CHANGE is a reserved word in MySQL (ALTER TABLE … CHANGE), though not in PostgreSQL.',
        explanation:
          'First compute every change with LAG, then keep the negative ones. The filter has to happen outside, because WHERE runs before window functions.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'employees-017',
    dataset: 'employees',
    level: 3,
    topics: ['ranking'],
    title: 'Top earners per department',
    prompt:
      'For each department, the 3 current employees with the highest current salary: dept_no, emp_no, salary and place. Ties by emp_no. Order by dept_no, then place.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'ROW_NUMBER()',
        postgres: `select dept_no, emp_no, salary, place
from (
  select de.dept_no, s.emp_no, s.salary,
         row_number() over (partition by de.dept_no order by s.salary desc, s.emp_no) as place
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
  where de.to_date = '9999-01-01'
) ranked
where place <= 3
order by dept_no, place;`,
        mysql: `select dept_no, emp_no, salary, place
from (
  select de.dept_no, s.emp_no, s.salary,
         row_number() over (partition by de.dept_no order by s.salary desc, s.emp_no) as place
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
  where de.to_date = '9999-01-01'
) ranked
where place <= 3
order by dept_no, place;`,
        explanation: 'Rank within each department and keep the first three.',
      },
    ],
    docs: [{ label: 'PostgreSQL: row_number()', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-018',
    dataset: 'employees',
    level: 3,
    topics: ['cte', 'dates-advanced'],
    title: 'Headcount on a given day',
    prompt: 'How many people worked in each department on 1995-01-01? Show dept_no and headcount, ordered by dept_no.',
    hint: 'A row is valid on a day when from_date <= day < to_date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'As-of filter',
        postgres: `select dept_no, count(*) as headcount
from dept_emp
where from_date <= '1995-01-01'
  and to_date   >  '1995-01-01'
group by dept_no
order by dept_no;`,
        mysql: `select dept_no, count(*) as headcount
from dept_emp
where from_date <= '1995-01-01'
  and to_date   >  '1995-01-01'
group by dept_no
order by dept_no;`,
        explanation:
          'History tables answer "as of" questions with one condition: the period must contain the day. Using > for to_date treats the end date as the first day the row is no longer valid.',
      },
      {
        approach: 'BETWEEN',
        postgres: `select dept_no, count(*) as headcount
from dept_emp
where date '1995-01-01' between from_date and to_date - 1
group by dept_no
order by dept_no;`,
        mysql: `select dept_no, count(*) as headcount
from dept_emp
where '1995-01-01' between from_date and to_date - interval 1 day
group by dept_no
order by dept_no;`,
        mysqlNote: 'MySQL subtracts a day with - INTERVAL 1 DAY; date - 1 would turn the date into a number.',
        explanation: 'BETWEEN includes both ends, so the end date is shifted back by one day to keep the same half-open meaning.',
      },
    ],
    comparison:
      'Same counts. The explicit pair of comparisons is clearer about which end is included and can use an index on from_date. BETWEEN reads nicely but is easy to get wrong by one day.',
    docs: [{ label: 'PostgreSQL: Comparison operators', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'employees-019',
    dataset: 'employees',
    level: 3,
    topics: ['date-series', 'recursive'],
    title: 'Headcount at the start of every year',
    prompt: 'Show the company headcount on 1 January of every year from 1986 to 2002 (year and headcount).',
    hint: 'Count dept_emp rows valid on that day: from_date <= day < to_date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select extract(year from y.day)::int as year, count(de.emp_no) as headcount
from generate_series(date '1986-01-01', date '2002-01-01', interval '1 year') as y(day)
left join dept_emp de
       on de.from_date <= y.day and de.to_date > y.day
group by y.day
order by y.day;`,
        mysql: null,
        mysqlNote: 'MySQL has no generate_series; use the recursive CTE in solution B.',
        explanation: 'One row per year, joined to the department assignments valid on that day.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive years(day) as (
  select date '1986-01-01'
  union all
  select (day + interval '1 year')::date from years where day < date '2002-01-01'
)
select extract(year from y.day)::int as year, count(de.emp_no) as headcount
from years y
left join dept_emp de
       on de.from_date <= y.day and de.to_date > y.day
group by y.day
order by y.day;`,
        mysql: `with recursive years(day) as (
  select date '1986-01-01'
  union all
  select day + interval 1 year from years where day < '2002-01-01'
)
select year(y.day) as year, count(de.emp_no) as headcount
from years y
left join dept_emp de
       on de.from_date <= y.day and de.to_date > y.day
group by y.day
order by y.day;`,
        mysqlNote: 'interval 1 year without quotes, YEAR() instead of extract.',
        explanation: 'Generate the dates recursively, then join exactly as in A.',
      },
    ],
    comparison:
      'Same 17 rows. Someone who moved departments is never counted twice on the same day, because their old assignment ends exactly when the new one starts.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'employees-020',
    dataset: 'employees',
    level: 3,
    topics: ['pivot'],
    title: 'Titles by department',
    prompt:
      'Show, for each department, how many current employees hold each title, with one column per title: staff, senior_staff, engineer, senior_engineer, assistant_engineer, technique_leader, manager. Order by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts',
        postgres: `select de.dept_no,
       count(case when t.title = 'Staff' then 1 end)              as staff,
       count(case when t.title = 'Senior Staff' then 1 end)       as senior_staff,
       count(case when t.title = 'Engineer' then 1 end)           as engineer,
       count(case when t.title = 'Senior Engineer' then 1 end)    as senior_engineer,
       count(case when t.title = 'Assistant Engineer' then 1 end) as assistant_engineer,
       count(case when t.title = 'Technique Leader' then 1 end)   as technique_leader,
       count(case when t.title = 'Manager' then 1 end)            as manager
from dept_emp de
join titles t on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        mysql: `select de.dept_no,
       count(case when t.title = 'Staff' then 1 end)              as staff,
       count(case when t.title = 'Senior Staff' then 1 end)       as senior_staff,
       count(case when t.title = 'Engineer' then 1 end)           as engineer,
       count(case when t.title = 'Senior Engineer' then 1 end)    as senior_engineer,
       count(case when t.title = 'Assistant Engineer' then 1 end) as assistant_engineer,
       count(case when t.title = 'Technique Leader' then 1 end)   as technique_leader,
       count(case when t.title = 'Manager' then 1 end)            as manager
from dept_emp de
join titles t on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        explanation: 'Each column counts the rows of one title: the classic pivot with conditional aggregation.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'employees-021',
    dataset: 'employees',
    level: 3,
    topics: ['subtotals'],
    title: 'Headcount with subtotals',
    prompt:
      'Count current employees by department and gender, with a subtotal per department (gender shown as "all") and a grand total (department shown as "all"). Order does not matter.',
    hint: CURRENT_NOTE,
    orderMatters: false,
    solutions: [
      {
        approach: 'ROLLUP + GROUPING()',
        postgres: `select case when grouping(de.dept_no) = 1 then 'all' else de.dept_no end as dept_no,
       case when grouping(e.gender) = 1 then 'all' else e.gender end as gender,
       count(*) as employees
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by rollup (de.dept_no, e.gender);`,
        mysql: `select case when grouping(de.dept_no) = 1 then 'all' else de.dept_no end as dept_no,
       case when grouping(e.gender) = 1 then 'all' else e.gender end as gender,
       count(*) as employees
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no, e.gender with rollup;`,
        mysqlNote: 'WITH ROLLUP after the column list.',
        explanation: 'ROLLUP adds a subtotal per department and a grand total; GROUPING() tells those rows apart.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'employees-022',
    dataset: 'employees',
    level: 3,
    topics: ['conditional-aggregates', 'lag-lead'],
    title: 'Never a pay cut',
    prompt: 'Among employees with at least 15 salary records, how many never had their salary go down?',
    orderMatters: false,
    solutions: [
      {
        approach: 'bool_and',
        postgres: `with changes as (
  select emp_no, salary >= lag(salary) over (partition by emp_no order by from_date) as no_cut
  from salaries
)
select count(*) as employees
from (
  select emp_no
  from changes
  group by emp_no
  having count(*) >= 15 and bool_and(coalesce(no_cut, true))
) steady;`,
        mysql: null,
        mysqlNote: 'MySQL has no bool_and. Use MIN() over 0/1 values, as in solution B.',
        explanation: 'bool_and is true only if the condition holds for every row in the group. The first record has no previous salary, so it counts as fine.',
      },
      {
        approach: 'MIN over 0/1',
        postgres: `with changes as (
  select emp_no,
         case when salary < lag(salary) over (partition by emp_no order by from_date) then 0 else 1 end as no_cut
  from salaries
)
select count(*) as employees
from (
  select emp_no
  from changes
  group by emp_no
  having count(*) >= 15 and min(no_cut) = 1
) steady;`,
        mysql: `with changes as (
  select emp_no,
         case when salary < lag(salary) over (partition by emp_no order by from_date) then 0 else 1 end as no_cut
  from salaries
)
select count(*) as employees
from (
  select emp_no
  from changes
  group by emp_no
  having count(*) >= 15 and min(no_cut) = 1
) steady;`,
        explanation: 'Encode "ok" as 1 and "cut" as 0; the group is clean if its minimum is 1.',
      },
    ],
    comparison:
      'Same count. bool_and (and its partner bool_or) say exactly "for all" / "exists" but are PostgreSQL-only. MIN/MAX over 0/1 is the portable equivalent.',
    docs: [{ label: 'PostgreSQL: bool_and', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'employees-023',
    dataset: 'employees',
    level: 3,
    topics: ['self-cross-join', 'dates-advanced'],
    title: 'Who was the boss on your first day?',
    prompt:
      'For employees 10001 to 10100 who are in the sample, show emp_no, the department they started in, and the emp_no of that department\'s manager on their hire date. Order by emp_no.',
    hint: 'A row is valid on a day when from_date <= day < to_date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join on overlapping periods',
        postgres: `select e.emp_no, de.dept_no, dm.emp_no as manager
from employees e
join dept_emp de     on de.emp_no = e.emp_no
                    and de.from_date <= e.hire_date and de.to_date > e.hire_date
join dept_manager dm on dm.dept_no = de.dept_no
                    and dm.from_date <= e.hire_date and dm.to_date > e.hire_date
where e.emp_no between 10001 and 10100
order by e.emp_no;`,
        mysql: `select e.emp_no, de.dept_no, dm.emp_no as manager
from employees e
join dept_emp de     on de.emp_no = e.emp_no
                    and de.from_date <= e.hire_date and de.to_date > e.hire_date
join dept_manager dm on dm.dept_no = de.dept_no
                    and dm.from_date <= e.hire_date and dm.to_date > e.hire_date
where e.emp_no between 10001 and 10100
order by e.emp_no;`,
        explanation:
          'Both joins are "as of" the hire date: the department assignment and the manager record must both be valid on that day. This kind of join on time ranges is common with history tables.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },

  // ---------- Level 4–5 ----------
  {
    id: 'employees-024',
    dataset: 'employees',
    level: 4,
    topics: ['views'],
    title: 'A view of the current state',
    prompt: 'Create a view current_staff(emp_no, last_name, dept_no, title, salary) with one row per employee who still works here.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select * from current_staff order by salary desc, emp_no limit 5`,
    solutions: [
      {
        approach: 'View over current rows',
        postgres: `create view current_staff as
select e.emp_no, e.last_name, de.dept_no, t.title, s.salary
from employees e
join dept_emp de on de.emp_no = e.emp_no and de.to_date = '9999-01-01'
join titles t    on t.emp_no = e.emp_no and t.to_date = '9999-01-01'
join salaries s  on s.emp_no = e.emp_no and s.to_date = '9999-01-01';`,
        mysql: `create view current_staff as
select e.emp_no, e.last_name, de.dept_no, t.title, s.salary
from employees e
join dept_emp de on de.emp_no = e.emp_no and de.to_date = '9999-01-01'
join titles t    on t.emp_no = e.emp_no and t.to_date = '9999-01-01'
join salaries s  on s.emp_no = e.emp_no and s.to_date = '9999-01-01';`,
        explanation:
          'Hide the "to_date = 9999-01-01" detail behind a view, and every later query about the present becomes a simple SELECT.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'employees-025',
    dataset: 'employees',
    level: 5,
    topics: ['partial-covering-indexes', 'indexes'],
    title: 'An index for current salaries',
    prompt:
      'Almost every query here asks for the current salary (to_date = 9999-01-01) of an employee. Create an index on salaries that serves those lookups.',
    orderMatters: false,
    checkSql: `select count(*) as indexes_using_to_date
from pg_indexes
where tablename = 'salaries' and indexdef like '%to_date%'`,
    checkSqlMysql: `select count(distinct index_name) as indexes_using_to_date
from information_schema.statistics
where table_schema = database() and table_name = 'salaries' and column_name = 'to_date'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index salaries_current_idx on salaries (emp_no)
where to_date = '9999-01-01';`,
        mysql: null,
        mysqlNote: 'MySQL has no partial indexes; index both columns (solution B).',
        explanation:
          'Only the current rows are indexed: about one in ten salary rows. The planner uses it for queries that include the same condition.',
      },
      {
        approach: 'Composite index',
        postgres: `create index salaries_emp_to_date_idx on salaries (emp_no, to_date);`,
        mysql: `create index salaries_emp_to_date_idx on salaries (emp_no, to_date);`,
        explanation: 'An index on (emp_no, to_date) finds "this employee, current row" directly, and also helps other date filters.',
      },
    ],
    comparison:
      'Both serve the lookup. The partial index is about ten times smaller here and cheaper to maintain, but only helps queries with exactly that condition. The composite index is bigger and more general.',
    docs: [
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
      { label: 'PostgreSQL: Multicolumn indexes', url: PG + 'indexes-multicolumn.html' },
    ],
  },
  {
    id: 'employees-026',
    dataset: 'employees',
    level: 5,
    topics: ['partitioning'],
    title: 'Split salaries by period',
    prompt:
      'Create salaries_by_period with the same columns as salaries, partitioned by from_date into four ranges: before 1990, 1990–1994, 1995–1999, and 2000 onwards. Then copy every salary into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'salaries_by_period'::regclass) as partitions,
       (select count(*) from salaries_by_period) as total_rows,
       (select count(*) from salaries_by_period where from_date >= '1990-01-01' and from_date < '1995-01-01') as rows_1990_1994`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'salaries_by_period') as partitions,
       (select count(*) from salaries_by_period) as total_rows,
       (select count(*) from salaries_by_period where from_date >= '1990-01-01' and from_date < '1995-01-01') as rows_1990_1994`,
    solutions: [
      {
        approach: 'Declarative range partitioning',
        postgres: `create table salaries_by_period (
  emp_no    integer not null,
  salary    integer not null,
  from_date date    not null,
  to_date   date    not null,
  primary key (emp_no, from_date)
) partition by range (from_date);

create table salaries_before_1990 partition of salaries_by_period for values from (minvalue) to ('1990-01-01');
create table salaries_1990_1994  partition of salaries_by_period for values from ('1990-01-01') to ('1995-01-01');
create table salaries_1995_1999  partition of salaries_by_period for values from ('1995-01-01') to ('2000-01-01');
create table salaries_2000_on    partition of salaries_by_period for values from ('2000-01-01') to (maxvalue);

insert into salaries_by_period select emp_no, salary, from_date, to_date from salaries;`,
        mysql: `create table salaries_by_period (
  emp_no    integer not null,
  salary    integer not null,
  from_date date    not null,
  to_date   date    not null,
  primary key (emp_no, from_date)
)
partition by range (year(from_date)) (
  partition p_before_1990 values less than (1990),
  partition p_1990_1994   values less than (1995),
  partition p_1995_1999   values less than (2000),
  partition p_2000_on     values less than maxvalue
);

insert into salaries_by_period select emp_no, salary, from_date, to_date from salaries;`,
        mysqlNote:
          'In MySQL the partitions are listed inside CREATE TABLE and are not separate tables. The partitioning column must be part of every unique key, here the primary key.',
        explanation:
          'In PostgreSQL each partition is a real table attached to the parent. Rows are routed to the right partition on insert, and queries that filter on from_date only read the partitions they need. The primary key must include the partition key.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE partitioning', url: MY + 'partitioning-range.html' },
    ],
  },
  {
    id: 'employees-027',
    dataset: 'employees',
    level: 5,
    topics: ['functions', 'dates-advanced'],
    title: 'Salary on any date',
    prompt: 'Write a function salary_on(p_emp_no, p_day) that returns the employee\'s salary on that day, or NULL if they had none.',
    orderMatters: false,
    checkSql: `select salary_on(10050, '1990-06-01') as in_1990,
       salary_on(10050, '2002-01-01') as in_2002,
       salary_on(10050, '1980-01-01') as before_hire`,
    solutions: [
      {
        approach: 'SQL function',
        postgres: `create function salary_on(p_emp_no integer, p_day date)
returns integer
language sql
stable
as $$
  select salary
  from salaries
  where emp_no = p_emp_no
    and from_date <= p_day
    and to_date > p_day;
$$;`,
        mysql: `create function salary_on(p_emp_no integer, p_day date)
returns integer
reads sql data
begin
  return (
    select salary
    from salaries
    where emp_no = p_emp_no
      and from_date <= p_day
      and to_date > p_day
  );
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'The "as of" condition from the earlier exercises, packed into a reusable function. When no row matches, a SQL function returning a single value gives NULL.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Query language (SQL) functions', url: PG + 'xfunc-sql.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'employees-028',
    dataset: 'employees',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'A procedure for raises',
    prompt:
      'Write a procedure give_raise(p_emp_no, p_pct, p_day): end the employee\'s current salary on p_day and add a new current salary that is p_pct percent higher (rounded to whole units), starting on p_day.',
    orderMatters: true,
    checkSql: `call give_raise(10050, 5, '2002-08-01');
select salary, from_date, to_date from salaries where emp_no = 10050 order by from_date desc limit 2`,
    solutions: [
      {
        approach: 'Close and insert',
        postgres: `create procedure give_raise(p_emp_no integer, p_pct numeric, p_day date)
language sql
as $$
  update salaries
  set to_date = p_day
  where emp_no = p_emp_no and to_date = '9999-01-01';

  insert into salaries (emp_no, salary, from_date, to_date)
  select emp_no, round(salary * (1 + p_pct / 100)), p_day, '9999-01-01'
  from salaries
  where emp_no = p_emp_no and to_date = p_day;
$$;`,
        mysql: `create procedure give_raise(in p_emp_no integer, in p_pct decimal(5, 2), in p_day date)
modifies sql data
begin
  update salaries
  set to_date = p_day
  where emp_no = p_emp_no and to_date = '9999-01-01';

  insert into salaries (emp_no, salary, from_date, to_date)
  select emp_no, round(salary * (1 + p_pct / 100)), p_day, '9999-01-01'
  from salaries
  where emp_no = p_emp_no and to_date = p_day;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'History tables are never updated in place: the old row is closed and a new one opened, so the past stays queryable. The insert reads the row that was just closed to compute the new salary.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'employees-029',
    dataset: 'employees',
    level: 4,
    topics: ['dml', 'transactions'],
    title: 'Someone leaves',
    prompt: 'Employee 10100 leaves on 2002-08-01. End their current salary, title and department rows on that date.',
    orderMatters: false,
    checkSql: `select (select count(*) from salaries where emp_no = 10100 and to_date = '9999-01-01')
     + (select count(*) from titles   where emp_no = 10100 and to_date = '9999-01-01')
     + (select count(*) from dept_emp where emp_no = 10100 and to_date = '9999-01-01') as still_current,
       (select max(to_date) from salaries where emp_no = 10100) as last_salary_day`,
    solutions: [
      {
        approach: 'Three UPDATEs',
        postgres: `update salaries set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
update titles   set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
update dept_emp set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';`,
        mysql: `update salaries set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
update titles   set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
update dept_emp set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';`,
        mysqlNote:
          'MySQL can also update several tables in one statement: UPDATE salaries s JOIN titles t … SET s.to_date = …, t.to_date = …. Outside this sandbox, wrap the three statements in START TRANSACTION … COMMIT so they succeed or fail together.',
        explanation: 'Three simple statements. In real code run them in one transaction, so nobody ever sees the employee half-gone.',
      },
      {
        approach: 'Data-modifying CTEs',
        postgres: `with s as (
  update salaries set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01' returning 1
),
t as (
  update titles set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01' returning 1
)
update dept_emp set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';`,
        mysql: null,
        mysqlNote: 'MySQL does not allow UPDATE inside WITH. Use solution A, or MySQL\'s multi-table UPDATE.',
        explanation: 'PostgreSQL lets a WITH clause contain UPDATE, INSERT or DELETE, so one statement changes all three tables atomically.',
      },
    ],
    comparison:
      'Same end state. Separate statements are clearest and portable; inside a transaction they are just as safe. The writable CTE is a single atomic statement, a PostgreSQL feature worth knowing when changes must happen together.',
    docs: [
      { label: 'PostgreSQL: Data-modifying statements in WITH', url: PG + 'queries-with.html#QUERIES-WITH-MODIFYING' },
      { label: 'MySQL: UPDATE (multiple-table)', url: MY + 'update.html' },
    ],
  },
  {
    id: 'employees-030',
    dataset: 'employees',
    level: 4,
    topics: ['constraints'],
    title: 'A period cannot end before it starts',
    prompt:
      'Add CHECK constraints so that in salaries and in titles, to_date is never earlier than from_date. (Try the stricter "later than" first and see what happens.)',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints
from pg_constraint
where conrelid in ('salaries'::regclass, 'titles'::regclass) and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name in ('salaries', 'titles') and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'CHECK on two columns',
        postgres: `alter table salaries add constraint salaries_period_check check (to_date >= from_date);
alter table titles   add constraint titles_period_check   check (to_date >= from_date);`,
        mysql: `alter table salaries add constraint salaries_period_check check (to_date >= from_date);
alter table titles   add constraint titles_period_check   check (to_date >= from_date);`,
        explanation:
          'A CHECK may compare columns of the same row, and adding it validates every existing row first. "to_date > from_date" fails here: three rows (employees 260100 and 426600) have a period that starts and ends on the same day. Either allow that, as here, or clean those rows first. PostgreSQL can also add a constraint NOT VALID, which checks only new rows until VALIDATE CONSTRAINT runs; MySQL has no such option.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' }],
  },
  {
    id: 'employees-031',
    dataset: 'employees',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'A projects table',
    prompt:
      'Create projects: an id the database generates, dept_no referencing departments, a required name, and a budget that defaults to 0. Then add two projects for department d005 without giving ids.',
    orderMatters: true,
    checkSql: `select id, dept_no, name, budget from projects order by id`,
    solutions: [
      {
        approach: 'Identity column',
        postgres: `create table projects (
  id      integer generated always as identity primary key,
  dept_no varchar(4)    not null references departments (dept_no),
  name    varchar(100)  not null,
  budget  numeric(12, 2) not null default 0
);

insert into projects (dept_no, name) values ('d005', 'Payroll rewrite');
insert into projects (dept_no, name, budget) values ('d005', 'Search', 50000);`,
        mysql: `create table projects (
  id      int auto_increment primary key,
  dept_no char(4)        not null,
  name    varchar(100)   not null,
  budget  decimal(12, 2) not null default 0,
  foreign key (dept_no) references departments (dept_no)
);

insert into projects (dept_no, name) values ('d005', 'Payroll rewrite');
insert into projects (dept_no, name, budget) values ('d005', 'Search', 50000);`,
        mysqlNote: 'AUTO_INCREMENT instead of an identity column. Write the foreign key as a separate clause: MySQL 8.4 parses a REFERENCES written inside a column definition but silently ignores it (it is enforced only from MySQL 9.0).',
        explanation:
          'GENERATED ALWAYS AS IDENTITY is the standard way to number rows; "always" refuses a hand-written id unless you insist with OVERRIDING SYSTEM VALUE. A column left out of the INSERT gets its DEFAULT.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Identity columns', url: PG + 'ddl-identity-columns.html' },
      { label: 'MySQL: AUTO_INCREMENT', url: MY + 'example-auto-increment.html' },
    ],
  },
  {
    id: 'employees-032',
    dataset: 'employees',
    level: 3,
    topics: ['lateral'],
    title: 'The latest hires of each department',
    prompt: 'For every department, show its 2 most recently hired current employees: dept_name, emp_no and hire_date. Same hire date: higher emp_no first.',
    hint: 'A current department assignment has to_date = 9999-01-01.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 2',
        postgres: `select d.dept_name, latest.emp_no, latest.hire_date
from departments d
cross join lateral (
  select e.emp_no, e.hire_date
  from dept_emp de
  join employees e on e.emp_no = de.emp_no
  where de.dept_no = d.dept_no and de.to_date = '9999-01-01'
  order by e.hire_date desc, e.emp_no desc
  limit 2
) as latest
order by d.dept_name, latest.hire_date desc, latest.emp_no desc;`,
        mysql: `select d.dept_name, latest.emp_no, latest.hire_date
from departments d
cross join lateral (
  select e.emp_no, e.hire_date
  from dept_emp de
  join employees e on e.emp_no = de.emp_no
  where de.dept_no = d.dept_no and de.to_date = '9999-01-01'
  order by e.hire_date desc, e.emp_no desc
  limit 2
) as latest
order by d.dept_name, latest.hire_date desc, latest.emp_no desc;`,
        mysqlNote: 'LATERAL exists since MySQL 8.0.14.',
        explanation: '"Top N per group" with LATERAL: the subquery is evaluated per department and may use d.dept_no.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'employees-033',
    dataset: 'employees',
    level: 3,
    topics: ['window-frames', 'group-by'],
    title: 'Hires per year, and the total so far',
    prompt: 'For each hire year, show the number of employees hired that year and the cumulative number hired up to and including that year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Running sum over grouped rows',
        postgres: `select extract(year from hire_date)::int as hire_year,
       count(*) as hired,
       sum(count(*)) over (order by extract(year from hire_date) rows between unbounded preceding and current row) as hired_so_far
from employees
group by extract(year from hire_date)
order by hire_year;`,
        mysql: `select year(hire_date) as hire_year,
       count(*) as hired,
       sum(count(*)) over (order by year(hire_date) rows between unbounded preceding and current row) as hired_so_far
from employees
group by year(hire_date)
order by hire_year;`,
        explanation: 'GROUP BY first makes one row per year; the window then adds up the yearly counts in year order.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'employees-034',
    dataset: 'employees',
    level: 4,
    topics: ['transactions', 'dml'],
    title: 'Move an employee to another department',
    prompt:
      'Employee 10050 moves from d007 to d005 on 2002-08-01. Close the current assignment and open the new one in one transaction. In PostgreSQL you are already inside a transaction.',
    hint: 'The current assignment has to_date = 9999-01-01; the new one gets that end date.',
    orderMatters: true,
    checkSql: `select dept_no, from_date, to_date from dept_emp where emp_no = 10050 order by from_date`,
    solutions: [
      {
        approach: 'Close and open',
        postgres: `update dept_emp set to_date = '2002-08-01'
where emp_no = 10050 and to_date = '9999-01-01';

insert into dept_emp (emp_no, dept_no, from_date, to_date)
values (10050, 'd005', '2002-08-01', '9999-01-01');`,
        mysql: `start transaction;

update dept_emp set to_date = '2002-08-01'
where emp_no = 10050 and to_date = '9999-01-01';

insert into dept_emp (emp_no, dept_no, from_date, to_date)
values (10050, 'd005', '2002-08-01', '9999-01-01');

commit;`,
        explanation:
          'Between the two statements the employee belongs to no department. Inside one transaction nobody else can see that moment, and if the insert failed the update would be rolled back with it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Transactions', url: PG + 'tutorial-transactions.html' },
      { label: 'MySQL: START TRANSACTION', url: MY + 'commit.html' },
    ],
  },
  {
    id: 'employees-035',
    dataset: 'employees',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'Counting working days with a loop',
    prompt:
      'Write a function working_days(p_from, p_to) that counts the days from p_from up to but not including p_to that are Monday to Friday, by walking through the days one at a time.',
    orderMatters: false,
    checkSql: `select working_days('2002-07-01', '2002-08-01') as july_2002,
       working_days('2002-08-03', '2002-08-05') as weekend_only,
       working_days('2002-08-01', '2002-08-01') as empty_range`,
    solutions: [
      {
        approach: 'WHILE loop',
        postgres: `create function working_days(p_from date, p_to date)
returns integer
language plpgsql
immutable
as $$
declare
  d date := p_from;
  n integer := 0;
begin
  while d < p_to loop
    if extract(isodow from d) < 6 then
      n := n + 1;
    end if;
    d := d + 1;
  end loop;
  return n;
end;
$$;`,
        mysql: `create function working_days(p_from date, p_to date)
returns int
deterministic
begin
  declare d date default p_from;
  declare n int default 0;
  while d < p_to do
    if weekday(d) < 5 then
      set n = n + 1;
    end if;
    set d = d + interval 1 day;
  end while;
  return n;
end;`,
        mysqlNote: `WHILE … DO … END WHILE, SET for assignment, and WEEKDAY() counting Monday = 0. ${DELIMITER_NOTE}`,
        explanation:
          'A loop that visits every day is the clearest way to show WHILE, IF and variables. For real use a set-based version is better: count(*) over generate_series(p_from, p_to - 1, interval \'1 day\') with the same weekday filter. Public holidays would need a table of their own.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Control structures', url: PG + 'plpgsql-control-structures.html' },
      { label: 'MySQL: WHILE statement', url: MY + 'while.html' },
    ],
  },
  {
    id: 'employees-036',
    dataset: 'employees',
    level: 4,
    topics: ['materialized-views'],
    title: 'Department salary statistics, stored',
    prompt:
      'Store, per department, the number of current employees and their average current salary (rounded to 0 decimals), for a dashboard that is refreshed nightly.',
    hint: 'Current rows have to_date = 9999-01-01.',
    orderMatters: true,
    checkSql: `select dept_no, employees, avg_salary from dept_salary_stats order by dept_no`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view dept_salary_stats as
select de.dept_no, count(*) as employees, round(avg(s.salary)) as avg_salary
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no;

-- nightly: refresh materialized view dept_salary_stats;`,
        mysql: `create table dept_salary_stats as
select de.dept_no, count(*) as employees, round(avg(s.salary)) as avg_salary
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01'
group by de.dept_no;`,
        mysqlNote: 'No materialized views in MySQL; a table rebuilt by a scheduled job (or an EVENT) does the same.',
        explanation: 'The joins and averages run once at refresh time; the dashboard reads nine stored rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' },
      { label: 'MySQL: CREATE EVENT', url: MY + 'create-event.html' },
    ],
  },
  {
    id: 'employees-037',
    dataset: 'employees',
    level: 4,
    topics: ['generated-columns', 'strings'],
    title: 'A full name column',
    prompt: 'Add a stored generated column full_name to employees: first name, a space, last name.',
    orderMatters: true,
    checkSql: `select emp_no, full_name from employees where emp_no in (10050, 10100) order by emp_no`,
    solutions: [
      {
        approach: 'Generated column',
        postgres: `alter table employees
add column full_name text generated always as (first_name || ' ' || last_name) stored;`,
        mysql: `alter table employees
add column full_name varchar(31) generated always as (concat(first_name, ' ', last_name)) stored;`,
        mysqlNote: 'concat(), because || means OR in MySQL. varchar(31) = 14 + 1 + 16, the two column lengths plus the space.',
        explanation: 'The name is always in sync with its parts, and searches like WHERE full_name = \'…\' can use an index on it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'employees-038',
    dataset: 'employees',
    level: 5,
    topics: ['locks-isolation'],
    title: 'Only one payroll run at a time',
    prompt:
      'The payroll job must never run twice at once, but it does not lock any particular row. Take an application-level lock named "payroll_run" without waiting, and return whether you got it.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Advisory lock / GET_LOCK',
        postgres: `select pg_try_advisory_xact_lock(hashtext('payroll_run')) as got_lock;`,
        mysql: `select get_lock('payroll_run', 0) as got_lock;`,
        mysqlNote: 'GET_LOCK(name, timeout) takes a named lock for the session; timeout 0 means do not wait. Release it with RELEASE_LOCK(\'payroll_run\'), or it lasts until the connection closes.',
        explanation:
          'An advisory lock is a lock on a number that means something only to your application. A second job calling the same function gets false and can exit. The _xact_ variant is released automatically at the end of the transaction; pg_try_advisory_lock lasts for the session.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Advisory locks', url: PG + 'explicit-locking.html#ADVISORY-LOCKS' },
      { label: 'MySQL: Locking functions', url: MY + 'locking-functions.html' },
    ],
  },
  {
    id: 'employees-039',
    dataset: 'employees',
    level: 4,
    topics: ['arrays', 'text-aggregation'],
    title: 'Career path as an array',
    prompt:
      'For the 5 lowest emp_no among employees who held at least three titles, show emp_no, all their titles in time order as an array, and the first title they held.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg with ORDER BY, then [1]',
        postgres: `select emp_no,
       array_agg(title order by from_date) as titles,
       (array_agg(title order by from_date))[1] as first_title
from titles
group by emp_no
having count(*) >= 3
order by emp_no
limit 5;`,
        mysql: `select emp_no,
       cast(concat('["', group_concat(title order by from_date separator '", "'), '"]') as json) as titles,
       substring_index(group_concat(title order by from_date), ',', 1) as first_title
from titles
group by emp_no
having count(*) >= 3
order by emp_no
limit 5;`,
        mysqlNote: 'No arrays: a JSON array built from GROUP_CONCAT, and the first element taken from the text before the first comma.',
        explanation: 'PostgreSQL arrays are indexed from 1, so [1] is the first element. array_agg\'s ORDER BY fixes the element order.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Arrays', url: PG + 'arrays.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'employees-040',
    dataset: 'employees',
    level: 3,
    topics: ['date-series'],
    title: 'Hires every month of 1999',
    prompt: 'Show every month of 1999 (YYYY-MM) with the number of employees hired that month, including months with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series by month',
        postgres: `select to_char(m, 'YYYY-MM') as month, count(e.emp_no) as hires
from generate_series(date '1999-01-01', date '1999-12-01', interval '1 month') as m
left join employees e on e.hire_date >= m and e.hire_date < m + interval '1 month'
group by m
order by m;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'A month step works the same as a day step. In this sample nobody was hired in July or December 1999, and those months still appear with 0.',
      },
      {
        approach: 'Recursive CTE of months',
        postgres: `with recursive months as (
  select date '1999-01-01' as m
  union all
  select (m + interval '1 month')::date from months where m < date '1999-12-01'
)
select to_char(m, 'YYYY-MM') as month, count(e.emp_no) as hires
from months
left join employees e on e.hire_date >= m and e.hire_date < m + interval '1 month'
group by m
order by m;`,
        mysql: `with recursive months as (
  select date('1999-01-01') as m
  union all
  select m + interval 1 month from months where m < '1999-12-01'
)
select date_format(m, '%Y-%m') as month, count(e.emp_no) as hires
from months
left join employees e on e.hire_date >= m and e.hire_date < m + interval 1 month
group by m
order by m;`,
        explanation: 'Twelve first-of-month dates built by recursion, then the same LEFT JOIN.',
      },
    ],
    comparison: 'Same 12 rows. Use first-of-month dates and a half-open range rather than comparing month numbers, so an index on hire_date can help.',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
]
