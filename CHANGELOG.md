# Changelog

All notable project updates are recorded here by commit milestone.

## Commit 19 - 2026-08-22

### Authorization hardening (broken access control / PII exposure)

### Fixed

- **Broken access control closed.** Four endpoints were reachable by any signed-in borrower and exposed other members' personal data; now restricted to staff (`librarian`/`master`):
  - `GET /api/v1/borrowers` (full member roster: names/emails/phones) — previously returned `200` to any borrower
  - `GET /api/v1/borrowers/:id` (a member's full profile + transactions + reservations — an IDOR read of any member) — now staff-only
  - `GET /api/v1/transactions` (the entire borrow log) — now staff-only
  - `GET /api/v1/reservations` (all reservations) — now staff-only
- Non-numeric `:id` on borrowers GET/PUT/DELETE now returns `404 "Borrower not found"` instead of a generic `400` (consistent with the books routes).

### Added

- `GET /api/v1/borrowers/me` — lets a borrower read **only their own** profile, transactions, and reservations. This is the secure self-service view the dashboard will use for a member.

## Commit 18 - 2026-08-22

### Pre-dashboard: audit fixes, dormant-schema features, dead-code cleanup

### Added

- **Reservation API** (`/api/v1/reservations`): create (queued), list, update status, cancel/delete. Title-level FIFO queue; duplicate active reservations rejected with `409`; RBAC librarian/master on writes, read for signed-in users; activity logging.
- **Announcement API** (`/api/v1/announcements`): create, list, update, delete. Signed-in users can read; librarian/master write; activity logging.
- **Overdue bookkeeping util** (`utils/overdue.js`): `refreshOverdue()` marks currently-open past-due loans as `overdue`. The transaction list calls it before reading, so the `overdue` field is accurate for the dashboard.
- **Violation -> auto-ban**: returning a copy as `damaged`/`lost` increments the borrower's `violationCount`; at the threshold (3) the borrower is auto-banned (`status: banned`) inside the same transaction.

### Changed

- `transactions.routes.js` borrow now also guards against a copy that already has an open loan, even if it's marked available (defensive against data drift), returning `400 "Book copy is not available"`.
- `utils/validate.js` no longer exports the unused `EMAIL_RE` constant.

### Fixed

- **Broken favicon** (`frontend/index.html`): was pointing at `/frontend/src/assets/logo.png` (404 in production); now `href="/favicon.svg"`, which is copied to `dist/`.
- Removed the dead `<link rel="stylesheet" href="">` from the head.
- Removed unused scaffold assets `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png` and unused `public/icons.svg`.
- Removed the unused `pg` direct dependency (it ships transitively with `@prisma/adapter-pg`).

## Commit 17 - 2026-08-22

### Audit fixes + precision improvements (post-Phase-4 audit)

### Fixed

- Banned borrowers can no longer check out books: the borrow counter flow now rejects a borrower whose account status is `banned` with `403 "Borrower account is banned"` (previously a banned borrower could still create a loan and flip a copy to `borrowed`; only login blocked banned accounts)
- `GET /api/v1/books/:id` with a non-numeric id now returns `404 "Book not found"` instead of surfacing a generic `400` from a Prisma error
- `PUT /api/v1/books/:id` now returns `404 "Book not found"` when the book does not exist (previously a generic `400`), and rejects non-numeric ids the same way

## Commit 16 - 2026-08-22

### Account recovery UI refinements (Phase 4)

### Added

- 6-box OTP input (`OtpInput.jsx`), Telegram-style: auto-advance on type, backspace-goes-back, arrow-key nav, paste-to-fill, digit-only
- Trailing refresh button for resending the code, with a 60-second countdown cooldown matching the backend 1-per-minute cap
- `POST /api/v1/auth/verify-reset-code` endpoint so the boxes color by whether the code is actually correct (not just that 6 digits are filled)
- Catch-all route so refresh / unknown routes default to `/login`, plus a reload detection that returns the user to `/login` on a hard refresh

### Changed

- Boxes animate green (left to right) on a correct code and red on a wrong one, with no shake on completion
- Shake is submit-only: an empty/incomplete code shakes on submit; a wrong code shakes on submit after the red color is shown
- Code step shows the target email plus an info tooltip; email-field tooltip explains the privacy (anti-enumeration) behavior
- `.otp-refresh` matches the height of the OTP boxes so the row reads as one control

### Fixed

- Reset-code send button no longer submits a stale email state: `sendCode()` now takes the email as a parameter
- "Set new password" button no longer shows green on load (state carried over from the email step and was not reset on step change)

## Commit 15 - 2026-08-22

### Account recovery, atomic return, and validation sweep (Phase 4)

### Added

- Password reset flow: `POST /forgot-password` and `POST /reset-password`, with hashed single-use tokens, a 15-minute expiry, and a 5-attempt brute-force cap that burns the token
- `PasswordResetToken` model + `reset_token_attempts` migration (`attempts` counter)
- Pluggable email sender (`utils/email.js`) with `EMAIL_MODE` = `console` | `smtp`; console mode needs zero setup, SMTP mode uses `nodemailer` (port 465, `SMTP_SECURE=true` recommended)
- Anti-enumeration on forgot-password: unknown and known emails both return the same generic message; `devCode`/`devFound` only surface in non-SMTP (dev) mode
- `POST /verify-reset-code` to report code validity without consuming it
- Atomic return: `updateMany` guard so two concurrent returns of one copy result in exactly one winner
- Validation sweep via `utils/validate.js` and `utils/respondError.js` across remaining routes

### Changed

- Return flow now atomically closes the open loan and flips the copy to available inside a single transaction
- Reset endpoint counts wrong attempts toward the brute-force cap and invalidates the token after the limit

## Commit 14 - 2026-08-22

### Fix borrower profile editing + theme persistence (Phase 3 follow-up)

### Added

- Shared phone normalizer utility so every write path stores the same `+63 9XX XXX XXXX` format
- Theme preference persisted across reloads (localStorage, key `slims_theme`)

### Fixed

- `PUT /api/v1/borrowers/:id` no longer references the removed `middleInit` field, so editing a borrower's middle name or phone number works again instead of returning `400` / silently dropping the values
- `POST /api/v1/borrowers` (librarian-created borrowers) now normalizes and validates the phone number like self-registration does, and rejects malformed phone numbers with `400`

## Commit 13 - 2026-08-22

### Registration polish (Phase 3)

### Added

- Registration message dictionary aligned with the login error style (enter info, enter first/last/email/password, invalid email format, invalid phone number, not whitelisted domain, email already registered, password too short, registration conflict)
- Phone number normalization: strips non-digits, drops a leading zero, and stores the spaced `+63 912 345 6789` format
- Shared rate-limit lock hook (`useRateLock`) used by both login and registration
- Registration inherits the full error system: per-field frame arrays, shake + red fields + red button, message-on-button, and timeout refs
- Client-side email-format validation judged before the optional phone check
- Fused `+63` phone prefix that cannot be edited or deleted
- Client-side password confirmation mismatch to the confirm field

### Changed

- Registration now lives behind the same rate-limit lock and `RETRY_KEY` as login, so a lockout is one door across both pages
- Login refactored to rent the shared `useRateLock` hook instead of owning its own lock code

### Fixed

- Registration previously judged the optional phone before validating email format; email shape is now checked first

## Commit 12 - 2026-08-22

### Apply audit fixes

### Added

- Atomic borrow claiming through a conditional update inside a database transaction, preventing double loans
- Shared error responder with clean client messages and duplicate detection
- Self-registration entries in the activity log
- Startup guard for a missing JWT_SECRET
- Rate limit exemption for the public registration-policy endpoint
- Registration lock probe now uses an empty login request
- Borrow concurrency regression test script

### Fixed

- Registration-policy page views no longer consume the login rate limit budget
- Borrow race condition where concurrent requests could loan one copy twice
- Raw database errors no longer leak server paths on non-auth routes
- Login probe effect no longer triggers a lint warning

### Changed

- Library logo compressed from 2.9 MB to 41 KB
- The useAuth hook moved to its own file to satisfy fast refresh rules

## Commit 11 - 2026-08-22

### Login Phase 2

### Added

- Frontend API client with a single configured backend URL
- Auth context storing the token and user, persisted across refreshes
- Protected dashboard route with redirect for signed-out visitors
- Login and Register forms wired to the backend with auto-login after registration
- Borrower profile creation at self-registration with an auto-generated QR code
- Login error dictionary: enter account, enter email, enter password, invalid email, email not registered, wrong password, banned account
- Per-field error states with shake animations inherited from the portfolio
- Submit button error and success states with inline error messages
- Banned borrower check on login after password verification
- Rate-limit lock with a server-provided countdown
- Lock persistence across page refreshes and automatic recovery detection after a backend restart
- Client-side empty-field validation that skips the API entirely

### Changed

- Borrower records now store the full middle name and phone number
- Existing accounts always pass the email whitelist on login
- Only the input boxes shake on errors, keeping labels and tooltips still
- The password visibility eye shakes together with its input
- Rate limit responses expose the Retry-After header to the frontend
- Domain whitelist tooltips render approved domains as centered pill badges

## Commit 10 - 2026-08-22

### Backend security pass

### Added

- Security headers through `helmet`
- Rate limiting on authentication endpoints (20 requests per 15 minutes per IP)
- CORS origin lock to the configured frontend URL
- Input validation on register and login (email format and password minimum)
- Public registration-policy endpoint for the email tooltip

### Changed

- Moved route registration above the server listener and removed the Phase 0 test routes
- Replaced raw database errors with clean client messages
- Stored emails in lowercase to prevent duplicate accounts

## Commit 9 - 2026-08-21

### Login Phase 1 and repository documentation

### Added

- Root GitHub repository README
- React and Vite frontend development commands and tooling notes
- Dedicated project changelog
- Login, Register, and Forgot Password frontend routes
- Route-driven Login and Welcome card swapping
- Complete light and dark authentication themes
- Custom BTECH Library logo and welcome content
- Shared authentication form styling
- Registration form for first name, middle name, last name, email, phone, password, and password confirmation
- Clickable Lucide information tooltips
- Portal-based tooltip rendering to prevent clipping
- Dynamic email-access and approved-domain tooltip
- Existing-account note explaining that registered users skip the registration email-access check
- Shared `PasswordInput` component
- Lucide `Eye` and `EyeOff` password visibility controls
- Example-based field placeholders
- Masked password example that responds to the visibility control
- Working frontend route for account recovery
- Account navigation links below each form submit button

### Changed

- Consolidated the generated Vite frontend documentation into the root README
- Replaced button-style account navigation with subtle animated text links
- Made the submit button the only dominant form action
- Moved masked corner highlights from the outer cards to the authentication form frame
- Changed light-theme form highlights to white
- Kept purple and pink form highlights for dark mode
- Set Login card opacity to `0.6` in both themes
- Set Welcome card opacity to `0.3` in both themes
- Added an `18px` backdrop blur to both outer cards
- Removed the nested form blur to avoid transform rendering issues
- Added smooth `500ms` form and theme transitions
- Set card swapping to `1s` for transition testing
- Made only the Register form internally scrollable
- Completely hid the Register scrollbar while preserving scrolling
- Aligned Last name with Middle name
- Improved text size, contrast, labels, and supporting copy

### Fixed

- Prevented tooltips from being clipped by the Register form
- Removed duplicate and conflicting Register scrollbar rules
- Removed obsolete outer-card corner highlights
- Removed the old regular form border and horizontal highlight
- Prevented the decorative form border from scrolling with Register fields
- Removed dead account-recovery navigation

### Known limitations

- Authentication form submission is not connected to the backend yet.
- Field-level errors, shake indicators, loading states, and redirects are planned for Phase 2.
- The public registration-policy endpoint still needs to be added to the backend.
- Automated and full browser testing are planned for Phase 2.

## Commit 8 - 2026-08-21

### Add Python dev runner

- Added a Python-based development runner for starting the frontend and backend.
- Improved Windows development startup and shutdown behavior.

## Commit 7 - 2026-08-21

### Add email access control

- Added configurable registration access rules.
- Added approved-domain and individually approved-email support.
- Kept email restrictions disabled by default.
- Restricted email-access settings to authorized roles.

## Commit 6 - 2026-08-21

### Add role management routes

- Added user listing for master administration.
- Added role updates for `master`, `librarian`, and `borrower`.
- Blocked invalid role values and unauthorized role changes.
- Added activity records for role changes.

## Commit 5 - 2026-08-21

### Add activity logging

- Added activity records for important library operations.
- Logged book, borrower, transaction, and administrative actions.
- Added a protected activity-log route.

## Commit 4 - 2026-08-21

### Add transaction borrow and return routes

- Added QR-based borrowing.
- Added QR-based returns.
- Added transaction listing and related status updates.
- Enforced librarian and master permissions.

## Commit 3 - 2026-08-21

### Add borrower CRUD routes

- Added borrower creation, listing, details, updates, and deletion.
- Connected borrower profiles to user accounts.
- Added borrower status, QR code, and violation tracking.

## Commit 2 - 2026-08-21

### Add Phase 1 schema and book CRUD

- Expanded the Prisma schema for core library data.
- Added books and physical book copies.
- Added protected book creation, listing, updates, and deletion.

## Commit 1 - 2026-08-21

### Initial backend and frontend scaffold

- Created the React and Vite frontend.
- Created the Node.js and Express backend.
- Added PostgreSQL and Prisma.
- Added registration and login with JWT and bcrypt.
- Added the initial role-based middleware and protected routes.
- Added the monorepo development setup.
