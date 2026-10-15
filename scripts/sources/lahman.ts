/**
 * Lahman Baseball Database, version 2025 (seasons 1871–2025), © SABR, CC BY-SA 3.0. Read from the official CSV release.
 * What the build keeps:
 *   - only the major leagues the database has always covered (NL, AL, AA, NA, FL, PL, UA). The Negro Leagues data added in
 *     2024 is licensed by SABR from Seamheads, with no published terms for redistribution, so it is left out;
 *   - team seasons, franchises, post-season series, managers and Hall of Fame voting for every year;
 *   - player seasons (batting, pitching), salaries (published up to 2016), All-Star games and awards from 2010 on, to fit the browser;
 *   - the people referenced by any kept row.
 * Columns are renamed to snake_case; 2B/3B become doubles/triples and Rank becomes standing (RANK is reserved in MySQL).
 * awards_players has no natural key (a player can win the same award twice in a year, e.g. at two positions), so award_no
 * numbers its rows in the order of the official file.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import mysql from 'mysql2/promise'
import type { MysqlConnection } from '../lib/mysql'

const DIR = 'datasets/raw/lahman'
const DB = 'lahman_src'
const FIRST_PLAYER_SEASON = 2010
const MAJOR_LEAGUES = new Set(['NL', 'AL', 'AA', 'NA', 'FL', 'PL', 'UA'])
/** Award league "ML" means both major leagues. */
const AWARD_LEAGUES = new Set([...MAJOR_LEAGUES, 'ML'])

type Row = Record<string, string>

/** RFC 4180 CSV: quoted fields may contain commas and doubled quotes. The release has a UTF-8 BOM and CRLF line ends. */
function readCsv(root: string, file: string): Row[] {
  const text = readFileSync(join(root, DIR, file), 'utf8').replace(/^﻿/, '')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') record.push(field), (field = '')
    else if (ch === '\n') {
      record.push(field.replace(/\r$/, ''))
      records.push(record)
      record = []
      field = ''
    } else field += ch
  }
  if (field !== '' || record.length) records.push([...record, field])
  const [header, ...body] = records
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ''])))
}

interface TableSpec {
  name: string
  file: string
  /** [target column, source column, MySQL type] */
  columns: [string, string, string][]
  primaryKey: string[]
  foreignKeys?: string[]
  keep: (r: Row) => boolean
}

const int = 'int'
const small = 'smallint'

const playerStats = (extra: [string, string, string][]): [string, string, string][] => [
  ['player_id', 'playerID', 'varchar(9) not null'],
  ['year_id', 'yearID', `${small} not null`],
  ['stint', 'stint', `${small} not null`],
  ['team_id', 'teamID', 'char(3) not null'],
  ['lg_id', 'lgID', 'char(2) not null'],
  ...extra,
]

const majorSeason = (r: Row) => MAJOR_LEAGUES.has(r.lgID!) && Number(r.yearID) >= FIRST_PLAYER_SEASON

