# SQL Playbook — notes for Claude

SQL practice site: exercises on real sample databases, often with several solutions compared side by side, each with a
MySQL version. PostgreSQL 18 runs in the browser (PGlite); MySQL 8.4 versions are verified ahead of time.
Repo: https://github.com/Kirill-2112/sql-playbook (public). The owner writes in Russian; the site content is in English.

## Golden rule

Nothing is published unless `npm run verify` passes: every PostgreSQL solution returns the same rows as solution A,
every MySQL solution returns the same rows as PostgreSQL, and each exercise has at least one solution verified on MySQL.
GitHub Actions (`.github/workflows/verify.yml`) runs the whole pipeline on every push.

## Commercial use (the owner plans a paid subscription app)

Only use datasets, libraries, fonts and tools whose license allows commercial use. Verify the license from the primary
source (the license file or official page) before adding anything, and record it in `datasets.ts` and README.
Audit of 2026-10-15:
- OK: Sakila (BSD, keep Oracle notice), Lahman (CC BY-SA, like Employees), Delivery (own), Chinook (MIT), Northwind + AdventureWorks (MIT, microsoft/sql-server-samples
  license.txt), Airlines / Postgres Pro demo 2025 (MIT), Employees (CC BY-SA 3.0: commercial use allowed, but our sample
  must stay CC BY-SA, credited, and freely downloadable — keep it in the public repo).
- Runtime deps: MIT/ISC, PGlite Apache-2.0 (ship its license/NOTICE with the app). Font IBM Plex: OFL.
  MySQL server (GPL) is only used locally/in CI for verification, never shipped.
- Rejected: OpenFlights (ODbL, but the author sells separate commercial licenses; Wikipedia-derived parts may be GFDL),
  Olympics/Kaggle "120 years" (scraped from sports-reference.com; its terms forbid using the data with AI tools).
- Lahman: CC BY-SA 3.0 per readme2025.txt ("Copyright Notice & Limited Use License"). Its Negro Leagues data is "licensed
  from Seamheads" with no redistribution terms, so it is excluded (lgID not in NL/AL/AA/NA/FL/PL/UA).
- The repo has no LICENSE file on purpose (code and exercises: all rights reserved).
- Before launch: a Licenses/credits page in the app with every dataset's and library's notice.

## Layout

- `scripts/build-datasets.ts` — official source → MySQL → `public/datasets/<id>.pg.sql` + `datasets/build/<id>.mysql.sql`
  + `src/content/datasets/<id>.schema.json`, then compares both builds row by row. Output must be byte-for-byte reproducible.
- `scripts/sources/*.ts` — converters/samplers for sources that are not plain MySQL (Northwind, Employees, AdventureWorks,
  Airlines). `pgTypes` in a dataset config gives a column a PostgreSQL-only type (timestamptz, interval, boolean, integer[]).
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
- Upstream files can change under the same URL (Postgres Pro re-published the Airlines dump on 2026-10-17, fixing
  "Aerobus" → "Airbus"). CI then fails at the checksum step. Diff old vs new (schema + sorted rows per table), and if the
  change is harmless, update the SHA-256 in the workflow and rebuild.
- Airlines times: timestamptz in PG (the .pg.sql sets `timezone = 'UTC'`, otherwise PGlite uses the computer's zone),
  DATETIME holding UTC in MySQL; compareRows treats "…+00" and the bare value as equal. Local time: AT TIME ZONE vs
  CONVERT_TZ (needs MySQL tz tables, present in the official image). Express durations that may exceed a day as minutes:
  PG prints intervals as "1 day 02:00:00", MySQL TIME as "26:00:00".

## Status (2026-10-15)

- 8 datasets: Sakila, Chinook, Northwind (from Microsoft T-SQL), Employees (sample of datacharmer/test_db, CC BY-SA),
  AdventureWorks (from Microsoft OLTP install script, every 4th order), Airlines (Postgres Pro demo 2025-09-01 dump,
  every 200th booking), Lahman (SABR CSVs, CC BY-SA, major leagues only, player data from 2010), Delivery (own,
  generated in the browser by src/db/seed.ts; `browserSql` in the build config, MySQL copy git-ignored).
  321 exercises, all 53 topics (locks/isolation via FOR UPDATE SKIP LOCKED / NOWAIT / REPEATABLE READ).
- Plan with phases: `docs/plan.html` (published as a claude.ai artifact).
- Next: go deep on existing datasets (topics with few exercises first), two replacement datasets with commercial licenses,
  a functions reference section; a licenses/credits page;
  deploying the site (GitHub Pages).
- Commits are authored as `Kirill-2112 <334980883+Kirill-2112@users.noreply.github.com>` (keeps the personal email private).
