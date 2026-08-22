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
| Frontend and backend authentication wiring | Planned for Phase 2 |
| Field-level error indicators and animations | Planned for Phase 2 |
| Automated and browser testing | Planned for Phase 2 |

Login Phase 1 focuses on the complete authentication interface and user experience. The forms are not connected to the backend yet.

## Features

### Backend

- JWT-based registration and login
- Password hashing with bcrypt
- Role-based access for `master`, `librarian`, and `borrower`
- Book and book-copy management
- Borrower management
- QR-based borrow and return transactions
- Activity logging for important operations
- Master-only user role management
- Configurable email access using approved domains and individual addresses
- Security headers through helmet
- Rate limiting on authentication endpoints
- CORS locked to the configured frontend origin
- Public registration-policy endpoint exposing only the enabled flag and approved domains
- Input validation on authentication routes
- PostgreSQL database managed through Prisma

### Authentication frontend

- Login, registration, and account-recovery routes
- Animated Login and Welcome card swapping
- Light and dark themes with smooth transitions
- Frosted card backgrounds and responsive form layouts
- Internally scrollable registration form with a hidden scrollbar
- Registration fields for first name, middle name, last name, email, phone, password, and password confirmation
- Clickable information tooltips rendered outside the scrollable form
- Dynamic email-access and approved-domain information
- Accessible password visibility controls using Lucide `Eye` and `EyeOff`
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
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
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

### 3. Configure the backend environment

Create `backend/.env` and add your local values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/slims_db"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

Never commit `.env` or real credentials.

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

## Phase 2 plan

The next authentication phase will focus on behavior rather than visual design:

1. Connect Login and Register forms to the backend.
2. Add client-side validation and password confirmation checks.
3. Display clear server and network errors.
4. Shake only the field that contains an error.
5. Add loading, disabled, success, and redirect states.
6. Store and restore authentication safely.
7. Add protected routes based on account roles.
8. Test keyboard access, mobile layouts, API failures, and complete authentication flows.

## Current integration notes

The public registration-policy endpoint is live:

```http
GET /api/v1/auth/registration-policy
```

Recommended public response:

```json
{
  "enabled": true,
  "domains": ["bpc.edu.ph"]
}
```

This endpoint must not expose individually approved email addresses. Until it exists, the tooltip displays an unavailable status and registration can still perform the final server-side check.

Already registered accounts should skip the registration email-access check and sign in normally. Password confirmation is frontend validation only and must not be stored or sent as a separate persisted field.

## Development notes

- Keep secrets and generated dependencies out of Git.
- Run Prisma commands from `backend/`.
- Restart the backend after changes to the generated Prisma client.
- Keep public registration assigned to the `borrower` role.
- Enforce permissions on the backend even when the frontend hides an action.

## Changelog

This README is part of the tenth project commit. See [CHANGELOG.md](CHANGELOG.md) for the complete commit milestone history and the Login Phase 1 update summary.
