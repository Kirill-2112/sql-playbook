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
  {
    id: 'lahman-037',
    dataset: 'lahman',
    level: 5,
    topics: ['procedures'],
    title: 'A procedure with output parameters',
    prompt:
      'Write a procedure team_record(p_team_id, p_year, wins, losses) that returns a team\'s wins and losses for a season through output parameters, and call it for the 2025 Yankees (NYA).',
    orderMatters: false,
    checkSql: `call team_record('NYA', 2025, null, null)`,
    checkSqlMysql: `call team_record('NYA', 2025, @w, @l);
select @w as wins, @l as losses`,
    solutions: [
      {
        approach: 'INOUT / OUT parameters',
        postgres: `create procedure team_record(p_team_id text, p_year int, inout wins int, inout losses int)
language plpgsql
as $$
begin
  select t.w, t.l into wins, losses
  from teams t
  where t.team_id = p_team_id and t.year_id = p_year;
end;
$$;`,
        mysql: `create procedure team_record(in p_team_id char(3), in p_year int, out wins int, out losses int)
begin
  select w, l into wins, losses
  from teams
  where team_id = p_team_id and year_id = p_year;
end;`,
        mysqlNote:
          'MySQL passes session variables for OUT parameters (CALL team_record(\'NYA\', 2025, @w, @l)) and reads them with a separate SELECT @w, @l. In the mysql client, wrap the CREATE in DELIMITER $$ … $$.',
        explanation:
          'A procedure has no return value, but it can hand values back through parameters. In PostgreSQL CALL returns the output parameters as one result row; you pass NULL as a placeholder for each of them.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CALL', url: PG + 'sql-call.html' },
      { label: 'MySQL: CREATE PROCEDURE (IN, OUT, INOUT)', url: MY + 'create-procedure.html' },
    ],
  },
  {
    id: 'lahman-038',
    dataset: 'lahman',
    level: 4,
    topics: ['json', 'ddl'],
    title: 'Query JSON documents',
    prompt:
      'Store each player who debuted in 2025 as a JSON document in player_docs (player_id, doc), where doc looks like {"name": "First Last", "birth": {"year": 2001, "country": "Japan"}}. Then the check reads the Japanese-born players out of the documents.',
    orderMatters: true,
    checkSql: `select player_id, doc->>'name' as name, (doc->'birth'->>'year')::int as born
from player_docs
where doc->'birth'->>'country' = 'Japan'
order by player_id`,
    checkSqlMysql: `select player_id, doc->>'$.name' as name, cast(doc->>'$.birth.year' as unsigned) as born
from player_docs
where doc->>'$.birth.country' = 'Japan'
order by player_id`,
    solutions: [
      {
        approach: 'jsonb column / JSON column',
        postgres: `create table player_docs (player_id varchar(9) primary key, doc jsonb not null);

insert into player_docs
select player_id,
       jsonb_build_object('name', name_first || ' ' || name_last,
                          'birth', jsonb_build_object('year', birth_year, 'country', birth_country))
from people
where debut >= '2025-01-01' and debut < '2026-01-01';`,
        mysql: `create table player_docs (player_id varchar(9) primary key, doc json not null);

insert into player_docs
select player_id,
       json_object('name', concat(name_first, ' ', name_last),
                   'birth', json_object('year', birth_year, 'country', birth_country))
from people
where debut >= '2025-01-01' and debut < '2026-01-01';`,
        mysqlNote:
          'MySQL reads JSON with a path string: doc->>\'$.birth.country\' ($ is the document root). PostgreSQL chains operators instead: doc->\'birth\'->>\'country\'.',
        explanation:
          '-> returns JSON (to keep walking into it); ->> returns text at the last step. Values come out as text, so a number needs a cast. jsonb stores a parsed binary form: faster to query and indexable with GIN.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: JSON operators', url: PG + 'functions-json.html' },
      { label: 'MySQL: JSON path syntax', url: MY + 'json.html#json-path-syntax' },
    ],
  },
  {
    id: 'lahman-039',
    dataset: 'lahman',
    level: 4,
    topics: ['generated-columns', 'numbers'],
    title: 'Batting average as a column',
    prompt: 'Add a stored generated column batting_avg to batting: h / ab rounded to 3 decimals, NULL when ab is 0.',
    orderMatters: true,
    checkSql: `select year_id, h, ab, batting_avg from batting where player_id = 'judgeaa01' order by year_id, stint`,
    solutions: [
      {
        approach: 'Generated column with NULLIF',
        postgres: `alter table batting
add column batting_avg numeric(4, 3)
generated always as (round(h::numeric / nullif(ab, 0), 3)) stored;`,
        mysql: `alter table batting
add column batting_avg decimal(4, 3)
generated always as (round(h / nullif(ab, 0), 3)) stored;`,
        mysqlNote: 'MySQL\'s / is already decimal division, so no cast.',
        explanation:
          'nullif(ab, 0) turns 0 at-bats into NULL, and anything divided by NULL is NULL, so pitchers who never batted get NULL instead of a division error. The ::numeric cast avoids integer division in PostgreSQL.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: NULLIF', url: PG + 'functions-conditional.html#FUNCTIONS-NULLIF' },
      { label: 'MySQL: NULLIF', url: MY + 'flow-control-functions.html#function_nullif' },
    ],
  },
  {
    id: 'lahman-040',
    dataset: 'lahman',
    level: 1,
    topics: ['select-basics', 'null'],
    title: 'Throwing with both hands',
    prompt: 'throws is R, L, or B for a player who throws with both hands. List those players: player_id, name_first, name_last and debut.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Simple filter',
        postgres: `select player_id, name_first, name_last, debut
from people
where throws = 'B'
order by debut;`,
        mysql: `select player_id, name_first, name_last, debut
from people
where throws = 'B'
order by debut;`,
        explanation:
          'Ambidextrous pitchers are rare: one from 1881 and one who debuted in 2025. A NULL throws (unknown) is not = \'B\' and not <> \'B\' either, so unknown values never sneak into such a list.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WHERE', url: PG + 'queries-table-expressions.html#QUERIES-WHERE' }],
  },
  {
    id: 'lahman-041',
    dataset: 'lahman',
    level: 1,
    topics: ['limit', 'aggregates'],
    title: 'Places 11 to 20',
    prompt:
      'Rank the single-season home run totals since 2010 (sum of stints) and show places 11 to 20: player_id, year_id and home runs. Ties: by year, then player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LIMIT … OFFSET',
        postgres: `select player_id, year_id, sum(hr) as hr
from batting
group by player_id, year_id
order by hr desc, year_id, player_id
limit 10 offset 10;`,
        mysql: `select player_id, year_id, sum(hr) as hr
from batting
group by player_id, year_id
order by hr desc, year_id, player_id
limit 10 offset 10;`,
        explanation: 'OFFSET 10 skips the first ten rows of the sorted result; LIMIT 10 keeps the next ten. Without a complete ORDER BY, which rows count as "the first ten" would be arbitrary.',
      },
      {
        approach: 'FETCH / OFFSET (standard SQL)',
        postgres: `select player_id, year_id, sum(hr) as hr
from batting
group by player_id, year_id
order by hr desc, year_id, player_id
offset 10 rows fetch next 10 rows only;`,
        mysql: null,
        mysqlNote: 'MySQL supports only LIMIT … OFFSET.',
        explanation: 'The SQL-standard spelling of the same thing, also understood by Oracle and SQL Server.',
      },
    ],
    comparison: 'Same rows. LIMIT is shorter and works in PostgreSQL, MySQL and SQLite; FETCH is the standard form.',
    docs: [
      { label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' },
      { label: 'MySQL: LIMIT', url: MY + 'select.html' },
    ],
  },
  {
    id: 'lahman-042',
    dataset: 'lahman',
    level: 1,
    topics: ['text-search'],
    title: 'Long given names',
    prompt: 'Which players who debuted in 2024 or later have a given name (name_given) of three or more words? Show player_id and name_given.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Two spaces in the pattern',
        postgres: `select player_id, name_given
from people
where debut >= '2024-01-01' and name_given like '% % %'
order by player_id;`,
        mysql: `select player_id, name_given
from people
where debut >= '2024-01-01' and name_given like '% % %'
order by player_id;`,
        explanation: '% matches any text, even an empty one, so \'% % %\' needs at least two spaces somewhere: three or more words.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIKE', url: PG + 'functions-matching.html#FUNCTIONS-LIKE' }],
  },
  {
    id: 'lahman-043',
    dataset: 'lahman',
    level: 2,
    topics: ['set-operations', 'subqueries'],
    title: 'Two-way players',
    prompt: 'Who both batted (at least 50 at-bats) and pitched (at least 10 games) in 2025? Show player_id.',
    hint: 'Sum the stints of each player before applying the limits.',
    orderMatters: false,
    solutions: [
      {
        approach: 'INTERSECT',
        postgres: `select player_id from batting where year_id = 2025 group by player_id having sum(ab) >= 50
intersect
select player_id from pitching where year_id = 2025 group by player_id having sum(g) >= 10;`,
        mysql: `select player_id from batting where year_id = 2025 group by player_id having sum(ab) >= 50
intersect
select player_id from pitching where year_id = 2025 group by player_id having sum(g) >= 10;`,
        mysqlNote: 'INTERSECT exists since MySQL 8.0.31.',
        explanation: 'Each half is a list of qualifying players; INTERSECT keeps those on both lists. Since 2022 pitchers no longer bat in either league, so this is a short list.',
      },
    ],
    docs: [{ label: 'PostgreSQL: INTERSECT', url: PG + 'queries-union.html' }],
  },
  {
    id: 'lahman-044',
    dataset: 'lahman',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Division ties',
    prompt: 'Since 2010, find pairs of teams in the same league and division that finished with exactly the same number of wins: year_id, the two team_ids (smaller first) and the wins.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Self join on year, league, division and wins',
        postgres: `select a.year_id, a.team_id as team_1, b.team_id as team_2, a.w
from teams a
join teams b on b.year_id = a.year_id and b.lg_id = a.lg_id and b.div_id = a.div_id
            and b.w = a.w and b.team_id > a.team_id
where a.year_id >= 2010
order by a.year_id, a.lg_id, a.div_id, team_1;`,
        mysql: `select a.year_id, a.team_id as team_1, b.team_id as team_2, a.w
from teams a
join teams b on b.year_id = a.year_id and b.lg_id = a.lg_id and b.div_id = a.div_id
            and b.w = a.w and b.team_id > a.team_id
where a.year_id >= 2010
order by a.year_id, a.lg_id, a.div_id, team_1;`,
        explanation: 'All the matching conditions go into the join. b.team_id > a.team_id removes the pairing of a team with itself and keeps each pair once.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'lahman-045',
    dataset: 'lahman',
    level: 4,
    topics: ['normalization', 'joins'],
    title: 'A column you could derive',
    prompt:
      'salaries stores lg_id, but the league of a team in a given year is already in teams. Check this redundancy: count salary rows whose lg_id differs from the league of (year_id, team_id) in teams.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Join and compare',
        postgres: `select count(*) as rows_checked,
       count(*) filter (where s.lg_id <> t.lg_id) as mismatches
from salaries s
join teams t on t.year_id = s.year_id and t.team_id = s.team_id;`,
        mysql: `select count(*) as rows_checked,
       sum(s.lg_id <> t.lg_id) as mismatches
from salaries s
join teams t on t.year_id = s.year_id and t.team_id = s.team_id;`,
        explanation:
          'lg_id depends on (year_id, team_id), not on the whole key of a salary row: in normalization terms a transitive dependency, a 3NF violation. Here it is consistent, but nothing guarantees it; a stored copy can drift, a join cannot.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joins', url: PG + 'tutorial-join.html' }],
  },
  {
    id: 'lahman-046',
    dataset: 'lahman',
    level: 5,
    topics: ['query-plans', 'subqueries'],
    title: 'Season leaders, two ways',
    prompt: 'For each season from 2010, the team with the most wins (all of them if tied): year_id, team_id and w.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Correlated MAX',
        postgres: `select t.year_id, t.team_id, t.w
from teams t
where t.year_id >= 2010
  and t.w = (select max(t2.w) from teams t2 where t2.year_id = t.year_id)
order by t.year_id, t.team_id;`,
        mysql: `select t.year_id, t.team_id, t.w
from teams t
where t.year_id >= 2010
  and t.w = (select max(t2.w) from teams t2 where t2.year_id = t.year_id)
order by t.year_id, t.team_id;`,
        explanation: 'The subquery is correlated: conceptually it runs once per team row to find that season\'s best record. An index on (year_id, w) would turn each run into a single index probe.',
      },
      {
        approach: 'Window MAX',
        postgres: `select year_id, team_id, w
from (select year_id, team_id, w, max(w) over (partition by year_id) as best
      from teams where year_id >= 2010) t
where w = best
order by year_id, team_id;`,
        mysql: `select year_id, team_id, w
from (select year_id, team_id, w, max(w) over (partition by year_id) as best
      from teams where year_id >= 2010) t
where w = best
order by year_id, team_id;`,
        explanation: 'One pass: the window attaches each season\'s maximum to every row of that season.',
      },
    ],
    comparison: 'Same rows. With 3,000 teams both are instant; check the measured timings, and remember that what is faster depends on table size and indexes.',
    docs: [
      { label: 'PostgreSQL: Using EXPLAIN', url: PG + 'using-explain.html' },
      { label: 'PostgreSQL: Window functions', url: PG + 'tutorial-window.html' },
    ],
  },
  {
    id: 'lahman-047',
    dataset: 'lahman',
    level: 4,
    topics: ['views', 'aggregates'],
    title: 'A career totals view',
    prompt: 'Create a view career_batting (player_id, seasons, g, ab, h, hr) with each player\'s totals over the seasons in the data.',
    orderMatters: true,
    checkSql: `select player_id, seasons, hr from career_batting order by hr desc, player_id limit 5`,
    solutions: [
      {
        approach: 'Aggregating view',
        postgres: `create view career_batting as
select player_id, count(distinct year_id) as seasons,
       sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id;`,
        mysql: `create view career_batting as
select player_id, count(distinct year_id) as seasons,
       sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id;`,
        explanation: 'count(distinct year_id), not count(*): a traded player has two rows (stints) for one season. "Career" means since 2010 here, as the player tables start then.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'lahman-048',
    dataset: 'lahman',
    level: 1,
    topics: ['text-search', 'strings'],
    title: 'Martinez, with or without the accent',
    prompt: 'Find every player whose last name is Martinez, whether written with an accent (Martínez) or without: player_id, name_first, name_last.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Remove the accent before comparing',
        postgres: `select player_id, name_first, name_last
from people
where translate(name_last, 'áéíóúñ', 'aeioun') = 'Martinez'
order by player_id;`,
        mysql: `select player_id, name_first, name_last
from people
where name_last = 'Martinez'
order by player_id;`,
        mysqlNote:
          'The column collation utf8mb4_0900_ai_ci is accent-insensitive (ai) and case-insensitive (ci): \'Martinez\' already equals \'Martínez\'. To compare exactly, use COLLATE utf8mb4_0900_as_cs or BINARY.',
        explanation:
          'PostgreSQL compares text exactly here, so \'Martínez\' <> \'Martinez\'. translate() replaces each listed character by the one at the same position, removing the accents for the comparison. The unaccent extension does this for all letters, where it is installed.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: translate', url: PG + 'functions-string.html' },
      { label: 'MySQL: Unicode collations (ai/ci)', url: MY + 'charset-unicode-sets.html' },
    ],
  },
  {
    id: 'lahman-049',
    dataset: 'lahman',
    level: 5,
    topics: ['locks-isolation', 'ddl'],
    title: 'Optimistic locking with a version number',
    prompt:
      'Two editors may fix the same team record. Add a row_version column (default 0) to teams. Then save an edit to the 2025 NYA row only if nobody changed it since you read version 0, increasing the version.',
    orderMatters: false,
    checkSql: `select team_id, w, row_version from teams where year_id = 2025 and team_id = 'NYA'`,
    solutions: [
      {
        approach: 'Version check in the UPDATE',
        postgres: `alter table teams add column row_version integer not null default 0;

update teams
set w = w, row_version = row_version + 1
where year_id = 2025 and team_id = 'NYA' and row_version = 0;`,
        mysql: `alter table teams add column row_version int not null default 0;

update teams
set w = w, row_version = row_version + 1
where year_id = 2025 and team_id = 'NYA' and row_version = 0;`,
        explanation:
          'No lock is held while the editor thinks. When saving, the WHERE requires the version they read; if someone saved first the version is 1, the update matches 0 rows, and the application tells the editor to reload. Cheap when conflicts are rare.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: UPDATE', url: PG + 'sql-update.html' },
      { label: 'MySQL: UPDATE', url: MY + 'update.html' },
    ],
  },
  {
    id: 'lahman-050',
    dataset: 'lahman',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for closers',
    prompt: 'Saves leaderboards only look at pitching rows with at least one save (about a fifth of them). Create an index for "most saves in year X".',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'pitching' and indexdef like '%sv%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'pitching' and column_name = 'sv'`,
    solutions: [
      {
        approach: 'Partial index',
        postgres: `create index pitching_saves_idx on pitching (year_id, sv desc) where sv > 0;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: '2,782 of 13,610 rows have a save; the rest never appear on a saves leaderboard and stay out of the index.',
      },
      {
        approach: 'Composite index',
        postgres: `create index pitching_year_sv_idx on pitching (year_id, sv desc);`,
        mysql: `create index pitching_year_sv_idx on pitching (year_id, sv desc);`,
        explanation: 'Covers every row; "year X, highest saves first" reads straight from the index.',
      },
    ],
    comparison: 'Both serve the leaderboard. The partial one is a fifth of the size; the composite one also answers "pitchers with 0 saves".',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'lahman-051',
    dataset: 'lahman',
    level: 5,
    topics: ['triggers', 'strings'],
    title: 'Clean names on the way in',
    prompt: 'Create a trigger that trims spaces around name_first and name_last whenever a people row is inserted. Test it by inserting player \'testpl01\' named "  Pat " "  Rookie  ".',
    orderMatters: false,
    checkSql: `insert into people (player_id, name_first, name_last) values ('testpl01', '  Pat ', '  Rookie  ');
select player_id, name_first, name_last, length(name_last) as last_len from people where player_id = 'testpl01'`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger that edits NEW',
        postgres: `create function trim_names() returns trigger
language plpgsql
as $$
begin
  new.name_first := trim(new.name_first);
  new.name_last  := trim(new.name_last);
  return new;
end;
$$;

create trigger people_trim_names
before insert on people
for each row execute function trim_names();`,
        mysql: `create trigger people_trim_names
before insert on people
for each row
begin
  set new.name_first = trim(new.name_first);
  set new.name_last  = trim(new.name_last);
end;`,
        mysqlNote: `In the mysql client, wrap it in DELIMITER $$ … $$.`,
        explanation: 'A BEFORE trigger can change NEW before the row is written, so the stored names are clean whatever the application sent. AFTER triggers see the row already written and cannot change it.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' },
      { label: 'MySQL: Trigger syntax', url: MY + 'trigger-syntax.html' },
    ],
  },
  {
    id: 'lahman-052',
    dataset: 'lahman',
    level: 4,
    topics: ['arrays'],
    title: 'Seasons as an array',
    prompt: 'For the 5 players with the most distinct teams since 2010, show player_id, the array of distinct teams (alphabetical) and its length.',
    orderMatters: true,
    solutions: [
      {
        approach: 'array_agg(DISTINCT) + cardinality',
        postgres: `select player_id,
       array_agg(distinct team_id order by team_id) as teams,
       cardinality(array_agg(distinct team_id)) as n
from batting
group by player_id
order by n desc, player_id
limit 5;`,
        mysql: `select player_id,
       cast(concat('["', group_concat(distinct team_id order by team_id separator '", "'), '"]') as json) as teams,
       count(distinct team_id) as n
from batting
group by player_id
order by n desc, player_id
limit 5;`,
        mysqlNote: 'A JSON array built with GROUP_CONCAT stands in for the array.',
        explanation: 'Journeymen: these players changed teams most often. An array keeps the list in one cell, handy for display or for @> tests ("played for both NYA and BOS").',
      },
    ],
    docs: [{ label: 'PostgreSQL: Arrays', url: PG + 'arrays.html' }],
  },
  {
    id: 'lahman-053',
    dataset: 'lahman',
    level: 4,
    topics: ['materialized-views', 'aggregates'],
    title: 'All-time franchise records',
    prompt: 'Store each franchise\'s all-time record since 1871: franch_id, seasons, wins, losses and winning percentage rounded to 3 decimals.',
    orderMatters: true,
    checkSql: `select franch_id, seasons, wins, losses, pct from franchise_records order by pct desc, franch_id limit 5`,
    solutions: [
      {
        approach: 'Materialized view',
        postgres: `create materialized view franchise_records as
select franch_id, count(*) as seasons, sum(w) as wins, sum(l) as losses,
       round(sum(w)::numeric / (sum(w) + sum(l)), 3) as pct
from teams
group by franch_id;`,
        mysql: `create table franchise_records as
select franch_id, count(*) as seasons, sum(w) as wins, sum(l) as losses,
       round(sum(w) / (sum(w) + sum(l)), 3) as pct
from teams
group by franch_id;`,
        mysqlNote: 'A table stands in for the materialized view; refresh it once a season.',
        explanation: '150 years of results change once a year: a perfect case for storing the aggregate. The top of the list includes short-lived 19th-century clubs with few seasons.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Materialized views', url: PG + 'rules-materializedviews.html' }],
  },
  {
    id: 'lahman-054',
    dataset: 'lahman',
    level: 5,
    topics: ['partitioning'],
    title: 'Salaries split by league',
    prompt: 'Create salaries_by_league with the columns of salaries, list-partitioned by lg_id into AL and NL, and copy the salaries into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from pg_inherits where inhparent = 'salaries_by_league'::regclass) as partitions,
       (select count(*) from salaries_by_league) as total_rows,
       (select count(*) from salaries_by_league where lg_id = 'AL') as al_rows`,
    checkSqlMysql: `select (select count(*) from information_schema.partitions
        where table_schema = database() and table_name = 'salaries_by_league') as partitions,
       (select count(*) from salaries_by_league) as total_rows,
       (select count(*) from salaries_by_league where lg_id = 'AL') as al_rows`,
    solutions: [
      {
        approach: 'LIST partitions',
        postgres: `create table salaries_by_league (like salaries, primary key (year_id, team_id, player_id, lg_id))
partition by list (lg_id);

create table salaries_al partition of salaries_by_league for values in ('AL');
create table salaries_nl partition of salaries_by_league for values in ('NL');

insert into salaries_by_league select * from salaries;`,
        mysql: `create table salaries_by_league like salaries;

alter table salaries_by_league drop primary key, add primary key (year_id, team_id, player_id, lg_id);

alter table salaries_by_league
partition by list columns (lg_id) (
  partition p_al values in ('AL'),
  partition p_nl values in ('NL')
);

insert into salaries_by_league select * from salaries;`,
        explanation: 'The primary key grows to include lg_id, as both databases require. A query for one league reads one partition.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: LIST COLUMNS partitioning', url: MY + 'partitioning-columns-list.html' },
    ],
  },
  {
    id: 'lahman-055',
    dataset: 'lahman',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'Longest winning streak, with a loop',
    prompt:
      'Write a function longest_winning_run(p_franch_id) that walks through a franchise\'s seasons in year order with a loop and returns the longest run of consecutive winning seasons (w > l).',
    orderMatters: false,
    checkSql: `select longest_winning_run('NYY') as nyy, longest_winning_run('BOS') as bos, longest_winning_run('XXX') as unknown`,
    solutions: [
      {
        approach: 'FOR loop / cursor with two counters',
        postgres: `create function longest_winning_run(p_franch_id text)
returns integer
language plpgsql
stable
as $$
declare
  r record;
  cur integer := 0;
  best integer := 0;
begin
  for r in select w, l from teams where franch_id = p_franch_id order by year_id loop
    if r.w > r.l then
      cur := cur + 1;
      best := greatest(best, cur);
    else
      cur := 0;
    end if;
  end loop;
  return best;
end;
$$;`,
        mysql: `create function longest_winning_run(p_franch_id varchar(3))
returns int
reads sql data
begin
  declare done int default 0;
  declare v_w, v_l, cur, best int default 0;
  declare c cursor for select w, l from teams where franch_id = p_franch_id order by year_id;
  declare continue handler for not found set done = 1;
  open c;
  seasons: loop
    fetch c into v_w, v_l;
    if done then leave seasons; end if;
    if v_w > v_l then
      set cur = cur + 1;
      set best = greatest(best, cur);
    else
      set cur = 0;
    end if;
  end loop;
  close c;
  return best;
end;`,
        mysqlNote: `A cursor with a NOT FOUND handler replaces the FOR … IN query loop. ${DELIMITER_NOTE}`,
        explanation:
          'A running counter that resets on every losing season, and the best value seen so far. The set-based islands query gives the same answer; the loop is easier to extend with rules that do not fit SQL, such as "a .500 season does not break the streak".',
      },
    ],
    docs: [{ label: 'PostgreSQL: Looping through query results', url: PG + 'plpgsql-control-structures.html#PLPGSQL-RECORDS-ITERATING' }],
  },
  {
    id: 'lahman-056',
    dataset: 'lahman',
    level: 4,
    topics: ['json'],
    title: 'Read a JSON array as rows',
    prompt:
      'An API sends a JSON array of player ids with a bonus each: [{"id": "judgeaa01", "bonus": 500000}, {"id": "ohtansh01", "bonus": 750000}]. Turn it into rows and join it to people: player_id, name_last and bonus.',
    orderMatters: true,
    solutions: [
      {
        approach: 'jsonb_to_recordset / JSON_TABLE',
        postgres: `select j.id as player_id, p.name_last, j.bonus
from jsonb_to_recordset('[{"id": "judgeaa01", "bonus": 500000}, {"id": "ohtansh01", "bonus": 750000}]'::jsonb)
       as j(id text, bonus int)
join people p on p.player_id = j.id
order by j.bonus desc;`,
        mysql: `select j.id as player_id, p.name_last, j.bonus
from json_table('[{"id": "judgeaa01", "bonus": 500000}, {"id": "ohtansh01", "bonus": 750000}]',
                '$[*]' columns (id varchar(9) path '$.id', bonus int path '$.bonus')) as j
join people p on p.player_id = j.id collate utf8mb4_0900_ai_ci
order by j.bonus desc;`,
        mysqlNote: 'JSON_TABLE maps each array element ($[*]) to a row and each path to a typed column. Its text columns get a different collation than the table, and MySQL refuses to compare the two; COLLATE on one side settles it.',
        explanation:
          'jsonb_to_recordset turns an array of objects into rows, with the column names and types given after AS. Handy for passing a whole list as one parameter instead of building SQL text. PostgreSQL 17+ also has JSON_TABLE.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: jsonb_to_recordset', url: PG + 'functions-json.html#FUNCTIONS-JSON-PROCESSING' },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'lahman-057',
    dataset: 'lahman',
    level: 3,
    topics: ['lateral'],
    title: 'Each franchise\'s best season',
    prompt: 'For the 10 active franchises (teams_franchises.active = Y) with the lowest franch_id, show their best season by wins: franch_id, year_id, w and l. Ties: the earlier year.',
    orderMatters: true,
    solutions: [
      {
        approach: 'LATERAL … LIMIT 1',
        postgres: `select fr.franch_id, best.year_id, best.w, best.l
from teams_franchises fr
cross join lateral (
  select t.year_id, t.w, t.l from teams t
  where t.franch_id = fr.franch_id
  order by t.w desc, t.year_id
  limit 1
) best
where fr.active = 'Y'
order by fr.franch_id
limit 10;`,
        mysql: `select fr.franch_id, best.year_id, best.w, best.l
from teams_franchises fr
cross join lateral (
  select t.year_id, t.w, t.l from teams t
  where t.franch_id = fr.franch_id
  order by t.w desc, t.year_id
  limit 1
) best
where fr.active = 'Y'
order by fr.franch_id
limit 10;`,
        mysqlNote: 'LATERAL exists since MySQL 8.0.14.',
        explanation: 'For each franchise the subquery sorts its seasons and keeps the top one, returning three columns at once.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'lahman-058',
    dataset: 'lahman',
    level: 3,
    topics: ['pivot'],
    title: 'Wins by league and division',
    prompt: 'For 2025, show each league as a row with the total wins of its East, Central and West divisions as columns.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Conditional sums',
        postgres: `select lg_id,
       sum(w) filter (where div_id = 'E') as east,
       sum(w) filter (where div_id = 'C') as central,
       sum(w) filter (where div_id = 'W') as west
from teams
where year_id = 2025
group by lg_id
order by lg_id;`,
        mysql: `select lg_id,
       sum(case when div_id = 'E' then w end) as east,
       sum(case when div_id = 'C' then w end) as central,
       sum(case when div_id = 'W' then w end) as west
from teams
where year_id = 2025
group by lg_id
order by lg_id;`,
        explanation: 'Each division becomes a column. Games between divisions of the same league give one team a win and the other a loss, so the three totals tell which division beat up on the others.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'lahman-059',
    dataset: 'lahman',
    level: 3,
    topics: ['date-series'],
    title: 'Debuts every month of 2025',
    prompt: 'Show every month of 2025 (1–12) with the number of major-league debuts, including months with none.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Series of month numbers',
        postgres: `select m as month, count(p.player_id) as debuts
from generate_series(1, 12) as m
left join people p on p.debut >= '2025-01-01' and p.debut < '2026-01-01'
                  and extract(month from p.debut) = m
group by m
order by m;`,
        mysql: `with recursive months (m) as (select 1 union all select m + 1 from months where m < 12)
select m as month, count(p.player_id) as debuts
from months
left join people p on p.debut >= '2025-01-01' and p.debut < '2026-01-01'
                  and month(p.debut) = m
group by m
order by m;`,
        mysqlNote: 'A recursive CTE counts 1 to 12 in place of generate_series.',
        explanation: 'Debuts happen in the season, late March to September; the off-season months still appear, with 0.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'lahman-060',
    dataset: 'lahman',
    level: 3,
    topics: ['recursive'],
    title: 'Following links without going in circles',
    prompt:
      'teams_franchises.na_assoc links some franchises to their National Association counterpart, and the links point both ways (ATL → BNA, BNA → ATL). Starting from ATL, follow the links and list each franchise reached once, with its distance from ATL.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive CTE with a CYCLE clause',
        postgres: `with recursive chain (franch_id, depth) as (
  select 'ATL'::varchar, 0
  union all
  select f.na_assoc, c.depth + 1
  from chain c
  join teams_franchises f on f.franch_id = c.franch_id
  where f.na_assoc is not null
) cycle franch_id set is_cycle using path
select franch_id, depth from chain where not is_cycle
order by depth;`,
        mysql: `with recursive chain (franch_id, depth, path) as (
  select cast('ATL' as char(3)) collate utf8mb4_0900_ai_ci, 0, cast('ATL' as char(200)) collate utf8mb4_0900_ai_ci
  union all
  select f.na_assoc, c.depth + 1, concat(c.path, ',', f.na_assoc)
  from chain c
  join teams_franchises f on f.franch_id = c.franch_id
  where f.na_assoc is not null and find_in_set(f.na_assoc, c.path) = 0
)
select franch_id, depth from chain
order by depth;`,
        mysqlNote: 'No CYCLE clause in MySQL: keep the visited ids in a path string and stop when the next id is already in it. The COLLATE makes the CAST strings use the table\'s collation; with a different connection collation MySQL refuses to compare them (Illegal mix of collations).',
        explanation:
          'Without a guard, ATL → BNA → ATL → … would never end. CYCLE (PostgreSQL 14+) tracks the path for you and marks the row that closes a loop; filtering it out leaves each franchise once.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Cycle detection', url: PG + 'queries-with.html#QUERIES-WITH-CYCLE' },
      { label: 'MySQL: Recursive CTEs', url: MY + 'with.html#common-table-expressions-recursive' },
    ],
  },
  {
    id: 'lahman-061',
    dataset: 'lahman',
    level: 5,
    topics: ['procedures', 'dml'],
    title: 'Record a game result',
    prompt:
      'Write a procedure record_game(p_year, p_winner, p_loser) that adds a win to the winning team\'s season and a loss to the loser\'s. Record a 2025 game won by NYA against BOS.',
    orderMatters: true,
    checkSql: `call record_game(2025, 'NYA', 'BOS');
select team_id, w, l from teams where year_id = 2025 and team_id in ('NYA', 'BOS') order by team_id`,
    solutions: [
      {
        approach: 'Two updates in a procedure',
        postgres: `create procedure record_game(p_year integer, p_winner text, p_loser text)
language sql
as $$
  update teams set w = w + 1, g = g + 1 where year_id = p_year and team_id = p_winner;
  update teams set l = l + 1, g = g + 1 where year_id = p_year and team_id = p_loser;
$$;`,
        mysql: `create procedure record_game(p_year int, p_winner char(3), p_loser char(3))
begin
  update teams set w = w + 1, g = g + 1 where year_id = p_year and team_id = p_winner;
  update teams set l = l + 1, g = g + 1 where year_id = p_year and team_id = p_loser;
end;`,
        mysqlNote: 'In the mysql client, wrap it in DELIMITER $$ … $$.',
        explanation: 'One call keeps the two sides of the game consistent: games, wins and losses all move together.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' }],
  },
  {
    id: 'lahman-062',
    dataset: 'lahman',
    level: 2,
    topics: ['text-aggregation'],
    title: 'A franchise\'s names over time',
    prompt: 'For franchises that played under more than one name, list the distinct names in order of first use as one text, separated by " → ".',
    orderMatters: true,
    solutions: [
      {
        approach: 'First year per name, then aggregate',
        postgres: `select franch_id, string_agg(name, ' → ' order by first_year) as names
from (select franch_id, name, min(year_id) as first_year from teams group by franch_id, name) n
group by franch_id
having count(*) > 1
order by franch_id;`,
        mysql: `select franch_id, group_concat(name order by first_year separator ' → ') as names
from (select franch_id, name, min(year_id) as first_year from teams group by franch_id, name) n
group by franch_id
having count(*) > 1
order by franch_id;`,
        mysqlNote: 'GROUP_CONCAT stops at group_concat_max_len (1,024 bytes by default); enough here.',
        explanation: 'Aggregate names to their first year first, so each appears once; a name that came back later (a franchise returning to an old name) keeps its first position.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'lahman-063',
    dataset: 'lahman',
    level: 2,
    topics: ['full-join'],
    title: 'All-Stars and award winners in 2024',
    prompt: 'Compare 2024 All-Stars with 2024 award winners (any award): count players in both lists, only All-Star, only award winner.',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two player lists',
        postgres: `with stars as (select distinct player_id from allstar_full where year_id = 2024),
     winners as (select distinct player_id from awards_players where year_id = 2024)
select count(*) filter (where s.player_id is not null and w.player_id is not null) as both_lists,
       count(*) filter (where w.player_id is null) as only_all_star,
       count(*) filter (where s.player_id is null) as only_award
from stars s full join winners w on w.player_id = s.player_id;`,
        mysql: null,
        mysqlNote: 'No FULL JOIN in MySQL; see solution B.',
        explanation: 'Many awards (Player of the Week, Gold Gloves) go to non-All-Stars too, so all three counts are substantial.',
      },
      {
        approach: 'UNION of players, then flags',
        postgres: `select sum(case when s and w then 1 else 0 end) as both_lists,
       sum(case when s and not w then 1 else 0 end) as only_all_star,
       sum(case when w and not s then 1 else 0 end) as only_award
from (
  select p.player_id,
         exists (select 1 from allstar_full a where a.player_id = p.player_id and a.year_id = 2024) as s,
         exists (select 1 from awards_players a where a.player_id = p.player_id and a.year_id = 2024) as w
  from (select player_id from allstar_full where year_id = 2024
        union select player_id from awards_players where year_id = 2024) p
) f;`,
        mysql: `select sum(s and w) as both_lists, sum(s and not w) as only_all_star, sum(w and not s) as only_award
from (
  select p.player_id,
         exists (select 1 from allstar_full a where a.player_id = p.player_id and a.year_id = 2024) as s,
         exists (select 1 from awards_players a where a.player_id = p.player_id and a.year_id = 2024) as w
  from (select player_id from allstar_full where year_id = 2024
        union select player_id from awards_players where year_id = 2024) p
) f;`,
        explanation: 'The UNION builds the combined list of players; two EXISTS flags place each one.',
      },
    ],
    comparison: 'Same counts.',
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'lahman-064',
    dataset: 'lahman',
    level: 4,
    topics: ['upsert'],
    title: 'Keep the best single season',
    prompt:
      'Create best_hr (player_id primary key, year_id, hr). Load 2024 season totals for players with 40+ home runs, then load 2025 the same way, keeping for each player only their better season.',
    orderMatters: true,
    checkSql: `select player_id, year_id, hr from best_hr order by hr desc, player_id limit 8`,
    solutions: [
      {
        approach: 'Conditional upsert',
        postgres: `create table best_hr (player_id varchar(9) primary key, year_id smallint not null, hr smallint not null);

insert into best_hr
select player_id, 2024, sum(hr) from batting where year_id = 2024 group by player_id having sum(hr) >= 40
on conflict (player_id) do update set year_id = excluded.year_id, hr = excluded.hr where excluded.hr > best_hr.hr;

insert into best_hr
select player_id, 2025, sum(hr) from batting where year_id = 2025 group by player_id having sum(hr) >= 40
on conflict (player_id) do update set year_id = excluded.year_id, hr = excluded.hr where excluded.hr > best_hr.hr;`,
        mysql: `create table best_hr (player_id varchar(9) primary key, year_id smallint not null, hr smallint not null);

insert into best_hr
select * from (select player_id, 2024 as year_id, sum(hr) as hr from batting where year_id = 2024 group by player_id having sum(hr) >= 40) as new
on duplicate key update year_id = if(new.hr > best_hr.hr, new.year_id, best_hr.year_id), hr = greatest(best_hr.hr, new.hr);

insert into best_hr
select * from (select player_id, 2025 as year_id, sum(hr) as hr from batting where year_id = 2025 group by player_id having sum(hr) >= 40) as new
on duplicate key update year_id = if(new.hr > best_hr.hr, new.year_id, best_hr.year_id), hr = greatest(best_hr.hr, new.hr);`,
        mysqlNote: 'No WHERE on ON DUPLICATE KEY UPDATE: decide each column with IF/GREATEST. year_id is set first, while best_hr.hr still holds the old value; MySQL applies the assignments left to right.',
        explanation: 'The WHERE of DO UPDATE keeps the old row unless the new season is better, so the table always holds each player\'s best season.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ON CONFLICT … WHERE', url: PG + 'sql-insert.html#SQL-ON-CONFLICT' }],
  },
  {
    id: 'lahman-065',
    dataset: 'lahman',
    level: 4,
    topics: ['views', 'numbers'],
    title: 'Team seasons with percentages',
    prompt: 'Create a view team_seasons (year_id, team_id, name, w, l, pct, run_diff) with pct = w / (w + l) to 3 decimals and run_diff = runs scored − runs allowed.',
    orderMatters: true,
    checkSql: `select year_id, team_id, pct, run_diff from team_seasons where year_id = 2025 order by run_diff desc, team_id limit 5`,
    solutions: [
      {
        approach: 'View with computed columns',
        postgres: `create view team_seasons as
select year_id, team_id, name, w, l,
       round(w::numeric / nullif(w + l, 0), 3) as pct,
       r - ra as run_diff
from teams;`,
        mysql: `create view team_seasons as
select year_id, team_id, name, w, l,
       round(w / nullif(w + l, 0), 3) as pct,
       r - ra as run_diff
from teams;`,
        explanation: 'Every report that needs a winning percentage now gets the same formula, including the cast that avoids integer division and the nullif that protects against 0 games.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' }],
  },
  {
    id: 'lahman-066',
    dataset: 'lahman',
    level: 3,
    topics: ['window-frames'],
    title: 'A five-season average of home runs',
    prompt: 'For the Yankees (franch_id NYY) from 1990, show each season\'s team home runs and the average over that season and the four before it (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROWS BETWEEN 4 PRECEDING',
        postgres: `select year_id, hr, avg_5
from (select year_id, hr, round(avg(hr) over (order by year_id rows between 4 preceding and current row), 1) as avg_5
      from teams where franch_id = 'NYY' and year_id >= 1986) t
where year_id >= 1990
order by year_id;`,
        mysql: `select year_id, hr, avg_5
from (select year_id, hr, round(avg(hr) over (order by year_id rows between 4 preceding and current row), 1) as avg_5
      from teams where franch_id = 'NYY' and year_id >= 1986) t
where year_id >= 1990
order by year_id;`,
        explanation: 'The inner query starts in 1986 so that 1990 already has four seasons before it; filtering 1990+ happens after the window is computed. 1994 and 2020 were short seasons and pull the average down.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window frames', url: PG + 'sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS' }],
  },
  {
    id: 'lahman-067',
    dataset: 'lahman',
    level: 5,
    topics: ['transactions', 'locks-isolation'],
    title: 'Move a salary row to another team',
    prompt:
      'The 2016 salary of player \'sabatcc01\' was booked to the wrong team. Lock his 2016 salary row, then move it from NYA to BOS in one transaction. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select year_id, team_id, player_id, salary from salaries where player_id = 'sabatcc01' and year_id = 2016`,
    solutions: [
      {
        approach: 'Lock the rows, then update',
        postgres: `select salary from salaries where player_id = 'sabatcc01' and year_id = 2016 for update;

update salaries set team_id = 'BOS'
where player_id = 'sabatcc01' and year_id = 2016 and team_id = 'NYA';`,
        mysql: `start transaction;

select salary from salaries where player_id = 'sabatcc01' and year_id = 2016 for update;

update salaries set team_id = 'BOS'
where player_id = 'sabatcc01' and year_id = 2016 and team_id = 'NYA';

commit;`,
        explanation:
          'The update changes part of the primary key (team_id) and must still satisfy the foreign key to teams (2016, BOS), which it does. Locking first means a concurrent correction of the same rows waits instead of overwriting this one.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Transactions', url: PG + 'tutorial-transactions.html' }],
  },
  {
    id: 'lahman-068',
    dataset: 'lahman',
    level: 3,
    topics: ['recursive', 'set-operations'],
    title: 'Seasons without salary data',
    prompt: 'Build the seasons 2010–2025 with a recursive CTE and list those that have no row in salaries.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Recursive series EXCEPT existing years',
        postgres: `with recursive seasons (y) as (
  select 2010 union all select y + 1 from seasons where y < 2025
)
select y as season from seasons
except
select distinct year_id from salaries
order by season;`,
        mysql: `with recursive seasons (y) as (
  select 2010 union all select y + 1 from seasons where y < 2025
)
select y as season from seasons
except
select distinct year_id from salaries
order by season;`,
        mysqlNote: 'EXCEPT exists since MySQL 8.0.31.',
        explanation: 'The Lahman salary data stops after 2016, so 2017–2025 come out. Generating the expected values and subtracting the present ones is the general way to find what is missing.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Combining queries', url: PG + 'queries-union.html' }],
  },
  {
    id: 'lahman-069',
    dataset: 'lahman',
    level: 5,
    topics: ['triggers', 'upsert'],
    title: 'A summary kept current by a trigger',
    prompt:
      'Create hr_totals (player_id primary key, hr) from batting. Then add a trigger that, on every new batting row, adds its home runs to hr_totals (inserting the player if new). Test with a new 2025 row (stint 9, NYA, AL) for judgeaa01 with 3 home runs.',
    orderMatters: false,
    checkSql: `insert into batting (player_id, year_id, stint, team_id, lg_id, hr) values ('judgeaa01', 2025, 9, 'NYA', 'AL', 3);
select player_id, hr from hr_totals where player_id = 'judgeaa01'`,
    solutions: [
      {
        approach: 'AFTER INSERT trigger doing an upsert',
        postgres: `create table hr_totals as select player_id, sum(hr)::integer as hr from batting group by player_id;
alter table hr_totals add primary key (player_id);

create function add_to_hr_totals() returns trigger
language plpgsql
as $$
begin
  insert into hr_totals (player_id, hr) values (new.player_id, coalesce(new.hr, 0))
  on conflict (player_id) do update set hr = hr_totals.hr + excluded.hr;
  return new;
end;
$$;

create trigger batting_hr_totals
after insert on batting
for each row execute function add_to_hr_totals();`,
        mysql: `create table hr_totals as select player_id, cast(sum(hr) as signed) as hr from batting group by player_id;
alter table hr_totals add primary key (player_id);

create trigger batting_hr_totals
after insert on batting
for each row
  insert into hr_totals (player_id, hr) values (new.player_id, coalesce(new.hr, 0)) as n
  on duplicate key update hr = hr_totals.hr + n.hr;`,
        mysqlNote: 'A one-statement trigger body needs no BEGIN … END.',
        explanation:
          'The summary stays in step without recomputing. Triggers like this are cheap per row but make bulk loads slower: for those, rebuild the summary afterwards instead.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' }],
  },
  {
    id: 'lahman-070',
    dataset: 'lahman',
    level: 4,
    topics: ['normalization', 'lateral'],
    title: 'An outdated franchise name',
    prompt: 'teams_franchises.franch_name and the team\'s season name can drift apart. Which active franchises have a name different from their latest season\'s team name?',
    orderMatters: true,
    solutions: [
      {
        approach: 'Compare with the latest season',
        postgres: `select f.franch_id, f.franch_name, latest.name as latest_team_name
from teams_franchises f
cross join lateral (select name from teams t where t.franch_id = f.franch_id order by year_id desc limit 1) latest
where f.active = 'Y' and f.franch_name <> latest.name
order by f.franch_id;`,
        mysql: `select f.franch_id, f.franch_name, latest.name as latest_team_name
from teams_franchises f
cross join lateral (select name from teams t where t.franch_id = f.franch_id order by year_id desc limit 1) latest
where f.active = 'Y' and f.franch_name <> latest.name
order by f.franch_id;`,
        explanation:
          'Cleveland became the Guardians, Florida the Miami Marlins, Oakland the "Athletics". The franchise name is a second copy of a fact that changes, so it went stale; a view deriving it from the latest season could not.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LATERAL subqueries', url: PG + 'queries-table-expressions.html#QUERIES-LATERAL' }],
  },
  {
    id: 'lahman-071',
    dataset: 'lahman',
    level: 3,
    topics: ['subtotals'],
    title: 'Home runs by league and division, 2024',
    prompt: 'Sum 2024 team home runs by league and division with subtotals per league and a grand total (labels "All").',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP',
        postgres: `select coalesce(lg_id, 'All') as league, coalesce(div_id, 'All') as division, sum(hr) as hr
from teams
where year_id = 2024
group by rollup (lg_id, div_id)
order by grouping(lg_id), lg_id, grouping(div_id), div_id;`,
        mysql: `select coalesce(lg_id, 'All') as league, coalesce(div_id, 'All') as division, sum(hr) as hr
from teams
where year_id = 2024
group by lg_id, div_id with rollup
order by grouping(lg_id), lg_id, grouping(div_id), div_id;`,
        explanation: 'Six divisions, two league subtotals, one total: nine rows.',
      },
    ],
    docs: [{ label: 'PostgreSQL: ROLLUP', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'lahman-072',
    dataset: 'lahman',
    level: 4,
    topics: ['merge'],
    title: 'Sync franchise names',
    prompt: 'Fix the stale names found above: in one statement, set teams_franchises.franch_name to the latest season\'s team name for every active franchise where it differs.',
    orderMatters: true,
    checkSql: `select franch_id, franch_name from teams_franchises where franch_id in ('CLE', 'FLA', 'OAK', 'NYY') order by franch_id`,
    solutions: [
      {
        approach: 'MERGE from the latest names',
        postgres: `merge into teams_franchises f
using (select distinct on (franch_id) franch_id, name from teams order by franch_id, year_id desc) t
on t.franch_id = f.franch_id
when matched and f.active = 'Y' and f.franch_name <> t.name then
  update set franch_name = t.name;`,
        mysql: null,
        mysqlNote: 'No MERGE in MySQL; see solution B.',
        explanation: 'DISTINCT ON gives the latest season per franchise; MERGE updates only the active ones whose name differs.',
      },
      {
        approach: 'UPDATE with a join to the latest names',
        postgres: `update teams_franchises f set franch_name = t.name
from (select distinct on (franch_id) franch_id, name from teams order by franch_id, year_id desc) t
where t.franch_id = f.franch_id and f.active = 'Y' and f.franch_name <> t.name;`,
        mysql: `update teams_franchises f
join (select franch_id, name from (
        select franch_id, name, row_number() over (partition by franch_id order by year_id desc) as n from teams
      ) r where n = 1) t on t.franch_id = f.franch_id
set f.franch_name = t.name
where f.active = 'Y' and f.franch_name <> t.name;`,
        mysqlNote: 'No DISTINCT ON in MySQL: ROW_NUMBER picks the latest season per franchise.',
        explanation: 'The same sync as a joined UPDATE.',
      },
    ],
    comparison: 'Same result: three names updated, the others untouched.',
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'lahman-073',
    dataset: 'lahman',
    level: 2,
    topics: ['limit', 'conditions'],
    title: 'The next page of 2025 debuts',
    prompt:
      'An app lists 2025 debuts by debut date, then player_id, 5 per page. The last row on the current page was (2025-03-27, \'johnsry01\'). Fetch the next page without OFFSET: player_id and debut.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Keyset pagination with a row comparison',
        postgres: `select player_id, debut
from people
where debut >= '2025-01-01'
  and (debut, player_id) > ('2025-03-27', 'johnsry01')
order by debut, player_id
limit 5;`,
        mysql: `select player_id, debut
from people
where debut >= '2025-01-01'
  and (debut, player_id) > ('2025-03-27', 'johnsry01')
order by debut, player_id
limit 5;`,
        explanation:
          '(a, b) > (x, y) means a > x, or a = x and b > y: exactly "after this row" in the sort order. Unlike OFFSET, it does not read and throw away the earlier pages, and a row inserted meanwhile does not shift the page. The sort key must be unique, which is why player_id breaks ties of the same day.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Row-wise comparison', url: PG + 'functions-comparisons.html#ROW-WISE-COMPARISON' },
      { label: 'MySQL: Row constructor expressions', url: MY + 'row-constructor-optimization.html' },
    ],
  },
  {
    id: 'lahman-074',
    dataset: 'lahman',
    level: 1,
    topics: ['conditions', 'null'],
    title: 'Young lefty hitters from the Caribbean',
    prompt:
      'Which players bat left but throw right, were born in 1995 or later, and come from Venezuela or the Dominican Republic (stored as \'D.R.\')? Show player_id, name_first, name_last, birth_country and birth_year, ordered by player_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'AND with IN',
        postgres: `select player_id, name_first, name_last, birth_country, birth_year
from people
where bats = 'L'
  and throws = 'R'
  and birth_year >= 1995
  and birth_country in ('Venezuela', 'D.R.')
order by player_id;`,
        mysql: `select player_id, name_first, name_last, birth_country, birth_year
from people
where bats = 'L'
  and throws = 'R'
  and birth_year >= 1995
  and birth_country in ('Venezuela', 'D.R.')
order by player_id;`,
        explanation:
          'IN replaces a chain of ORs, and keeps the AND/OR precedence trap away: "country = A or country = B and …" would apply the other conditions to B only. Players with an unknown birth_year are left out, because NULL >= 1995 is not true.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Comparison operators', url: PG + 'functions-comparison.html' }],
  },
  {
    id: 'lahman-075',
    dataset: 'lahman',
    level: 2,
    topics: ['conditional-aggregates'],
    title: 'Left, right and switch hitters by debut year',
    prompt:
      'For debut years 2015 to 2025: how many new players bat left (L), right (R) and both (B), and the share of left-handed batters in percent (1 decimal).',
    orderMatters: true,
    solutions: [
      {
        approach: 'COUNT with FILTER / SUM(CASE)',
        postgres: `select extract(year from debut)::int as debut_year,
       count(*) filter (where bats = 'L') as lefties,
       count(*) filter (where bats = 'R') as righties,
       count(*) filter (where bats = 'B') as switch_hitters,
       round(100.0 * count(*) filter (where bats = 'L') / count(*), 1) as pct_left
from people
where debut >= '2015-01-01'
group by extract(year from debut)
order by debut_year;`,
        mysql: `select year(debut) as debut_year,
       sum(bats = 'L') as lefties,
       sum(bats = 'R') as righties,
       sum(bats = 'B') as switch_hitters,
       round(100 * sum(bats = 'L') / count(*), 1) as pct_left
from people
where debut >= '2015-01-01'
group by year(debut)
order by debut_year;`,
        mysqlNote: 'In MySQL a comparison is 1 or 0, so SUM(bats = \'L\') counts the matches.',
        explanation:
          'About 10% of people are left-handed, but around 30% of new hitters bat left: from the left side you start a step closer to first base and see most (right-handed) pitchers better.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'lahman-076',
    dataset: 'lahman',
    level: 2,
    topics: ['casting', 'dates-basics'],
    title: 'Birthdays by day of the week',
    prompt:
      'people stores birth dates as three numbers. For players born in 1990 or later with a complete birth date, turn the parts into a real date and count births per ISO day of week (1 = Monday … 7 = Sunday).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Glue the parts into text, cast to date',
        postgres: `select extract(isodow from (birth_year || '-' || birth_month || '-' || birth_day)::date)::int as weekday,
       count(*) as players
from people
where birth_year >= 1990 and birth_month is not null and birth_day is not null
group by weekday
order by weekday;`,
        mysql: `select weekday(cast(concat_ws('-', birth_year, birth_month, birth_day) as date)) + 1 as weekday,
       count(*) as players
from people
where birth_year >= 1990 and birth_month is not null and birth_day is not null
group by weekday
order by weekday;`,
        mysqlNote: 'WEEKDAY() counts from 0 = Monday, so add 1. CAST accepts \'1994-3-7\' without leading zeros.',
        explanation:
          'Both databases read \'1994-3-7\' as a date. Weekends have about a third fewer births: many deliveries are scheduled, and hospitals schedule them on weekdays.',
      },
      {
        approach: 'make_date / MAKEDATE',
        postgres: `select extract(isodow from make_date(birth_year, birth_month, birth_day))::int as weekday,
       count(*) as players
from people
where birth_year >= 1990 and birth_month is not null and birth_day is not null
group by weekday
order by weekday;`,
        mysql: `select weekday(makedate(birth_year, 1) + interval birth_month - 1 month + interval birth_day - 1 day) + 1 as weekday,
       count(*) as players
from people
where birth_year >= 1990 and birth_month is not null and birth_day is not null
group by weekday
order by weekday;`,
        mysqlNote: 'MAKEDATE(year, day_of_year) takes a day of the year, so add the months and days as intervals.',
        explanation: 'make_date builds the date from numbers directly, with no text in between, and fails loudly on an impossible date such as 30 February.',
      },
    ],
    comparison: 'Same counts. make_date is the cleaner tool in PostgreSQL; the text-and-cast route works almost everywhere.',
    docs: [
      { label: 'PostgreSQL: make_date', url: PG + 'functions-datetime.html' },
      { label: 'MySQL: CAST', url: MY + 'cast-functions.html' },
    ],
  },
  {
    id: 'lahman-077',
    dataset: 'lahman',
    level: 4,
    topics: ['temp-tables', 'aggregates'],
    title: 'Career totals since 2010, once',
    prompt:
      'Several reports need batting totals per player since 2010. Build them once in a temporary table career (player_id, seasons, ab, h, hr). Then: the 5 players with the most home runs, with their names.',
    hint: SEASONS_NOTE,
    orderMatters: true,
    checkSql: `select c.player_id, p.name_first, p.name_last, c.seasons, c.hr
from career c
join people p on p.player_id = c.player_id
order by c.hr desc, c.player_id
limit 5`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS with a primary key',
        postgres: `create temporary table career as
select player_id, count(distinct year_id) as seasons, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id;

alter table career add primary key (player_id);`,
        mysql: `create temporary table career as
select player_id, count(distinct year_id) as seasons, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id;

alter table career add primary key (player_id);`,
        explanation:
          'count(distinct year_id) counts a traded player\'s season once although he has a row per team. The key makes joins to people fast, the same as on a real table.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'lahman-078',
    dataset: 'lahman',
    level: 4,
    topics: ['generated-columns', 'null'],
    title: 'Body mass index as a column',
    prompt:
      'Add a stored generated column bmi to people: 703 × weight (lb) / height (in)², rounded to 1 decimal, NULL when either is missing. Which 3 people have the highest value?',
    orderMatters: true,
    checkSql: `select player_id, name_first, name_last, bmi from people where bmi is not null order by bmi desc, player_id limit 3`,
    solutions: [
      {
        approach: 'GENERATED ALWAYS AS … STORED',
        postgres: `alter table people
add column bmi numeric(4, 1)
generated always as (round(703.0 * weight / (height * height), 1)) stored;`,
        mysql: `alter table people
add column bmi decimal(4, 1)
generated always as (round(703 * weight / (height * height), 1)) stored;`,
        explanation:
          'Arithmetic with a NULL gives NULL, so missing heights or weights need no special case. In PostgreSQL the 703.0 matters: with only integers the division would be integer division. The top value belongs to John McSherry, whose row has no debut: people also lists people who never played, and he was an umpire.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Generated columns', url: PG + 'ddl-generated-columns.html' },
      { label: 'MySQL: Generated columns', url: MY + 'create-table-generated-columns.html' },
    ],
  },
  {
    id: 'lahman-079',
    dataset: 'lahman',
    level: 3,
    topics: ['date-series', 'joins'],
    title: 'All-Stars every year, even without a game',
    prompt: 'Count All-Star selections per year from 2010 to 2025, showing every year, also one without any rows.',
    hint: SEASONS_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'Year series LEFT JOIN allstar_full',
        postgres: `select y.year_id, count(a.player_id) as all_stars
from generate_series(2010, 2025) as y (year_id)
left join allstar_full a on a.year_id = y.year_id
group by y.year_id
order by y.year_id;`,
        mysql: `with recursive years (year_id) as (
  select 2010 union all select year_id + 1 from years where year_id < 2025
)
select y.year_id, count(a.player_id) as all_stars
from years y
left join allstar_full a on a.year_id = y.year_id
group by y.year_id
order by y.year_id;`,
        mysqlNote: 'No generate_series in MySQL: a recursive CTE counts the years.',
        explanation:
          'There was no All-Star Game in 2020 (the season was shortened by the pandemic), so allstar_full has no 2020 rows. Grouping allstar_full alone would silently skip the year; the series makes it visible as 0. count(a.player_id), not count(*), so the empty year counts 0 instead of 1.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'lahman-080',
    dataset: 'lahman',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for champions only',
    prompt:
      'The "past champions" page lists World Series winners (ws_win = \'Y\') by year with name and wins. Create an index that holds only the winners and can answer the page from the index alone.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'teams' and indexdef like '%ws_win%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'teams' and column_name = 'ws_win'`,
    solutions: [
      {
        approach: 'Partial covering index',
        postgres: `create index teams_champions_idx on teams (year_id) include (name, w)
where ws_win = 'Y';

-- used by: select year_id, name, w from teams where ws_win = 'Y' order by year_id`,
        mysql: null,
        mysqlNote: 'No partial indexes or INCLUDE in MySQL; see solution B.',
        explanation:
          '126 of 3,105 team seasons won the World Series, so the index is tiny. Its entries are already in year order, and INCLUDE carries name and w, so the page is an index-only scan with no sort.',
      },
      {
        approach: 'Composite covering index',
        postgres: `create index teams_ws_year_idx on teams (ws_win, year_id, name, w);`,
        mysql: `create index teams_ws_year_idx on teams (ws_win, year_id, name, w);`,
        explanation: 'With ws_win first, the winners form one range of the index in year order, and the other columns make it covering. It indexes every team season, though.',
      },
    ],
    comparison: 'Both serve the page without touching the table. The partial index is about 25 times smaller; the composite one works in MySQL.',
    docs: [
      { label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' },
      { label: 'PostgreSQL: Index-only scans', url: PG + 'indexes-index-only-scans.html' },
    ],
  },
  {
    id: 'lahman-081',
    dataset: 'lahman',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'Ray as a word, not a fragment',
    prompt:
      'Find people with "Ray" as a whole word in name_given (not Raymond or Murray). Use full-text search with an index, and return how many there are.',
    orderMatters: false,
    checkSql: `select count(*) as people from people where to_tsvector('simple', name_given) @@ to_tsquery('simple', 'ray')`,
    checkSqlMysql: `select count(*) as people from people where match(name_given) against ('+ray' in boolean mode)`,
    solutions: [
      {
        approach: 'tsvector index / FULLTEXT index',
        postgres: `create index people_name_given_fts on people using gin (to_tsvector('simple', name_given));

-- search: where to_tsvector('simple', name_given) @@ to_tsquery('simple', 'ray')`,
        mysql: `create fulltext index people_name_given_ft on people (name_given);

-- search: where match(name_given) against ('+ray' in boolean mode)`,
        mysqlNote: 'MySQL ignores words shorter than innodb_ft_min_token_size (3 by default), so "Ray" is just long enough.',
        explanation:
          'Full-text search splits text into words, so "ray" matches the word Ray but not Raymond or Murray: 29 people, against 76 for LIKE \'%Ray%\'. The \'simple\' configuration only lower-cases; \'english\' would also reduce words to stems, which is wrong for names.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Text search', url: PG + 'textsearch-intro.html' },
      { label: 'MySQL: Full-text search', url: MY + 'fulltext-search.html' },
    ],
  },
  {
    id: 'lahman-082',
    dataset: 'lahman',
    level: 4,
    topics: ['views', 'aggregates'],
    title: 'One row per player season',
    prompt:
      'Create a view player_seasons (player_id, year_id, teams, g, ab, h, hr) that adds up all stints of a season, with teams as the number of teams the player batted for. Then Aaron Judge\'s 2022 line is a one-row query.',
    hint: STINT_NOTE,
    orderMatters: true,
    checkSql: `select player_id, year_id, teams, g, ab, h, hr from player_seasons where player_id in ('judgeaa01', 'abadfe01') and year_id in (2016, 2022) order by player_id, year_id`,
    solutions: [
      {
        approach: 'A grouping view',
        postgres: `create view player_seasons as
select player_id, year_id, count(*) as teams,
       sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id, year_id;`,
        mysql: `create view player_seasons as
select player_id, year_id, count(*) as teams,
       sum(g) as g, sum(ab) as ab, sum(h) as h, sum(hr) as hr
from batting
group by player_id, year_id;`,
        explanation:
          'Every season leaderboard needs this step, and forgetting it ranks traded players by half their season. With the view, the rule lives in one place. A filter on player_id is pushed into the view, so the one-row query reads only that player\'s rows.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: CREATE VIEW', url: PG + 'sql-createview.html' },
      { label: 'MySQL: View processing algorithms', url: MY + 'view-algorithms.html' },
    ],
  },
  {
    id: 'lahman-083',
    dataset: 'lahman',
    level: 5,
    topics: ['control-flow', 'functions'],
    title: 'Winning seasons in a row, with a loop',
    prompt:
      'Write a function winning_streak(p_franch_id, p_year) that counts how many consecutive seasons ending with p_year the franchise finished with more wins than losses, walking back one year at a time. Test it on the Yankees (NYY).',
    orderMatters: false,
    checkSql: `select winning_streak('NYY', 2025) as nyy_2025, winning_streak('NYY', 1992) as nyy_1992, winning_streak('XXX', 2025) as unknown`,
    solutions: [
      {
        approach: 'WHILE loop with SELECT INTO',
        postgres: `create function winning_streak(p_franch_id varchar, p_year integer) returns integer
language plpgsql
stable
as $$
declare
  v_year   integer := p_year;
  v_streak integer := 0;
  v_w      integer;
  v_l      integer;
begin
  loop
    select w, l into v_w, v_l from teams where franch_id = p_franch_id and year_id = v_year;
    exit when not found or v_w <= v_l;
    v_streak := v_streak + 1;
    v_year := v_year - 1;
  end loop;
  return v_streak;
end;
$$;`,
        mysql: `create function winning_streak(p_franch_id varchar(3), p_year int) returns int
reads sql data
begin
  declare v_year int default p_year;
  declare v_streak int default 0;
  declare v_found int;
  declare v_w int;
  declare v_l int;

  streak: loop
    select count(*), max(w), max(l) into v_found, v_w, v_l
    from teams where franch_id = p_franch_id and year_id = v_year;
    if v_found = 0 or v_w <= v_l then
      leave streak;
    end if;
    set v_streak = v_streak + 1;
    set v_year = v_year - 1;
  end loop streak;
  return v_streak;
end;`,
        mysqlNote: DELIMITER_NOTE + ' A MySQL LOOP needs a label for LEAVE; count(*) stands in for FOUND.',
        explanation:
          'Each pass reads one season and either stops (no season, or not a winning one) or counts it and steps back a year. The Yankees have had a winning record every season since 1993: 33 in a row up to 2025. A window-function solution exists too (gaps and islands), but the loop reads like the rule.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Loops', url: PG + 'plpgsql-control-structures.html#PLPGSQL-CONTROL-STRUCTURES-LOOPS' },
      { label: 'MySQL: LOOP', url: MY + 'loop.html' },
    ],
  },
  {
    id: 'lahman-084',
    dataset: 'lahman',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'A function on the column hides the index',
    prompt:
      'Index people.debut. Then write "players who debuted in 2025" so that the index can be used, and explain why where extract(year from debut) = 2025 (year(debut) = 2025 in MySQL) cannot use it.',
    orderMatters: false,
    checkSql: `select count(*) as debuts_2025 from people where debut >= '2025-01-01' and debut < '2026-01-01'`,
    solutions: [
      {
        approach: 'A plain range on the indexed column',
        postgres: `create index people_debut_idx on people (debut);

-- explain select count(*) from people where debut >= '2025-01-01' and debut < '2026-01-01';   -- index
-- explain select count(*) from people where extract(year from debut) = 2025;                    -- sequential scan`,
        mysql: `create index people_debut_idx on people (debut);

-- explain select count(*) from people where debut >= '2025-01-01' and debut < '2026-01-01';   -- range on the index
-- explain select count(*) from people where year(debut) = 2025;                                 -- full scan`,
        explanation:
          'The index is sorted by debut, so a range of dates is one contiguous stretch of it. extract(year from debut) is a different value that the index does not store, so the database must compute it for every row. Rewrite the condition as a range on the bare column, or index the expression itself.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Indexes on expressions', url: PG + 'indexes-expressional.html' },
      { label: 'MySQL: Range optimization', url: MY + 'range-optimization.html' },
    ],
  },
  {
    id: 'lahman-085',
    dataset: 'lahman',
    level: 5,
    topics: ['partitioning'],
    title: 'Batting split into two eras',
    prompt:
      'Create batting_by_era with the columns player_id, year_id, stint, team_id, hr, range-partitioned by year_id into 2010–2017 and 2018–2025, and copy those batting columns into it.',
    orderMatters: false,
    checkSql: `select (select count(*) from batting_2010_2017) as early, (select count(*) from batting_2018_2025) as late`,
    checkSqlMysql: `select (select count(*) from batting_by_era partition (p2010_2017)) as early,
       (select count(*) from batting_by_era partition (p2018_2025)) as late`,
    solutions: [
      {
        approach: 'Range partitions on an integer year',
        postgres: `create table batting_by_era (
  player_id varchar(9) not null,
  year_id   smallint   not null,
  stint     smallint   not null,
  team_id   varchar(3) not null,
  hr        smallint,
  primary key (player_id, year_id, stint)
) partition by range (year_id);

create table batting_2010_2017 partition of batting_by_era for values from (2010) to (2018);
create table batting_2018_2025 partition of batting_by_era for values from (2018) to (2026);

insert into batting_by_era select player_id, year_id, stint, team_id, hr from batting;`,
        mysql: `create table batting_by_era (
  player_id varchar(9) not null,
  year_id   smallint   not null,
  stint     smallint   not null,
  team_id   varchar(3) not null,
  hr        smallint,
  primary key (player_id, year_id, stint)
)
partition by range (year_id) (
  partition p2010_2017 values less than (2018),
  partition p2018_2025 values less than (2026)
);

insert into batting_by_era select player_id, year_id, stint, team_id, hr from batting;`,
        mysqlNote: 'Plain RANGE works on an integer expression; RANGE COLUMNS is needed for dates and strings.',
        explanation:
          'year_id is already in the primary key, so the key needs no change. The upper bound is exclusive in both: FROM (2010) TO (2018) holds 2010–2017. 11,460 rows land in the first era and 12,816 in the second.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table partitioning', url: PG + 'ddl-partitioning.html' },
      { label: 'MySQL: RANGE partitioning', url: MY + 'partitioning-range.html' },
    ],
  },
  {
    id: 'lahman-086',
    dataset: 'lahman',
    level: 3,
    topics: ['pivot'],
    title: 'AL East wins, one column per season',
    prompt: 'For the 2025 American League East teams: team_id, name, and their wins in 2021, 2022, 2023, 2024 and 2025, one column per season. Order by team_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'MAX(CASE …) per season',
        postgres: `select t.team_id, max(t.name) filter (where t.year_id = 2025) as name,
       max(t.w) filter (where t.year_id = 2021) as w2021,
       max(t.w) filter (where t.year_id = 2022) as w2022,
       max(t.w) filter (where t.year_id = 2023) as w2023,
       max(t.w) filter (where t.year_id = 2024) as w2024,
       max(t.w) filter (where t.year_id = 2025) as w2025
from teams t
where t.year_id between 2021 and 2025
  and t.team_id in (select team_id from teams where year_id = 2025 and lg_id = 'AL' and div_id = 'E')
group by t.team_id
order by t.team_id;`,
        mysql: `select t.team_id, max(case when t.year_id = 2025 then t.name end) as name,
       max(case when t.year_id = 2021 then t.w end) as w2021,
       max(case when t.year_id = 2022 then t.w end) as w2022,
       max(case when t.year_id = 2023 then t.w end) as w2023,
       max(case when t.year_id = 2024 then t.w end) as w2024,
       max(case when t.year_id = 2025 then t.w end) as w2025
from teams t
where t.year_id between 2021 and 2025
  and t.team_id in (select team_id from teams where year_id = 2025 and lg_id = 'AL' and div_id = 'E')
group by t.team_id
order by t.team_id;`,
        mysqlNote: 'No FILTER in MySQL: CASE without ELSE gives NULL for other seasons, which MAX ignores.',
        explanation:
          'Each team has one row per season, so MAX just picks that season\'s value; any aggregate that returns its single input would do. The column list is fixed in the query: a new season means a new column, which is the price of a pivot in SQL.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Aggregate FILTER', url: PG + 'sql-expressions.html#SYNTAX-AGGREGATES' }],
  },
  {
    id: 'lahman-087',
    dataset: 'lahman',
    level: 5,
    topics: ['full-text'],
    title: 'Stadiums, but not the Yankees\'',
    prompt: 'With a full-text index on teams.park, list the different parks used since 2010 whose name contains the word Stadium but not the word Yankee.',
    orderMatters: true,
    checkSql: `select distinct park from teams
where year_id >= 2010 and to_tsvector('simple', park) @@ to_tsquery('simple', 'stadium & !yankee')
order by park`,
    checkSqlMysql: `select distinct park from teams
where year_id >= 2010 and match(park) against ('+stadium -yankee' in boolean mode)
order by park`,
    solutions: [
      {
        approach: 'NOT in a text query',
        postgres: `create index teams_park_fts on teams using gin (to_tsvector('simple', park));

-- search: where to_tsvector('simple', park) @@ to_tsquery('simple', 'stadium & !yankee')`,
        mysql: `create fulltext index teams_park_ft on teams (park);

-- search: where match(park) against ('+stadium -yankee' in boolean mode)`,
        mysqlNote: 'In boolean mode, + requires a word and - excludes it. A query with only - words returns nothing.',
        explanation:
          'In tsquery, ! negates a word; in MySQL it is a leading -. The search works on words: "Yankee Stadium III" is excluded because it contains the word Yankee, while a LIKE \'%Stadium%\' would also match "Stadiums". Seven parks remain.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: to_tsquery', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES' },
      { label: 'MySQL: Boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'lahman-088',
    dataset: 'lahman',
    level: 5,
    topics: ['locks-isolation', 'transactions'],
    title: 'Reload a team\'s salaries under a table lock',
    prompt:
      'The 2016 Yankees salaries must be reloaded: delete them and insert them again raised by 1% (rounded), while no other session may write to salaries. Lock the table for the reload. In PostgreSQL you are already inside a transaction.',
    orderMatters: false,
    checkSql: `select count(*) as salaries, sum(salary) as total from salaries where year_id = 2016 and team_id = 'NYA'`,
    solutions: [
      {
        approach: 'LOCK TABLE / LOCK TABLES',
        postgres: `lock table salaries in exclusive mode;

create temporary table reload as
select year_id, team_id, lg_id, player_id, round(salary * 1.01) as salary
from salaries where year_id = 2016 and team_id = 'NYA';

delete from salaries where year_id = 2016 and team_id = 'NYA';
insert into salaries (year_id, team_id, lg_id, player_id, salary) select * from reload;`,
        mysql: `create temporary table reload as
select year_id, team_id, lg_id, player_id, round(salary * 1.01) as salary
from salaries where year_id = 2016 and team_id = 'NYA';

lock tables salaries write, reload read;

delete from salaries where year_id = 2016 and team_id = 'NYA';
insert into salaries (year_id, team_id, lg_id, player_id, salary) select * from reload;

unlock tables;`,
        mysqlNote:
          'LOCK TABLES must name every table the session will touch while it holds the locks, the temporary one included. It also commits any open transaction, so it does not mix with START TRANSACTION; UNLOCK TABLES releases everything.',
        explanation:
          'EXCLUSIVE mode in PostgreSQL blocks every other writer but still lets readers in; they see the old rows until the transaction commits. It is released at commit, never earlier. Row locks would do for a few rows; a table lock is for a bulk job where locking row by row is pointless.',
      },
    ],
    docs: [
      { label: 'PostgreSQL: Table-level locks', url: PG + 'explicit-locking.html#LOCKING-TABLES' },
      { label: 'MySQL: LOCK TABLES', url: MY + 'lock-tables.html' },
    ],
  },
  {
    id: 'lahman-089',
    dataset: 'lahman',
    level: 4,
    topics: ['arrays', 'json'],
    title: 'Yankees and Red Sox, both',
    prompt: 'Collect the teams each player batted for (2010 on) into a list, then count the players whose list contains both NYA and BOS.',
    hint: SEASONS_NOTE,
    orderMatters: false,
    solutions: [
      {
        approach: 'array_agg and @> / JSON_ARRAYAGG and JSON_CONTAINS',
        postgres: `with careers as (
  select player_id, array_agg(distinct team_id) as teams
  from batting
  group by player_id
)
select count(*) as players
from careers
where teams @> array['NYA', 'BOS']::varchar[];`,
        mysql: `with careers as (
  select player_id, json_arrayagg(team_id) as teams
  from batting
  group by player_id
)
select count(*) as players
from careers
where json_contains(teams, '["NYA", "BOS"]');`,
        mysqlNote: 'A JSON array replaces the PostgreSQL array; JSON_CONTAINS checks that both team ids appear in it.',
        explanation:
          '41 players have worn both uniforms since 2010. The list form answers "which players have played for all of these teams" for any set of teams by changing one literal; with plain joins, each extra team means another join.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Array operators', url: PG + 'functions-array.html' }],
  },
  {
    id: 'lahman-090',
    dataset: 'lahman',
    level: 4,
    topics: ['merge'],
    title: 'Bring a last-season table up to date',
    prompt:
      'franchise_last_season (franch_id, last_season) was built a year ago. Run the setup below, then update it from teams in one statement, changing only rows whose value is out of date.\n\nSetup: create table franchise_last_season as select franch_id, max(year_id) as last_season from teams where year_id < 2025 group by franch_id;',
    orderMatters: true,
    checkSql: `select last_season, count(*) as franchises from franchise_last_season where last_season >= 2024 group by last_season order by last_season`,
    solutions: [
      {
        approach: 'MERGE with a condition on WHEN MATCHED',
        postgres: `create table franchise_last_season as
select franch_id, max(year_id) as last_season from teams where year_id < 2025 group by franch_id;

merge into franchise_last_season f
using (select franch_id, max(year_id) as last_season from teams group by franch_id) t
on t.franch_id = f.franch_id
when matched and f.last_season <> t.last_season then
  update set last_season = t.last_season
when not matched then
  insert (franch_id, last_season) values (t.franch_id, t.last_season)
returning merge_action(), f.franch_id, f.last_season;`,
        mysql: `create table franchise_last_season as
select franch_id, max(year_id) as last_season from teams where year_id < 2025 group by franch_id;

update franchise_last_season f
join (select franch_id, max(year_id) as last_season from teams group by franch_id) t
  on t.franch_id = f.franch_id
set f.last_season = t.last_season
where f.last_season <> t.last_season;

insert into franchise_last_season (franch_id, last_season)
select t.franch_id, max(t.year_id) from teams t
where not exists (select 1 from franchise_last_season f where f.franch_id = t.franch_id)
group by t.franch_id;`,
        mysqlNote: 'No MERGE: a joined UPDATE for changed rows plus an INSERT for new ones.',
        explanation:
          'The 30 active franchises move from 2024 to 2025; the other 90 rows already hold their last season and are not touched. RETURNING merge_action() (PostgreSQL 17+) reports for each changed row whether it was an UPDATE, INSERT or DELETE, handy for a sync log.',
      },
    ],
    docs: [{ label: 'PostgreSQL: MERGE', url: PG + 'sql-merge.html' }],
  },
  {
    id: 'lahman-091',
    dataset: 'lahman',
    level: 2,
    topics: ['full-join', 'distinct'],
    title: 'Batters and pitchers of 2025',
    prompt: 'Compare the players with a 2025 batting row and those with a 2025 pitching row: how many appear in both tables, only in batting, only in pitching?',
    orderMatters: false,
    solutions: [
      {
        approach: 'FULL JOIN of two distinct player lists',
        postgres: `with b as (select distinct player_id from batting where year_id = 2025),
     p as (select distinct player_id from pitching where year_id = 2025)
select count(*) filter (where b.player_id is not null and p.player_id is not null) as both_tables,
       count(*) filter (where p.player_id is null) as batting_only,
       count(*) filter (where b.player_id is null) as pitching_only
from b
full join p on p.player_id = b.player_id;`,
        mysql: `with b as (select distinct player_id from batting where year_id = 2025),
     p as (select distinct player_id from pitching where year_id = 2025)
select (select count(*) from b join p on p.player_id = b.player_id) as both_tables,
       (select count(*) from b where not exists (select 1 from p where p.player_id = b.player_id)) as batting_only,
       (select count(*) from p where not exists (select 1 from b where b.player_id = p.player_id)) as pitching_only;`,
        mysqlNote: 'No FULL JOIN in MySQL: one join and two anti-joins.',
        explanation:
          'pitching_only is 0: in this data every 2025 pitcher also has a batting row, even one who never came to the plate. A FULL JOIN is how such an assumption gets checked rather than trusted. 873 players pitched; 597 only batted.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'lahman-092',
    dataset: 'lahman',
    level: 3,
    topics: ['subtotals'],
    title: '2025 attendance by league and by division',
    prompt:
      'Total 2025 home attendance per league, per division letter (E, C, W across both leagues), and overall, in one result: dimension (\'league\', \'division\' or \'total\'), value and attendance.',
    orderMatters: true,
    solutions: [
      {
        approach: 'GROUPING SETS of two independent groupings',
        postgres: `select case when grouping(lg_id) = 0 then 'league'
            when grouping(div_id) = 0 then 'division'
            else 'total' end as dimension,
       coalesce(lg_id, div_id, 'all') as value,
       sum(attendance) as attendance
from teams
where year_id = 2025
group by grouping sets ((lg_id), (div_id), ())
order by dimension, value;`,
        mysql: `select 'league' as dimension, lg_id as value, sum(attendance) as attendance from teams where year_id = 2025 group by lg_id
union all
select 'division', div_id, sum(attendance) from teams where year_id = 2025 group by div_id
union all
select 'total', 'all', sum(attendance) from teams where year_id = 2025
order by dimension, value;`,
        mysqlNote: 'No GROUPING SETS in MySQL; three GROUP BYs joined with UNION ALL return the same rows.',
        explanation:
          'ROLLUP (lg_id, div_id) would give divisions within leagues; here the division letters are grouped across leagues, which only GROUPING SETS can list side by side. The West divisions draw the most fans.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUPING SETS', url: PG + 'queries-table-expressions.html#QUERIES-GROUPING-SETS' }],
  },
  {
    id: 'lahman-093',
    dataset: 'lahman',
    level: 4,
    topics: ['normalization'],
    title: 'Does the team decide the league?',
    prompt:
      'Someone proposes moving lg_id out of teams into a lookup table keyed by team_id. Check whether team_id determines lg_id: list every team_id that played in more than one league, with the leagues and the years.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Test a functional dependency with GROUP BY … HAVING',
        postgres: `select team_id,
       string_agg(distinct lg_id, ', ' order by lg_id) as leagues,
       min(year_id) as first_season, max(year_id) as last_season
from teams
group by team_id
having count(distinct lg_id) > 1
order by team_id;`,
        mysql: `select team_id,
       group_concat(distinct lg_id order by lg_id separator ', ') as leagues,
       min(year_id) as first_season, max(year_id) as last_season
from teams
group by team_id
having count(distinct lg_id) > 1
order by team_id;`,
        explanation:
          'A dependency team_id → lg_id holds only if every team_id has one league. Houston breaks it: the Astros moved from the NL to the AL in 2013. The league belongs to a team-season, so (team_id, year_id) → lg_id is the real dependency, and the proposed lookup table would be wrong for Houston.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUP BY and HAVING', url: PG + 'queries-table-expressions.html#QUERIES-GROUP' }],
  },
  {
    id: 'lahman-094',
    dataset: 'lahman',
    level: 5,
    topics: ['full-text', 'text-search'],
    title: 'Born in San something',
    prompt: 'With a full-text index on people.birth_city, count the people born in a city containing the word San (San Diego, San Pedro de Macoris, …), not merely starting with "San" (Santo Domingo, Santiago).',
    orderMatters: false,
    checkSql: `select count(*) as people from people where to_tsvector('simple', birth_city) @@ to_tsquery('simple', 'san')`,
    checkSqlMysql: `select count(*) as people from people where match(birth_city) against ('+san' in boolean mode)`,
    solutions: [
      {
        approach: 'Word search instead of a prefix',
        postgres: `create index people_birth_city_fts on people using gin (to_tsvector('simple', birth_city));

-- search: where to_tsvector('simple', birth_city) @@ to_tsquery('simple', 'san')`,
        mysql: `create fulltext index people_birth_city_ft on people (birth_city);

-- search: where match(birth_city) against ('+san' in boolean mode)`,
        mysqlNote: '"San" has exactly the minimum token length (3) MySQL indexes by default.',
        explanation:
          'LIKE \'San%\' finds 607 people, because Santo Domingo and Santiago also start with those letters; the word search finds 319. A NULL birth_city produces an empty tsvector and simply never matches.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Text search', url: PG + 'textsearch-intro.html' }],
  },
  {
    id: 'lahman-095',
    dataset: 'lahman',
    level: 2,
    topics: ['text-aggregation'],
    title: 'Who beat whom in the 2024 playoffs',
    prompt:
      'For each team that won a 2024 postseason series: the team and the teams it beat, in playoff order (wild card, division series, championship series, World Series), separated by ", ". Order by the number of series won (most first), then team.',
    orderMatters: true,
    solutions: [
      {
        approach: 'string_agg ordered by a stage number',
        postgres: `select team_id_winner as team,
       count(*) as series_won,
       string_agg(team_id_loser, ', ' order by
         case when round like '%WC%' then 1 when round like '%DS%' then 2 when round like '%CS' then 3 else 4 end
       ) as beat
from series_post
where year_id = 2024
group by team_id_winner
order by series_won desc, team;`,
        mysql: `select team_id_winner as team,
       count(*) as series_won,
       group_concat(team_id_loser order by
         case when round like '%WC%' then 1 when round like '%DS%' then 2 when round like '%CS' then 3 else 4 end
         separator ', '
       ) as beat
from series_post
where year_id = 2024
group by team_id_winner
order by series_won desc, team;`,
        mysqlNote: 'ROUND is a function name in MySQL but works as a column name here without quotes.',
        explanation:
          'Sorting by the round code as text would put ALCS before ALDS1, which is backwards in time; the CASE turns codes into stages. The Dodgers (LAN) won three series, beating SDN, NYN and the Yankees.',
      },
    ],
    docs: [{ label: 'PostgreSQL: string_agg', url: PG + 'functions-aggregate.html' }],
  },
  {
    id: 'lahman-096',
    dataset: 'lahman',
    level: 3,
    topics: ['cte', 'aggregates'],
    title: 'Mid-season manager changes of 2025',
    prompt:
      'For teams with more than one manager in 2025: each manager\'s games, wins and winning percentage (3 decimals), next to the team\'s overall winning percentage. Order by team, then the manager\'s order (inseason).',
    orderMatters: true,
    solutions: [
      {
        approach: 'Pick the teams in one CTE, compute in the next',
        postgres: `with changed as (
  select team_id from managers where year_id = 2025 group by team_id having count(*) > 1
),
team_pct as (
  select team_id, round(w::numeric / (w + l), 3) as team_pct from teams where year_id = 2025
)
select m.team_id, m.inseason, p.name_last, m.g, m.w,
       round(m.w::numeric / nullif(m.w + m.l, 0), 3) as manager_pct, t.team_pct
from managers m
join changed c on c.team_id = m.team_id
join team_pct t on t.team_id = m.team_id
join people p on p.player_id = m.player_id
where m.year_id = 2025
order by m.team_id, m.inseason;`,
        mysql: `with changed as (
  select team_id from managers where year_id = 2025 group by team_id having count(*) > 1
),
team_pct as (
  select team_id, round(w / (w + l), 3) as team_pct from teams where year_id = 2025
)
select m.team_id, m.inseason, p.name_last, m.g, m.w,
       round(m.w / nullif(m.w + m.l, 0), 3) as manager_pct, t.team_pct
from managers m
join changed c on c.team_id = m.team_id
join team_pct t on t.team_id = m.team_id
join people p on p.player_id = m.player_id
where m.year_id = 2025
order by m.team_id, m.inseason;`,
        mysqlNote: 'MySQL / always returns a decimal, so no cast is needed.',
        explanation:
          'In PostgreSQL w / (w + l) with integers would be 0, hence ::numeric. NULLIF guards a manager with no decided games. Eight teams used more than one manager; the Angels three.',
      },
    ],
    docs: [{ label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' }],
  },
  {
    id: 'lahman-097',
    dataset: 'lahman',
    level: 3,
    topics: ['date-series', 'set-operations'],
    title: 'The years Washington had no team',
    prompt: 'Between 1901 and 2025, in which seasons did no team whose name starts with "Washington" play? Show the first and last such season and how many there were.',
    orderMatters: false,
    solutions: [
      {
        approach: 'Year series EXCEPT years with a Washington team',
        postgres: `select min(season) as first_season, max(season) as last_season, count(*) as seasons
from (
  select y as season from generate_series(1901, 2025) as y
  except
  select year_id from teams where name like 'Washington%'
) missing;`,
        mysql: `with recursive years (y) as (
  select 1901 union all select y + 1 from years where y < 2025
)
select min(season) as first_season, max(season) as last_season, count(*) as seasons
from (
  select y as season from years
  except
  select year_id from teams where name like 'Washington%'
) missing;`,
        mysqlNote: 'EXCEPT needs MySQL 8.0.31 or later; the recursive CTE replaces generate_series.',
        explanation:
          'The missing seasons form one block, 1972 to 2004: the second Senators left for Texas after 1971 and the Expos moved in as the Nationals in 2005. Only min and max are safe here because the gap is a single run; with several gaps, a gaps-and-islands query would be needed.',
      },
    ],
    docs: [{ label: 'PostgreSQL: generate_series', url: PG + 'functions-srf.html' }],
  },
  {
    id: 'lahman-098',
    dataset: 'lahman',
    level: 4,
    topics: ['constraints', 'ddl'],
    title: 'Rules a batting line must follow',
    prompt: 'Add named CHECK constraints to batting: hits cannot exceed at-bats, home runs cannot exceed hits, and no count may be negative (check g, ab, h, hr). Then count the CHECK constraints on batting.',
    orderMatters: false,
    checkSql: `select count(*) as check_constraints from pg_constraint where conrelid = 'batting'::regclass and contype = 'c'`,
    checkSqlMysql: `select count(*) as check_constraints
from information_schema.table_constraints
where table_schema = database() and table_name = 'batting' and constraint_type = 'CHECK'`,
    solutions: [
      {
        approach: 'ALTER TABLE … ADD CONSTRAINT … CHECK',
        postgres: `alter table batting
  add constraint batting_h_le_ab   check (h <= ab),
  add constraint batting_hr_le_h   check (hr <= h),
  add constraint batting_counts_ge_0 check (g >= 0 and ab >= 0 and h >= 0 and hr >= 0);`,
        mysql: `alter table batting
  add constraint batting_h_le_ab   check (h <= ab),
  add constraint batting_hr_le_h   check (hr <= h),
  add constraint batting_counts_ge_0 check (g >= 0 and ab >= 0 and h >= 0 and hr >= 0);`,
        explanation:
          'All 24,276 existing rows are checked first and pass. A CHECK with a NULL inside counts as passed (NULL is not false), so a row with unknown at-bats is still accepted; add NOT NULL where a value must be known.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Check constraints', url: PG + 'ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS' }],
  },
  {
    id: 'lahman-099',
    dataset: 'lahman',
    level: 1,
    topics: ['limit'],
    title: 'The best-attended teams of 2025',
    prompt: 'Show the 5 teams with the highest home attendance in 2025: team_id, name and attendance.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ORDER BY … DESC, LIMIT',
        postgres: `select team_id, name, attendance
from teams
where year_id = 2025
order by attendance desc, team_id
limit 5;`,
        mysql: `select team_id, name, attendance
from teams
where year_id = 2025
order by attendance desc, team_id
limit 5;`,
        explanation: 'The Dodgers drew over four million fans. Filter the season first, then sort, then cut: the LIMIT applies to the sorted result, never before it.',
      },
    ],
    docs: [{ label: 'PostgreSQL: LIMIT and OFFSET', url: PG + 'queries-limit.html' }],
  },
  {
    id: 'lahman-100',
    dataset: 'lahman',
    level: 2,
    topics: ['casting', 'strings'],
    title: 'Innings pitched, the baseball way',
    prompt:
      'pitching stores outs (ipouts). Baseball writes innings as whole innings, a dot and the extra outs: 616 outs is "205.1". Show the 3 pitchers of 2025 with the most outs: player_id, ipouts and innings in that notation.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Integer division and remainder, cast to text',
        postgres: `select player_id, ipouts,
       (ipouts / 3)::text || '.' || (ipouts % 3)::text as innings
from pitching
where year_id = 2025
order by ipouts desc, player_id
limit 3;`,
        mysql: `select player_id, ipouts,
       concat(ipouts div 3, '.', ipouts % 3) as innings
from pitching
where year_id = 2025
order by ipouts desc, player_id
limit 3;`,
        mysqlNote: 'DIV is integer division; CONCAT converts the numbers to text by itself.',
        explanation:
          '"205.1" is not the number 205.1: the digit after the dot counts outs (0, 1 or 2), not tenths. Storing outs and formatting only for display keeps arithmetic correct; summing the text values would be nonsense.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Type conversion', url: PG + 'typeconv.html' }],
  },
  {
    id: 'lahman-101',
    dataset: 'lahman',
    level: 4,
    topics: ['generated-columns', 'null'],
    title: 'Strikeouts per nine innings as a column',
    prompt:
      'Add a stored generated column k_per_9 to pitching: so × 27 / ipouts with 2 decimals, NULL when ipouts is 0 or missing. Then: the 3 best of 2025 among pitchers with at least 486 outs (162 innings).',
    orderMatters: true,
    checkSql: `select player_id, so, ipouts, k_per_9 from pitching where year_id = 2025 and ipouts >= 486 order by k_per_9 desc, player_id limit 3`,
    solutions: [
      {
        approach: 'NULLIF guards the division',
        postgres: `alter table pitching
add column k_per_9 numeric(5, 2)
generated always as (round(so * 27.0 / nullif(ipouts, 0), 2)) stored;`,
        mysql: `alter table pitching
add column k_per_9 decimal(5, 2)
generated always as (round(so * 27 / nullif(ipouts, 0), 2)) stored;`,
        explanation:
          '27 outs make nine innings, so so × 27 / ipouts is strikeouts per nine. Pitchers who never recorded an out would divide by zero; NULLIF turns that into NULL, which an error-free generated column needs. Dylan Cease leads at 11.52.',
      },
    ],
    docs: [{ label: 'PostgreSQL: NULLIF', url: PG + 'functions-conditional.html#FUNCTIONS-NULLIF' }],
  },
  {
    id: 'lahman-102',
    dataset: 'lahman',
    level: 5,
    topics: ['triggers', 'constraints'],
    title: 'All-Stars must have played that season',
    prompt:
      'Add a trigger that rejects a new allstar_full row unless the player has a batting or pitching row in the same season. Then add abelmi01 (PHI, NL) to the 2025 game: game_num 0, gp 1.',
    orderMatters: false,
    checkSql: `select player_id, year_id, team_id, lg_id, gp from allstar_full where player_id = 'abelmi01' and year_id = 2025`,
    solutions: [
      {
        approach: 'BEFORE INSERT trigger with EXISTS',
        postgres: `create function check_allstar_played() returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from batting where player_id = new.player_id and year_id = new.year_id)
     and not exists (select 1 from pitching where player_id = new.player_id and year_id = new.year_id) then
    raise exception 'player % did not play in %', new.player_id, new.year_id;
  end if;
  return new;
