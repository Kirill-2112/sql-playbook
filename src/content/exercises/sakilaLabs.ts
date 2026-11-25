import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

/** One step of a Sakila lab (src/content/labs.ts): a level 3 exercise like any other, verified on both databases. */
function step(id: string, topics: string[], title: string, prompt: string, postgres: string, mysql: string, approach: string, explanation: string, docs: Exercise['docs']): Exercise {
  return {
    id,
    dataset: 'sakila',
    level: 3,
    topics,
    title,
    prompt,
    orderMatters: true,
    solutions: [
      {
        approach,
        postgres,
        mysql,
        mysqlNote: 'Days between two dates: DATEDIFF(later, earlier) in MySQL, later::date − earlier::date in PostgreSQL.',
        explanation,
      },
    ],
    docs,
  }
}

const DOCS = [
  { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
  { label: 'MySQL: DATEDIFF', url: MY + 'date-and-time-functions.html#function_datediff' },
]

// Every step starts from the returned rentals: how many days each was kept, and how many days its film allows.
const RETURNED_PG = `with returned as (
  select i.store_id,
         f.rental_duration,
         r.return_date::date - r.rental_date::date as days_kept
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.return_date is not null
)`
const RETURNED_MY = `with returned as (
  select i.store_id,
         f.rental_duration,
         datediff(r.return_date, r.rental_date) as days_kept
  from rental r
  join inventory i on i.inventory_id = r.inventory_id
  join film f on f.film_id = i.film_id
  where r.return_date is not null
)`
const LATE = 'sum(case when days_kept > rental_duration then 1 else 0 end)'

// Lab "Who returns films late?": the rental rules, not the customers, decide who is late.
const steps: Exercise[] = [
  step(
    'sakila-132',
    ['cte', 'conditional-aggregates'],
    'How many rentals come back late?',
    'A rental is late when it was kept more days than its film’s rental_duration (days counted between the rental and return dates). Of the returned rentals: how many were returned, how many late, and the late share in percent (1 decimal).',
    `${RETURNED_PG}
select count(*) as returned,
       ${LATE} as late,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned;`,
    `${RETURNED_MY}
select count(*) as returned,
       ${LATE} as late,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned;`,
    'A CTE of returned rentals, then a conditional count',
    'The CTE works out, once, the two numbers every later step needs: days kept and days allowed. SUM(CASE … THEN 1 ELSE 0 END) counts the late ones.',
    DOCS,
  ),
  step(
    'sakila-133',
    ['cte', 'conditional-aggregates'],
    'Late returns by store',
    'The same late share, for each store: store_id, returned rentals, late ones and the late share in percent (1 decimal), by store_id.',
    `${RETURNED_PG}
select store_id,
       count(*) as returned,
       ${LATE} as late,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned
group by store_id
order by store_id;`,
    `${RETURNED_MY}
select store_id,
       count(*) as returned,
       ${LATE} as late,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned
group by store_id
order by store_id;`,
    'The same CTE, grouped',
    'If one store were careless, its share would stand out. Comparing shares, not counts, keeps a busier store from looking worse just for being busy.',
    DOCS,
  ),
  step(
    'sakila-134',
    ['cte', 'aggregates'],
    'Days kept against days allowed',
    'For each rental_duration (the days a film may be kept): the returned rentals, the average days actually kept (1 decimal) and the late share in percent (1 decimal), by rental_duration.',
    `${RETURNED_PG}
select rental_duration,
       count(*) as returned,
       round(avg(days_kept), 1) as avg_days_kept,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned
group by rental_duration
order by rental_duration;`,
    `${RETURNED_MY}
select rental_duration,
       count(*) as returned,
       round(avg(days_kept), 1) as avg_days_kept,
       round(100.0 * ${LATE} / count(*), 1) as late_pct
from returned
group by rental_duration
order by rental_duration;`,
    'Group by the rule itself',
    'If customers followed the rules, films allowed 3 days would come back sooner than films allowed 7. The average days kept shows whether they do.',
    DOCS,
  ),
  step(
    'sakila-135',
    ['cte', 'conditional-aggregates'],
    'What if every film could be kept 7 days?',
    'Compare the late share now (1 decimal) with the share there would be if every film could be kept 7 days (1 decimal): late_now_pct and late_if_7_days_pct.',
    `${RETURNED_PG}
select round(100.0 * ${LATE} / count(*), 1) as late_now_pct,
       round(100.0 * sum(case when days_kept > 7 then 1 else 0 end) / count(*), 1) as late_if_7_days_pct
from returned;`,
    `${RETURNED_MY}
select round(100.0 * ${LATE} / count(*), 1) as late_now_pct,
       round(100.0 * sum(case when days_kept > 7 then 1 else 0 end) / count(*), 1) as late_if_7_days_pct
from returned;`,
    'A what-if in one more CASE',
    'The data already holds the answer to "what if": the same rentals, judged by another rule. No change to the database is needed to see the effect of a new policy.',
    DOCS,
  ),
]

// The first and last steps return a single row: there is no order to check.
export const sakilaLabs: Exercise[] = steps.map((e) => (e.id === 'sakila-132' || e.id === 'sakila-135' ? { ...e, orderMatters: false } : e))
