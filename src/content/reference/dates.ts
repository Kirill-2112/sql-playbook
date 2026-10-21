import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_DT = PG + 'functions-datetime.html'
const MY_DT = MY + 'date-and-time-functions.html'

export const dateEntries: ReferenceEntry[] = [
  {
    id: 'current-date',
    name: 'CURRENT_DATE / NOW()',
    group: 'dates',
    summary:
      'Today\'s date and the current moment. In PostgreSQL now() is fixed for the whole transaction; clock_timestamp() keeps moving. Sample databases are frozen in the past, so compare with their own latest date instead.',
    postgres: 'current_date\nnow()\ncurrent_timestamp',
    mysql: 'current_date\nnow()\ncurrent_timestamp',
    mysqlNote: "MySQL's NOW() is fixed per statement; SYSDATE() keeps moving.",
    example: {
      postgres: "select current_date > date '2024-01-01' as after_2024, now() >= current_date as now_is_today_or_later;",
    },
    match: '\\b(current_date|current_timestamp|now\\s*\\(|localtimestamp|curdate\\s*\\()',
    docs: [
      { label: 'PostgreSQL: current date/time', url: PG_DT + '#FUNCTIONS-DATETIME-CURRENT' },
      { label: 'MySQL: NOW', url: MY_DT + '#function_now' },
    ],
  },
  {
    id: 'date-trunc',
    name: 'DATE_TRUNC',
    group: 'dates',
    summary: 'Cuts a date or timestamp down to the start of its year, month, week, day or hour. The standard way to group by month.',
    postgres: "date_trunc('month', order_date)",
    mysql: "date_format(order_date, '%Y-%m-01')",
    mysqlNote: "No DATE_TRUNC in MySQL. DATE_FORMAT to the first of the month works; for weeks use d - interval weekday(d) day.",
    example: {
      postgres: "select date_trunc('month', date '2025-03-17')::date as month_start;",
      mysql: "select cast(date_format('2025-03-17', '%Y-%m-01') as date) as month_start;",
    },
    match: '\\bdate_trunc\\s*\\(',
    docs: [
      { label: 'PostgreSQL: date_trunc', url: PG_DT + '#FUNCTIONS-DATETIME-TRUNC' },
      { label: 'MySQL: DATE_FORMAT', url: MY_DT + '#function_date-format' },
    ],
  },
  {
    id: 'extract',
    name: 'EXTRACT / DATE_PART',
    group: 'dates',
    summary:
      'Pulls one field out of a date: year, month, day, hour, day of week… Day-of-week numbering differs: PostgreSQL dow is 0 for Sunday, isodow is 7 for Sunday.',
    postgres: 'extract(year from d)\nextract(dow from d)\ndate_part(\'month\', d)',
    mysql: 'extract(year from d)\ndayofweek(d) - 1\nmonth(d)',
    mysqlNote: 'MySQL also has YEAR(), MONTH(), DAY(), HOUR(); DAYOFWEEK is 1 for Sunday, WEEKDAY is 0 for Monday.',
    example: {
      postgres: "select extract(year from date '2025-03-17') as y, extract(month from date '2025-03-17') as m, extract(dow from date '2025-03-17') as dow;",
      mysql: "select extract(year from date '2025-03-17') as y, extract(month from date '2025-03-17') as m, dayofweek(date '2025-03-17') - 1 as dow;",
    },
    match: '\\b(extract|date_part)\\s*\\(|\\b(year|month|dayofweek|weekday|dayofmonth)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: EXTRACT', url: PG_DT + '#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: EXTRACT', url: MY_DT + '#function_extract' },
    ],
  },
  {
    id: 'interval',
    name: 'INTERVAL arithmetic',
    group: 'dates',
    summary:
      'Adds or subtracts a span of time. Adding a month to 31 January gives the last day of February. In PostgreSQL date + integer adds days.',
    postgres: "order_date + interval '1 month'\norder_date + 7",
    mysql: 'order_date + interval 1 month\norder_date + interval 7 day',
    mysqlNote: "MySQL writes the unit without quotes and in the singular: interval 7 day. DATE_ADD(d, interval 1 month) is the same.",
    example: {
      postgres: "select (date '2025-01-31' + interval '1 month')::date as plus_month, date '2025-03-01' + 7 as plus_week;",
      mysql: "select date '2025-01-31' + interval 1 month as plus_month, date '2025-03-01' + interval 7 day as plus_week;",
    },
    match: "\\binterval\\s*('|\\d)|\\bdate_(add|sub)\\s*\\(",
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG_DT + '#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: DATE_ADD', url: MY_DT + '#function_date-add' },
    ],
  },
  {
    id: 'date-diff',
    name: 'Days between two dates',
    group: 'dates',
    summary: 'In PostgreSQL subtracting two dates gives a whole number of days. Subtracting timestamps gives an interval instead.',
    postgres: 'end_date - start_date',
    mysql: 'datediff(end_date, start_date)',
    mysqlNote: 'DATEDIFF ignores the time part. TIMESTAMPDIFF(unit, a, b) counts any unit from seconds to years.',
    example: {
      postgres: "select date '2025-03-01' - date '2025-02-01' as days;",
      mysql: "select datediff('2025-03-01', '2025-02-01') as days;",
    },
    match: '\\bdatediff\\s*\\(|\\b\\w*date\\w*\\s*-\\s*\\w*date\\b',
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG_DT + '#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: DATEDIFF', url: MY_DT + '#function_datediff' },
    ],
  },
  {
    id: 'timestamp-diff',
    name: 'Time between two timestamps',
    group: 'dates',
    summary:
      'For durations in minutes or hours, convert to a number: PostgreSQL extracts the epoch (seconds) from the interval; MySQL counts with TIMESTAMPDIFF.',
    postgres: 'extract(epoch from (arrived - departed)) / 60',
    mysql: 'timestampdiff(minute, departed, arrived)',
    mysqlNote: 'TIMESTAMPDIFF returns whole units, rounding down.',
    example: {
      postgres: "select round(extract(epoch from (timestamp '2025-05-01 11:30' - timestamp '2025-05-01 10:00')) / 60) as minutes;",
      mysql: "select timestampdiff(minute, '2025-05-01 10:00', '2025-05-01 11:30') as minutes;",
    },
    match: '\\bextract\\s*\\(\\s*epoch\\b|\\btimestampdiff\\s*\\(',
    docs: [
      { label: 'PostgreSQL: EXTRACT epoch', url: PG_DT + '#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY_DT + '#function_timestampdiff' },
    ],
  },
  {
    id: 'age',
    name: 'AGE',
    group: 'dates',
    summary: 'The difference between two dates in years, months and days, counted the way people count birthdays.',
    postgres: 'age(current_date, birth_date)\nextract(year from age(hire_date, birth_date))',
    mysql: 'timestampdiff(year, birth_date, current_date)',
    example: {
      postgres: "select extract(year from age(date '2025-03-17', date '1990-07-01')) as years;",
      mysql: "select timestampdiff(year, '1990-07-01', '2025-03-17') as years;",
    },
    match: '\\bage\\s*\\(',
    docs: [
      { label: 'PostgreSQL: age', url: PG_DT },
      { label: 'MySQL: TIMESTAMPDIFF', url: MY_DT + '#function_timestampdiff' },
    ],
  },
  {
    id: 'to-char',
    name: 'TO_CHAR (dates)',
    group: 'dates',
    summary: 'Formats a date as text with a pattern: YYYY, MM, DD, Mon, Day, HH24:MI… The FM prefix removes padding spaces.',
    postgres: "to_char(d, 'DD.MM.YYYY')\nto_char(d, 'FMMonth YYYY')",
    mysql: "date_format(d, '%d.%m.%Y')\ndate_format(d, '%M %Y')",
    mysqlNote: 'MySQL uses % codes: %Y year, %m month, %d day, %M month name, %H:%i hours and minutes.',
    example: {
      postgres: "select to_char(date '2025-03-07', 'DD.MM.YYYY') as dotted, to_char(date '2025-03-07', 'FMMonth YYYY') as label;",
      mysql: "select date_format('2025-03-07', '%d.%m.%Y') as dotted, date_format('2025-03-07', '%M %Y') as label;",
    },
    match: '\\b(to_char|date_format)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: formatting functions', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: DATE_FORMAT', url: MY_DT + '#function_date-format' },
    ],
  },
  {
    id: 'to-date',
    name: 'TO_DATE / TO_TIMESTAMP',
    group: 'dates',
    summary: 'Parses text into a date or timestamp using a pattern, for dates stored as strings in an odd format.',
    postgres: "to_date('07/03/2025', 'DD/MM/YYYY')\nto_timestamp('2025-03-07 14:05', 'YYYY-MM-DD HH24:MI')",
    mysql: "str_to_date('07/03/2025', '%d/%m/%Y')",
    example: {
      postgres: "select to_date('07/03/2025', 'DD/MM/YYYY') as d;",
      mysql: "select str_to_date('07/03/2025', '%d/%m/%Y') as d;",
    },
    match: '\\b(to_date|to_timestamp|str_to_date)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: formatting functions', url: PG + 'functions-formatting.html' },
      { label: 'MySQL: STR_TO_DATE', url: MY_DT + '#function_str-to-date' },
    ],
  },
  {
    id: 'make-date',
    name: 'MAKE_DATE',
    group: 'dates',
    summary: 'Builds a date from year, month and day numbers, for tables that store them in separate columns.',
    postgres: 'make_date(year, month, 1)',
    mysql: "str_to_date(concat(year, '-', month, '-1'), '%Y-%m-%d')",
    mysqlNote: 'No MAKE_DATE in MySQL. MAKEDATE(year, day_of_year) exists but takes a day of the year.',
    example: {
      postgres: 'select make_date(2025, 3, 7) as d;',
      mysql: "select str_to_date(concat(2025, '-', 3, '-', 7), '%Y-%m-%d') as d;",
    },
    match: '\\bmake_(date|timestamp)\\s*\\(|\\bmakedate\\s*\\(',
    docs: [
      { label: 'PostgreSQL: make_date', url: PG_DT },
      { label: 'MySQL: MAKEDATE', url: MY_DT + '#function_makedate' },
    ],
  },
  {
    id: 'last-day',
    name: 'Last day of the month',
    group: 'dates',
    summary: 'The month start plus one month minus one day. MySQL has a function for it.',
    postgres: "(date_trunc('month', d) + interval '1 month - 1 day')::date",
    mysql: 'last_day(d)',
    example: {
      postgres: "select (date_trunc('month', date '2024-02-10') + interval '1 month - 1 day')::date as last;",
      mysql: "select last_day('2024-02-10') as last;",
    },
    match: "\\blast_day\\s*\\(|interval\\s*'1 month - 1 day'",
    docs: [
      { label: 'PostgreSQL: date/time operators', url: PG_DT + '#OPERATORS-DATETIME-TABLE' },
      { label: 'MySQL: LAST_DAY', url: MY_DT + '#function_last-day' },
    ],
  },
  {
    id: 'at-time-zone',
    name: 'AT TIME ZONE',
    group: 'dates',
    summary:
      'Converts between time zones. timestamptz AT TIME ZONE \'Europe/Oslo\' gives the local wall-clock time there; a plain timestamp AT TIME ZONE \'UTC\' says "this was UTC".',
    postgres: "departure at time zone 'Europe/Oslo'",
    mysql: "convert_tz(departure, 'UTC', 'Europe/Oslo')",
    mysqlNote: 'CONVERT_TZ needs the time zone tables loaded (the official Docker image has them); otherwise it returns NULL.',
    example: {
      postgres: "select timestamp '2025-06-01 12:00' at time zone 'UTC' at time zone 'Europe/Oslo' as oslo;",
      mysql: "select convert_tz('2025-06-01 12:00:00', 'UTC', 'Europe/Oslo') as oslo;",
    },
    match: '\\bat\\s+time\\s+zone\\b|\\bconvert_tz\\s*\\(',
    docs: [
      { label: 'PostgreSQL: AT TIME ZONE', url: PG_DT + '#FUNCTIONS-DATETIME-ZONECONVERT' },
      { label: 'MySQL: CONVERT_TZ', url: MY_DT + '#function_convert-tz' },
    ],
  },
  {
    id: 'overlaps',
    name: 'OVERLAPS and date ranges',
    group: 'dates',
    summary:
      'Two periods overlap when each starts before the other ends: a.start < b.end and b.start < a.end. PostgreSQL has OVERLAPS and range types (daterange, &&) for it.',
    postgres: '(a_start, a_end) overlaps (b_start, b_end)\ndaterange(a_start, a_end) && daterange(b_start, b_end)',
    mysql: 'a_start < b_end and b_start < a_end',
    mysqlNote: 'No OVERLAPS or range types in MySQL; write the two comparisons.',
    example: {
      postgres: "select (date '2025-01-01', date '2025-01-10') overlaps (date '2025-01-09', date '2025-01-20') as overlap;",
      mysql: "select date '2025-01-01' < date '2025-01-20' and date '2025-01-09' < date '2025-01-10' as overlap;",
    },
    match: '\\boverlaps\\b|\\b(date|tstz|ts|int4|num)range\\s*\\(|&&',
    docs: [
      { label: 'PostgreSQL: OVERLAPS', url: PG_DT },
      { label: 'PostgreSQL: range types', url: PG + 'rangetypes.html' },
    ],
  },
]