end;
$$;

create trigger allstar_played
before insert on allstar_full
for each row execute function check_allstar_played();

insert into allstar_full (player_id, year_id, game_num, team_id, lg_id, gp)
values ('abelmi01', 2025, 0, 'PHI', 'NL', 1);`,
        mysql: `create trigger allstar_played
before insert on allstar_full
for each row
begin
  if not exists (select 1 from batting where player_id = new.player_id and year_id = new.year_id)
     and not exists (select 1 from pitching where player_id = new.player_id and year_id = new.year_id) then
    signal sqlstate '45000' set message_text = 'player did not play in that season';
  end if;
end;

insert into allstar_full (player_id, year_id, game_num, team_id, lg_id, gp)
values ('abelmi01', 2025, 0, 'PHI', 'NL', 1);`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'A foreign key can only point to one table and needs the exact key; "a row exists in batting OR pitching for that player and season" needs a trigger. Inserting a player without a 2025 season would now fail with a clear message.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Trigger functions', url: PG + 'plpgsql-trigger.html' }],
  },
  {
    id: 'lahman-103',
    dataset: 'lahman',
    level: 3,
    topics: ['recursive', 'strings'],
    title: 'Five teams in one season',
    prompt:
      'Jose Urena (urenajo01) played for five teams in 2025, one stint after another. Starting from stint 1, follow stint → stint + 1 with a recursive CTE and build the path as text like "NYN → TOR → …". Show the number of teams and the path.',
    hint: STINT_NOTE,
    orderMatters: false,
    solutions: [
      {
        approach: 'Walk the stints like a linked list',
        postgres: `with recursive path (stint, teams, route) as (
  select stint, 1, team_id::text
  from batting
  where player_id = 'urenajo01' and year_id = 2025 and stint = 1
  union all
  select b.stint, p.teams + 1, p.route || ' → ' || b.team_id
  from path p
  join batting b on b.player_id = 'urenajo01' and b.year_id = 2025 and b.stint = p.stint + 1
)
select teams, route
from path
order by stint desc
limit 1;`,
        mysql: `with recursive path (stint, teams, route) as (
  select stint, 1, cast(team_id as char(100))
  from batting
  where player_id = 'urenajo01' and year_id = 2025 and stint = 1
  union all
  select b.stint, p.teams + 1, concat(p.route, ' → ', b.team_id)
  from path p
  join batting b on b.player_id = 'urenajo01' and b.year_id = 2025 and b.stint = p.stint + 1
)
select teams, route
from path
order by stint desc
limit 1;`,
        mysqlNote: 'The anchor CASTs the route wide enough for the whole path, since the recursive CTE takes its column type from the anchor.',
        explanation:
          'Each step looks for the next stint number; the walk stops at stint 5, where no stint 6 exists, and the last row holds the full path: NYN → TOR → LAN → MIN → LAA. STRING_AGG ordered by stint would give the same here; the recursive form is what you need when the "next" link is not a simple counter.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Recursive queries', url: PG + 'queries-with.html#QUERIES-WITH-RECURSIVE' }],
  },
  {
    id: 'lahman-104',
    dataset: 'lahman',
    level: 3,
    topics: ['gaps-islands'],
    title: 'Division titles in a row',
    prompt: 'Find the 3 longest runs of consecutive seasons in which a franchise won its division (div_win = \'Y\'): franch_id, first and last season, number of titles. Longest first, then franch_id.',
    orderMatters: true,
    solutions: [
      {
        approach: 'Season minus row number per franchise',
        postgres: `with titles as (
  select franch_id, year_id from teams where div_win = 'Y'
),
runs as (
  select franch_id, year_id, year_id - row_number() over (partition by franch_id order by year_id) as grp
  from titles
)
select franch_id, min(year_id) as first_season, max(year_id) as last_season, count(*) as titles
from runs
group by franch_id, grp
order by titles desc, franch_id
limit 3;`,
        mysql: `with titles as (
  select franch_id, year_id from teams where div_win = 'Y'
),
runs as (
  select franch_id, year_id, year_id - row_number() over (partition by franch_id order by year_id) as grp
  from titles
)
select franch_id, min(year_id) as first_season, max(year_id) as last_season, count(*) as titles
from runs
group by franch_id, grp
order by titles desc, franch_id
limit 3;`,
        explanation:
          'Atlanta won 11 straight division titles from 1995 to 2005. They had also won in 1991–1993; the run "breaks" at 1994 only because the strike cancelled the postseason and no division winners were recorded, a reminder that a gap in data is not always a gap in reality.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Window functions', url: PG + 'functions-window.html' }],
  },
  {
    id: 'lahman-105',
    dataset: 'lahman',
    level: 4,
    topics: ['temp-tables', 'aggregates'],
    title: 'The $20 million club',
    prompt:
      'Store every salary of 20,000,000 or more in a temporary table big_salaries (year_id, team_id, player_id, salary). Then: the 3 teams with the most such salaries, with the count and the largest.',
    hint: SEASONS_NOTE,
    orderMatters: true,
    checkSql: `select team_id, count(*) as big_salaries, max(salary) as largest from big_salaries group by team_id order by big_salaries desc, team_id limit 3`,
    solutions: [
      {
        approach: 'CREATE TEMPORARY TABLE … AS',
        postgres: `create temporary table big_salaries as
