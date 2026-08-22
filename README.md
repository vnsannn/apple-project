<div align="center">
  <img src="frontend/src/assets/logo.png" alt="BTECH Library logo" width="110" />

# The Apple Project

### BTECH Library Management System

A full-stack library management system for borrowers, librarians, and master administrators.

[Changelog](CHANGELOG.md) | [Repository](https://github.com/vnsannn/apple-project)
</div>

## Project status

| Area | Status |
| --- | --- |
| Backend core APIs | Complete |
| Backend security hardening | Complete |
| Authentication UI, Login Phase 1 | Complete |
| Login Phase 2, backend wiring | Complete |
| Field-level error indicators and animations | Complete |
| Registration polish, Phase 3 | Complete |
| Account recovery and final polish, Phase 4 | Complete |
| Automated and browser testing | Planned |

Login and registration are fully connected to the backend, including per-field error feedback and a rate-limit lock. Registration polish is complete (full error system, shared rate-limit lock, client-side validation, phone normalizer), and Phase 4 added email-based account recovery, atomic returns, and a validation sweep. Automated testing is still planned.

## Features

### Backend

- JWT-based registration and login
- Password hashing with bcrypt
- Role-based access for `master`, `librarian`, and `borrower`
- Login error dictionary with banned-account blocking
- Borrower profiles created at self-registration with auto-generated QR codes
- Book and book-copy management
- Borrower management
- QR-based borrow and return transactions with atomic claiming against double loans
- Activity logging for important operations, including self-registrations
- Master-only user role management
- Configurable email access using approved domains and individual addresses
- Security headers through helmet
- Rate limiting on authentication endpoints with retry timing exposed to the frontend
- CORS locked to the configured frontend origin
- Public registration-policy endpoint exposing only the enabled flag and approved domains
- Input validation on authentication routes
- Registration message dictionary aligned with the login error style
- Phone number normalization to the spaced `+63 912 345 6789` format
- Email-based password reset with hashed, single-use, expiring tokens and a brute-force attempt cap
- Pluggable reset email sender (`console`/`smtp` modes) via Nodemailer
- Atomic borrow and return with conditional claims to prevent double loans
- Server-side input validation across books, transactions, borrowers, and settings
- Clean error responses across all API routes
- Startup guard for required environment secrets
- PostgreSQL database managed through Prisma

### Authentication frontend

- Login, registration, and account-recovery routes
- Animated Login and Welcome card swapping
- Light and dark themes with smooth transitions
- Theme preference remembered across page reloads
- Frosted card backgrounds and responsive form layouts
- Internally scrollable registration form with a hidden scrollbar
- Registration fields for first name, middle name, last name, email, phone, password, and password confirmation
- Shared API client with a single configured backend URL
- Auth context that keeps users signed in across refreshes
- Protected dashboard route with signed-out redirect
- Login error messages shown inline on the submit button
- Per-field shake animations, inherited from the portfolio design
- Rate-limit lock with a live countdown that survives refreshes
- Automatic lock release when the backend restarts
- Client-side empty-field checks that never call the API
- Client-side email-format validation before the optional phone check
- Registration form with the full error system, shared with login
- Fused `+63` phone prefix that cannot be edited or deleted
- Clickable information tooltips rendered outside the scrollable form
- Dynamic email-access and approved-domain information
- Accessible password visibility controls using Lucide `Eye` and `EyeOff`
- Account recovery two-step flow: email → code + new password
- OTP input with auto-advance, backspace navigation, and paste-to-fill
- Green/red verification animation on the OTP boxes (correct vs incorrect code)
- Resend-code button with a 60-second cooldown
- Unknown routes and refresh default to `/login`
- Example-based placeholders with masked password examples
- Custom BTECH Library branding and logo

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, Lucide React, CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Development runner | npm scripts, optional Python runner |

## Repository structure

```text
apple-project/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   └── package.json
├── dev.py
├── package.json
├── README.md
└── CHANGELOG.md
```

## Local setup

### Requirements

Install these tools first:

- Node.js and npm
- PostgreSQL
- Python 3, only if you want to use `dev.py`

### 1. Clone the repository

```bash
git clone https://github.com/vnsannn/apple-project.git
cd apple-project
```

### 2. Install dependencies

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure the environment

Create `backend/.env` and add your local values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/slims_db"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

Optional email (resets work in `console` mode with nothing set; set these for real emails):

```env
EMAIL_MODE=smtp            # console | smtp
EMAIL_FROM="you@example.com"
EMAIL_FROM_NAME="BTECH Library"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="you@example.com"
SMTP_PASS="your-app-password"
```

Optionally create `frontend/.env` to point at a different backend:

```env
VITE_API_URL="http://localhost:5000"
```

Never commit `.env` files or real credentials.

### 4. Prepare Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate dev
cd ..
```

Restart the backend after running `npx prisma generate` if the development server is already running.

### 5. Start the project

Using the root npm script:

```bash
npm run dev
```

Or using the optional Python runner:

```bash
python dev.py
```

Default local addresses:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Frontend development with React and Vite

The frontend was scaffolded with [React](https://react.dev) and [Vite](https://vite.dev). Vite provides a fast development server, Hot Module Replacement, and optimized production builds. ESLint is included for code-quality checks.

Run frontend commands from `frontend/`:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

The standard React plugin is configured through `frontend/vite.config.js`:

- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) provides React Fast Refresh and JSX support.

The React Compiler is not currently enabled. If it is added later, follow the official [React Compiler installation guide](https://react.dev/learn/react-compiler/installation) and test the existing authentication animations carefully.

The current frontend uses JavaScript. If the project later migrates to TypeScript, use type-aware ESLint rules and refer to Vite's [React TypeScript template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts).

Project documentation is maintained in this root README. The generated Vite `frontend/README.md` can be removed to avoid duplicate or outdated instructions.

## Main API areas

| Area | Base route |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Books | `/api/v1/books` |
| Borrowers | `/api/v1/borrowers` |
| Transactions | `/api/v1/transactions` |
| Activity logs | `/api/v1/activity` |
| Users and roles | `/api/v1/users` |
| Email access settings | `/api/v1/settings/email-access` |

Protected routes require a JWT in the request header:

```http
Authorization: Bearer YOUR_TOKEN
```

## Roadmap

Login Phase 2, registration polish (Phase 3), and account recovery + final polish (Phase 4) are complete. The remaining planned work:

### Phase 5, automated and browser testing

1. Automated backend regression tests.
2. End-to-end browser tests for the authentication and recovery flows.

## Current integration notes

The public registration-policy endpoint is live:

```http
GET /api/v1/auth/registration-policy
```

It returns only the enabled flag and the approved domain list:

```json
{
  "enabled": true,
  "domains": ["bpc.edu.ph"]
}
```

Individually approved email addresses are never exposed. Already registered accounts skip the email-access check and sign in normally, even when the whitelist is enabled. Password confirmation is frontend validation only and must not be stored or sent as a separate persisted field.

## Development notes

- Keep secrets and generated dependencies out of Git.
- Run Prisma commands from `backend/`.
- Restart the backend after changes to the generated Prisma client.
- Keep public registration assigned to the `borrower` role.
- Enforce permissions on the backend even when the frontend hides an action.
- The rate limit counter lives in server memory and resets on backend restart.

## Changelog

This README is part of the fifteenth project commit. See [CHANGELOG.md](CHANGELOG.md) for the complete commit milestone history.
