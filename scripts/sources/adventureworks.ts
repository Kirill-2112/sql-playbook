/**
 * AdventureWorks OLTP (Microsoft, MIT): converted from the official install script (instawdb.sql + data files).
 *
 * Table structure, primary and foreign keys and each file's field/row separators are read from instawdb.sql,
 * so only the choices below are written by hand:
 *   - which tables are kept (the large production logs, photos, passwords and credit cards are not)
 *   - columns left out: rowguid, ModifiedDate, XML documents, binary images, national ID numbers
 *   - Employee.OrganizationNode (SQL Server's hierarchyid) is replaced by a plain manager_id, derived from it
 *     and checked against the script's own OrganizationLevel values
 *   - identifiers become snake_case and the five schemas are flattened into one database;
 *     SalesTerritory.Group becomes territory_group (GROUP is reserved in both databases)
 *   - SQL Server types become portable ones: money -> DECIMAL(19,4), bit -> TINYINT(1), nvarchar -> VARCHAR
 * Sales orders are sampled afterwards in MySQL (see loadAdventureWorksSample).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import mysql from 'mysql2/promise'
import type { MysqlConnection } from '../lib/mysql'

const KEEP_TABLES = [
  'HumanResources.Department', 'HumanResources.Employee', 'HumanResources.EmployeeDepartmentHistory',
  'HumanResources.EmployeePayHistory', 'HumanResources.Shift',
  'Person.Person', 'Person.CountryRegion', 'Person.StateProvince',
  'Production.Product', 'Production.ProductCategory', 'Production.ProductSubcategory', 'Production.ProductModel',
  'Production.ProductInventory', 'Production.Location', 'Production.ProductListPriceHistory',
  'Production.ProductCostHistory', 'Production.ProductDescription', 'Production.ProductModelProductDescriptionCulture',
  'Production.Culture', 'Production.UnitMeasure', 'Production.ProductReview',
  'Purchasing.Vendor', 'Purchasing.ProductVendor', 'Purchasing.PurchaseOrderHeader', 'Purchasing.PurchaseOrderDetail',
  'Purchasing.ShipMethod',
  'Sales.Customer', 'Sales.SalesOrderHeader', 'Sales.SalesOrderDetail', 'Sales.SalesPerson', 'Sales.SalesTerritory',
  'Sales.Store', 'Sales.SpecialOffer', 'Sales.SpecialOfferProduct', 'Sales.SalesReason',
  'Sales.SalesOrderHeaderSalesReason', 'Sales.SalesPersonQuotaHistory',
]

/** Columns left out of every table, or of one table. */
const DROP_EVERYWHERE = new Set(['rowguid', 'ModifiedDate'])
const DROP_COLUMNS: Record<string, string[]> = {
  'HumanResources.Employee': ['NationalIDNumber', 'OrganizationNode'],
  'Person.Person': ['AdditionalContactInfo', 'Demographics'],
  'Production.ProductModel': ['CatalogDescription', 'Instructions'],
  'Production.ProductReview': ['EmailAddress'],
  'Sales.Store': ['Demographics'],
  'Sales.SalesOrderHeader': ['CreditCardApprovalCode'],
}

/** Columns whose name is a reserved word in PostgreSQL or MySQL. */
const RENAME_COLUMNS: Record<string, string> = {
  'Sales.SalesTerritory.Group': 'territory_group',
}

/** Types of computed columns (their values are present in the data files). */
const COMPUTED_TYPES: Record<string, string> = {
  'Sales.Customer.AccountNumber': 'varchar(10)',
  'Sales.SalesOrderHeader.SalesOrderNumber': 'varchar(25)',
  'Sales.SalesOrderHeader.TotalDue': 'decimal(19, 4)',
  'Sales.SalesOrderDetail.LineTotal': 'decimal(38, 6)',
  'Purchasing.PurchaseOrderHeader.TotalDue': 'decimal(19, 4)',
  'Purchasing.PurchaseOrderDetail.LineTotal': 'decimal(19, 4)',
  'Purchasing.PurchaseOrderDetail.StockedQty': 'decimal(9, 2)',
  'HumanResources.Employee.OrganizationLevel': 'smallint',
}

const toSnake = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()

interface Column {
  source: string
  name: string
  type: string
  nullable: boolean
  dropped: boolean
}

