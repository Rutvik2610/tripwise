# Repository privacy audit — 21 November 2026

## Scope

Reviewed source code, both source JSON datasets, historical regression fixtures, public assets, tests, documentation, package/workflow/configuration files, the current repository working tree and all 14 locally accessible commits after fetching origin. Generated build assets were checked for obvious credential, identity/account, email and private-field patterns. No tracked/generated booking PDFs, passenger scans or document images were present; the public SVG is an illustration.

Ignored dependencies, local Git authentication state and unrelated workspace attachments are not application publication material and are not copied into the repository. Remote forks, other people's clones, external cached deployments and inaccessible GitHub objects cannot be proven clean by this audit. Public travel dates, hotel names and routes are retained as explicitly permitted, so the travel plan itself remains discoverable.

## Findings and changes

- **One current documentation file**, README.md, contained an account-identifying repository/site URL. It now uses generic owner placeholders. No personal account/name token remains in current application/documentation files under the manual and automated checks.
- Seven regression test files contained deliberately fictional booking-reference literals that were not clearly labelled fictional. They were normalised to the explicit TEST- prefix. They are not evidence of actual passenger/booking-reference exposure.
- No populated private booking/receipt/identity fields were found in current or historical trip JSON. No actual credentials, passport data, passenger names, payment card details or confidential confirmation documents were discovered in the inspected application data.
- Older README.md revisions still contain the former account token. Git author/committer metadata also contains identity information. Neither was rewritten.
- The history guard flags seven old synthetic-reference test paths for review: e2e/february.spec.ts, e2e/planner.spec.ts, src/lib/februaryFlights.test.ts, src/lib/januaryShift.test.ts, src/lib/malaysiaCorrection.test.ts, src/lib/research.test.ts and src/lib/transit.test.ts. These were manually classified as fictional test identifiers. The guard reports paths/categories only.

Nine existing files received privacy-related edits: the README, generic avatar icons in App.tsx replacing the old initial, and seven test files. No real booking document was removed because none was found.

## Preventive controls

- npm run privacy:check audits all tracked and untracked, non-ignored repository files. It checks structured confidential fields, obvious credentials, private keys/documents, email/phone/card patterns and the account token derived from the local GitHub remote without embedding the account name in source.
- npm run privacy:test runs synthetic detector regressions. These contain no real identity or credentials.
- CI runs both controls before app lint/tests/build.
- .githooks/pre-commit checks the staged repository without exposing values. Enable it in a new clone using git config core.hooksPath .githooks.
- .gitignore excludes private document directories, PDFs, private key files, local backups/recovery exports and environment/credential files.
- npm run privacy:history is a read-only scan. A nonzero exit means paths need review, not proof that every match is a real secret. It will continue reporting old history until separately remediated.

These controls are best-effort detection, not a guarantee that arbitrary free text or every possible document/secret format is safe. Keep private exports out of Git and review staged material before publication.

## History remediation requiring separate approval

Deleting account-identifying text in the working tree does **not** remove it from prior commits or existing clones. To erase it from reachable published history, a separately authorised operation would need to:

1. Make a secured backup and pause collaborator pushes.
2. Use a dedicated mirror to filter affected README revisions and, if desired, replace identifying author/committer metadata.
3. Re-run content and metadata audits, review the rewritten refs, then explicitly approve the necessary protected-branch/force updates.
4. Coordinate fresh clones, old-ref cleanup and any GitHub cached-content removal with repository collaborators/support.

The implementation audit did not rewrite history or force-push. A subsequent explicit merge/deploy instruction authorises an ordinary commit and fast-forward push of the sanitised working tree; it does not authorise rewriting older commits. Account identity/history is the remaining known privacy limitation. No exposed credentials were identified; if any are discovered later, revoke/rotate them immediately—history deletion alone cannot secure an exposed secret.
