import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_STR = PG + 'functions-string.html'
const MY_STR = MY + 'string-functions.html'

export const stringEntries: ReferenceEntry[] = [
  {
    id: 'concat',
    name: '|| and CONCAT',
    group: 'strings',
    summary:
      'Glues strings together. In PostgreSQL || returns NULL if any part is NULL, while CONCAT skips NULLs. In MySQL || means OR, so always use CONCAT there.',
    postgres: "first_name || ' ' || last_name\nconcat(first_name, ' ', last_name)",
    mysql: "concat(first_name, ' ', last_name)",
    mysqlNote: "MySQL's CONCAT returns NULL if any argument is NULL, unlike PostgreSQL's. Wrap nullable parts in COALESCE.",
    example: {
      postgres: `select 'SQL' || ' ' || 'Playbook' as joined, concat('a', 'b', 'c') as abc;`,
      mysql: `select concat('SQL', ' ', 'Playbook') as joined, concat('a', 'b', 'c') as abc;`,
    },
    match: '\\|\\||\\bconcat\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: CONCAT', url: MY_STR + '#function_concat' },
    ],
  },
  {
    id: 'concat-ws',
    name: 'CONCAT_WS',
    group: 'strings',
    summary: 'Concatenates with a separator between the parts and skips NULLs, so there are no doubled separators.',
    postgres: "concat_ws(', ', street, city, country)",
    mysql: "concat_ws(', ', street, city, country)",
    example: {
      postgres: `select concat_ws(', ', 'Main St 1', null, 'Oslo') as address;`,
    },
    match: '\\bconcat_ws\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: CONCAT_WS', url: MY_STR + '#function_concat-ws' },
    ],
  },
  {
    id: 'length',
    name: 'LENGTH / CHAR_LENGTH',
    group: 'strings',
    summary: 'Number of characters in a string. In MySQL LENGTH counts bytes, so accented letters count twice; CHAR_LENGTH counts characters in both.',
    postgres: 'length(name)\nchar_length(name)',
    mysql: 'char_length(name)',
    mysqlNote: "MySQL's LENGTH returns bytes: length('café') is 5. Use CHAR_LENGTH.",
    example: {
      postgres: `select char_length('café') as chars, octet_length('café') as bytes;`,
      mysql: `select char_length('café') as chars, length('café') as bytes;`,
    },
    match: '\\b(char_|character_|octet_)?length\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: CHAR_LENGTH', url: MY_STR + '#function_char-length' },
    ],
  },
  {
    id: 'upper-lower',
    name: 'UPPER / LOWER / INITCAP',
    group: 'strings',
    summary: 'Change letter case. INITCAP capitalises the first letter of every word (PostgreSQL only).',
    postgres: 'upper(name)\nlower(email)\ninitcap(name)',
    mysql: 'upper(name)\nlower(email)',
    mysqlNote: 'No INITCAP in MySQL: concat(upper(left(s, 1)), lower(substring(s, 2))) handles a single word.',
    example: {
      postgres: `select upper('sql') as up, lower('SQL') as low, initcap('hELLO') as title;`,
      mysql: `select upper('sql') as up, lower('SQL') as low, concat(upper(left('hELLO', 1)), lower(substring('hELLO', 2))) as title;`,
    },
    match: '\\b(upper|lower|initcap)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: UPPER', url: MY_STR + '#function_upper' },
    ],
  },
  {
    id: 'trim',
    name: 'TRIM / LTRIM / RTRIM',
    group: 'strings',
    summary: 'Removes spaces (or other characters) from both ends, the left or the right of a string. Essential when cleaning imported data.',
    postgres: "trim(name)\ntrim(both '-' from code)\nrtrim(name)",
    mysql: "trim(name)\ntrim(both '-' from code)\nrtrim(name)",
    mysqlNote: "PostgreSQL's ltrim/rtrim accept a set of characters to remove (rtrim(s, '.!')); MySQL's only remove spaces.",
    example: {
      postgres: `select '[' || trim('  hi  ') || ']' as trimmed, trim(both '-' from '--a-b--') as dashes;`,
      mysql: `select concat('[', trim('  hi  '), ']') as trimmed, trim(both '-' from '--a-b--') as dashes;`,
    },
    match: '\\b[lr]?trim\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: TRIM', url: MY_STR + '#function_trim' },
    ],
  },
  {
    id: 'substring',
    name: 'SUBSTRING / LEFT / RIGHT',
    group: 'strings',
    summary: 'Cut out part of a string. Positions start at 1. LEFT and RIGHT take the first or last n characters.',
    postgres: 'substring(code from 2 for 3)\nsubstr(code, 2, 3)\nleft(code, 2)\nright(code, 2)',
    mysql: 'substring(code, 2, 3)\nleft(code, 2)\nright(code, 2)',
    example: {
      postgres: `select substring('ABCDEF' from 2 for 3) as mid, left('ABCDEF', 2) as l, right('ABCDEF', 2) as r;`,
      mysql: `select substring('ABCDEF', 2, 3) as mid, left('ABCDEF', 2) as l, right('ABCDEF', 2) as r;`,
    },
    match: '\\b(substring|substr|left|right)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: SUBSTRING', url: MY_STR + '#function_substring' },
    ],
  },
  {
    id: 'position',
    name: 'POSITION / STRPOS',
    group: 'strings',
    summary: 'Where a substring starts (1-based), or 0 when it is not found.',
    postgres: "position('@' in email)\nstrpos(email, '@')",
    mysql: "position('@' in email)\nlocate('@', email)",
    mysqlNote: "MySQL's LOCATE can also start searching from a given position: locate('-', s, 5).",
    example: {
      postgres: `select position('@' in 'ann@mail.io') as at_sign, strpos('abc', 'z') as missing;`,
      mysql: `select position('@' in 'ann@mail.io') as at_sign, locate('z', 'abc') as missing;`,
    },
    match: '\\b(position|strpos|locate|instr)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: LOCATE', url: MY_STR + '#function_locate' },
    ],
  },
  {
    id: 'replace',
    name: 'REPLACE / TRANSLATE',
    group: 'strings',
    summary: 'REPLACE swaps every occurrence of a substring. TRANSLATE maps single characters one to one (PostgreSQL only).',
    postgres: "replace(phone, '-', '')\ntranslate(s, 'áé', 'ae')",
    mysql: "replace(phone, '-', '')",
    mysqlNote: 'No TRANSLATE in MySQL; nest REPLACE calls.',
    example: {
      postgres: `select replace('555-01-23', '-', '') as digits, translate('crème brûlée', 'èû', 'eu') as plain;`,
      mysql: `select replace('555-01-23', '-', '') as digits, replace(replace('crème brûlée', 'è', 'e'), 'û', 'u') as plain;`,
    },
    match: '\\b(replace|translate)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: REPLACE', url: MY_STR + '#function_replace' },
    ],
  },
  {
    id: 'lpad-rpad',
    name: 'LPAD / RPAD',
    group: 'strings',
    summary: 'Pads a string to a fixed length with a fill character, for example zero-padded codes. Longer strings are cut to the length.',
    postgres: "lpad(id::text, 6, '0')",
    mysql: "lpad(id, 6, '0')",
    example: {
      postgres: `select lpad('42', 6, '0') as code, rpad('ab', 5, '.') as dotted;`,
    },
    match: '\\b[lr]pad\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: LPAD', url: MY_STR + '#function_lpad' },
    ],
  },
  {
    id: 'split-part',
    name: 'SPLIT_PART',
    group: 'strings',
    summary: 'Splits a string by a delimiter and returns the n-th piece, e.g. the domain of an e-mail address.',
    postgres: "split_part(email, '@', 2)",
    mysql: "substring_index(substring_index(email, '@', 2), '@', -1)",
    mysqlNote: "MySQL has SUBSTRING_INDEX(s, delim, n): everything before the n-th delimiter (or after it, counting from the end, when n is negative).",
    example: {
      postgres: `select split_part('ann@mail.io', '@', 2) as domain, split_part('a,b,c', ',', 2) as second;`,
      mysql: `select substring_index('ann@mail.io', '@', -1) as domain,
       substring_index(substring_index('a,b,c', ',', 2), ',', -1) as second;`,
    },
    match: '\\b(split_part|substring_index)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: SUBSTRING_INDEX', url: MY_STR + '#function_substring-index' },
    ],
  },
  {
    id: 'repeat-reverse',
    name: 'REPEAT / REVERSE',
    group: 'strings',
    summary: 'REPEAT builds a string by repeating it n times (handy for text bar charts); REVERSE flips it.',
    postgres: "repeat('*', n)\nreverse(s)",
    mysql: "repeat('*', n)\nreverse(s)",
    example: {
      postgres: `select repeat('*', 5) as bar, reverse('stressed') as backwards;`,
    },
    match: '\\b(repeat|reverse)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string functions', url: PG_STR },
      { label: 'MySQL: REPEAT', url: MY_STR + '#function_repeat' },
    ],
  },
  {
    id: 'format',
    name: 'FORMAT',
    group: 'strings',
    summary:
      'PostgreSQL: builds a string from a template, like printf (%s for a value, %I for a quoted identifier, %L for a quoted literal). MySQL\'s FORMAT is different: it formats a number with thousands separators.',
    postgres: "format('%s has %s rows', name, n)",
    mysql: "concat(name, ' has ', n, ' rows')",
    mysqlNote: "MySQL's FORMAT(1234.5, 2) gives '1,234.50'. In PostgreSQL that is to_char(1234.5, 'FM9,999.00').",
    example: {
      postgres: `select format('%s has %s rows', 'film', 1000) as msg;`,
      mysql: `select concat('film', ' has ', 1000, ' rows') as msg;`,
    },
    match: '\\bformat\\s*\\(',
    docs: [
      { label: 'PostgreSQL: format', url: PG_STR + '#FUNCTIONS-STRING-FORMAT' },
      { label: 'MySQL: FORMAT', url: MY_STR + '#function_format' },
    ],
  },
  {
    id: 'regex-match',
    name: '~ and REGEXP_LIKE',
    group: 'strings',
    summary: 'Tests a string against a regular expression. ~* ignores case in PostgreSQL. More powerful than LIKE: alternatives, character classes, anchors.',
    postgres: "where code ~ '^[A-Z]{2}[0-9]+$'\nwhere name ~* 'smith'",
    mysql: "where regexp_like(code, '^[A-Z]{2}[0-9]+$', 'c')",
    mysqlNote: "MySQL's REGEXP follows the column collation, so it usually ignores case; pass 'c' as the match type for a case-sensitive match.",
    example: {
      postgres: `with t(code) as (select 'AB12' union all select 'ab12' union all select 'A123')
select code, code ~ '^[A-Z]{2}[0-9]+$' as valid from t order by code;`,
      mysql: `with t(code) as (select 'AB12' union all select 'ab12' union all select 'A123')
select code, regexp_like(code, '^[A-Z]{2}[0-9]+$', 'c') as valid from t order by code collate utf8mb4_bin;`,
    },
    match: "\\s!?~\\*?\\s|\\bregexp(_like)?\\b|\\brlike\\b",
    docs: [
      { label: 'PostgreSQL: POSIX regular expressions', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: REGEXP_LIKE', url: MY + 'regexp.html#function_regexp-like' },
    ],
  },
  {
    id: 'regexp-replace',
    name: 'REGEXP_REPLACE / REGEXP_SUBSTR',
    group: 'strings',
    summary: 'Replace or extract the parts of a string that match a regular expression. PostgreSQL replaces only the first match unless you pass the g flag.',
    postgres: "regexp_replace(phone, '[^0-9]', '', 'g')\nsubstring(s from '[0-9]+')",
    mysql: "regexp_replace(phone, '[^0-9]', '')\nregexp_substr(s, '[0-9]+')",
    mysqlNote: 'MySQL replaces every match by default.',
    example: {
      postgres: `select regexp_replace('+1 (555) 010-99', '[^0-9]', '', 'g') as digits,
       substring('order 4521 shipped' from '[0-9]+') as number;`,
      mysql: `select regexp_replace('+1 (555) 010-99', '[^0-9]', '') as digits,
       regexp_substr('order 4521 shipped', '[0-9]+') as number;`,
    },
    match: '\\bregexp_(replace|substr|matches|match)\\s*\\(|\\bsubstring\\s*\\([^)]*\\bfrom\\s*\'',
    docs: [
      { label: 'PostgreSQL: POSIX regular expressions', url: PG + 'functions-matching.html#FUNCTIONS-POSIX-REGEXP' },
      { label: 'MySQL: REGEXP_REPLACE', url: MY + 'regexp.html#function_regexp-replace' },
    ],
  },
  {
    id: 'string-to-array',
    name: 'STRING_TO_ARRAY / REGEXP_SPLIT_TO_TABLE',
    group: 'strings',
    summary: 'Splits a delimited string into an array, or straight into rows, so a list stored in one column can be joined and counted.',
    postgres: "string_to_array(tags, ',')\nunnest(string_to_array(tags, ','))\nregexp_split_to_table(tags, ',')",
    mysql: "json_table(concat('[\"', replace(tags, ',', '\",\"'), '\"]'), '$[*]' columns (tag varchar(50) path '$'))",
    mysqlNote: 'MySQL has no split function. Turn the list into a JSON array and read it with JSON_TABLE, or use a recursive CTE with SUBSTRING_INDEX.',
    example: {
      postgres: `select tag from unnest(string_to_array('red,green,blue', ',')) as tag order by tag;`,
      mysql: `select tag
from json_table(concat('["', replace('red,green,blue', ',', '","'), '"]'), '$[*]' columns (tag varchar(50) path '$')) t
order by tag;`,
    },
    match: '\\b(string_to_array|regexp_split_to_(table|array)|string_to_table)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: string_to_array', url: PG_STR },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'collate',
    name: 'COLLATE',
    group: 'strings',
    summary:
      'Sets the rules for comparing and sorting text: case, accents, alphabet order. The same ORDER BY can give different orders under different collations.',
    postgres: 'order by name collate "C"',
    mysql: 'order by name collate utf8mb4_bin',
    mysqlNote: "MySQL's default utf8mb4_0900_ai_ci ignores accents and case, so 'Historia' = 'História'. Binary collations compare exactly.",
    example: {
      postgres: `with t(w) as (select 'b' union all select 'B' union all select 'a')
select w from t order by w collate "C";`,
      mysql: `with t(w) as (select 'b' union all select 'B' union all select 'a')
select w from t order by w collate utf8mb4_bin;`,
    },
    match: '\\bcollate\\b',
    docs: [
      { label: 'PostgreSQL: collation support', url: PG + 'collation.html' },
      { label: 'MySQL: COLLATE in SQL statements', url: MY + 'charset-collate.html' },
    ],
  },
]
