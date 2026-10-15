/**
 * Builds every dataset for both databases from ONE canonical copy of the data.
 *
 *   official source (loaded into MySQL as-is)
 *     -> read schema + rows
 *     -> public/datasets/<id>.pg.sql        (loaded by PGlite in the browser)
 *     -> datasets/build/<id>.mysql.sql      (loaded into the local MySQL 8.4 as pb_<id>)
 *     -> src/content/datasets/<id>.schema.json  (schema shown in the UI)
 *   then loads both builds and compares every table row by row.
 *
 * Usage: npm run build:datasets [-- sakila chinook]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { connectMysql, type MysqlConnection } from './lib/mysql'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { loadAdventureWorksSample } from './sources/adventureworks'
import { loadEmployeesSample } from './sources/employees'
import { convertNorthwind } from './sources/northwind'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MYSQL_CONTAINER = 'sql-playbook-mysql'

interface DatasetConfig {
  id: string
  /** MySQL schema holding the official, unmodified source. */
  sourceSchema: string
  /** Source files to load into sourceSchema before building (mysql CLI scripts). */
  sourceFiles?: string[]
  /** Or: SQL generated from a non-MySQL original; always reloaded so converter changes take effect. */
  sourceSql?: () => string
  /** Or: a custom loader, e.g. one that builds a sample from a database too big for the browser. */
  customLoad?: (conn: MysqlConnection) => Promise<void>
  /** Convert PascalCase identifiers to snake_case (Chinook uses PascalCase). */
  snakeCase: boolean
  /** Columns that cannot exist in both databases, e.g. MySQL GEOMETRY. */
  dropColumns?: Record<string, string[]>
  dropTables?: string[]
}

const DATASETS: DatasetConfig[] = [
  {
    id: 'sakila',
    sourceSchema: 'sakila',
    sourceFiles: ['datasets/raw/sakila-db/sakila-schema.sql', 'datasets/raw/sakila-db/sakila-data.sql'],
    snakeCase: false,
    // address.location is a MySQL spatial type with no plain-Postgres equivalent.
    // film_text duplicates film.title/description for MySQL full-text search.
    dropColumns: { address: ['location'] },
    dropTables: ['film_text'],
  },
  {
    id: 'chinook',
    sourceSchema: 'Chinook',
    sourceFiles: ['datasets/raw/Chinook_MySql.sql'],
    snakeCase: true,
  },
  {
    id: 'northwind',
    sourceSchema: 'northwind_src',
    // Microsoft's official T-SQL script, converted to MySQL (see scripts/sources/northwind.ts).
    sourceSql: () => convertNorthwind(readFileSync(join(ROOT, 'datasets/raw/instnwnd.sql'), 'utf8')).sql,
    snakeCase: false,
  },
  {
    id: 'employees',
    sourceSchema: 'employees_sample',
    // A consistent sample of datacharmer/test_db (see scripts/sources/employees.ts).
    customLoad: (conn) => loadEmployeesSample(conn, ROOT, MYSQL_CONTAINER),
    snakeCase: false,
  },
  {
    id: 'adventureworks',
    sourceSchema: 'adventureworks_src',
    // Microsoft's OLTP install script converted to MySQL, sales orders sampled (see scripts/sources/adventureworks.ts).
    customLoad: (conn) => loadAdventureWorksSample(conn, ROOT, MYSQL_CONTAINER),
    snakeCase: false,
  },
]

// ---------- schema model ----------

interface Column {
  name: string
  sourceName: string
  dataType: string
  columnType: string
  nullable: boolean
  maxLength: number | null
  precision: number | null
  scale: number | null
  /** Raw MySQL default, e.g. CURRENT_TIMESTAMP, 4.99 or G. */
  defaultValue: string | null
  autoIncrement: boolean
  onUpdateNow: boolean
}

interface ForeignKey {
  columns: string[]
  refTable: string
  refColumns: string[]
}

interface Table {
  name: string
  sourceName: string
  columns: Column[]
  primaryKey: string[]
  uniques: string[][]
  indexes: string[][]
  foreignKeys: ForeignKey[]
  rowCount: number
}

const toSnake = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()

