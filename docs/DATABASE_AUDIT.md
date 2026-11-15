# Deep Signal database audit

Audit date: 2026-11-15. Target: linked production project `Deep-signal-db`.

## Method and safety

The audit used Supabase CLI read-only SQL against PostgreSQL catalogs. It queried schemas, columns, constraints, indexes, RLS policies, grants, function definitions, Realtime publication metadata, Storage bucket configuration, and the migration ledger. It did not read application row contents or change the remote database. No migrations were applied.

## Tables actually present

The `public` schema has 13 application tables:

`comments`, `follows`, `jokal_ai_daily_usage`, `likes`, `messages`, `posts`, `profiles`, `reels`, `room_members`, `rooms`, `saved_posts`, `voice_card_clash_players`, and `voice_card_clash_rooms`.

Supabase also has its built-in `auth.users` table. There is no separate public `users` table. `profiles.id` references `auth.users.id`.

There are no public `communities`, `community_memberships`, `conversations`, `notifications`, `profile_views`, `game_scores`, `game_matches`, `game_progress`, `user_blocks`, `content_reports`, `post_bookmarks`, or Jokal conversation/message/project tables in production. `rooms` and `room_members` are voice rooms; they are not a community system. `saved_posts` exists; app code now uses this production table for bookmarks. A local migration also creates a parallel `post_bookmarks` table, which the prepared hotfix leaves untouched to avoid deleting data.

## Schema, relations, and indexes

- Posts, comments, likes, follows, messages, profiles, rooms, room_members, saved_posts, reels, and Voice Card Clash tables have primary keys and foreign keys. The inspected foreign keys include the expected post/comment/like and room/member relationships.
- `profiles.id` references `auth.users(id)` without `ON DELETE CASCADE`; Auth user deletion may be blocked by an existing profile row.
- Many owner/reference IDs are nullable (`posts.user_id`, `likes.user_id/post_id`, `comments.user_id/post_id`, `follows` endpoints, and `messages` sender/receiver). RLS currently checks ownership, but the schema permits incomplete rows and weaker uniqueness behavior.
- `room_members` has two unique indexes on `(room_id,user_id)` in addition to its primary key: the constraint-backed `room_members_room_id_user_id_key` and duplicate `room_members_room_user_key`.
- Message sender/receiver indexes exist, but there is no conversation table; the UI derives conversations from message rows.
- The remote `messages` table has `read_at`, but lacks `message_type`, `audio_url`, and `audio_duration_ms`, which the client uses for voice messages.
- The remote Voice Card Clash room RPC accepts only `target_code`; current client code also sends `target_team_size`. Its production table has no team-size column.
- `game_scores`, result verification, and progress RPCs are absent remotely. They exist only in local migration files.

## Row-level security

RLS is enabled on all 13 public application tables and on Storage tables. `FORCE ROW LEVEL SECURITY` is false on the inspected tables. Policies include duplicate legacy and current policies, frequently with role `public`; those policies mostly test `auth.uid()` ownership, but broad grants to `anon` and `authenticated` leave RLS as the main barrier. A least-privilege grant review is still needed.

Important observations:

- Direct-message SELECT is limited to sender or receiver. INSERT checks the sender. The receiver has read-status update policies, and table-level UPDATE is not granted; this needs a real two-account test before claiming chat security works end-to-end.
- Profiles and public posts are readable through broad public policies. Profile privacy settings in the UI are stored locally and do not change database visibility.
- `realtime` has no row in `pg_policies` for `realtime.messages` in production. Local migration `20261113003000_realtime_channel_authorization.sql` adds authorization policies, but its migration is not in the remote ledger.
- `close_stale_rooms(interval)` is `SECURITY DEFINER`, has EXECUTE granted to `PUBLIC`/`anon`, accepts a caller-controlled grace period, and updates room status while deleting membership rows. This is a critical authorization and data-retention issue. The prepared local hotfix makes the threshold server-controlled, requires authentication, and stops deleting membership history.

## Realtime

The `supabase_realtime` publication contains `public.messages`, `public.room_members`, and `public.rooms`. It does not contain posts, comments, likes, or game result tables. Realtime authorization policies were not found on the production `realtime` schema. Private-channel flows are therefore unverified and likely fail authorization until the local policy migration is safely reconciled and applied.

## Storage

Production buckets are:

| Bucket | Public | Limit | MIME restriction |
| --- | --- | --- | --- |
| `avatar-temp` | No | 3 MiB | JPEG, PNG, WebP |
| `avatars` | Yes | 5 MiB | JPEG, PNG, WebP |
| `posts` | Yes | None | None |

`voice-notes` is missing although chat code uploads and reads from it. Two broad authenticated upload policies let users upload into `posts` and `avatars` without checking the first path segment belongs to the caller. A prepared migration replaces those with owner-path policies and creates a private voice-note bucket with participant-path access. The public post bucket remains unbounded and accepts any MIME type; setting a compatible limit needs a product file-size decision.

## Migration ledger

The production ledger contains four versions: `20260910153013`, `20260910153047`, `20260920001050`, and `20261112174648`. The repository contains 26 migration versions, and none matches a remote version exactly. The remote includes three versions absent locally plus an `avatar_studio` version whose timestamp differs from the local file. This is not a safe state for `supabase db push`; migration history and actual schema must be reconciled first. In particular, the remote-only `clear_test_data_keep_schema` migration must be inspected before any future migration operation.

## Data source and functionality

Posts, likes, comments, follows, direct-message rows, profiles, voice rooms, and Voice Card Clash room membership are intended to use Supabase. Some feature-specific reads currently target missing tables, so those functions are not fully connected. UI preferences and language/theme settings use localStorage. Echoes of Ash saves to localStorage. Zombie: Last Stand has no durable save or Supabase integration. Browser auth state is held in local/session storage by Supabase Auth; that is session persistence, not the application's data store.

## Safe follow-up

`supabase/migrations/20261115000000_database_audit_security_hotfix.sql` is prepared locally and has not been applied. It secures bookmarks on the existing `saved_posts` table, replaces broad Storage uploads, creates a private voice-note bucket, and hardens stale-room cleanup. First reconcile the migration ledger against a schema dump and review the remote-only migration; then run the additive fixes in a staging project, test RLS/Storage/Realtime, and only afterward plan production approval. No table or row was added remotely during this audit.
