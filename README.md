# SQL Playbook

Start from the problem, not the syntax.

Practise SQL on real sample databases. Many exercises come with several solutions compared side by side
(result, speed, index use, MySQL support), and every solution shows how to write it in MySQL.
Queries run on real PostgreSQL inside the browser; MySQL versions are verified ahead of time on a real MySQL server.

## What is inside

- **Exercises** — 530 exercises on eight datasets, levels 1–5, each with 1–4 solutions,
  a MySQL 8.4 version (or an explanation of why it is impossible in MySQL) and links to the official docs.
- **Situations** — problem-first guides ("top N per group", "rows with no match", …).
- **Index Lab** — `EXPLAIN ANALYZE` before and after adding an index on 200,000 rows, including the cases where an index does not help.
- **Safe sandbox** — every query runs in a transaction that is rolled back.

## How correctness is guaranteed

```
official dataset (loaded into MySQL as-is)
  └─ scripts/build-datasets.ts
       ├─ public/datasets/<id>.pg.sql      → PGlite in the browser
       ├─ datasets/build/<id>.mysql.sql    → MySQL 8.4 (schema pb_<id>)
       └─ compares every table row by row between the two builds

src/content/exercises/*.ts
  └─ scripts/verify.ts
       ├─ every PostgreSQL solution must return the same rows as solution A
       ├─ every MySQL solution must return the same rows as PostgreSQL
       ├─ content rules: known topics, doc links, comparison text, ORDER BY when order matters
       └─ writes src/content/generated/verification.json (shown in the UI)
```

The same comparison code (`src/utils/compareRows.ts`) checks a learner's answer in the browser.

## Run locally

```bash
npm install
npm run dev
```

### Rebuilding datasets and verifying exercises

Needs Docker (OrbStack or Docker Desktop) with MySQL 8.4:

```bash
docker run --name sql-playbook-mysql -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -p 127.0.0.1:3306:3306 -d mysql:8.4
```

Download the official sources into `datasets/raw/`:

```bash
curl -L -o datasets/raw/sakila-db.tar.gz https://downloads.mysql.com/docs/sakila-db.tar.gz && tar -xzf datasets/raw/sakila-db.tar.gz -C datasets/raw
curl -sSfL https://raw.githubusercontent.com/lerocha/chinook-database/v1.4.5/ChinookDatabase/DataSources/Chinook_MySql.sql | tr -d "\r" > datasets/raw/Chinook_MySql.sql
curl -sSfL -o datasets/raw/instnwnd.sql https://raw.githubusercontent.com/microsoft/sql-server-samples/2f85f3724ee45776a5183ed34d064488a6e1dc53/samples/databases/northwind-pubs/instnwnd.sql
mkdir -p datasets/raw/test_db && curl -sSfL https://github.com/datacharmer/test_db/archive/e324b56193ca506ab7cc1ab143a9153d8c4535d7.tar.gz | tar -xz -C datasets/raw/test_db --strip-components=1
curl -sSfL -o datasets/raw/aw.zip https://github.com/microsoft/sql-server-samples/releases/download/adventureworks/AdventureWorks-oltp-install-script.zip && mkdir -p datasets/raw/aw && unzip -q datasets/raw/aw.zip -d datasets/raw/aw
curl -sSfL -o datasets/raw/demo-20250901-3m.sql.gz https://edu.postgrespro.ru/demo-20250901-3m.sql.gz
sh scripts/download-lahman.sh
```

Then:

```bash
npm run build:datasets
npm run verify
```

## Datasets and licenses

| Dataset | Source | License | Changes |
|---|---|---|---|
| Sakila | [MySQL sample databases](https://dev.mysql.com/doc/sakila/en/) | New BSD (schema and data) | `address.location` (spatial) and `film_text` left out |
| Chinook | [lerocha/chinook-database](https://github.com/lerocha/chinook-database) v1.4.5 | MIT, © 2008–2024 Luis Rocha | identifiers converted to snake_case |
| Northwind | [microsoft/sql-server-samples](https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs) | MIT, © Microsoft | converted from T-SQL by `scripts/sources/northwind.ts`; photos, pictures, empty demographics tables, views and procedures left out |
| AdventureWorks | [microsoft/sql-server-samples release](https://github.com/microsoft/sql-server-samples/releases/tag/adventureworks) (SHA-256 checked) | MIT, © Microsoft | converted by `scripts/sources/adventureworks.ts`: 37 of 71 tables, hierarchyid → manager_id, XML/binary columns left out, every 4th sales order |
| Airlines | [Postgres Pro demo database](https://postgrespro.com/community/demodb) 2025-09-01, 3 months (SHA-256 checked) | MIT, © Postgres Professional | converted from the PostgreSQL dump by `scripts/sources/airlines.ts`: every 200th booking with its tickets, segments and boarding passes; English names only; point → latitude/longitude, tstzrange → valid_from/valid_to; integer[] stays an array in PostgreSQL and is JSON in MySQL; times in UTC, whole seconds |
| Lahman Baseball | [SABR Lahman Baseball Database](https://sabr.org/lahman-database/) 2025, CSV release (SHA-256 checked) | CC BY-SA 3.0, © SABR | `scripts/sources/lahman.ts`: major leagues only (the Negro Leagues data licensed from Seamheads is left out), player seasons, salaries, All-Star games and awards from 2010, snake_case columns. `public/datasets/lahman.pg.sql` and `datasets/build/lahman.mysql.sql` are shared under CC BY-SA 3.0 |
| Delivery | our own | own synthetic data | generated in the browser by `src/db/seed.ts`; the MySQL copy is built from the same rows by `scripts/sources/delivery.ts` and is not committed |
| Employees | [datacharmer/test_db](https://github.com/datacharmer/test_db) | CC BY-SA 3.0 | a sample (`scripts/sources/employees.ts`): all departments and managers, employees with emp_no divisible by 50, complete history. `public/datasets/employees.pg.sql` and `datasets/build/employees.mysql.sql` are shared under CC BY-SA 3.0 |

Documentation links point to the official [PostgreSQL](https://www.postgresql.org/docs/current/) and
[MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/) manuals. MySQL documentation text is not copied (Oracle license); explanations are original.

## Stack

React + TypeScript (strict) + styled-components, Vite. [PGlite](https://pglite.dev) (PostgreSQL 18 in WebAssembly).
Scripts run with tsx and use mysql2.

Licenses of what ships to the browser: React, React Router, styled-components and their dependencies (MIT/ISC),
PGlite (Apache-2.0, includes PostgreSQL under the PostgreSQL License), IBM Plex fonts (SIL Open Font License).
MySQL Server is used only to verify solutions and is not distributed.

## Roadmap

See the plan: 8 datasets so far, ~1,000 exercises across 53 topics and 5 levels, a reference section, CI verification on GitHub Actions.
