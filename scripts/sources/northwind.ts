/**
 * Converts Microsoft's official Northwind script (T-SQL for SQL Server, MIT license) into a MySQL script
 * that build-datasets.ts loads as the canonical source.
 *
 * The schema below mirrors instnwnd.sql table by table. Deliberate differences, all documented in the dataset notes:
 *   - identifiers in snake_case (OrderID -> order_id, "Order Details" -> order_details)
 *   - money -> DECIMAL(10,2) and Discount REAL -> DECIMAL(4,2): every value in the data has at most 2 decimals
 *     (asserted below), and exact decimals avoid float rounding differences between the two databases
 *   - bit -> TINYINT(1); nchar/nvarchar -> char/varchar; ntext -> TEXT
 *   - Employees.Photo and Categories.Picture (OLE-wrapped bitmaps) are left out
 *   - CustomerCustomerDemo and CustomerDemographics are left out: the script creates them empty
 *   - the views and stored procedures are not converted
 */

const SCHEMA = `
create table categories (
  category_id   int auto_increment primary key,
  category_name varchar(15) not null,
  description   text
);

create table customers (
  customer_id   char(5) primary key,
  company_name  varchar(40) not null,
  contact_name  varchar(30),
  contact_title varchar(30),
  address       varchar(60),
  city          varchar(15),
  region        varchar(15),
  postal_code   varchar(10),
  country       varchar(15),
  phone         varchar(24),
  fax           varchar(24),
  key customers_city_idx (city),
  key customers_company_name_idx (company_name),
  key customers_postal_code_idx (postal_code),
  key customers_region_idx (region)
);

create table employees (
  employee_id       int auto_increment primary key,
  last_name         varchar(20) not null,
  first_name        varchar(10) not null,
  title             varchar(30),
  title_of_courtesy varchar(25),
  birth_date        datetime,
  hire_date         datetime,
  address           varchar(60),
  city              varchar(15),
  region            varchar(15),
  postal_code       varchar(10),
  country           varchar(15),
  home_phone        varchar(24),
  extension         varchar(4),
  notes             text,
  reports_to        int,
  photo_path        varchar(255),
  key employees_last_name_idx (last_name),
  key employees_postal_code_idx (postal_code),
  foreign key (reports_to) references employees (employee_id)
);

create table shippers (
  shipper_id   int auto_increment primary key,
  company_name varchar(40) not null,
  phone        varchar(24)
);

create table suppliers (
  supplier_id   int auto_increment primary key,
  company_name  varchar(40) not null,
  contact_name  varchar(30),
  contact_title varchar(30),
  address       varchar(60),
  city          varchar(15),
  region        varchar(15),
  postal_code   varchar(10),
  country       varchar(15),
  phone         varchar(24),
  fax           varchar(24),
  home_page     text,
  key suppliers_company_name_idx (company_name),
  key suppliers_postal_code_idx (postal_code)
);

create table orders (
  order_id         int auto_increment primary key,
  customer_id      char(5),
  employee_id      int,
  order_date       datetime,
  required_date    datetime,
  shipped_date     datetime,
  ship_via         int,
  freight          decimal(10, 2) default 0,
  ship_name        varchar(40),
  ship_address     varchar(60),
  ship_city        varchar(15),
  ship_region      varchar(15),
  ship_postal_code varchar(10),
  ship_country     varchar(15),
  key orders_order_date_idx (order_date),
  key orders_shipped_date_idx (shipped_date),
  key orders_ship_postal_code_idx (ship_postal_code),
  foreign key (customer_id) references customers (customer_id),
  foreign key (employee_id) references employees (employee_id),
  foreign key (ship_via) references shippers (shipper_id)
);

create table products (
  product_id        int auto_increment primary key,
  product_name      varchar(40) not null,
  supplier_id       int,
  category_id       int,
  quantity_per_unit varchar(20),
  unit_price        decimal(10, 2) default 0,
  units_in_stock    smallint default 0,
  units_on_order    smallint default 0,
  reorder_level     smallint default 0,
  discontinued      tinyint(1) not null default 0,
  key products_product_name_idx (product_name),
  foreign key (category_id) references categories (category_id),
  foreign key (supplier_id) references suppliers (supplier_id),
  check (unit_price >= 0),
  check (reorder_level >= 0),
  check (units_in_stock >= 0),
  check (units_on_order >= 0)
);

create table order_details (
  order_id   int not null,
  product_id int not null,
  unit_price decimal(10, 2) not null default 0,
  quantity   smallint not null default 1,
  discount   decimal(4, 2) not null default 0,
  primary key (order_id, product_id),
  foreign key (order_id) references orders (order_id),
  foreign key (product_id) references products (product_id),
  check (discount >= 0 and discount <= 1),
  check (quantity > 0),
  check (unit_price >= 0)
);

create table region (
  region_id          int primary key,
  region_description varchar(50) not null
);

create table territories (
  territory_id          varchar(20) primary key,
  territory_description varchar(50) not null,
  region_id             int not null,
  foreign key (region_id) references region (region_id)
);

create table employee_territories (
  employee_id  int not null,
  territory_id varchar(20) not null,
  primary key (employee_id, territory_id),
  foreign key (employee_id) references employees (employee_id),
  foreign key (territory_id) references territories (territory_id)
);
`

