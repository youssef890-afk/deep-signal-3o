# Deep-Signal Lite + Max — Initial Audit

**Date:** 2026-11-20  
**Phase:** Day 0 — read-only inspection  
**Scope:** GitHub repository and branches, the local Lite checkout, existing audit
documents, app/API/database source, local tests, and official hosting information.

No application code, remote database, Supabase migration, hosting setting, or
user data was changed for this audit. The only new file is this report.

## Executive summary

- The public repository is
  [`youssef890-afk/deep-signal-3o`](https://github.com/youssef890-afk/deep-signal-3o).
  GitHub lists `main` as its default branch and `lite-release` as the Lite branch.
- A bounded search found no separate public Max repository or Max-named branch.
  `main` is the closest Max candidate because it has `/games` and
  `/games/voice-card-clash` routes. This is an inference from source, not a
  verified product/deployment designation. The search cannot rule out private
  or differently named repositories.
- `lite-release` is based on `main` and has 17 commits not in `main`; the branch
  comparison shows 66 changed files. Lite hides game routes, while its source
  still contains game code. The current two-branch setup is not yet a shared
  feature-flag architecture.
- Read-only Vercel inspection found two projects, both deploying `main` to
  production and `lite-release` to preview. The secondary project has no
  production Supabase URL variable listed, so a shared production Supabase
  project and a distinct Max deployment are **not verified**.
- The production database audit recorded on 2026-11-15 reports a migration
  ledger/schema mismatch. Recent browser errors additionally showed the
  `voice-notes` bucket missing and `online-users` Realtime authorization
  denied. A live read-only follow-up now finds the bucket, but no bucket access
  policies, audio-message columns, or Realtime authorization policies. It also
  confirmed an unsafe room-membership RLS overlap and no available physical
  backup in the CLI inventory; PITR is disabled. A live migration listing found
  28 local-only versions, four remote-only versions, and zero matching
  versions. This is a release blocker; no migration was applied.
- Local quality checks on the Lite checkout pass for typecheck, build, and all
  17 unit tests. The latest full ESLint run passes. These checks do
  not prove production integration, security, or cross-version synchronization.
- **Initial release-readiness estimate: ~25%.** This is a conservative estimate
  of verified release gates, not a measure of how much source code exists.

## Repository and branch state

| Item | Finding |
| --- | --- |
| Audit checkout | `lite-release`, HEAD `efdfd44` |
| GitHub default branch | `main`, HEAD `c6cf745` |
| Branch relationship | Same merge base; `lite-release` is 17 commits ahead of `main` |
| Remote branches | `main`, `lite-release`, `feature/echoes-of-ash-game`, `youssef890-afk-patch-1` |
| Tracked files in the local Lite checkout | 172 |
| GitHub Actions | One Pages deployment workflow; no workflow runs were found for `lite-release` |
| Additional Max repository | Not found in the bounded public-account search |

The local worktree already contains uncommitted `package.json` and
`package-lock.json` changes plus untracked `android/` and `capacitor.config.ts`.
They were preserved and not included in this audit's code changes.

## Execution kickoff

The user selected a new integration branch based on `lite-release`. The local
branch `integration/shared-platform` has been created at `efdfd44`, matching
`origin/lite-release`; it has not been pushed. The existing uncommitted package
changes, Android files, Capacitor config, and this report remain untouched.
`main` and `lite-release` have not been modified, and no deployment or database
changes have been made.

Read-only Vercel CLI inspection found two projects, `deep-signal3o` and
`deep-signal3o-bp3u`. In both projects the latest production deployment points
to `main`, while the latest preview deployment points to `lite-release`; this
does not establish separate Max and Lite deployments. The first project has 19
production environment-variable names and two preview names; the second has no
Vercel environment variables listed in either environment. Its environment
entries are encrypted, so their values could not be compared without exposing
them. Public JavaScript bundles from the first project's latest production and
preview deployments both reference the active `Deep-signal-db` project, which
verifies those two deployments share a backend. There is still no confirmed Max
production deployment.
The user designated `deep-signal3o` as the only approved project for now;
`deep-signal3o-bp3u` remains unapproved and untouched.

The Supabase CLI was run ephemerally. Its read-only project listing shows
`Deep-signal-db` (`vjaqkxeduzafbadsirte`) as `ACTIVE_HEALTHY` in `eu-west-1`;
other accessible projects are inactive. The remote migration ledger is now
confirmed to diverge from local history: 28 local-only versions, four
remote-only versions, and zero matches. Remote-only versions:
`20260910153013`, `20260910153047`, `20260920001050`, and `20261112174648`.
No schema dump has been produced. The later backup inventory returned no
physical backup entries and reported PITR disabled; no migration was applied.
An inactive project was considered as a staging candidate, but the user chose
to leave it inactive and continue local-only work. It has not been reactivated
or queried for data.

The first implementation slice adds `VITE_APP_FLAVOR` (`lite` by default,
`max` to expose the existing game routes and navigation). Feature availability
is presentation-only and does not replace authorization. No Vercel variables,
deployments, database schema, or production data were changed.

| Validation | Result |
| --- | --- |
| `npm test` | PASS — 17 tests, including default Lite, Max games, and invalid-flavor handling |
| `npm run typecheck` | PASS |
| `npm run build` (default Lite) | PASS |
| `VITE_APP_FLAVOR=max npm run build` | PASS |
| Targeted ESLint on changed TS/TSX files | PASS with one existing `MobileNav` ref-cleanup warning; no errors |

Files changed for this slice: `.env.example`, `package.json` (test selector
only), `src/App.tsx`, `src/components/MobileNav.tsx`,
`src/components/Sidebar.tsx`, `src/vite-env.d.ts`,
`src/lib/featureFlags.ts`, `src/lib/appFeatures.ts`, and
`tests/featureFlags.test.ts`, plus this report. Existing user changes in the
package dependencies, Android folder, and Capacitor config remain preserved.

The GitHub `main` package uses React 18 and Vite 5.4 and has no test script. The
Lite branch uses React 19 and Vite 8.3 and has a test script. Aligning or
explicitly supporting both toolchains is part of the integration work.

## Version and feature status

| Capability | Lite source | Max candidate / production evidence |
| --- | --- | --- |
| Auth and profiles | Supabase Auth and `profiles` are used in source. | `main` uses the same Supabase client pattern. The primary Vercel project's latest production (`main`) and preview (`lite-release`) bundles both point to the active Supabase project. A distinct Max production deployment is not confirmed. |
| Feed, posts, likes, comments, follows | Implemented in source against shared Supabase tables. | Present in both branches; end-to-end synchronization between deployed builds was not tested. |
| Direct messages | Text messaging uses `messages`; conversations are derived from message rows, not a separate conversation table. | Same source family. Two-account authorization and message-delivery tests remain outstanding. |
| Voice notes | Upload/playback code exists. | The bucket now exists as private, but production lacks `messages.message_type`, `audio_url`, and `audio_duration_ms`, and has no `voice-notes` Storage policies. Local repair migration remains unapplied. |
| Notifications | UI derives some activity from follows, profile views, likes, comments, and messages; browser notification preferences are local. | No durable central notification/read-state table was found in the 2026-11-15 database audit. |
| Privacy and settings | Some settings are stored in local storage and do not enforce database visibility. | Server-backed privacy behavior is not verified. |
| Reels and media | Reels code queries video posts; image lazy-loading, image compression, service-worker caching, and an offline feed snapshot provide partial Lite optimizations. No explicit data-saver mode was found. | Production schema/source differences require reconciliation. |
| Jokal AI | `src/lib/jokal/client.ts` calls Vercel `/api/chat`. A separate Supabase `jokal-chat` function and Jokal schema also exist, but the active client does not invoke that function or persist its chat through those tables. | Provider/configuration paths are duplicated. The local Vite proxy requires `DEEP_SIGNAL_VERCEL_DOMAIN`; it was absent from the local environment, so local `/api/chat` is not wired to Vercel. Production behavior was not tested. |
| Games | Game code remains in the source tree, but Lite has removed the main game routes. | `main` exposes `/games` and `/games/voice-card-clash`. Tic-tac-toe and Voice Card Clash logic exist; realtime game state/results are client-authored and are not suitable as trusted ranked/reward outcomes. |
| Game platform roadmap | No feature-flag system, game studio, matchmaking service, or authoritative game-result service was found at audit baseline. A `games` availability flag has now been added for the Lite/Max build contract. | Matchmaking and authoritative game results are future architecture work, not release-ready features. |

### Jokal wiring to resolve

There are two server paths today:

1. The active browser client calls Vercel's `/api/chat` endpoint in
   [`api/chat.js`](../api/chat.js), which reads Vercel environment variables and
   the `consume_jokal_ai_quota` RPC.
2. [`supabase/functions/jokal-chat/index.ts`](../supabase/functions/jokal-chat/index.ts)
   contains a separate provider-neutral function and database-backed proposal
   workflow.

The production database audit from 2026-11-15 did not find the Jokal
conversation/proposal tables. Before release, choose one supported path, verify
its secrets and quota RPC in staging, and test a real signed-in request. Do not
claim persisted Jokal conversations until the active client actually persists
them and the production schema supports them.

## Supabase and data-preservation assessment

The shared backend should remain the existing Supabase project unless a measured
technical blocker is found. Both builds can share `auth.users`, `profiles`,
posts, messages, and Storage by using the exact same project URL and public
client key; no user-table copy or duplicate account system is needed.

Important caveats:

- Equal environment-variable **names** do not prove equal values in Vercel.
  Public bundle inspection confirms that the primary project's latest
  production and preview builds use the same active Supabase project. The
  secondary project's purpose is unconfirmed and it remains unapproved.
- Supabase browser sessions are origin-scoped. The same account can sign in to
  both apps, but a session is not automatically shared across different domains.
  Seamless cross-domain sign-in needs an explicit SSO/session handoff design;
  never put a long-lived access token in a URL.
- The database audit dated 2026-11-15 found 13 application tables and four
  production migration-ledger versions, compared with 26 migrations on `main`
  and 28 on `lite-release` at the time of this inspection. The production ledger
  included remote-only history. The audit explicitly cautions against blindly
  running `supabase db push`.
- A live `supabase migration list --remote=vjaqkxeduzafbadsirte` on 2026-11-20
  reports 28 local-only versions, four remote-only versions, and zero matching
  versions. The remote-only versions are `20260910153013`, `20260910153047`,
  `20260920001050`, and `20261112174648`. Do not run `db push`, mark versions
  applied, or execute migrations until the remote schema and history have been
  reconciled.
- The remote `avatar_studio` SQL matches local
  `20261112120000_avatar_studio.sql` after whitespace normalization, despite
  the differing version. The two remote phase-1 migrations differ from their
  local counterparts. Remote-only `clear_test_data_keep_schema` contains
  `TRUNCATE ... RESTART IDENTITY CASCADE` and has no recorded rollback; never
  replay it. Production schema also differs from local SQL: `posts.media_urls`
  is `jsonb` remotely but `text[]` locally, and the live `rooms.capacity` is
  `integer DEFAULT 10` while the local migration defines a different type and
  default.
- The 2026-11-15 database audit reported no production
  `realtime.messages` RLS policy, and the browser later reported unauthorized
  access to `online-users`.

### Live database and client follow-up (read-only)

- The old feed request from the browser log was reproduced using a zero-result
  post ID filter, so no user posts were returned: PostgREST responded with
  `42703`, `column posts.audio_url does not exist`. The current `FeedPage`
  selection omits that nonexistent column and requests `media_urls`; the same
  zero-result probe returned HTTP 200. This verifies the root cause and the
  current query shape, not the live feed contents.
- Production `comments.user_id` and `posts.user_id` have foreign keys to
  `profiles.id`; the nested profile relationships are present. The old 400 is
  therefore specifically explained by `posts.audio_url`, not a missing
  comments/profile relationship.
- `messages` still lacks all three audio-message columns. The private
  `voice-notes` bucket exists, but no Storage policies grant access to it.
  `realtime.messages` has RLS enabled but no policies, consistent with the
  `online-users` authorization failure. The local voice/presence repair has
  not been applied.
- `room_members` has two permissive INSERT policies. The stricter policy checks
  self-membership, active room, and capacity; the second policy checks only
  `auth.uid() = user_id`. PostgreSQL combines permissive policies with OR, so
  the weaker policy bypasses the active/capacity checks. No membership trigger
  or role constraint exists remotely; only a room-host trigger was found.
  Authenticated users can therefore self-join inactive/full rooms and choose
  `role='owner'`. Treat as a critical authorization issue. Local capacity
  enforcement is not evidence that production is protected.
- The `messages` update grant is narrower than the 2026-11-15 report implied:
  `authenticated` can update `read_at` but not `content`; `anon` cannot update
  `read_at`. Two-account behavior remains untested.
- Supabase CLI backup inventory returned no physical backup entries and
  `pitr_enabled=false` (`walg_enabled=true` alone is not a verified restore
  point). No backup or restore was created or run. Supabase database backups
  do not include Storage object bytes; database and object recovery need
  separate procedures.

### Feature and homepage review

The current `VITE_APP_FLAVOR` flag gates the game routes and game navigation:
Lite is the default, Max enables games. It is build-time presentation gating,
not server authorization or a complete feature registry. The exact current
feed request passes the no-row PostgREST probe above. A visual comparison
against the design reference remains blocked because no reference image or URL
was provided and the local browser session is unauthenticated, so it redirects
to login. Cross-build account/data synchronization also remains untested.

### Safe no-loss sequence

1. Freeze production schema changes until the remote migration ledger and
   remote-only migrations have been reviewed.
2. Before any migration, establish a recoverable backup. Current CLI inventory
   has no physical backup and PITR is disabled. Confirm the plan/tier, create
   an encrypted database backup and a separate Storage object backup with a
   key/hash manifest, and keep both outside the repository. Record schema,
   table counts, bucket policies, and object inventory without copying user
   content into reports. Database backups alone do not restore Storage files.
   Supabase's [backup guidance](https://supabase.com/docs/guides/platform/backups)
   also warns that PITR restore replaces the database state and causes
   downtime; perform restore drills only against an isolated staging project.
3. Restore/clone into staging. Reconcile the migration ledger to the actual
   schema; do not mark migrations applied or re-run SQL until each operation is
   checked against production state.
4. Apply additive repairs in staging. Test existing user IDs, RLS, Storage
   ownership, Realtime topics, AI quota, and two-account interactions.
5. Promote the same reviewed migration set to production with a snapshot and
   rollback plan. Database rollback and object-storage restore are separate
   operations.
6. Point Lite and Max deployments at that one project. Verify account ID and
   data visibility in both directions before public release.

## Proposed unified architecture

```text
Deep-Signal Lite (web / Android) ──┐
                                   ├── shared TypeScript client and domain
Deep-Signal Max (web / Android) ───┘        │
                                            ├── Supabase Auth (one user ID)
                                            ├── Postgres + one migration stream + RLS
                                            ├── Storage buckets + owner/participant policies
                                            ├── Realtime with topic authorization
                                            └── Edge/API functions + quotas

                 Vercel: static SPA builds, previews, and current /api functions
```

Recommended implementation shape:

- Keep one canonical application source and one migration sequence. Build Lite
  and Max from that source with a typed `app_flavor`/feature registry.
- Use flags for presentation and product availability, not authorization.
  Every privileged action still requires server-side authorization, RLS, and
  validated RPC/Edge Function checks.
- Keep core social schemas identical for both variants. Avoid variant-specific
  user tables or data silos.
- Use Supabase for the shared backend. Store media references as object keys
  where practical so a future object-storage move does not require rewriting
  social records.
- Keep game transport separate from game authority: Realtime may distribute
  events, but validated server-side state transitions must own scores, rewards,
  achievements, and matchmaking.

## Initial security and release risks

These are source/catalog findings and production logs, not a completed
penetration test.

| Severity | Risk | Evidence and state |
| --- | --- | --- |
| Critical | `close_stale_rooms(interval)` remains a `SECURITY DEFINER` routine executable by `PUBLIC`/`anon`, with a caller-controlled interval and membership deletion. | Confirmed in the live catalog follow-up. Local corrections are unapplied; release blocker. |
| Critical | Permissive `room_members` INSERT policies combine with OR and allow bypassing room activity/capacity checks; no membership trigger or role constraint exists remotely. | Confirmed live. An authenticated user can self-join inactive/full rooms and set `role='owner'`; no production change made. |
| High | Production Storage upload policies were reported to allow authenticated uploads to paths not proven to belong to the caller. The `posts` bucket had no size/MIME limits in the audit. | Owner-path fixes are prepared locally; staging and production policy behavior are not tested. |
| High | Voice-note upload and playback are not usable end-to-end. | Bucket exists but lacks Storage policies, and `messages` lacks the audio columns; local repair is unapplied. |
| High | Realtime channel authorization is broken or missing. | No production `realtime.messages` policies; browser logs report unauthorized access to `online-users`. |
| High | Migration ledger and source schema diverge. | Production audit says the histories do not match. Blind migration push could fail or alter an unexpected schema. |
| High | No recoverable backup was visible in the CLI inventory. | `backups: []`, PITR disabled. Do not perform schema changes until a verified backup and restore path exist. |
| High | Game state/scores are client-authoritative. | Do not grant trusted points, rewards, or ranked status from client-authored realtime snapshots. |
| Medium | Privacy settings are device-local; no durable notifications table/read state was found. | User-facing controls may promise behavior the server does not enforce. |
| Medium | CSP is `Report-Only` in `vercel.json`; no CSP violation report or deployed-header verification was performed. | Enforce only after measuring and correcting legitimate policy violations. |
| Medium | Login sessions use browser storage and are not shared across origins by default. | Same account identity is possible, but seamless SSO is a separate requirement. |
| Medium | Jokal has duplicate Vercel and Supabase function paths and environment-variable boundaries. | Local Vite warns that `DEEP_SIGNAL_VERCEL_DOMAIN` is unset; runtime integration needs staging tests. |

### Environment-variable review

No environment values were printed or added to source. The ignored local
`.env` was read in-process only to send a read-only PostgREST request using the
public Supabase URL/key and a guaranteed-empty post ID filter; no post rows or
key values were logged.

- Browser configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  optional `VITE_LIVEKIT_URL`. The anon/publishable key is public by design.
- Vercel runtime code references `GEMINI_API_KEY`, `OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, provider model names, and
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` (with `VITE_*` fallbacks).
- Supabase Edge Functions reference `SUPABASE_SERVICE_ROLE_KEY`,
  `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, AI provider keys, avatar provider
  keys, `ALLOWED_ORIGINS`, Jokal settings, and AI quota/cost settings. Service
  role and provider keys must remain server-side.

The current `.env.example` documents Edge Function secrets, but does not clearly
separate all Vercel `/api/*` runtime variables from Supabase Edge Function
secrets. Correct that documentation and deployment configuration together.

No service-role or provider key value is included in this report.

## Hosting comparison

**Official pricing pages checked 2026-11-20.** Prices are public list prices,
not a traffic-specific quote; region, usage, media egress, builds, and add-ons
change the total.

| Option | Fit and pricing shape | Assessment for Deep-Signal |
| --- | --- | --- |
| [Vercel](https://vercel.com/pricing) | Hobby $0; Pro starts at $20/month, with metered usage beyond included quotas. Vite static hosting, CDN, previews, and serverless functions fit the current layout. | **Keep for now.** Lowest-risk because the repository already has Vercel config and `/api` functions. Verify account plan, production env, usage, and actual deployment first. |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) + [R2](https://developers.cloudflare.com/r2/pricing/) | Workers Paid starts at $5/month and includes 10M requests/30M CPU-ms; R2 is $0.015/GB-month with operation charges and no internet egress fee. | Candidate for measured high media-egress costs. It is not a reason to migrate the database; it adds object-storage integration and backup work. |
| [AWS Amplify](https://aws.amazon.com/amplify/pricing/) | Pay-as-you-go hosting; backend typically composes Lambda, S3, CloudFront and other separately priced services. | Scales well and has broad controls, but adds configuration/operational work and multiple billing meters. Not the first move for the current static SPA. |
| [Firebase Hosting](https://firebase.google.com/pricing/) / [Google Cloud Run](https://cloud.google.com/run/pricing) | Firebase lists 10 GB hosting storage and 360 MB/day transfer in its no-cost allowance; Cloud Run is metered by region/resources. | Viable if a container/serverless Google backend becomes a requirement; replacing Supabase Auth/Realtime/Storage is a separate migration. |
| [Supabase](https://supabase.com/pricing) | Backend, not the Vite SPA host. Free is $0 with limits; Pro starts at $25/month. Pro database backups have 7-day retention; Storage objects are not included in database backups. | **Keep as shared backend** while proving and repairing the current schema. Confirm actual plan and add a separate object backup/restore procedure. |
| [Netlify](https://www.netlify.com/pricing/) | Static SPA hosting and Functions use a credit-based plan; listed entry plans start free, Personal $9/month, Pro $20/month. | Possible Vercel alternative, but no compelling migration benefit before usage data exists. |

**Recommendation:** retain Vercel for SPA/API and the current Supabase project for
Auth/Postgres/Realtime/Edge Functions. Do not migrate the database now. Measure
monthly API invocations/duration, database size and traffic, media GB egress,
Storage growth/operations, and backup requirements before comparing real bills.
If media egress becomes the dominant cost, evaluate moving only media delivery
to R2 with a staged object-copy, checksum, URL/metadata, and rollback plan.

## Twelve-day launch plan

Plan starts 2026-11-21 and ends 2026-12-02. It is conditional: unresolved
production schema/security blockers mean the release must move, not bypass the
gates.

| Day | Date | Work and exit evidence |
| --- | --- | --- |
| 1 | Nov 21 | Confirm Vercel/Supabase project ownership, deployment settings, test accounts, backup tier, and recovery objective. Produce a production schema/ledger snapshot. |
| 2 | Nov 22 | Reconcile local/remote migration histories; inspect remote-only migrations; restore a staging copy. No blind `db push`. |
| 3 | Nov 23 | Define canonical source/branch and variant build contract; centralize feature registry and prove both builds use one Supabase project in staging. |
| 4 | Nov 24 | Test signup/sign-in/profile identity, then cross-variant post, comment, like, follow, and profile update with two accounts. |
| 5 | Nov 25 | Repair and test message, voice-note bucket, media upload/playback, Storage ownership, Realtime presence, and channel authorization. |
| 6 | Nov 26 | Select and verify one Jokal endpoint; test auth, quota, provider configuration, persistence expectations, and failure handling in staging. |
| 7 | Nov 27 | Preserve Max games behind flags; specify server-authoritative game/score seams. Test Lite data-saving behavior and mobile layouts. |
| 8 | Nov 28 | Regression-test core pages and both builds; measure bundle/network performance; produce release candidate and unresolved-issue list. |
| 9 | Nov 29 | Authorized staging security tests for Auth, user isolation, RLS, profile privacy, and service-role boundaries. Record evidence and results. |
| 10 | Nov 30 | Test Storage paths/MIME/size, Realtime topics, API validation/rate limits, session behavior, CORS, and CSP; remediate critical/high findings. |
| 11 | Dec 1 | Perform database and object restore drills, release rollback rehearsal, dependency/secret review, and two-account end-to-end tests. |
| 12 | Dec 2 | Canary release, monitor errors/usage, verify rollback readiness, then proceed only if all release gates pass. Otherwise delay launch. |

Daily reports should state: completed work, changed files, fixed issues, tests
run/results, blockers, evidence-based progress, and risks. Day 0 is this report.
Execution has started with the user's branch decision, creation of the local
integration branch, read-only Vercel configuration inspection, and the first
feature-flag implementation slice. Production/staging changes have not started.
The next release work remains gated on identifying the intended variant
deployments, verifying Supabase project ownership and a recoverable backup
plan, and establishing a safe staging database. Production migration work is
blocked by the confirmed ledger divergence.

## Checks run for this report

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 17 tests, 0 failures |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `VITE_APP_FLAVOR=max npm run build` | PASS — verified separately |
| GitHub Actions for `lite-release` | No workflow runs found |
| Vercel project/deployment inspection | READ-ONLY PASS — two projects found; both latest production deployments point to `main`, both previews to `lite-release` |
| Vercel environment-variable review | READ-ONLY — primary project has 19 production names and 2 preview names; secondary project has none listed; encrypted values were not exposed |
| Vercel public bundle inspection | PASS — primary production and preview bundles both reference the active Supabase project; no project URL or anon key printed |
| Supabase project and migration listing | PASS — active project confirmed; 28 local-only, 4 remote-only, and 0 matching migration versions |
| Active production catalog and backup inventory | READ-ONLY PASS — `backups: []`, PITR disabled; no data backup or restore performed |
| PostgREST feed select | PASS for current query shape (HTTP 200, zero rows with a guaranteed-empty ID filter); old query reproduced HTTP 400 / `42703` for missing `posts.audio_url` |
| Two-account/Auth/RLS/Storage/Realtime integration tests | NOT RUN |
| Production schema/migration change | NOT RUN |
| Security penetration test | NOT RUN |
| Traffic/load/performance test | NOT RUN |
| Backup/restore drill | NOT RUN |

## Current follow-up stage

| Workstream | Completed | Remaining / gate |
| --- | --- | --- |
| Migration reconciliation | Read-only comparison completed; remote scripts and schema/type differences documented. | Reconcile ledger from a reviewed schema dump; do not `db push` or mark versions applied. |
| Backup and recovery | CLI inventory checked; database and Storage need separate backups; recovery procedure documented above. | No physical backup was listed and PITR is disabled. Establish an approved backup destination and complete a staging restore drill. |
| Database/RLS | Schema, grants, policies, functions, Storage, and Realtime were inspected. | Fix `close_stale_rooms`, room membership policy overlap, and missing audio/Realtime authorization in staging, then test. |
| Lite/Max flags | Build-time `lite`/`max` switch gates existing games and navigation; unit tests pass. | Broaden only when feature requirements are known; never use client flags as authorization. |
| Account/data sync | Primary Vercel `main` production and `lite-release` preview bundles were previously verified to use the same Supabase project. | This does not confirm a distinct Max deployment; no authenticated two-account or cross-build write/read test was run. |
| Main UI | Current feed query passes the empty-result PostgREST probe; old request's missing column was identified. Two local reference PNGs were reviewed, the homepage was visually updated, and authenticated mobile/desktop screenshots were captured. | Physical Android-device validation remains pending. |
| Voice notes/presence | Current production state and missing columns/policies were confirmed. | No fix applied because production changes are prohibited and no active staging project is available. |

### Homepage visual pass (local only)

The user supplied two local PNG references and approved a combined direction.
The homepage now has a wider, more balanced desktop grid; clearer heading and
spacing hierarchy; a more prominent account composer; a desktop search field;
and consistent rounded, violet-accented feed cards. Media uses a portrait
mobile ratio and a landscape desktop ratio. Existing Supabase reads and post
actions were preserved. The member carousel still uses real profile rows; it
is intentionally not presented as Stories because no Stories schema or
content source exists.

The authenticated local feed rendered real existing posts and profile images
in the browser. At 390×844 mobile and 1440×1000 desktop viewports there was no
horizontal overflow; the mobile bottom navigation appeared on mobile and the
desktop sidebar appeared at desktop width. All six observed feed images loaded.
Actual Android hardware was not available, so this is responsive browser
emulation, not a physical-device test. Desktop and mobile screenshots were
captured in the session.

No page-level or component console errors were emitted during an additional
8-second observation. Earlier in the same authenticated session, Supabase
Realtime still logged the known `online-users` authorization denial and
timeouts; the production policies are absent and were not changed. Some
Supabase `HEAD` read-status requests were reported as aborted during page
refreshes. No post, message, like, or other user data was written by this
visual review.

| Validation | Result |
| --- | --- |
| `npm test` | PASS — 17 tests |
| `npm run typecheck` | PASS |
| `npm run build` (Lite) | PASS |
| `VITE_APP_FLAVOR=max npm run build` | PASS |
| Targeted ESLint on `FeedPage.tsx`, `Navbar.tsx`, and `PostCard.tsx` | PASS |
| Full ESLint with `--no-warn-ignored` | BLOCKED by generated `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js`, which contains an unknown ESLint rule directive; generated Android output was left untouched |

**Release status: NOT READY.** The current evidence supports continuing into
staging and schema reconciliation, not a public launch. No claim of passing
production security or synchronization tests is made.