async function readSchema(conn: MysqlConnection, cfg: DatasetConfig): Promise<Table[]> {
  const rename = (s: string) => (cfg.snakeCase ? toSnake(s) : s)
  const schema = cfg.sourceSchema

  const [tableRows] = await conn.query<mysql.RowDataPacket[]>(
    `select table_name as t from information_schema.tables
     where table_schema = ? and table_type = 'BASE TABLE' order by table_name`,
    [schema],
  )
  const [colRows] = await conn.query<mysql.RowDataPacket[]>(
    `select table_name as t, column_name as c, data_type as dt, column_type as ct, is_nullable as n,
            character_maximum_length as len, numeric_precision as p, numeric_scale as s,
            column_default as def, extra as extra
     from information_schema.columns where table_schema = ? order by table_name, ordinal_position`,
    [schema],
  )
  const [keyRows] = await conn.query<mysql.RowDataPacket[]>(
    `select k.table_name as t, k.constraint_name as name, tc.constraint_type as type, k.column_name as c,
            k.referenced_table_name as rt, k.referenced_column_name as rc
     from information_schema.key_column_usage k
     join information_schema.table_constraints tc
       on tc.constraint_schema = k.constraint_schema and tc.table_name = k.table_name and tc.constraint_name = k.constraint_name
     where k.table_schema = ? order by k.table_name, k.constraint_name, k.ordinal_position`,
    [schema],
  )
  const [idxRows] = await conn.query<mysql.RowDataPacket[]>(
    `select table_name as t, index_name as name, column_name as c
     from information_schema.statistics
     where table_schema = ? and non_unique = 1 and column_name is not null
     order by table_name, index_name, seq_in_index`,
    [schema],
  )

  const dropTables = new Set(cfg.dropTables ?? [])
  const tables: Table[] = []
  for (const { t } of tableRows as { t: string }[]) {
    if (dropTables.has(t)) continue
    const dropped = new Set(cfg.dropColumns?.[t] ?? [])
    const columns: Column[] = colRows
      .filter((r) => r.t === t && !dropped.has(r.c))
      .map((r) => ({
        name: rename(r.c),
        sourceName: r.c,
        dataType: String(r.dt).toLowerCase(),
        // Keep the original case: ENUM/SET values are case-sensitive data.
        columnType: String(r.ct),
        nullable: r.n === 'YES',
        maxLength: r.len === null ? null : Number(r.len),
        precision: r.p === null ? null : Number(r.p),
        scale: r.s === null ? null : Number(r.s),
        defaultValue: r.def === null ? null : String(r.def),
        autoIncrement: /auto_increment/i.test(r.extra),
        onUpdateNow: /on update current_timestamp/i.test(r.extra),
      }))

    const group = (rows: mysql.RowDataPacket[]) => {
      const byName = new Map<string, mysql.RowDataPacket[]>()
      for (const r of rows) byName.set(r.name, [...(byName.get(r.name) ?? []), r])
      return [...byName.values()]
    }
    const keys = keyRows.filter((r) => r.t === t)
    const pk = keys.filter((r) => r.type === 'PRIMARY KEY').map((r) => rename(r.c))
    const uniques = group(keys.filter((r) => r.type === 'UNIQUE')).map((g) => g.map((r) => rename(r.c)))
    const foreignKeys = group(keys.filter((r) => r.type === 'FOREIGN KEY'))
      .filter((g) => !dropTables.has(g[0]!.rt))
      .map((g) => ({
        columns: g.map((r) => rename(r.c)),
        refTable: rename(g[0]!.rt),
        refColumns: g.map((r) => rename(r.rc)),
      }))
    const indexes = group(idxRows.filter((r) => r.t === t && !dropped.has(r.c))).map((g) => g.map((r) => rename(r.c)))

    const [[countRow]] = (await conn.query(`select count(*) as n from \`${schema}\`.\`${t}\``)) as [mysql.RowDataPacket[], unknown]
    tables.push({
      name: rename(t),
      sourceName: t,
      columns,
      primaryKey: pk,
      uniques,
      indexes,
      foreignKeys,
      rowCount: Number(countRow!.n),
    })
  }
  return tables
}

// ---------- type mapping ----------