select year_id, team_id, player_id, salary from salaries where salary >= 20000000;`,
        mysql: `create temporary table big_salaries as
select year_id, team_id, player_id, salary from salaries where salary >= 20000000;`,
        explanation: '135 rows out of 5,804. The Yankees account for 28 of them, nearly twice the next team. Further questions (by year, by player) now scan 135 rows instead of the full salary table.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE TABLE AS', url: PG + 'sql-createtableas.html' }],
  },
  {
    id: 'lahman-106',
    dataset: 'lahman',
    level: 5,
    topics: ['procedures', 'control-flow'],
    title: 'Record a salary, with checks',
    prompt:
      'Write a procedure add_salary(p_player_id, p_team_id, p_year, p_salary) that refuses a negative salary and a player who has no batting or pitching row for that team and season, and inserts otherwise. Record 40,000,000 for judgeaa01, NYA, 2025.',
    orderMatters: false,
    checkSql: `select year_id, team_id, lg_id, player_id, salary from salaries where player_id = 'judgeaa01'`,
    solutions: [
      {
        approach: 'Validate, look up the league, insert',
        postgres: `create procedure add_salary(p_player_id varchar, p_team_id varchar, p_year integer, p_salary integer)
language plpgsql
as $$
declare
  v_lg varchar;
