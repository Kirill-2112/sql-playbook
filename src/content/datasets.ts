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
}

export const DATASET_IDS = Object.keys(DATASETS) as DatasetId[]
