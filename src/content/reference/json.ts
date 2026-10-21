import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'
const PG_JSON = PG + 'functions-json.html'
const MY_SEARCH = MY + 'json-search-functions.html'

const DOC_PG = `with t(doc) as (
  select '{"name": "Ann", "address": {"city": "Oslo"}, "tags": ["new", "vip"]}'::jsonb
)`
const DOC_MY = `with t(doc) as (
  select cast('{"name": "Ann", "address": {"city": "Oslo"}, "tags": ["new", "vip"]}' as json)
)`

export const jsonEntries: ReferenceEntry[] = [
  {
    id: 'json-arrow',
    name: '-> and ->>',
    group: 'json',
    summary:
      '-> returns a JSON value (an object, array or JSON string); ->> returns it as plain text, ready to compare or show. PostgreSQL takes a key or array index, MySQL a JSON path.',
    postgres: "doc -> 'address'\ndoc ->> 'name'\ndoc -> 'tags' ->> 0",
    mysql: "doc -> '$.address'\ndoc ->> '$.name'\ndoc ->> '$.tags[0]'",
    mysqlNote: 'In MySQL -> and ->> work only on a column. On an expression use json_extract(), wrapped in json_unquote() for text.',
    example: {
      postgres: `${DOC_PG}
select doc ->> 'name' as name, doc -> 'tags' ->> 0 as first_tag from t;`,
      mysql: `${DOC_MY}
select doc ->> '$.name' as name, doc ->> '$.tags[0]' as first_tag from t;`,
    },
    match: '->>?',
    docs: [
      { label: 'PostgreSQL: JSON operators', url: PG_JSON + '#FUNCTIONS-JSON-PROCESSING' },
      { label: 'MySQL: ->> operator', url: MY_SEARCH + '#operator_json-inline-path' },
    ],
  },
  {
    id: 'json-path',
    name: '#>> and nested paths',
    group: 'json',
    summary: 'Reaches into nested objects in one step. #> returns JSON, #>> returns text.',
    postgres: "doc #>> '{address,city}'\njsonb_path_query_first(doc, '$.address.city')",
    mysql: "doc ->> '$.address.city'\njson_extract(doc, '$.address.city')",
    example: {
      postgres: `${DOC_PG}
select doc #>> '{address,city}' as city from t;`,
      mysql: `${DOC_MY}
select doc ->> '$.address.city' as city from t;`,
    },
    match: '#>>?|\\bjson_extract\\s*\\(|\\bjsonb?_path_\\w+\\s*\\(',
    docs: [
      { label: 'PostgreSQL: JSON operators', url: PG_JSON + '#FUNCTIONS-JSON-PROCESSING' },
      { label: 'MySQL: JSON_EXTRACT', url: MY_SEARCH + '#function_json-extract' },
    ],
  },
  {
    id: 'json-contains',
    name: '@> (JSON contains)',
    group: 'json',
    summary: 'True when the left JSON contains the right one: the same keys with the same values, or array elements. A GIN index makes it fast.',
    postgres: 'doc @> \'{"tags": ["vip"]}\'',
    mysql: 'json_contains(doc, \'["vip"]\', \'$.tags\')',
    example: {
      postgres: `${DOC_PG}
select doc @> '{"tags": ["vip"]}' as is_vip, doc @> '{"name": "Bob"}' as is_bob from t;`,
      mysql: `${DOC_MY}
select json_contains(doc, '["vip"]', '$.tags') as is_vip, json_contains(doc, '{"name": "Bob"}') as is_bob from t;`,
    },
    match: '@>|\\bjson_contains\\s*\\(',
    docs: [
      { label: 'PostgreSQL: jsonb containment', url: PG + 'datatype-json.html#JSON-CONTAINMENT' },
      { label: 'MySQL: JSON_CONTAINS', url: MY_SEARCH + '#function_json-contains' },
    ],
  },
  {
    id: 'json-key-exists',
    name: '? (key exists)',
    group: 'json',
    summary: 'Checks whether a JSON object has a key at the top level, whatever its value.',
    postgres: "doc ? 'email'\ndoc ?| array['email', 'phone']",
    mysql: "json_contains_path(doc, 'one', '$.email')",
    example: {
      postgres: `${DOC_PG}
select doc ? 'name' as has_name, doc ? 'email' as has_email from t;`,
      mysql: `${DOC_MY}
select json_contains_path(doc, 'one', '$.name') as has_name, json_contains_path(doc, 'one', '$.email') as has_email from t;`,
    },
    match: "\\s\\?[|&]?\\s*'|\\bjson_contains_path\\s*\\(",
    docs: [
      { label: 'PostgreSQL: jsonb operators', url: PG_JSON + '#FUNCTIONS-JSONB-OP-TABLE' },
      { label: 'MySQL: JSON_CONTAINS_PATH', url: MY_SEARCH + '#function_json-contains-path' },
    ],
  },
  {
    id: 'json-build-object',
    name: 'JSONB_BUILD_OBJECT / JSONB_BUILD_ARRAY',
    group: 'json',
    summary: 'Builds a JSON object from key/value pairs, or an array from values, inside a query.',
    postgres: "jsonb_build_object('id', id, 'name', name)\njsonb_build_array(a, b)",
    mysql: "json_object('id', id, 'name', name)\njson_array(a, b)",
    example: {
      postgres: "select jsonb_build_object('id', 7, 'name', 'tea') ->> 'name' as name, jsonb_array_length(jsonb_build_array(1, 2, 3)) as n;",
      mysql: "select json_unquote(json_extract(json_object('id', 7, 'name', 'tea'), '$.name')) as name, json_length(json_array(1, 2, 3)) as n;",
    },
    match: '\\b(jsonb?_build_(object|array)|json_object|json_array)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: JSON creation functions', url: PG_JSON + '#FUNCTIONS-JSON-CREATION-TABLE' },
      { label: 'MySQL: JSON_OBJECT', url: MY + 'json-creation-functions.html#function_json-object' },
    ],
  },
  {
    id: 'json-agg',
    name: 'JSONB_AGG / JSONB_OBJECT_AGG',
    group: 'json',
    summary: 'Aggregates rows into a JSON array, or key/value pairs into one JSON object. Useful for returning nested data in one row per parent.',
    postgres: 'jsonb_agg(name order by name)\njsonb_object_agg(key, value)',
    mysql: 'json_arrayagg(name)\njson_objectagg(key, value)',
    mysqlNote: 'JSON_ARRAYAGG has no ORDER BY; the order of elements is not guaranteed.',
    example: {
      postgres: `with t(k, v) as (select 'tea', 3 union all select 'cake', 7)
select jsonb_array_length(jsonb_agg(k)) as n, jsonb_object_agg(k, v) ->> 'cake' as cake from t;`,
      mysql: `with t(k, v) as (select 'tea', 3 union all select 'cake', 7)
select json_length(json_arrayagg(k)) as n, json_extract(json_objectagg(k, v), '$.cake') as cake from t;`,
    },
    match: '\\b(jsonb?_agg|jsonb?_object_agg|json_arrayagg|json_objectagg)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: jsonb_agg', url: PG + 'functions-aggregate.html' },
      { label: 'MySQL: JSON_ARRAYAGG', url: MY + 'aggregate-functions.html#function_json-arrayagg' },
    ],
  },
  {
    id: 'json-array-elements',
    name: 'JSONB_ARRAY_ELEMENTS / JSON_TABLE',
    group: 'json',
    summary: 'Turns a JSON array into rows, one per element, so you can filter, join and count them like a table.',
    postgres: "select t.id, tag\nfrom t, jsonb_array_elements_text(t.doc -> 'tags') as tag",
    mysql: "select t.id, j.tag\nfrom t, json_table(t.doc, '$.tags[*]' columns (tag varchar(50) path '$')) j",
    mysqlNote: 'MySQL uses JSON_TABLE; PostgreSQL 17+ has JSON_TABLE too.',
    example: {
      postgres: `${DOC_PG}
select tag from t, jsonb_array_elements_text(t.doc -> 'tags') as tag order by tag;`,
      mysql: `${DOC_MY}
select j.tag from t, json_table(t.doc, '$.tags[*]' columns (tag varchar(50) path '$')) j order by j.tag;`,
    },
    match: '\\b(jsonb?_array_elements(_text)?|json_table)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: JSON processing functions', url: PG_JSON + '#FUNCTIONS-JSON-PROCESSING-TABLE' },
      { label: 'MySQL: JSON_TABLE', url: MY + 'json-table-functions.html' },
    ],
  },
  {
    id: 'json-each-keys',
    name: 'JSONB_EACH / JSONB_OBJECT_KEYS',
    group: 'json',
    summary: 'Turns the keys (and values) of a JSON object into rows. Handy when every row stores different attributes.',
    postgres: 'select key, value from jsonb_each(doc)\nselect jsonb_object_keys(doc)',
    mysql: 'json_keys(doc)',
    mysqlNote: 'MySQL returns the keys as one JSON array; read it with JSON_TABLE to get rows.',
    example: {
      postgres: `${DOC_PG}
select k from t, jsonb_object_keys(doc) as k order by k;`,
      mysql: `${DOC_MY}
select j.k from t, json_table(json_keys(t.doc), '$[*]' columns (k varchar(50) path '$')) j order by j.k;`,
    },
    match: '\\b(jsonb?_each(_text)?|jsonb?_object_keys|json_keys)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: JSON processing functions', url: PG_JSON + '#FUNCTIONS-JSON-PROCESSING-TABLE' },
      { label: 'MySQL: JSON_KEYS', url: MY_SEARCH + '#function_json-keys' },
    ],
  },
  {
    id: 'jsonb-set',
    name: 'JSONB_SET and || (merge)',
    group: 'json',
    summary: 'Changes one value inside a JSON document, or merges two objects (keys on the right win). The original is not modified unless you UPDATE with the result.',
    postgres: "jsonb_set(doc, '{address,city}', '\"Rome\"')\ndoc || '{\"vip\": true}'",
    mysql: "json_set(doc, '$.address.city', 'Rome')\njson_merge_patch(doc, '{\"vip\": true}')",
    example: {
      postgres: `${DOC_PG}
select jsonb_set(doc, '{address,city}', '"Rome"') #>> '{address,city}' as city,
       (doc || '{"name": "Bob"}') ->> 'name' as name
from t;`,
      mysql: `${DOC_MY}
select json_unquote(json_extract(json_set(doc, '$.address.city', 'Rome'), '$.address.city')) as city,
       json_unquote(json_extract(json_merge_patch(doc, '{"name": "Bob"}'), '$.name')) as name
from t;`,
    },
    match: '\\b(jsonb?_set|jsonb?_insert|json_set|json_replace|json_merge_patch|json_remove)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: jsonb_set', url: PG_JSON + '#FUNCTIONS-JSON-PROCESSING-TABLE' },
      { label: 'MySQL: JSON_SET', url: MY + 'json-modification-functions.html#function_json-set' },
    ],
  },
  {
    id: 'json-types',
    name: 'JSON vs JSONB',
    group: 'json',
    summary:
      'PostgreSQL has two JSON types: json keeps the text exactly as written; jsonb stores a parsed binary form that drops duplicate keys, sorts keys and supports indexes and @>. Use jsonb.',
    postgres: 'doc jsonb\njsonb_typeof(doc -> \'tags\')\njsonb_array_length(doc -> \'tags\')',
    mysql: "doc json\njson_type(doc -> '$.tags')\njson_length(doc, '$.tags')",
    mysqlNote: 'MySQL has one JSON type, stored in a parsed binary form like jsonb.',
    example: {
      postgres: `${DOC_PG}
select jsonb_typeof(doc -> 'tags') as kind, jsonb_array_length(doc -> 'tags') as n from t;`,
      mysql: `${DOC_MY}
select lower(json_type(doc -> '$.tags')) as kind, json_length(doc, '$.tags') as n from t;`,
    },
    match: '\\bjsonb?\\b(?!_)|\\bjson_(type|length|valid)\\s*\\(',
    docs: [
      { label: 'PostgreSQL: JSON types', url: PG + 'datatype-json.html' },
      { label: 'MySQL: JSON data type', url: MY + 'json.html' },
    ],
  },
]