function pgType(c: Column): string {
  const unsigned = c.columnType.toLowerCase().includes('unsigned')
  switch (c.dataType) {
    case 'tinyint':
      return 'smallint'
    case 'smallint':
      return unsigned ? 'integer' : 'smallint'
    case 'mediumint':
      return 'integer'
    case 'int':
      return unsigned ? 'bigint' : 'integer'
    case 'bigint':
      return 'bigint'
    case 'decimal':
      return `numeric(${c.precision}, ${c.scale})`
    case 'float':
      return 'real'
    case 'double':
      return 'double precision'
    // MySQL strips trailing spaces from CHAR on read; Postgres keeps them. varchar behaves the same in both.
    case 'char':
    case 'varchar':
      return `varchar(${c.maxLength})`
    case 'tinytext':
    case 'text':
    case 'mediumtext':
    case 'longtext':
    case 'enum':
    case 'set':
      return 'text'
    case 'date':
      return 'date'
    case 'datetime':
    case 'timestamp':
      return 'timestamp(0)'
    case 'time':
      return 'time(0)'
    case 'year':
      return 'smallint'
    case 'blob':
    case 'tinyblob':
    case 'mediumblob':
    case 'longblob':
    case 'binary':
    case 'varbinary':
      return 'bytea'
    default:
      throw new Error(`No Postgres type for MySQL ${c.columnType} (${c.name})`)
  }
}

function enumCheck(c: Column): string | null {
  if (c.dataType !== 'enum') return null
  const values = c.columnType.slice(5, -1) // enum('a','b') -> 'a','b'
  return `check (${c.name} in (${values}))`
}

function mysqlType(c: Column): string {
  // Keep the original MySQL type, but use a plain varchar for NVARCHAR-style columns.
  return c.columnType.replace(/ (character set|collate) \S+/gi, '')
}

// ---------- names ----------

/** Constraint and index names must fit both limits (PostgreSQL 63, MySQL 64 characters). */
function objectName(name: string): string {
  if (name.length <= 60) return name
  let hash = 2166136261
  for (const ch of name) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0
  return `${name.slice(0, 51)}_${hash.toString(16).padStart(8, '0')}`
}

// ---------- defaults ----------

const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s)

function pgDefault(c: Column): string | null {
  if (c.defaultValue === null || c.autoIncrement) return null
  if (/^current_timestamp(\(\))?$/i.test(c.defaultValue)) return 'current_timestamp'
  if (isNumeric(c.defaultValue)) return c.defaultValue
  return `'${c.defaultValue.replace(/'/g, "''")}'`
}

function mysqlDefault(c: Column): string | null {
  if (c.defaultValue === null || c.autoIncrement) return null
  if (/^current_timestamp(\(\))?$/i.test(c.defaultValue)) return 'current_timestamp'
  if (isNumeric(c.defaultValue)) return c.defaultValue
  return mysql.escape(c.defaultValue)
}

// ---------- SQL emitters ----------

const BATCH = 1000

function pgLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'::bytea`
  return `'${String(value).replace(/'/g, "''")}'`
}

function emitPostgres(cfg: DatasetConfig, tables: Table[], rows: Map<string, unknown[][]>): string {
  const out: string[] = [
    `-- ${cfg.id}: built by scripts/build-datasets.ts from the official source. Do not edit by hand.`,
    'set client_min_messages = warning;',
  ]
  for (const t of tables) {
    const defs = t.columns.map((c) => {
      const check = enumCheck(c)
      const identity = c.autoIncrement ? ' generated by default as identity' : ''
      const def = pgDefault(c)
      return `  ${c.name} ${pgType(c)}${identity}${def ? ' default ' + def : ''}${c.nullable ? '' : ' not null'}${check ? ' ' + check : ''}`
    })
    if (t.primaryKey.length) defs.push(`  primary key (${t.primaryKey.join(', ')})`)
    out.push(`create table ${t.name} (\n${defs.join(',\n')}\n);`)
  }
  for (const t of tables) {
    const data = rows.get(t.name) ?? []
    for (let i = 0; i < data.length; i += BATCH) {
      const values = data.slice(i, i + BATCH).map((r) => `(${r.map(pgLiteral).join(', ')})`)
      out.push(`insert into ${t.name} (${t.columns.map((c) => c.name).join(', ')}) values\n${values.join(',\n')};`)
    }
  }
  // Identity columns continue after the highest loaded id, like MySQL AUTO_INCREMENT does.
  for (const t of tables)
    for (const c of t.columns.filter((col) => col.autoIncrement))
      out.push(`select setval(pg_get_serial_sequence('${t.name}', '${c.name}'), (select max(${c.name}) from ${t.name}));`)
  for (const t of tables) {
    for (const u of t.uniques) out.push(`create unique index ${objectName(`${t.name}_${u.join('_')}_key`)} on ${t.name} (${u.join(', ')});`)
    for (const ix of t.indexes) out.push(`create index ${objectName(`${t.name}_${ix.join('_')}_idx`)} on ${t.name} (${ix.join(', ')});`)
    for (const fk of t.foreignKeys)
      out.push(
        `alter table ${t.name} add constraint ${objectName(`${t.name}_${fk.columns.join('_')}_fkey`)} foreign key (${fk.columns.join(', ')}) references ${fk.refTable} (${fk.refColumns.join(', ')});`,
      )
  }
  out.push('analyze;')
  return out.join('\n') + '\n'
}

