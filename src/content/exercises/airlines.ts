import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const UTC_NOTE =
  'All times are stored in UTC: timestamptz in PostgreSQL, DATETIME holding UTC in MySQL. The data is a snapshot taken at 2025-12-01 00:00 UTC.'
const VALIDITY_NOTE =
  'A route_no can change month to month (another airplane, another duration), so routes has one row per route and month: valid_from is included, valid_to is not. A flight belongs to the route row whose period contains its scheduled_departure.'
const DECEMBER_NOTE = 'December 2025 routes are the rows with valid_from = 2025-12-01.'
const TZ_NOTE =
  'MySQL needs its time zone tables to understand names like Europe/Rome; the official Docker image loads them. Without them CONVERT_TZ returns NULL.'
const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'
const SAMPLE_NOTE = 'The dataset keeps every 200th booking, so these totals are a sample of the airline, not all of it.'

/** The flights ↔ routes join used by many exercises: same route number, departure inside the validity period. */
const ROUTE_JOIN = `join routes r on r.route_no = f.route_no
             and f.scheduled_departure >= r.valid_from
             and f.scheduled_departure <  r.valid_to`

export const airlinesExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'airlines-001',
    dataset: 'airlines',
    level: 1,
    topics: ['select-basics'],
    title: 'Long-haul airplanes',
    prompt: 'Which airplanes can fly at least 10,000 km? Show airplane_code, model and range_km, longest range first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE + ORDER BY',
        postgres: `select airplane_code, model, range_km
from airplanes
where range_km >= 10000
order by range_km desc, airplane_code;`,
        mysql: `select airplane_code, model, range_km
from airplanes
where range_km >= 10000
order by range_km desc, airplane_code;`,
        explanation: 'A plain filter and sort. airplane_code as the second sort key keeps the order fixed if two models ever share a range.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'airlines-002',
    dataset: 'airlines',
    level: 1,
    topics: ['select-basics'],
    title: 'Airports of Moscow',
    prompt: 'List the airports of Moscow, Russia: airport_code and airport_name, ordered by code.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Filter on city and country',
        postgres: `select airport_code, airport_name
from airports
where city = 'Moscow' and country = 'Russia'
order by airport_code;`,
        mysql: `select airport_code, airport_name
from airports
where city = 'Moscow' and country = 'Russia'
order by airport_code;`,
        explanation:
          'There is no city table, only a city name on each airport. Filtering on the country too is a good habit: many city names exist in several countries.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'airlines-003',
    dataset: 'airlines',
    level: 1,
    topics: ['dates-basics', 'conditions'],
    title: 'Cancelled in October',
    prompt:
      'Which flights scheduled to depart in October 2025 were cancelled? Show flight_id, route_no and scheduled_departure, in departure order.',
    hint: UTC_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Half-open date range',
        postgres: `select flight_id, route_no, scheduled_departure
from flights
where status = 'Cancelled'
  and scheduled_departure >= '2025-10-01'
  and scheduled_departure <  '2025-11-01'
order by scheduled_departure, flight_id;`,
        mysql: `select flight_id, route_no, scheduled_departure
from flights
where status = 'Cancelled'
  and scheduled_departure >= '2025-10-01'
  and scheduled_departure <  '2025-11-01'
order by scheduled_departure, flight_id;`,
        mysqlNote: 'The MySQL column is a DATETIME, so the result has no "+00" at the end. The moments are the same.',
        explanation:
          '">= first day and < first day of the next month" catches every moment of October, including 23:59:59.5, and still lets an index on the column be used. In PostgreSQL the text \'2025-10-01\' is read in the session time zone, which is UTC here.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Date/time types', url: PG + 'datatype-datetime.html' },
      { label: 'MySQL: DATETIME', url: MY + 'datetime.html' },
    ],
  },
  {
    id: 'airlines-004',
    dataset: 'airlines',
    level: 1,
    topics: ['null'],
    title: 'In the air right now',
    prompt:
      'At the moment of the snapshot, which flights have taken off but not landed yet? Show flight_id, route_no and actual_departure, earliest take-off first.',
    hint: 'actual_departure and actual_arrival stay NULL until the event happens.',
    orderMatters: true,
    solutions: [
      {
        approach: 'IS NULL / IS NOT NULL',
        postgres: `select flight_id, route_no, actual_departure
from flights
where actual_departure is not null
  and actual_arrival is null
order by actual_departure, flight_id;`,
        mysql: `select flight_id, route_no, actual_departure
from flights
where actual_departure is not null
  and actual_arrival is null
order by actual_departure, flight_id;`,
        explanation:
          'NULL means "has not happened yet". The result is exactly the 20 flights with status Departed, which shows the status column and the times agree.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison predicates', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'airlines-005',
    dataset: 'airlines',
    level: 1,
    topics: ['text-search'],
    title: 'Island airports in Australia',
    prompt:
      'Find the Australian airports with "island" anywhere in their name, in any letter case. Show airport_code and airport_name, ordered by code.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ILIKE',
        postgres: `select airport_code, airport_name
from airports
where country = 'Australia'
  and airport_name ilike '%island%'
order by airport_code;`,
        mysql: `select airport_code, airport_name
from airports
where country = 'Australia'
  and airport_name like '%island%'
order by airport_code;`,
        mysqlNote: 'There is no ILIKE. LIKE is already case-insensitive because the column uses a _ci (case-insensitive) collation.',
        explanation: 'ILIKE is LIKE that ignores letter case. % matches any run of characters, including none.',
      },
      {
        approach: 'Regular expression',
        postgres: `select airport_code, airport_name
from airports
where country = 'Australia'
  and airport_name ~* 'island'
order by airport_code;`,
        mysql: `select airport_code, airport_name
from airports
where country = 'Australia'
  and airport_name regexp 'island'
order by airport_code;`,
        mysqlNote: 'REGEXP follows the column collation, so it is case-insensitive here too.',
        explanation: '~* is a case-insensitive regular expression match. A regex matches anywhere in the text unless anchored with ^ or $.',
      },
    ],
    comparison: 'For a plain substring both work; LIKE is simpler. Regular expressions pay off for patterns LIKE cannot express, such as "Island or Islands at the end".',
    docs: [
      { label: 'PostgreSQL: Pattern matching', url: PG + 'functions-matching.html' },
      { label: 'MySQL: Regular expressions', url: MY + 'regexp.html' },
    ],
  },
  {
    id: 'airlines-006',
    dataset: 'airlines',
    level: 1,
    topics: ['strings'],
    title: 'First and last names',
    prompt:
      'passenger_name holds "First Last". For the 10 lowest ticket numbers, show ticket_no, first_name (before the first space) and last_name (everything after it).',
    hint: 'Some last names contain a space themselves, so "the last word" is not the same as "everything after the first space".',
    orderMatters: true,
    solutions: [
      {
        approach: 'Position of the first space',
        postgres: `select ticket_no,
       split_part(passenger_name, ' ', 1)                         as first_name,
       substr(passenger_name, strpos(passenger_name, ' ') + 1)    as last_name
from tickets
order by ticket_no
limit 10;`,
        mysql: `select ticket_no,
       substring_index(passenger_name, ' ', 1)                    as first_name,
       substring(passenger_name, locate(' ', passenger_name) + 1) as last_name
from tickets
order by ticket_no
limit 10;`,
        mysqlNote: 'split_part does not exist; substring_index(text, delimiter, 1) returns the part before the first delimiter. locate is strpos.',
        explanation: 'split_part takes the first space-separated piece. For the rest, find the first space and take everything after it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: String functions', url: PG + 'functions-string.html' },
      { label: 'MySQL: String functions', url: MY + 'string-functions.html' },
    ],
  },
  {
    id: 'airlines-007',
    dataset: 'airlines',
    level: 1,
    topics: ['dates-basics', 'limit'],
    title: 'The longest routes',
    prompt: 'Show the 10 longest December routes by flight time: route_no, departure_airport, arrival_airport and duration.',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Sort by an interval',
        postgres: `select route_no, departure_airport, arrival_airport, duration
from routes
where valid_from = '2025-12-01'
order by duration desc, route_no
limit 10;`,
        mysql: `select route_no, departure_airport, arrival_airport, duration
from routes
where valid_from = '2025-12-01'
order by duration desc, route_no
limit 10;`,
        mysqlNote: 'duration is a TIME in MySQL. TIME can also hold durations longer than a day (up to 838 hours).',
        explanation: 'In PostgreSQL duration is an interval: a length of time, not a time of day. Intervals sort and compare like numbers.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Interval input', url: PG + 'datatype-datetime.html#DATATYPE-INTERVAL-INPUT' },
      { label: 'MySQL: TIME', url: MY + 'time.html' },
    ],
  },
  {
    id: 'airlines-008',
    dataset: 'airlines',
    level: 1,
    topics: ['dates-basics', 'numbers'],
    title: 'Departures more than four hours late',
    prompt:
      'Which flights took off more than 4 hours after their scheduled time? Show flight_id, route_no and the delay in whole minutes, longest delay first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Interval arithmetic',
        postgres: `select flight_id, route_no,
       floor(extract(epoch from actual_departure - scheduled_departure) / 60)::int as delay_minutes
from flights
where actual_departure > scheduled_departure + interval '4 hours'
order by delay_minutes desc, flight_id;`,
        mysql: `select flight_id, route_no,
       timestampdiff(minute, scheduled_departure, actual_departure) as delay_minutes
from flights
where actual_departure > scheduled_departure + interval 4 hour
order by delay_minutes desc, flight_id;`,
        mysqlNote: 'TIMESTAMPDIFF(MINUTE, a, b) counts whole minutes from a to b. The interval is written without quotes: interval 4 hour.',
        explanation:
          'Subtracting two timestamps gives an interval. extract(epoch from …) turns it into seconds; divide by 60 and round down for whole minutes. Flights that have not departed have a NULL actual_departure, and the comparison drops them. Delays in this data are either under an hour or roughly 2 to 4 hours, nothing in between.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Date/time functions', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY + 'date-and-time-functions.html#function_timestampdiff' },
    ],
  },

  // ---------- Level 2 ----------
  {
    id: 'airlines-009',
    dataset: 'airlines',
    level: 2,
    topics: ['group-by', 'text-aggregation'],
    title: 'Cabin layout in one line',
    prompt:
      'For each airplane with seats, show airplane_code and its cabins as one text like "Business(28), Economy(138)": classes in alphabetical order, seat count in brackets.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Count, then aggregate the text',
        postgres: `select airplane_code,
       string_agg(fare_conditions || '(' || seats || ')', ', ' order by fare_conditions) as cabins
from (
  select airplane_code, fare_conditions, count(*) as seats
  from seats
  group by airplane_code, fare_conditions
) per_class
group by airplane_code
order by airplane_code;`,
        mysql: `select airplane_code,
       group_concat(concat(fare_conditions, '(', seats, ')') order by fare_conditions separator ', ') as cabins
from (
  select airplane_code, fare_conditions, count(*) as seats
  from seats
  group by airplane_code, fare_conditions
) per_class
group by airplane_code
order by airplane_code;`,
        mysqlNote: 'GROUP_CONCAT instead of string_agg, with ORDER BY and SEPARATOR inside the call. || means OR in MySQL, so concat() builds the text.',
        explanation:
          'Two levels of grouping: first count the seats per class, then glue the per-class lines of each airplane together. The cargo models have no seats and do not appear.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'airlines-010',
    dataset: 'airlines',
    level: 2,
    topics: ['aggregates', 'group-by'],
    title: 'Revenue by travel class',
    prompt:
      'For each travel class, show the number of flight segments sold, total revenue and the average price rounded to 2 decimals, highest revenue first.',
    hint: SAMPLE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUP BY',
        postgres: `select fare_conditions,
       count(*)              as segments,
       sum(price)            as revenue,
       round(avg(price), 2)  as avg_price
from segments
group by fare_conditions
order by revenue desc;`,
        mysql: `select fare_conditions,
       count(*)              as segments,
       sum(price)            as revenue,
       round(avg(price), 2)  as avg_price
from segments
group by fare_conditions
order by revenue desc;`,
        explanation:
          'Each segment is one passenger on one flight, with its own price. Economy brings the most money because of volume, although Business costs about twice as much per seat.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'airlines-011',
    dataset: 'airlines',
    level: 2,
    topics: ['joins', 'group-by'],
    title: 'The biggest hubs',
    prompt:
      'Which 10 airports have the most December routes departing from them? Show the airport code, city and number of routes; ties by airport code.',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Join, then group',
        postgres: `select r.departure_airport, a.city, count(*) as routes
from routes r
join airports a on a.airport_code = r.departure_airport
where r.valid_from = '2025-12-01'
group by r.departure_airport, a.city
order by routes desc, r.departure_airport
limit 10;`,
        mysql: `select r.departure_airport, a.city, count(*) as routes
from routes r
join airports a on a.airport_code = r.departure_airport
where r.valid_from = '2025-12-01'
group by r.departure_airport, a.city
order by routes desc, r.departure_airport
limit 10;`,
        explanation: 'Join to get the city name, filter to one month of the schedule, then count per airport.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'airlines-012',
    dataset: 'airlines',
    level: 2,
    topics: ['conditional-aggregates', 'pivot'],
    title: 'Flights by month and outcome',
    prompt:
      'For each month of scheduled departure (as YYYY-MM), show the number of flights, how many have arrived and how many were cancelled.',
    hint: UTC_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select to_char(scheduled_departure, 'YYYY-MM')                 as month,
       count(*)                                                as flights,
       count(*) filter (where status = 'Arrived')              as arrived,
       count(*) filter (where status = 'Cancelled')            as cancelled
from flights
group by month
order by month;`,
        mysql: null,
        mysqlNote: 'MySQL has no FILTER clause; see solution B.',
        explanation: 'FILTER restricts which rows one aggregate sees, while count(*) without it still counts every flight of the month.',
      },
      {
        approach: 'SUM over a condition',
        postgres: `select to_char(scheduled_departure, 'YYYY-MM')                 as month,
       count(*)                                                as flights,
       sum(case when status = 'Arrived' then 1 else 0 end)     as arrived,
       sum(case when status = 'Cancelled' then 1 else 0 end)   as cancelled
from flights
group by month
order by month;`,
        mysql: `select date_format(scheduled_departure, '%Y-%m')             as month,
       count(*)                                                as flights,
       sum(status = 'Arrived')                                 as arrived,
       sum(status = 'Cancelled')                               as cancelled
from flights
group by month
order by month;`,
        mysqlNote: 'In MySQL a comparison is the number 1 or 0, so sum(status = \'Arrived\') counts the matches. date_format replaces to_char.',
        explanation: 'The portable form: a CASE turns each row into 1 or 0, and SUM adds them up.',
      },
    ],
    comparison:
      'Same result. FILTER is shorter and reads like the question; SUM(CASE …) works everywhere. December and January have no arrivals at all: the snapshot was taken at the very start of December.',
    docs: [
      { label: 'PostgreSQL: Aggregate expressions (FILTER)', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
      { label: 'MySQL: DATE_FORMAT', url: MY + 'date-and-time-functions.html#function_date-format' },
    ],
  },
  {
    id: 'airlines-013',
    dataset: 'airlines',
    level: 2,
    topics: ['subqueries', 'set-operations'],
    title: 'Moscow airports the airline skips',
    prompt: 'Which Moscow (Russia) airports have no routes at all, in either direction? Show airport_code and airport_name.',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select a.airport_code, a.airport_name
from airports a
where a.city = 'Moscow' and a.country = 'Russia'
  and not exists (
    select 1 from routes r
    where r.departure_airport = a.airport_code
       or r.arrival_airport = a.airport_code
  );`,
        mysql: `select a.airport_code, a.airport_name
from airports a
where a.city = 'Moscow' and a.country = 'Russia'
  and not exists (
    select 1 from routes r
    where r.departure_airport = a.airport_code
       or r.arrival_airport = a.airport_code
  );`,
        explanation: 'For each airport, look for any route that touches it. NOT EXISTS keeps the airports where that search finds nothing.',
      },
      {
        approach: 'EXCEPT',
        postgres: `select airport_code, airport_name
from airports
where city = 'Moscow' and country = 'Russia'
except
select a.airport_code, a.airport_name
from airports a
join routes r on a.airport_code in (r.departure_airport, r.arrival_airport);`,
        mysql: `select airport_code, airport_name
from airports
where city = 'Moscow' and country = 'Russia'
except
select a.airport_code, a.airport_name
from airports a
join routes r on a.airport_code in (r.departure_airport, r.arrival_airport);`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation: 'All Moscow airports, minus every airport that appears on some route. EXCEPT also removes duplicates.',
      },
    ],
    comparison: 'NOT EXISTS stops at the first matching route per airport. EXCEPT reads like set arithmetic but builds the full list of served airports first.',
    docs: [
      { label: 'PostgreSQL: EXISTS', url: PG + 'functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS' },
      { label: 'MySQL: EXCEPT', url: MY + 'except.html' },
    ],
  },
  {
    id: 'airlines-014',
    dataset: 'airlines',
    level: 2,
    topics: ['joins', 'aggregates'],
    title: 'The largest bookings',
    prompt:
      'Show the 10 bookings with the most passengers: book_ref, number of passengers and total_amount. Ties: higher amount first, then book_ref.',
    hint: 'A round trip gives each passenger two tickets (outbound and return), so count passengers, not tickets.',
    orderMatters: true,
    solutions: [
      {
        approach: 'COUNT(DISTINCT …)',
        postgres: `select b.book_ref,
       count(distinct t.passenger_id) as passengers,
       b.total_amount
from bookings b
join tickets t on t.book_ref = b.book_ref
group by b.book_ref, b.total_amount
order by passengers desc, b.total_amount desc, b.book_ref
limit 10;`,
        mysql: `select b.book_ref,
       count(distinct t.passenger_id) as passengers,
       b.total_amount
from bookings b
join tickets t on t.book_ref = b.book_ref
group by b.book_ref, b.total_amount
order by passengers desc, b.total_amount desc, b.book_ref
limit 10;`,
        explanation: 'passenger_id identifies a person. count(distinct …) counts each of them once, however many tickets they hold in the booking.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'airlines-015',
    dataset: 'airlines',
    level: 2,
    topics: ['joins', 'null'],
    title: 'Boarding passes not yet used',
    prompt:
      'Some boarding passes have no boarding number yet. Count them by the status of their flight, most first.',
    hint: 'Passes are issued for every flight of the ticket at the first check-in; boarding_no is filled when the passenger actually boards.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join and group',
        postgres: `select f.status, count(*) as passes
from boarding_passes bp
join flights f on f.flight_id = bp.flight_id
where bp.boarding_no is null
group by f.status
order by passes desc, f.status;`,
        mysql: `select f.status, count(*) as passes
from boarding_passes bp
join flights f on f.flight_id = bp.flight_id
where bp.boarding_no is null
group by f.status
order by passes desc, f.status;`,
        explanation:
          'Most of them belong to flights that have not boarded yet: later legs of tickets whose first flight has already checked in. The few on flights that have already arrived are passengers who checked in but never boarded.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },

  // ---------- Level 3 ----------
  {
    id: 'airlines-016',
    dataset: 'airlines',
    level: 3,
    topics: ['joins', 'dates-advanced'],
    title: 'Which airplane flew it',
    prompt:
      'Flights do not store the airplane; the route row valid at departure does. For flights scheduled in November 2025 that were not cancelled, count flights per airplane model.',
    hint: VALIDITY_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Join on a period',
        postgres: `select a.model, count(*) as flights
from flights f
${ROUTE_JOIN}
join airplanes a on a.airplane_code = r.airplane_code
where f.scheduled_departure >= '2025-11-01'
  and f.scheduled_departure <  '2025-12-01'
  and f.status <> 'Cancelled'
group by a.model
order by flights desc, a.model;`,
        mysql: `select a.model, count(*) as flights
from flights f
${ROUTE_JOIN}
join airplanes a on a.airplane_code = r.airplane_code
where f.scheduled_departure >= '2025-11-01'
  and f.scheduled_departure <  '2025-12-01'
  and f.status <> 'Cancelled'
group by a.model
order by flights desc, a.model;`,
        explanation:
          'Matching on route_no alone would pair each flight with all four monthly rows of its route. The extra conditions pick the one row whose period contains the departure.',
      },
      {
        approach: 'Range containment',
        postgres: `select a.model, count(*) as flights
from flights f
join routes r on r.route_no = f.route_no
             and tstzrange(r.valid_from, r.valid_to) @> f.scheduled_departure
join airplanes a on a.airplane_code = r.airplane_code
where f.scheduled_departure >= '2025-11-01'
  and f.scheduled_departure <  '2025-12-01'
  and f.status <> 'Cancelled'
group by a.model
order by flights desc, a.model;`,
        mysql: null,
        mysqlNote: 'MySQL has no range types.',
        explanation:
          'tstzrange(a, b) is the period from a included to b excluded, and @> asks "contains". The original Postgres Pro database stores the validity as one tstzrange column.',
      },
    ],
    comparison: 'Same rows. The range form says what is meant in one condition, and a GiST index can serve it; the two comparisons work in any database.',
    docs: [
      { label: 'PostgreSQL: Range types', url: PG + 'rangetypes.html' },
      { label: 'PostgreSQL: Range operators', url: PG + 'functions-range.html' },
    ],
  },
  {
    id: 'airlines-017',
    dataset: 'airlines',
    level: 3,
    topics: ['dates-advanced', 'joins'],
    title: 'An itinerary in local time',
    prompt:
      'Ticket 0005432006945 has four flights. List them in order: route_no, departure airport, departure time in that airport\'s local time, arrival airport and arrival time in local time there.',
    hint: `${VALIDITY_NOTE} Each airport has its time zone in airports.timezone.`,
    orderMatters: true,
    solutions: [
      {
        approach: 'AT TIME ZONE',
        postgres: `select f.route_no,
       r.departure_airport,
       f.scheduled_departure at time zone dep.timezone as departs_local,
       r.arrival_airport,
       f.scheduled_arrival at time zone arr.timezone   as arrives_local
from segments s
join flights f on f.flight_id = s.flight_id
${ROUTE_JOIN}
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport
where s.ticket_no = '0005432006945'
order by f.scheduled_departure;`,
        mysql: `select f.route_no,
       r.departure_airport,
       convert_tz(f.scheduled_departure, 'UTC', dep.timezone) as departs_local,
       r.arrival_airport,
       convert_tz(f.scheduled_arrival, 'UTC', arr.timezone)   as arrives_local
from segments s
join flights f on f.flight_id = s.flight_id
${ROUTE_JOIN}
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport
where s.ticket_no = '0005432006945'
order by f.scheduled_departure;`,
        mysqlNote: `CONVERT_TZ(value, from_zone, to_zone) moves a DATETIME between zones. ${TZ_NOTE}`,
        explanation:
          'timestamptz AT TIME ZONE \'Europe/Rome\' answers "what did the clocks in Rome show at that moment" and returns a timestamp without a zone. Departure and arrival use different zones, so the local flight time can look shorter or longer than the real one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: AT TIME ZONE', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT' },
      { label: 'MySQL: CONVERT_TZ', url: MY + 'date-and-time-functions.html#function_convert-tz' },
    ],
  },
  {
    id: 'airlines-018',
    dataset: 'airlines',
    level: 3,
    topics: ['lag-lead', 'cte'],
    title: 'The longest layovers',
    prompt:
      'Within a ticket, a layover is the time between one flight\'s scheduled arrival and the next flight\'s scheduled departure. Show the 10 longest: ticket_no, the flight_id before the layover and its length in minutes.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over each ticket',
        postgres: `with legs as (
  select s.ticket_no, f.flight_id, f.scheduled_arrival,
         lead(f.scheduled_departure) over (partition by s.ticket_no order by f.scheduled_departure) as next_departure
  from segments s
  join flights f on f.flight_id = s.flight_id
)
select ticket_no, flight_id,
       (extract(epoch from next_departure - scheduled_arrival) / 60)::int as layover_minutes
from legs
where next_departure is not null
order by layover_minutes desc, ticket_no, flight_id
limit 10;`,
        mysql: `with legs as (
  select s.ticket_no, f.flight_id, f.scheduled_arrival,
         lead(f.scheduled_departure) over (partition by s.ticket_no order by f.scheduled_departure) as next_departure
  from segments s
  join flights f on f.flight_id = s.flight_id
)
select ticket_no, flight_id,
       timestampdiff(minute, scheduled_arrival, next_departure) as layover_minutes
from legs
where next_departure is not null
order by layover_minutes desc, ticket_no, flight_id
limit 10;`,
        explanation:
          'LEAD looks at the next row of the same ticket. The last flight of a ticket has no next one, so its next_departure is NULL and it is filtered out. Minutes are an integer in both databases; a raw interval would print as "1 day 02:00:00" in PostgreSQL but "26:00:00" in MySQL.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' },
      { label: 'MySQL: LEAD', url: MY + 'window-function-descriptions.html#function_lead' },
    ],
  },
  {
    id: 'airlines-019',
    dataset: 'airlines',
    level: 3,
    topics: ['ranking'],
    title: 'The longest route from each Russian airport',
    prompt:
      'For each Russian airport with December departures, show its longest December route: departure_airport, route_no, arrival_airport and duration. If two routes tie, show both.',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'RANK',
        postgres: `select departure_airport, route_no, arrival_airport, duration
from (
  select r.departure_airport, r.route_no, r.arrival_airport, r.duration,
         rank() over (partition by r.departure_airport order by r.duration desc) as place
  from routes r
  join airports a on a.airport_code = r.departure_airport
  where a.country = 'Russia' and r.valid_from = '2025-12-01'
) ranked
where place = 1
order by departure_airport, route_no;`,
        mysql: `select departure_airport, route_no, arrival_airport, duration
from (
  select r.departure_airport, r.route_no, r.arrival_airport, r.duration,
         rank() over (partition by r.departure_airport order by r.duration desc) as place
  from routes r
  join airports a on a.airport_code = r.departure_airport
  where a.country = 'Russia' and r.valid_from = '2025-12-01'
) ranked
where place = 1
order by departure_airport, route_no;`,
        explanation: 'RANK gives equal durations the same place, so every route tied for first is kept. ROW_NUMBER would silently pick one of them.',
      },
      {
        approach: 'Compare with the maximum',
        postgres: `select r.departure_airport, r.route_no, r.arrival_airport, r.duration
from routes r
join airports a on a.airport_code = r.departure_airport
where a.country = 'Russia' and r.valid_from = '2025-12-01'
  and r.duration = (
    select max(r2.duration) from routes r2
    where r2.departure_airport = r.departure_airport and r2.valid_from = '2025-12-01'
  )
order by r.departure_airport, r.route_no;`,
        mysql: `select r.departure_airport, r.route_no, r.arrival_airport, r.duration
from routes r
join airports a on a.airport_code = r.departure_airport
where a.country = 'Russia' and r.valid_from = '2025-12-01'
  and r.duration = (
    select max(r2.duration) from routes r2
    where r2.departure_airport = r.departure_airport and r2.valid_from = '2025-12-01'
  )
order by r.departure_airport, r.route_no;`,
        explanation: 'A correlated subquery finds the longest duration from the same airport; rows equal to it are the winners, ties included.',
      },
    ],
    comparison: 'Same rows. The window version extends naturally to "top 3"; the subquery version is easy to read for "the best one".',
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'airlines-020',
    dataset: 'airlines',
    level: 3,
    topics: ['window-frames', 'dates-basics'],
    title: 'Bookings day by day',
    prompt:
      'For every day of November 2025 (UTC), show the date, the number of bookings, their total amount and the running total of that amount since 1 November.',
    hint: SAMPLE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Window over grouped rows',
        postgres: `select book_date::date                                   as day,
       count(*)                                           as bookings,
       sum(total_amount)                                  as amount,
       sum(sum(total_amount)) over (order by book_date::date) as running_amount
from bookings
where book_date >= '2025-11-01' and book_date < '2025-12-01'
group by book_date::date
order by day;`,
        mysql: `select date(book_date)                                   as day,
       count(*)                                           as bookings,
       sum(total_amount)                                  as amount,
       sum(sum(total_amount)) over (order by date(book_date)) as running_amount
from bookings
where book_date >= '2025-11-01' and book_date < '2025-12-01'
group by date(book_date)
order by day;`,
        mysqlNote: 'date(…) instead of ::date.',
        explanation:
          'GROUP BY makes one row per day; the window function then runs over those rows. sum(sum(…)) reads as "running sum of the daily sums". Casting a timestamptz to date uses the session time zone, UTC here.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window function calls', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'airlines-021',
    dataset: 'airlines',
    level: 3,
    topics: ['date-series'],
    title: 'Cancellations every day in October',
    prompt:
      'Show every day of October 2025 with the number of flights cancelled that day (by scheduled departure, UTC), including days with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series',
        postgres: `select d::date as day, count(f.flight_id) as cancelled
from generate_series(date '2025-10-01', date '2025-10-31', interval '1 day') as d
left join flights f
       on f.status = 'Cancelled'
      and f.scheduled_departure::date = d::date
group by d
order by d;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation:
          'generate_series produces one row per day, so days without cancellations still exist. LEFT JOIN keeps them, and count(f.flight_id) counts 0 for them because it skips NULLs.',
      },
      {
        approach: 'Recursive CTE',
        postgres: `with recursive days as (
  select date '2025-10-01' as day
  union all
  select (day + 1)::date from days where day < date '2025-10-31'
)
select d.day, count(f.flight_id) as cancelled
from days d
left join flights f
       on f.status = 'Cancelled'
      and f.scheduled_departure::date = d.day
