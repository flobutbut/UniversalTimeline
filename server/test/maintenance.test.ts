// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
it('preserves every historical file exactly, outside active script and migration paths', () => {
  const manifest: Array<{ source: string; archive: string; bytes: number; sha256: string }> = JSON.parse(readFileSync(`${root}database/archive/manifest.json`, 'utf8'));
  expect(manifest.length).toBeGreaterThan(0);
  expect(new Set(manifest.map(row => row.source)).size).toBe(manifest.length);
  for (const row of manifest) {
    expect(row.archive).toBe(`database/archive/${row.source}.txt`);
    expect(existsSync(root + row.source), row.source).toBe(false);
    const bytes = readFileSync(root + row.archive);
    expect(bytes.length, row.archive).toBe(row.bytes);
    expect(createHash('sha256').update(bytes).digest('hex'), row.archive).toBe(row.sha256);
    expect(statSync(root + row.archive).mode & 0o111, row.archive).toBe(0);
  }
});

it('exposes only the reviewed Supabase migrations and explicit ownership operations', () => {
  expect(readdirSync(root + 'database/migrations').sort()).toEqual([
    '20261029090427_story_access.sql', '20261029093707_harden_public_functions.sql', '20261029093923_isolate_postgis.sql', '20261031204007_story_period_hierarchy.sql', '20261031220914_hybrid_catalogue_search.sql', '20261102001509_frise_only_period_hierarchy.sql', '20261102075026_story_entry_points.sql', '20261102075524_optimize_story_entry_point_policies.sql',
    '20261102105902_account_profiles.sql', '20261102110027_account_functions_private_schema.sql', '20261102131202_story_period_presentations.sql', '20261102204456_admin_console.sql', '20261102223946_story_event_importance.sql',
    '20261103112451_catalogue_conversion_guard.sql',
    '20261103143455_public_story_editors.sql',
    '20261103172801_admin_relations_graph.sql',
    '20261103183154_admin_relations_network.sql',
    '20261104132539_navigation_without_wrapper_periods.sql',
    '20261104184833_story_entry_point_display.sql',
    '20261104234615_wikidata_fact_sources.sql',
    '20261106100000_wikipedia_titles.sql',
    '20261108120000_taxonomy_tags.sql',
    '20261109220108_user_feedback.sql',
    '20261109221920_feedback_email_notifications.sql',
    '20261109222916_feedback_list_filters.sql',
    '20261109223738_feedback_delete.sql',
    '20261109230646_feedback_feature_switch.sql',
    '20261110103843_performance_read_policies.sql',
  ]);
  expect(readdirSync(root + 'database/operations').sort()).toEqual(['assign_admin_role.sql', 'assign_legacy_stories.sql']);
  expect(readdirSync(root + 'database').filter(name => /\.(sh|sql)$/.test(name))).toEqual([]);
});
