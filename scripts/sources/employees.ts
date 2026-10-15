/**
 * Employees sample database (datacharmer/test_db, CC BY-SA 3.0): 300,024 employees and 2.8 million salary rows.
 * Too big for the browser, so the build uses a deterministic, self-consistent sample:
 *   - all 9 departments and all 24 department-manager records (with those managers),
 *   - every employee whose emp_no is a multiple of 50,
 *   - for each sampled employee, their complete history: every salary, title and department assignment.
 * The full database is loaded first and checked with the project's own integrity test (counts and checksums).
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import type { MysqlConnection } from '../lib/mysql'

const SAMPLE_EVERY = 50
const TABLES = ['departments', 'employees', 'dept_manager', 'dept_emp', 'titles', 'salaries']

export async function loadEmployeesSample(conn: MysqlConnection, root: string, container: string): Promise<void> {
  const env = { ...process.env, PATH: `${process.env.HOME}/.orbstack/bin:${process.env.PATH}` }
  const [found] = (await conn.query(`select 1 from information_schema.schemata where schema_name = 'employees'`)) as [unknown[], unknown]

  if (found.length === 0) {
    // employees.sql pulls in the .dump files with the mysql client's SOURCE command, so it runs inside the container.
    const dir = join(root, 'datasets/raw/test_db')
    execFileSync('docker', ['exec', container, 'rm', '-rf', '/tmp/test_db'], { env })
    execFileSync('docker', ['cp', dir, `${container}:/tmp/test_db`], { env })
    execFileSync('docker', ['exec', '-w', '/tmp/test_db', container, 'sh', '-c', 'mysql < employees.sql'], { env })
    const check = execFileSync('docker', ['exec', '-w', '/tmp/test_db', container, 'sh', '-c', 'mysql -t < test_employees_md5.sql'], {
      env,
      encoding: 'utf8',
    })
    if (!/\|\s*CRC\s*\|\s*OK\s*\|/.test(check) || !/\|\s*count\s*\|\s*OK\s*\|/.test(check)) {
      throw new Error(`Employees integrity test failed:\n${check}`)
    }
  }

  const ddl = [
    'drop database if exists employees_sample',
    'create database employees_sample character set utf8mb4 collate utf8mb4_0900_ai_ci',
    ...TABLES.map((t) => `create table employees_sample.${t} like employees.${t}`),
    `insert into employees_sample.departments select * from employees.departments`,
    `insert into employees_sample.employees
       select * from employees.employees
       where emp_no % ${SAMPLE_EVERY} = 0 or emp_no in (select emp_no from employees.dept_manager)`,
    ...['dept_manager', 'dept_emp', 'titles', 'salaries'].map(
      (t) => `insert into employees_sample.${t}
                select * from employees.${t}
                where emp_no in (select emp_no from employees_sample.employees)`,
    ),
    // CREATE TABLE … LIKE does not copy foreign keys; add the original ones back.
    ...['dept_manager', 'dept_emp'].flatMap((t) => [
      `alter table employees_sample.${t} add foreign key (emp_no) references employees_sample.employees (emp_no)`,
      `alter table employees_sample.${t} add foreign key (dept_no) references employees_sample.departments (dept_no)`,
    ]),
    ...['titles', 'salaries'].map(
      (t) => `alter table employees_sample.${t} add foreign key (emp_no) references employees_sample.employees (emp_no)`,
    ),
  ]
  for (const statement of ddl) await conn.query(statement)
}
