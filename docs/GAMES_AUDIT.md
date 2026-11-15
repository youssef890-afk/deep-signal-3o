# Games audit and fixes

Review date: 2026-11-15. This report describes the local `feature/echoes-of-ash-game` checkout.

## Game inventory

| Game | Current implementation | Verification status |
| --- | --- | --- |
| Advanced Tic-Tac-Toe | 3x3/4x4/5x5 local play, unbeatable minimax AI for 3x3, and invite-code multiplayer over Supabase Realtime | Core rules now have unit coverage; authenticated two-browser realtime is not integration-tested |
| Voice Card Clash | Realtime multiplayer card game with bids, 3-card hands, trick scoring, 50-point match end, timeout defaults | Turn/bid/card rules are client logic; follow-suit is now enforced and unit-tested; Supabase multi-client flow is not integration-tested |
| Echoes of Ash | Three.js single-player story/action game with chapter choices and local save | Static/build inspected; WebGL rendering, controls, and story completion need device/browser playthrough |
| Zombie: Last Stand | Standalone canvas survival game embedded by an iframe | Static/build inspected; touch controls, persistence, and full playthrough need device/browser playthrough |

## Fixes in this change

- Fixed Tic-Tac-Toe minimax to maximize the AI's outcomes instead of minimizing them. AI now takes immediate wins and blocks immediate losses.
- Extracted Tic-Tac-Toe win/snapshot rules into a pure module so game-rule tests use the same code as the page.
- Added bounds and terminal-state checks to incoming multiplayer moves; guest clients only render validated host-state snapshots.
- Cancelled pending AI turns when the page unmounts or the player resets, and guard delayed moves against applying to a changed board.
- Enforced following the lead suit in Voice Card Clash whenever the player has that suit, with a visible rule hint.
- Added game logic tests for Tic-Tac-Toe wins, AI tactics, online snapshot validation, and Voice Card Clash follow-suit rules.

## Remaining risks

- The Realtime Tic-Tac-Toe room code is ephemeral and does not persist match history. Its existing Realtime channel policy allows authenticated callers to access any syntactically valid `ttt:` topic. Frontend checks improve consistency but do not make a client-authoritative room cheat-proof. A secure competitive mode needs server-verified room membership and atomic server-side moves; no production schema or RPC was added here.
- Voice Card Clash game state and scoring are maintained by its clients. Do not treat results as ranked or trusted until the transition is moved behind a server-authoritative RPC/Edge Function and tested against concurrent requests.
- Zombie game has no durable save/resume and game results are not server-verified.
- Echoes of Ash saves story progress locally, but browser storage can be cleared and its combat results are not synced to the account.
- The browser has not been driven through all game screens or tested across the requested mobile viewport sizes in this change.
- There is no end-to-end coverage for offline recovery, two-player reconnection, auth expiry, or deployed RLS/Realtime configuration.

## Production database audit update — 2026-11-15

- The linked production database contains `voice_card_clash_rooms` and `voice_card_clash_players`, but no `game_scores`, `game_matches`, or game-progress table. The `get_my_game_stats` RPC and verified score policy are also absent remotely.
- Production Voice Card Clash room creation exposes only `create_voice_card_clash_room(target_code)`, while the current client sends a team-size argument. The room table also has no team-size field, so variable team sizes are not compatible with the audited production schema.
- Tic-Tac-Toe and Voice Card Clash still exchange client-authored Realtime state; remote database tables do not hold authoritative move state/results. A malicious client can influence snapshots and results.
- Echoes of Ash progress is browser-local. The Zombie iframe has no save/load or Supabase integration.
- The remote migration ledger does not include the local game-score, Realtime authorization, or verified-score migrations. Do not advertise synchronized progress, ranked scores, or secure multiplayer as production-ready.

## Checks run for this change

- `npm test`: PASS, 14 tests across application form validation, Tic-Tac-Toe logic, and Voice Card Clash card legality.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS. Vite reports the Echoes of Ash game chunk is about 537 kB minified (about 141 kB gzip), above its default 500 kB warning threshold.
- `git diff --check` on the game logic and test files: PASS. The working tree already contains unrelated edits to app/navigation files with line-ending whitespace; those files were not normalized or changed for this game task.

Passing these checks verifies compilation and selected game rules, not the full interactive or multiplayer release criteria.
