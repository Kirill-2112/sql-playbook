import type { ReferenceEntry } from '../types'

const PG = 'https://www.postgresql.org/docs/current/'
const MY = 'https://dev.mysql.com/doc/refman/8.4/en/'

const DOCS_PG = `create table doc (id int, body text);
insert into doc values
  (1, 'Tuning database indexes for speed'),
  (2, 'Cooking fresh pasta at home'),
  (3, 'A small database of family recipes');`
const DOCS_MY = `create table doc (id int, body text, fulltext (body));
insert into doc values
  (1, 'Tuning database indexes for speed'),
  (2, 'Cooking fresh pasta at home'),
  (3, 'A small database of family recipes');`

export const fulltextEntries: ReferenceEntry[] = [
  {
    id: 'tsvector-tsquery',
    name: 'to_tsvector @@ to_tsquery',
    group: 'fulltext',
    summary:
      'Full-text search turns a text into normalised words (tsvector) and a search into a query (tsquery); @@ checks whether they match. Words are stemmed, so "recipes" finds "recipe".',
    postgres: "to_tsvector('english', body) @@ to_tsquery('english', 'database & recipes')",
    mysql: "match (body) against ('+database +recipes' in boolean mode)",
    mysqlNote:
      'MySQL needs a FULLTEXT index on the column and has no stemming: it matches whole words, ignores stopwords and, by default, words shorter than 3 characters.',
    example: {
      postgres: `${DOCS_PG}
select id from doc where to_tsvector('english', body) @@ to_tsquery('english', 'database & recipes');`,
      mysql: `${DOCS_MY}
select id from doc where match (body) against ('+database +recipes' in boolean mode);`,
    },
    match: '@@|\\bmatch\\s*\\([^)]*\\)\\s*against\\b',
    docs: [
      { label: 'PostgreSQL: full-text search intro', url: PG + 'textsearch-intro.html' },
      { label: 'MySQL: boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'websearch-to-tsquery',
    name: 'plainto_tsquery / websearch_to_tsquery',
    group: 'fulltext',
    summary:
      'Build a tsquery from what a user typed, without & and | syntax. websearch_to_tsquery understands "quoted phrases", OR and -excluded words, like a search engine.',
    postgres: "websearch_to_tsquery('english', '\"database indexes\" -recipes')",
    mysql: "match (body) against ('+\"database indexes\" -recipes' in boolean mode)",
    example: {
      postgres: `${DOCS_PG}
select id from doc where to_tsvector('english', body) @@ websearch_to_tsquery('english', 'database -recipes');`,
      mysql: `${DOCS_MY}
select id from doc where match (body) against ('+database -recipes' in boolean mode);`,
    },
    match: '\\b(plainto|phraseto|websearch_to)_tsquery\\s*\\(|\\bin\\s+boolean\\s+mode\\b',
    docs: [
      { label: 'PostgreSQL: parsing queries', url: PG + 'textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES' },
      { label: 'MySQL: boolean full-text searches', url: MY + 'fulltext-boolean.html' },
    ],
  },
  {
    id: 'ts-rank',
    name: 'ts_rank (relevance)',
    group: 'fulltext',
    summary: 'Scores how well each document matches, so the best matches can come first. The numbers mean nothing alone; only the order matters.',
    postgres: "order by ts_rank(to_tsvector('english', body), query) desc",
    mysql: "order by match (body) against ('database') desc",
    mysqlNote: 'In MySQL MATCH … AGAINST in natural-language mode returns the relevance score itself.',
    example: {
      postgres: `${DOCS_PG}
select id
from doc
where to_tsvector('english', body) @@ to_tsquery('english', 'database')
order by ts_rank(to_tsvector('english', body), to_tsquery('english', 'database')) desc, id;`,
      mysql: `${DOCS_MY}
select id
from doc
where match (body) against ('database')
order by match (body) against ('database') desc, id;`,
    },
    match: '\\bts_rank(_cd)?\\s*\\(',
    docs: [
      { label: 'PostgreSQL: ranking search results', url: PG + 'textsearch-controls.html#TEXTSEARCH-RANKING' },
      { label: 'MySQL: natural language full-text searches', url: MY + 'fulltext-natural-language.html' },
    ],
  },
  {
    id: 'gin-index',
    name: 'GIN index / FULLTEXT index',
    group: 'fulltext',
    summary:
      'Without an index every search parses every row. A GIN index on the tsvector expression makes @@ fast; the query must use exactly the same expression.',
    postgres: "create index doc_fts_idx on doc using gin (to_tsvector('english', body));",
    mysql: 'create fulltext index doc_fts_idx on doc (body);',
    mysqlNote: 'In MySQL the FULLTEXT index is required, not optional: MATCH … AGAINST fails without one.',
    example: {
      postgres: `${DOCS_PG}
create index doc_fts_idx on doc using gin (to_tsvector('english', body));
select id from doc where to_tsvector('english', body) @@ to_tsquery('english', 'pasta');`,
      mysql: `create table doc (id int, body text);
insert into doc values (1, 'Tuning database indexes for speed'), (2, 'Cooking fresh pasta at home');
create fulltext index doc_fts_idx on doc (body);
select id from doc where match (body) against ('pasta');`,
    },
    match: '\\busing\\s+gin\\b|\\bfulltext\\b',
    docs: [
      { label: 'PostgreSQL: GIN and GiST indexes for text search', url: PG + 'textsearch-indexes.html' },
      { label: 'MySQL: full-text search functions', url: MY + 'fulltext-search.html' },
    ],
  },
  {
    id: 'ts-headline',
    name: 'ts_headline',
    group: 'fulltext',
    summary: 'Returns a snippet of the document with the matching words highlighted, for search result pages.',
    postgres: "ts_headline('english', body, query, 'StartSel=<b>, StopSel=</b>')",
    mysql: null,
    mysqlNote: 'No equivalent in MySQL; highlight matches in the application.',
    example: {
      postgres: "select ts_headline('english', 'Cooking fresh pasta at home', to_tsquery('english', 'pasta'), 'StartSel=[, StopSel=]') as snippet;",
      mysql: null,
    },
    match: '\\bts_headline\\s*\\(',
    docs: [{ label: 'PostgreSQL: highlighting results', url: PG + 'textsearch-controls.html#TEXTSEARCH-HEADLINE' }],
  },
]
