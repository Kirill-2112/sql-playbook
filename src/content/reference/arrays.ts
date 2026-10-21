import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_ARR = PG + 'functions-array.html'
const NO_ARRAYS = 'MySQL has no array type; JSON arrays fill the same role.'

export const arrayEntries: ReferenceEntry[] = [
  {
    id: 'array-constructor',
    name: 'ARRAY[…] and arr[n]',
    group: 'arrays',
    summary: 'An array holds several values of one type in a single column. Elements are numbered from 1; asking past the end gives NULL, not an error.',
    postgres: "array[10, 20, 30]\n'{10,20,30}'::int[]\ntags[1]",
    mysql: "json_array(10, 20, 30)\njson_extract(tags, '$[0]')",
    mysqlNote: `${NO_ARRAYS} JSON paths count from 0.`,
    example: {
      postgres: 'select (array[10, 20, 30])[2] as second, (array[10, 20, 30])[5] as past_end;',
      mysql: "select json_extract(json_array(10, 20, 30), '$[1]') as second, json_extract(json_array(10, 20, 30), '$[4]') as past_end;",
    },
    match: '\\barray\\s*\\[|::\\w+\\[\\]',
    docs: [
      { label: 'PostgreSQL: arrays', url: PG + 'arrays.html' },
      { label: 'MySQL: JSON_ARRAY', url: MY + 'json-creation-functions.html#function_json-array' },
    ],
  },
  {
    id: 'unnest',
    name: 'UNNEST',
    group: 'arrays',
    summary: 'Expands an array into rows. WITH ORDINALITY adds each element\'s position.',
    postgres: 'select tag from t, unnest(t.tags) as tag\nunnest(arr) with ordinality as u(value, pos)',
    mysql: "json_table(tags, '$[*]' columns (pos for ordinality, tag varchar(50) path '$'))",
    mysqlNote: NO_ARRAYS,
    example: {
      postgres: "select value, pos from unnest(array['a', 'b', 'c']) with ordinality as u(value, pos);",
      mysql: `select value, pos
from json_table(json_array('a', 'b', 'c'), '$[*]' columns (pos for ordinality, value varchar(10) path '$')) u;`,
    },
    match: '\\bunnest\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array functions', url: PG_ARR + '#ARRAY-FUNCTIONS-TABLE' },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'any-array',
    name: '= ANY(array)',
    group: 'arrays',
    summary: 'True when the value equals at least one element of the array. Unlike IN, the list can be a column or a single parameter.',
    postgres: "where 'vip' = any(tags)\nwhere id = any($1)",
    mysql: "where 'vip' member of (tags)",
    mysqlNote: `${NO_ARRAYS} MEMBER OF (8.0.17+) checks a JSON array and can use a multi-valued index.`,
    example: {
      postgres: "select 3 = any(array[1, 2, 3]) as has_three, 5 = any(array[1, 2, 3]) as has_five;",
      mysql: 'select 3 member of (json_array(1, 2, 3)) as has_three, 5 member of (json_array(1, 2, 3)) as has_five;',
    },
    match: '=\\s*any\\s*\\(|\\bmember\\s+of\\b',
    docs: [
      { label: 'PostgreSQL: ANY (array)', url: PG + 'functions-comparisons.html#FUNCTIONS-COMPARISONS-ANY-SOME' },
      { label: 'MySQL: MEMBER OF', url: MY + 'json-search-functions.html#operator_member-of' },
    ],
  },
  {
    id: 'array-length',
    name: 'CARDINALITY / ARRAY_LENGTH',
    group: 'arrays',
    summary: 'Number of elements. cardinality counts all of them; array_length(arr, 1) returns NULL for an empty array.',
    postgres: 'cardinality(tags)\narray_length(tags, 1)',
    mysql: 'json_length(tags)',
    mysqlNote: NO_ARRAYS,
    example: {
      postgres: "select cardinality(array['a', 'b']) as n, cardinality('{}'::text[]) as no_items;",
      mysql: "select json_length(json_array('a', 'b')) as n, json_length(json_array()) as no_items;",
    },
    match: '\\b(cardinality|array_length|array_upper)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array functions', url: PG_ARR + '#ARRAY-FUNCTIONS-TABLE' },
      { label: 'MySQL: JSON_LENGTH', url: MY + 'json-attribute-functions.html#function_json-length' },
    ],
  },
  {
    id: 'array-contains',
    name: '@> and && (arrays)',
    group: 'arrays',
    summary: '@> is true when the left array contains every element of the right one; && is true when they share at least one element.',
    postgres: "tags @> array['vip']\ntags && array['new', 'sale']",
    mysql: "json_contains(tags, '[\"vip\"]')\njson_overlaps(tags, '[\"new\", \"sale\"]')",
    mysqlNote: NO_ARRAYS,
    example: {
      postgres: "select array[1, 2, 3] @> array[3, 1] as contains, array[1, 2] && array[5, 2] as overlaps;",
      mysql: "select json_contains(json_array(1, 2, 3), json_array(3, 1)) as contains, json_overlaps(json_array(1, 2), json_array(5, 2)) as overlaps;",
    },
    match: '@>\\s*array|&&\\s*array|\\bjson_overlaps\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array operators', url: PG_ARR + '#ARRAY-OPERATORS-TABLE' },
      { label: 'MySQL: JSON_OVERLAPS', url: MY + 'json-search-functions.html#function_json-overlaps' },
    ],
  },
  {
    id: 'array-agg',
    name: 'ARRAY_AGG',
    group: 'arrays',
    summary: 'Collects the values of a group into an array, in the order you choose.',
    postgres: 'array_agg(name order by name)',
    mysql: 'json_arrayagg(name)',
    mysqlNote: `${NO_ARRAYS} JSON_ARRAYAGG has no ORDER BY.`,
    example: {
      postgres: `with t(team, player) as (select 'red', 'Bob' union all select 'red', 'Ann' union all select 'blue', 'Cy')
select team, cardinality(array_agg(player)) as players from t group by team order by team;`,
      mysql: `with t(team, player) as (select 'red', 'Bob' union all select 'red', 'Ann' union all select 'blue', 'Cy')
select team, json_length(json_arrayagg(player)) as players from t group by team order by team;`,
    },
    match: '\\barray_agg\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_ARRAYAGG', url: MY + 'aggregate-functions.html#function_json-arrayagg' },
    ],
  },
  {
    id: 'array-position',
    name: 'ARRAY_POSITION / ARRAY_TO_STRING',
    group: 'arrays',
    summary: 'array_position finds where a value sits in an array; array_to_string joins the elements into text.',
    postgres: "array_position(stops, 'OSL')\narray_to_string(tags, ', ')",
    mysql: "json_search(stops, 'one', 'OSL')",
    mysqlNote: `${NO_ARRAYS} JSON_SEARCH returns a path such as "$[1]" for strings.`,
    example: {
      postgres: "select array_position(array['CPH', 'OSL', 'ARN'], 'OSL') as pos, array_to_string(array['a', 'b'], '-') as joined;",
      mysql: `select cast(substring(json_unquote(json_search(json_array('CPH', 'OSL', 'ARN'), 'one', 'OSL')), 3) as unsigned) + 1 as pos,
       concat_ws('-', 'a', 'b') as joined;`,
    },
    match: '\\b(array_position|array_positions|array_to_string)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array functions', url: PG_ARR + '#ARRAY-FUNCTIONS-TABLE' },
      { label: 'MySQL: JSON_SEARCH', url: MY + 'json-search-functions.html#function_json-search' },
    ],
  },
  {
    id: 'array-append',
    name: 'ARRAY_APPEND / ARRAY_REMOVE / ||',
    group: 'arrays',
    summary: 'Adds an element to the end, removes every copy of a value, or concatenates two arrays with ||.',
    postgres: "array_append(tags, 'vip')\narray_remove(tags, 'new')\narr1 || arr2",
    mysql: "json_array_append(tags, '$', 'vip')",
    mysqlNote: NO_ARRAYS,
    example: {
      postgres: "select cardinality(array_append(array[1, 2], 3)) as appended, cardinality(array_remove(array[1, 2, 1], 1)) as removed;",
      mysql: "select json_length(json_array_append(json_array(1, 2), '$', 3)) as appended, json_length(json_remove(json_array(1, 2, 1), '$[2]', '$[0]')) as removed;",
    },
    match: '\\b(array_append|array_prepend|array_remove|array_cat|json_array_append)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: array functions', url: PG_ARR + '#ARRAY-FUNCTIONS-TABLE' },
      { label: 'MySQL: JSON_ARRAY_APPEND', url: MY + 'json-modification-functions.html#function_json-array-append' },
    ],
  },
]