/** Source table -> target table, and source column -> target column (null = left out). */
const TABLES: Record<string, { table: string; columns: Record<string, string | null> }> = {
  Categories: { table: 'categories', columns: { CategoryID: 'category_id', CategoryName: 'category_name', Description: 'description', Picture: null } },
  Customers: {
    table: 'customers',
    columns: {
      CustomerID: 'customer_id', CompanyName: 'company_name', ContactName: 'contact_name', ContactTitle: 'contact_title',
      Address: 'address', City: 'city', Region: 'region', PostalCode: 'postal_code', Country: 'country', Phone: 'phone', Fax: 'fax',
    },
  },
  Employees: {
    table: 'employees',
    columns: {
      EmployeeID: 'employee_id', LastName: 'last_name', FirstName: 'first_name', Title: 'title', TitleOfCourtesy: 'title_of_courtesy',
      BirthDate: 'birth_date', HireDate: 'hire_date', Address: 'address', City: 'city', Region: 'region', PostalCode: 'postal_code',
      Country: 'country', HomePhone: 'home_phone', Extension: 'extension', Photo: null, Notes: 'notes', ReportsTo: 'reports_to',
      PhotoPath: 'photo_path',
    },
  },
  Shippers: { table: 'shippers', columns: { ShipperID: 'shipper_id', CompanyName: 'company_name', Phone: 'phone' } },
  Suppliers: {
    table: 'suppliers',
    columns: {
      SupplierID: 'supplier_id', CompanyName: 'company_name', ContactName: 'contact_name', ContactTitle: 'contact_title',
      Address: 'address', City: 'city', Region: 'region', PostalCode: 'postal_code', Country: 'country', Phone: 'phone', Fax: 'fax',
      HomePage: 'home_page',
    },
  },
  Orders: {
    table: 'orders',
    columns: {
      OrderID: 'order_id', CustomerID: 'customer_id', EmployeeID: 'employee_id', OrderDate: 'order_date', RequiredDate: 'required_date',
      ShippedDate: 'shipped_date', ShipVia: 'ship_via', Freight: 'freight', ShipName: 'ship_name', ShipAddress: 'ship_address',
      ShipCity: 'ship_city', ShipRegion: 'ship_region', ShipPostalCode: 'ship_postal_code', ShipCountry: 'ship_country',
    },
  },
  Products: {
    table: 'products',
    columns: {
      ProductID: 'product_id', ProductName: 'product_name', SupplierID: 'supplier_id', CategoryID: 'category_id',
      QuantityPerUnit: 'quantity_per_unit', UnitPrice: 'unit_price', UnitsInStock: 'units_in_stock', UnitsOnOrder: 'units_on_order',
      ReorderLevel: 'reorder_level', Discontinued: 'discontinued',
    },
  },
  'Order Details': {
    table: 'order_details',
    columns: { OrderID: 'order_id', ProductID: 'product_id', UnitPrice: 'unit_price', Quantity: 'quantity', Discount: 'discount' },
  },
  Region: { table: 'region', columns: { RegionID: 'region_id', RegionDescription: 'region_description' } },
  Territories: { table: 'territories', columns: { TerritoryID: 'territory_id', TerritoryDescription: 'territory_description', RegionID: 'region_id' } },
  EmployeeTerritories: { table: 'employee_territories', columns: { EmployeeID: 'employee_id', TerritoryID: 'territory_id' } },
}

/** Column order of the source CREATE TABLE, for INSERTs written without a column list. */
const SOURCE_ORDER: Record<string, string[]> = {
  Customers: ['CustomerID', 'CompanyName', 'ContactName', 'ContactTitle', 'Address', 'City', 'Region', 'PostalCode', 'Country', 'Phone', 'Fax'],
  'Order Details': ['OrderID', 'ProductID', 'UnitPrice', 'Quantity', 'Discount'],
  Region: ['RegionID', 'RegionDescription'],
  Territories: ['TerritoryID', 'TerritoryDescription', 'RegionID'],
  EmployeeTerritories: ['EmployeeID', 'TerritoryID'],
}

const MONEY_COLUMNS = new Set(['freight', 'unit_price', 'discount'])
const DATE_COLUMNS = new Set(['birth_date', 'hire_date', 'order_date', 'required_date', 'shipped_date'])

type Value = { kind: 'null' } | { kind: 'number'; text: string } | { kind: 'string'; text: string } | { kind: 'binary' }

