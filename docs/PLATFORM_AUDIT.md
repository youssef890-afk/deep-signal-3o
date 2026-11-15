# Deep Signal platform audit

Audit date: 2026-11-15. Sources: local source inspection and read-only production schema inspection.

| Area | Data source found | Status |
| --- | --- | --- |
| Authentication | Supabase Auth; browser session persisted by Supabase client | Configured in source; account flows not tested against two accounts. |
| Profiles | `public.profiles` linked to `auth.users` | Present; some local profile fields/features exist in source but the remote schema is behind. Profile privacy settings are local only. |
| Feed / posts | `public.posts` | Database-backed. Public read is enabled. Bookmark code now targets the existing `saved_posts` table. |
| Likes | `public.likes` | Database-backed with user/post unique constraint and ownership policies. |
| Comments | `public.comments` | Database-backed; comments table is present. |
| Search / discover | Profile and post queries through Supabase | Database-backed where schema exists; full UX not end-to-end tested. |
| Direct messaging | `public.messages`, published to Realtime | Message rows are database-backed. No conversations table; conversation list is derived. Private Realtime auth was not found in production; voice-note columns and bucket are missing, so voice messages are not connected end-to-end. |
| Notifications | Derived from follows, profile views, likes, comments, and messages | No durable `notifications` table or read/seen state. `profile_views` is queried by code but missing remotely. |
| Communities | No communities tables found | Not implemented as a database-backed community system. `rooms` / `room_members` are voice rooms. |
| Voice rooms | `public.rooms` / `public.room_members` | Database-backed room membership. Realtime policies and two-user interaction remain unverified. |
| Reels | `public.reels` exists | The current page code primarily queries video posts; production/local schema usage needs reconciliation. |
| Settings | Profile fields in Supabase; appearance, language, and many preferences in localStorage | Account profile edits can persist; notification/privacy/accessibility toggles are device-local. Account deletion UI reports unavailable. |
| Jokal quota | `public.jokal_ai_daily_usage` and a quota RPC | Present in production. Jokal conversations/messages/projects tables expected by local migrations are absent remotely. |
| Voice Card Clash | `voice_card_clash_rooms` / `voice_card_clash_players` | Room membership persists; live game state and results are client-side. Production RPC lacks the team-size argument sent by the current client. |

## Overall assessment

Core social data has a Supabase foundation, but the active production schema is behind the app code and local migration history. Several screens can render while operations fail because the specific table/function/bucket they call does not exist remotely. The platform is not release-ready until the migration ledger is reconciled, missing feature schemas are safely deployed, Realtime and RLS are tested with two accounts, and persistence/authority gaps are addressed.
