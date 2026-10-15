# SQL Playbook

Start from the problem, not the syntax.

Practise SQL on real sample databases. Many exercises come with several solutions compared side by side
(result, speed, index use, MySQL support), and every solution shows how to write it in MySQL.
Queries run on real PostgreSQL inside the browser; MySQL versions are verified ahead of time on a real MySQL server.

## What is inside

- **Exercises** — 60 exercises on two datasets (Sakila, Chinook), levels 1–3, each with 1–4 solutions,
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

Documentation links point to the official [PostgreSQL](https://www.postgresql.org/docs/current/) and
[MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/) manuals. MySQL documentation text is not copied (Oracle license); explanations are original.

## Stack

React + TypeScript (strict) + styled-components, Vite. [PGlite](https://pglite.dev) (PostgreSQL 18 in WebAssembly).
Scripts run with tsx and use mysql2.

## Roadmap

See the plan: 10 datasets, ~1,200 exercises across 53 topics and 5 levels, a reference section, CI verification on GitHub Actions.
