// Generates the SQL that fills wikipedia_title_fr/en for catalogue rows identified by a Q-id.
// Usage: node --experimental-strip-types scripts/wikipedia-titles-backfill.mjs <qids.txt> <out.sql> <rollback.sql>
// The Q-id list comes from a read of the target database (one Q-id per line or comma separated).
// Reads only the public Wikidata SPARQL endpoint; never connects to the database. The generated
// script must be reviewed, then applied with explicit approval (CLAUDE.md, rule 31).
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeWikipediaTitle } from '../server/src/shared/wikipedia.ts';

const [input, output, rollback] = process.argv.slice(2);
if (!input || !output || !rollback) {
  console.error('Usage : node --experimental-strip-types scripts/wikipedia-titles-backfill.mjs <qids.txt> <out.sql> <rollback.sql>');
  process.exit(2);
}
const qids = [...new Set(readFileSync(input, 'utf8').split(/[\s,]+/).map(value => value.replace(/^[pe]:/, '').trim().toUpperCase()).filter(Boolean))];
const invalid = qids.filter(qid => !/^Q[1-9]\d*$/.test(qid));
if (invalid.length) { console.error(`Q-id invalides : ${invalid.join(', ')}`); process.exit(2); }

const titles = new Map();
for (let i = 0; i < qids.length; i += 400) {
  const batch = qids.slice(i, i + 400);
  const query = `SELECT ?item ?language ?article WHERE {
    VALUES ?item { ${batch.map(qid => `wd:${qid}`).join(' ')} }
    VALUES (?site ?language) { (<https://fr.wikipedia.org/> "fr") (<https://en.wikipedia.org/> "en") }
    ?article schema:about ?item; schema:isPartOf ?site.
  }`;
  const response = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': 'UniversalTimeline/1.0 (catalogue Wikipedia titles; https://universaltimeline.net)' },
    body: new URLSearchParams({ query }),
  });
  if (!response.ok) { console.error(`SPARQL : HTTP ${response.status}`); process.exit(1); }
  for (const binding of (await response.json()).results.bindings) {
    const qid = binding.item.value.split('/').pop();
    const language = binding.language.value;
    const title = normalizeWikipediaTitle(decodeURIComponent(binding.article.value.split('/wiki/')[1] ?? ''));
    if (!title) { console.error(`Titre illisible ignoré : ${qid} ${language}`); continue; }
    const entry = titles.get(qid) ?? { fr: null, en: null };
    entry[language] = title;
    titles.set(qid, entry);
  }
}

const literal = value => value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`;
const rows = [...titles].sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
const values = rows.map(([qid, entry]) => `  ('${qid}', ${literal(entry.fr)}, ${literal(entry.en)})`).join(',\n');
const stamp = new Date().toISOString().slice(0, 10);
const header = `-- Généré le ${stamp} par scripts/wikipedia-titles-backfill.mjs depuis le SPARQL public de Wikidata.
-- ${qids.length} Q-id lus, ${rows.length} avec au moins un article (fr ou en).`;

writeFileSync(output, `${header}
-- Ne complète que les fiches sans aucun titre : une saisie manuelle n'est jamais écrasée.
-- Les faits dérivés (source_key) n'ont pas d'article propre et restent sans lien.
-- Prérequis : migration 20261106100000_wikipedia_titles appliquée.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE wikipedia_titles_batch (qid text PRIMARY KEY, fr text, en text) ON COMMIT DROP;
INSERT INTO wikipedia_titles_batch (qid, fr, en) VALUES
${values};
UPDATE public.periods AS target SET wikipedia_title_fr = batch.fr, wikipedia_title_en = batch.en
  FROM wikipedia_titles_batch AS batch
  WHERE target.wikidata_id = batch.qid AND target.source_key IS NULL
    AND target.wikipedia_title_fr IS NULL AND target.wikipedia_title_en IS NULL;
UPDATE public.events AS target SET wikipedia_title_fr = batch.fr, wikipedia_title_en = batch.en
  FROM wikipedia_titles_batch AS batch
  WHERE target.wikidata_id = batch.qid AND target.source_key IS NULL
    AND target.wikipedia_title_fr IS NULL AND target.wikipedia_title_en IS NULL;
SELECT 'periods' AS kind, count(*) FILTER (WHERE wikipedia_title_fr IS NOT NULL) AS fr, count(*) FILTER (WHERE wikipedia_title_fr IS NULL AND wikipedia_title_en IS NOT NULL) AS en_only FROM public.periods
UNION ALL
SELECT 'events', count(*) FILTER (WHERE wikipedia_title_fr IS NOT NULL), count(*) FILTER (WHERE wikipedia_title_fr IS NULL AND wikipedia_title_en IS NOT NULL) FROM public.events;
COMMIT;
`);

writeFileSync(rollback, `${header}
-- Annule le complément : retire seulement les titres encore identiques à ceux du lot.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE wikipedia_titles_batch (qid text PRIMARY KEY, fr text, en text) ON COMMIT DROP;
INSERT INTO wikipedia_titles_batch (qid, fr, en) VALUES
${values};
UPDATE public.periods AS target SET wikipedia_title_fr = NULL, wikipedia_title_en = NULL
  FROM wikipedia_titles_batch AS batch
  WHERE target.wikidata_id = batch.qid
    AND target.wikipedia_title_fr IS NOT DISTINCT FROM batch.fr AND target.wikipedia_title_en IS NOT DISTINCT FROM batch.en;
UPDATE public.events AS target SET wikipedia_title_fr = NULL, wikipedia_title_en = NULL
  FROM wikipedia_titles_batch AS batch
  WHERE target.wikidata_id = batch.qid
    AND target.wikipedia_title_fr IS NOT DISTINCT FROM batch.fr AND target.wikipedia_title_en IS NOT DISTINCT FROM batch.en;
COMMIT;
`);
console.log(`${rows.length} Q-id avec article sur ${qids.length} ; scripts écrits.`);
