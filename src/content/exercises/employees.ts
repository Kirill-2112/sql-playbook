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
  {
    id: 'employees-041',
    dataset: 'employees',
    level: 4,
    topics: ['temp-tables', 'joins'],
    title: 'A snapshot of the current staff',
    prompt:
      'Several reports today need "who works here now, in which department, with which title and salary". Build it once as a temporary table current_staff (emp_no, dept_no, title, salary).',
    hint: 'Current rows have to_date = 9999-01-01.',
    orderMatters: true,
    checkSql: `select dept_no, count(*) as staff, max(salary) as top_salary from current_staff group by dept_no order by dept_no`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table current_staff as
select de.emp_no, de.dept_no, t.title, s.salary
from dept_emp de
join titles t   on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01';`,
        mysql: `create temporary table current_staff as
select de.emp_no, de.dept_no, t.title, s.salary
from dept_emp de
join titles t   on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01';`,
        mysqlNote: 'CREATE TEMPORARY TABLE; it cannot be referenced twice in the same query (no self-join on it).',
        explanation: 'Unlike a view, the temporary table holds the result: the three-way join runs once, not once per report. It is private to this session and vanishes when it ends.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: CREATE TEMPORARY TABLE', url: MY + 'create-temporary-table.html' },
    ],
  },
  {
    id: 'employees-042',
    dataset: 'employees',
    level: 5,
    topics: ['query-plans', 'ranking'],
    title: 'Each employee\'s latest salary, three ways',
    prompt: 'For every employee, find their most recent salary row (largest from_date). Return the number of employees and the sum of those salaries.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Correlated subquery on max(from_date)',
        postgres: `select count(*) as employees, sum(s.salary) as total
from salaries s
where s.from_date = (select max(s2.from_date) from salaries s2 where s2.emp_no = s.emp_no);`,
        mysql: `select count(*) as employees, sum(s.salary) as total
from salaries s
where s.from_date = (select max(s2.from_date) from salaries s2 where s2.emp_no = s.emp_no);`,
        explanation: 'For each salary row, look up that employee\'s latest date. The primary key (emp_no, from_date) makes each lookup an index probe.',
      },
      {
        approach: 'ROW_NUMBER',
        postgres: `select count(*) as employees, sum(salary) as total
from (
  select salary, row_number() over (partition by emp_no order by from_date desc) as n
  from salaries
) ranked
where n = 1;`,
        mysql: `select count(*) as employees, sum(salary) as total
from (
  select salary, row_number() over (partition by emp_no order by from_date desc) as n
  from salaries
) ranked
where n = 1;`,
        explanation: 'One pass over salaries sorted by employee and date, numbering the rows; keep number 1.',
      },
      {
        approach: 'Join to the grouped maximum',
        postgres: `select count(*) as employees, sum(s.salary) as total
from salaries s
join (select emp_no, max(from_date) as last_date from salaries group by emp_no) m
  on m.emp_no = s.emp_no and m.last_date = s.from_date;`,
        mysql: `select count(*) as employees, sum(s.salary) as total
from salaries s
join (select emp_no, max(from_date) as last_date from salaries group by emp_no) m
  on m.emp_no = s.emp_no and m.last_date = s.from_date;`,
        explanation: 'Compute each employee\'s latest date once, then join back to fetch the salary on that date.',
      },
    ],
    comparison:
      'Same totals. Look at the timings: the planner can turn each form into quite different work (index probes, a sort, a hash join). On this sample all are fast; on 2.8 million rows the differences grow. Measure rather than guess.',
    docs: [
      { label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'MySQL: EXPLAIN', url: MY + 'explain.html' },
    ],
  },
  {
    id: 'employees-043',
    dataset: 'employees',
    level: 5,
    topics: ['triggers'],
    title: 'Audit every new salary',
    prompt:
      'Create salary_audit (emp_no, salary, from_date, previous_salary) and a trigger that records every new salaries row there, with the employee\'s previous salary (NULL for the first one).',
    orderMatters: false,
    checkSql: `insert into salaries (emp_no, salary, from_date, to_date) values (10050, 99999, '2003-01-01', '9999-01-01');
select emp_no, salary, from_date, previous_salary from salary_audit`,
    solutions: [
      {
        approach: 'AFTER INSERT trigger with a lookup',
        postgres: `create table salary_audit (emp_no integer, salary integer, from_date date, previous_salary integer);

create function audit_salary() returns trigger
language plpgsql
as $$
begin
  insert into salary_audit (emp_no, salary, from_date, previous_salary)
  values (new.emp_no, new.salary, new.from_date,
          (select salary from salaries
           where emp_no = new.emp_no and from_date < new.from_date
           order by from_date desc limit 1));
  return new;
end;
$$;

create trigger salaries_audit
after insert on salaries
for each row execute function audit_salary();`,
        mysql: `create table salary_audit (emp_no int, salary int, from_date date, previous_salary int);

create trigger salaries_audit
after insert on salaries
for each row
  insert into salary_audit (emp_no, salary, from_date, previous_salary)
  values (new.emp_no, new.salary, new.from_date,
          (select salary from salaries
           where emp_no = new.emp_no and from_date < new.from_date
           order by from_date desc limit 1));`,
        mysqlNote: 'A trigger may read the table it is defined on, but not modify it (MySQL error 1442).',
        explanation:
          'The trigger sees the new row as NEW and can query other rows, here the employee\'s salary just before. Writing the history in a trigger means no application path can forget it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Restrictions on stored programs', url: MY + 'stored-program-restrictions.html' },
    ],
  },
  {
    id: 'employees-044',
    dataset: 'employees',
    level: 4,
    topics: ['upsert'],
    title: 'Rename or add a department',
    prompt: 'Apply two department changes in one statement: d005 is renamed "Engineering & Platform", and a new department d010 "Data" is added.',
    orderMatters: true,
    checkSql: `select dept_no, dept_name from departments where dept_no in ('d005', 'd010') order by dept_no`,
    solutions: [
      {
        approach: 'Upsert on the primary key',
        postgres: `insert into departments (dept_no, dept_name)
values ('d005', 'Engineering & Platform'), ('d010', 'Data')
on conflict (dept_no) do update set dept_name = excluded.dept_name;`,
        mysql: `insert into departments (dept_no, dept_name)
values ('d005', 'Engineering & Platform'), ('d010', 'Data') as new
on duplicate key update dept_name = new.dept_name;`,
        mysqlNote:
          'departments also has a unique key on dept_name. In MySQL a clash on that key would also turn into an update (of whichever row clashes); PostgreSQL\'s ON CONFLICT (dept_no) handles only the primary key and raises an error for a duplicate name.',
        explanation: 'One statement, two outcomes: d005 exists and is updated, d010 is new and is inserted.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'employees-045',
    dataset: 'employees',
    level: 4,
    topics: ['json'],
    title: 'An employee profile as JSON',
    prompt:
      'For employees 10050 and 10100, return one JSON object each: {"emp_no": …, "name": "First Last", "salaries": [all salary amounts in date order]}.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Nested JSON with an ordered array',
        postgres: `select e.emp_no,
       jsonb_build_object(
         'emp_no', e.emp_no,
         'name', e.first_name || ' ' || e.last_name,
         'salaries', (select jsonb_agg(s.salary order by s.from_date) from salaries s where s.emp_no = e.emp_no)
       ) as profile
from employees e
where e.emp_no in (10050, 10100)
order by e.emp_no;`,
        mysql: `select e.emp_no,
       json_object(
         'emp_no', e.emp_no,
         'name', concat(e.first_name, ' ', e.last_name),
         'salaries', (select cast(concat('[', group_concat(s.salary order by s.from_date), ']') as json)
                      from salaries s where s.emp_no = e.emp_no)
       ) as profile
from employees e
where e.emp_no in (10050, 10100)
order by e.emp_no;`,
        mysqlNote: 'JSON_ARRAYAGG has no ORDER BY, so the ordered array is built with GROUP_CONCAT and cast to JSON.',
        explanation: 'A scalar subquery returns the array, and jsonb_build_object nests it inside the object: one row per employee, ready for an API.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON creation functions', url: PG + 'functions-json.html#FUNCTIONS-JSON-CREATION-TABLE' },
      { label: 'MySQL: JSON_OBJECT', url: MY + 'json-creation-functions.html' },
    ],
  },
  {
    id: 'employees-046',
    dataset: 'employees',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'The longest run of raises',
    prompt:
      'A raise is a salary row higher than the employee\'s previous one. Find the 5 employees with the longest run of consecutive raises: emp_no and the number of raises in that run.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Flag raises, then number the breaks',
        postgres: `with flagged as (
  select emp_no, from_date,
         case when salary > lag(salary) over (partition by emp_no order by from_date) then 1 else 0 end as raised
  from salaries
),
grouped as (
  select emp_no, raised,
         sum(case when raised = 0 then 1 else 0 end) over (partition by emp_no order by from_date) as grp
  from flagged
)
select emp_no, count(*) as raises
from grouped
where raised = 1
group by emp_no, grp
order by raises desc, emp_no
limit 5;`,
        mysql: `with flagged as (
  select emp_no, from_date,
         case when salary > lag(salary) over (partition by emp_no order by from_date) then 1 else 0 end as raised
  from salaries
),
grouped as (
  select emp_no, raised,
         sum(case when raised = 0 then 1 else 0 end) over (partition by emp_no order by from_date) as grp
  from flagged
)
select emp_no, count(*) as raises
from grouped
where raised = 1
group by emp_no, grp
order by raises desc, emp_no
limit 5;`,
        explanation:
          'Another islands technique: a running count of "breaks" (rows that are not raises) stays the same along a run of raises, so it labels the run. It works when the condition is not about consecutive numbers but about row values.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-047',
    dataset: 'employees',
    level: 4,
    topics: ['merge'],
    title: 'Load new titles, skip known ones',
    prompt:
      'HR sends title_feed (emp_no, title, from_date): (10050, Senior Staff, 2002-08-01) is new, (10050, its current title and from_date) is already loaded. Insert only the rows not in titles yet, in one statement.',
    orderMatters: true,
    checkSql: `select title, from_date, to_date from titles where emp_no = 10050 order by from_date`,
    solutions: [
      {
        approach: 'MERGE … WHEN NOT MATCHED THEN INSERT',
        postgres: `create table title_feed (emp_no integer, title varchar(50), from_date date);
insert into title_feed
select 10050, 'Senior Staff', date '2002-08-01'
union all
select emp_no, title, from_date from titles where emp_no = 10050 and to_date = '9999-01-01';

merge into titles t
using title_feed f on f.emp_no = t.emp_no and f.title = t.title and f.from_date = t.from_date
when not matched then
  insert (emp_no, title, from_date, to_date) values (f.emp_no, f.title, f.from_date, '9999-01-01');`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'Only the WHEN NOT MATCHED branch is used, so matching rows are left alone: an "insert if missing" for a whole batch. (A real loader would also close the previous current title.)',
      },
      {
        approach: 'INSERT … SELECT … WHERE NOT EXISTS',
        postgres: `create table title_feed (emp_no integer, title varchar(50), from_date date);
insert into title_feed
select 10050, 'Senior Staff', date '2002-08-01'
union all
select emp_no, title, from_date from titles where emp_no = 10050 and to_date = '9999-01-01';

insert into titles (emp_no, title, from_date, to_date)
select f.emp_no, f.title, f.from_date, '9999-01-01'
from title_feed f
where not exists (select 1 from titles t
                  where t.emp_no = f.emp_no and t.title = f.title and t.from_date = f.from_date);`,
        mysql: `create table title_feed (emp_no int, title varchar(50), from_date date);
insert into title_feed
select 10050, 'Senior Staff', date '2002-08-01'
union all
select emp_no, title, from_date from titles where emp_no = 10050 and to_date = '9999-01-01';

insert into titles (emp_no, title, from_date, to_date)
select f.emp_no, f.title, f.from_date, '9999-01-01'
from title_feed f
where not exists (select 1 from titles t
                  where t.emp_no = f.emp_no and t.title = f.title and t.from_date = f.from_date);`,
        explanation: 'The same "insert what is missing" with a filter, portable to any database.',
      },
    ],
    comparison: 'Same rows. For a single insert-if-missing branch, INSERT … WHERE NOT EXISTS is just as clear; MERGE shines once updates or deletes join in.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: INSERT … SELECT', url: MY + 'insert-select.html' },
    ],
  },
  {
    id: 'employees-048',
    dataset: 'employees',
    level: 4,
    topics: ['normalization', 'subqueries'],
    title: 'Are managers members of their department?',
    prompt:
      'dept_manager and dept_emp are separate tables. Check that every manager record has a matching dept_emp row (same employee and department): count the manager records without one.',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as managers_checked,
       count(*) filter (where not exists (
         select 1 from dept_emp de where de.emp_no = dm.emp_no and de.dept_no = dm.dept_no)) as without_membership
from dept_manager dm;`,
        mysql: `select count(*) as managers_checked,
       sum(not exists (
         select 1 from dept_emp de where de.emp_no = dm.emp_no and de.dept_no = dm.dept_no)) as without_membership
from dept_manager dm;`,
        explanation:
          'Both tables are junction tables between employees and departments, one for membership and one for management. The rule "a manager belongs to the department" spans two tables, so no single-table constraint can enforce it; this query audits it (all 24 pass).',
      },
    ],
    docs: [{ label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' }],
  },
  {
    id: 'employees-049',
    dataset: 'employees',
    level: 2,
    topics: ['full-join', 'group-by'],
    title: 'Hires and leavers per year',
    prompt:
      'For every year in which someone was hired or someone left, show the year, the number hired and the number who left (0 if none). Someone left in the year their last dept_emp row ended, if that is not 9999-01-01.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two yearly counts',
        postgres: `with hires as (
  select extract(year from hire_date)::int as y, count(*) as hired from employees group by 1
),
leavers as (
  select extract(year from last_day)::int as y, count(*) as left_company
  from (select emp_no, max(to_date) as last_day from dept_emp group by emp_no) e
  where last_day < '9999-01-01'
  group by 1
)
select coalesce(h.y, l.y) as year, coalesce(h.hired, 0) as hired, coalesce(l.left_company, 0) as left_company
from hires h
full join leavers l on l.y = h.y
order by year;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Hiring stops in 1999 but people keep leaving until 2002; 1985 has hires and leavers alike. FULL JOIN keeps the years that exist on only one side.',
      },
      {
        approach: 'UNION ALL of events, then pivot',
        postgres: `select y as year,
       sum(case when kind = 'hire' then 1 else 0 end) as hired,
       sum(case when kind = 'leave' then 1 else 0 end) as left_company
from (
  select extract(year from hire_date)::int as y, 'hire' as kind from employees
  union all
  select extract(year from max(to_date))::int, 'leave' from dept_emp
  group by emp_no having max(to_date) < '9999-01-01'
) events
group by y
order by y;`,
        mysql: `select y as year,
       sum(kind = 'hire') as hired,
       sum(kind = 'leave') as left_company
from (
  select year(hire_date) as y, 'hire' as kind from employees
  union all
  select year(max(to_date)), 'leave' from dept_emp
  group by emp_no having max(to_date) < '9999-01-01'
) events
group by y
order by y;`,
        explanation: 'Stack both kinds of events into one list and count each kind per year. No join needed, and it works everywhere.',
      },
    ],
    comparison: 'Same rows. The UNION ALL "event log" pattern is often the simplest replacement for FULL JOIN when both sides are counts.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: UNION', url: MY + 'union.html' },
    ],
  },
  {
    id: 'employees-050',
    dataset: 'employees',
    level: 5,
    topics: ['partitioning'],
    title: 'Employees spread by hash',
    prompt: 'Create employees_hashed with the columns of employees, hash-partitioned by emp_no into 4 partitions, and copy the employees into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'employees_hashed'::regclass) as partitions,
       (select count(*) from employees_hashed) as total_rows`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'employees_hashed') as partitions,
       (select count(*) from employees_hashed) as total_rows`,
    solutions: [
      {
        approach: 'HASH partitions',
        postgres: `create table employees_hashed (like employees, primary key (emp_no)) partition by hash (emp_no);

create table employees_hashed_0 partition of employees_hashed for values with (modulus 4, remainder 0);
create table employees_hashed_1 partition of employees_hashed for values with (modulus 4, remainder 1);
create table employees_hashed_2 partition of employees_hashed for values with (modulus 4, remainder 2);
create table employees_hashed_3 partition of employees_hashed for values with (modulus 4, remainder 3);

insert into employees_hashed select * from employees;`,
        mysql: `create table employees_hashed like employees;

alter table employees_hashed partition by hash (emp_no) partitions 4;

insert into employees_hashed select * from employees;`,
        mysqlNote: 'With an integer column MySQL can use HASH (KEY is for other types). MySQL\'s HASH is simply emp_no MOD 4, so the spread depends on how ids are assigned.',
        explanation: 'PostgreSQL hashes the value and then takes the remainder, which spreads even patterned ids evenly. In this sample every emp_no is a multiple of 50, so a plain MOD 4 would put almost everyone into partitions 0 and 2.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: HASH partitioning', url: MY + 'partitioning-hash.html' },
    ],
  },
  {
    id: 'employees-051',
    dataset: 'employees',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for current assignments',
    prompt: 'Most queries ask "who is in department X now" (to_date = 9999-01-01). Create an index on dept_emp that serves exactly that.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'dept_emp' and indexdef like '%to_date%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'dept_emp' and column_name = 'to_date'`,
    solutions: [
      {
        approach: 'Partial index on current rows',
        postgres: `create index dept_emp_current_idx on dept_emp (dept_no) where to_date = '9999-01-01';`,
        mysql: null,
        mysqlNote: 'No partial indexes; index (dept_no, to_date) instead (solution B).',
        explanation: 'Only current assignments are indexed, so the index is small and maps each department directly to its present staff.',
      },
      {
        approach: 'Composite index',
        postgres: `create index dept_emp_dept_to_idx on dept_emp (dept_no, to_date);`,
        mysql: `create index dept_emp_dept_to_idx on dept_emp (dept_no, to_date);`,
        explanation: 'Covers all rows; "dept_no = X and to_date = 9999-01-01" is one exact key range.',
      },
    ],
    comparison: 'Both serve the query. The partial index is smaller and specific; the composite one also answers questions about the past.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'employees-052',
    dataset: 'employees',
    level: 3,
    topics: ['subtotals'],
    title: 'Current staff by department and gender',
    prompt:
      'Count current employees by department and gender, with a subtotal per department and a grand total (labels "All" for rolled-up values). Departments in order, each subtotal after its genders.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(de.dept_no, 'All') as dept_no, coalesce(e.gender, 'All') as gender, count(*) as staff
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by rollup (de.dept_no, e.gender)
order by grouping(de.dept_no), de.dept_no, grouping(e.gender), e.gender;`,
        mysql: `select coalesce(de.dept_no, 'All') as dept_no, coalesce(e.gender, 'All') as gender, count(*) as staff
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no, e.gender with rollup
order by grouping(de.dept_no), de.dept_no, grouping(e.gender), cast(e.gender as char);`,
        mysqlNote: 'gender is an ENUM(\'M\', \'F\') in MySQL, and ORDER BY on an ENUM uses the definition order (M before F); CAST(… AS CHAR) sorts it as text, like PostgreSQL.',
        explanation: 'ROLLUP adds a per-department subtotal and a grand total. GROUPING() keeps the totals after the detail rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'employees-053',
    dataset: 'employees',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'Dates as readable text',
    prompt: 'For employees 10050 and 10100, show emp_no and the hire date written as text in two formats: "1990-12-25" and "25 Dec 1990".',
    orderMatters: true,
    solutions: [
      {
        approach: 'to_char / DATE_FORMAT',
        postgres: `select emp_no,
       hire_date::text as iso,
       to_char(hire_date, 'DD Mon YYYY') as readable
from employees
where emp_no in (10050, 10100)
order by emp_no;`,
        mysql: `select emp_no,
       cast(hire_date as char) as iso,
       date_format(hire_date, '%d %b %Y') as readable
from employees
where emp_no in (10050, 10100)
order by emp_no;`,
        mysqlNote: '%d day, %b short month name, %Y year: the same pattern idea with different codes.',
        explanation: 'A plain cast gives the ISO form; to_char formats with a pattern. Formatting belongs at the very end of a query: compare and sort dates as dates, never as "25 Dec" text.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Data type formatting', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: DATE_FORMAT', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },
  {
    id: 'employees-054',
    dataset: 'employees',
    level: 1,
    topics: ['distinct', 'joins'],
    title: 'Titles managers have held',
    prompt: 'List the different job titles ever held by people who were department managers at some point.',
    orderMatters: false,
    solutions: [
      {
        approach: 'DISTINCT over a join',
        postgres: `select distinct t.title
from titles t
where t.emp_no in (select emp_no from dept_manager);`,
        mysql: `select distinct t.title
from titles t
where t.emp_no in (select emp_no from dept_manager);`,
        explanation: 'Managers also held other titles before becoming managers, so the list is longer than just "Manager".',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT DISTINCT', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },
  {
    id: 'employees-055',
    dataset: 'employees',
    level: 4,
    topics: ['views', 'lag-lead'],
    title: 'A view of salary changes',
    prompt:
      'Create a view salary_changes (emp_no, from_date, salary, previous_salary, change_pct) where change_pct is the change from the previous salary in percent, 1 decimal (NULL for the first salary).',
    orderMatters: true,
    checkSql: `select emp_no, from_date, salary, previous_salary, change_pct from salary_changes where emp_no = 10050 order by from_date`,
    solutions: [
      {
        approach: 'View with LAG',
        postgres: `create view salary_changes as
select emp_no, from_date, salary,
       lag(salary) over w as previous_salary,
       round(100.0 * (salary - lag(salary) over w) / lag(salary) over w, 1) as change_pct
from salaries
window w as (partition by emp_no order by from_date);`,
        mysql: `create view salary_changes as
select emp_no, from_date, salary,
       lag(salary) over w as previous_salary,
       round(100.0 * (salary - lag(salary) over w) / lag(salary) over w, 1) as change_pct
from salaries
window w as (partition by emp_no order by from_date);`,
        explanation:
          'A WINDOW clause names the window once and reuses it. Careful when filtering this view: a WHERE on from_date outside the view runs after LAG, so the first visible row still knows its real previous salary; inside the view it would not.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window function calls', url: PG + 'sql-select.html#SQL-WINDOW' }],
  },
  {
    id: 'employees-056',
    dataset: 'employees',
    level: 4,
    topics: ['generated-columns', 'dates-basics'],
    title: 'Age at hire, in days',
    prompt: 'Add a stored generated column days_old_at_hire to employees: the number of days between birth_date and hire_date.',
    orderMatters: true,
    checkSql: `select emp_no, days_old_at_hire, days_old_at_hire / 365 as approx_years from employees where emp_no in (10050, 10100) order by emp_no`,
    checkSqlMysql: `select emp_no, days_old_at_hire, days_old_at_hire div 365 as approx_years from employees where emp_no in (10050, 10100) order by emp_no`,
    solutions: [
      {
        approach: 'Date difference in a generated column',
        postgres: `alter table employees add column days_old_at_hire integer
generated always as (hire_date - birth_date) stored;`,
        mysql: `alter table employees add column days_old_at_hire int
generated always as (datediff(hire_date, birth_date)) stored;`,
        explanation:
          'date − date is an integer number of days and IMMUTABLE, so it is allowed in a generated column. age(hire_date, birth_date) would give "years, months, days" instead, but an interval is harder to index and compare.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time operators', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'employees-057',
    dataset: 'employees',
    level: 4,
    topics: ['temp-tables', 'window-frames'],
    title: 'Yearly payroll, then growth',
    prompt:
      'Put the total salary paid per year (salary rows active on 1 July of that year, 1985–2002) into a temporary table payroll (year, total). The check computes the year-over-year growth from it.',
    orderMatters: true,
    checkSql: `select year, total, round(100.0 * (total - lag(total) over (order by year)) / lag(total) over (order by year), 1) as growth_pct
from payroll where year between 1998 and 2002 order by year`,
    solutions: [
      {
        approach: 'Temp table from a year series',
        postgres: `create temp table payroll as
select y as year, sum(s.salary) as total
from generate_series(1985, 2002) as y
join salaries s on s.from_date <= make_date(y, 7, 1) and s.to_date > make_date(y, 7, 1)
group by y;`,
        mysql: `create temporary table payroll as
with recursive years (y) as (select 1985 union all select y + 1 from years where y < 2002)
select y as year, sum(s.salary) as total
from years
join salaries s on s.from_date <= makedate(y, 1) + interval 6 month and s.to_date > makedate(y, 1) + interval 6 month
group by y;`,
        mysqlNote: 'MySQL has no make_date(y, m, d): MAKEDATE(y, 1) is 1 January, plus 6 months gives 1 July. (A fixed day-of-year such as 182 would land on 30 June in leap years and change the snapshot.)',
        explanation: 'A "snapshot on 1 July" per year turns history rows into yearly figures. Stored once, the growth query and any chart read 18 rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'employees-058',
    dataset: 'employees',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'A raise that depends on the title',
    prompt:
      'Write raise_pct(p_title) returning the yearly raise in percent: 5 for Senior Engineer and Technique Leader, 4 for Engineer and Senior Staff, 2 for Manager, 3 otherwise.',
    orderMatters: true,
    checkSql: `select title, raise_pct(title) as pct from (select distinct title from titles) t order by title`,
    solutions: [
      {
        approach: 'CASE statement in a function',
        postgres: `create function raise_pct(p_title text) returns integer
language plpgsql
immutable
as $$
begin
  case
    when p_title in ('Senior Engineer', 'Technique Leader') then return 5;
    when p_title in ('Engineer', 'Senior Staff') then return 4;
    when p_title = 'Manager' then return 2;
    else return 3;
  end case;
end;
$$;`,
        mysql: `create function raise_pct(p_title varchar(50)) returns int
deterministic
begin
  case
    when p_title in ('Senior Engineer', 'Technique Leader') then return 5;
    when p_title in ('Engineer', 'Senior Staff') then return 4;
    when p_title = 'Manager' then return 2;
    else return 3;
  end case;
end;`,
        mysqlNote: 'Same CASE statement syntax. In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'A CASE statement (with END CASE) chooses which statements to run; the CASE expression used in queries chooses a value. Without ELSE, a PL/pgSQL CASE statement that matches nothing raises an error, unlike the expression, which returns NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Conditionals (CASE)', url: PG + 'plpgsql-control-structures.html#PLPGSQL-CONDITIONALS' }],
  },
  {
    id: 'employees-059',
    dataset: 'employees',
    level: 4,
    topics: ['normalization', 'self-cross-join'],
    title: 'No overlapping titles',
    prompt:
      'An employee should never hold two titles at the same time. Count the pairs of title rows of the same employee whose periods overlap.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Self join on overlapping periods',
        postgres: `select count(*) as overlapping_pairs
from titles a
join titles b on b.emp_no = a.emp_no
             and a.from_date < b.from_date
             and b.from_date < a.to_date;`,
        mysql: `select count(*) as overlapping_pairs
from titles a
join titles b on b.emp_no = a.emp_no
             and a.from_date < b.from_date
             and b.from_date < a.to_date;`,
        explanation:
          'Two periods overlap when the later one starts before the earlier one ends. None do here. The table\'s key (emp_no, title, from_date) cannot prevent overlaps; PostgreSQL could with an exclusion constraint over a daterange, which is how temporal data is protected properly.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Exclusion constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION' }],
  },
  {
    id: 'employees-060',
    dataset: 'employees',
    level: 3,
    topics: ['recursive', 'numbers'],
    title: 'Five years of raises',
    prompt: 'Project employee 10050\'s current salary 5 years ahead with a 3% raise each year, rounded to whole units: year 0 (today) to 5.',
    hint: 'The current salary has to_date = 9999-01-01.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE that compounds',
        postgres: `with recursive proj (year, salary) as (
  select 0, salary::numeric from salaries where emp_no = 10050 and to_date = '9999-01-01'
  union all
  select year + 1, salary * 1.03 from proj where year < 5
)
select year, round(salary) as salary from proj order by year;`,
        mysql: `with recursive proj (year, salary) as (
  select 0, cast(salary as decimal(14, 4)) from salaries where emp_no = 10050 and to_date = '9999-01-01'
  union all
  select year + 1, salary * 1.03 from proj where year < 5
)
select year, round(salary) as salary from proj order by year;`,
        mysqlNote: 'The recursive column takes its type from the first SELECT: cast to a decimal with room for decimals, or every step would be rounded to an integer.',
        explanation: 'Each step multiplies the previous value, so the raises compound. Rounding only at the end avoids accumulating rounding errors.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH RECURSIVE', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'employees-061',
    dataset: 'employees',
    level: 4,
    topics: ['json', 'aggregates'],
    title: 'Departments as one JSON object',
    prompt: 'Return one JSON object mapping each department name to its number of current employees.',
    hint: 'Current assignments have to_date = 9999-01-01.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Object aggregate',
        postgres: `select jsonb_object_agg(d.dept_name, c.n) as headcount
from departments d
join (select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no) c
  on c.dept_no = d.dept_no;`,
        mysql: `select json_objectagg(d.dept_name, c.n) as headcount
from departments d
join (select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no) c
  on c.dept_no = d.dept_no;`,
        explanation: 'A single object instead of nine rows, the format a dashboard\'s chart often expects. Keys come out sorted by length and name in both databases, whatever order the rows had.',
      },
    ],
    docs: [{ label: 'PostgreSQL: jsonb_object_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'employees-062',
    dataset: 'employees',
    level: 3,
    topics: ['lateral'],
    title: 'The last two salaries',
    prompt: 'For employees 10050, 10100 and 10150, show their two most recent salaries: emp_no, from_date and salary.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 2',
        postgres: `select e.emp_no, s.from_date, s.salary
from employees e
cross join lateral (
  select from_date, salary from salaries
  where emp_no = e.emp_no
  order by from_date desc
  limit 2
) s
where e.emp_no in (10050, 10100, 10150)
order by e.emp_no, s.from_date desc;`,
        mysql: `select e.emp_no, s.from_date, s.salary
from employees e
cross join lateral (
  select from_date, salary from salaries
  where emp_no = e.emp_no
  order by from_date desc
  limit 2
) s
where e.emp_no in (10050, 10100, 10150)
order by e.emp_no, s.from_date desc;`,
        explanation: 'The primary key (emp_no, from_date) serves the inner query directly: one short backwards index scan per employee.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'employees-063',
    dataset: 'employees',
    level: 5,
    topics: ['triggers', 'control-flow'],
    title: 'No salary cuts',
    prompt:
      'Create a trigger that rejects a new salary row lower than the employee\'s previous salary. Then give employee 10050 a raise to 100000 from 2003-01-01 (allowed).',
    orderMatters: false,
    checkSql: `insert into salaries (emp_no, salary, from_date, to_date) values (10050, 100000, '2003-01-01', '9999-01-01');
select count(*) as salary_rows, max(salary) as top_salary from salaries where emp_no = 10050`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger that raises',
        postgres: `create function no_salary_cut() returns trigger
language plpgsql
as $$
declare
  v_prev integer;
begin
  select salary into v_prev from salaries
  where emp_no = new.emp_no and from_date < new.from_date
  order by from_date desc limit 1;
  if v_prev is not null and new.salary < v_prev then
    raise exception 'salary for % cannot drop from % to %', new.emp_no, v_prev, new.salary;
  end if;
  return new;
end;
$$;

create trigger salaries_no_cut
before insert on salaries
for each row execute function no_salary_cut();`,
        mysql: `create trigger salaries_no_cut
before insert on salaries
for each row
begin
  declare v_prev int;
  select salary into v_prev from salaries
  where emp_no = new.emp_no and from_date < new.from_date
  order by from_date desc limit 1;
  if v_prev is not null and new.salary < v_prev then
    signal sqlstate '45000' set message_text = 'salary cannot drop';
  end if;
end;`,
        mysqlNote: 'SIGNAL raises the error. In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'The data itself contains salary drops (an earlier exercise found them), so the rule applies to new rows only; existing history is untouched. A business rule that compares with other rows is a typical job for a trigger.',
      },
    ],
    docs: [{ label: 'PostgreSQL: RAISE', url: PG + 'plpgsql-errors-and-messages.html' }],
  },
  {
    id: 'employees-064',
    dataset: 'employees',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'The longest wait for a raise',
    prompt: 'For employees still employed (a current salary row), find the longest time in days between two consecutive salary changes. Show the 5 longest: emp_no and days.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Days between consecutive from_dates',
        postgres: `select emp_no, max(gap) as longest_days
from (
  select emp_no, from_date - lag(from_date) over (partition by emp_no order by from_date) as gap
  from salaries
  where emp_no in (select emp_no from salaries where to_date = '9999-01-01')
) g
group by emp_no
order by longest_days desc, emp_no
limit 5;`,
        mysql: `select emp_no, max(gap) as longest_days
from (
  select emp_no, datediff(from_date, lag(from_date) over (partition by emp_no order by from_date)) as gap
  from salaries
  where emp_no in (select emp_no from salaries where to_date = '9999-01-01')
) g
group by emp_no
order by longest_days desc, emp_no
limit 5;`,
        explanation: 'Salaries normally change once a year; the longest gaps reveal employees whose pay stayed the same for several years.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LAG', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-065',
    dataset: 'employees',
    level: 5,
    topics: ['query-plans', 'ranking'],
    title: 'Current salaries: filter or rank',
    prompt: 'Sum the current salaries of department d005. Compare filtering on to_date with ranking each employee\'s salaries.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Filter on the sentinel date',
        postgres: `select count(*) as staff, sum(s.salary) as payroll
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.dept_no = 'd005' and de.to_date = '9999-01-01';`,
        mysql: `select count(*) as staff, sum(s.salary) as payroll
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.dept_no = 'd005' and de.to_date = '9999-01-01';`,
        explanation: 'Uses the "9999-01-01 means current" convention: one equality per table.',
      },
      {
        approach: 'Latest salary by ROW_NUMBER',
        postgres: `select count(*) as staff, sum(salary) as payroll
from (
  select s.salary, row_number() over (partition by s.emp_no order by s.from_date desc) as n
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no
  where de.dept_no = 'd005' and de.to_date = '9999-01-01'
) r
where n = 1;`,
        mysql: `select count(*) as staff, sum(salary) as payroll
from (
  select s.salary, row_number() over (partition by s.emp_no order by s.from_date desc) as n
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no
  where de.dept_no = 'd005' and de.to_date = '9999-01-01'
) r
where n = 1;`,
        explanation: 'Does not rely on the sentinel, but reads every salary row of every current employee and sorts them.',
      },
    ],
    comparison: 'Same totals here, because every current employee has a current salary row. The sentinel filter is much less work; the ranking survives data where "current" is not marked.',
    docs: [{ label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' }],
  },
  {
    id: 'employees-066',
    dataset: 'employees',
    level: 3,
    topics: ['cte'],
    title: 'A report in three steps',
    prompt:
      'With a chain of CTEs: current staff per department, the company-wide average department size, and the departments larger than that average. Show dept_name and staff.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CTEs building on each other',
        postgres: `with staff as (
  select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no
),
average as (
  select avg(n) as avg_n from staff
),
large as (
  select s.dept_no, s.n from staff s, average a where s.n > a.avg_n
)
select d.dept_name, l.n as staff
from large l join departments d on d.dept_no = l.dept_no
order by l.n desc, d.dept_name;`,
        mysql: `with staff as (
  select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no
),
average as (
  select avg(n) as avg_n from staff
),
large as (
  select s.dept_no, s.n from staff s, average a where s.n > a.avg_n
)
select d.dept_name, l.n as staff
from large l join departments d on d.dept_no = l.dept_no
order by l.n desc, d.dept_name;`,
        explanation: 'Each CTE may use the ones before it, so a report reads top to bottom in named steps instead of nested subqueries.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'employees-067',
    dataset: 'employees',
    level: 1,
    topics: ['null', 'lag-lead'],
    title: 'No previous salary',
    prompt: 'For employee 10050, show each salary row with the previous salary; where there is none, show 0 instead of NULL.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG with a default',
        postgres: `select from_date, salary, lag(salary, 1, 0) over (order by from_date) as previous_salary
from salaries
where emp_no = 10050
order by from_date;`,
        mysql: `select from_date, salary, lag(salary, 1, 0) over (order by from_date) as previous_salary
from salaries
where emp_no = 10050
order by from_date;`,
        explanation: 'LAG(value, offset, default) returns the default when there is no previous row. coalesce(lag(salary) over …, 0) does the same, but would also replace a previous salary that is itself NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-068',
    dataset: 'employees',
    level: 4,
    topics: ['materialized-views'],
    title: 'Title counts per year, stored',
    prompt: 'Store, for each year 1990–2000, the number of people holding each title on 1 January of that year (year, title, holders).',
    orderMatters: true,
    checkSql: `select year, title, holders from title_counts where year = 2000 order by holders desc, title`,
    solutions: [
      {
        approach: 'Materialized view over a year series',
        postgres: `create materialized view title_counts as
select y as year, t.title, count(*) as holders
from generate_series(1990, 2000) as y
join titles t on t.from_date <= make_date(y, 1, 1) and t.to_date > make_date(y, 1, 1)
group by y, t.title;`,
        mysql: `create table title_counts as
with recursive years (y) as (select 1990 union all select y + 1 from years where y < 2000)
select y as year, t.title, count(*) as holders
from years
join titles t on t.from_date <= makedate(y, 1) and t.to_date > makedate(y, 1)
group by y, t.title;`,
        mysqlNote: 'MAKEDATE(y, 1) is 1 January; a table stands in for the materialized view.',
        explanation: 'History tables make "as of a date" questions expensive; storing the yearly snapshot once makes the trend chart cheap.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'employees-069',
    dataset: 'employees',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Lock the salary, not the employee',
    prompt:
      'Give employee 10500 a 5% raise from 2002-08-01. Read the name and current salary in one join, but lock only the salary row (other sessions may still lock the employee row). Then close the current salary and insert the new one. In PostgreSQL you are already inside a transaction.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select salary, from_date, to_date from salaries where emp_no = 10500 and from_date >= '2001-01-01' order by from_date`,
    solutions: [
      {
        approach: 'FOR UPDATE OF one table',
        postgres: `select e.first_name, e.last_name, s.salary
from employees e
join salaries s on s.emp_no = e.emp_no
where e.emp_no = 10500 and s.to_date = '9999-01-01'
for update of s;

update salaries set to_date = '2002-08-01'
where emp_no = 10500 and to_date = '9999-01-01';

insert into salaries (emp_no, salary, from_date, to_date)
select emp_no, round(salary * 1.05), '2002-08-01', '9999-01-01'
from salaries
where emp_no = 10500 and to_date = '2002-08-01';`,
        mysql: `start transaction;

select e.first_name, e.last_name, s.salary
from employees e
join salaries s on s.emp_no = e.emp_no
where e.emp_no = 10500 and s.to_date = '9999-01-01'
for update of s;

update salaries set to_date = '2002-08-01'
where emp_no = 10500 and to_date = '9999-01-01';

insert into salaries (emp_no, salary, from_date, to_date)
select emp_no, round(salary * 1.05), '2002-08-01', '9999-01-01'
from salaries
where emp_no = 10500 and to_date = '2002-08-01';

commit;`,
        mysqlNote: 'FOR UPDATE OF exists since MySQL 8.0 and names the table by its alias, as in PostgreSQL.',
        explanation:
          'A plain FOR UPDATE on a join locks the matching rows of every table in it. OF s narrows it to the salary row, so an unrelated change to the employee (say, a new last name) is not blocked. 54,628 × 1.05 rounds to 57,359.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: The locking clause', url: PG + 'sql-select.html#SQL-FOR-UPDATE-SHARE' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'employees-070',
    dataset: 'employees',
    level: 5,
    topics: ['procedures', 'transactions'],
    title: 'A procedure for promotions',
    prompt:
      'Write a procedure promote(p_emp_no, p_title, p_raise_pct, p_date) that closes the employee\'s current title and salary on p_date and starts the new title and the raised salary from p_date. Promote 10450 to Senior Engineer with 10% on 2002-08-01.',
    hint: CURRENT_NOTE,
    orderMatters: false,
    checkSql: `select (select title from titles where emp_no = 10450 and to_date = '9999-01-01') as current_title,
       (select salary from salaries where emp_no = 10450 and to_date = '9999-01-01') as current_salary,
       (select count(*) from titles where emp_no = 10450 and to_date = '2002-08-01') as closed_titles,
       (select count(*) from salaries where emp_no = 10450 and to_date = '2002-08-01') as closed_salaries`,
    solutions: [
      {
        approach: 'Four statements in one procedure',
        postgres: `create procedure promote(p_emp_no int, p_title varchar, p_raise_pct numeric, p_date date)
language plpgsql
as $$
begin
  update titles set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  insert into titles (emp_no, title, from_date, to_date) values (p_emp_no, p_title, p_date, '9999-01-01');

  update salaries set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  insert into salaries (emp_no, salary, from_date, to_date)
  select emp_no, round(salary * (1 + p_raise_pct / 100)), p_date, '9999-01-01'
  from salaries where emp_no = p_emp_no and to_date = p_date;
end;
$$;

call promote(10450, 'Senior Engineer', 10, '2002-08-01');`,
        mysql: `create procedure promote(p_emp_no int, p_title varchar(50), p_raise_pct decimal(5, 2), p_date date)
begin
  update titles set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  insert into titles (emp_no, title, from_date, to_date) values (p_emp_no, p_title, p_date, '9999-01-01');

  update salaries set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  insert into salaries (emp_no, salary, from_date, to_date)
  select emp_no, round(salary * (1 + p_raise_pct / 100)), p_date, '9999-01-01'
  from salaries where emp_no = p_emp_no and to_date = p_date;
end;

call promote(10450, 'Senior Engineer', 10, '2002-08-01');`,
        mysqlNote: DELIMITER_NOTE + ' MySQL parameters need a length: varchar(50), not just varchar.',
        explanation:
          'Callers now cannot forget one of the four steps. In PostgreSQL a CALL runs inside one transaction, so if the insert fails the closing updates are undone too; in MySQL with autocommit each statement commits separately, so a careful version wraps the body in START TRANSACTION … COMMIT. 50,217 × 1.1 rounds to 55,239.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' },
      { label: 'MySQL: CREATE PROCEDURE', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'employees-071',
    dataset: 'employees',
    level: 3,
    topics: ['pivot', 'conditional-aggregates'],
    title: 'Pay by gender in each department',
    prompt:
      'For each department: the average current salary of men, of women (rounded to whole numbers), and the difference men minus women. One row per department, ordered by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'AVG with FILTER / CASE',
        postgres: `select d.dept_no, d.dept_name,
       round(avg(s.salary) filter (where e.gender = 'M')) as men,
       round(avg(s.salary) filter (where e.gender = 'F')) as women,
       round(avg(s.salary) filter (where e.gender = 'M')) - round(avg(s.salary) filter (where e.gender = 'F')) as difference
from departments d
join dept_emp de on de.dept_no = d.dept_no and de.to_date = '9999-01-01'
join employees e on e.emp_no = de.emp_no
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        mysql: `select d.dept_no, d.dept_name,
       round(avg(case when e.gender = 'M' then s.salary end)) as men,
       round(avg(case when e.gender = 'F' then s.salary end)) as women,
       round(avg(case when e.gender = 'M' then s.salary end)) - round(avg(case when e.gender = 'F' then s.salary end)) as difference
from departments d
join dept_emp de on de.dept_no = d.dept_no and de.to_date = '9999-01-01'
join employees e on e.emp_no = de.emp_no
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        mysqlNote: 'No FILTER: CASE without ELSE gives NULL for the other gender, and AVG skips NULLs.',
        explanation:
          'Each column averages a different subset of the same group: that is the pivot. Averages per department hide differences in title and seniority, so a gap here is a question to look into, not a conclusion.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'employees-072',
    dataset: 'employees',
    level: 1,
    topics: ['text-search'],
    title: 'The Sch- family names',
    prompt: 'Which last names starting with "Sch" are shared by at least 6 employees? Show last_name and the count, most common first, then alphabetically.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIKE with a prefix',
        postgres: `select last_name, count(*) as employees
from employees
where last_name like 'Sch%'
group by last_name
having count(*) >= 6
order by employees desc, last_name;`,
        mysql: `select last_name, count(*) as employees
from employees
where last_name like 'Sch%'
group by last_name
having count(*) >= 6
order by employees desc, last_name;`,
        explanation:
          '% matches any number of characters, so \'Sch%\' means "starts with Sch". A prefix pattern can use an index on last_name; \'%sch%\' (anywhere) cannot. LIKE is case-sensitive in PostgreSQL but not under MySQL\'s default collation; here every name starts with a capital, so both agree.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' },
      { label: 'MySQL: LIKE', url: MY + 'string-comparison-functions.html#operator_like' },
    ],
  },
  {
    id: 'employees-073',
    dataset: 'employees',
    level: 1,
    topics: ['null', 'dates-basics'],
    title: 'Open-ended periods as NULL',
    prompt:
      'For employees 10050, 10100 and 10150, list their titles with from_date and an end_date that is NULL for the current title instead of 9999-01-01. Order by emp_no, from_date.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'NULLIF',
        postgres: `select emp_no, title, from_date, nullif(to_date, '9999-01-01') as end_date
from titles
where emp_no in (10050, 10100, 10150)
order by emp_no, from_date;`,
        mysql: `select emp_no, title, from_date, nullif(to_date, '9999-01-01') as end_date
from titles
where emp_no in (10050, 10100, 10150)
order by emp_no, from_date;`,
        explanation:
          'NULLIF(a, b) returns NULL when a equals b, otherwise a. 9999-01-01 is a "magic value" that means "no end yet"; NULL says the same thing honestly, and the reverse, COALESCE(end_date, \'9999-01-01\'), turns it back when a query needs a real date to compare with.',
      },
    ],
    docs: [{ label: 'PostgreSQL: NULLIF', url: PG + 'functions-conditional.html#FUNCTIONS-NULLIF' }],
  },
  {
    id: 'employees-074',
    dataset: 'employees',
    level: 2,
    topics: ['set-operations'],
    title: 'Former managers',
    prompt: 'Who has managed a department in the past but is not a department manager now? Show emp_no, first_name and last_name, ordered by emp_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'EXCEPT, then join for the names',
        postgres: `select e.emp_no, e.first_name, e.last_name
from employees e
join (
  select emp_no from dept_manager
  except
  select emp_no from dept_manager where to_date = '9999-01-01'
) former on former.emp_no = e.emp_no
order by e.emp_no;`,
        mysql: `select e.emp_no, e.first_name, e.last_name
from employees e
join (
  select emp_no from dept_manager
  except
  select emp_no from dept_manager where to_date = '9999-01-01'
) former on former.emp_no = e.emp_no
order by e.emp_no;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation:
          'EXCEPT works on whole rows, so it compares emp_no only; the names are joined afterwards. Someone who managed one department before and manages another now would correctly drop out. 24 people have been managers, 9 are now, 15 are former.',
      },
      {
        approach: 'NOT EXISTS',
        postgres: `select e.emp_no, e.first_name, e.last_name
from employees e
where exists (select 1 from dept_manager m where m.emp_no = e.emp_no)
  and not exists (select 1 from dept_manager m where m.emp_no = e.emp_no and m.to_date = '9999-01-01')
order by e.emp_no;`,
        mysql: `select e.emp_no, e.first_name, e.last_name
from employees e
where exists (select 1 from dept_manager m where m.emp_no = e.emp_no)
  and not exists (select 1 from dept_manager m where m.emp_no = e.emp_no and m.to_date = '9999-01-01')
order by e.emp_no;`,
        explanation: 'The same rule written per employee: has a manager row, and has no current one.',
      },
    ],
    comparison: 'Same 15 people. EXCEPT reads like the question; NOT EXISTS lets you return any columns without the extra join.',
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'employees-075',
    dataset: 'employees',
    level: 4,
    topics: ['upsert', 'ddl'],
    title: 'A headcount table you can re-run',
    prompt:
      'Create dept_headcount (dept_no primary key, headcount). Write one statement that fills it with the current headcount per department, and that can be run again later to update the numbers instead of failing on duplicates. Run it twice.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select dept_no, headcount from dept_headcount order by dept_no`,
    solutions: [
      {
        approach: 'INSERT … SELECT with ON CONFLICT / ON DUPLICATE KEY',
        postgres: `create table dept_headcount (dept_no varchar(4) primary key, headcount integer not null);

insert into dept_headcount (dept_no, headcount)
select dept_no, count(*) from dept_emp where to_date = '9999-01-01' group by dept_no
on conflict (dept_no) do update set headcount = excluded.headcount;

insert into dept_headcount (dept_no, headcount)
select dept_no, count(*) from dept_emp where to_date = '9999-01-01' group by dept_no
on conflict (dept_no) do update set headcount = excluded.headcount;`,
        mysql: `create table dept_headcount (dept_no varchar(4) primary key, headcount int not null);

insert into dept_headcount (dept_no, headcount)
select * from (select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no) as cur
on duplicate key update headcount = cur.n;

insert into dept_headcount (dept_no, headcount)
select * from (select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no) as cur
on duplicate key update headcount = cur.n;`,
        mysqlNote:
          'With INSERT … SELECT … GROUP BY, MySQL cannot refer to the selected values in ON DUPLICATE KEY UPDATE directly; selecting from a derived table (cur) gives them a name.',
        explanation:
          'The second run finds every dept_no already there and updates instead of failing. Such idempotent loads ("run it again and get the same result") make scheduled jobs safe to retry.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'employees-076',
    dataset: 'employees',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'Sync a stale summary, deletions included',
    prompt:
      'A summary table dept_stats (dept_no, headcount) is out of date: run the setup below, then bring it in line with the current headcount in one statement: update changed rows, add missing departments, and delete rows for departments that do not exist.\n\nSetup: create table dept_stats (dept_no varchar(4) primary key, headcount int); insert into dept_stats values (\'d001\', 1), (\'d002\', 235), (\'d099\', 7);',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select dept_no, headcount from dept_stats order by dept_no`,
    solutions: [
      {
        approach: 'MERGE … WHEN NOT MATCHED BY SOURCE',
        postgres: `create table dept_stats (dept_no varchar(4) primary key, headcount int);
insert into dept_stats values ('d001', 1), ('d002', 235), ('d099', 7);

merge into dept_stats s
using (select dept_no, count(*) as headcount from dept_emp where to_date = '9999-01-01' group by dept_no) cur
on cur.dept_no = s.dept_no
when matched and s.headcount <> cur.headcount then
  update set headcount = cur.headcount
when not matched by target then
  insert (dept_no, headcount) values (cur.dept_no, cur.headcount)
when not matched by source then
  delete;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation:
          'NOT MATCHED BY SOURCE (PostgreSQL 17+) catches target rows with no partner in the source: d099 is deleted. d001 is updated, d002 is already right and untouched, d003–d009 are inserted.',
      },
      {
        approach: 'Upsert, then delete the leftovers',
        postgres: `create table dept_stats (dept_no varchar(4) primary key, headcount int);
insert into dept_stats values ('d001', 1), ('d002', 235), ('d099', 7);

insert into dept_stats (dept_no, headcount)
select dept_no, count(*) from dept_emp where to_date = '9999-01-01' group by dept_no
on conflict (dept_no) do update set headcount = excluded.headcount;

delete from dept_stats s
where not exists (select 1 from dept_emp de where de.dept_no = s.dept_no and de.to_date = '9999-01-01');`,
        mysql: `create table dept_stats (dept_no varchar(4) primary key, headcount int);
insert into dept_stats values ('d001', 1), ('d002', 235), ('d099', 7);

insert into dept_stats (dept_no, headcount)
select * from (select dept_no, count(*) as n from dept_emp where to_date = '9999-01-01' group by dept_no) as cur
on duplicate key update headcount = cur.n;

delete from dept_stats
where not exists (select 1 from dept_emp de where de.dept_no = dept_stats.dept_no and de.to_date = '9999-01-01');`,
        explanation: 'Two statements doing the same; wrap them in a transaction so no reader sees the in-between state.',
      },
    ],
    comparison: 'Same nine rows. MERGE does all three kinds of change in one pass; the two-step version works in MySQL.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'employees-077',
    dataset: 'employees',
    level: 3,
    topics: ['recursive', 'dates-basics'],
    title: 'Who took over from whom',
    prompt:
      'Follow the line of managers of department d004 (Production): start with the first one, and at each step find the manager whose term began the day the previous term ended. Show step, emp_no, last_name, from_date and to_date.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE joining end date to start date',
        postgres: `with recursive line (step, emp_no, from_date, to_date) as (
  select 1, emp_no, from_date, to_date
  from dept_manager
  where dept_no = 'd004'
    and from_date = (select min(from_date) from dept_manager where dept_no = 'd004')
  union all
  select l.step + 1, m.emp_no, m.from_date, m.to_date
  from line l
  join dept_manager m on m.dept_no = 'd004' and m.from_date = l.to_date
)
select l.step, l.emp_no, e.last_name, l.from_date, l.to_date
from line l
join employees e on e.emp_no = l.emp_no
order by l.step;`,
        mysql: `with recursive line (step, emp_no, from_date, to_date) as (
  select 1, emp_no, from_date, to_date
  from dept_manager
  where dept_no = 'd004'
    and from_date = (select min(from_date) from dept_manager where dept_no = 'd004')
  union all
  select l.step + 1, m.emp_no, m.from_date, m.to_date
  from line l
  join dept_manager m on m.dept_no = 'd004' and m.from_date = l.to_date
)
select l.step, l.emp_no, e.last_name, l.from_date, l.to_date
from line l
join employees e on e.emp_no = l.emp_no
order by l.step;`,
        explanation:
          'Each step looks for the term that starts where the previous one ended; the walk stops at the current manager, whose to_date (9999-01-01) matches no start. Four managers in a row. If a gap or overlap existed, the chain would stop early, which makes this also a check that the history has no holes.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'employees-078',
    dataset: 'employees',
    level: 4,
    topics: ['arrays', 'json'],
    title: 'From Production to Development',
    prompt: 'Collect each employee\'s departments (all periods) into a list, then count the employees whose list contains both d004 (Production) and d005 (Development).',
    orderMatters: false,
    solutions: [
      {
        approach: 'array_agg and @> / JSON_ARRAYAGG and JSON_CONTAINS',
        postgres: `with careers as (
  select emp_no, array_agg(dept_no) as depts
  from dept_emp
  group by emp_no
)
select count(*) as employees
from careers
where depts @> array['d004', 'd005']::varchar[];`,
        mysql: `with careers as (
  select emp_no, json_arrayagg(dept_no) as depts
  from dept_emp
  group by emp_no
)
select count(*) as employees
from careers
where json_contains(depts, '["d004", "d005"]');`,
        mysqlNote: 'A JSON array instead of an array; JSON_CONTAINS checks that both values are in it.',
        explanation:
          'The cast gives the literal the same type as the aggregated column (varchar[]): array operators want both sides to have the same element type. 605 employees changed department at least once, 98 of them between these two.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' },
      { label: 'MySQL: JSON_CONTAINS', url: MY + 'json-search-functions.html#function_json-contains' },
    ],
  },
  {
    id: 'employees-079',
    dataset: 'employees',
    level: 1,
    topics: ['limit', 'dates-basics'],
    title: 'The youngest recent hires',
    prompt: 'Among employees hired in 1999 or later, show the 5 youngest: emp_no, first_name, last_name and birth_date. On equal birth dates, lower emp_no first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY birth date descending, LIMIT',
        postgres: `select emp_no, first_name, last_name, birth_date
from employees
where hire_date >= '1999-01-01'
order by birth_date desc, emp_no
limit 5;`,
        mysql: `select emp_no, first_name, last_name, birth_date
from employees
where hire_date >= '1999-01-01'
order by birth_date desc, emp_no
limit 5;`,
        explanation:
          'Youngest means born latest, so the birth date sorts descending. The WHERE runs before the sort and the LIMIT after it, so the 5 come only from the 29 recent hires. emp_no makes the order unique.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'employees-080',
    dataset: 'employees',
    level: 2,
    topics: ['full-join', 'conditional-aggregates'],
    title: 'Marketing in 1995 and in 2000',
    prompt:
      'Compare who was in department d001 (Marketing) on 1995-01-01 with who was there on 2000-01-01. Count the people who stayed, who left, and who joined.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two snapshots',
        postgres: `with then_ as (
  select emp_no from dept_emp where dept_no = 'd001' and from_date <= '1995-01-01' and to_date > '1995-01-01'
),
now_ as (
  select emp_no from dept_emp where dept_no = 'd001' and from_date <= '2000-01-01' and to_date > '2000-01-01'
)
select count(*) filter (where t.emp_no is not null and n.emp_no is not null) as stayed,
       count(*) filter (where n.emp_no is null) as left_dept,
       count(*) filter (where t.emp_no is null) as joined
from then_ t
full join now_ n on n.emp_no = t.emp_no;`,
        mysql: `with then_ as (
  select emp_no from dept_emp where dept_no = 'd001' and from_date <= '1995-01-01' and to_date > '1995-01-01'
),
now_ as (
  select emp_no from dept_emp where dept_no = 'd001' and from_date <= '2000-01-01' and to_date > '2000-01-01'
)
select (select count(*) from then_ t join now_ n on n.emp_no = t.emp_no) as stayed,
       (select count(*) from then_ t where not exists (select 1 from now_ n where n.emp_no = t.emp_no)) as left_dept,
       (select count(*) from now_ n where not exists (select 1 from then_ t where t.emp_no = n.emp_no)) as joined;`,
        mysqlNote: 'No FULL JOIN in MySQL: count the three groups separately (or LEFT JOIN plus the anti-join).',
        explanation:
          'A FULL JOIN of two snapshots puts every person in one row, with NULL on the side where they were missing: both sides filled means stayed, a NULL on the 2000 side means left, a NULL on the 1995 side means joined. 215 stayed, 30 left, 106 joined.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'employees-081',
    dataset: 'employees',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Hires in the previous 30 days',
    prompt:
      'For every hire in 1999 or later (hire_date, emp_no), show how many people were hired in the 30 days up to and including that day. Order by hire_date, emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'RANGE frame with an interval',
        postgres: `select hire_date, emp_no,
       count(*) over (order by hire_date range between interval '29 days' preceding and current row) as hires_last_30_days
from employees
where hire_date >= '1999-01-01'
order by hire_date, emp_no;`,
        mysql: `select hire_date, emp_no,
       count(*) over (order by hire_date range between interval 29 day preceding and current row) as hires_last_30_days
from employees
where hire_date >= '1999-01-01'
order by hire_date, emp_no;`,
        explanation:
          'RANGE measures the frame in values of the ORDER BY column, not in rows: "29 days preceding" through today is a 30-day window, however many hires fall inside it. ROWS 29 PRECEDING would mean "the 29 previous hires", which could span months. Hires on the same day are peers and share one count. Hires before 1999 are filtered out first, so early January counts only from the 1st.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'employees-082',
    dataset: 'employees',
    level: 4,
    topics: ['temp-tables', 'lag-lead'],
    title: 'Every raise, computed once',
    prompt:
      'Store every salary change in a temporary table raises (emp_no, from_date, old_salary, new_salary, pct with 2 decimals). Then: how many changes were above 10%, how many were cuts, and the biggest raise in percent.',
    orderMatters: false,
    checkSql: `select count(*) filter (where pct > 10) as above_10_pct,
       count(*) filter (where pct < 0) as cuts,
       max(pct) as biggest_pct
from raises`,
    checkSqlMysql: `select sum(pct > 10) as above_10_pct,
       sum(pct < 0) as cuts,
       max(pct) as biggest_pct
from raises`,
    solutions: [
      {
        approach: 'LAG into a temporary table',
        postgres: `create temporary table raises as
select emp_no, from_date, old_salary, salary as new_salary,
       round(100.0 * (salary - old_salary) / old_salary, 2) as pct
from (
  select emp_no, from_date, salary, lag(salary) over (partition by emp_no order by from_date) as old_salary
  from salaries
) s
where old_salary is not null;`,
        mysql: `create temporary table raises as
select emp_no, from_date, old_salary, salary as new_salary,
       round(100 * (salary - old_salary) / old_salary, 2) as pct
from (
  select emp_no, from_date, salary, lag(salary) over (partition by emp_no order by from_date) as old_salary
  from salaries
) s
where old_salary is not null;`,
        explanation:
          'The window function runs once over 57,000 salary rows; every later question reads the 51,338 stored changes instead. The first salary of each person has no previous one, so it is left out. Raises in this data never exceed about 11.3%, and 5,280 changes are cuts.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'employees-083',
    dataset: 'employees',
    level: 5,
    topics: ['indexes', 'query-plans'],
    title: 'Search by title, not by person',
    prompt:
      'HR often lists everyone who currently holds a given title (title = … and to_date = \'9999-01-01\'). The primary key of titles is (emp_no, title, from_date). Explain why it does not help, and create an index that does.',
    hint: CURRENT_NOTE,
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'titles' and indexdef like '%(title, to_date%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'titles' and column_name = 'title' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'An index that starts with title',
        postgres: `create index titles_title_current_idx on titles (title, to_date) include (emp_no);

-- explain select emp_no from titles where title = 'Technique Leader' and to_date = '9999-01-01';`,
        mysql: `create index titles_title_current_idx on titles (title, to_date);

-- explain select emp_no from titles where title = 'Technique Leader' and to_date = '9999-01-01';`,
        mysqlNote: 'In InnoDB every secondary index already carries the primary key columns, so emp_no comes along without INCLUDE.',
        explanation:
          'A B-tree index is sorted by its first column first, like a phone book by last name. The primary key starts with emp_no, so finding a title means reading all of it. (title, to_date) puts all current Technique Leaders side by side; with emp_no included the query never touches the table.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Multicolumn indexes', url: PG + 'indexes-multicolumn.html' },
      { label: 'MySQL: Multiple-column indexes', url: MY + 'multiple-column-indexes.html' },
    ],
  },
  {
    id: 'employees-084',
    dataset: 'employees',
    level: 1,
    topics: ['select-basics', 'conditions'],
    title: 'Everyone called Georgi',
    prompt: 'List the employees whose first name is Georgi: emp_no, last_name and hire_date, earliest hire first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE with equality, ORDER BY',
        postgres: `select emp_no, last_name, hire_date
from employees
where first_name = 'Georgi'
order by hire_date;`,
        mysql: `select emp_no, last_name, hire_date
from employees
where first_name = 'Georgi'
order by hire_date;`,
        explanation:
          'Text values are written in single quotes; double quotes would mean a column name in PostgreSQL. The equality is exact in PostgreSQL ("georgi" would not match) but case-insensitive under MySQL\'s default collation.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'employees-085',
    dataset: 'employees',
    level: 3,
    topics: ['date-series', 'aggregates'],
    title: 'Monthly payroll through 2001',
    prompt:
      'For the first day of every month of 2001: the number of salaries in force on that day and their total. A salary is in force from from_date (inclusive) to to_date (exclusive).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Month series joined on a date range',
        postgres: `select m.day::date as day, count(s.emp_no) as salaries, sum(s.salary) as payroll
from generate_series('2001-01-01'::date, '2001-12-01', interval '1 month') as m (day)
left join salaries s on s.from_date <= m.day and s.to_date > m.day
group by m.day
order by m.day;`,
        mysql: `with recursive months (day) as (
  select cast('2001-01-01' as date)
  union all
  select day + interval 1 month from months where day < '2001-12-01'
)
select m.day, count(s.emp_no) as salaries, sum(s.salary) as payroll
from months m
left join salaries s on s.from_date <= m.day and s.to_date > m.day
group by m.day
order by m.day;`,
        mysqlNote: 'A recursive CTE makes the twelve dates.',
        explanation:
          'The series gives the moments to look at; the join keeps every salary whose period contains the moment. This "as of" pattern works for any history table with from/to dates. Unlike a sum of rows, the payroll here goes down when people leave.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'employees-086',
    dataset: 'employees',
    level: 4,
    topics: ['views', 'ranking'],
    title: 'A view of pay rank in the department',
    prompt:
      'Create a view dept_pay_rank (emp_no, dept_no, salary, rank_in_dept) for current employees, ranking current salaries within each current department, highest first. Then: the top 2 of each department.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select dept_no, rank_in_dept, emp_no, salary from dept_pay_rank where rank_in_dept <= 2 order by dept_no, rank_in_dept, emp_no`,
    solutions: [
      {
        approach: 'A view with a window function',
        postgres: `create view dept_pay_rank as
select de.emp_no, de.dept_no, s.salary,
       rank() over (partition by de.dept_no order by s.salary desc) as rank_in_dept
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01';`,
        mysql: `create view dept_pay_rank as
select de.emp_no, de.dept_no, s.salary,
       rank() over (partition by de.dept_no order by s.salary desc) as rank_in_dept
from dept_emp de
join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
where de.to_date = '9999-01-01';`,
        explanation:
          'A window function cannot appear in WHERE, so "top 2 per department" normally needs a subquery; the view makes rank_in_dept an ordinary column to filter on. Careful: a WHERE on dept_no is pushed into the view, but a WHERE on emp_no is not, because the rank must be computed over the whole department first.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'employees-087',
    dataset: 'employees',
    level: 5,
    topics: ['partitioning'],
    title: 'Salaries split by period',
    prompt:
      'Create salaries_by_period with the columns of salaries, range-partitioned by from_date into: before 1990, 1990–1994, and 1995 onwards (open-ended). Copy the salaries in.',
    orderMatters: false,
    checkSql: `select (select count(*) from salaries_before_1990) as before_1990,
       (select count(*) from salaries_1990_1994) as from_1990,
       (select count(*) from salaries_from_1995) as from_1995`,
    checkSqlMysql: `select (select count(*) from salaries_by_period partition (p_before_1990)) as before_1990,
       (select count(*) from salaries_by_period partition (p_1990_1994)) as from_1990,
       (select count(*) from salaries_by_period partition (p_from_1995)) as from_1995`,
    solutions: [
      {
        approach: 'Range partitions with open ends',
        postgres: `create table salaries_by_period (
  emp_no    integer not null,
  salary    integer not null,
  from_date date    not null,
  to_date   date    not null,
  primary key (emp_no, from_date)
) partition by range (from_date);

create table salaries_before_1990 partition of salaries_by_period for values from (minvalue) to ('1990-01-01');
create table salaries_1990_1994   partition of salaries_by_period for values from ('1990-01-01') to ('1995-01-01');
create table salaries_from_1995   partition of salaries_by_period for values from ('1995-01-01') to (maxvalue);

insert into salaries_by_period select emp_no, salary, from_date, to_date from salaries;`,
        mysql: `create table salaries_by_period (
  emp_no    int  not null,
  salary    int  not null,
  from_date date not null,
  to_date   date not null,
  primary key (emp_no, from_date)
)
partition by range columns (from_date) (
  partition p_before_1990 values less than ('1990-01-01'),
  partition p_1990_1994   values less than ('1995-01-01'),
  partition p_from_1995   values less than (maxvalue)
);

insert into salaries_by_period select emp_no, salary, from_date, to_date from salaries;`,
        mysqlNote: 'MAXVALUE makes the last partition open-ended; the first one is open below by construction.',
        explanation:
          'MINVALUE and MAXVALUE leave the outer partitions unbounded, so no future date can fall outside. 5,763 rows go before 1990, 15,087 to 1990–1994 and 36,512 from 1995: recent periods hold most of the data, which is typical of history tables.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE COLUMNS partitioning', url: MY + 'partitioning-columns-range.html' },
    ],
  },
  {
    id: 'employees-088',
    dataset: 'employees',
    level: 1,
    topics: ['dates-basics', 'aggregates'],
    title: 'Hires in February 1990',
    prompt: 'How many employees were hired in February 1990?',
    orderMatters: false,
    solutions: [
      {
        approach: 'A half-open date range',
        postgres: `select count(*) as hires
from employees
where hire_date >= '1990-02-01' and hire_date < '1990-03-01';`,
        mysql: `select count(*) as hires
from employees
where hire_date >= '1990-02-01' and hire_date < '1990-03-01';`,
        explanation:
          '"From the 1st, before the 1st of the next month" needs no knowledge of how many days February has, and it keeps working if the column ever gains a time part. It can also use an index on hire_date, which extract(month …) = 2 cannot.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time types', url: PG + 'datatype-datetime.html' }],
  },
  {
    id: 'employees-089',
    dataset: 'employees',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Namesakes',
    prompt: 'Find pairs of different employees with exactly the same first and last name: both emp_no values (lower first), first_name and last_name, ordered by the first emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self-join on the name, ordered pair',
        postgres: `select a.emp_no as emp_no_1, b.emp_no as emp_no_2, a.first_name, a.last_name
from employees a
join employees b
  on b.first_name = a.first_name
 and b.last_name = a.last_name
 and b.emp_no > a.emp_no
order by a.emp_no;`,
        mysql: `select a.emp_no as emp_no_1, b.emp_no as emp_no_2, a.first_name, a.last_name
from employees a
join employees b
  on b.first_name = a.first_name
 and b.last_name = a.last_name
 and b.emp_no > a.emp_no
order by a.emp_no;`,
        explanation:
          'b.emp_no > a.emp_no does two jobs: it stops a person from matching themselves and lists each pair once instead of twice. Eight pairs share a full name, a reminder that names are not identifiers.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'employees-090',
    dataset: 'employees',
    level: 2,
    topics: ['casting', 'joins'],
    title: 'Birthdays written the European way',
    prompt:
      'HR sends three birth dates as text in DD.MM.YYYY form: 02.09.1953, 19.02.1958, 02.06.1964. Turn them into dates and list the employees born on them: emp_no, first_name, last_name, birth_date, by emp_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'to_date / STR_TO_DATE with a format',
        postgres: `select e.emp_no, e.first_name, e.last_name, e.birth_date
from (values ('02.09.1953'), ('19.02.1958'), ('02.06.1964')) as hr (birth_text)
join employees e on e.birth_date = to_date(hr.birth_text, 'DD.MM.YYYY')
order by e.emp_no;`,
        mysql: `select e.emp_no, e.first_name, e.last_name, e.birth_date
from (select '02.09.1953' as birth_text union all select '19.02.1958' union all select '02.06.1964') as hr
join employees e on e.birth_date = str_to_date(hr.birth_text, '%d.%m.%Y')
order by e.emp_no;`,
        mysqlNote: 'STR_TO_DATE takes the same % codes as DATE_FORMAT.',
        explanation:
          'A plain cast would guess the order of day and month, and \'02.09.1953\' could become 9 February. An explicit format removes the guess. The third date matches nobody, so five employees come out.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: to_date', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: STR_TO_DATE', url: MY + 'date-and-time-functions.html#function_str-to-date' },
    ],
  },
  {
    id: 'employees-091',
    dataset: 'employees',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'The longest spells without a hire',
    prompt: 'Looking only at days on which someone was hired, find the 3 longest gaps until the next hiring day: last hiring day before the gap, next hiring day, and days between.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over distinct hire dates',
        postgres: `with days as (
  select distinct hire_date from employees
),
gaps as (
  select hire_date, lead(hire_date) over (order by hire_date) as next_hire
  from days
)
select hire_date as last_hire, next_hire, next_hire - hire_date as days_between
from gaps
where next_hire is not null
order by days_between desc, last_hire
limit 3;`,
        mysql: `with days as (
  select distinct hire_date from employees
),
gaps as (
  select hire_date, lead(hire_date) over (order by hire_date) as next_hire
  from days
)
select hire_date as last_hire, next_hire, datediff(next_hire, hire_date) as days_between
from gaps
where next_hire is not null
order by days_between desc, last_hire
limit 3;`,
        explanation:
          'DISTINCT first, so a day with several hires counts once; then LEAD pairs each hiring day with the next. The longest gaps are all in 1999, when hiring had almost stopped: 67 days between 15 June and 21 August.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-092',
    dataset: 'employees',
    level: 2,
    topics: ['text-aggregation', 'joins'],
    title: 'Every manager of each department',
    prompt: 'For each department: dept_name and the last names of all its managers ever, in the order they started, separated by " → ". Order by dept_no.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg / GROUP_CONCAT ordered by start date',
        postgres: `select d.dept_name,
       string_agg(e.last_name, ' → ' order by m.from_date) as managers
from departments d
join dept_manager m on m.dept_no = d.dept_no
join employees e on e.emp_no = m.emp_no
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        mysql: `select d.dept_name,
       group_concat(e.last_name order by m.from_date separator ' → ') as managers
from departments d
join dept_manager m on m.dept_no = d.dept_no
join employees e on e.emp_no = m.emp_no
group by d.dept_no, d.dept_name
order by d.dept_no;`,
        explanation:
          'The ORDER BY inside the aggregate decides the order of names in the string, independent of the query\'s final ORDER BY. Production, Quality Management and Customer Service had four managers each; the others two.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'employees-093',
    dataset: 'employees',
    level: 3,
    topics: ['pivot', 'dates-basics'],
    title: 'Current staff by department and hire year',
    prompt: 'For current employees: per department (dept_no), how many were hired in each year from 1995 to 1999, one column per year. Order by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional counts per hire year',
        postgres: `select de.dept_no,
       count(*) filter (where extract(year from e.hire_date) = 1995) as h1995,
       count(*) filter (where extract(year from e.hire_date) = 1996) as h1996,
       count(*) filter (where extract(year from e.hire_date) = 1997) as h1997,
       count(*) filter (where extract(year from e.hire_date) = 1998) as h1998,
       count(*) filter (where extract(year from e.hire_date) = 1999) as h1999
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        mysql: `select de.dept_no,
       sum(year(e.hire_date) = 1995) as h1995,
       sum(year(e.hire_date) = 1996) as h1996,
       sum(year(e.hire_date) = 1997) as h1997,
       sum(year(e.hire_date) = 1998) as h1998,
       sum(year(e.hire_date) = 1999) as h1999
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by de.dept_no
order by de.dept_no;`,
        explanation:
          'Each column filters the same group by a different year. Hiring falls sharply towards 1999: the company hired less and less in its last years.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'employees-094',
    dataset: 'employees',
    level: 4,
    topics: ['materialized-views'],
    title: 'Salary bands, stored',
    prompt:
      'Store how many current salaries fall into each 10,000 band (band = lower bound, e.g. 60000 for 60,000–69,999) for a pay-equity dashboard that is refreshed nightly. Then list the bands.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select band, salaries from salary_bands order by band`,
    solutions: [
      {
        approach: 'Materialized view keyed by band',
        postgres: `create materialized view salary_bands as
select (salary / 10000) * 10000 as band, count(*) as salaries
from salaries
where to_date = '9999-01-01'
group by (salary / 10000) * 10000;

create unique index salary_bands_key on salary_bands (band);
-- nightly: refresh materialized view concurrently salary_bands;`,
        mysql: `create table salary_bands (band int primary key, salaries int);

replace into salary_bands
select (salary div 10000) * 10000, count(*)
from salaries
where to_date = '9999-01-01'
group by (salary div 10000) * 10000;`,
        mysqlNote: 'DIV is integer division in MySQL; / would give a decimal such as 6.3241.',
        explanation:
          'In PostgreSQL integer / integer already drops the fraction, which is exactly what banding needs. A band with no salaries (140,000 here) simply has no row; a date-series-style join with a band series would show it as 0.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'employees-095',
    dataset: 'employees',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for six-figure salaries',
    prompt:
      'A compliance report lists salary rows of 100,000 or more by emp_no. They are 1,836 of 57,362 rows. Create an index holding only those rows that answers the report without reading the table.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'salaries' and indexdef like '%salary%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'salaries' and column_name = 'salary' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Partial covering index',
        postgres: `create index salaries_six_figures_idx on salaries (emp_no, from_date) include (salary)
where salary >= 100000;

-- used by: select emp_no, from_date, salary from salaries where salary >= 100000 order by emp_no, from_date`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'About 3% of the rows, already in report order, with the salary included: an index-only scan with no sort.',
      },
      {
        approach: 'Index led by salary',
        postgres: `create index salaries_salary_idx on salaries (salary, emp_no, from_date);`,
        mysql: `create index salaries_salary_idx on salaries (salary, emp_no, from_date);`,
        explanation: 'salary >= 100000 is one range at the end of this index, and the other columns make it covering; the result still needs a sort by emp_no.',
      },
    ],
    comparison: 'Both avoid reading the table. The partial index is smaller and pre-sorted; the full one also serves other salary thresholds and works in MySQL.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'employees-096',
    dataset: 'employees',
    level: 3,
    topics: ['lateral', 'joins'],
    title: 'The newest arrivals under each manager',
    prompt: 'For each current department manager: dept_no, the manager\'s emp_no, and the 2 people who most recently joined that department (emp_no, from_date). Order by dept_no, then from_date descending, then emp_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'CROSS JOIN LATERAL … LIMIT 2',
        postgres: `select m.dept_no, m.emp_no as manager, newest.emp_no, newest.from_date
from dept_manager m
cross join lateral (
  select de.emp_no, de.from_date
  from dept_emp de
  where de.dept_no = m.dept_no
  order by de.from_date desc, de.emp_no
  limit 2
) newest
where m.to_date = '9999-01-01'
order by m.dept_no, newest.from_date desc, newest.emp_no;`,
        mysql: `select m.dept_no, m.emp_no as manager, newest.emp_no, newest.from_date
from dept_manager m
cross join lateral (
  select de.emp_no, de.from_date
  from dept_emp de
  where de.dept_no = m.dept_no
  order by de.from_date desc, de.emp_no
  limit 2
) newest
where m.to_date = '9999-01-01'
order by m.dept_no, newest.from_date desc, newest.emp_no;`,
        explanation:
          'For each manager row the subquery looks only at that department and keeps two rows. The same with ROW_NUMBER would number every assignment of every department before throwing most away; LATERAL can stop early with an index on (dept_no, from_date).',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'employees-097',
    dataset: 'employees',
    level: 4,
    topics: ['generated-columns', 'dates-advanced'],
    title: 'Age at hire as a column',
    prompt: 'Add a stored generated column age_at_hire to employees: full years between birth_date and hire_date. Then: how many were hired at 20 (the youngest age) and at 46 (the oldest)?',
    orderMatters: true,
    checkSql: `select age_at_hire, count(*) as employees from employees where age_at_hire in (20, 46) group by age_at_hire order by age_at_hire`,
    solutions: [
      {
        approach: 'age() / TIMESTAMPDIFF in a generated column',
        postgres: `alter table employees
add column age_at_hire integer
generated always as (extract(year from age(hire_date::timestamp, birth_date::timestamp))::integer) stored;`,
        mysql: `alter table employees
add column age_at_hire int
generated always as (timestampdiff(year, birth_date, hire_date)) stored;`,
        mysqlNote: 'TIMESTAMPDIFF(YEAR, …) counts completed years, like age().',
        explanation:
          'Both depend only on the two dates in the row, so they may be stored. In PostgreSQL the casts to timestamp matter: age() on plain dates resolves to the time-zone-aware version, which is not immutable and is refused in a generated column. Age relative to today could not be: current_date changes, and a generated column must give the same result every time. 26 people were hired at 20, 7 at 46.',
      },
    ],
    docs: [{ label: 'PostgreSQL: age', url: PG + 'functions-datetime.html' }],
  },
  {
    id: 'employees-098',
    dataset: 'employees',
    level: 3,
    topics: ['subtotals'],
    title: 'Current staff by department and gender, every total',
    prompt:
      'Count current employees by department and gender with all subtotals: per department, per gender, and overall (label totals \'all\'). Order: department rows first, then gender totals, then the grand total.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'CUBE',
        postgres: `select coalesce(de.dept_no, 'all') as dept_no, coalesce(e.gender, 'all') as gender, count(*) as employees
from dept_emp de
join employees e on e.emp_no = de.emp_no
where de.to_date = '9999-01-01'
group by cube (de.dept_no, e.gender)
order by grouping(de.dept_no), de.dept_no, grouping(e.gender), e.gender;`,
        mysql: `select dept_no, gender, employees
from (
  select coalesce(de.dept_no, 'all') as dept_no, coalesce(e.gender, 'all') as gender, count(*) as employees,
         grouping(de.dept_no) as gd, grouping(e.gender) as gg, de.dept_no as d, e.gender as g
  from dept_emp de
  join employees e on e.emp_no = de.emp_no
  where de.to_date = '9999-01-01'
  group by de.dept_no, e.gender with rollup
  union all
  select 'all', e.gender, count(*), 1, 0, null, e.gender
  from dept_emp de
  join employees e on e.emp_no = de.emp_no
  where de.to_date = '9999-01-01'
  group by e.gender
) t
order by gd, d, gg, g;`,
        mysqlNote: 'No CUBE in MySQL: ROLLUP gives department × gender, department totals and the grand total; the gender totals are added with UNION ALL.',
        explanation:
          'CUBE (a, b) produces every combination of grouped and totalled columns: 18 detail rows, 9 department totals, 2 gender totals and 1 grand total. GROUPING() tells a real value from a total row, which matters if a column itself can be NULL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CUBE', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'employees-099',
    dataset: 'employees',
    level: 4,
    topics: ['upsert', 'functions'],
    title: 'Keep the highest salary ever seen',
    prompt:
      'salary_peaks (emp_no primary key, peak) holds (10050, 97830) and (10100, 80000). A feed arrives: (10050, 97000), (10100, 82000), (10150, 100182). Upsert it so that peak only ever goes up.',
    orderMatters: true,
    checkSql: `select emp_no, peak from salary_peaks order by emp_no`,
    solutions: [
      {
        approach: 'GREATEST in the update part',
        postgres: `create table salary_peaks (emp_no integer primary key, peak integer not null);
insert into salary_peaks values (10050, 97830), (10100, 80000);

insert into salary_peaks (emp_no, peak)
values (10050, 97000), (10100, 82000), (10150, 100182)
on conflict (emp_no) do update set peak = greatest(salary_peaks.peak, excluded.peak);`,
        mysql: `create table salary_peaks (emp_no int primary key, peak int not null);
insert into salary_peaks values (10050, 97830), (10100, 80000);

insert into salary_peaks (emp_no, peak)
values (10050, 97000), (10100, 82000), (10150, 100182) as new
on duplicate key update peak = greatest(salary_peaks.peak, new.peak);`,
        explanation:
          'GREATEST compares the stored and the incoming value and keeps the larger: 10050 stays at 97,830 although the feed is lower, 10100 rises to 82,000, 10150 is new. The same pattern keeps a minimum (LEAST) or a latest timestamp.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GREATEST and LEAST', url: PG + 'functions-conditional.html#FUNCTIONS-GREATEST-LEAST' }],
  },
  {
    id: 'employees-100',
    dataset: 'employees',
    level: 2,
    topics: ['full-join', 'aggregates'],
    title: 'Titles in Development and in Sales',
    prompt: 'Count current employees per current title in Development (d005) and in Sales (d007), side by side: title, development, sales, with 0 where a department has nobody with that title. Order by title.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'FULL JOIN of two per-title counts',
        postgres: `with cur as (
  select de.dept_no, t.title
  from dept_emp de
  join titles t on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
  where de.to_date = '9999-01-01' and de.dept_no in ('d005', 'd007')
),
dev as (select title, count(*) as n from cur where dept_no = 'd005' group by title),
sales as (select title, count(*) as n from cur where dept_no = 'd007' group by title)
select coalesce(d.title, s.title) as title, coalesce(d.n, 0) as development, coalesce(s.n, 0) as sales
from dev d
full join sales s on s.title = d.title
order by title;`,
        mysql: `with cur as (
  select de.dept_no, t.title
  from dept_emp de
  join titles t on t.emp_no = de.emp_no and t.to_date = '9999-01-01'
  where de.to_date = '9999-01-01' and de.dept_no in ('d005', 'd007')
),
dev as (select title, count(*) as n from cur where dept_no = 'd005' group by title),
sales as (select title, count(*) as n from cur where dept_no = 'd007' group by title)
select d.title, d.n as development, coalesce(s.n, 0) as sales
from dev d left join sales s on s.title = d.title
union all
select s.title, 0, s.n
from sales s left join dev d on d.title = s.title
where d.title is null
order by title;`,
        mysqlNote: 'No FULL JOIN in MySQL: a LEFT JOIN plus the titles only Sales has.',
        explanation:
          'Engineering titles exist only in Development and the Staff titles dominate Sales, so many cells are 0. Conditional aggregation over cur would give the same table in one pass; the FULL JOIN version shows how to combine two summaries that were computed separately.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'employees-101',
    dataset: 'employees',
    level: 2,
    topics: ['set-operations'],
    title: 'Titles found in Development but not in Sales',
    prompt: 'Which current titles are held by someone in Development (d005) but by nobody in Sales (d007)? Alphabetically.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'EXCEPT of two title lists',
        postgres: `select t.title
from titles t join dept_emp de on de.emp_no = t.emp_no
where t.to_date = '9999-01-01' and de.to_date = '9999-01-01' and de.dept_no = 'd005'
except
select t.title
from titles t join dept_emp de on de.emp_no = t.emp_no
where t.to_date = '9999-01-01' and de.to_date = '9999-01-01' and de.dept_no = 'd007'
order by title;`,
        mysql: `select t.title
from titles t join dept_emp de on de.emp_no = t.emp_no
where t.to_date = '9999-01-01' and de.to_date = '9999-01-01' and de.dept_no = 'd005'
except
select t.title
from titles t join dept_emp de on de.emp_no = t.emp_no
where t.to_date = '9999-01-01' and de.to_date = '9999-01-01' and de.dept_no = 'd007'
order by title;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation: 'The four engineering titles: Assistant Engineer, Engineer, Senior Engineer and Technique Leader. EXCEPT removes duplicates, so each title appears once however many people hold it. The ORDER BY applies to the whole result.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'employees-102',
    dataset: 'employees',
    level: 4,
    topics: ['arrays', 'strings'],
    title: 'Careers that started Engineer, then Senior Engineer',
    prompt: 'Collect each employee\'s titles in time order, then count the employees whose first two titles were Engineer followed by Senior Engineer.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Array slice [1:2] / first two items of an ordered list',
        postgres: `select count(*) as employees
from (
  select emp_no, array_agg(title order by from_date) as career
  from titles
  group by emp_no
) c
where c.career[1:2] = array['Engineer', 'Senior Engineer']::varchar[];`,
        mysql: `select count(*) as employees
from (
  select emp_no, group_concat(title order by from_date separator '|') as career
  from titles
  group by emp_no
) c
where substring_index(c.career, '|', 2) = 'Engineer|Senior Engineer';`,
        mysqlNote: 'No arrays: an ordered GROUP_CONCAT with a separator, and SUBSTRING_INDEX for "the first two items".',
        explanation:
          'array[1:2] is a slice: elements 1 to 2 as a new array, compared element by element. 1,306 careers start with that promotion. Someone whose only title was Engineer has a one-element slice, which does not match.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Arrays', url: PG + 'arrays.html' }],
  },
  {
    id: 'employees-103',
    dataset: 'employees',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'The employee row as a mutex',
    prompt:
      'Changes to one person\'s salary history must never interleave. Agree that every such change first locks the person\'s row in employees. Then give 10100 a 3% raise from 2002-08-01 (close the current salary, add the new one). In PostgreSQL you are already inside a transaction.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select salary, from_date, to_date from salaries where emp_no = 10100 and from_date >= '2001-01-01' order by from_date`,
    solutions: [
      {
        approach: 'Lock the parent row, then change the children',
        postgres: `select emp_no from employees where emp_no = 10100 for update;

update salaries set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
insert into salaries (emp_no, salary, from_date, to_date)
select emp_no, round(salary * 1.03), '2002-08-01', '9999-01-01'
from salaries where emp_no = 10100 and to_date = '2002-08-01';`,
        mysql: `start transaction;

select emp_no from employees where emp_no = 10100 for update;

update salaries set to_date = '2002-08-01' where emp_no = 10100 and to_date = '9999-01-01';
insert into salaries (emp_no, salary, from_date, to_date)
select emp_no, round(salary * 1.03), '2002-08-01', '9999-01-01'
from salaries where emp_no = 10100 and to_date = '2002-08-01';

commit;`,
        explanation:
          'Locking the current salary row alone would not stop a second session from inserting another new salary for the same person. A single, agreed row to lock (the parent) serialises all changes for that person, including inserts. 74,957 × 1.03 rounds to 77,206.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Row-level locks', url: PG + 'explicit-locking.html#LOCKING-ROWS' }],
  },
  {
    id: 'employees-104',
    dataset: 'employees',
    level: 3,
    topics: ['cte', 'joins'],
    title: 'Do managers earn more than their staff?',
    prompt: 'For each department: the current manager\'s current salary, the average current salary of the department (whole number), and the difference. Order by dept_no.',
    hint: CURRENT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'One CTE per side, then join',
        postgres: `with manager_pay as (
  select dm.dept_no, s.salary
  from dept_manager dm
  join salaries s on s.emp_no = dm.emp_no and s.to_date = '9999-01-01'
  where dm.to_date = '9999-01-01'
),
dept_pay as (
  select de.dept_no, round(avg(s.salary)) as avg_salary
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
  where de.to_date = '9999-01-01'
  group by de.dept_no
)
select m.dept_no, m.salary as manager_salary, d.avg_salary, m.salary - d.avg_salary as difference
from manager_pay m
join dept_pay d on d.dept_no = m.dept_no
order by m.dept_no;`,
        mysql: `with manager_pay as (
  select dm.dept_no, s.salary
  from dept_manager dm
  join salaries s on s.emp_no = dm.emp_no and s.to_date = '9999-01-01'
  where dm.to_date = '9999-01-01'
),
dept_pay as (
  select de.dept_no, round(avg(s.salary)) as avg_salary
  from dept_emp de
  join salaries s on s.emp_no = de.emp_no and s.to_date = '9999-01-01'
  where de.to_date = '9999-01-01'
  group by de.dept_no
)
select m.dept_no, m.salary as manager_salary, d.avg_salary, m.salary - d.avg_salary as difference
from manager_pay m
join dept_pay d on d.dept_no = m.dept_no
order by m.dept_no;`,
        explanation:
          'Not always: the managers of Production (d004) and Customer Service (d009) earn less than their department average. In this sample database salaries are generated, so "managers earn more" is an assumption worth checking, not a law.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'employees-105',
    dataset: 'employees',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'Hand a department to a new manager',
    prompt:
      'From 2002-08-01 employee 10300 manages d004 (Production). In one statement, end the current manager\'s term on that day and start the new term (to 9999-01-01).',
    hint: CURRENT_NOTE,
    orderMatters: true,
    checkSql: `select emp_no, from_date, to_date from dept_manager where dept_no = 'd004' and to_date >= '2002-01-01' order by from_date`,
    solutions: [
      {
        approach: 'MERGE with a two-row source: the old term and the new one',
        postgres: `merge into dept_manager m
using (
  select emp_no, dept_no, from_date, date '2002-08-01' as new_to
  from dept_manager where dept_no = 'd004' and to_date = '9999-01-01'
  union all
  select 10300, 'd004', date '2002-08-01', date '9999-01-01'
) s
on m.emp_no = s.emp_no and m.dept_no = s.dept_no and m.from_date = s.from_date
when matched then
  update set to_date = s.new_to
when not matched then
  insert (emp_no, dept_no, from_date, to_date) values (s.emp_no, s.dept_no, s.from_date, s.new_to);`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation:
          'The source has one row that matches (the current term, to be closed) and one that does not (the new term, to be inserted), so both changes happen in one atomic statement. ON uses the full key (emp_no, dept_no, from_date) of dept_manager.',
      },
      {
        approach: 'UPDATE then INSERT in a transaction',
        postgres: `update dept_manager set to_date = '2002-08-01' where dept_no = 'd004' and to_date = '9999-01-01';
insert into dept_manager (emp_no, dept_no, from_date, to_date) values (10300, 'd004', '2002-08-01', '9999-01-01');`,
        mysql: `start transaction;
update dept_manager set to_date = '2002-08-01' where dept_no = 'd004' and to_date = '9999-01-01';
insert into dept_manager (emp_no, dept_no, from_date, to_date) values (10300, 'd004', '2002-08-01', '9999-01-01');
commit;`,
        explanation: 'Two statements; the transaction makes sure no reader ever sees a department with zero or two current managers.',
      },
    ],
    comparison: 'Same history afterwards: 110420 until 2002-08-01, then 10300.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'employees-106',
    dataset: 'employees',
    level: 4,
    topics: ['normalization', 'lag-lead'],
    title: 'A to_date you could compute',
    prompt:
      'In salaries, each period\'s to_date is supposed to equal the next period\'s from_date. Check it: count periods where a next period exists and matches, where it exists and does not match, and last periods.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Compare to_date with LEAD(from_date)',
        postgres: `with s as (
  select to_date, lead(from_date) over (partition by emp_no order by from_date) as next_from
  from salaries
)
select count(*) filter (where next_from = to_date) as matching,
       count(*) filter (where next_from <> to_date) as mismatching,
       count(*) filter (where next_from is null) as last_periods
from s;`,
        mysql: `with s as (
  select to_date, lead(from_date) over (partition by emp_no order by from_date) as next_from
  from salaries
)
select sum(next_from = to_date) as matching,
       sum(next_from <> to_date) as mismatching,
       sum(next_from is null) as last_periods
from s;`,
        explanation:
          'All 51,338 inner periods match, so their to_date is derivable and, strictly, redundant. Only the last period of each person carries information: 9999-01-01 (still current) or the date they left. Keeping to_date anyway makes "salary on a date" a simple range lookup instead of a window query, a classic, deliberate trade-off.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'employees-107',
    dataset: 'employees',
    level: 5,
    topics: ['procedures', 'transactions'],
    title: 'Someone leaves the company',
    prompt:
      'Write a procedure offboard(p_emp_no, p_date, OUT p_closed) that ends every open period of the employee (dept_emp, titles, salaries, dept_manager) on p_date and reports how many rows it closed. Offboard 10050 on 2002-08-01.',
    hint: CURRENT_NOTE,
    orderMatters: false,
    checkSql: `select (select count(*) from dept_emp where emp_no = 10050 and to_date = '9999-01-01')
     + (select count(*) from titles where emp_no = 10050 and to_date = '9999-01-01')
     + (select count(*) from salaries where emp_no = 10050 and to_date = '9999-01-01') as still_open,
       (select count(*) from salaries where emp_no = 10050 and to_date = '2002-08-01') as closed_salary`,
    solutions: [
      {
        approach: 'Four UPDATEs, row counts added up',
        postgres: `create procedure offboard(p_emp_no integer, p_date date, out p_closed integer)
language plpgsql
as $$
declare
  n integer;
begin
  p_closed := 0;
  update dept_emp set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  get diagnostics n = row_count; p_closed := p_closed + n;
  update titles set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  get diagnostics n = row_count; p_closed := p_closed + n;
  update salaries set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  get diagnostics n = row_count; p_closed := p_closed + n;
  update dept_manager set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  get diagnostics n = row_count; p_closed := p_closed + n;
end;
$$;

call offboard(10050, '2002-08-01', null);`,
        mysql: `create procedure offboard(p_emp_no int, p_date date, out p_closed int)
begin
  set p_closed = 0;
  update dept_emp set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  set p_closed = p_closed + row_count();
  update titles set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  set p_closed = p_closed + row_count();
  update salaries set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  set p_closed = p_closed + row_count();
  update dept_manager set to_date = p_date where emp_no = p_emp_no and to_date = '9999-01-01';
  set p_closed = p_closed + row_count();
end;

call offboard(10050, '2002-08-01', @closed);
select @closed;`,
        mysqlNote: DELIMITER_NOTE + ' ROW_COUNT() after each UPDATE gives the rows it changed.',
        explanation:
          'One call closes everything consistently, so no report ever sees someone with a closed department but an open salary. 10050 had three open rows (department, title, salary) and no manager term, so p_closed is 3.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GET DIAGNOSTICS', url: PG + 'plpgsql-statements.html#PLPGSQL-STATEMENTS-DIAGNOSTICS' }],
  },
  {
    id: 'employees-108',
    dataset: 'employees',
    level: 5,
    topics: ['triggers', 'constraints'],
    title: 'No overlapping salary periods',
    prompt:
      'Add a trigger that rejects a new salary row whose period overlaps an existing one of the same employee. Then do a correct raise for 10200: close the current period on 2002-08-01 and insert 59,000 from that day.',
    orderMatters: true,
    checkSql: `update salaries set to_date = '2002-08-01' where emp_no = 10200 and to_date = '9999-01-01';
insert into salaries (emp_no, salary, from_date, to_date) values (10200, 59000, '2002-08-01', '9999-01-01');
select salary, from_date, to_date from salaries where emp_no = 10200 and from_date >= '2001-01-01' order by from_date`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger with an overlap test',
        postgres: `create function check_salary_overlap() returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from salaries s
    where s.emp_no = new.emp_no and s.from_date < new.to_date and new.from_date < s.to_date
  ) then
    raise exception 'salary period of % overlaps an existing one', new.emp_no;
  end if;
  return new;
end;
$$;

create trigger salaries_no_overlap
before insert on salaries
for each row execute function check_salary_overlap();`,
        mysql: `create trigger salaries_no_overlap
before insert on salaries
for each row
begin
  if exists (
    select 1 from salaries s
    where s.emp_no = new.emp_no and s.from_date < new.to_date and new.from_date < s.to_date
  ) then
    signal sqlstate '45000' set message_text = 'salary period overlaps an existing one';
  end if;
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'Two periods [a, b) and [c, d) overlap exactly when a < d and c < b. Inserting the raise without first closing the current period would now fail. PostgreSQL can also enforce this declaratively with an exclusion constraint on a date range; a trigger works in both databases.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' }],
  },
]