group by d.day
order by d.day;`,
        mysql: `with recursive days as (
  select date('2025-10-01') as day
  union all
  select day + interval 1 day from days where day < '2025-10-31'
)
select d.day, count(f.flight_id) as cancelled
from days d
left join flights f
       on f.status = 'Cancelled'
      and date(f.scheduled_departure) = d.day
group by d.day
order by d.day;`,
        explanation: 'Builds the same calendar one day at a time: start on 1 October and add a day until the 31st.',
      },
    ],
    comparison: 'generate_series is shorter and fast; the recursive CTE is the way in databases without it, such as MySQL.',
    docs: [
      { label: 'PostgreSQL: Set returning functions', url: PG + 'functions-srf.html' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'airlines-022',
    dataset: 'airlines',
    level: 3,
    topics: ['recursive'],
    title: 'How far from Rome',
    prompt:
      'Using the December routes, how many airports can be reached from Rome Fiumicino (FCO) with 1, 2 and 3 flights at most? Count each airport once, at its smallest number of flights, and leave FCO itself out.',
    hint: `${DECEMBER_NOTE} Ignore dates and connection times: only which routes exist.`,
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE with a depth limit',
        postgres: `with recursive reach (airport, legs) as (
  select arrival_airport, 1
  from routes
  where departure_airport = 'FCO' and valid_from = '2025-12-01'
  union
  select r.arrival_airport, reach.legs + 1
  from reach
  join routes r on r.departure_airport = reach.airport and r.valid_from = '2025-12-01'
  where reach.legs < 3
)
select legs, count(*) as airports
from (
  select airport, min(legs) as legs
  from reach
  where airport <> 'FCO'
  group by airport
) best
group by legs
order by legs;`,
        mysql: `with recursive reach (airport, legs) as (
  select arrival_airport, 1
  from routes
  where departure_airport = 'FCO' and valid_from = '2025-12-01'
  union
  select r.arrival_airport, reach.legs + 1
  from reach
  join routes r on r.departure_airport = reach.airport and r.valid_from = '2025-12-01'
  where reach.legs < 3
)
select legs, count(*) as airports
from (
  select airport, min(legs) as legs
  from reach
  where airport <> 'FCO'
  group by airport
) best
group by legs
order by legs;`,
        explanation:
          'Each step follows every route out of the airports found so far. The depth limit stops the walk (routes go both ways, so without it the search would circle forever). UNION drops repeated (airport, legs) pairs, and min(legs) keeps the shortest way to each airport.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: WITH RECURSIVE', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'airlines-023',
    dataset: 'airlines',
    level: 3,
    topics: ['subtotals'],
    title: 'Revenue by month and class, with totals',
    prompt:
      'Sum segment prices by month of the flight (YYYY-MM) and travel class. Add a subtotal for each month and a grand total; label them "All classes" and "All months". Months in order, each month\'s subtotal after its classes, the grand total last.',
    hint: SAMPLE_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(month, 'All months')                 as month,
       coalesce(fare_conditions, 'All classes')       as fare_conditions,
       sum(price)                                     as revenue
from (
  select to_char(f.scheduled_departure, 'YYYY-MM') as month, s.fare_conditions, s.price
  from segments s
  join flights f on f.flight_id = s.flight_id
) sold
group by rollup (month, fare_conditions)
order by grouping(month), month, grouping(fare_conditions), fare_conditions;`,
        mysql: `select coalesce(month, 'All months')                 as month,
       coalesce(fare_conditions, 'All classes')       as fare_conditions,
       sum(price)                                     as revenue
from (
  select date_format(f.scheduled_departure, '%Y-%m') as month, s.fare_conditions, s.price
  from segments s
  join flights f on f.flight_id = s.flight_id
) sold
group by month, fare_conditions with rollup
order by grouping(month), month, grouping(fare_conditions), fare_conditions;`,
        mysqlNote:
          'WITH ROLLUP goes after the GROUP BY list; GROUPING() in ORDER BY works since MySQL 8.0.12. Computing the month in a subquery first matters here: MySQL rejects coalesce(date_format(…)) over a rolled-up expression under ONLY_FULL_GROUP_BY.',
        explanation:
          'ROLLUP (a, b) groups by (a, b), then by (a) alone, then by nothing. In the extra rows the rolled-up column is NULL; GROUPING() returns 1 for them, which puts every subtotal after the detail rows it sums. The inner query names the month once, so the outer query can group by it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' },
      { label: 'MySQL: WITH ROLLUP', url: MY + 'group-by-modifiers.html' },
    ],
  },
  {
    id: 'airlines-024',
    dataset: 'airlines',
    level: 3,
    topics: ['lateral', 'limit'],
    title: 'Two longest routes per airplane',
    prompt:
      'For each airplane that flies December routes, show its two longest routes by duration: airplane_code, model, route_no and duration.',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL with LIMIT',
        postgres: `select a.airplane_code, a.model, top.route_no, top.duration
from airplanes a
cross join lateral (
  select r.route_no, r.duration
  from routes r
  where r.airplane_code = a.airplane_code and r.valid_from = '2025-12-01'
  order by r.duration desc, r.route_no
  limit 2
) as top
order by a.airplane_code, top.duration desc, top.route_no;`,
        mysql: `select a.airplane_code, a.model, top.route_no, top.duration
from airplanes a
cross join lateral (
  select r.route_no, r.duration
  from routes r
  where r.airplane_code = a.airplane_code and r.valid_from = '2025-12-01'
  order by r.duration desc, r.route_no
  limit 2
) as top
order by a.airplane_code, top.duration desc, top.route_no;`,
        mysqlNote: 'LATERAL exists since MySQL 8.0.14.',
        explanation:
          'A LATERAL subquery runs once per airplane and may use its columns, so "ORDER BY … LIMIT 2" picks the top two for each airplane. Cargo airplanes have no routes; CROSS JOIN drops them because their subquery returns nothing.',
      },
      {
        approach: 'ROW_NUMBER',
        postgres: `select airplane_code, model, route_no, duration
from (
  select a.airplane_code, a.model, r.route_no, r.duration,
         row_number() over (partition by a.airplane_code order by r.duration desc, r.route_no) as n
  from airplanes a
  join routes r on r.airplane_code = a.airplane_code and r.valid_from = '2025-12-01'
) ranked
where n <= 2
order by airplane_code, duration desc, route_no;`,
        mysql: `select airplane_code, model, route_no, duration
from (
  select a.airplane_code, a.model, r.route_no, r.duration,
         row_number() over (partition by a.airplane_code order by r.duration desc, r.route_no) as n
  from airplanes a
  join routes r on r.airplane_code = a.airplane_code and r.valid_from = '2025-12-01'
) ranked
where n <= 2
order by airplane_code, duration desc, route_no;`,
        explanation: 'Number the routes of each airplane from longest to shortest and keep numbers 1 and 2.',
      },
    ],
    comparison:
      'Same rows. LATERAL can stop after two rows per airplane when an index on (airplane_code, valid_from, duration) exists; ROW_NUMBER numbers every route first.',
    docs: [
      { label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' },
      { label: 'MySQL: Lateral derived tables', url: MY + 'lateral-derived-tables.html' },
    ],
  },
  {
    id: 'airlines-025',
    dataset: 'airlines',
    level: 3,
    topics: ['numbers', 'joins'],
    title: 'Great-circle distances',
    prompt:
      'Compute the distance of each December route from the airport coordinates (great-circle, Earth radius 6371 km), rounded to whole km. Show the 10 longest: route_no, departure_airport, arrival_airport, distance_km and the airplane\'s range_km.',
    hint: `${DECEMBER_NOTE} Haversine: d = 2R · asin(√(sin²(Δlat/2) + cos lat1 · cos lat2 · sin²(Δlon/2))), angles in radians.`,
    orderMatters: true,
    solutions: [
      {
        approach: 'Haversine formula',
        postgres: `select r.route_no, r.departure_airport, r.arrival_airport,
       round(2 * 6371 * asin(sqrt(
         power(sin(radians(arr.latitude - dep.latitude) / 2), 2)
         + cos(radians(dep.latitude)) * cos(radians(arr.latitude))
           * power(sin(radians(arr.longitude - dep.longitude) / 2), 2)
       ))) as distance_km,
       a.range_km
from routes r
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport
join airplanes a  on a.airplane_code = r.airplane_code
where r.valid_from = '2025-12-01'
order by distance_km desc, r.route_no
limit 10;`,
        mysql: `select r.route_no, r.departure_airport, r.arrival_airport,
       round(2 * 6371 * asin(sqrt(
         power(sin(radians(arr.latitude - dep.latitude) / 2), 2)
         + cos(radians(dep.latitude)) * cos(radians(arr.latitude))
           * power(sin(radians(arr.longitude - dep.longitude) / 2), 2)
       ))) as distance_km,
       a.range_km
from routes r
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport
join airplanes a  on a.airplane_code = r.airplane_code
where r.valid_from = '2025-12-01'
order by distance_km desc, r.route_no
limit 10;`,
        explanation:
          'The same math functions exist in both databases. No December route is longer than its airplane\'s range, though the longest come close to it. The original database uses the earthdistance extension for this; here the formula is written out.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Mathematical functions', url: PG + 'functions-math.html' },
      { label: 'MySQL: Mathematical functions', url: MY + 'mathematical-functions.html' },
    ],
  },

  // ---------- Level 4 ----------
  {
    id: 'airlines-026',
    dataset: 'airlines',
    level: 4,
    topics: ['arrays', 'json'],
    title: 'Sunday departures from Frankfurt',
    prompt:
      'days_of_week lists the weekdays a route flies (1 = Monday … 7 = Sunday). Which December routes from Frankfurt (FRA) fly on Sundays? Show route_no, arrival_airport and scheduled_time, by departure time.',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: '= ANY / MEMBER OF',
        postgres: `select route_no, arrival_airport, scheduled_time
from routes
where departure_airport = 'FRA'
  and valid_from = '2025-12-01'
  and 7 = any (days_of_week)
order by scheduled_time, route_no;`,
        mysql: `select route_no, arrival_airport, scheduled_time
from routes
where departure_airport = 'FRA'
  and valid_from = '2025-12-01'
  and 7 member of (days_of_week)
order by scheduled_time, route_no;`,
        mysqlNote: 'MySQL has no arrays; days_of_week is a JSON array there. value MEMBER OF (json_array) is the MySQL way to ask "is it in the list".',
        explanation: 'In PostgreSQL days_of_week is an integer[]. "7 = any (array)" is true when some element equals 7.',
      },
      {
        approach: 'Containment',
        postgres: `select route_no, arrival_airport, scheduled_time
from routes
where departure_airport = 'FRA'
  and valid_from = '2025-12-01'
  and days_of_week @> array[7]
order by scheduled_time, route_no;`,
        mysql: `select route_no, arrival_airport, scheduled_time
from routes
where departure_airport = 'FRA'
  and valid_from = '2025-12-01'
  and json_contains(days_of_week, '7')
order by scheduled_time, route_no;`,
        explanation: '@> asks "does the left array contain all of the right one", so it also answers "flies on both Saturday and Sunday" with array[6, 7]. A GIN index can serve it.',
      },
    ],
    comparison: 'For one value both read well. Containment scales to several values at once and is the form a GIN index speeds up.',
    docs: [
      { label: 'PostgreSQL: Array functions and operators', url: PG + 'functions-array.html' },
      { label: 'MySQL: MEMBER OF', url: MY + 'json-search-functions.html#operator_member-of' },
    ],
  },
  {
    id: 'airlines-027',
    dataset: 'airlines',
    level: 4,
    topics: ['arrays', 'json', 'group-by'],
    title: 'Routes per weekday',
    prompt: 'For each weekday number (1–7), how many December routes fly on that day?',
    hint: DECEMBER_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'unnest / JSON_TABLE',
        postgres: `select d.day, count(*) as routes
from routes r
cross join unnest(r.days_of_week) as d(day)
where r.valid_from = '2025-12-01'
group by d.day
order by d.day;`,
        mysql: `select d.day, count(*) as routes
from routes r
cross join json_table(r.days_of_week, '$[*]' columns (day int path '$')) as d
where r.valid_from = '2025-12-01'
group by d.day
order by d.day;`,
        mysqlNote: 'JSON_TABLE turns a JSON array into rows; \'$[*]\' means "every element" and path \'$\' takes the element itself.',
        explanation:
          'unnest turns each array into one row per element, so a route flying 4 days a week becomes 4 rows. Then it is ordinary grouping.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: unnest', url: PG + 'functions-array.html#ARRAY-FUNCTIONS-TABLE' },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'airlines-028',
    dataset: 'airlines',
    level: 4,
    topics: ['views', 'dates-advanced'],
    title: 'A timetable view',
    prompt:
      'Create a view timetable with flight_id, route_no, departure_airport, arrival_airport, status, airplane_code, scheduled_departure, scheduled_departure_local, scheduled_arrival and scheduled_arrival_local (local times at each airport).',
    hint: `${VALIDITY_NOTE} The original database has this view too.`,
    orderMatters: true,
    checkSql: `select flight_id, route_no, airplane_code, scheduled_departure_local, scheduled_arrival_local
from timetable
where departure_airport = 'SVX' and arrival_airport = 'WUH' and scheduled_departure > '2025-12-01'
order by scheduled_departure
limit 3`,
    solutions: [
      {
        approach: 'View over the period join',
        postgres: `create view timetable as
select f.flight_id, f.route_no, r.departure_airport, r.arrival_airport, f.status, r.airplane_code,
       f.scheduled_departure,
       f.scheduled_departure at time zone dep.timezone as scheduled_departure_local,
       f.scheduled_arrival,
       f.scheduled_arrival at time zone arr.timezone   as scheduled_arrival_local
from flights f
${ROUTE_JOIN}
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport;`,
        mysql: `create view timetable as
select f.flight_id, f.route_no, r.departure_airport, r.arrival_airport, f.status, r.airplane_code,
       f.scheduled_departure,
       convert_tz(f.scheduled_departure, 'UTC', dep.timezone) as scheduled_departure_local,
       f.scheduled_arrival,
       convert_tz(f.scheduled_arrival, 'UTC', arr.timezone)   as scheduled_arrival_local
from flights f
${ROUTE_JOIN}
join airports dep on dep.airport_code = r.departure_airport
join airports arr on arr.airport_code = r.arrival_airport;`,
        mysqlNote: TZ_NOTE,
        explanation:
          'The view hides the period join and the time zone conversion. Queries like "next flight from Yekaterinburg to Wuhan" become one simple WHERE on the view.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: CREATE VIEW', url: MY + 'create-view.html' },
    ],
  },
  {
    id: 'airlines-029',
    dataset: 'airlines',
    level: 4,
    topics: ['dml', 'dates-basics'],
    title: 'Delay a flight',
    prompt:
      'Flight 11052 is delayed by 90 minutes. Set its status to \'Delayed\' and move both its scheduled departure and scheduled arrival 90 minutes later.',
    orderMatters: false,
    checkSql: `select flight_id, status, scheduled_departure, scheduled_arrival from flights where flight_id = 11052`,
    solutions: [
      {
        approach: 'UPDATE with interval arithmetic',
        postgres: `update flights
set status = 'Delayed',
    scheduled_departure = scheduled_departure + interval '90 minutes',
    scheduled_arrival   = scheduled_arrival   + interval '90 minutes'
where flight_id = 11052;`,
        mysql: `update flights
set status = 'Delayed',
    scheduled_departure = scheduled_departure + interval 90 minute,
    scheduled_arrival   = scheduled_arrival   + interval 90 minute
where flight_id = 11052;`,
        mysqlNote: 'MySQL writes the interval as a number and a unit without quotes. It also applies the assignments left to right, so a SET that used one updated column in another would see the new value; here they are independent.',
        explanation: 'Adding an interval to a timestamptz moves the moment itself, whatever the time zone.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' },
      { label: 'MySQL: Temporal intervals', url: MY + 'expressions.html#temporal-intervals' },
    ],
  },
  {
    id: 'airlines-030',
    dataset: 'airlines',
    level: 4,
    topics: ['generated-columns', 'ddl'],
    title: 'Scheduled minutes as a column',
    prompt:
      'Add a column scheduled_minutes to flights that always equals the scheduled flight time in minutes, computed by the database from the two scheduled times.',
    orderMatters: false,
    checkSql: `select flight_id, scheduled_minutes from flights where flight_id in (1, 2, 3)`,
    solutions: [
      {
        approach: 'Stored generated column',
        postgres: `alter table flights
add column scheduled_minutes integer
generated always as ((extract(epoch from scheduled_arrival - scheduled_departure) / 60)::integer) stored;`,
        mysql: `alter table flights
add column scheduled_minutes int
generated always as (timestampdiff(minute, scheduled_departure, scheduled_arrival)) stored;`,
        explanation:
          'A generated column is recalculated whenever the row changes and cannot be written directly, so it can never drift from the times it is based on. Its expression may only use deterministic functions, which these are.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'airlines-031',
    dataset: 'airlines',
    level: 4,
    topics: ['constraints'],
    title: 'Bring back the rules',
    prompt:
      'The original database checks two rules on flights that this copy lost: status must be one of Scheduled, On Time, Delayed, Boarding, Departed, Arrived, Cancelled; and the scheduled arrival must be after the scheduled departure. Add both as CHECK constraints.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'flights'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'flights' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD CONSTRAINT',
        postgres: `alter table flights
  add constraint flights_status_check
    check (status in ('Scheduled', 'On Time', 'Delayed', 'Boarding', 'Departed', 'Arrived', 'Cancelled')),
  add constraint flights_scheduled_check
    check (scheduled_arrival > scheduled_departure);`,
        mysql: `alter table flights
  add constraint flights_status_check
    check (status in ('Scheduled', 'On Time', 'Delayed', 'Boarding', 'Departed', 'Arrived', 'Cancelled')),
  add constraint flights_scheduled_check
    check (scheduled_arrival > scheduled_departure);`,
        mysqlNote: 'MySQL enforces CHECK constraints since 8.0.16; older versions parsed and ignored them.',
        explanation:
          'Adding a CHECK first verifies every existing row, so the statement succeeding proves the data already follows the rules. From then on, any insert or update that breaks them is rejected.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' },
      { label: 'MySQL: CHECK constraints', url: MY + 'create-table-check-constraints.html' },
    ],
  },

  // ---------- Level 5 ----------
  {
    id: 'airlines-032',
    dataset: 'airlines',
    level: 5,
    topics: ['functions'],
    title: 'Which airplane, as a function',
    prompt:
      'Write a function flight_airplane(p_flight_id) that returns the airplane_code of the route row valid at the flight\'s scheduled departure, or NULL for an unknown flight.',
    hint: VALIDITY_NOTE,
    orderMatters: false,
    checkSql: `select flight_airplane(1) as first_flight, flight_airplane(10966) as in_the_air, flight_airplane(999999) as unknown`,
    solutions: [
      {
        approach: 'SQL function',
        postgres: `create function flight_airplane(p_flight_id integer)
returns text
language sql
stable
as $$
  select r.airplane_code
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from
               and f.scheduled_departure <  r.valid_to
  where f.flight_id = p_flight_id;
$$;`,
        mysql: `create function flight_airplane(p_flight_id int)
returns char(3)
reads sql data
begin
  return (
    select r.airplane_code
    from flights f
    join routes r on r.route_no = f.route_no
                 and f.scheduled_departure >= r.valid_from
                 and f.scheduled_departure <  r.valid_to
    where f.flight_id = p_flight_id
  );
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'The period join from earlier, wrapped in a function. STABLE tells PostgreSQL the result depends only on the arguments and the table contents, so it can be optimised inside a query.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Query language (SQL) functions', url: PG + 'xfunc-sql.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'airlines-033',
    dataset: 'airlines',
    level: 5,
    topics: ['triggers', 'control-flow'],
    title: 'Landing updates the status',
    prompt:
      'Create a trigger on flights: when actual_arrival changes from NULL to a value, set status to \'Arrived\' automatically.',
    orderMatters: false,
    checkSql: `update flights set actual_arrival = scheduled_arrival where flight_id = 10966;
select flight_id, status, actual_arrival from flights where flight_id = 10966`,
    solutions: [
      {
        approach: 'BEFORE UPDATE row trigger',
        postgres: `create function mark_arrived() returns trigger
language plpgsql
as $$
begin
  if old.actual_arrival is null and new.actual_arrival is not null then
    new.status := 'Arrived';
  end if;
  return new;
end;
$$;

create trigger flights_mark_arrived
before update on flights
for each row execute function mark_arrived();`,
        mysql: `create trigger flights_mark_arrived
before update on flights
for each row
begin
  if old.actual_arrival is null and new.actual_arrival is not null then
    set new.status = 'Arrived';
  end if;
end;`,
        mysqlNote: `The trigger body is written inline, with SET instead of :=. ${DELIMITER_NOTE}`,
        explanation:
          'A BEFORE trigger sees the new row before it is written and may change it. In PostgreSQL the logic lives in a separate trigger function that returns the (modified) NEW row.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Using triggers', url: MY + 'trigger-syntax.html' },
    ],
  },
  {
    id: 'airlines-034',
    dataset: 'airlines',
    level: 5,
    topics: ['indexes'],
    title: 'Find a passenger by name, any case',
    prompt:
      'Staff search tickets by passenger name typed in any letter case. Create an index on tickets that can serve such a search.',
    orderMatters: false,
    checkSql: `select count(*) as indexes_on_name from pg_indexes where tablename = 'tickets' and indexdef like '%passenger_name%'`,
    checkSqlMysql: `select count(distinct index_name) as indexes_on_name
from information_schema.statistics
where table_schema = database() and table_name = 'tickets'
  and (column_name = 'passenger_name' or expression like '%passenger_name%')`,
    solutions: [
      {
        approach: 'Expression index',
        postgres: `create index tickets_name_lower_idx on tickets (lower(passenger_name));

-- serves: select * from tickets where lower(passenger_name) = lower('Ilaria Cazzaniga');`,
        mysql: `create index tickets_name_lower_idx on tickets ((lower(passenger_name)));`,
        mysqlNote: 'Expression indexes need the extra parentheses and exist since MySQL 8.0.13.',
        explanation:
          'PostgreSQL compares text case-sensitively, so the query has to compare lower() of both sides, and only an index on the same expression lower(passenger_name) can serve it.',
      },
      {
        approach: 'Plain index',
        postgres: `create index tickets_name_idx on tickets (passenger_name);`,
        mysql: `create index tickets_name_idx on tickets (passenger_name);

-- serves: select * from tickets where passenger_name = 'ilaria cazzaniga';`,
        explanation:
          'In MySQL the column\'s _ci collation already ignores case, so a plain index answers case-insensitive searches. In PostgreSQL this index only helps exact-case lookups.',
      },
    ],
    comparison:
      'The right choice depends on the database: in PostgreSQL the expression index (or a case-insensitive collation), in MySQL the plain index. Both count as one index on the name here.',
    docs: [
      { label: 'PostgreSQL: Indexes on expressions', url: PG + 'indexes-expressional.html' },
      { label: 'MySQL: Functional key parts', url: MY + 'create-index.html#create-index-functional-key-parts' },
    ],
  },
  {
    id: 'airlines-035',
    dataset: 'airlines',
    level: 2,
    topics: ['self-cross-join', 'joins'],
    title: 'Every class on every airplane',
    prompt:
      'Show every airplane with every travel class (Business, Comfort, Economy) and its seat count in that class, including 0 where the airplane has none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'CROSS JOIN, then LEFT JOIN',
        postgres: `select a.airplane_code, c.fare_conditions, count(s.seat_no) as seats
from airplanes a
cross join (values ('Business'), ('Comfort'), ('Economy')) as c (fare_conditions)
left join seats s on s.airplane_code = a.airplane_code and s.fare_conditions = c.fare_conditions
group by a.airplane_code, c.fare_conditions
order by a.airplane_code, c.fare_conditions;`,
        mysql: `select a.airplane_code, c.fare_conditions, count(s.seat_no) as seats
from airplanes a
cross join (select 'Business' as fare_conditions union all select 'Comfort' union all select 'Economy') as c
left join seats s on s.airplane_code = a.airplane_code and s.fare_conditions = c.fare_conditions
group by a.airplane_code, c.fare_conditions
order by a.airplane_code, c.fare_conditions;`,
        mysqlNote: 'MySQL\'s VALUES table constructor needs ROW(…) and names its columns column_0; a UNION ALL of SELECTs is simpler.',
        explanation:
          'CROSS JOIN builds every (airplane, class) combination, 10 × 3 = 30 rows. LEFT JOIN then attaches matching seats, and count(s.seat_no) is 0 where nothing matched. Grouping seats alone would never show the missing classes.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: VALUES lists', url: PG + 'queries-values.html' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },
  {
    id: 'airlines-036',
    dataset: 'airlines',
    level: 3,
    topics: ['text-aggregation', 'joins'],
    title: 'Itineraries as text',
    prompt:
      'For the 10 lowest-numbered tickets with three or more flights, show ticket_no and the route as text like "OVB → SVO → FRA → FCO" (airports in flight order).',
    hint: 'A route_no can change month to month, so join a flight to the route row whose valid_from ≤ scheduled_departure < valid_to.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg over ordered legs',
        postgres: `with legs as (
  select s.ticket_no, f.scheduled_departure, r.departure_airport, r.arrival_airport,
         row_number() over (partition by s.ticket_no order by f.scheduled_departure desc) as from_end
  from segments s
  join flights f on f.flight_id = s.flight_id
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
)
select ticket_no,
       string_agg(departure_airport, ' → ' order by scheduled_departure)
         || ' → ' || max(case when from_end = 1 then arrival_airport end) as itinerary
from legs
group by ticket_no
having count(*) >= 3
order by ticket_no
limit 10;`,
        mysql: `with legs as (
  select s.ticket_no, f.scheduled_departure, r.departure_airport, r.arrival_airport,
         row_number() over (partition by s.ticket_no order by f.scheduled_departure desc) as from_end
  from segments s
  join flights f on f.flight_id = s.flight_id
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
)
select ticket_no,
       concat(group_concat(departure_airport order by scheduled_departure separator ' → '),
              ' → ', max(case when from_end = 1 then arrival_airport end)) as itinerary
from legs
group by ticket_no
having count(*) >= 3
order by ticket_no
limit 10;`,
        explanation:
          'Each leg contributes its departure airport, in time order; the final destination is the arrival airport of the last leg (from_end = 1). Joining all departures plus the last arrival gives the whole path.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'airlines-037',
    dataset: 'airlines',
    level: 3,
    topics: ['date-series', 'dates-advanced'],
    title: 'Departures by hour of day',
    prompt:
      'For November 2025, count flights by the UTC hour of their scheduled departure, showing all 24 hours (0–23) even if an hour has none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'generate_series of numbers',
        postgres: `select h as hour, count(f.flight_id) as departures
from generate_series(0, 23) as h
left join flights f
       on extract(hour from f.scheduled_departure) = h
      and f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
group by h
order by h;`,
        mysql: null,
        mysqlNote: 'No generate_series in MySQL; see solution B.',
        explanation: 'generate_series also counts integers. The filter on November sits in the ON clause: in WHERE it would drop the empty hours again.',
      },
      {
        approach: 'Recursive CTE of hours',
        postgres: `with recursive hours (h) as (
  select 0 union all select h + 1 from hours where h < 23
)
select h as hour, count(f.flight_id) as departures
from hours
left join flights f
       on extract(hour from f.scheduled_departure) = h
      and f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
group by h
order by h;`,
        mysql: `with recursive hours (h) as (
  select 0 union all select h + 1 from hours where h < 23
)
select h as hour, count(f.flight_id) as departures
from hours
left join flights f
       on hour(f.scheduled_departure) = h
      and f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
group by h
order by h;`,
        explanation: 'The 24 hours built by recursion; HOUR() is MySQL\'s extract(hour …).',
      },
    ],
    comparison: 'Same rows. Hours are in UTC; for local airport time you would convert each departure first (AT TIME ZONE / CONVERT_TZ).',
    docs: [
      { label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' },
      { label: 'MySQL: HOUR', url: MY + 'date-and-time-functions.html#function_hour' },
    ],
  },
  {
    id: 'airlines-038',
    dataset: 'airlines',
    level: 4,
    topics: ['upsert'],
    title: 'Issue or change a boarding pass',
    prompt:
      'Passenger on ticket 0005432000395 asks for seat 40A on flight 77. Write one statement that issues the boarding pass if there is none, or changes the seat of the existing one.',
    orderMatters: false,
    checkSql: `select ticket_no, flight_id, seat_no from boarding_passes where ticket_no = '0005432000395' and flight_id = 77`,
    solutions: [
      {
        approach: 'ON CONFLICT on the primary key',
        postgres: `insert into boarding_passes (ticket_no, flight_id, seat_no)
values ('0005432000395', 77, '40A')
on conflict (ticket_no, flight_id) do update set seat_no = excluded.seat_no;`,
        mysql: `insert into boarding_passes (ticket_no, flight_id, seat_no)
values ('0005432000395', 77, '40A') as new
on duplicate key update seat_no = new.seat_no;`,
        mysqlNote:
          'ON DUPLICATE KEY reacts to a clash on any unique key. boarding_passes also has unique (flight_id, seat_no): if 40A were taken by someone else, MySQL would update that other row instead of failing. PostgreSQL\'s ON CONFLICT (ticket_no, flight_id) names the key it handles and still raises an error for the seat clash.',
        explanation: 'The pass already exists (seat 43J), so the statement turns into an update of the seat. On a ticket without a pass it would insert one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'airlines-039',
    dataset: 'airlines',
    level: 5,
    topics: ['partitioning'],
    title: 'Spread bookings evenly',
    prompt:
      'Bookings have no natural ranges to split by. Create bookings_hashed (book_ref, book_date, total_amount) hash-partitioned by book_ref into 4 partitions, and copy the bookings into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'bookings_hashed'::regclass) as partitions,
       (select count(*) from bookings_hashed) as total_rows`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'bookings_hashed') as partitions,
       (select count(*) from bookings_hashed) as total_rows`,
    solutions: [
      {
        approach: 'HASH / KEY partitioning',
        postgres: `create table bookings_hashed (
  book_ref     varchar(6)     primary key,
  book_date    timestamptz    not null,
  total_amount numeric(10, 2) not null
) partition by hash (book_ref);

create table bookings_hashed_0 partition of bookings_hashed for values with (modulus 4, remainder 0);
create table bookings_hashed_1 partition of bookings_hashed for values with (modulus 4, remainder 1);
create table bookings_hashed_2 partition of bookings_hashed for values with (modulus 4, remainder 2);
create table bookings_hashed_3 partition of bookings_hashed for values with (modulus 4, remainder 3);

insert into bookings_hashed select * from bookings;`,
        mysql: `create table bookings_hashed (
  book_ref     char(6)        primary key,
  book_date    datetime       not null,
  total_amount decimal(10, 2) not null
)
partition by key (book_ref) partitions 4;

insert into bookings_hashed select * from bookings;`,
        mysqlNote: 'PARTITION BY HASH in MySQL needs an integer expression; KEY partitioning hashes any column type with MySQL\'s own function. The partitions are created by the PARTITIONS 4 clause.',
        explanation:
          'A hash of the key decides the partition, so rows spread evenly and a lookup by book_ref touches one partition. What hashing cannot do is prune ranges: "bookings of November" still reads all four.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Partitioning methods', url: PG + 'ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE' },
      { label: 'MySQL: KEY partitioning', url: MY + 'partitioning-key.html' },
    ],
  },
  {
    id: 'airlines-040',
    dataset: 'airlines',
    level: 2,
    topics: ['casting', 'strings'],
    title: 'Seats in cabin order',
    prompt:
      'Seat numbers look like 2A or 10C. List the first 12 seats of airplane CR7 in cabin order: by row number as a number, then by letter. Show seat_no and fare_conditions.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Extract and cast the row number',
        postgres: `select seat_no, fare_conditions
from seats
where airplane_code = 'CR7'
order by substring(seat_no from '^[0-9]+')::int, right(seat_no, 1)
limit 12;`,
        mysql: `select seat_no, fare_conditions
from seats
where airplane_code = 'CR7'
order by cast(regexp_substr(seat_no, '^[0-9]+') as unsigned), right(seat_no, 1)
limit 12;`,
        mysqlNote: 'REGEXP_SUBSTR returns the matching text; CAST(… AS UNSIGNED) makes it a number.',
        explanation:
          'Sorted as text, "10A" comes before "2A" because "1" < "2": the comparison goes character by character. Cast the digits to an integer and row 2 comes before row 10.',
      },
      {
        approach: 'Length first',
        postgres: `select seat_no, fare_conditions
from seats
where airplane_code = 'CR7'
order by length(seat_no), seat_no
limit 12;`,
        mysql: `select seat_no, fare_conditions
from seats
where airplane_code = 'CR7'
order by length(seat_no), seat_no
limit 12;`,
        explanation: 'A shorter seat number has a smaller row (the letter is always one character), so sorting by length and then text gives the same order without casting.',
      },
    ],
    comparison: 'Same order here. The cast states the meaning; the length trick is shorter but silently breaks if a seat ever had a two-letter suffix.',
    docs: [
      { label: 'PostgreSQL: substring with a regular expression', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: REGEXP_SUBSTR', url: MY + 'regexp.html#function_regexp-substr' },
    ],
  },
  {
    id: 'airlines-041',
    dataset: 'airlines',
    level: 5,
    topics: ['triggers', 'control-flow'],
    title: 'Only real seats on boarding passes',
    prompt:
      'Nothing checks that a boarding pass names a seat that exists on the airplane of its flight. Create a trigger that rejects such inserts. Then issue a valid pass: ticket 0005432000395 already has one for flight 77; issue seat 40A on that ticket\'s next flight instead.',
    hint: 'The airplane of a flight is on the route row valid at the scheduled departure (valid_from ≤ departure < valid_to).',
    orderMatters: false,
    checkSql: `insert into boarding_passes (ticket_no, flight_id, seat_no)
select s.ticket_no, s.flight_id, '40A' from segments s
where s.ticket_no = '0005432000395'
  and not exists (select 1 from boarding_passes b where b.ticket_no = s.ticket_no and b.flight_id = s.flight_id)
order by s.flight_id limit 1;
select count(*) as passes from boarding_passes where ticket_no = '0005432000395'`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger that raises an error',
        postgres: `create function check_seat() returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from flights f
    join routes r on r.route_no = f.route_no
                 and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
    join seats s on s.airplane_code = r.airplane_code and s.seat_no = new.seat_no
    where f.flight_id = new.flight_id
  ) then
    raise exception 'seat % does not exist on flight %', new.seat_no, new.flight_id;
  end if;
  return new;
end;
$$;

create trigger boarding_passes_check_seat
before insert or update of seat_no on boarding_passes
for each row execute function check_seat();`,
        mysql: `create trigger boarding_passes_check_seat
before insert on boarding_passes
for each row
begin
  if not exists (
    select 1
    from flights f
    join routes r on r.route_no = f.route_no
                 and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
    join seats s on s.airplane_code = r.airplane_code and s.seat_no = new.seat_no
    where f.flight_id = new.flight_id
  ) then
    signal sqlstate '45000' set message_text = 'seat does not exist on this flight';
  end if;
end;`,
        mysqlNote: `SIGNAL raises an error (SQLSTATE 45000 is "user-defined"). A MySQL trigger handles one event, so updates need a second, BEFORE UPDATE trigger. ${DELIMITER_NOTE}`,
        explanation:
          'A CHECK constraint cannot look at other tables, so a rule that spans flights, routes and seats needs a trigger. RAISE EXCEPTION aborts the insert with a message; the valid pass in the check goes through.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Errors and messages (RAISE)', url: PG + 'plpgsql-errors-and-messages.html' },
      { label: 'MySQL: SIGNAL', url: MY + 'signal.html' },
    ],
  },
  {
    id: 'airlines-042',
    dataset: 'airlines',
    level: 4,
    topics: ['arrays', 'text-aggregation'],
    title: 'Destinations as an array',
    prompt: 'For each departure airport in Germany, list its distinct December destinations in alphabetical order, as one array.',
    hint: 'December 2025 routes are the rows with valid_from = 2025-12-01.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg(DISTINCT … ORDER BY …)',
        postgres: `select r.departure_airport,
       array_agg(distinct r.arrival_airport order by r.arrival_airport) as destinations
from routes r
join airports a on a.airport_code = r.departure_airport
where a.country = 'Germany' and r.valid_from = '2025-12-01'
group by r.departure_airport
order by r.departure_airport;`,
        mysql: `select r.departure_airport,
       cast(concat('["', group_concat(distinct r.arrival_airport order by r.arrival_airport separator '", "'), '"]') as json) as destinations
from routes r
join airports a on a.airport_code = r.departure_airport
where a.country = 'Germany' and r.valid_from = '2025-12-01'
group by r.departure_airport
order by r.departure_airport;`,
        mysqlNote: 'No arrays in MySQL: build a JSON array. JSON_ARRAYAGG cannot sort or remove duplicates, so GROUP_CONCAT(DISTINCT … ORDER BY …) builds the text and CAST makes it JSON.',
        explanation: 'array_agg accepts DISTINCT and ORDER BY inside the call, so the array is de-duplicated and sorted as it is built.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: array_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'airlines-043',
    dataset: 'airlines',
    level: 4,
    topics: ['temp-tables', 'arrays'],
    title: 'December routes, prepared once',
    prompt:
      'Put the December routes into a temporary table dec_routes (route_no, departure_airport, arrival_airport, airplane_code, weekly_flights) where weekly_flights is the number of weekdays the route flies.',
    hint: 'December 2025 routes are the rows with valid_from = 2025-12-01.',
    orderMatters: false,
    checkSql: `select count(*) as routes, sum(weekly_flights) as weekly_flights, max(weekly_flights) as busiest from dec_routes`,
    solutions: [
      {
        approach: 'Temp table with cardinality / JSON_LENGTH',
        postgres: `create temp table dec_routes as
select route_no, departure_airport, arrival_airport, airplane_code,
       cardinality(days_of_week) as weekly_flights
from routes
where valid_from = '2025-12-01';`,
        mysql: `create temporary table dec_routes as
select route_no, departure_airport, arrival_airport, airplane_code,
       json_length(days_of_week) as weekly_flights
from routes
where valid_from = '2025-12-01';`,
        mysqlNote: 'JSON_LENGTH counts the elements of a JSON array.',
        explanation: 'cardinality(array) is the number of elements. The temporary table is a small, ready-made working set for the rest of the analysis.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: cardinality', url: PG + 'functions-array.html' },
      { label: 'MySQL: JSON_LENGTH', url: MY + 'json-attribute-functions.html#function_json-length' },
    ],
  },
  {
    id: 'airlines-044',
    dataset: 'airlines',
    level: 5,
    topics: ['query-plans', 'subqueries'],
    title: 'Flights nobody in the sample booked',
    prompt: 'How many November 2025 flights have no flight segment (no passenger) in this sample?',
    hint: 'The dataset keeps every 200th booking, so many flights have no passengers here.',
    orderMatters: false,
    solutions: [
      {
        approach: 'NOT EXISTS',
        postgres: `select count(*) as empty_flights
from flights f
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and not exists (select 1 from segments s where s.flight_id = f.flight_id);`,
        mysql: `select count(*) as empty_flights
from flights f
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and not exists (select 1 from segments s where s.flight_id = f.flight_id);`,
        explanation: 'Planned as an anti-join: for each flight, one probe into segments (by its flight_id index) is enough.',
      },
      {
        approach: 'LEFT JOIN … IS NULL',
        postgres: `select count(*) as empty_flights
from flights f
left join segments s on s.flight_id = f.flight_id
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and s.flight_id is null;`,
        mysql: `select count(*) as empty_flights
from flights f
left join segments s on s.flight_id = f.flight_id
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and s.flight_id is null;`,
        explanation: 'Joins every flight to all its segments and keeps the ones with no match.',
      },
      {
        approach: 'NOT IN',
        postgres: `select count(*) as empty_flights
from flights f
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and f.flight_id not in (select flight_id from segments);`,
        mysql: `select count(*) as empty_flights
from flights f
where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
  and f.flight_id not in (select flight_id from segments);`,
        explanation:
          'Correct here because segments.flight_id is NOT NULL. If the subquery could return a NULL, "x NOT IN (…, NULL)" is never true and the count would silently drop to 0.',
      },
    ],
    comparison:
      'Same count. Compare the timings and plans: NOT EXISTS and LEFT JOIN usually become an anti-join; PostgreSQL runs NOT IN as a hashed subplan, which is fine at this size but cannot use the anti-join optimisation and carries the NULL trap. Prefer NOT EXISTS.',
    docs: [
      { label: 'PostgreSQL: Subquery expressions', url: PG + 'functions-subquery.html' },
      { label: 'MySQL: Antijoin optimization', url: MY + 'semijoins.html' },
    ],
  },
  {
    id: 'airlines-045',
    dataset: 'airlines',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for flights still to come',
    prompt:
      'The departures board only shows flights with status Scheduled, On Time or Delayed, ordered by scheduled_departure. Create an index for that, as small as your database allows.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'flights' and indexdef like '%status%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'flights' and column_name = 'status'`,
    solutions: [
      {
        approach: 'Partial index on departure time',
        postgres: `create index flights_upcoming_idx on flights (scheduled_departure)
where status in ('Scheduled', 'On Time', 'Delayed');`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation:
          'About half the flights (the past ones, mostly Arrived) never appear on the board and stay out of the index. Queries must repeat the same status condition.',
      },
      {
        approach: 'Status, then time',
        postgres: `create index flights_status_departure_idx on flights (status, scheduled_departure);`,
        mysql: `create index flights_status_departure_idx on flights (status, scheduled_departure);`,
        explanation: 'Covers all flights. "status IN (…)" becomes three ranges in the index, each sorted by time, which the database then merges.',
      },
    ],
    comparison: 'The partial index is smaller and already in board order; the composite index works in MySQL and also serves other status filters.',
    docs: [
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
      { label: 'MySQL: Multiple-column indexes', url: MY + 'multiple-column-indexes.html' },
    ],
  },
  {
    id: 'airlines-046',
    dataset: 'airlines',
    level: 1,
    topics: ['distinct', 'aggregates'],
    title: 'How many time zones',
    prompt: 'How many different time zones do the airports use in total, and how many among the airports the airline actually flies to or from?',
    orderMatters: false,
    solutions: [
      {
        approach: 'count(DISTINCT) twice',
        postgres: `select count(distinct timezone) as all_airports,
       count(distinct timezone) filter (where airport_code in (select departure_airport from routes)) as served
from airports;`,
        mysql: `select count(distinct timezone) as all_airports,
       count(distinct case when airport_code in (select departure_airport from routes) then timezone end) as served
from airports;`,
        mysqlNote: 'No FILTER: a CASE that yields NULL for other rows works too, because count(DISTINCT …) ignores NULLs.',
        explanation: 'Every route also returns, so "flies to or from" is the same set as "flies from". 311 zones in the data, 25 on the network.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate expressions', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'airlines-047',
    dataset: 'airlines',
    level: 1,
    topics: ['text-search'],
    title: 'Served airports in Asia',
    prompt: 'List the airports with December departures whose time zone is in Asia (the name starts with "Asia/"): airport_code, city and timezone, ordered by code.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIKE on a prefix',
        postgres: `select a.airport_code, a.city, a.timezone
from airports a
where a.timezone like 'Asia/%'
  and exists (select 1 from routes r where r.departure_airport = a.airport_code and r.valid_from = '2025-12-01')
order by a.airport_code;`,
        mysql: `select a.airport_code, a.city, a.timezone
from airports a
where a.timezone like 'Asia/%'
  and exists (select 1 from routes r where r.departure_airport = a.airport_code and r.valid_from = '2025-12-01')
order by a.airport_code;`,
        explanation:
          'Time zone names follow "Area/City". Yekaterinburg and Novosibirsk are in Asia/… zones even though Russia is often filed under Europe: the time zone, not the country, decides.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'airlines-048',
    dataset: 'airlines',
    level: 2,
    topics: ['strings', 'group-by'],
    title: 'Where passengers come from',
    prompt: 'passenger_id starts with a two-letter country code ("RU 2714…"). Show the 5 countries with the most different passengers.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Group by a substring',
        postgres: `select left(passenger_id, 2) as country, count(distinct passenger_id) as passengers
from tickets
group by left(passenger_id, 2)
order by passengers desc, country
limit 5;`,
        mysql: `select left(passenger_id, 2) as country, count(distinct passenger_id) as passengers
from tickets
group by left(passenger_id, 2)
order by passengers desc, country
limit 5;`,
        explanation: 'GROUP BY can use any expression, here the first two characters. count(distinct passenger_id) counts people, not tickets: a round trip is two tickets.',
      },
    ],
    docs: [{ label: 'PostgreSQL: String functions', url: PG + 'functions-string.html' }],
  },
  {
    id: 'airlines-049',
    dataset: 'airlines',
    level: 2,
    topics: ['full-join', 'conditional-aggregates'],
    title: 'Which connections changed in January',
    prompt:
      'Compare the airport pairs (departure → arrival) served in December 2025 with those in January 2026. Count the pairs served in both months, only in December and only in January.',
    hint: 'route_no values are reassigned every month, so compare airport pairs, not route numbers. Monthly route rows have valid_from = 2025-12-01 and 2026-01-01.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of the two months',
        postgres: `with dec as (select distinct departure_airport, arrival_airport from routes where valid_from = '2025-12-01'),
     jan as (select distinct departure_airport, arrival_airport from routes where valid_from = '2026-01-01')
select count(*) filter (where d.departure_airport is not null and j.departure_airport is not null) as both_months,
       count(*) filter (where j.departure_airport is null) as only_december,
       count(*) filter (where d.departure_airport is null) as only_january
from dec d
full join jan j on j.departure_airport = d.departure_airport and j.arrival_airport = d.arrival_airport;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'FULL JOIN on both airport columns lines up the pairs of the two months; a NULL side marks a pair that exists in one month only.',
      },
      {
        approach: 'Flags per pair',
        postgres: `select sum(case when in_dec = 1 and in_jan = 1 then 1 else 0 end) as both_months,
       sum(case when in_jan = 0 then 1 else 0 end) as only_december,
       sum(case when in_dec = 0 then 1 else 0 end) as only_january
from (
  select departure_airport, arrival_airport,
         max(case when valid_from = '2025-12-01' then 1 else 0 end) as in_dec,
         max(case when valid_from = '2026-01-01' then 1 else 0 end) as in_jan
  from routes
  where valid_from in ('2025-12-01', '2026-01-01')
  group by departure_airport, arrival_airport
) pairs;`,
        mysql: `select sum(in_dec = 1 and in_jan = 1) as both_months,
       sum(in_jan = 0) as only_december,
       sum(in_dec = 0) as only_january
from (
  select departure_airport, arrival_airport,
         max(valid_from = '2025-12-01') as in_dec,
         max(valid_from = '2026-01-01') as in_jan
  from routes
  where valid_from in ('2025-12-01', '2026-01-01')
  group by departure_airport, arrival_airport
) pairs;`,
        explanation: 'Group both months together, one row per airport pair, with a 0/1 flag per month.',
      },
    ],
    comparison:
      'Same counts. Comparing by route_no instead would claim that most routes changed, only because the numbers were reassigned: always compare by the thing that has meaning.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: GROUP BY', url: MY + 'group-by-functions.html' },
    ],
  },
  {
    id: 'airlines-050',
    dataset: 'airlines',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'The word, not the letters',
    prompt:
      'LIKE \'%island%\' finds 53 airport names, including names with "Islands". Make airport names searchable by whole word and find those containing exactly the word "island": airport_code and airport_name.',
    orderMatters: true,
    checkSql: `select airport_code, airport_name from airports
where to_tsvector('simple', airport_name) @@ to_tsquery('simple', 'island')
order by airport_code`,
    checkSqlMysql: `select airport_code, airport_name from airports
where match(airport_name) against ('+island' in boolean mode)
order by airport_code`,
    solutions: [
      {
        approach: 'Full-text index',
        postgres: `create index airports_name_fts on airports using gin (to_tsvector('simple', airport_name));`,
        mysql: `create fulltext index airports_name_ft on airports (airport_name);`,
        explanation:
          'A text search matches words: "island" no longer matches "Islands". With the \'english\' configuration (and in MySQL with a stemming parser) both would reduce to the same stem; \'simple\' keeps words as they are, which is what this question wants.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Text search configurations', url: PG + 'textsearch-configuration.html' },
      { label: 'MySQL: Natural language and boolean search', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'airlines-051',
    dataset: 'airlines',
    level: 4,
    topics: ['materialized-views', 'joins'],
    title: 'Passengers per route, stored',
    prompt: 'Store, for each route_no and month (valid_from), the number of flight segments sold (passengers in this sample), for a route planning report.',
    hint: 'A flight belongs to the route row whose valid_from ≤ scheduled_departure < valid_to.',
    orderMatters: true,
    checkSql: `select route_no, valid_from, passengers from route_load order by passengers desc, route_no, valid_from limit 5`,
    solutions: [
      {
        approach: 'Materialized view over the period join',
        postgres: `create materialized view route_load as
select r.route_no, r.valid_from, count(s.ticket_no) as passengers
from routes r
join flights f on f.route_no = r.route_no
              and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
left join segments s on s.flight_id = f.flight_id
group by r.route_no, r.valid_from;`,
        mysql: `create table route_load as
select r.route_no, r.valid_from, count(s.ticket_no) as passengers
from routes r
join flights f on f.route_no = r.route_no
              and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
left join segments s on s.flight_id = f.flight_id
group by r.route_no, r.valid_from;`,
        mysqlNote: 'A plain table stands in for the materialized view.',
        explanation: 'LEFT JOIN to segments keeps routes whose flights sold nothing, with count(s.ticket_no) = 0. The period join runs once at refresh, not in every report.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'airlines-052',
    dataset: 'airlines',
    level: 4,
    topics: ['merge', 'dml'],
    title: 'Apply a status feed',
    prompt:
      'An operations feed status_feed (flight_id, status) arrives: flight 11052 → Delayed, 11053 → On Time (unchanged), 999999 → Departed (unknown flight). Apply it: change only the statuses that differ, ignore unknown flights.',
    orderMatters: true,
    checkSql: `select flight_id, status from flights where flight_id in (11052, 11053, 999999) order by flight_id`,
    solutions: [
      {
        approach: 'MERGE … WHEN MATCHED AND',
        postgres: `create table status_feed (flight_id integer primary key, status text not null);
insert into status_feed values (11052, 'Delayed'), (11053, 'On Time'), (999999, 'Departed');

merge into flights f
using status_feed s on s.flight_id = f.flight_id
when matched and f.status <> s.status then
  update set status = s.status;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'Without a WHEN NOT MATCHED clause, feed rows for unknown flights are simply skipped, which is what a feed of updates should do.',
      },
      {
        approach: 'UPDATE with a join',
        postgres: `create table status_feed (flight_id integer primary key, status text not null);
insert into status_feed values (11052, 'Delayed'), (11053, 'On Time'), (999999, 'Departed');

update flights f set status = s.status
from status_feed s
where s.flight_id = f.flight_id and f.status <> s.status;`,
        mysql: `create table status_feed (flight_id int primary key, status varchar(10) not null);
insert into status_feed values (11052, 'Delayed'), (11053, 'On Time'), (999999, 'Departed');

update flights f join status_feed s on s.flight_id = f.flight_id
set f.status = s.status
where f.status <> s.status;`,
        explanation: 'For "update matching rows only", a joined UPDATE is all you need.',
      },
    ],
    comparison: 'Same result. Reach for MERGE when the same feed must also insert or delete.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: UPDATE', url: MY + 'update.html' },
    ],
  },
  {
    id: 'airlines-053',
    dataset: 'airlines',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Board passengers one at a time',
    prompt:
      'Boarding numbers on a flight must be 1, 2, 3, … without duplicates even when two gates scan at once. For ticket 0005432000395 on flight 77, lock the flight row, then set the pass\'s boarding_no to one more than the flight\'s current maximum. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select ticket_no, flight_id, boarding_no from boarding_passes where ticket_no = '0005432000395' and flight_id = 77`,
    solutions: [
      {
        approach: 'Lock the parent row, then compute',
        postgres: `select flight_id from flights where flight_id = 77 for update;

update boarding_passes
set boarding_no = (select coalesce(max(boarding_no), 0) + 1 from boarding_passes where flight_id = 77)
where ticket_no = '0005432000395' and flight_id = 77;`,
        mysql: `start transaction;

select flight_id from flights where flight_id = 77 for update;

update boarding_passes bp
join (select coalesce(max(boarding_no), 0) + 1 as next_no from boarding_passes where flight_id = 77) n
set bp.boarding_no = n.next_no
where bp.ticket_no = '0005432000395' and bp.flight_id = 77;

commit;`,
        mysqlNote: 'MySQL cannot read the table being updated in a subquery of the SET (error 1093); computing the number in a derived table that is joined works.',
        explanation:
          '"max + 1" is a race: two gates read the same max and both write it. Locking the flight row first makes every gate wait its turn for that flight, so each reads the max after the previous one committed. The unique (flight_id, boarding_no) key is the safety net if someone forgets.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Explicit locking', url: PG + 'explicit-locking.html' },
      { label: 'MySQL: Locking reads', url: MY + 'innodb-locking-reads.html' },
    ],
  },
  {
    id: 'airlines-054',
    dataset: 'airlines',
    level: 4,
    topics: ['normalization'],
    title: 'Does the id decide the name?',
    prompt:
      'tickets repeats passenger_name on every ticket of a passenger. Check whether it is consistent: count the passengers (passenger_id) that appear with more than one name.',
    orderMatters: false,
    solutions: [
      {
        approach: 'GROUP BY with HAVING',
        postgres: `select count(*) as inconsistent_passengers
from (
  select passenger_id
  from tickets
  group by passenger_id
  having count(distinct passenger_name) > 1
) x;`,
        mysql: `select count(*) as inconsistent_passengers
from (
  select passenger_id
  from tickets
  group by passenger_id
  having count(distinct passenger_name) > 1
) x;`,
        explanation:
          'This tests a functional dependency: passenger_id → passenger_name. It holds (0), as the source documents promise, so a normalized design would keep names in a passengers table keyed by passenger_id. Storing them per ticket is a deliberate choice: a ticket records the name as printed.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'airlines-055',
    dataset: 'airlines',
    level: 3,
    topics: ['gaps-islands', 'dates-advanced'],
    title: 'When Moscow to St Petersburg flew daily',
    prompt:
      'Find the runs of consecutive days (UTC) with at least one scheduled flight from SVO (Moscow) to LED (St Petersburg): first day, last day and number of days, in date order.',
    hint: 'A flight belongs to the route row whose valid_from ≤ scheduled_departure < valid_to; the airports are on the route.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Day minus row number',
        postgres: `with days as (
  select distinct f.scheduled_departure::date as day
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'SVO' and r.arrival_airport = 'LED'
),
runs as (
  select day, day - (row_number() over (order by day))::int as grp from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from runs
group by grp
order by first_day;`,
        mysql: `with days as (
  select distinct date(f.scheduled_departure) as day
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'SVO' and r.arrival_airport = 'LED'
),
runs as (
  select day, day - interval (row_number() over (order by day)) day as grp from days
)
select min(day) as first_day, max(day) as last_day, count(*) as days
from runs
group by grp
order by first_day;`,
        mysqlNote: 'Subtract an INTERVAL from a date in MySQL; date − number would turn the date into a number.',
        explanation: 'Islands of consecutive days. The route flies on 117 of the 121 days, in 5 runs: the gaps are days that month\'s schedule (days_of_week) leaves out. Cancelled flights still count here, because they were scheduled.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'airlines-056',
    dataset: 'airlines',
    level: 4,
    topics: ['upsert'],
    title: 'Keep only the latest check-in',
    prompt:
      'Create last_checkin (passenger_id primary key, checked_in_at). Record two check-ins for passenger "RU 1" (2025-11-02 10:00, then an older one 2025-11-01 09:00 arriving late) and one for "RU 2". The table must keep each passenger\'s latest time.',
    orderMatters: true,
    checkSql: `select passenger_id, checked_in_at from last_checkin order by passenger_id`,
    solutions: [
      {
        approach: 'Conditional upsert',
        postgres: `create table last_checkin (passenger_id varchar(20) primary key, checked_in_at timestamptz not null);

insert into last_checkin values ('RU 1', '2025-11-02 10:00+00'), ('RU 2', '2025-11-01 12:00+00');
insert into last_checkin values ('RU 1', '2025-11-01 09:00+00')
on conflict (passenger_id) do update set checked_in_at = excluded.checked_in_at
where excluded.checked_in_at > last_checkin.checked_in_at;`,
        mysql: `create table last_checkin (passenger_id varchar(20) primary key, checked_in_at datetime not null);

insert into last_checkin values ('RU 1', '2025-11-02 10:00:00'), ('RU 2', '2025-11-01 12:00:00');
insert into last_checkin values ('RU 1', '2025-11-01 09:00:00') as new
on duplicate key update checked_in_at = greatest(last_checkin.checked_in_at, new.checked_in_at);`,
        mysqlNote: 'ON DUPLICATE KEY UPDATE has no WHERE; GREATEST keeps the newer value instead.',
        explanation: 'Events can arrive out of order. The WHERE on DO UPDATE ignores a late, older event, so the stored time never goes backwards.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT … WHERE', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'airlines-057',
    dataset: 'airlines',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'Cancel a flight properly',
    prompt:
      'Write a procedure cancel_flight(p_flight_id) that sets the flight\'s status to Cancelled and removes its boarding passes (the passengers will be rebooked). Then cancel flight 11052.',
    orderMatters: false,
    checkSql: `call cancel_flight(11052);
select (select status from flights where flight_id = 11052) as status,
       (select count(*) from boarding_passes where flight_id = 11052) as passes`,
    solutions: [
      {
        approach: 'Two statements in a procedure',
        postgres: `create procedure cancel_flight(p_flight_id integer)
language sql
as $$
  update flights set status = 'Cancelled' where flight_id = p_flight_id;
  delete from boarding_passes where flight_id = p_flight_id;
$$;`,
        mysql: `create procedure cancel_flight(p_flight_id int)
begin
  update flights set status = 'Cancelled' where flight_id = p_flight_id;
  delete from boarding_passes where flight_id = p_flight_id;
end;`,
        mysqlNote: `${DELIMITER_NOTE}`,
        explanation: 'The flight\'s segments (the passengers\' rights to fly) stay; only the boarding passes, which are tied to seats on this departure, go. Both changes belong together, which is what the procedure guarantees.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' }],
  },
  {
    id: 'airlines-058',
    dataset: 'airlines',
    level: 3,
    topics: ['lateral', 'dates-advanced'],
    title: 'The next two departures',
    prompt: 'For each December route from FRA, show the next two scheduled departures after the snapshot (2025-12-01 00:00 UTC): route_no, flight_id and scheduled_departure.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 2',
        postgres: `select r.route_no, nxt.flight_id, nxt.scheduled_departure
from routes r
cross join lateral (
  select f.flight_id, f.scheduled_departure from flights f
  where f.route_no = r.route_no
    and f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < r.valid_to
  order by f.scheduled_departure
  limit 2
) nxt
where r.departure_airport = 'FRA' and r.valid_from = '2025-12-01'
order by r.route_no, nxt.scheduled_departure;`,
        mysql: `select r.route_no, nxt.flight_id, nxt.scheduled_departure
from routes r
cross join lateral (
  select f.flight_id, f.scheduled_departure from flights f
  where f.route_no = r.route_no
    and f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < r.valid_to
  order by f.scheduled_departure
  limit 2
) nxt
where r.departure_airport = 'FRA' and r.valid_from = '2025-12-01'
order by r.route_no, nxt.scheduled_departure;`,
        explanation: 'The inner query is limited to the December route row (before valid_to), because the same route_no may mean a different route in January.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'airlines-059',
    dataset: 'airlines',
    level: 3,
    topics: ['subtotals', 'aggregates'],
    title: 'Totals by class and by month, separately',
    prompt:
      'In one result, show segment revenue per travel class (all months) and per flight month (all classes), plus the grand total. No class × month detail rows.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUPING SETS',
        postgres: `select s.fare_conditions, to_char(f.scheduled_departure, 'YYYY-MM') as month, sum(s.price) as revenue
from segments s
join flights f on f.flight_id = s.flight_id
group by grouping sets ((s.fare_conditions), (to_char(f.scheduled_departure, 'YYYY-MM')), ())
order by grouping(s.fare_conditions), s.fare_conditions,
         grouping(to_char(f.scheduled_departure, 'YYYY-MM')), month;`,
        mysql: `select fare_conditions, month, revenue from (
  select s.fare_conditions, null as month, sum(s.price) as revenue, 0 as g1, 1 as g2
  from segments s group by s.fare_conditions
  union all
  select null, date_format(f.scheduled_departure, '%Y-%m'), sum(s.price), 1, 0
  from segments s join flights f on f.flight_id = s.flight_id
  group by date_format(f.scheduled_departure, '%Y-%m')
  union all
  select null, null, sum(price), 1, 1 from segments
) x
order by g1, fare_conditions, g2, month;`,
        mysqlNote: 'No GROUPING SETS in MySQL (only WITH ROLLUP, which always nests): one SELECT per grouping, glued with UNION ALL.',
        explanation:
          'GROUPING SETS lists exactly the groupings you want. ROLLUP (a, b) is shorthand for ((a, b), (a), ()), and CUBE for every combination; here neither fits, because the (class, month) detail is not wanted.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUPING SETS', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'airlines-060',
    dataset: 'airlines',
    level: 5,
    topics: ['procedures', 'transactions'],
    title: 'Rebook a passenger',
    prompt:
      'Write a procedure rebook(p_ticket_no, p_from_flight, p_to_flight) that moves a ticket\'s segment to another flight and removes the boarding pass of the old flight. Rebook ticket 0005432000395 from flight 77 to flight 78.',
    orderMatters: true,
    checkSql: `call rebook('0005432000395', 77, 78);
select s.flight_id, (select count(*) from boarding_passes b where b.ticket_no = s.ticket_no and b.flight_id = s.flight_id) as passes
from segments s where s.ticket_no = '0005432000395' order by s.flight_id`,
    solutions: [
      {
        approach: 'Delete the pass, then move the segment',
        postgres: `create procedure rebook(p_ticket_no text, p_from_flight integer, p_to_flight integer)
language sql
as $$
  delete from boarding_passes where ticket_no = p_ticket_no and flight_id = p_from_flight;
  update segments set flight_id = p_to_flight where ticket_no = p_ticket_no and flight_id = p_from_flight;
$$;`,
        mysql: `create procedure rebook(p_ticket_no char(13), p_from_flight int, p_to_flight int)
begin
  delete from boarding_passes where ticket_no = p_ticket_no and flight_id = p_from_flight;
  update segments set flight_id = p_to_flight where ticket_no = p_ticket_no and flight_id = p_from_flight;
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation:
          'The order matters: the boarding pass references the segment (ticket_no, flight_id), so it must go before the segment\'s flight_id changes, or the foreign key would block the update.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' }],
  },
  {
    id: 'airlines-061',
    dataset: 'airlines',
    level: 5,
    topics: ['full-text'],
    title: 'Cities named San or Santa',
    prompt: 'Make city names searchable by word and count the airports whose city contains the word "San" or "Santa".',
    orderMatters: false,
    checkSql: `select count(*) as airports from airports where to_tsvector('simple', city) @@ to_tsquery('simple', 'san | santa')`,
    checkSqlMysql: `select count(*) as airports from airports where match(city) against ('san santa' in boolean mode)`,
    solutions: [
      {
        approach: 'OR query on a full-text index',
        postgres: `create index airports_city_fts on airports using gin (to_tsvector('simple', city));`,
        mysql: `create fulltext index airports_city_ft on airports (city);`,
        explanation: 'Whole words only: "Santander" or "Sana\'a" do not match "san", which LIKE \'San%\' would wrongly include.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Full text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'airlines-062',
    dataset: 'airlines',
    level: 4,
    topics: ['materialized-views', 'dates-advanced'],
    title: 'Departures per airport and day',
    prompt: 'Store the number of scheduled departures per airport and day (UTC) for a departures dashboard.',
    hint: 'A flight belongs to the route row whose valid_from ≤ scheduled_departure < valid_to.',
    orderMatters: true,
    checkSql: `select airport, day, departures from airport_daily where airport = 'FRA' and day between '2025-12-01' and '2025-12-03' order by day`,
    solutions: [
      {
        approach: 'Materialized view over the period join',
        postgres: `create materialized view airport_daily as
select r.departure_airport as airport, f.scheduled_departure::date as day, count(*) as departures
from flights f
join routes r on r.route_no = f.route_no
             and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
group by r.departure_airport, f.scheduled_departure::date;`,
        mysql: `create table airport_daily as
select r.departure_airport as airport, date(f.scheduled_departure) as day, count(*) as departures
from flights f
join routes r on r.route_no = f.route_no
             and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
group by r.departure_airport, date(f.scheduled_departure);`,
        mysqlNote: 'A table stands in for the materialized view.',
        explanation: 'A few thousand rows instead of the flights-routes period join on every dashboard load.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'airlines-063',
    dataset: 'airlines',
    level: 4,
    topics: ['temp-tables'],
    title: 'Passengers of one day',
    prompt: 'Put the tickets (ticket_no, passenger_id) with a flight departing on 2025-12-01 (UTC) into a temporary table today_pax, one row per ticket.',
    orderMatters: false,
    checkSql: `select count(*) as tickets, count(distinct passenger_id) as passengers from today_pax`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS SELECT DISTINCT',
        postgres: `create temp table today_pax as
select distinct t.ticket_no, t.passenger_id
from tickets t
join segments s on s.ticket_no = t.ticket_no
join flights f  on f.flight_id = s.flight_id
where f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < '2025-12-02';`,
        mysql: `create temporary table today_pax as
select distinct t.ticket_no, t.passenger_id
from tickets t
join segments s on s.ticket_no = t.ticket_no
join flights f  on f.flight_id = s.flight_id
where f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < '2025-12-02';`,
        explanation: 'DISTINCT because a ticket with two flights that day would otherwise appear twice.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'airlines-064',
    dataset: 'airlines',
    level: 4,
    topics: ['merge'],
    title: 'A new cabin layout',
    prompt:
      'Airplane E70 gets a new layout: rows 1–2 stay Business, row 3 becomes Comfort (A, C, D), and seats 20A–20D are removed. Write the new layout of rows 1–3 and row 20 into new_layout and apply it with one statement: update changed classes, insert new seats, delete seats of those rows that are no longer listed.',
    orderMatters: true,
    checkSql: `select seat_no, fare_conditions from seats where airplane_code = 'E70' and (seat_no like '1_' or seat_no like '2_' or seat_no like '3_' or seat_no like '20_') order by seat_no`,
    solutions: [
      {
        approach: 'MERGE into a view of the affected rows',
        postgres: `create table new_layout (seat_no varchar(4) primary key, fare_conditions varchar(10) not null);
insert into new_layout values ('1A','Business'), ('1C','Business'), ('1D','Business'),
                              ('2A','Business'), ('2C','Business'), ('2D','Business'),
                              ('3A','Comfort'),  ('3C','Comfort'),  ('3D','Comfort');

create view e70_layout_rows as
select * from seats
where airplane_code = 'E70'
  and (seat_no like '1_' or seat_no like '2_' or seat_no like '3_' or seat_no like '20_');

merge into e70_layout_rows s
using new_layout n on n.seat_no = s.seat_no
when matched and s.fare_conditions <> n.fare_conditions then update set fare_conditions = n.fare_conditions
when not matched then insert (airplane_code, seat_no, fare_conditions) values ('E70', n.seat_no, n.fare_conditions)
when not matched by source then delete;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation:
          'MERGE runs against a simple view that shows only the affected rows, so NOT MATCHED BY SOURCE deletes seats 20A–20D but no other seat of the airplane. Row 3 does not exist yet and is inserted; rows 1–2 match and stay. MERGE into an updatable view works since PostgreSQL 17.',
      },
      {
        approach: 'DELETE, then upsert',
        postgres: `create table new_layout (seat_no varchar(4) primary key, fare_conditions varchar(10) not null);
insert into new_layout values ('1A','Business'), ('1C','Business'), ('1D','Business'),
                              ('2A','Business'), ('2C','Business'), ('2D','Business'),
                              ('3A','Comfort'),  ('3C','Comfort'),  ('3D','Comfort');

delete from seats
where airplane_code = 'E70'
  and (seat_no like '1_' or seat_no like '2_' or seat_no like '3_' or seat_no like '20_')
  and seat_no not in (select seat_no from new_layout);

insert into seats (airplane_code, seat_no, fare_conditions)
select 'E70', seat_no, fare_conditions from new_layout
on conflict (airplane_code, seat_no) do update set fare_conditions = excluded.fare_conditions;`,
        mysql: `create table new_layout (seat_no varchar(4) primary key, fare_conditions varchar(10) not null);
insert into new_layout values ('1A','Business'), ('1C','Business'), ('1D','Business'),
                              ('2A','Business'), ('2C','Business'), ('2D','Business'),
                              ('3A','Comfort'),  ('3C','Comfort'),  ('3D','Comfort');

delete from seats
where airplane_code = 'E70'
  and (seat_no like '1_' or seat_no like '2_' or seat_no like '3_' or seat_no like '20_')
  and seat_no not in (select seat_no from new_layout);

insert into seats (airplane_code, seat_no, fare_conditions)
select * from (select 'E70' as airplane_code, seat_no, fare_conditions from new_layout) as new
on duplicate key update fare_conditions = new.fare_conditions;`,
        explanation: 'The same three effects in two statements; the scope condition has to be repeated carefully in the DELETE.',
      },
    ],
    comparison: 'Same layout. Scoping matters in both: a MERGE … NOT MATCHED BY SOURCE against the whole seats table would delete every other seat of every airplane.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'airlines-065',
    dataset: 'airlines',
    level: 5,
    topics: ['query-plans', 'set-operations'],
    title: 'OR across two indexed columns',
    prompt: 'Count the segments that belong to ticket 0005432000395 or to flight 77 (a segment matching both counts once).',
    orderMatters: false,
    solutions: [
      {
        approach: 'OR',
        postgres: `select count(*) as segments
from segments
where ticket_no = '0005432000395' or flight_id = 77;`,
        mysql: `select count(*) as segments
from segments
where ticket_no = '0005432000395' or flight_id = 77;`,
        explanation: 'Both columns have an index (the primary key starts with ticket_no; flight_id has its own). PostgreSQL can combine them with a BitmapOr; MySQL can do an index merge union.',
      },
      {
        approach: 'UNION of two indexed lookups',
        postgres: `select count(*) as segments
from (
  select ticket_no, flight_id from segments where ticket_no = '0005432000395'
  union
  select ticket_no, flight_id from segments where flight_id = 77
) s;`,
        mysql: `select count(*) as segments
from (
  select ticket_no, flight_id from segments where ticket_no = '0005432000395'
  union
  select ticket_no, flight_id from segments where flight_id = 77
) s;`,
        explanation: 'Each half uses its own index; UNION (not UNION ALL) removes the segment that matches both conditions.',
      },
    ],
    comparison:
      'Same count. When OR across different columns makes the planner give up and scan the table, rewriting as a UNION of two indexed lookups is the classic fix; here PostgreSQL handles the OR well itself, as the plans show.',
    docs: [
      { label: 'PostgreSQL: Combining multiple indexes', url: PG + 'indexes-bitmap-scans.html' },
      { label: 'MySQL: Index merge optimization', url: MY + 'index-merge-optimization.html' },
    ],
  },
  {
    id: 'airlines-066',
    dataset: 'airlines',
    level: 1,
    topics: ['conditions', 'dates-basics'],
    title: 'Punctuality classes',
    prompt: 'Classify arrived flights by departure delay: "on time" up to 15 minutes, "late" up to 2 hours, "very late" beyond. Count the flights in each class.',
    orderMatters: false,
    solutions: [
      {
        approach: 'CASE on the delay',
        postgres: `select case when actual_departure <= scheduled_departure + interval '15 minutes' then 'on time'
            when actual_departure <= scheduled_departure + interval '2 hours' then 'late'
            else 'very late' end as class,
       count(*) as flights
from flights
where status = 'Arrived'
group by class;`,
        mysql: `select case when actual_departure <= scheduled_departure + interval 15 minute then 'on time'
            when actual_departure <= scheduled_departure + interval 2 hour then 'late'
            else 'very late' end as class,
       count(*) as flights
from flights
where status = 'Arrived'
group by class;`,
        explanation: 'Delays in this data are almost always either short or more than two hours: only 3 arrived flights fall in between. A class with no flights at all would not appear as a row, because GROUP BY only shows groups that have rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'airlines-067',
    dataset: 'airlines',
    level: 4,
    topics: ['generated-columns'],
    title: 'Delay in minutes, always up to date',
    prompt: 'Add a stored generated column delay_minutes to flights: whole minutes between scheduled and actual departure (NULL until it departs).',
    orderMatters: true,
    checkSql: `select flight_id, delay_minutes from flights where flight_id in (1, 2, 11052) order by flight_id`,
    solutions: [
      {
        approach: 'Generated column from two timestamps',
        postgres: `alter table flights add column delay_minutes integer
generated always as (floor(extract(epoch from actual_departure - scheduled_departure) / 60)::integer) stored;`,
        mysql: `alter table flights add column delay_minutes int
generated always as (timestampdiff(minute, scheduled_departure, actual_departure)) stored;`,
        explanation:
          'timestamptz − timestamptz does not depend on the time zone, so it is IMMUTABLE and allowed (unlike casting a timestamptz to date). A NULL actual_departure gives a NULL delay, which is what "not departed yet" should look like.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' }],
  },
  {
    id: 'airlines-068',
    dataset: 'airlines',
    level: 1,
    topics: ['distinct'],
    title: 'Airplanes used on each route number',
    prompt: 'Over the four months, on how many different airplane types did each route number fly? Show the route numbers that used more than one type, with that number.',
    orderMatters: true,
    solutions: [
      {
        approach: 'count(DISTINCT) with HAVING',
        postgres: `select route_no, count(distinct airplane_code) as airplane_types
from routes
group by route_no
having count(distinct airplane_code) > 1
order by airplane_types desc, route_no;`,
        mysql: `select route_no, count(distinct airplane_code) as airplane_types
from routes
group by route_no
having count(distinct airplane_code) > 1
order by airplane_types desc, route_no;`,
        explanation: 'routes has one row per route number and month; the same number may get another airplane next month, or even mean a different route entirely.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'airlines-069',
    dataset: 'airlines',
    level: 3,
    topics: ['window-frames', 'dates-advanced'],
    title: 'Departures in the last 7 days',
    prompt: 'For FRA, for each day of December 2025 (UTC), show the departures that day and the total over that day and the 6 days before.',
    hint: 'A flight belongs to the route row whose valid_from ≤ scheduled_departure < valid_to.',
    orderMatters: true,
    solutions: [
      {
        approach: 'RANGE frame over dates',
        postgres: `with daily as (
  select f.scheduled_departure::date as day, count(*) as departures
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'FRA' and f.scheduled_departure >= '2025-11-25' and f.scheduled_departure < '2026-01-01'
  group by 1
)
select day, departures, last_7_days
from (select day, departures,
             sum(departures) over (order by day range between interval '6 days' preceding and current row) as last_7_days
      from daily) d
where day >= '2025-12-01'
order by day;`,
        mysql: `with daily as (
  select date(f.scheduled_departure) as day, count(*) as departures
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'FRA' and f.scheduled_departure >= '2025-11-25' and f.scheduled_departure < '2026-01-01'
  group by 1
)
select day, departures, last_7_days
from (select day, departures,
             sum(departures) over (order by day range between interval 6 day preceding and current row) as last_7_days
      from daily) d
where day >= '2025-12-01'
order by day;`,
        explanation: 'RANGE counts in days, so a day without departures would not stretch the window as ROWS would. The data starts on 25 November to give 1 December a full week.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'airlines-070',
    dataset: 'airlines',
    level: 3,
    topics: ['gaps-islands', 'lag-lead'],
    title: 'Quiet hours at Frankfurt',
    prompt: 'On 2025-12-01 (UTC), find the gaps of at least 2 hours between consecutive scheduled departures from FRA: the departure before the gap, the next one and the gap in minutes.',
    hint: 'A flight belongs to the route row whose valid_from ≤ scheduled_departure < valid_to.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LEAD over the day\'s departures',
        postgres: `with deps as (
  select f.scheduled_departure as dep
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'FRA' and f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < '2025-12-02'
)
select dep as before_gap, next_dep as after_gap, (extract(epoch from next_dep - dep) / 60)::int as gap_minutes
from (select dep, lead(dep) over (order by dep) as next_dep from deps) d
where next_dep - dep >= interval '2 hours'
order by dep;`,
        mysql: `with deps as (
  select f.scheduled_departure as dep
  from flights f
  join routes r on r.route_no = f.route_no
               and f.scheduled_departure >= r.valid_from and f.scheduled_departure < r.valid_to
  where r.departure_airport = 'FRA' and f.scheduled_departure >= '2025-12-01' and f.scheduled_departure < '2025-12-02'
)
select dep as before_gap, next_dep as after_gap, timestampdiff(minute, dep, next_dep) as gap_minutes
from (select dep, lead(dep) over (order by dep) as next_dep from deps) d
where timestampdiff(minute, dep, next_dep) >= 120
order by dep;`,
        explanation: 'Scheduled times are whole minutes, so the minute count is exact in both databases.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LEAD', url: PG + 'functions-window.html' }],
  },
  {
    id: 'airlines-071',
    dataset: 'airlines',
    level: 5,
    topics: ['functions'],
    title: 'Flight time as a function',
    prompt: 'Write a function flight_minutes(p_flight_id) returning the scheduled flight time in minutes, or NULL for an unknown flight.',
    orderMatters: false,
    checkSql: `select flight_minutes(1) as first, flight_minutes(11052) as other, flight_minutes(999999) as unknown`,
    solutions: [
      {
        approach: 'SQL function',
        postgres: `create function flight_minutes(p_flight_id integer) returns integer
language sql
stable
as $$
  select (extract(epoch from scheduled_arrival - scheduled_departure) / 60)::int
  from flights where flight_id = p_flight_id;
$$;`,
        mysql: `create function flight_minutes(p_flight_id int) returns int
reads sql data
begin
  return (select timestampdiff(minute, scheduled_departure, scheduled_arrival) from flights where flight_id = p_flight_id);
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation: 'A query that finds no row returns NULL from a SQL function, which is a good answer for "unknown flight".',
      },
    ],
    docs: [{ label: 'PostgreSQL: SQL functions', url: PG + 'xfunc-sql.html' }],
  },
  {
    id: 'airlines-072',
    dataset: 'airlines',
    level: 2,
    topics: ['full-join'],
    title: 'Passenger countries, October vs November',
    prompt: 'For passenger country codes (first two letters of passenger_id), compare passengers flying in October 2025 with those in November: count countries seen in both months, only October and only November.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two country lists',
        postgres: `with oct as (
  select distinct left(t.passenger_id, 2) as c from tickets t
  join segments s on s.ticket_no = t.ticket_no join flights f on f.flight_id = s.flight_id
  where f.scheduled_departure >= '2025-10-01' and f.scheduled_departure < '2025-11-01'
),
nov as (
  select distinct left(t.passenger_id, 2) as c from tickets t
  join segments s on s.ticket_no = t.ticket_no join flights f on f.flight_id = s.flight_id
  where f.scheduled_departure >= '2025-11-01' and f.scheduled_departure < '2025-12-01'
)
select count(*) filter (where o.c is not null and n.c is not null) as both_months,
       count(*) filter (where n.c is null) as only_october,
       count(*) filter (where o.c is null) as only_november
from oct o full join nov n on n.c = o.c;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Small countries may appear in one month only, simply because the sample has few of their passengers.',
      },
      {
        approach: 'Flags per country',
        postgres: `select sum(case when o = 1 and n = 1 then 1 else 0 end) as both_months,
       sum(case when o = 1 and n = 0 then 1 else 0 end) as only_october,
       sum(case when o = 0 and n = 1 then 1 else 0 end) as only_november
from (
  select left(t.passenger_id, 2) as c,
         max(case when f.scheduled_departure < '2025-11-01' then 1 else 0 end) as o,
         max(case when f.scheduled_departure >= '2025-11-01' then 1 else 0 end) as n
  from tickets t join segments s on s.ticket_no = t.ticket_no join flights f on f.flight_id = s.flight_id
  where f.scheduled_departure >= '2025-10-01' and f.scheduled_departure < '2025-12-01'
  group by left(t.passenger_id, 2)
) x;`,
        mysql: `select sum(o = 1 and n = 1) as both_months, sum(o = 1 and n = 0) as only_october, sum(o = 0 and n = 1) as only_november
from (
  select left(t.passenger_id, 2) as c,
         max(f.scheduled_departure < '2025-11-01') as o,
         max(f.scheduled_departure >= '2025-11-01') as n
  from tickets t join segments s on s.ticket_no = t.ticket_no join flights f on f.flight_id = s.flight_id
  where f.scheduled_departure >= '2025-10-01' and f.scheduled_departure < '2025-12-01'
  group by left(t.passenger_id, 2)
) x;`,
        explanation: 'One pass over both months with a flag per month.',
      },
    ],
    comparison: 'Same counts.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
]
