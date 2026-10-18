import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const STINT_NOTE =
  'A player traded during a season has one row per team (stint 1, 2, …). For season totals, add up all his stints.'
const SEASONS_NOTE = 'Player statistics, salaries, All-Star games and awards cover 2010 on; team seasons go back to 1871.'
const SHORT_SEASON_NOTE = 'The 2020 season was cut to 60 games, so compare it by winning percentage, not by wins.'
const DELIMITER_NOTE =
  'In the mysql command-line client, wrap the CREATE statement in DELIMITER $$ … $$ so the semicolons inside the body do not end it early.'

export const lahmanExercises: Exercise[] = [
  // ---------- Level 1 ----------
  {
    id: 'lahman-001',
    dataset: 'lahman',
    level: 1,
    topics: ['select-basics'],
    title: 'The 105-win teams',
    prompt: 'Which team seasons ended with at least 105 wins? Show year_id, name, w and l: most wins first, then by year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'WHERE + ORDER BY',
        postgres: `select year_id, name, w, l
from teams
where w >= 105
order by w desc, year_id, team_id;`,
        mysql: `select year_id, name, w, l
from teams
where w >= 105
order by w desc, year_id, team_id;`,
        explanation: 'teams has one row per team and season since 1871. team_id as the last sort key fixes the order of two teams with equal wins in the same year.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT', url: PG + 'sql-select.html' }],
  },
  {
    id: 'lahman-002',
    dataset: 'lahman',
    level: 1,
    topics: ['numbers', 'casting'],
    title: 'Winning percentage',
    prompt:
      'For the 2025 American League East (lg_id = AL, div_id = E), show name, w, l and the winning percentage w / (w + l) rounded to 3 decimals, best first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Cast before dividing',
        postgres: `select name, w, l,
       round(w::numeric / (w + l), 3) as pct
from teams
where year_id = 2025 and lg_id = 'AL' and div_id = 'E'
order by pct desc, name;`,
        mysql: `select name, w, l,
       round(w / (w + l), 3) as pct
from teams
where year_id = 2025 and lg_id = 'AL' and div_id = 'E'
order by pct desc, name;`,
        mysqlNote: 'In MySQL / always gives a decimal result, so no cast is needed. DIV is its integer division.',
        explanation:
          'w and l are integers, and in PostgreSQL integer / integer is integer division: 93 / 162 is 0. Casting one side to numeric (or writing 1.0 * w) keeps the fraction.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Mathematical operators', url: PG + 'functions-math.html' },
      { label: 'MySQL: Arithmetic operators', url: MY + 'arithmetic-functions.html' },
    ],
  },
  {
    id: 'lahman-003',
    dataset: 'lahman',
    level: 1,
    topics: ['select-basics', 'dates-basics'],
    title: 'Japanese debuts in 2025',
    prompt: 'Which players born in Japan made their major-league debut in 2025? Show name_first, name_last and debut, in debut order.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Date range',
        postgres: `select name_first, name_last, debut
from people
where birth_country = 'Japan'
  and debut >= '2025-01-01' and debut < '2026-01-01'
order by debut, player_id;`,
        mysql: `select name_first, name_last, debut
from people
where birth_country = 'Japan'
  and debut >= '2025-01-01' and debut < '2026-01-01'
order by debut, player_id;`,
        explanation: 'debut is a DATE: the first major-league game. A half-open range selects one calendar year.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Date/time types', url: PG + 'datatype-datetime.html' }],
  },
  {
    id: 'lahman-004',
    dataset: 'lahman',
    level: 1,
    topics: ['null', 'joins'],
    title: 'Hall of Famers no longer with us',
    prompt:
      'Players (category Player) inducted into the Hall of Fame since 2015 who have since died: name_first, name_last, the induction year and death_year.',
    hint: 'A living person has no death_year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'IS NOT NULL',
        postgres: `select p.name_first, p.name_last, h.year_id as inducted_in, p.death_year
from hall_of_fame h
join people p on p.player_id = h.player_id
where h.inducted = 'Y' and h.category = 'Player' and h.year_id >= 2015
  and p.death_year is not null
order by h.year_id, p.player_id;`,
        mysql: `select p.name_first, p.name_last, h.year_id as inducted_in, p.death_year
from hall_of_fame h
join people p on p.player_id = h.player_id
where h.inducted = 'Y' and h.category = 'Player' and h.year_id >= 2015
  and p.death_year is not null
order by h.year_id, p.player_id;`,
        explanation: 'NULL means "unknown or not happened". death_year = NULL would match nothing; IS NOT NULL is the test.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison predicates', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'lahman-005',
    dataset: 'lahman',
    level: 1,
    topics: ['text-search'],
    title: 'The Mc players',
    prompt: 'List the players who debuted in 2020 or later and whose last name starts with "Mc": player_id, name_first, name_last, ordered by player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIKE with a prefix',
        postgres: `select player_id, name_first, name_last
from people
where name_last like 'Mc%'
  and debut >= '2020-01-01'
order by player_id;`,
        mysql: `select player_id, name_first, name_last
from people
where name_last like 'Mc%'
  and debut >= '2020-01-01'
order by player_id;`,
        mysqlNote: 'MySQL\'s LIKE ignores letter case with this collation, so it would also match "mc…". All the names here are capitalised, so the result is the same.',
        explanation: 'A pattern that starts with fixed text ("Mc%") can use a b-tree index on the column; "%Mc%" cannot.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'lahman-006',
    dataset: 'lahman',
    level: 1,
    topics: ['strings', 'numbers'],
    title: 'Height in feet and inches',
    prompt:
      'height is in inches. For the 10 tallest players who debuted in 2020 or later, show the full name ("First Last") and the height written like 6\'8". Ties by player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer division and remainder',
        postgres: `select name_first || ' ' || name_last as player,
       (height / 12) || '''' || (height % 12) || '"' as height_ft
from people
where debut >= '2020-01-01' and height is not null
order by height desc, player_id
limit 10;`,
        mysql: `select concat(name_first, ' ', name_last) as player,
       concat(height div 12, '''', height % 12, '"') as height_ft
from people
where debut >= '2020-01-01' and height is not null
order by height desc, player_id
limit 10;`,
        mysqlNote: 'concat() instead of || (which means OR in MySQL), and DIV for integer division: height / 12 would give 6.6667.',
        explanation:
          'Here PostgreSQL\'s integer division is exactly what we want: 80 / 12 is 6 feet, and 80 % 12 is the 8 inches left. A single quote inside a string is written twice.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: String functions', url: PG + 'functions-string.html' },
      { label: 'MySQL: DIV', url: MY + 'arithmetic-functions.html#operator_div' },
    ],
  },
  {
    id: 'lahman-007',
    dataset: 'lahman',
    level: 1,
    topics: ['dates-basics'],
    title: 'The youngest debuts of 2025',
    prompt:
      'Birth dates are stored as three numbers (birth_year, birth_month, birth_day). For the 10 youngest players to debut in 2025, show name_first, name_last, the birth date as a date and the age in whole years on debut day.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Build a date, then age()',
        postgres: `select name_first, name_last,
       make_date(birth_year, birth_month, birth_day)                          as born,
       extract(year from age(debut, make_date(birth_year, birth_month, birth_day)))::int as age_at_debut
from people
where debut >= '2025-01-01' and debut < '2026-01-01'
order by born desc, player_id
limit 10;`,
        mysql: `select name_first, name_last,
       str_to_date(concat_ws('-', birth_year, birth_month, birth_day), '%Y-%m-%d') as born,
       timestampdiff(year, str_to_date(concat_ws('-', birth_year, birth_month, birth_day), '%Y-%m-%d'), debut) as age_at_debut
from people
where debut >= '2025-01-01' and debut < '2026-01-01'
order by born desc, player_id
limit 10;`,
        mysqlNote: 'MySQL has no make_date(y, m, d) (its MAKEDATE takes a day of the year), so the date is built from text. TIMESTAMPDIFF(YEAR, …) counts whole years.',
        explanation: 'make_date turns three numbers into a date. age() gives "21 years 3 mons 5 days"; extract(year …) keeps the whole years.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: make_date, age', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: STR_TO_DATE', url: MY + 'date-and-time-functions.html#function_str-to-date' },
    ],
  },
  {
    id: 'lahman-008',
    dataset: 'lahman',
    level: 1,
    topics: ['distinct'],
    title: 'Where the 2025 hitters were born',
    prompt: 'List each birth country of the players with a 2025 batting row, once.',
    orderMatters: false,
    solutions: [
      {
        approach: 'DISTINCT',
        postgres: `select distinct p.birth_country
from batting b
join people p on p.player_id = b.player_id
where b.year_id = 2025;`,
        mysql: `select distinct p.birth_country
from batting b
join people p on p.player_id = b.player_id
where b.year_id = 2025;`,
        explanation: 'The join gives one row per batting line; DISTINCT folds the repeated countries into one row each.',
      },
    ],
    docs: [{ label: 'PostgreSQL: SELECT DISTINCT', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },

  // ---------- Level 2 ----------
  {
    id: 'lahman-009',
    dataset: 'lahman',
    level: 2,
    topics: ['group-by', 'aggregates'],
    title: 'Debuts of 2025 by country',
    prompt: 'How many players debuted in 2025 from each birth country? Most first.',
    orderMatters: false,
    solutions: [
      {
        approach: 'GROUP BY',
        postgres: `select birth_country, count(*) as debuts
from people
where debut >= '2025-01-01' and debut < '2026-01-01'
group by birth_country
order by debuts desc;`,
        mysql: `select birth_country, count(*) as debuts
from people
where debut >= '2025-01-01' and debut < '2026-01-01'
group by birth_country
order by debuts desc;`,
        explanation: 'One group per country. Country names are written as in the source: "D.R." is the Dominican Republic, "P.R." Puerto Rico, "CAN" Canada.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'lahman-010',
    dataset: 'lahman',
    level: 2,
    topics: ['joins', 'group-by'],
    title: 'Home run leaders since 2010',
    prompt: 'Who hit the most home runs from 2010 to 2025 in total? Show name_first, name_last and the total for the top 10.',
    hint: SEASONS_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Sum, then join names',
        postgres: `select p.name_first, p.name_last, sum(b.hr) as home_runs
from batting b
join people p on p.player_id = b.player_id
group by p.player_id, p.name_first, p.name_last
order by home_runs desc, p.player_id
limit 10;`,
        mysql: `select p.name_first, p.name_last, sum(b.hr) as home_runs
from batting b
join people p on p.player_id = b.player_id
group by p.player_id, p.name_first, p.name_last
order by home_runs desc, p.player_id
limit 10;`,
        explanation: 'Group by player_id, not by name: two different players can share a name. Every stint and season of the player is added up.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate functions', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'lahman-011',
    dataset: 'lahman',
    level: 2,
    topics: ['conditional-aggregates', 'pivot'],
    title: 'World Series titles by decade and league',
    prompt: 'For each decade since 1950 (1950, 1960, …), count the World Series titles won by American League and by National League teams.',
    hint: 'ws_win = \'Y\' marks the champion. There was no World Series in 1994.',
    orderMatters: true,
    solutions: [
      {
        approach: 'FILTER',
        postgres: `select year_id / 10 * 10                                as decade,
       count(*) filter (where lg_id = 'AL')                as al_titles,
       count(*) filter (where lg_id = 'NL')                as nl_titles
from teams
where ws_win = 'Y' and year_id >= 1950
group by decade
order by decade;`,
        mysql: null,
        mysqlNote: 'No FILTER in MySQL; see solution B.',
        explanation: 'year_id / 10 * 10 rounds a year down to its decade, thanks to integer division. FILTER limits each count to one league.',
      },
      {
        approach: 'SUM over a condition',
        postgres: `select year_id / 10 * 10                                  as decade,
       sum(case when lg_id = 'AL' then 1 else 0 end)         as al_titles,
       sum(case when lg_id = 'NL' then 1 else 0 end)         as nl_titles
from teams
where ws_win = 'Y' and year_id >= 1950
group by decade
order by decade;`,
        mysql: `select year_id div 10 * 10      as decade,
       sum(lg_id = 'AL')           as al_titles,
       sum(lg_id = 'NL')           as nl_titles
from teams
where ws_win = 'Y' and year_id >= 1950
group by decade
order by decade;`,
        mysqlNote: 'year_id / 10 is 195.0 in MySQL; DIV keeps it an integer.',
        explanation: 'The portable pivot: one column per category, each a sum of 1s and 0s.',
      },
    ],
    comparison: 'Same result. FILTER reads best; the SUM form works in every database.',
    docs: [
      { label: 'PostgreSQL: Aggregate expressions (FILTER)', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' },
      { label: 'MySQL: DIV', url: MY + 'arithmetic-functions.html#operator_div' },
    ],
  },
  {
    id: 'lahman-012',
    dataset: 'lahman',
    level: 2,
    topics: ['group-by', 'text-aggregation'],
    title: 'Three teams in one season',
    prompt:
      'Which players played for at least three teams in the same season (2020 on)? Show player_id, year_id and the teams in stint order as one text like "SEA, NYY, TEX".',
    hint: STINT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'HAVING + string_agg',
        postgres: `select player_id, year_id,
       string_agg(team_id, ', ' order by stint) as teams
from batting
where year_id >= 2020
group by player_id, year_id
having count(distinct team_id) >= 3
order by year_id, player_id;`,
        mysql: `select player_id, year_id,
       group_concat(team_id order by stint separator ', ') as teams
from batting
where year_id >= 2020
group by player_id, year_id
having count(distinct team_id) >= 3
order by year_id, player_id;`,
        explanation: 'HAVING filters groups after they are built: here, player-seasons with three or more distinct teams. The text lists them in the order he joined them.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' },
      { label: 'MySQL: GROUP_CONCAT', url: MY + 'aggregate-functions.html#function_group-concat' },
    ],
  },
  {
    id: 'lahman-013',
    dataset: 'lahman',
    level: 2,
    topics: ['subqueries'],
    title: 'Best record, no title',
    prompt:
      'Since 1995, which teams had the most wins in their league that season but did not win the World Series? Show year_id, lg_id, name and w.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Correlated subquery',
        postgres: `select t.year_id, t.lg_id, t.name, t.w
from teams t
where t.year_id >= 1995
  and t.w = (select max(t2.w) from teams t2 where t2.year_id = t.year_id and t2.lg_id = t.lg_id)
  and coalesce(t.ws_win, 'N') <> 'Y'
order by t.year_id, t.lg_id, t.team_id;`,
        mysql: `select t.year_id, t.lg_id, t.name, t.w
from teams t
where t.year_id >= 1995
  and t.w = (select max(t2.w) from teams t2 where t2.year_id = t.year_id and t2.lg_id = t.lg_id)
  and coalesce(t.ws_win, 'N') <> 'Y'
order by t.year_id, t.lg_id, t.team_id;`,
        explanation:
          'For each row, the subquery finds the most wins in the same league and season. ws_win is NULL in years without a World Series, hence the coalesce: NULL <> \'Y\' would not be true.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Scalar subqueries', url: PG + 'sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES' }],
  },
  {
    id: 'lahman-014',
    dataset: 'lahman',
    level: 2,
    topics: ['self-cross-join'],
    title: 'New team names',
    prompt:
      'Since 1950, in which seasons did a franchise play under a different name than the year before? Show year_id, the old name and the new name.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Join the table to itself',
        postgres: `select cur.year_id, prev.name as old_name, cur.name as new_name
from teams cur
join teams prev on prev.franch_id = cur.franch_id and prev.year_id = cur.year_id - 1
where cur.year_id >= 1950 and prev.name <> cur.name
order by cur.year_id, cur.franch_id;`,
        mysql: `select cur.year_id, prev.name as old_name, cur.name as new_name
from teams cur
join teams prev on prev.franch_id = cur.franch_id and prev.year_id = cur.year_id - 1
where cur.year_id >= 1950 and prev.name <> cur.name
order by cur.year_id, cur.franch_id;`,
        explanation: 'Two aliases of the same table: one for the season, one for the season before. franch_id links a team across moves and renames.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Self joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'lahman-015',
    dataset: 'lahman',
    level: 2,
    topics: ['set-operations'],
    title: 'All-Star and Gold Glove in 2025',
    prompt: 'Which players were both in the 2025 All-Star Game and won a Gold Glove in 2025? Show player_id.',
    orderMatters: false,
    solutions: [
      {
        approach: 'INTERSECT',
        postgres: `select player_id from allstar_full where year_id = 2025
intersect
select player_id from awards_players where year_id = 2025 and award_id = 'Gold Glove';`,
        mysql: `select player_id from allstar_full where year_id = 2025
intersect
select player_id from awards_players where year_id = 2025 and award_id = 'Gold Glove';`,
        mysqlNote: 'INTERSECT exists since MySQL 8.0.31.',
        explanation: 'INTERSECT keeps the rows found in both lists and removes duplicates.',
      },
      {
        approach: 'EXISTS',
        postgres: `select distinct a.player_id
from allstar_full a
where a.year_id = 2025
  and exists (select 1 from awards_players w
              where w.player_id = a.player_id and w.year_id = 2025 and w.award_id = 'Gold Glove');`,
        mysql: `select distinct a.player_id
from allstar_full a
where a.year_id = 2025
  and exists (select 1 from awards_players w
              where w.player_id = a.player_id and w.year_id = 2025 and w.award_id = 'Gold Glove');`,
        explanation: 'The same question as a filter: All-Stars for whom a matching award row exists.',
      },
    ],
    comparison: 'Same rows. INTERSECT is the shortest when both sides return the same columns; EXISTS lets you return more columns from one side.',
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'lahman-016',
    dataset: 'lahman',
    level: 2,
    topics: ['full-join'],
    title: 'Who was paid in 2015, 2016 or both',
    prompt:
      'Compare the players with a salary in 2015 and in 2016. Count those paid in both years, only in 2015 and only in 2016, in one row.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN',
        postgres: `select count(*) filter (where a.player_id is not null and b.player_id is not null) as both_years,
       count(*) filter (where b.player_id is null)                               as only_2015,
       count(*) filter (where a.player_id is null)                               as only_2016
from (select distinct player_id from salaries where year_id = 2015) a
full join (select distinct player_id from salaries where year_id = 2016) b
  on b.player_id = a.player_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no FULL JOIN; see solution B.',
        explanation: 'FULL JOIN keeps players from either side; the missing side is NULL, which tells which group a player is in.',
      },
      {
        approach: 'LEFT and RIGHT parts with UNION',
        postgres: `select sum(case when in15 = 1 and in16 = 1 then 1 else 0 end) as both_years,
       sum(case when in16 = 0 then 1 else 0 end)              as only_2015,
       sum(case when in15 = 0 then 1 else 0 end)              as only_2016
from (
  select player_id, max(case when year_id = 2015 then 1 else 0 end) as in15,
                    max(case when year_id = 2016 then 1 else 0 end) as in16
  from salaries
  where year_id in (2015, 2016)
  group by player_id
) per_player;`,
        mysql: `select sum(in15 = 1 and in16 = 1) as both_years,
       sum(in16 = 0)               as only_2015,
       sum(in15 = 0)               as only_2016
from (
  select player_id, max(year_id = 2015) as in15, max(year_id = 2016) as in16
  from salaries
  where year_id in (2015, 2016)
  group by player_id
) per_player;`,
        explanation:
          'Instead of joining, group both years together: one row per player with a 0/1 flag for each year. This works in every database and reads the table once.',
      },
    ],
    comparison:
      'Same counts. FULL JOIN mirrors the question "who is on either side"; the flag version avoids the join and also works in MySQL, where FULL JOIN would need a LEFT JOIN … UNION … RIGHT JOIN.',
    docs: [
      { label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
      { label: 'MySQL: JOIN', url: MY + 'join.html' },
    ],
  },

  // ---------- Level 3 ----------
  {
    id: 'lahman-017',
    dataset: 'lahman',
    level: 3,
    topics: ['ranking', 'cte'],
    title: 'Top 3 home run hitters each season',
    prompt:
      'For each season from 2015 to 2025, show the top 3 home run hitters: year_id, place, player_id and home runs. Players with equal totals share a place, and nobody is skipped after a tie.',
    hint: STINT_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'DENSE_RANK over season totals',
        postgres: `with season as (
  select year_id, player_id, sum(hr) as hr
  from batting
  where year_id between 2015 and 2025
  group by year_id, player_id
)
select year_id, place, player_id, hr
from (
  select year_id, player_id, hr,
         dense_rank() over (partition by year_id order by hr desc) as place
  from season
) ranked
where place <= 3
order by year_id, place, player_id;`,
        mysql: `with season as (
  select year_id, player_id, sum(hr) as hr
  from batting
  where year_id between 2015 and 2025
  group by year_id, player_id
)
select year_id, place, player_id, hr
from (
  select year_id, player_id, hr,
         dense_rank() over (partition by year_id order by hr desc) as place
  from season
) ranked
where place <= 3
order by year_id, place, player_id;`,
        explanation:
          'Sum the stints first, then rank. DENSE_RANK gives 1, 2, 2, 3; RANK would give 1, 2, 2, 4 and drop the next player; ROW_NUMBER would break the tie arbitrarily.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'lahman-018',
    dataset: 'lahman',
    level: 3,
    topics: ['lag-lead'],
    title: 'The biggest turnarounds',
    prompt:
      'Measure a season by w − l. Since 2000, which 10 team seasons improved the most over the same franchise\'s previous season? Show year_id, franch_id, the previous and current w − l and the change. Leave out 2020 and 2021 (the 60-game season distorts both comparisons).',
    hint: SHORT_SEASON_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'LAG over each franchise',
        postgres: `select year_id, franch_id, prev_diff, cur_diff, cur_diff - prev_diff as change
from (
  select year_id, franch_id, w - l as cur_diff,
         lag(w - l) over (partition by franch_id order by year_id) as prev_diff
  from teams
  where year_id >= 1999
) s
where year_id >= 2000 and year_id not in (2020, 2021)
order by change desc, year_id, franch_id
limit 10;`,
        mysql: `select year_id, franch_id, prev_diff, cur_diff, cur_diff - prev_diff as \`change\`
from (
  select year_id, franch_id, w - l as cur_diff,
         lag(w - l) over (partition by franch_id order by year_id) as prev_diff
  from teams
  where year_id >= 1999
) s
where year_id >= 2000 and year_id not in (2020, 2021)
order by \`change\` desc, year_id, franch_id
limit 10;`,
        mysqlNote: 'CHANGE is a reserved word in MySQL, so the alias needs backticks (or another name).',
        explanation:
          'LAG reads the previous row of the same franchise. The inner query starts at 1999 so that 2000 has a previous season; the outer filter is applied after LAG, otherwise the excluded years would disappear before the window looks at them.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'lahman-019',
    dataset: 'lahman',
    level: 3,
    topics: ['window-frames'],
    title: 'A three-season average',
    prompt:
      'For the Los Angeles Dodgers (franch_id LAD) since 2000, show each season\'s wins and the average wins over that season and the two before it, rounded to 1 decimal.',
    hint: SHORT_SEASON_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'ROWS BETWEEN',
        postgres: `select year_id, w,
       round(avg(w) over (order by year_id rows between 2 preceding and current row), 1) as avg_3_seasons
from teams
where franch_id = 'LAD' and year_id >= 2000
order by year_id;`,
        mysql: `select year_id, w,
       round(avg(w) over (order by year_id rows between 2 preceding and current row), 1) as avg_3_seasons
from teams
where franch_id = 'LAD' and year_id >= 2000
order by year_id;`,
        explanation:
          'The frame "2 preceding and current row" makes a moving window of three rows. In 2000 and 2001 it holds fewer rows because the query starts in 2000. The 2020 season pulls the average down for three years.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Window function frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' },
      { label: 'MySQL: Window function frames', url: MY + 'window-functions-frames.html' },
    ],
  },
  {
    id: 'lahman-020',
    dataset: 'lahman',
    level: 3,
    topics: ['gaps-islands'],
    title: 'Longest runs of winning seasons',
    prompt:
      'A winning season has w > l. Since 1960, find the 5 longest runs of consecutive winning seasons by one franchise: franch_id, first year, last year and number of seasons.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Year minus row number',
        postgres: `with winning as (
  select franch_id, year_id,
         year_id - row_number() over (partition by franch_id order by year_id) as grp
  from teams
  where year_id >= 1960 and w > l
)
select franch_id, min(year_id) as first_year, max(year_id) as last_year, count(*) as seasons
from winning
group by franch_id, grp
order by seasons desc, first_year, franch_id
limit 5;`,
        mysql: `with winning as (
  select franch_id, year_id,
         year_id - row_number() over (partition by franch_id order by year_id) as grp
  from teams
  where year_id >= 1960 and w > l
)
select franch_id, min(year_id) as first_year, max(year_id) as last_year, count(*) as seasons
from winning
group by franch_id, grp
order by seasons desc, first_year, franch_id
limit 5;`,
        mysqlNote: 'Works as is. ROW_NUMBER() returns an unsigned integer in MySQL; subtracting it from a year is fine here because the year is always larger.',
        explanation:
          'Keep only the winning seasons and number them per franchise. Within an unbroken run, the year and the row number both go up by 1, so their difference stays the same; a losing season breaks the run and changes the difference. That difference labels each run ("island").',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' }],
  },
  {
    id: 'lahman-021',
    dataset: 'lahman',
    level: 3,
    topics: ['subtotals'],
    title: 'Home runs by league and division',
    prompt:
      'Sum the 2025 team home runs by league and division, with a subtotal per league and a grand total. Label subtotal rows "All divisions" and the total "All leagues".',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(lg_id, 'All leagues')    as league,
       coalesce(div_id, 'All divisions') as division,
       sum(hr)                           as home_runs
from teams
where year_id = 2025
group by rollup (lg_id, div_id)
order by grouping(lg_id), lg_id, grouping(div_id), div_id;`,
        mysql: `select coalesce(lg_id, 'All leagues')    as league,
       coalesce(div_id, 'All divisions') as division,
       sum(hr)                           as home_runs
from teams
where year_id = 2025
group by lg_id, div_id with rollup
order by grouping(lg_id), lg_id, grouping(div_id), div_id;`,
        mysqlNote: 'WITH ROLLUP after the column list; GROUPING() in ORDER BY since MySQL 8.0.12.',
        explanation:
          'ROLLUP adds a row per league with the division rolled up (NULL), and one row with both rolled up. GROUPING() is 1 on those rows, which sorts each subtotal after its details.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: GROUPING SETS, CUBE, ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' },
      { label: 'MySQL: WITH ROLLUP', url: MY + 'group-by-modifiers.html' },
    ],
  },
  {
    id: 'lahman-022',
    dataset: 'lahman',
    level: 3,
    topics: ['ranking', 'aggregates'],
    title: 'Median salary per team',
    prompt: 'For each team in 2016, show the number of paid players and the median salary.',
    hint: 'Salaries end in 2016. With an even number of players the median is the average of the two middle salaries.',
    orderMatters: true,
    solutions: [
      {
        approach: 'percentile_cont',
        postgres: `select team_id, count(*) as players,
       percentile_cont(0.5) within group (order by salary) as median_salary
from salaries
where year_id = 2016
group by team_id
order by team_id;`,
        mysql: null,
        mysqlNote: 'MySQL has no percentile_cont or MEDIAN; see solution B.',
        explanation: 'percentile_cont(0.5) is the median, interpolating between the two middle values when needed. It is an "ordered-set" aggregate: the order goes in WITHIN GROUP.',
      },
      {
        approach: 'Number the rows, take the middle',
        postgres: `select team_id, max(n) as players, avg(salary) as median_salary
from (
  select team_id, salary,
         row_number() over (partition by team_id order by salary) as pos,
         count(*)     over (partition by team_id)                  as n
  from salaries
  where year_id = 2016
) s
where pos in ((n + 1) / 2, (n + 2) / 2)
group by team_id
order by team_id;`,
        mysql: `select team_id, max(n) as players, avg(salary) as median_salary
from (
  select team_id, salary,
         row_number() over (partition by team_id order by salary) as pos,
         count(*)     over (partition by team_id)                  as n
  from salaries
  where year_id = 2016
) s
where pos in ((n + 1) div 2, (n + 2) div 2)
group by team_id
order by team_id;`,
        mysqlNote: 'DIV for integer division: in MySQL (n + 1) / 2 would be 14.5 and match no row.',
        explanation:
          'Sort each team\'s salaries and number them 1…n. The middle positions are (n + 1) / 2 and (n + 2) / 2 with integer division: the same row when n is odd, the two middle rows when n is even. Their average is the median. Numbering from both ends instead looks tempting but breaks on tied salaries, because the two numberings can order the tied rows differently.',
      },
    ],
    comparison: 'Same medians. percentile_cont says what it means; the row-number trick works everywhere and shows how a median is found.',
    docs: [
      { label: 'PostgreSQL: Ordered-set aggregates', url: PG + 'functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE' },
      { label: 'MySQL: ROW_NUMBER', url: MY + 'window-function-descriptions.html#function_row-number' },
    ],
  },
  {
    id: 'lahman-023',
    dataset: 'lahman',
    level: 3,
    topics: ['lateral'],
    title: 'Each team\'s home run leader',
    prompt: 'For every 2025 team, show its name and its top home run hitter on that team (player_id and home runs). Ties: lowest player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 1',
        postgres: `select t.name, top.player_id, top.hr
from teams t
cross join lateral (
  select b.player_id, b.hr
  from batting b
  where b.year_id = t.year_id and b.team_id = t.team_id
  order by b.hr desc, b.player_id
  limit 1
) as top
where t.year_id = 2025
order by t.name;`,
        mysql: `select t.name, top.player_id, top.hr
from teams t
cross join lateral (
  select b.player_id, b.hr
  from batting b
  where b.year_id = t.year_id and b.team_id = t.team_id
  order by b.hr desc, b.player_id
  limit 1
) as top
where t.year_id = 2025
order by t.name;`,
        mysqlNote: 'LATERAL exists since MySQL 8.0.14.',
        explanation: 'The subquery runs once per team and may refer to it. Counting by team, a traded player\'s home runs for his other team do not count here.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'lahman-024',
    dataset: 'lahman',
    level: 3,
    topics: ['distinct', 'ranking'],
    title: 'Highest-paid player of each team',
    prompt: 'For every team in 2016, show its highest-paid player and the salary. Ties: lowest player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'DISTINCT ON',
        postgres: `select distinct on (team_id) team_id, player_id, salary
from salaries
where year_id = 2016
order by team_id, salary desc, player_id;`,
        mysql: null,
        mysqlNote: 'No DISTINCT ON in MySQL; see solution B.',
        explanation: 'DISTINCT ON (team_id) keeps the first row of each team, and ORDER BY decides which row is first.',
      },
      {
        approach: 'ROW_NUMBER',
        postgres: `select team_id, player_id, salary
from (
  select team_id, player_id, salary,
         row_number() over (partition by team_id order by salary desc, player_id) as n
  from salaries
  where year_id = 2016
) ranked
where n = 1
order by team_id;`,
        mysql: `select team_id, player_id, salary
from (
  select team_id, player_id, salary,
         row_number() over (partition by team_id order by salary desc, player_id) as n
  from salaries
  where year_id = 2016
) ranked
where n = 1
order by team_id;`,
        explanation: 'Number each team\'s players from the highest salary down and keep number 1.',
      },
    ],
    comparison: 'Same rows. DISTINCT ON is short and PostgreSQL-only; ROW_NUMBER is portable and extends to "top 3".',
    docs: [{ label: 'PostgreSQL: DISTINCT ON', url: PG + 'sql-select.html#SQL-DISTINCT' }],
  },
  {
    id: 'lahman-025',
    dataset: 'lahman',
    level: 3,
    topics: ['dates-advanced', 'group-by'],
    title: 'Debut day of the week',
    prompt: 'For debuts from 2010 on, count them by day of the week (Monday = 1 … Sunday = 7).',
    orderMatters: true,
    solutions: [
      {
        approach: 'ISO day of week',
        postgres: `select extract(isodow from debut)::int as weekday, count(*) as debuts
from people
where debut >= '2010-01-01'
group by weekday
order by weekday;`,
        mysql: `select weekday(debut) + 1 as weekday, count(*) as debuts
from people
where debut >= '2010-01-01'
group by weekday
order by weekday;`,
        mysqlNote: 'WEEKDAY() counts Monday = 0; DAYOFWEEK() counts Sunday = 1. Neither matches ISO, hence the + 1.',
        explanation: 'isodow numbers Monday 1 to Sunday 7. Plain dow would give Sunday 0. Every database numbers weekdays a little differently, so check before comparing.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: EXTRACT', url: PG + 'functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT' },
      { label: 'MySQL: WEEKDAY', url: MY + 'date-and-time-functions.html#function_weekday' },
    ],
  },

  // ---------- Level 4 ----------
  {
    id: 'lahman-026',
    dataset: 'lahman',
    level: 4,
    topics: ['ddl', 'constraints'],
    title: 'A payroll table',
    prompt:
      'Create a table team_payroll (year_id, team_id, payroll) with the pair (year_id, team_id) as primary key and a foreign key to teams. Fill it with each team\'s total salary for every year in salaries.',
    orderMatters: false,
    checkSql: `select count(*) as rows_loaded, max(payroll) as top_payroll from team_payroll`,
    solutions: [
      {
        approach: 'CREATE TABLE, then INSERT … SELECT',
        postgres: `create table team_payroll (
  year_id smallint     not null,
  team_id varchar(3)   not null,
  payroll bigint       not null,
  primary key (year_id, team_id),
  foreign key (year_id, team_id) references teams (year_id, team_id)
);

insert into team_payroll (year_id, team_id, payroll)
select year_id, team_id, sum(salary)
from salaries
group by year_id, team_id;`,
        mysql: `create table team_payroll (
  year_id smallint     not null,
  team_id char(3)      not null,
  payroll bigint       not null,
  primary key (year_id, team_id),
  foreign key (year_id, team_id) references teams (year_id, team_id)
);

insert into team_payroll (year_id, team_id, payroll)
select year_id, team_id, sum(salary)
from salaries
group by year_id, team_id;`,
        mysqlNote: 'The foreign key columns must have the same type as the referenced ones, so team_id is char(3) as in teams.',
        explanation:
          'A composite primary key: a team appears once per year. The foreign key guarantees every row matches a real team season. bigint leaves room to grow: a sum of salaries gets large fast, and int stops at about 2.1 billion.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE', url: PG + 'sql-createtable.html' },
      { label: 'MySQL: FOREIGN KEY constraints', url: MY + 'create-table-foreign-keys.html' },
    ],
  },
  {
    id: 'lahman-027',
    dataset: 'lahman',
    level: 4,
    topics: ['upsert'],
    title: 'Insert or update a player',
    prompt:
      'Add a player row with player_id \'newguy01\', name Pat Rookie, or, if it already exists, just update the name. Then run the same statement again with the first name Patrick: the second run must update, not fail.',
    orderMatters: false,
    checkSql: `select player_id, name_first, name_last from people where player_id = 'newguy01'`,
    solutions: [
      {
        approach: 'ON CONFLICT / ON DUPLICATE KEY',
        postgres: `insert into people (player_id, name_first, name_last) values ('newguy01', 'Pat', 'Rookie')
on conflict (player_id) do update set name_first = excluded.name_first, name_last = excluded.name_last;

insert into people (player_id, name_first, name_last) values ('newguy01', 'Patrick', 'Rookie')
on conflict (player_id) do update set name_first = excluded.name_first, name_last = excluded.name_last;`,
        mysql: `insert into people (player_id, name_first, name_last) values ('newguy01', 'Pat', 'Rookie') as new
on duplicate key update name_first = new.name_first, name_last = new.name_last;

insert into people (player_id, name_first, name_last) values ('newguy01', 'Patrick', 'Rookie') as new
on duplicate key update name_first = new.name_first, name_last = new.name_last;`,
        mysqlNote: 'MySQL 8.0.19+ names the incoming row with AS new; the older VALUES(name_first) form is deprecated.',
        explanation:
          'The first statement inserts; the second hits the primary key and turns into an update. excluded is the row that was about to be inserted.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: INSERT … ON CONFLICT', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
  {
    id: 'lahman-028',
    dataset: 'lahman',
    level: 4,
    topics: ['materialized-views'],
    title: 'Stored season totals',
    prompt:
      'Season totals across stints are needed all the time. Store them: create batting_season (player_id, year_id, g, ab, h, hr) holding one row per player and season, refreshable later.',
    hint: STINT_NOTE,
    orderMatters: false,
    checkSql: `select count(*) as player_seasons, max(hr) as most_hr from batting_season`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view batting_season as
select player_id, year_id, sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id, year_id;

-- later, after new data arrives:
refresh materialized view batting_season;`,
        mysql: `create table batting_season as
select player_id, year_id, sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id, year_id;

-- later: truncate table batting_season; insert into batting_season select …;`,
        mysqlNote: 'MySQL has no materialized views. A table filled by CREATE TABLE … AS SELECT plays the same role; refreshing means emptying and reloading it yourself.',
        explanation:
          'A view runs its query every time; a materialized view stores the result once, so reading it is fast. The price: it is only as fresh as its last REFRESH.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' },
      { label: 'MySQL: CREATE TABLE … SELECT', url: MY + 'create-table-select.html' },
    ],
  },
  {
    id: 'lahman-029',
    dataset: 'lahman',
    level: 4,
    topics: ['temp-tables'],
    title: 'Qualified hitters, step by step',
    prompt:
      'A hitter "qualifies" for the batting title with at least 502 at-bats here. Put the 2025 qualified hitters (player_id, ab, h, season totals) into a temporary table qualified.',
    hint: STINT_NOTE,
    orderMatters: false,
    checkSql: `select count(*) as qualified_hitters, max(h) as most_hits from qualified`,
    solutions: [
      {
        approach: 'CREATE TEMP TABLE … AS',
        postgres: `create temp table qualified as
select player_id, sum(ab) as ab, sum(h) as h
from batting
where year_id = 2025
group by player_id
having sum(ab) >= 502;`,
        mysql: `create temporary table qualified as
select player_id, sum(ab) as ab, sum(h) as h
from batting
where year_id = 2025
group by player_id
having sum(ab) >= 502;`,
        mysqlNote: 'CREATE TEMPORARY TABLE. A MySQL temporary table cannot be referenced twice in the same query (for example in a self-join).',
        explanation:
          'A temporary table lives until the session ends and is visible only to this session. Handy to break a long analysis into steps you can inspect one by one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' },
      { label: 'MySQL: Temporary tables', url: MY + 'create-temporary-table.html' },
    ],
  },

  // ---------- Level 5 ----------
  {
    id: 'lahman-030',
    dataset: 'lahman',
    level: 5,
    topics: ['functions', 'numbers'],
    title: 'A batting average function',
    prompt: 'Write a function batting_avg(p_hits, p_at_bats) returning hits / at-bats rounded to 3 decimals, or NULL when there are no at-bats.',
    orderMatters: false,
    checkSql: `select batting_avg(200, 600) as a, batting_avg(0, 0) as b, batting_avg(1, 3) as c`,
    solutions: [
      {
        approach: 'Immutable SQL function',
        postgres: `create function batting_avg(p_hits integer, p_at_bats integer)
returns numeric
language sql
immutable
as $$
  select round(p_hits::numeric / nullif(p_at_bats, 0), 3);
$$;`,
        mysql: `create function batting_avg(p_hits int, p_at_bats int)
returns decimal(4,3)
deterministic
begin
  return round(p_hits / nullif(p_at_bats, 0), 3);
end;`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'nullif(x, 0) turns 0 into NULL, and dividing by NULL gives NULL instead of a division-by-zero error. IMMUTABLE (DETERMINISTIC in MySQL) promises the same inputs always give the same output, so it can be used in indexes.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Function volatility', url: PG + 'xfunc-volatility.html' },
      { label: 'MySQL: CREATE FUNCTION', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'lahman-031',
    dataset: 'lahman',
    level: 5,
    topics: ['indexes'],
    title: 'An index for season leaderboards',
    prompt:
      'Leaderboards ask "top home run hitters of year X" all the time. Create an index on batting that lets the database find one season\'s rows already sorted by home runs.',
    orderMatters: false,
    checkSql: `select count(*) as indexes from pg_indexes where tablename = 'batting' and indexdef like '%year_id%' and indexdef like '%hr%'`,
    checkSqlMysql: `select count(distinct index_name) as indexes
from information_schema.statistics s
where table_schema = database() and table_name = 'batting' and column_name = 'hr'
  and exists (select 1 from information_schema.statistics s2
              where s2.table_schema = s.table_schema and s2.table_name = s.table_name
                and s2.index_name = s.index_name and s2.column_name = 'year_id')`,
    solutions: [
      {
        approach: 'Composite index, equality column first',
        postgres: `create index batting_year_hr_idx on batting (year_id, hr desc);

-- serves: select player_id, hr from batting where year_id = 2025 order by hr desc limit 10;`,
        mysql: `create index batting_year_hr_idx on batting (year_id, hr desc);`,
        mysqlNote: 'Descending index parts are honoured since MySQL 8.0; earlier versions parsed DESC and ignored it.',
        explanation:
          'The column compared with = goes first, the sort column second. Within one year the index is already in home-run order, so "top 10" reads ten entries and stops instead of sorting the whole season.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Indexes and ORDER BY', url: PG + 'indexes-ordering.html' },
      { label: 'MySQL: Descending indexes', url: MY + 'descending-indexes.html' },
    ],
  },
  {
    id: 'lahman-032',
    dataset: 'lahman',
    level: 3,
    topics: ['ranking'],
    title: 'Payroll percentiles',
    prompt:
      'For 2016, show each team\'s total payroll and its percentile rank among all teams (0 = lowest, 1 = highest), rounded to 2 decimals, highest payroll first.',
    hint: 'Salaries end in 2016.',
    orderMatters: true,
    solutions: [
      {
        approach: 'PERCENT_RANK',
        postgres: `select team_id, sum(salary) as payroll,
       round(percent_rank() over (order by sum(salary))::numeric, 2) as pct_rank
from salaries
where year_id = 2016
group by team_id
order by payroll desc, team_id;`,
        mysql: `select team_id, sum(salary) as payroll,
       round(percent_rank() over (order by sum(salary)), 2) as pct_rank
from salaries
where year_id = 2016
group by team_id
order by payroll desc, team_id;`,
        mysqlNote: 'PERCENT_RANK returns a DOUBLE in both; PostgreSQL\'s two-argument round() needs numeric, hence the cast there.',
        explanation:
          'percent_rank = (rank − 1) / (rows − 1): the lowest payroll gets 0 and the highest 1. cume_dist would instead give the share of teams at or below this one.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: percent_rank', url: PG + 'functions-window.html' },
      { label: 'MySQL: PERCENT_RANK', url: MY + 'window-function-descriptions.html#function_percent-rank' },
    ],
  },
  {
    id: 'lahman-033',
    dataset: 'lahman',
    level: 1,
    topics: ['conditions'],
    title: 'Good, average and bad seasons',
    prompt:
      'Classify the 2025 teams: "contender" with at least 90 wins, "rebuilding" with fewer than 70, otherwise "middle". Show name, w and the label, most wins first.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Searched CASE',
        postgres: `select name, w,
       case when w >= 90 then 'contender'
            when w < 70  then 'rebuilding'
            else 'middle' end as label
from teams
where year_id = 2025
order by w desc, name;`,
        mysql: `select name, w,
       case when w >= 90 then 'contender'
            when w < 70  then 'rebuilding'
            else 'middle' end as label
from teams
where year_id = 2025
order by w desc, name;`,
        explanation: 'CASE checks its WHEN conditions top to bottom and returns the first match; ELSE covers everything else.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CASE', url: PG + 'functions-conditional.html#FUNCTIONS-CASE' }],
  },
  {
    id: 'lahman-034',
    dataset: 'lahman',
    level: 3,
    topics: ['gaps-islands', 'cte'],
    title: 'All-Star streaks',
    prompt:
      'Find players selected for at least 5 All-Star Games in a row (2010 on). There was no game in 2020, so 2019 and 2021 count as consecutive games. Show player_id, first and last year and the number of games.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Number the games, then the player\'s games',
        postgres: `with games as (
  select year_id, row_number() over (order by year_id) as game_no
  from (select distinct year_id from allstar_full) y
),
picks as (
  select distinct a.player_id, a.year_id, g.game_no
  from allstar_full a
  join games g on g.year_id = a.year_id
),
runs as (
  select player_id, year_id,
         game_no - row_number() over (partition by player_id order by game_no) as grp
  from picks
)
select player_id, min(year_id) as first_year, max(year_id) as last_year, count(*) as games
from runs
group by player_id, grp
having count(*) >= 5
order by games desc, first_year, player_id;`,
        mysql: `with games as (
  select year_id, row_number() over (order by year_id) as game_no
  from (select distinct year_id from allstar_full) y
),
picks as (
  select distinct a.player_id, a.year_id, g.game_no
  from allstar_full a
  join games g on g.year_id = a.year_id
),
runs as (
  select player_id, year_id,
         game_no - row_number() over (partition by player_id order by game_no) as grp
  from picks
)
select player_id, min(year_id) as first_year, max(year_id) as last_year, count(*) as games
from runs
group by player_id, grp
having count(*) >= 5
order by games desc, first_year, player_id;`,
        mysqlNote: 'Both numbers are unsigned in MySQL; game_no is never smaller than the player\'s own row number, so the subtraction cannot go below zero.',
        explanation:
          'The classic islands trick, applied to game numbers instead of years: numbering the games that took place makes 2021 follow 2019 directly. Using year − row_number would break every streak at 2020.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'lahman-035',
    dataset: 'lahman',
    level: 5,
    topics: ['partitioning'],
    title: 'Batting split by era',
    prompt:
      'Create batting_by_era with the same columns and primary key as batting, range-partitioned by year_id into 2010–2014, 2015–2019 and 2020 onwards, and copy all batting rows into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'batting_by_era'::regclass) as partitions,
       (select count(*) from batting_by_era) as total_rows,
       (select count(*) from batting_by_era where year_id >= 2020) as since_2020`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'batting_by_era') as partitions,
       (select count(*) from batting_by_era) as total_rows,
       (select count(*) from batting_by_era where year_id >= 2020) as since_2020`,
    solutions: [
      {
        approach: 'Range partitions on an integer',
        postgres: `create table batting_by_era (like batting, primary key (player_id, year_id, stint))
partition by range (year_id);

create table batting_2010s_early partition of batting_by_era for values from (2010) to (2015);
create table batting_2010s_late  partition of batting_by_era for values from (2015) to (2020);
create table batting_2020s       partition of batting_by_era for values from (2020) to (maxvalue);

insert into batting_by_era select * from batting;`,
        mysql: `create table batting_by_era like batting;

alter table batting_by_era
partition by range (year_id) (
  partition p2010 values less than (2015),
  partition p2015 values less than (2020),
  partition p2020 values less than maxvalue
);

insert into batting_by_era select * from batting;`,
        mysqlNote: 'CREATE TABLE … LIKE copies the columns and indexes (not foreign keys, which partitioned InnoDB tables cannot have anyway); ALTER TABLE then adds the partitions.',
        explanation:
          'FROM is inclusive and TO exclusive, so 2015 lands in the second partition. LIKE copies the column definitions; the primary key is restated because it must include the partition key, which year_id is.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE partitioning', url: MY + 'partitioning-range.html' },
    ],
  },
  {
    id: 'lahman-036',
    dataset: 'lahman',
    level: 4,
    topics: ['merge'],
    title: 'Refresh a leaderboard in one statement',
    prompt:
      'Create hr_leaders (player_id, hr) and fill it with the 2024 top 10 home run hitters (ties by player_id). Then turn it into the 2025 top 10: update players still in it, add newcomers, remove those who dropped out.',
    hint: 'Sum the stints: a traded player has one batting row per team.',
    orderMatters: true,
    checkSql: `select player_id, hr from hr_leaders order by hr desc, player_id`,
    solutions: [
      {
        approach: 'MERGE … WHEN NOT MATCHED BY SOURCE',
        postgres: `create table hr_leaders (player_id varchar(9) primary key, hr smallint not null);

insert into hr_leaders
select player_id, sum(hr) from batting where year_id = 2024
group by player_id order by sum(hr) desc, player_id limit 10;

merge into hr_leaders l
using (select player_id, sum(hr) as hr from batting where year_id = 2025
       group by player_id order by sum(hr) desc, player_id limit 10) s
on s.player_id = l.player_id
when matched then update set hr = s.hr
when not matched then insert (player_id, hr) values (s.player_id, s.hr)
when not matched by source then delete;`,
        mysql: null,
        mysqlNote: 'MySQL has no MERGE; see solution B.',
        explanation:
          'One statement handles all three cases. WHEN NOT MATCHED BY SOURCE (PostgreSQL 17+) catches target rows that the new list no longer contains, so the table ends up exactly equal to the new top 10.',
      },
      {
        approach: 'DELETE, then upsert',
        postgres: `create table hr_leaders (player_id varchar(9) primary key, hr smallint not null);

insert into hr_leaders
select player_id, sum(hr) from batting where year_id = 2024
group by player_id order by sum(hr) desc, player_id limit 10;

create temp table new_top as
select player_id, sum(hr) as hr from batting where year_id = 2025
group by player_id order by sum(hr) desc, player_id limit 10;

delete from hr_leaders where player_id not in (select player_id from new_top);
insert into hr_leaders select * from new_top
on conflict (player_id) do update set hr = excluded.hr;`,
        mysql: `create table hr_leaders (player_id varchar(9) primary key, hr smallint not null);

insert into hr_leaders
select player_id, sum(hr) from batting where year_id = 2024
group by player_id order by sum(hr) desc, player_id limit 10;

create temporary table new_top as
select player_id, sum(hr) as hr from batting where year_id = 2025
group by player_id order by sum(hr) desc, player_id limit 10;

delete from hr_leaders where player_id not in (select player_id from new_top);
insert into hr_leaders select * from (select player_id, hr from new_top) as new
on duplicate key update hr = new.hr;`,
        explanation: 'Remove those who dropped out, then insert or update the rest. Two statements, so wrap them in a transaction in real code.',
      },
    ],
    comparison:
      'Same final table. MERGE keeps the whole sync in one atomic statement; the two-step version works everywhere and is easy to reason about.',
    docs: [
      { label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' },
      { label: 'MySQL: INSERT … ON DUPLICATE KEY UPDATE', url: MY + 'insert-on-duplicate.html' },
    ],
  },
]
