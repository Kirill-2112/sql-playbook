# MySQL runner

MySQL mode in the app runs the learner's SQL on a real MySQL 8.4 server; PostgreSQL runs in the browser (PGlite).

- **Server**: Oracle Cloud Always Free, `VM.Standard.A1.Flex` (2 OCPU, 12 GB, Ubuntu 24.04 arm64), region
  il-jerusalem-1, public IP 129.159.152.119, user `ubuntu`, key `~/.ssh/sql_playbook_oracle` (owner's Mac only).
- **Firewall**: Oracle security list allows TCP 22 and 443; the server's iptables allow 22, 80, 443.
- **Containers** (`compose.yaml`, in `~/runner` on the server): `mysql` (mysql:8.4, no published port), `runner`
  (node:22-alpine running `runner.mjs`, on 127.0.0.1:8080), `caddy` (HTTPS with a Let's Encrypt certificate for
  `RUNNER_HOST`, host network).
- **Secrets**: `~/runner/.env` on the server only (`MYSQL_ROOT_PASSWORD`, generated there; `RUNNER_HOST`;
  `ALLOWED_ORIGINS`). The `reader` password is random on every start and lives only in the runner's memory.

## How a run is kept safe

- Only the site's origins (`ALLOWED_ORIGINS`), JSON only, at most 600 KB.
- Query tasks run as `reader`: SELECT on `pb_<dataset>` only, no files, no other databases.
- Script tasks (setupSql/checkSql) run on `s_<random>`, a copy of the tables the script mentions, as `w_<random>`
  with rights on that copy only; both are dropped afterwards (and on start-up, if a crash left any).
  The copy gets ANALYZE TABLE first: without fresh statistics MySQL ignores its indexes (seconds instead of ms).
  SQL with row locks (FOR UPDATE / FOR SHARE / LOCK TABLES) also runs on a copy (`LOCKS` in src/db/mysqlRemote.ts).
  Accounts, roles and GRANT are not possible, so those exercises stay in PostgreSQL (`whyNotMysql`), as do the few
  whose MySQL answer is too slow (`TOO_SLOW`; scripts/check-runner.ts finds them).
- LOAD DATA LOCAL only ever gets the exercise's own files; SELECT … INTO OUTFILE needs FILE (not granted).
- A watchdog kills the connection after 20 s, like PostgreSQL in the browser (30 s for scripts); results stop at 10,000 rows; 4 runs at a time,
  20 waiting; per caller (hashed IP, in memory) a burst of 20, one more every 3 s, 600 a day.
- No binary log, no event scheduler. The learner's SQL is never logged.

## Deploy

```bash
server/deploy.sh             # build runner.ts, copy it with compose.yaml and the Caddyfile, restart
server/deploy.sh --datasets  # also reload the eight pb_<dataset> databases from datasets/build/ and check
                             # every table against the local MySQL (CHECKSUM TABLE)
```

Check it against the local MySQL (every MySQL solution the app can send, through an SSH tunnel):

```bash
ssh -i ~/.ssh/sql_playbook_oracle -N -L 18080:127.0.0.1:8080 ubuntu@129.159.152.119 &
npx tsx scripts/check-runner.ts
```

Rebuild datasets → run `server/deploy.sh --datasets` too, or MySQL mode checks against old data.