begin
  if p_salary < 0 then
    raise exception 'salary cannot be negative';
  end if;
  if not exists (select 1 from batting where player_id = p_player_id and team_id = p_team_id and year_id = p_year)
     and not exists (select 1 from pitching where player_id = p_player_id and team_id = p_team_id and year_id = p_year) then
    raise exception '% did not play for % in %', p_player_id, p_team_id, p_year;
  end if;

  select lg_id into v_lg from teams where team_id = p_team_id and year_id = p_year;
  insert into salaries (year_id, team_id, lg_id, player_id, salary) values (p_year, p_team_id, v_lg, p_player_id, p_salary);
end;
$$;

call add_salary('judgeaa01', 'NYA', 2025, 40000000);`,
        mysql: `create procedure add_salary(p_player_id varchar(9), p_team_id char(3), p_year int, p_salary int)
begin
  declare v_lg char(2);
  if p_salary < 0 then
    signal sqlstate '45000' set message_text = 'salary cannot be negative';
  end if;
  if not exists (select 1 from batting where player_id = p_player_id and team_id = p_team_id and year_id = p_year)
     and not exists (select 1 from pitching where player_id = p_player_id and team_id = p_team_id and year_id = p_year) then
    signal sqlstate '45000' set message_text = 'player did not play for that team in that season';
  end if;

  select lg_id into v_lg from teams where team_id = p_team_id and year_id = p_year;
  insert into salaries (year_id, team_id, lg_id, player_id, salary) values (p_year, p_team_id, v_lg, p_player_id, p_salary);