const TABLES: TableSpec[] = [
  {
    name: 'teams_franchises',
    file: 'TeamsFranchises.csv',
    columns: [
      ['franch_id', 'franchID', 'char(3) not null'],
      ['franch_name', 'franchName', 'varchar(50) not null'],
      ['active', 'active', 'varchar(2)'],
      ['na_assoc', 'NAassoc', 'char(3)'],
    ],
    primaryKey: ['franch_id'],
    keep: () => true,
  },
  {
    name: 'teams',
    file: 'Teams.csv',
    columns: [
      ['year_id', 'yearID', `${small} not null`],
      ['lg_id', 'lgID', 'char(2) not null'],
      ['team_id', 'teamID', 'char(3) not null'],
      ['franch_id', 'franchID', 'char(3) not null'],
      ['div_id', 'divID', 'char(1)'],
      ['standing', 'Rank', `${small} not null`],
      ['g', 'G', small],
      ['g_home', 'Ghome', small],
      ['w', 'W', small],
      ['l', 'L', small],
      ['div_win', 'DivWin', 'char(1)'],
      ['wc_win', 'WCWin', 'char(1)'],
      ['lg_win', 'LgWin', 'char(1)'],
      ['ws_win', 'WSWin', 'char(1)'],
      ['r', 'R', small],
      ['ab', 'AB', small],
      ['h', 'H', small],
      ['doubles', '2B', small],
      ['triples', '3B', small],
      ['hr', 'HR', small],
      ['bb', 'BB', small],
      ['so', 'SO', small],
      ['sb', 'SB', small],
      ['cs', 'CS', small],
      ['hbp', 'HBP', small],
      ['sf', 'SF', small],
      ['ra', 'RA', small],
      ['er', 'ER', small],
      ['era', 'ERA', 'decimal(4,2)'],
      ['cg', 'CG', small],
      ['sho', 'SHO', small],
      ['sv', 'SV', small],
      ['ipouts', 'IPouts', small],
      ['ha', 'HA', small],
      ['hra', 'HRA', small],
      ['bba', 'BBA', small],
      ['soa', 'SOA', small],
      ['e', 'E', small],
      ['dp', 'DP', small],
      ['fp', 'FP', 'decimal(4,3)'],
      ['name', 'name', 'varchar(50) not null'],
      ['park', 'park', 'varchar(80)'],
      ['attendance', 'attendance', int],
      ['bpf', 'BPF', small],
      ['ppf', 'PPF', small],
    ],
    primaryKey: ['year_id', 'team_id'],
    foreignKeys: ['franch_id references teams_franchises (franch_id)'],
    keep: (r) => MAJOR_LEAGUES.has(r.lgID!),
  },
  {
    name: 'series_post',
    file: 'SeriesPost.csv',
    columns: [
      ['year_id', 'yearID', `${small} not null`],
      ['round', 'round', 'varchar(5) not null'],
      ['team_id_winner', 'teamIDwinner', 'char(3) not null'],
      ['lg_id_winner', 'lgIDwinner', 'char(2) not null'],
      ['team_id_loser', 'teamIDloser', 'char(3) not null'],
      ['lg_id_loser', 'lgIDloser', 'char(2) not null'],
      ['wins', 'wins', small],
      ['losses', 'losses', small],
      ['ties', 'ties', small],
    ],
    primaryKey: ['year_id', 'round'],
    foreignKeys: [
      '(year_id, team_id_winner) references teams (year_id, team_id)',
      '(year_id, team_id_loser) references teams (year_id, team_id)',
    ],
    keep: (r) => MAJOR_LEAGUES.has(r.lgIDwinner!) && MAJOR_LEAGUES.has(r.lgIDloser!),
  },
  {
    name: 'people',
    file: 'People.csv',
    columns: [
      ['player_id', 'playerID', 'varchar(9) not null'],
      ['birth_year', 'birthYear', small],
      ['birth_month', 'birthMonth', small],
      ['birth_day', 'birthDay', small],
      ['birth_country', 'birthCountry', 'varchar(50)'],
      ['birth_state', 'birthState', 'varchar(50)'],
      ['birth_city', 'birthCity', 'varchar(50)'],
      ['death_year', 'deathYear', small],
      ['death_month', 'deathMonth', small],
      ['death_day', 'deathDay', small],
      ['death_country', 'deathCountry', 'varchar(50)'],
      ['death_state', 'deathState', 'varchar(50)'],
      ['death_city', 'deathCity', 'varchar(50)'],
      ['name_first', 'nameFirst', 'varchar(50)'],
      ['name_last', 'nameLast', 'varchar(50) not null'],
      ['name_given', 'nameGiven', 'varchar(255)'],
      ['weight', 'weight', small],
      ['height', 'height', small],
      ['bats', 'bats', 'char(1)'],
      ['throws', 'throws', 'char(1)'],
      ['debut', 'debut', 'date'],
      ['final_game', 'finalGame', 'date'],
    ],
    primaryKey: ['player_id'],
    keep: () => true, // narrowed below to the people referenced by kept rows
  },
  {
    name: 'managers',
    file: 'Managers.csv',
    columns: [
      ['player_id', 'playerID', 'varchar(9) not null'],
      ['year_id', 'yearID', `${small} not null`],
      ['team_id', 'teamID', 'char(3) not null'],
      ['lg_id', 'lgID', 'char(2) not null'],
      ['inseason', 'inseason', `${small} not null`],
      ['g', 'G', small],
      ['w', 'W', small],
      ['l', 'L', small],
      ['standing', 'rank', small],
      ['plyr_mgr', 'plyrMgr', 'char(1)'],
    ],
    primaryKey: ['year_id', 'team_id', 'inseason'],
    foreignKeys: ['player_id references people (player_id)', '(year_id, team_id) references teams (year_id, team_id)'],
    keep: (r) => MAJOR_LEAGUES.has(r.lgID!),
  },
  {
    name: 'batting',
    file: 'Batting.csv',
    columns: playerStats([
      ['g', 'G', small],
      ['ab', 'AB', small],
      ['r', 'R', small],
      ['h', 'H', small],
      ['doubles', '2B', small],
      ['triples', '3B', small],
      ['hr', 'HR', small],
      ['rbi', 'RBI', small],
      ['sb', 'SB', small],
      ['cs', 'CS', small],
      ['bb', 'BB', small],
      ['so', 'SO', small],
      ['ibb', 'IBB', small],
      ['hbp', 'HBP', small],
      ['sh', 'SH', small],
      ['sf', 'SF', small],
      ['gidp', 'GIDP', small],
    ]),
    primaryKey: ['player_id', 'year_id', 'stint'],
    foreignKeys: ['player_id references people (player_id)', '(year_id, team_id) references teams (year_id, team_id)'],
    keep: majorSeason,
  },
  {
    name: 'pitching',
    file: 'Pitching.csv',
    columns: playerStats([
      ['w', 'W', small],
      ['l', 'L', small],
      ['g', 'G', small],
      ['gs', 'GS', small],
      ['cg', 'CG', small],
      ['sho', 'SHO', small],
      ['sv', 'SV', small],
      ['ipouts', 'IPouts', small],
      ['h', 'H', small],
      ['er', 'ER', small],
      ['hr', 'HR', small],
      ['bb', 'BB', small],
      ['so', 'SO', small],
      ['ba_opp', 'BAOpp', 'decimal(6,3)'],
      ['era', 'ERA', 'decimal(5,2)'],
      ['ibb', 'IBB', small],
      ['wp', 'WP', small],
      ['hbp', 'HBP', small],
      ['bk', 'BK', small],
      ['bfp', 'BFP', small],
      ['gf', 'GF', small],
      ['r', 'R', small],
      ['sh', 'SH', small],
      ['sf', 'SF', small],
      ['gidp', 'GIDP', small],
    ]),
    primaryKey: ['player_id', 'year_id', 'stint'],
    foreignKeys: ['player_id references people (player_id)', '(year_id, team_id) references teams (year_id, team_id)'],
    keep: majorSeason,
  },
  {
    name: 'salaries',
    file: 'Salaries.csv',
    columns: [
      ['year_id', 'yearID', `${small} not null`],
      ['team_id', 'teamID', 'char(3) not null'],
      ['lg_id', 'lgID', 'char(2) not null'],
      ['player_id', 'playerID', 'varchar(9) not null'],
      ['salary', 'salary', `${int} not null`],
    ],
    primaryKey: ['year_id', 'team_id', 'player_id'],
    foreignKeys: ['player_id references people (player_id)', '(year_id, team_id) references teams (year_id, team_id)'],
    keep: majorSeason,
  },
  {
    name: 'allstar_full',
    file: 'AllstarFull.csv',
    columns: [
      ['player_id', 'playerID', 'varchar(9) not null'],
      ['year_id', 'yearID', `${small} not null`],
      ['game_num', 'gameNum', `${small} not null`],
      ['game_id', 'gameID', 'varchar(12)'],
      ['team_id', 'teamID', 'char(3) not null'],
      ['lg_id', 'lgID', 'char(2) not null'],
      ['gp', 'GP', small],
      ['starting_pos', 'startingPos', 'varchar(4)'],
    ],
    primaryKey: ['player_id', 'year_id', 'game_num'],
    foreignKeys: ['player_id references people (player_id)'],
    keep: majorSeason,
  },
  {
    name: 'awards_players',
    file: 'AwardsPlayers.csv',
    columns: [
      ['award_no', 'award_no', `${small} not null`],
      ['player_id', 'playerID', 'varchar(9) not null'],
      ['award_id', 'awardID', 'varchar(60) not null'],
      ['year_id', 'yearID', `${small} not null`],
      ['lg_id', 'lgID', 'char(2) not null'],
      ['tie', 'tie', 'char(1)'],
      ['notes', 'notes', 'varchar(100)'],
    ],
    primaryKey: ['award_no'],
    foreignKeys: ['player_id references people (player_id)'],
    keep: (r) => AWARD_LEAGUES.has(r.lgID!) && Number(r.yearID) >= FIRST_PLAYER_SEASON,
  },
  {
    name: 'hall_of_fame',
    file: 'HallOfFame.csv',
    columns: [
      ['player_id', 'playerID', 'varchar(10) not null'],
      ['year_id', 'yearid', `${small} not null`],
      ['voted_by', 'votedBy', 'varchar(64) not null'],
      ['ballots', 'ballots', small],
      ['needed', 'needed', small],
      ['votes', 'votes', small],
      ['inducted', 'inducted', 'char(1)'],
      ['category', 'category', 'varchar(20) not null'],
      ['needed_note', 'needed_note', 'varchar(120)'],
    ],
    primaryKey: ['player_id', 'year_id', 'voted_by'],
    foreignKeys: ['player_id references people (player_id)'],
    keep: () => true, // narrowed below to people outside the Negro Leagues-only set
  },
]