function emitMysql(cfg: DatasetConfig, tables: Table[], rows: Map<string, unknown[][]>): string {
  const db = `pb_${cfg.id}`
  const q = (s: string) => `\`${s}\``
  const out: string[] = [
    `-- ${cfg.id}: built by scripts/build-datasets.ts from the official source. Do not edit by hand.`,
    `drop database if exists ${db};`,
    `create database ${db} character set utf8mb4 collate utf8mb4_0900_ai_ci;`,
    `use ${db};`,
    'set foreign_key_checks = 0;',
  ]
  for (const t of tables) {
    const defs = t.columns.map((c) => {
      const def = mysqlDefault(c)
      return `  ${q(c.name)} ${mysqlType(c)}${c.nullable ? '' : ' not null'}${def ? ' default ' + def : ''}${c.onUpdateNow ? ' on update current_timestamp' : ''}${c.autoIncrement ? ' auto_increment' : ''}`
    })
    if (t.primaryKey.length) defs.push(`  primary key (${t.primaryKey.map(q).join(', ')})`)
    for (const u of t.uniques) defs.push(`  unique key ${q(objectName(`${t.name}_${u.join('_')}_key`))} (${u.map(q).join(', ')})`)
    for (const ix of t.indexes) defs.push(`  key ${q(objectName(`${t.name}_${ix.join('_')}_idx`))} (${ix.map(q).join(', ')})`)
    out.push(`create table ${q(t.name)} (\n${defs.join(',\n')}\n) engine=InnoDB;`)
  }
  for (const t of tables) {
    const data = rows.get(t.name) ?? []
    for (let i = 0; i < data.length; i += BATCH) {
      const values = data.slice(i, i + BATCH).map((r) => `(${r.map((v) => mysql.escape(v as Parameters<typeof mysql.escape>[0])).join(', ')})`)
      out.push(`insert into ${q(t.name)} (${t.columns.map((c) => q(c.name)).join(', ')}) values\n${values.join(',\n')};`)
    }
  }
  for (const t of tables)
    for (const fk of t.foreignKeys)
      out.push(
        `alter table ${q(t.name)} add constraint ${q(objectName(`${t.name}_${fk.columns.join('_')}_fkey`))} foreign key (${fk.columns.map(q).join(', ')}) references ${q(fk.refTable)} (${fk.refColumns.map(q).join(', ')});`,
      )
  out.push('set foreign_key_checks = 1;', 'analyze table ' + tables.map((t) => q(t.name)).join(', ') + ';')
  return out.join('\n') + '\n'
}

// ---------- build + parity check ----------