/** Reads one parenthesised VALUES tuple starting at `pos` (just after the opening parenthesis). */
function readTuple(sql: string, start: number): { values: Value[]; end: number } {
  const values: Value[] = []
  let i = start
  const skipSpace = () => {
    while (/\s/.test(sql[i] ?? '')) i++
  }
  for (;;) {
    skipSpace()
    if (sql.startsWith('NULL', i) || sql.startsWith('null', i)) {
      values.push({ kind: 'null' })
      i += 4
    } else if (sql[i] === "'" || (sql[i] === 'N' && sql[i + 1] === "'")) {
      if (sql[i] === 'N') i++
      i++
      let text = ''
      for (;;) {
        const ch = sql[i]
        if (ch === undefined) throw new Error('Unterminated string')
        if (ch === "'") {
          if (sql[i + 1] === "'") {
            text += "'"
            i += 2
            continue
          }
          i++
          break
        }
        text += ch
        i++
      }
      values.push({ kind: 'string', text })
    } else if (sql.startsWith('0x', i)) {
      i += 2
      while (/[0-9A-Fa-f]/.test(sql[i] ?? '')) i++
      values.push({ kind: 'binary' })
    } else {
      const m = /^-?\d+(\.\d+)?/.exec(sql.slice(i, i + 40))
      if (!m) throw new Error(`Unexpected token at ${i}: ${sql.slice(i, i + 30)}`)
      values.push({ kind: 'number', text: m[0] })
      i += m[0].length
    }
    skipSpace()
    if (sql[i] === ',') {
      i++
      continue
    }
    if (sql[i] === ')') return { values, end: i + 1 }
    throw new Error(`Expected , or ) at ${i}: ${sql.slice(i, i + 30)}`)
  }
}

const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`

function toMysqlDate(us: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(us)
  if (!m) throw new Error(`Unexpected date format: ${us}`)
  return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')} 00:00:00`
}

function literal(column: string, v: Value): string {
  if (v.kind === 'null') return 'null'
  if (v.kind === 'binary') throw new Error(`Binary value for ${column}, which is not left out`)
  if (DATE_COLUMNS.has(column)) {
    if (v.kind !== 'string') throw new Error(`Date column ${column} has a non-string value`)
    return quote(toMysqlDate(v.text))
  }
  if (v.kind === 'number') {
    if (MONEY_COLUMNS.has(column) && /\.\d{3,}$/.test(v.text)) throw new Error(`${column} = ${v.text} has more than 2 decimals`)
    return v.text
  }
  return quote(v.text)
}

const INSERT = /insert\s+(?:into\s+)?(?:\[dbo\]\.)?(?:"([^"]+)"|\[([^\]]+)\]|(\w+))\s*(?:\(([^)]*)\))?\s*values\s*\(/gi

export function convertNorthwind(tsql: string): { sql: string; rowCounts: Record<string, number> } {
  const rows = new Map<string, string[]>()
  const rowCounts: Record<string, number> = {}
  for (const m of tsql.matchAll(INSERT)) {
    const source = m[1] ?? m[2] ?? m[3]!
    const mapping = TABLES[source]
    if (!mapping) throw new Error(`INSERT into unknown table ${source}`)
    const columns = m[4] ? m[4].split(',').map((c) => c.trim().replace(/^["[]|["\]]$/g, '')) : SOURCE_ORDER[source]
    if (!columns) throw new Error(`No column order known for ${source}`)
    const { values } = readTuple(tsql, m.index! + m[0].length)
    if (values.length !== columns.length) throw new Error(`${source}: ${values.length} values for ${columns.length} columns`)
    const kept = columns.flatMap((c, i) => {
      const target = mapping.columns[c]
      if (target === undefined) throw new Error(`${source}.${c} is not mapped`)
      return target === null ? [] : [[target, values[i]!] as const]
    })
    const key = `${mapping.table} (${kept.map(([c]) => c).join(', ')})`
    rows.set(key, [...(rows.get(key) ?? []), `(${kept.map(([c, v]) => literal(c, v)).join(', ')})`])
    rowCounts[mapping.table] = (rowCounts[mapping.table] ?? 0) + 1
  }

  const out = [
    '-- Generated by scripts/sources/northwind.ts from Microsoft\'s instnwnd.sql (MIT). Do not edit.',
    'drop database if exists northwind_src;',
    'create database northwind_src character set utf8mb4 collate utf8mb4_0900_ai_ci;',
    'use northwind_src;',
    'set foreign_key_checks = 0;',
    SCHEMA.trim(),
  ]
  for (const [target, tuples] of rows) {
    for (let i = 0; i < tuples.length; i += 500) out.push(`insert into ${target} values\n${tuples.slice(i, i + 500).join(',\n')};`)
  }
  out.push('set foreign_key_checks = 1;')
  return { sql: out.join('\n') + '\n', rowCounts }
}