export async function loadLahman(conn: MysqlConnection, root: string): Promise<void> {
  const data = new Map(TABLES.map((t) => [t.name, readCsv(root, t.file).filter(t.keep)]))
  data.get('awards_players')!.forEach((r, i) => (r.award_no = String(i + 1)))

  // People who only appear in the Negro Leagues data have no major-league debut; leave them (and their HoF rows) out.
  const people = data.get('people')!
  const negroLeaguesOnly = new Set(
    [...readCsv(root, 'Batting.csv'), ...readCsv(root, 'Pitching.csv')]
      .filter((r) => !MAJOR_LEAGUES.has(r.lgID!))
      .map((r) => r.playerID!),
  )
  for (const r of [...readCsv(root, 'Batting.csv'), ...readCsv(root, 'Pitching.csv')])
    if (MAJOR_LEAGUES.has(r.lgID!)) negroLeaguesOnly.delete(r.playerID!)
  data.set('hall_of_fame', data.get('hall_of_fame')!.filter((r) => !negroLeaguesOnly.has(r.playerID!)))
  const referenced = new Set<string>()
  for (const t of TABLES) if (t.name !== 'people') for (const r of data.get(t.name)!) if (r.playerID) referenced.add(r.playerID)
  data.set('people', people.filter((r) => referenced.has(r.playerID!)))
  const franchises = new Set(data.get('teams')!.map((r) => r.franchID!))
  data.set('teams_franchises', data.get('teams_franchises')!.filter((r) => franchises.has(r.franchID!)))

  const ddl = [
    `drop database if exists ${DB}`,
    `create database ${DB} character set utf8mb4 collate utf8mb4_0900_ai_ci`,
    ...TABLES.map((t) => {
      const defs = t.columns.map(([name, , type]) => `\`${name}\` ${type}`)
      if (t.primaryKey.length) defs.push(`primary key (${t.primaryKey.join(', ')})`)
      return `create table ${DB}.${t.name} (\n  ${defs.join(',\n  ')}\n)`
    }),
  ]
  for (const statement of ddl) await conn.query(statement)

  for (const t of TABLES) {
    const rows = data.get(t.name)!
    for (let i = 0; i < rows.length; i += 2000) {
      const values = rows
        .slice(i, i + 2000)
        .map((r) => `(${t.columns.map(([, source]) => mysql.escape(r[source] === '' || r[source] === undefined ? null : r[source])).join(', ')})`)
      await conn.query(`insert into ${DB}.${t.name} values ${values.join(', ')}`)
    }
    console.log(`  lahman source: ${t.name} ${rows.length} rows`)
  }
  // Foreign keys last, so the load order does not matter and any orphan row fails the build.
  for (const t of TABLES)
    for (const fk of t.foreignKeys ?? []) {
      const [cols, ref] = fk.split(' references ')
      const refFixed = ref!.replace(/^(\w+)/, `${DB}.$1`)
      await conn.query(`alter table ${DB}.${t.name} add foreign key ${cols!.startsWith('(') ? cols : `(${cols})`} references ${refFixed}`)
    }
}
