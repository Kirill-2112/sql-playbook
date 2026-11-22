#!/usr/bin/env bash
# Builds the runner and copies it with the Docker setup to the server, then restarts it.
#   server/deploy.sh            code and config only
#   server/deploy.sh --datasets also (re)loads the eight pb_<dataset> databases from datasets/build/
set -euo pipefail
cd "$(dirname "$0")/.."
SERVER=${SERVER:-ubuntu@129.159.152.119}
KEY=${KEY:-$HOME/.ssh/sql_playbook_oracle}
SSH=(ssh -i "$KEY" "$SERVER")

npx esbuild server/runner/runner.ts --bundle --platform=node --target=node22 --format=esm \
  --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
  --outfile=server/dist/runner.mjs --log-level=warning
"${SSH[@]}" 'mkdir -p ~/runner/datasets'
scp -q -i "$KEY" server/compose.yaml server/Caddyfile server/dist/runner.mjs "$SERVER":runner/

if [[ "${1:-}" == "--datasets" ]]; then
  scp -q -i "$KEY" datasets/build/*.mysql.sql "$SERVER":runner/datasets/
  "${SSH[@]}" 'cd ~/runner && docker compose up -d --wait mysql && for f in datasets/*.mysql.sql; do
    echo "loading $f"; docker compose exec -T mysql sh -c "mysql --default-character-set=utf8mb4 --max-allowed-packet=1G -uroot -p\"\$MYSQL_ROOT_PASSWORD\" 2>&1 | grep -v \"Using a password\" || true" < "$f"; done'
  # Every table must match the local MySQL that verify checked (a load that stops halfway is otherwise silent).
  DOCKER=${DOCKER:-$HOME/.orbstack/bin/docker}
  CHECKSUM=$("$DOCKER" exec sql-playbook-mysql mysql -uroot -N -e "set session group_concat_max_len = 100000;
    select concat('checksum table ', group_concat(concat(table_schema, '.', table_name) order by table_schema, table_name), ';')
    from information_schema.tables where table_type = 'BASE TABLE' and table_schema in
    ('pb_sakila','pb_chinook','pb_northwind','pb_employees','pb_adventureworks','pb_airlines','pb_lahman','pb_delivery')")
  LOCAL=$("$DOCKER" exec -i sql-playbook-mysql mysql -uroot -N <<< "$CHECKSUM" | sort)
  REMOTE=$("${SSH[@]}" 'cd ~/runner && docker compose exec -T mysql sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -N 2>/dev/null"' <<< "$CHECKSUM" | sort)
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    diff <(echo "$LOCAL") <(echo "$REMOTE") || true
    echo "The server's datasets differ from the local MySQL." >&2
    exit 1
  fi
  echo "All $(wc -l <<< "$LOCAL" | tr -d ' ') tables match the local MySQL."
fi
"${SSH[@]}" 'cd ~/runner && docker compose up -d --remove-orphans && docker compose restart runner >/dev/null && docker compose ps --format "{{.Service}}: {{.Status}}"'
