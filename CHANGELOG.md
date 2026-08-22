# Changelog

All notable project updates are recorded here by commit milestone.

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
