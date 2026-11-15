# Deep Signal V1 release checklist

Audit date: 2026-11-15.

## Release blockers

- [ ] Reconcile the 26 local migration versions with the four production ledger entries. Review the remote-only `clear_test_data_keep_schema` migration before any push.
- [ ] Produce and review a schema-only dump and a verified migration plan; do not push the pending chain as-is.
- [ ] Apply and validate the pending schema in a staging Supabase project first.
- [ ] Harden `close_stale_rooms` and Storage object path policies using the prepared migration.
- [ ] Create/validate the private `voice-notes` bucket and message audio columns.
- [ ] Resolve app/database naming mismatches (`saved_posts` vs `post_bookmarks`; missing `profile_views`, `user_blocks`, `content_reports`, game tables/RPCs, and Jokal persistence tables).
- [ ] Add server-authoritative match state, move validation, idempotency, and verified result persistence before advertising ranked/secure multiplayer.
- [ ] Persist Zombie progress and Echoes of Ash saves to user accounts if cross-device progression is required.
- [ ] Implement server-backed privacy controls and durable notifications or remove unsupported controls from release scope.
- [ ] Test RLS, Storage ownership, Realtime, messaging, and games using two distinct test accounts.
- [ ] Run database tests, offline tests, and browser/mobile playthroughs after staging migration.

## Current status

**Not ready for production release.** The production schema and local migrations do not match; several operations target absent tables/buckets/functions; RLS/Realtime and two-account behavior have not been integration-tested; and game results are client-authoritative or local-only.

## Checks already recorded

- [x] Read-only production catalog audit completed.
- [x] No remote migration or data change performed.
- [x] `npm test` (14 pass), `npm run typecheck`, `npm run lint`, and `npm run build` pass; build warns that the Echoes of Ash chunk exceeds 500 kB.
- [ ] Release gates above remain open.
