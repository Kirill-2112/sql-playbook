# SQL Playbook — notes for Claude

SQL practice site: exercises on real sample databases, often with several solutions compared side by side, each with a
MySQL version. PostgreSQL 18 runs in the browser (PGlite); MySQL 8.4 versions are verified ahead of time.
Repo: https://github.com/Kirill-2112/sql-playbook (public). The owner writes in Russian; the site content is in English.

## Golden rule

Nothing is published unless `npm run verify` passes: every PostgreSQL solution returns the same rows as solution A,
every MySQL solution returns the same rows as PostgreSQL, and each exercise has at least one solution verified on MySQL.
GitHub Actions (`.github/workflows/verify.yml`) runs the whole pipeline on every push.

## Layout

- `scripts/build-datasets.ts` — official source → MySQL → `public/datasets/<id>.pg.sql` + `datasets/build/<id>.mysql.sql`
  + `src/content/datasets/<id>.schema.json`, then compares both builds row by row. Output must be byte-for-byte reproducible.
- `scripts/sources/*.ts` — converters/samplers for sources that are not plain MySQL (Northwind, Employees, AdventureWorks).
- `scripts/verify.ts` — checks every exercise on PGlite and the local MySQL; writes `src/content/generated/verification.json`.
- `src/content/exercises/<dataset>.ts` — exercises (`Exercise` type in `src/content/types.ts`). Script exercises (DDL/DML,
  functions, triggers) set `checkSql` (and `checkSqlMysql` if needed); PG runs them in a rolled-back transaction, MySQL on a
  throwaway copy (`pb_scratch`).
- `src/content/topics.ts` — the 53-topic curriculum (5 levels). `src/content/datasets.ts` — dataset metadata and attribution.
- UI: React + TypeScript strict + styled-components; one component per file in `src/components/`; colours/spacing only from
  `src/theme/tokens.ts`.

## Local setup

- MySQL 8.4 in Docker (OrbStack): container `sql-playbook-mysql`, 127.0.0.1:3306, root without password.
  Docker CLI is at `~/.orbstack/bin/docker` (may not be on PATH in scripts).
- Official sources go in `datasets/raw/` (git-ignored); download commands are in README and the workflow (pinned commits / SHA-256).
- `npm run dev`, `npm run build:datasets [-- id]`, `npm run verify [-- id-or-dataset]`, `npm run typecheck`, `npm run build`.

## Writing exercises — lessons learned

- Make answers deterministic: full tie-breakers in ORDER BY; avoid ordering by text that differs by collation
  (PGlite uses C collation, MySQL utf8mb4_0900_ai_ci: "USA" vs "United Kingdom", accents, case).
- PG sorts NULLs last, MySQL first; MySQL ORDER BY on ENUM uses definition order.
- Always ROUND averages and ratios (PG numeric vs MySQL decimal precision). Use `100.0 *` to avoid integer division in PG.
- Avoid MySQL reserved words as aliases/columns: change, lines, rank, group, rows, key, order…
- MySQL: no FILTER, FULL JOIN, MERGE, RETURNING, DISTINCT ON, generate_series, ::, partial indexes, bool_and;
  `||` is OR; `/` is decimal (use DIV); temp tables can't be referenced twice in one query.
- When a learner-visible claim mentions a number (counts, percentages), check it against the data first.

## Status (2026-10-15)

- 5 datasets: Sakila, Chinook, Northwind (from Microsoft T-SQL), Employees (sample of datacharmer/test_db, CC BY-SA),
  AdventureWorks (from Microsoft OLTP install script, every 4th order). 165 exercises, 52/53 topics (locks/isolation: theory only).
- Plan with phases: `docs/plan.html` (published as a claude.ai artifact).
- Next candidates: Airlines (Postgres Pro demo, PG-only → needs MySQL conversion), Lahman Baseball, Olympics,
  OpenFlights (non-commercial license), MySQL version of the synthetic Delivery dataset; a functions reference section;
  deploying the site (GitHub Pages).
- Commits are authored as `Kirill-2112 <334980883+Kirill-2112@users.noreply.github.com>` (keeps the personal email private).
