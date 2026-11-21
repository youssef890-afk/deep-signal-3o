# Deep Signal database audit

Original audit: 2026-11-15. Live follow-up: 2026-11-20. Target: linked
production project `Deep-signal-db`.

## Live follow-up (2026-11-20)

All checks below were read-only. No schema, policy, data, Storage object, or
migration ledger was changed.

- The migration ledger has 28 local-only versions, four remote-only versions,
  and zero matching versions. Remote versions are `20260910153013`,
  `20260910153047`, `20260920001050`, and `20261112174648`. The local
  `avatar_studio` SQL matches remote SQL after whitespace normalization, but
  the two phase-1 migrations differ. The remote-only
  `clear_test_data_keep_schema` contains `TRUNCATE ... RESTART IDENTITY
  CASCADE` and no recorded rollback.
- The production schema differs from local migrations: `posts.media_urls` is
  nullable `jsonb` with default `[]`, while local
  `20260910155900_core_content_and_rooms.sql` declares `text[] NOT NULL`.
  Production `rooms.capacity` is `integer DEFAULT 10`; local migrations define
  a different type/default.
- The old feed request was replayed against a guaranteed-empty post ID filter.
  It returned HTTP 400 / `42703` because `posts.audio_url` does not exist.
  The current `FeedPage` request omits that field and returned HTTP 200 / zero
  rows. Production does have the queried comments-to-posts, comments-to-
  profiles, and posts-to-profiles foreign keys.
- Production `messages` lacks `message_type`, `audio_url`, and
  `audio_duration_ms`. The private `voice-notes` bucket now exists, but has no
  matching `storage.objects` policies. `realtime.messages` has no policies.
- `room_members` has permissive INSERT policies `room_members_insert` and
  `room_members_insert_self`. The former checks only `auth.uid() = user_id`;
  because permissive policies combine with OR, it bypasses the latter's
  active-room and capacity checks. There is no `room_members` trigger and no
  role check constraint; the only non-internal room trigger is `rooms_add_host`.
  Authenticated users can self-join inactive/full rooms and choose
  `role='owner'`. This is a critical authorization issue.
- `authenticated` can update `messages.read_at` but cannot update
  `messages.content`; `anon` cannot update `read_at`.
- `supabase backups list` returned no physical backup entries and reported
  `pitr_enabled=false`. `walg_enabled=true` does not prove a usable restore
  point. No backup/restore was attempted. Supabase database backups exclude
  Storage object bytes, so object backup/restore must be handled separately.

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

- Direct-message SELECT is limited to sender or receiver. INSERT checks the sender. `authenticated` can update the `read_at` column but not `content`, and `anon` cannot update `read_at`; this needs a real two-account test before claiming chat security works end-to-end.
- Profiles and public posts are readable through broad public policies. Profile privacy settings in the UI are stored locally and do not change database visibility.
- `realtime` has no row in `pg_policies` for `realtime.messages` in production. Local migration `20261113003000_realtime_channel_authorization.sql` adds authorization policies, but its migration is not in the remote ledger.
- `close_stale_rooms(interval)` is `SECURITY DEFINER`, has EXECUTE granted to `PUBLIC`/`anon`, accepts a caller-controlled grace period, and updates room status while deleting membership rows. This is a critical authorization and data-retention issue. The prepared local hotfix makes the threshold server-controlled, requires authentication, and stops deleting membership history.
- The live `room_members` INSERT policies are permissive and overlap. Since policies combine with OR, the self-only policy bypasses the other policy's active-room/capacity checks. No membership trigger or role check constraint exists in production. Local capacity-trigger SQL has not been applied.

## Realtime

The `supabase_realtime` publication contains `public.messages`, `public.room_members`, and `public.rooms`. It does not contain posts, comments, likes, or game result tables. Realtime authorization policies were not found on the production `realtime` schema. Private-channel flows are therefore unverified and likely fail authorization until the local policy migration is safely reconciled and applied.

## Storage

Production buckets in the 2026-11-20 follow-up are:

| Bucket | Public | Limit | MIME restriction |
| --- | --- | --- | --- |
| `avatar-temp` | No | 3 MiB | JPEG, PNG, WebP |
| `avatars` | Yes | 5 MiB | JPEG, PNG, WebP |
| `posts` | Yes | None | None |
| `voice-notes` | No | 5 MiB | audio types |

`voice-notes` was missing at the original audit, but exists in the live follow-up
as a private 5 MiB bucket with audio MIME restrictions. It still has no
`storage.objects` policies, so the bucket is not usable by the app. Two broad
authenticated upload policies let users upload into `posts` and `avatars`
without checking the first path segment belongs to the caller. A prepared
migration replaces those with owner-path policies and creates participant-path
access for voice notes. The public post bucket remains unbounded and accepts
any MIME type; setting a compatible limit needs a product file-size decision.

## Migration ledger

The production ledger contains four versions: `20260910153013`,
`20260910153047`, `20260920001050`, and `20261112174648`. The current checkout
contains 28 migration versions; none matches a remote version exactly. The
remote includes three versions absent locally plus an `avatar_studio` version
whose timestamp differs from the local file. The `avatar_studio` SQL matches
after whitespace normalization. The phase-1 migrations differ in content.
This is not a safe state for `supabase db push`; migration history and actual
schema must be reconciled first. In particular, the remote-only
`clear_test_data_keep_schema` migration contains a destructive truncate and no
recorded rollback, so it must never be blindly replayed.

## Data source and functionality

Posts, likes, comments, follows, direct-message rows, profiles, voice rooms, and Voice Card Clash room membership are intended to use Supabase. Some feature-specific reads currently target missing tables, so those functions are not fully connected. UI preferences and language/theme settings use localStorage. Echoes of Ash saves to localStorage. Zombie: Last Stand has no durable save or Supabase integration. Browser auth state is held in local/session storage by Supabase Auth; that is session persistence, not the application's data store.

## Safe follow-up

`supabase/migrations/20261115000000_database_audit_security_hotfix.sql` and
`supabase/migrations/20261119000000_voice_notes_and_presence_repair.sql` are
prepared locally and have not been applied. The former secures bookmarks,
replaces broad Storage uploads, and hardens stale-room cleanup; the latter adds
audio-message columns and voice/Realtime policies. Neither is a validated
production patch, and neither addresses the permissive room-membership policy
overlap. First reconcile the ledger against a schema-only dump and inspect the
remote-only migration; then restore to staging, apply reviewed repairs there,
and test RLS/Storage/Realtime before seeking production approval. No production
table or row was changed during this audit.
