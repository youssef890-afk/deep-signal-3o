# Deep Signal test report

Run date: 2026-11-15.

## Local checks

| Command | Result | Detail |
| --- | --- | --- |
| `npm test` | PASS | 14 tests passed; 0 failed. Includes Tic-Tac-Toe and Voice Card Clash rule coverage. |
| `npm run typecheck` | PASS | TypeScript completed with no diagnostics. |
| `npm run lint` | PASS | ESLint completed with no diagnostics. |
| `npm run build` | PASS | Production build completed. Echoes of Ash chunk is 537.36 kB minified (140.63 kB gzip), above Vite's 500 kB warning threshold. |

The first sandboxed test/build attempts failed with `spawn EPERM`; rerunning with the execution permission needed for Node workers and esbuild succeeded. `git diff --check` reports trailing whitespace on previously modified lines in `src/App.tsx`; those existing changes were preserved.

This audit did not apply migrations, write test rows, use service-role credentials, or run tests against production data.

## Database / integration checks

| Check | Result | Reason |
| --- | --- | --- |
| Remote schema catalog inspection | PASS, read-only | Tables, columns, constraints, indexes, policies, grants, Realtime publication/RLS, Storage buckets, functions, and migration ledger were queried. |
| RLS policy behavior | NOT RUN | No test JWTs or separate test accounts; catalog inspection is not a substitute for API-level RLS tests. |
| Two-account messaging | NOT RUN | No test accounts available; voice-note schema/bucket are missing remotely and Realtime authorization is not present in catalog. |
| Realtime subscription / broadcast | NOT RUN | Requires authenticated clients; production `realtime.messages` has no policies in inspected metadata. |
| Storage upload/read authorization | NOT RUN | No authenticated test clients; broad owner-path upload policies were found in metadata. |
| Database migrations | NOT APPLIED | User explicitly prohibited remote DB changes without approval; ledger also diverges from repository. |
| Offline recovery | NOT RUN | No browser/device test environment exercised in this audit. |

## Release interpretation

Passing unit/build checks do not establish production integration. Required API-level database tests remain outstanding, particularly separate-account isolation, message delivery/read status, Storage ownership, and Realtime topic authorization.

## Security review checks (2026-11-15)

| Check | Result | Detail |
| --- | --- | --- |
| `npm audit --json` | PASS | 333 dependency entries analyzed; 0 known vulnerabilities. |
| `npm test` | PASS | 14 tests passed, 0 failed. Initial sandbox run hit `spawn EPERM`; approved rerun passed. |
| `npm run typecheck` | PASS | No TypeScript diagnostics. |
| `npm run lint` | PASS | No ESLint diagnostics. |
| `npm run build` | PASS with warning | Production build completed. `EchoesOfAshGame` is 537.36 kB minified, above Vite's 500 kB warning threshold. |
| CORS allowlist | SOURCE REVIEW ONLY | Wildcard CORS was removed from the four Supabase Edge Functions. Exact-origin and rejected-origin preflight requests were not sent to a deployed function. |
| HTTPS/HSTS/CSP | SOURCE/BUILD REVIEW ONLY | Vercel configuration contains these headers; actual deployed redirects, response headers, and CSP browser reports were not checked. |
| Secret history scan | PASS, targeted patterns | No common private-key, AWS, GitHub-token, or OpenAI-key format matched. No Gitleaks/TruffleHog binary was available, so this is not a comprehensive secret scan. |
| Storage ownership, upload MIME/size, RLS, CSRF, reset-token expiry, IP rate limits | NOT VERIFIED | Requires deployed project behavior/configuration and, for RLS, separate authenticated test identities. |