interface Table {
  key: string // Schema.Table
  name: string // snake_case
  columns: Column[]
  primaryKey: string[]
  fieldSep: string
  rowSep: string
}

export interface ForeignKey {
  table: string
  columns: string[]
  refTable: string
  refColumns: string[]
}

function mysqlType(base: string, args: string | undefined, userTypes: Record<string, string>): string {
  const t = base.toLowerCase()
  if (userTypes[base]) {
    const m = /^(\w+)(\(\d+\))?$/.exec(userTypes[base]!)!
    return mysqlType(m[1]!, m[2]?.slice(1, -1), userTypes)
  }
  switch (t) {
    case 'int':
      return 'int'
    case 'smallint':
      return 'smallint'
    case 'tinyint':
      return 'tinyint unsigned'
    case 'bigint':
      return 'bigint'
    case 'bit':
      return 'tinyint(1)'
    case 'money':
    case 'smallmoney':
      return 'decimal(19, 4)'
    case 'decimal':
    case 'numeric':
      return `decimal(${args})`
    case 'float':
      return 'double'
    case 'nvarchar':
    case 'varchar':
      return args === 'max' ? 'text' : `varchar(${args})`
    case 'nchar':
    case 'char':
      return `char(${args})`
    case 'datetime':
      return 'datetime'
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    default:
      throw new Error(`No MySQL type for ${base}(${args ?? ''})`)
  }
}

function parseScript(script: string) {
  // Comments can sit inside column lists (e.g. a commented-out key column), so remove them first.
  const sql = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
  const userTypes: Record<string, string> = {}
  for (const m of sql.matchAll(/CREATE TYPE \[(\w+)\] FROM (\w+(?:\(\d+\))?)/g)) userTypes[m[1]!] = m[2]!

  const tables = new Map<string, Table>()
  for (const m of sql.matchAll(/CREATE TABLE \[(\w+)\]\.\[(\w+)\]\(([\s\S]*?)\n\) ON/g)) {
    const key = `${m[1]}.${m[2]}`
    if (!KEEP_TABLES.includes(key)) continue
    const columns: Column[] = []
    for (const line of m[3]!.split('\n')) {
      const c = /^\s*\[(\w+)\]\s+(?:AS\s|(?:\[(\w+)\]|(\w+))\s*(?:\(([^)]*)\))?)(.*)$/.exec(line)
      if (!c) continue
      const source = c[1]!
      const dropped = DROP_EVERYWHERE.has(source) || (DROP_COLUMNS[key] ?? []).includes(source)
      const computed = /^\s*\[\w+\]\s+AS\s/.test(line)
      let type: string
      if (dropped) type = 'dropped'
      else if (computed) {
        const t = COMPUTED_TYPES[`${key}.${source}`]
        if (!t) throw new Error(`Computed column ${key}.${source} has no type`)
        type = t
      } else type = mysqlType(c[2] ?? c[3]!, c[4]?.trim(), userTypes)
      const nullable = computed || !/NOT NULL/i.test(c[5] ?? '')
      columns.push({ source, name: RENAME_COLUMNS[`${key}.${source}`] ?? toSnake(source), type, nullable, dropped })
    }
    tables.set(key, { key, name: toSnake(m[2]!), columns, primaryKey: [], fieldSep: '\t', rowSep: '\n' })
  }
  for (const key of KEEP_TABLES) if (!tables.has(key)) throw new Error(`Table ${key} not found in the script`)

  for (const m of sql.matchAll(/ALTER TABLE \[(\w+)\]\.\[(\w+)\] WITH CHECK ADD\s+CONSTRAINT \[PK_\w+\] PRIMARY KEY (?:NON)?CLUSTERED\s*\(([^)]*)\)/g)) {
    const t = tables.get(`${m[1]}.${m[2]}`)
    if (t) t.primaryKey = [...m[3]!.matchAll(/\[(\w+)\]/g)].map((x) => toSnake(x[1]!))
  }

  const foreignKeys: ForeignKey[] = []
  for (const block of sql.split(/ALTER TABLE /).slice(1)) {
    const owner = /^\[(\w+)\]\.\[(\w+)\]/.exec(block)
    if (!owner) continue
    const from = tables.get(`${owner[1]}.${owner[2]}`)
    if (!from) continue
    for (const fk of block.matchAll(/FOREIGN KEY\s*\(([^)]*)\)\s*REFERENCES \[(\w+)\]\.\[(\w+)\]\s*\(([^)]*)\)/g)) {
      const to = tables.get(`${fk[2]}.${fk[3]}`)
      const cols = [...fk[1]!.matchAll(/\[(\w+)\]/g)].map((x) => x[1]!)
      // Keep keys between kept tables whose columns are kept.
      if (!to || cols.some((c) => from.columns.find((col) => col.source === c)?.dropped !== false)) continue
      foreignKeys.push({
        table: from.name,
        columns: cols.map(toSnake),
        refTable: to.name,
        refColumns: [...fk[4]!.matchAll(/\[(\w+)\]/g)].map((x) => toSnake(x[1]!)),
      })
    }
  }

  for (const m of sql.matchAll(
    /BULK INSERT \[(\w+)\]\.\[(\w+)\][\s\S]*?FIELDTERMINATOR\s*=\s*'([^']*)'[\s\S]*?ROWTERMINATOR\s*=\s*'([^']*)'/g,
  )) {
    const t = tables.get(`${m[1]}.${m[2]}`)
    if (!t) continue
    t.fieldSep = m[3] === '\\t' ? '\t' : m[3]!
    t.rowSep = m[4] === '0x0a' || m[4] === '\\n' ? '\n' : m[4]!.replace('\\n', '\n')
  }
  return { tables: [...tables.values()], foreignKeys }
}

