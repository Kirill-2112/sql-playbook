import type { Exercise } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

/** One step of a Chinook lab (src/content/labs.ts): a level 3 exercise like any other, verified on both databases. */
function step(id: string, topics: string[], title: string, prompt: string, sql: string, approach: string, explanation: string, docs: Exercise['docs']): Exercise {
  return {
    id,
    dataset: 'chinook',
    level: 3,
    topics,
    title,
    prompt,
    orderMatters: true,
    solutions: [{ approach, postgres: sql, mysql: sql, explanation }],
    docs,
  }
}

const WINDOW_DOCS = [
  { label: 'PostgreSQL: window functions', url: PG + 'tutorial-window.html' },
  { label: 'MySQL: window functions', url: MY + 'window-functions-usage.html' },
]
const JOIN_DOCS = [
  { label: 'PostgreSQL: joined tables', url: PG + 'queries-table-expressions.html#QUERIES-JOIN' },
  { label: 'MySQL: JOIN', url: MY + 'join.html' },
]
const CTE_DOCS = [
  { label: 'PostgreSQL: WITH queries', url: PG + 'queries-with.html' },
  { label: 'MySQL: WITH (common table expressions)', url: MY + 'with.html' },
]

// Lab "Should we buy more Rock?": Rock earns the most, but only because the shop has the most Rock.
export const chinookLabs: Exercise[] = [
  step(
    'chinook-130',
    ['group-by', 'aggregates', 'ranking'],
    'Revenue by genre, with its share',
    'For each genre that sold anything: the genre name, its revenue (unit_price × quantity over invoice lines, rounded to 2) and its share of all revenue in percent (1 decimal), biggest first, ties by genre_id.',
    `select g.name as genre,
       round(sum(il.unit_price * il.quantity), 2) as revenue,
       round(100.0 * sum(il.unit_price * il.quantity)
             / sum(sum(il.unit_price * il.quantity)) over (), 1) as share_pct
from invoice_line il
join track t on t.track_id = il.track_id
join genre g on g.genre_id = t.genre_id
group by g.genre_id, g.name
order by revenue desc, g.genre_id;`,
    'GROUP BY + a window over the groups',
    'sum(...) over () adds up the per-genre sums, so each row can be divided by the grand total in the same query.',
    WINDOW_DOCS,
  ),
  step(
    'chinook-131',
    ['subqueries', 'joins'],
    'How many times does a track sell?',
    'For each number of copies sold (0 for tracks never sold), how many tracks sold that many: times_sold and tracks, by times_sold.',
    `select coalesce(s.sold, 0) as times_sold,
       count(*) as tracks
from track t
left join (select track_id, sum(quantity) as sold
           from invoice_line
           group by track_id) s on s.track_id = t.track_id
group by coalesce(s.sold, 0)
order by times_sold;`,
    'LEFT JOIN to the sales per track',
    'The LEFT JOIN keeps tracks with no sales; COALESCE turns their missing count into 0. Without it, the tracks nobody bought would silently disappear.',
    JOIN_DOCS,
  ),
  step(
    'chinook-132',
    ['joins', 'aggregates'],
    'How much of each genre sells at all?',
    'For each genre: the genre name, the tracks in the catalog, how many of them sold at least once, and that share in percent (1 decimal). Most tracks first, ties by genre_id.',
    `select g.name as genre,
       count(*) as tracks,
       count(s.track_id) as sold,
       round(100.0 * count(s.track_id) / count(*), 1) as sold_pct
from track t
join genre g on g.genre_id = t.genre_id
left join (select distinct track_id from invoice_line) s on s.track_id = t.track_id
group by g.genre_id, g.name
order by tracks desc, g.genre_id;`,
    'COUNT(*) against COUNT(column)',
    'count(*) counts every track of the genre; count(s.track_id) skips the NULLs the LEFT JOIN left for unsold tracks. Their ratio is the share that sold.',
    JOIN_DOCS,
  ),
  step(
    'chinook-133',
    ['cte', 'ranking'],
    'Revenue per track in the catalog',
    'For genres with at least 50 tracks: the genre name, its tracks, its revenue (rounded to 2), the revenue per track in the catalog (3 decimals), and its place by revenue per track (rank, best first). Order by place, then genre_id.',
    `with revenue as (
  select t.genre_id, sum(il.unit_price * il.quantity) as revenue
  from invoice_line il
  join track t on t.track_id = il.track_id
  group by t.genre_id
),
catalog as (
  select genre_id, count(*) as tracks
  from track
  group by genre_id
)
select g.name as genre,
       c.tracks,
       round(r.revenue, 2) as revenue,
       round(r.revenue / c.tracks, 3) as per_track,
       rank() over (order by round(r.revenue / c.tracks, 3) desc) as place
from catalog c
join genre g on g.genre_id = c.genre_id
join revenue r on r.genre_id = c.genre_id
where c.tracks >= 50
order by place, g.genre_id;`,
    'Two CTEs, then a rank',
    'Revenue alone rewards the biggest shelf. Dividing by the number of tracks in the catalog compares genres fairly: how much a track of that genre earns, on average.',
    CTE_DOCS,
  ),
]
