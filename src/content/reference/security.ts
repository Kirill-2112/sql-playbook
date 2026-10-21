import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const TABLE = 'create table report (id int, region varchar(10), amount int);'
const PG_GRANTS = (role: string) =>
  `select table_name, privilege_type from information_schema.role_table_grants where grantee = '${role}' order by privilege_type;`
const MY_GRANTS = (role: string) =>
  `select table_name, privilege_type from information_schema.table_privileges where grantee = '''${role}''@''%''' order by privilege_type;`

export const securityEntries: ReferenceEntry[] = [
  {
    id: 'create-role',
    name: 'CREATE ROLE / CREATE USER',
    group: 'security',
    summary:
      'A role is a named set of privileges. In PostgreSQL a user is just a role that can log in; MySQL has separate CREATE USER (people, user@host) and CREATE ROLE (groups).',
    postgres: 'create role analyst nologin;\ncreate role maria login password \'…\';',
    mysql: "create role analyst;\ncreate user 'maria'@'%' identified by '…';",
    mysqlNote: 'MySQL accounts are user@host: the same name from another host is a different account. Roles exist since MySQL 8.0.',
    example: {
      postgres: `create role analyst nologin;
select rolname, not rolcanlogin as cannot_log_in from pg_roles where rolname = 'analyst';`,
      mysql: `create role analyst;
select user, account_locked = 'Y' as cannot_log_in from mysql.user where user = 'analyst';`,
    },
    match: '\\bcreate\\s+(role|user)\\b',
    docs: [
      { label: 'PostgreSQL: CREATE ROLE', url: PG + 'sql-createrole.html' },
      { label: 'MySQL: CREATE ROLE', url: MY + 'create-role.html' },
    ],
  },
  {
    id: 'grant',
    name: 'GRANT',
    group: 'security',
    summary:
      'Gives a role the right to do something with an object: SELECT, INSERT, UPDATE, DELETE on a table, EXECUTE on a function. Give only what the job needs (least privilege).',
    postgres: 'grant select, insert on orders, order_details to clerk;',
    mysql: 'grant select, insert on orders to clerk;\ngrant select, insert on order_details to clerk;',
    mysqlNote: 'A MySQL GRANT names one table (or db.* for a whole database) per statement.',
    example: {
      postgres: `${TABLE}
create role clerk nologin;
grant select, insert on report to clerk;
${PG_GRANTS('clerk')}`,
      mysql: `${TABLE}
create role clerk;
grant select, insert on report to clerk;
${MY_GRANTS('clerk')}`,
    },
    match: '\\bgrant\\s+(select|insert|update|delete|all|usage|execute)\\b',
    docs: [
      { label: 'PostgreSQL: GRANT', url: PG + 'sql-grant.html' },
      { label: 'MySQL: GRANT', url: MY + 'grant.html' },
    ],
  },
  {
    id: 'revoke',
    name: 'REVOKE',
    group: 'security',
    summary: 'Takes a privilege back. It mirrors GRANT, with FROM instead of TO.',
    postgres: 'revoke insert, update on products from clerk;',
    mysql: 'revoke insert, update on products from clerk;',
    example: {
      postgres: `${TABLE}
create role clerk nologin;
grant select, insert, update on report to clerk;
revoke insert, update on report from clerk;
${PG_GRANTS('clerk')}`,
      mysql: `${TABLE}
create role clerk;
grant select, insert, update on report to clerk;
revoke insert, update on report from clerk;
${MY_GRANTS('clerk')}`,
    },
    match: '\\brevoke\\b',
    docs: [
      { label: 'PostgreSQL: REVOKE', url: PG + 'sql-revoke.html' },
      { label: 'MySQL: REVOKE', url: MY + 'revoke.html' },
    ],
  },
  {
    id: 'grant-all-tables',
    name: 'GRANT ON ALL TABLES / db.*',
    group: 'security',
    summary:
      'Grants a privilege on every table at once. PostgreSQL expands it to the tables that exist now (ALTER DEFAULT PRIVILEGES covers future ones); a MySQL db.* grant applies to future tables too.',
    postgres: 'grant select on all tables in schema public to auditor;\nalter default privileges in schema public grant select on tables to auditor;',
    mysql: 'grant select on shop.* to auditor;',
    example: {
      postgres: `${TABLE}
create role auditor nologin;
grant select on all tables in schema public to auditor;
select distinct privilege_type from information_schema.role_table_grants where grantee = 'auditor';`,
      mysql: `${TABLE}
create role auditor;
grant select on * to auditor;
select privilege_type from information_schema.schema_privileges where grantee = '''auditor''@''%''';`,
    },
    match: '\\bon\\s+all\\s+tables\\s+in\\s+schema\\b|\\bon\\s+(\\w+\\.)?\\*\\s+to\\b|\\balter\\s+default\\s+privileges\\b',
    docs: [
      { label: 'PostgreSQL: GRANT', url: PG + 'sql-grant.html' },
      { label: 'PostgreSQL: ALTER DEFAULT PRIVILEGES', url: PG + 'sql-alterdefaultprivileges.html' },
      { label: 'MySQL: database privileges', url: MY + 'grant.html#grant-database-privileges' },
    ],
  },
  {
    id: 'column-privileges',
    name: 'Column privileges',
    group: 'security',
    summary: 'A column list after SELECT, INSERT or UPDATE limits the privilege to those columns, e.g. a partner can see prices but not costs.',
    postgres: 'grant select (product_id, product_name) on products to partner;',
    mysql: 'grant select (product_id, product_name) on products to partner;',
    example: {
      postgres: `${TABLE}
create role partner nologin;
grant select (id, region) on report to partner;
select column_name, privilege_type from information_schema.role_column_grants where grantee = 'partner' order by column_name;`,
      mysql: `${TABLE}
create role partner;
grant select (id, region) on report to partner;
select column_name, privilege_type from information_schema.column_privileges where grantee = '''partner''@''%''' order by column_name;`,
    },
    match: '\\bgrant\\s+(select|insert|update)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: GRANT', url: PG + 'sql-grant.html' },
      { label: 'MySQL: column privileges', url: MY + 'grant.html#grant-column-privileges' },
    ],
  },
  {
    id: 'role-membership',
    name: 'GRANT role TO user',
    group: 'security',
    summary: 'Makes a user a member of a role, so they get its privileges. Privileges go to roles, people get roles: one change when someone moves team.',
    postgres: 'grant analyst to maria;',
    mysql: 'grant analyst to maria;\nset default role analyst to maria;',
    mysqlNote: 'In MySQL a granted role is not active until the session runs SET ROLE, unless it is made a default role.',
    example: {
      postgres: `create role analyst nologin;
create role maria login;
grant analyst to maria;
select r.rolname as role from pg_auth_members m
join pg_roles r on r.oid = m.roleid
join pg_roles u on u.oid = m.member
where u.rolname = 'maria';`,
      mysql: `create role analyst;
create user maria;
grant analyst to maria;
select from_user as role from mysql.role_edges where to_user = 'maria';`,
    },
    match: '\\bgrant\\s+\\w+\\s+to\\s+\\w+',
    docs: [
      { label: 'PostgreSQL: role membership', url: PG + 'role-membership.html' },
      { label: 'MySQL: using roles', url: MY + 'roles.html' },
    ],
  },
  {
    id: 'set-role',
    name: 'SET ROLE',
    group: 'security',
    summary: 'Switches the current session to act as another role you belong to, for example to test what a role can see.',
    postgres: 'set role report_reader;\n…\nreset role;',
    mysql: 'set role report_reader;',
    mysqlNote: 'In MySQL SET ROLE activates roles granted to your own account; it does not let you act as another user.',
    example: {
      postgres: `${TABLE}
create role reader nologin;
grant select on report to reader;
set role reader;
select current_user as acting_as;`,
      mysql: null,
    },
    match: '\\bset\\s+role\\b',
    docs: [
      { label: 'PostgreSQL: SET ROLE', url: PG + 'sql-set-role.html' },
      { label: 'MySQL: SET ROLE', url: MY + 'set-role.html' },
    ],
  },
  {
    id: 'row-level-security',
    name: 'ROW LEVEL SECURITY',
    group: 'security',
    summary:
      'PostgreSQL only: policies decide which rows each role may see or change, so one table can serve many tenants or sales reps safely. Table owners and superusers bypass them unless FORCE is set.',
    postgres:
      "alter table report enable row level security;\ncreate policy own_region on report\n  using (region = current_user);",
    mysql: null,
    mysqlNote: 'MySQL has no row-level security. The usual substitute is a view with a WHERE on the current user, granted instead of the table.',
    example: {
      postgres: `create table report (id int, region varchar(10), amount int);
insert into report values (1, 'north', 10), (2, 'south', 20), (3, 'north', 30);
alter table report enable row level security;
create policy own_region on report using (region = current_user);
create role north nologin;
grant select on report to north;
set role north;
select id, amount from report order by id;`,
      mysql: null,
    },
    match: '\\b(row\\s+level\\s+security|create\\s+policy)\\b',
    docs: [{ label: 'PostgreSQL: row security policies', url: PG + 'ddl-rowsecurity.html' }],
  },
]
