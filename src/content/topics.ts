import type { Level, Topic } from './types'

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Basics',
  2: 'Joins & aggregation',
  3: 'Analytics',
  4: 'Data & structure',
  5: 'Programming & performance',
}

const t = (id: string, level: Level, name: string, terms: string, mysql: Topic['mysql'], mysqlNote?: string): Topic => ({
  id,
  level,
  name,
  terms,
  mysql,
  mysqlNote,
})

// The curriculum map. MySQL notes describe MySQL 8.4 LTS.
export const TOPICS: Topic[] = [
  t('select-basics', 1, 'SELECT, WHERE, ORDER BY', 'select · where · and/or · order by', 'same'),
  t('limit', 1, 'Limiting results', 'limit · offset · fetch first', 'diff', 'No FETCH FIRST, only LIMIT.'),
  t('distinct', 1, 'Unique values', 'distinct · distinct on', 'diff', 'No DISTINCT ON; use ROW_NUMBER().'),
  t('null', 1, 'NULL', 'is null · coalesce · nullif', 'same'),
  t('text-search', 1, 'Text search', 'like · ilike · ~', 'diff', 'No ILIKE; LIKE is usually case-insensitive already. REGEXP instead of ~.'),
  t('conditions', 1, 'Conditions', 'case when · in · between', 'same'),
  t('strings', 1, 'Strings', '|| · concat · substring · length', 'diff', '|| means OR in MySQL; use CONCAT().'),
  t('numbers', 1, 'Numbers', 'round · / · %', 'diff', 'Integer division: 7 / 2 is 3 in Postgres and 3.5000 in MySQL.'),
  t('dates-basics', 1, 'Dates basics', 'now() · extract · interval', 'diff', 'DATE_ADD, TIMESTAMPDIFF instead of Postgres intervals.'),

  t('joins', 2, 'Inner / left / right join', 'join … on · using', 'same'),
  t('full-join', 2, 'Full outer join', 'full join', 'none', 'Not supported; emulate with LEFT JOIN … UNION … RIGHT JOIN.'),
  t('self-cross-join', 2, 'Self & cross join', 'self join · cross join', 'same'),
  t('group-by', 2, 'Group by & having', 'group by · having', 'same'),
  t('aggregates', 2, 'Aggregates', 'count · sum · avg · count(distinct)', 'same'),
  t('text-aggregation', 2, 'Text aggregation', 'string_agg · array_agg', 'diff', 'GROUP_CONCAT; no arrays.'),
  t('conditional-aggregates', 2, 'Conditional aggregates', 'count(*) filter (where …)', 'none', 'No FILTER; use SUM(CASE WHEN … THEN 1 ELSE 0 END).'),
  t('set-operations', 2, 'Set operations', 'union · intersect · except', 'same', 'INTERSECT and EXCEPT since 8.0.31.'),
  t('subqueries', 2, 'Subqueries', 'in · exists · scalar · correlated', 'same'),
  t('casting', 2, 'Type casting', 'cast · ::', 'diff', 'No ::, only CAST().'),
  t('data-cleaning', 2, 'Cleaning data', 'trim · lower · replace · nullif · duplicates', 'diff', 'REGEXP_REPLACE replaces every match by default; no INITCAP.'),
  t('pagination', 2, 'Pagination', 'limit · offset · keyset (where id > …)', 'same'),

  t('cte', 3, 'CTE', 'with … as', 'same'),
  t('ranking', 3, 'Ranking', 'row_number · rank · dense_rank · ntile', 'same'),
  t('lag-lead', 3, 'Previous / next row', 'lag · lead · first_value', 'same'),
  t('window-frames', 3, 'Window frames, running totals', 'rows between · range · groups', 'diff', 'No GROUPS frame mode.'),
  t('subtotals', 3, 'Subtotals', 'grouping sets · rollup · cube', 'diff', 'Only WITH ROLLUP.'),
  t('lateral', 3, 'Lateral joins', 'join lateral', 'same', 'Since 8.0.14.'),
  t('date-series', 3, 'Filling gaps in dates', 'generate_series', 'none', 'No generate_series; use a recursive CTE.'),
  t('pivot', 3, 'Pivot', 'conditional aggregation · crosstab', 'diff', 'Conditional aggregation only.'),
  t('recursive', 3, 'Hierarchies & graphs', 'with recursive', 'same'),
  t('gaps-islands', 3, 'Gaps & islands', 'row_number − row_number', 'same'),
  t('dates-advanced', 3, 'Dates in depth', 'date_trunc · time zones · age', 'diff', 'No date_trunc; DATE_FORMAT and friends.'),

  t('ddl', 4, 'Creating tables', 'create table · data types · identity', 'diff', 'AUTO_INCREMENT instead of IDENTITY.'),
  t('constraints', 4, 'Constraints', 'primary/foreign key · unique · check', 'same'),
  t('dml', 4, 'Changing data', 'insert · update · delete · returning', 'diff', 'No RETURNING.'),
  t('upsert', 4, 'Upsert', 'on conflict do update', 'diff', 'ON DUPLICATE KEY UPDATE.'),
  t('merge', 4, 'Merge', 'merge into', 'none', 'Not supported.'),
  t('transactions', 4, 'Transactions', 'begin · commit · rollback · savepoint', 'diff', 'CREATE/ALTER commit immediately and cannot be rolled back.'),
  t('data-loading', 4, 'Loading files', 'copy · load data · staging tables', 'diff', 'LOAD DATA [LOCAL] INFILE instead of COPY; local_infile must be enabled.'),
  t('temp-tables', 4, 'Temporary tables', 'create temp table', 'diff', 'CREATE TEMPORARY TABLE.'),
  t('views', 4, 'Views', 'create view', 'same'),
  t('materialized-views', 4, 'Materialized views', 'create materialized view · refresh', 'none', 'Not supported.'),
  t('normalization', 4, 'Schemas & normalization', 'schema · 1NF–3NF', 'diff', 'A MySQL schema is a separate database.'),
  t('json', 4, 'JSON', 'jsonb · -> · ->> · @>', 'diff', 'JSON type with different functions.'),
  t('arrays', 4, 'Arrays', 'array · unnest · any', 'none', 'Not supported.'),
  t('generated-columns', 4, 'Generated columns', 'generated always as', 'same'),
  t('introspection', 4, 'Exploring a database', 'information_schema · pg_catalog', 'diff', 'A schema is a database (table_schema = database()); SHOW TABLES as a shortcut.'),
  t('privileges', 4, 'Users, roles & privileges', 'create role · grant · revoke · set role', 'diff', 'Accounts are user@host and live on the whole server; roles since 8.0.'),

  t('functions', 5, 'Functions', 'create function · plpgsql · returns table', 'diff', 'Different syntax, DELIMITER.'),
  t('procedures', 5, 'Procedures & blocks', 'create procedure · call · do', 'diff', 'No anonymous DO blocks.'),
  t('control-flow', 5, 'Control flow', 'declare · if · loop · exception', 'diff', 'DECLARE … HANDLER for errors.'),
  t('triggers', 5, 'Triggers', 'create trigger · new / old', 'diff', 'Trigger body is written inline.'),
  t('indexes', 5, 'Indexes', 'b-tree · composite · expression', 'diff', 'Expression indexes since 8.0.13.'),
  t('partial-covering-indexes', 5, 'Partial & covering indexes', 'where · include', 'none', 'No partial indexes, no INCLUDE.'),
  t('query-plans', 5, 'Query plans', 'explain · explain analyze', 'diff', 'Different output format.'),
  t('full-text', 5, 'Full-text search', 'tsvector · tsquery · gin', 'diff', 'FULLTEXT index, MATCH … AGAINST.'),
  t('partitioning', 5, 'Partitioning', 'partition by range / list', 'diff'),
  t('locks-isolation', 5, 'Locks & isolation', 'read committed · repeatable read · deadlock', 'theory', 'Default isolation: READ COMMITTED in Postgres, REPEATABLE READ in MySQL.'),
]

const BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]))

export function findTopic(id: string): Topic | undefined {
  return BY_ID.get(id)
}
