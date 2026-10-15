import type { DatasetId, DatasetMeta } from './types'

export const DATASETS: Record<DatasetId, DatasetMeta> = {
  sakila: {
    id: 'sakila',
    name: 'Sakila',
    about: 'A DVD rental chain: films, actors, customers, stores, rentals and payments. May 2005 to February 2006.',
    license: 'BSD',
    source: { label: 'MySQL sample databases', url: 'https://dev.mysql.com/doc/sakila/en/' },
    attribution:
      'Sakila sample database by Mike Hillyer, MySQL AB documentation team. Schema and data under the New BSD license. Built here from the official MySQL release; address.location (spatial) and film_text are left out.',
  },
  chinook: {
    id: 'chinook',
    name: 'Chinook',
    about: 'A digital music store: artists, albums, tracks, playlists, customers, invoices and the sales team.',
    license: 'MIT',
    source: { label: 'lerocha/chinook-database', url: 'https://github.com/lerocha/chinook-database' },
    attribution:
      'Chinook database © 2008–2024 Luis Rocha, MIT license. Built here from the official MySQL script (v1.4.5); identifiers converted to snake_case.',
  },
  northwind: {
    id: 'northwind',
    name: 'Northwind',
    about: 'Northwind Traders, a food importer: customers, orders and order lines, products, suppliers, employees and their sales territories. July 1996 to May 1998.',
    license: 'MIT',
    source: {
      label: 'microsoft/sql-server-samples',
      url: 'https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs',
    },
    attribution:
      'Northwind sample database © Microsoft Corporation, MIT license. Converted here from the official SQL Server script: identifiers in snake_case, money and discount as exact decimals, employee photos, category pictures, the two empty demographics tables, views and procedures left out.',
  },
  employees: {
    id: 'employees',
    name: 'Employees',
    about:
      'A company\'s HR history from 1985 to 2002: every salary, job title and department of each employee, with start and end dates. An end date of 9999-01-01 means "still current".',
    license: 'CC BY-SA 3.0',
    source: { label: 'datacharmer/test_db', url: 'https://github.com/datacharmer/test_db' },
    attribution:
      'Employees sample database by Fusheng Wang and Carlo Zaniolo (Siemens Corporate Research), relational schema by Giuseppe Maxia, data export by Patrick Crews; CC BY-SA 3.0. This is a sample of it, shared under the same license: all departments and managers, every employee whose number is a multiple of 50, and their complete history (6,024 of 300,024 employees).',
  },
  adventureworks: {
    id: 'adventureworks',
    name: 'AdventureWorks',
    about:
      'Adventure Works Cycles, a bicycle maker: products in categories and subcategories, sales orders, customers, stores, salespeople and their quotas, territories, vendors and purchase orders, and an org chart of 290 employees. 2022 to 2025.',
    license: 'MIT',
    source: {
      label: 'microsoft/sql-server-samples',
      url: 'https://github.com/microsoft/sql-server-samples/releases/tag/adventureworks',
    },
    attribution:
      'AdventureWorks OLTP sample © Microsoft Corporation, MIT license. Converted here from the official install script: 37 of 71 tables, schemas flattened, identifiers in snake_case, the hierarchyid org chart turned into manager_id, XML and binary columns left out, and every 4th sales order kept with all its lines.',
  },
  lahman: {
    id: 'lahman',
    name: 'Lahman Baseball',
    about:
      'Major League Baseball history: every team season since 1871 with wins, runs and standings, franchises, post-season series, managers and Hall of Fame voting, plus player batting and pitching seasons, salaries (to 2016), All-Star games and awards from 2010 to 2025.',
    license: 'CC BY-SA 3.0',
    source: { label: 'SABR Lahman Baseball Database', url: 'https://sabr.org/lahman-database/' },
    attribution:
      'Lahman Baseball Database, version 2025 (1871–2025 seasons), © 1996–2025 SABR, donated by Sean Lahman; CC BY-SA 3.0. This is an adapted part of it, shared under the same license: major leagues only (the Negro Leagues data licensed from Seamheads is left out), player seasons, salaries, All-Star games and awards from 2010, columns renamed to snake_case (2B/3B as doubles/triples, Rank as standing), award_no added as a key.',
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    about:
      'A food-delivery service: 50,000 customers, 100 restaurants and 200,000 orders from January 2025 to June 2026. Generated in your browser with a fixed random seed, so everyone gets the same data; big enough for indexes and query plans to matter.',
    license: 'Own data',
    source: { label: 'src/db/seed.ts', url: 'https://github.com/Kirill-2112/sql-playbook/blob/main/src/db/seed.ts' },
    attribution:
      'Synthetic data made for SQL Playbook; names, places and orders are random and do not describe real people or businesses. PostgreSQL generates it in the browser; the MySQL copy used for verification is built from the same rows.',
  },
  airlines: {
    id: 'airlines',
    name: 'Airlines',
    about:
      'A fictional airline flying worldwide: airplanes and their seats, airports with time zones, monthly route schedules, flights, bookings, tickets, flight segments and boarding passes. Flights from October 2025 to January 2026; the snapshot is taken at 2025-12-01 00:00 UTC, so later flights are still scheduled. All times are in UTC.',
    license: 'MIT',
    source: { label: 'Postgres Pro demo database', url: 'https://postgrespro.com/community/demodb' },
    attribution:
      'Demo database © Postgres Professional, MIT license, version 2025-09-01 (3 months). Converted here from the official PostgreSQL dump: every 200th booking kept with all its tickets, segments and boarding passes (6,465 of 1,292,893), all reference data and flights in full; English names only; coordinates as latitude/longitude; the route validity range as valid_from/valid_to; times in whole seconds; range renamed range_km and speed speed_kmh; check constraints, views and functions left out.',
  },
}

export const DATASET_IDS = Object.keys(DATASETS) as DatasetId[]