end;

call add_salary('judgeaa01', 'NYA', 2025, 40000000);`,
        mysqlNote: DELIMITER_NOTE,
        explanation:
          'The caller passes four values; the procedure finds the league itself, so lg_id can never disagree with teams. The salary data ends in 2016, so this is Judge\'s first row in salaries.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE PROCEDURE', url: PG + 'sql-createprocedure.html' }],
  },
  {
    id: 'lahman-107',
    dataset: 'lahman',
    level: 5,
    topics: ['partial-covering-indexes'],
    title: 'An index for the biggest contracts',
    prompt:
      'A page lists salaries of 20,000,000 or more by year with team and player. They are 135 of 5,804 rows. Create an index for exactly those rows that serves the page from the index alone.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'salaries' and indexdef like '%salary%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'salaries' and column_name = 'salary'`,
    solutions: [
      {
        approach: 'Partial covering index',
        postgres: `create index salaries_big_idx on salaries (year_id) include (team_id, player_id, salary)
where salary >= 20000000;`,
        mysql: null,
        mysqlNote: 'No partial indexes in MySQL; see solution B.',
        explanation: 'About 2% of the rows, sorted by year, with the shown columns included. The page\'s WHERE must contain salary >= 20000000 (or a stricter condition) for the index to be chosen.',
      },
      {
        approach: 'Index led by salary',
        postgres: `create index salaries_salary_idx on salaries (salary, year_id, team_id, player_id);`,
        mysql: `create index salaries_salary_idx on salaries (salary, year_id, team_id, player_id);`,
        explanation: 'salary >= 20000000 is a range at the top of this index; the result still needs a sort by year.',
      },
    ],
    comparison: 'Both answer from the index. The partial one is tiny and pre-sorted by year.',
    docs: [{ label: 'PostgreSQL: Partial indexes', url: PG + 'indexes-partial.html' }],
  },
  {
    id: 'lahman-108',
    dataset: 'lahman',
    level: 2,
    topics: ['self-cross-join'],
    title: 'Same name, different player',
    prompt: 'Among people who debuted in 2010 or later, how many pairs of different players have exactly the same first and last name (same letters and accents)?',
    orderMatters: false,
    solutions: [
      {
        approach: 'Self-join on both name columns, exact comparison',
        postgres: `select count(*) as pairs
from people a
join people b
  on b.name_first = a.name_first
 and b.name_last = a.name_last
 and b.player_id > a.player_id
where a.debut >= '2010-01-01' and b.debut >= '2010-01-01';`,
        mysql: `select count(*) as pairs
from people a
join people b
  on b.name_first = a.name_first collate utf8mb4_bin
 and b.name_last = a.name_last collate utf8mb4_bin
 and b.player_id > a.player_id
where a.debut >= '2010-01-01' and b.debut >= '2010-01-01';`,
        mysqlNote: 'Without COLLATE utf8mb4_bin MySQL would also pair "Jose" with "José" and count 36 instead of 33.',
        explanation:
          '33 pairs, such as the two Josh Bells and two Logan Allens; Lahman tells them apart by the number at the end of player_id. Names are not identifiers, and whether "Jose" equals "José" is a collation decision you must make on purpose.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' }],
  },
  {
    id: 'lahman-109',
    dataset: 'lahman',
    level: 3,
    topics: ['subtotals', 'null'],
    title: 'How the new players bat and throw',
    prompt:
      'For players who debuted in 2020 or later: count by bats and throws, with a subtotal per bats value and a grand total. Label totals \'all\', and keep them apart from real missing values.',
    orderMatters: true,
    solutions: [
      {
        approach: 'ROLLUP with GROUPING() for the labels',
        postgres: `select case when grouping(bats) = 1 then 'all' else coalesce(bats, '?') end as bats,
       case when grouping(throws) = 1 then 'all' else coalesce(throws, '?') end as throws,
       count(*) as players
from people
where debut >= '2020-01-01'
group by rollup (bats, throws)
order by grouping(bats), bats, grouping(throws), throws;`,
        mysql: `select case when gb = 1 then 'all' else coalesce(b, '?') end as bats,
       case when gt = 1 then 'all' else coalesce(t, '?') end as throws,
       players
from (
  select bats as b, throws as t, count(*) as players, grouping(bats) as gb, grouping(throws) as gt
  from people
  where debut >= '2020-01-01'
  group by bats, throws with rollup
) x
order by gb, b, gt, t;`,
        explanation:
          'COALESCE(bats, \'all\') would also relabel a player whose bats value is genuinely unknown; GROUPING() tells a total row (1) from a real NULL (0), so only totals say \'all\'. Most new players bat and throw right (949); 6 switch-hitters throw left.',
      },
    ],
    docs: [{ label: 'PostgreSQL: GROUPING', url: PG + 'functions-aggregate.html#FUNCTIONS-GROUPING-TABLE' }],
  },
  {
    id: 'lahman-110',
    dataset: 'lahman',
    level: 4,
    topics: ['materialized-views'],
    title: 'A run-differential leaderboard, stored',
    prompt: 'Store per team season since 2010: year_id, team_id, name, runs scored, runs allowed and run differential. Refresh it after each season. Then: the 3 best 2025 differentials.',
    orderMatters: true,
    checkSql: `select team_id, name, run_diff from team_run_diff where year_id = 2025 order by run_diff desc, team_id limit 3`,
    solutions: [
      {
        approach: 'Materialized view keyed by (year_id, team_id)',
        postgres: `create materialized view team_run_diff as
select year_id, team_id, name, r as runs, ra as runs_allowed, r - ra as run_diff
from teams
where year_id >= 2010;

create unique index team_run_diff_key on team_run_diff (year_id, team_id);`,
        mysql: `create table team_run_diff (
  year_id      smallint,
  team_id      char(3),
  name         varchar(50),
  runs         smallint,
  runs_allowed smallint,
  run_diff     smallint,
  primary key (year_id, team_id)
);

replace into team_run_diff
select year_id, team_id, name, r, ra, r - ra from teams where year_id >= 2010;`,
        mysqlNote: 'A keyed table refreshed by REPLACE INTO stands in for the materialized view.',
        explanation: 'Milwaukee outscored opponents by 172 runs in 2025, ahead of the Yankees (164). Run differential predicts future records better than wins do, which is why analysts keep it handy.',
      },
    ],
    docs: [{ label: 'PostgreSQL: CREATE MATERIALIZED VIEW', url: PG + 'sql-creatematerializedview.html' }],
  },
  {
    id: 'lahman-111',
    dataset: 'lahman',
    level: 4,
    topics: ['arrays', 'aggregates'],
    title: 'One-club players',
    prompt: 'Collect the distinct teams each player batted for since 2010 into a list. Show the players whose list has exactly one team and who played at least 12 seasons: player_id, name, team, seasons. Most seasons first.',
    hint: SEASONS_NOTE,
    orderMatters: true,
    solutions: [
      {
        approach: 'cardinality of an aggregated array',
        postgres: `select b.player_id, p.name_first || ' ' || p.name_last as name,
       (array_agg(distinct b.team_id))[1] as team, count(distinct b.year_id) as seasons
from batting b
join people p on p.player_id = b.player_id
group by b.player_id, p.name_first, p.name_last
having cardinality(array_agg(distinct b.team_id)) = 1 and count(distinct b.year_id) >= 12
order by seasons desc, b.player_id;`,
        mysql: `select b.player_id, concat(p.name_first, ' ', p.name_last) as name,
       min(b.team_id) as team, count(distinct b.year_id) as seasons
from batting b
join people p on p.player_id = b.player_id
group by b.player_id, p.name_first, p.name_last
having count(distinct b.team_id) = 1 and count(distinct b.year_id) >= 12
order by seasons desc, b.player_id;`,
        mysqlNote: 'Without arrays, COUNT(DISTINCT team_id) = 1 asks the same question, and MIN() returns that single team.',
        explanation:
          'Clayton Kershaw leads with 16 seasons, all with the Dodgers. "One club" here means since 2010: Miguel Cabrera appears because his Florida years are earlier than this data.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Array functions', url: PG + 'functions-array.html' }],
  },
  {
    id: 'lahman-112',
    dataset: 'lahman',
    level: 5,
    topics: ['query-plans', 'indexes'],
    title: 'All seasons of one team',
    prompt:
      'batting has an index on (year_id, team_id). A team page asks for all batting rows of NYA across seasons (where team_id = \'NYA\'). Explain why that index cannot help, and add one that does.',
    orderMatters: false,
    checkSql: `select count(*) > 0 as has_index from pg_indexes where tablename = 'batting' and indexdef like '%(team_id%'`,
    checkSqlMysql: `select count(*) > 0 as has_index
from information_schema.statistics
where table_schema = database() and table_name = 'batting' and column_name = 'team_id' and seq_in_index = 1`,
    solutions: [
      {
        approach: 'Lead with the column you filter on',
        postgres: `create index batting_team_year_idx on batting (team_id, year_id);

-- explain select * from batting where team_id = 'NYA' order by year_id;`,
        mysql: `create index batting_team_year_idx on batting (team_id, year_id);

-- explain select * from batting where team_id = 'NYA' order by year_id;`,
        explanation:
          'The existing index is sorted by year first; NYA rows are spread over 16 separate year sections, so a filter on team alone means visiting all of them (PostgreSQL may still try a full index scan, MySQL 8 a skip scan, but neither is a direct lookup). With team_id first, all NYA rows are one contiguous range, already in year order.',
      },
    ],
    docs: [{ label: 'PostgreSQL: Multicolumn indexes', url: PG + 'indexes-multicolumn.html' }],
  },
]