/** SQL Server hierarchyid (hex) -> bit string without the trailing padding zeros. */
const hierarchyBits = (hex: string) =>
  [...hex].map((h) => parseInt(h, 16).toString(2).padStart(4, '0')).join('').replace(/0+$/, '')

/**
 * Reads a data file the way BULK INSERT does: every field but the last ends at the field separator, the last at
 * the row separator. Text fields may therefore contain line breaks (product reviews do).
 */
function readRows(dir: string, table: Table): string[][] {
  const file = readFileSync(join(dir, `${table.key.split('.')[1]}.csv`), 'utf8').replace(/^\uFEFF/, '')
  const n = table.columns.length
  const rows: string[][] = []
  let pos = 0
  while (pos < file.length) {
    if (file.startsWith(table.rowSep, pos)) {
      pos += table.rowSep.length // blank line
      continue
    }
    const row: string[] = []
    for (let i = 0; i < n; i++) {
      const sep = i < n - 1 ? table.fieldSep : table.rowSep
      let end = file.indexOf(sep, pos)
      if (end === -1) end = file.length
      row.push(file.slice(pos, end))
      pos = end + sep.length
    }
    rows.push(row)
  }
  return rows
}

export function convertAdventureWorks(dir: string): { sql: string; foreignKeys: ForeignKey[] } {
  // The script is saved with a BOM and Windows line endings.
  const script = readFileSync(join(dir, 'instawdb.sql'), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const { tables, foreignKeys } = parseScript(script)
  const out = [
    '-- Generated by scripts/sources/adventureworks.ts from Microsoft\'s AdventureWorks OLTP install script (MIT). Do not edit.',
    'drop database if exists adventureworks_full;',
    'create database adventureworks_full character set utf8mb4 collate utf8mb4_0900_ai_ci;',
    'use adventureworks_full;',
  ]

  for (const table of tables) {
    const kept = table.columns.filter((c) => !c.dropped)
    const isEmployee = table.key === 'HumanResources.Employee'
    const defs = kept.map((c) => `  ${c.name} ${c.type}${c.nullable ? '' : ' not null'}`)
    if (isEmployee) defs.push('  manager_id int')
    if (table.primaryKey.length) defs.push(`  primary key (${table.primaryKey.join(', ')})`)
    out.push(`create table ${table.name} (\n${defs.join(',\n')}\n);`)

    const rows = readRows(dir, table)
    const indexes = kept.map((c) => table.columns.indexOf(c))
    let extra: (row: string[]) => string[] = () => []
    if (isEmployee) {
      // The parent's hierarchyid bits are a prefix of the child's; the longest such prefix is the direct manager.
      const nodeAt = table.columns.findIndex((c) => c.source === 'OrganizationNode')
      const levelAt = table.columns.findIndex((c) => c.source === 'OrganizationLevel')
      const idAt = table.columns.findIndex((c) => c.source === 'BusinessEntityID')
      const nodes = rows.map((r) => ({ id: r[idAt]!, bits: hierarchyBits(r[nodeAt] ?? '') }))
      const managerOf = new Map<string, string | null>()
      for (const n of nodes) {
        const parents = nodes.filter((p) => p.bits.length < n.bits.length && n.bits.startsWith(p.bits))
        const direct = parents.sort((a, b) => b.bits.length - a.bits.length)[0]
        managerOf.set(n.id, n.bits === '' ? null : direct?.id ?? null)
        if (parents.length !== Number(rows.find((r) => r[idAt] === n.id)![levelAt] || 0)) {
          throw new Error(`hierarchyid decoding disagrees with OrganizationLevel for employee ${n.id}`)
        }
      }
      extra = (r) => [managerOf.get(r[idAt]!) ?? '']
    }
    for (let i = 0; i < rows.length; i += 500) {
      const tuples = rows.slice(i, i + 500).map((r) => {
        if (r.length !== table.columns.length) {
          throw new Error(`${table.key}: ${r.length} fields, expected ${table.columns.length}`)
        }
        const values = [...indexes.map((x) => r[x]!), ...extra(r)]
        return `(${values.map((v) => (v === '' ? 'null' : mysql.escape(v))).join(', ')})`
      })
      out.push(`insert into ${table.name} values\n${tuples.join(',\n')};`)
    }
  }
  return { sql: out.join('\n') + '\n', foreignKeys }
}

/** Every Nth sales order is kept, with all its lines; customers and people are kept only when referenced. */
const ORDER_SAMPLE_EVERY = 4

export async function loadAdventureWorksSample(conn: MysqlConnection, root: string, container: string): Promise<void> {
  const { execFileSync } = await import('node:child_process')
  const env = { ...process.env, PATH: `${process.env.HOME}/.orbstack/bin:${process.env.PATH}` }
  const { sql, foreignKeys } = convertAdventureWorks(join(root, 'datasets/raw/aw'))
  execFileSync('docker', ['exec', '-i', container, 'mysql', '--default-character-set=utf8mb4'], { input: sql, env })

  const [tableRows] = (await conn.query(
    `select table_name as t from information_schema.tables where table_schema = 'adventureworks_full'`,
  )) as [{ t: string }[], unknown]
  const all = tableRows.map((r) => r.t)
  const sampled: Record<string, string> = {
    sales_order_header: `sales_order_id % ${ORDER_SAMPLE_EVERY} = 0`,
    sales_order_detail: `sales_order_id % ${ORDER_SAMPLE_EVERY} = 0`,
    sales_order_header_sales_reason: `sales_order_id % ${ORDER_SAMPLE_EVERY} = 0`,
    customer: `customer_id in (select customer_id from adventureworks_full.sales_order_header where sales_order_id % ${ORDER_SAMPLE_EVERY} = 0)`,
  }
  const statements = [
    'drop database if exists adventureworks_src',
    'create database adventureworks_src character set utf8mb4 collate utf8mb4_0900_ai_ci',
    ...all.map((t) => `create table adventureworks_src.${t} like adventureworks_full.${t}`),
    ...all
      .filter((t) => t !== 'person' && t !== 'store')
      .map((t) => `insert into adventureworks_src.${t} select * from adventureworks_full.${t}${sampled[t] ? ` where ${sampled[t]}` : ''}`),
    // Only the stores and people that kept customers and employees refer to.
    `insert into adventureworks_src.store select * from adventureworks_full.store
       where business_entity_id in (select store_id from adventureworks_src.customer)`,
    `insert into adventureworks_src.person select * from adventureworks_full.person
       where business_entity_id in (select person_id from adventureworks_src.customer)
          or business_entity_id in (select business_entity_id from adventureworks_src.employee)`,
    ...foreignKeys.map(
      (fk) =>
        `alter table adventureworks_src.${fk.table} add foreign key (${fk.columns.join(', ')}) references adventureworks_src.${fk.refTable} (${fk.refColumns.join(', ')})`,
    ),
    // The manager link replaces hierarchyid; make it a real foreign key too.
    'alter table adventureworks_src.employee add foreign key (manager_id) references adventureworks_src.employee (business_entity_id)',
  ]
  for (const statement of statements) await conn.query(statement)
}