/** Loads the official source once. Uses the mysql CLI because the scripts rely on DELIMITER. */
async function loadSource(conn: MysqlConnection, cfg: DatasetConfig) {
  const env = { ...process.env, PATH: `${process.env.HOME}/.orbstack/bin:${process.env.PATH}` }
  const mysqlCli = ['exec', '-i', MYSQL_CONTAINER, 'mysql', '--default-character-set=utf8mb4']
  if (cfg.customLoad) {
    await cfg.customLoad(conn)
    return
  }
  if (cfg.sourceSql) {
    execFileSync('docker', mysqlCli, { input: cfg.sourceSql(), env })
    return
  }
  const [found] = await conn.query<mysql.RowDataPacket[]>(
    'select 1 from information_schema.schemata where schema_name = ?',
    [cfg.sourceSchema],
  )
  if (found.length > 0) return
  for (const file of cfg.sourceFiles ?? []) {
    execFileSync('docker', mysqlCli, { input: readFileSync(join(ROOT, file)), env })
  }
}

async function buildDataset(cfg: DatasetConfig) {
  const conn = await connectMysql()
  console.log(`\n== ${cfg.id} ==`)
  await loadSource(conn, cfg)
  const tables = await readSchema(conn, cfg)

  // Rows in a stable order so both builds are byte-for-byte reproducible.
  const rows = new Map<string, unknown[][]>()
  for (const t of tables) {
    const cols = t.columns.map((c) => `\`${c.sourceName}\``).join(', ')
    const order = (t.primaryKey.length ? t.columns.filter((c) => t.primaryKey.includes(c.name)) : t.columns)
      .map((c) => `\`${c.sourceName}\``)
      .join(', ')
    const [data] = await conn.query({
      sql: `select ${cols} from \`${cfg.sourceSchema}\`.\`${t.sourceName}\` order by ${order}`,
      rowsAsArray: true,
    })
    rows.set(t.name, data as unknown[][])
  }

  const pgSql = emitPostgres(cfg, tables, rows)
  const mySql = emitMysql(cfg, tables, rows)
  const pgPath = join(ROOT, 'public/datasets', `${cfg.id}.pg.sql`)
  const myPath = join(ROOT, 'datasets/build', `${cfg.id}.mysql.sql`)
  const schemaPath = join(ROOT, 'src/content/datasets', `${cfg.id}.schema.json`)
  for (const p of [pgPath, myPath, schemaPath]) mkdirSync(dirname(p), { recursive: true })
  writeFileSync(pgPath, pgSql)
  writeFileSync(myPath, mySql)
  writeFileSync(
    schemaPath,
    JSON.stringify(
      tables.map((t) => ({
        name: t.name,
        rows: t.rowCount,
        primaryKey: t.primaryKey,
        columns: t.columns.map((c) => ({ name: c.name, type: pgType(c), nullable: c.nullable })),
        foreignKeys: t.foreignKeys,
      })),
      null,
      2,
    ) + '\n',
  )
  console.log(`wrote ${pgPath.replace(ROOT + '/', '')} (${(pgSql.length / 1024).toFixed(0)} KB)`)
  console.log(`wrote ${myPath.replace(ROOT + '/', '')} (${(mySql.length / 1024).toFixed(0)} KB)`)

  // Load both builds and compare every table.
  await conn.query(mySql)
  const pg = createPglite()
  await pg.exec(pgSql)
  let ok = true
  for (const t of tables) {
    const order = (t.primaryKey.length ? t.primaryKey : t.columns.map((c) => c.name)).join(', ')
    const sql = `select * from ${t.name} order by ${order}`
    const pgRows = (await pg.query(sql, [], { rowMode: 'array' })).rows as unknown[][]
    const [myRows] = await conn.query({ sql: `select * from pb_${cfg.id}.\`${t.name}\` order by ${order}`, rowsAsArray: true })
    const cmp = compareRowSets(pgRows, myRows as unknown[][], true)
    const status = cmp.equal && pgRows.length === t.rowCount ? 'ok ' : 'FAIL'
    if (status !== 'ok ') ok = false
    console.log(`  ${status} ${t.name.padEnd(16)} ${String(pgRows.length).padStart(6)} rows${cmp.equal ? '' : ' — ' + cmp.reason}`)
  }
  await pg.close()
  await conn.end()
  if (!ok) throw new Error(`${cfg.id}: PostgreSQL and MySQL builds differ`)
  console.log(`  ${cfg.id}: PostgreSQL and MySQL builds are identical`)
}

const only = process.argv.slice(2)
for (const cfg of DATASETS.filter((d) => only.length === 0 || only.includes(d.id))) {
  await buildDataset(cfg)
}
