import type { TransactionClient } from '../api/transaction.js';
import type { Timestamp } from './rows.js';

export interface ProfileRow {
  username: string; avatar_color: string; avatar_icon: string;
  terms_version: string | null; terms_accepted_at: Timestamp | null; created_at: Timestamp;
}
const columns = 'username, avatar_color, avatar_icon, terms_version, terms_accepted_at, created_at';

/** RLS limits every statement to the caller's own row (auth.uid()). */
export async function readOwnProfile(client: TransactionClient) {
  return (await client.query<ProfileRow>(`SELECT ${columns} FROM public.profiles WHERE user_id = (SELECT auth.uid())`)).rows[0] ?? null;
}

export async function upsertOwnProfile(client: TransactionClient, data: { username: string; avatarColor: string; avatarIcon: string }) {
  return (await client.query<ProfileRow>(`
    INSERT INTO public.profiles (username, avatar_color, avatar_icon) VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, avatar_color = EXCLUDED.avatar_color, avatar_icon = EXCLUDED.avatar_icon
    RETURNING ${columns}`, [data.username, data.avatarColor, data.avatarIcon])).rows[0];
}

export async function acceptOwnTerms(client: TransactionClient, version: string) {
  return (await client.query<ProfileRow>(`
    UPDATE public.profiles SET terms_version = $1, terms_accepted_at = now()
    WHERE user_id = (SELECT auth.uid()) RETURNING ${columns}`, [version])).rows[0] ?? null;
}

/** The byline of the caller's frises follows a username change. */
export async function renameOwnStoriesAuthor(client: TransactionClient, username: string) {
  await client.query(`UPDATE public.stories SET author = $1 WHERE owner_user_id = (SELECT auth.uid()) AND author IS DISTINCT FROM $1`, [username]);
}

export async function isUsernameAvailable(client: TransactionClient, username: string) {
  return (await client.query<{ available: boolean }>('SELECT account_private.is_username_available($1) AS available', [username])).rows[0]?.available === true;
}

export async function deleteOwnAccount(client: TransactionClient) {
  await client.query('SELECT account_private.delete_own_account()');
}

/** Everything the caller owns in the application schema, for the right of access. */
export async function exportOwnStories(client: TransactionClient) {
  return (await client.query(`
    SELECT s.id, s.title_fr, s.title_en, s.description_fr, s.description_en, s.author, s.is_public,
           s.parent_story_id, s.created_at, s.updated_at,
           (SELECT coalesce(json_agg(json_build_object('period_id', sp.period_id, 'parent_period_id', sp.parent_period_id) ORDER BY sp.period_id), '[]')
              FROM public.story_periods sp WHERE sp.story_id = s.id) AS periods,
           (SELECT coalesce(json_agg(se.event_id ORDER BY se.event_id), '[]') FROM public.story_events se WHERE se.story_id = s.id) AS events,
           (SELECT coalesce(json_agg(sc.category_id ORDER BY sc.category_id), '[]') FROM public.story_categories sc WHERE sc.story_id = s.id) AS categories,
           (SELECT coalesce(json_agg(st.tag_id ORDER BY st.position), '[]') FROM public.story_tags st WHERE st.story_id = s.id) AS tags
    FROM public.stories s WHERE s.owner_user_id = (SELECT auth.uid()) ORDER BY s.id`)).rows;
}
