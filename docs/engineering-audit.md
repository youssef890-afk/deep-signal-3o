# Deep-Signal engineering audit

Audit snapshot: 2026-11-13, local checkout at `c6cf745` (`main`). This report reflects the source and migrations inspected in this checkout. It does not claim that the remote GitHub repository, Supabase project, or deployment has the same state.

## Existing functionality

- Vite 5, React 18, strict TypeScript, React Router, Tailwind, and shared dark design tokens.
- Supabase Auth, user profiles, social feed, likes, comments, bookmarks, follows, search/discovery, Reels, direct messaging, voice notes, blocking, and reports.
- Social voice rooms use WebRTC; Voice Card Clash uses LiveKit token issuance from an Edge Function.
- Tic-tac-toe supports local play and Realtime room synchronization. Game score inserts are restricted and verified server-side by the latest migration.
- Jokal has a provider abstraction, authenticated Edge Function path, quota reservation/finalization, conversation persistence, proposal validation, and explicit database approval before a project can be created.
- Avatar onboarding/studio and route-level code splitting are present.
- Supabase migrations cover profiles/content, room policies, user safety, AI quota, avatar flows, Realtime topic authorization, bookmarks, and score verification.
- Vercel is configured for Vite SPA rewrites, immutable hashed assets, service-worker revalidation, and baseline response headers.
- The Open Source Application Assistant is now a client-only, session-memory form preparation workflow. It provides editable answers, field copy, a preview, a completeness checklist, a license check, a reset action, and a link to the official application. It does not submit or auto-fill the external form.

## Incomplete or planned

- Jokal is a proposal assistant, not an autonomous project/game generator. The game creation workspace, template prototype builder, versioning, export, and sandbox are not present.
- Marketplace, orders/payments, productivity tasks/calendar/reminders, moderation console, and owner-facing application profile storage are not implemented.
- Social rooms rely on public STUN; TURN-backed connectivity and recovery need production validation. Some room controls are described in the UI as placeholders.
- The repository has no configured automated test runner or test files. The README also records this.
- Terms and privacy pages are temporary placeholders. Replace them with reviewed policy text before public launch.
- A root license file was not found in this checkout. Verify the public repository and add the intended license before claiming open-source eligibility.

## Security review notes

- Positive controls: browser config uses only Supabase URL/anon key; provider and LiveKit credentials are documented as Edge Function secrets. Jokal requires an authenticated caller and reserves quota server-side. Sensitive AI usage RPCs are restricted to `service_role`. Migrations add RLS and narrow profile column grants, private Realtime topic checks, and verified-score read/write controls.
- The `can_access_deep_signal_realtime_topic` migration allows any authenticated user to select the global `online-users` and `active-rooms-list` topics. Confirm payloads contain only intentionally public presence/room summaries.
- Jokal's configured-origin fallback is `*` when `ALLOWED_ORIGINS` is unset. Authentication is still required, but production deployments should set an explicit origin allowlist and review every Edge Function's CORS behavior.
- The client has many direct Supabase queries. A full policy-by-policy audit against every query and deployed schema was not possible from source inspection alone; verify the deployed migration state and run authenticated/unauthenticated policy tests before launch.
- Account deletion and durable message deletion workflows were not found during this pass. Confirm legal retention requirements and implement server-mediated deletion where required.
- Upload validation, storage bucket visibility, and private message/voice-note access need end-to-end checks against the deployed Supabase project.
- Never infer that `.env` files are safe to share. They were not printed or included in this report.

## Performance and maintainability

- Route-level lazy loading is already in place. Feed and profile paths still make several independent Supabase requests and should be measured with realistic data before adding more client-side joins or caching.
- The application currently has no test harness; introducing one should start with pure validation/game logic, then add component and authorization coverage.
- Several features depend on realtime payload handling in the browser. Server authorization protects topic access, but the current tic-tac-toe broadcast state is client-authored and should not be treated as an anti-cheat authoritative match result.
- Dependency versions are declared in `package.json` and lockfile. Run a dependency/security review in the project's normal CI before release.

## Database recommendations

1. Verify every migration has been applied to the linked Supabase project; the repository's local `.temp` metadata is not proof of deployed state.
2. Add integration checks that assert RLS for profiles, DMs, voice notes, storage, Jokal conversations/proposals/projects, room membership, and reports.
3. Keep score and any competitive match outcome server-verified. Realtime Broadcast should remain transport only for authoritative games.
4. Add schema only when implementing a concrete module. Use owner foreign keys, constraints, indexes, RLS, and deletion behavior in the same migration.

## Recommended implementation order

1. Reconcile TypeScript/build quality gates and add focused automated tests.
2. Verify deployed Supabase migrations and RLS/storage policies, then close any production security gaps.
3. Complete high-use existing flows: message read state, upload limits, room reconnection, and verified game lifecycle.
4. Build the template-based Game Creation Studio MVP, with validated structured specs and isolated preview execution.
5. Add productivity tasks, then marketplace catalog foundations; do not activate payments until a provider is configured and tested.
6. Extend the application preparation assistant only after the official form requirements are re-verified. Keep private application fields local unless the owner explicitly chooses otherwise.

## Quality gate results after this change

- `npm run lint`: passed.
- `npm run typecheck`: passed after fixing a nullable image source in `src/components/PostCard.tsx`.
- `npm run build`: passed after allowing Vite/esbuild to spawn outside the restricted process sandbox.
- `npm test`: focused Node built-in tests cover application validation and answer formatting. This does not provide social, AI, game sync, database policy, or browser end-to-end coverage.
- Node.js 22.6+ is required by the test script's built-in TypeScript stripping flag.
