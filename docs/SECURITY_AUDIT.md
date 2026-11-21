# Deep Signal security audit

Original audit: 2026-11-15. Live follow-up: 2026-11-20. This report is based
on local source and read-only production catalog inspection. No secrets or
application row contents were displayed.

## Live follow-up (2026-11-20)

No production changes or authenticated-user probes were made.

- `close_stale_rooms(interval)` remains a `SECURITY DEFINER` routine executable
  by `PUBLIC`/`anon`, with a caller-controlled interval and membership
  deletion.
- Two permissive `room_members` INSERT policies combine with OR. One checks
  only `auth.uid() = user_id`, bypassing the other policy's active-room and
  capacity checks. No membership trigger or role check constraint exists.
  Authenticated users can self-join inactive/full rooms and set
  `role='owner'`. Critical authorization flaw; no production fix applied.
- `messages` lacks the three audio-message columns used by the client.
  `voice-notes` now exists as a private bucket but has no object policies.
  `realtime.messages` has no policies, matching the `online-users`
  authorization failure.
- The migration ledger is 28 local-only versions, four remote-only versions,
  and zero matching versions. Remote `clear_test_data_keep_schema` contains a
  destructive `TRUNCATE ... RESTART IDENTITY CASCADE` and no recorded
  rollback.
- The backup CLI inventory returned no physical backup entries and reported
  PITR disabled. A usable recovery point is not verified; database backups
  also do not include Storage object bytes.
- The old feed query's 400 was reproduced as missing `posts.audio_url`
  (`42703`). The current FeedPage request omits that field and passes a
  no-result PostgREST probe (HTTP 200). This is an integration check of the
  query shape, not a penetration test.

## Findings

| Severity | Finding | Evidence / impact | Status |
| --- | --- | --- | --- |
| Critical | Anonymous callers can execute `close_stale_rooms(interval)` | Live catalog confirms the `SECURITY DEFINER` function accepts a caller-selected stale threshold, closes rooms, and deletes `room_members`; EXECUTE is granted to `PUBLIC` and `anon`. | Local corrections prepared; not applied. |
| Critical | Authenticated users can bypass room activity/capacity checks | Permissive `room_members` INSERT policies combine with OR; the weaker policy checks only self-membership. No membership trigger or role constraint exists. | Confirmed live; no production change. |
| High | Authenticated users can upload to other users' Storage paths | Production upload policies check only bucket ID, not `auth.uid()` against the first path segment. | Owner-path policies prepared; not applied. |
| High | Production migration history does not match the checkout | 28 local-only versions, four remote-only versions, and zero matching versions; live schema also differs from local types/defaults. | Must reconcile before migrations or release. |
| High | Private Realtime authorization is absent in production metadata | No policy rows were found for `realtime.messages`; local authorization migration is pending remotely. | Two-account and channel tests remain blocked. |
| High | Voice-note path is incomplete in production | Audio columns are absent and the private bucket has no `storage.objects` policies. | Local repair is unapplied; signed-in upload/playback not tested. |
| High | No recoverable backup is verified | CLI reports no physical backups and PITR disabled; Storage object bytes need a separate backup. | No backup/restore drill performed; migration work remains blocked. |
| High | Client-authoritative game moves and results | Tic-Tac-Toe and Voice Card Clash exchange client-authored state over Realtime; no production match/result tables or trusted scoring RPC exist. | Not safe for ranked or trusted results. |
| Medium | Public post uploads have no server-side size or MIME limit | `posts` bucket has no size or MIME restriction. | Keep current accepted media types; agree on limits before enforcement. |
| Medium | Privacy settings do not enforce database privacy | Settings persist locally; public profile/posts policies remain unchanged. | User-facing privacy controls are not effective server-side. |
| Medium | Broad table grants rely heavily on RLS | `anon` has effective table privileges for most public tables, and policies include duplicate `public` entries. | Least-privilege grant/policy cleanup needs compatibility testing. |

## Secret handling

No private environment value was printed or added to source. The local
`.env` was read in-process solely to issue one read-only PostgREST request
using the public Supabase URL/key and a guaranteed-empty post ID filter; no key
values or post rows were logged. No service-role key was used or referenced in
frontend source during this review.

## Not verified

No authenticated test account was available to run authenticated API probes, a two-user message test, or deployed RLS tests. One anonymous PostgREST schema/query probe used a guaranteed-empty post ID filter and returned no user rows. The SQL inspection was read-only and did not impersonate accounts. No claim that RLS passes adversarial tests is made.

## Additional source review and changes (2026-11-15)

| Severity | Finding | Change / status | Verification |
| --- | --- | --- | --- |
| Medium | Supabase Edge Functions used wildcard CORS, including the LiveKit token endpoint. | Replaced wildcard behavior with an exact origin allowlist. Default is `https://youssef-app.vercel.app`; set `ALLOWED_ORIGINS` to the production origin(s) in Supabase Function secrets when using a custom domain or preview domain. Unlisted browser origins receive 403. | Source reviewed; production preflight and alternate-origin probes not run. |
| Medium | Deployment headers lacked HSTS and a Content Security Policy. | Added HSTS, CSP, and retained the existing frame, MIME, referrer, and permissions policies in `vercel.json`. | Production build passed; deployed response headers and browser CSP reports not observed. |
| Medium | `posts` Storage bucket has no server-side MIME or size limit. | Unchanged pending a product decision on accepted formats and maximum upload sizes. Browser-side MIME checks alone are not security enforcement. | Not fixed or tested against Storage. |
| Medium | Per-IP rate limits and suspicious-login alerting are not implemented in this repository. | AI endpoints have account/quota checks and Supabase Auth supplies managed auth throttling, but there is no local per-IP limiter or failed-login alerting. | No abuse/load test or alert integration test. |
| Low | No dedicated admin route was found; moderator UI visibility uses `app_metadata`. | No client-only admin page was identified. Database authorization still depends on production RLS and was not behavior-tested in this audit. | Static source review only. |
| Informational | No payment provider or payment flow was found in the repository. | No payment-price or webhook verification surface to assess. | Static source review only. |

## Secrets and browser exposure

The tracked environment template documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as public browser configuration. Provider credentials are read from server-side environment variables or Supabase Function secrets. `.env` and `.env.local` are ignored by Git; only `.env.example` is tracked. A history scan found no matches for common private-key, AWS, GitHub-token, or OpenAI-key formats. This was a targeted pattern scan, not a Gitleaks/TruffleHog certification. No credential values are included in this report.

## Other checklist items

- Authentication and password hashing are delegated to Supabase Auth; the application stores tokens in browser storage, not an HttpOnly cookie. Logout calls `supabase.auth.signOut()`.
- Server-side authorization and data ownership depend on Supabase RLS. Critical production policy gaps and migration-ledger divergence are listed above and remain unresolved until migrations are reconciled and separately approved.
- Source review found no `innerHTML` or `dangerouslySetInnerHTML` usage. Database access uses the Supabase query builder/RPC interface; no raw SQL string concatenation was found in app source.
- Password reset uses Supabase recovery OTPs. Expiry and single-use behavior are managed by Supabase project settings and were not verified from this checkout.
- HTTPS redirection is provided by the deployment platform; HSTS is now configured in `vercel.json`. The deployed redirect/header behavior remains unverified.
- `npm audit` reported zero known dependency vulnerabilities. No obviously unused direct dependency was identified by source-reference review; no package was removed.
- No payment implementation, dedicated administrator pages, or exposed backup/database dump was found in tracked app/public files.
