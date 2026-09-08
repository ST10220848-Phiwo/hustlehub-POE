# INSY7314 POE — Authentication Backend

A Node.js/Express backend implementing JWT-based authentication with role-based access control. Passwords are hashed, tokens are delivered via httpOnly cookies, and user data currently persists to a local JSON file as a stand-in for MongoDB.

---

## Tech Stack

- **Runtime:** Node.js, ES Modules (`import`/`export` — `package.json` must have `"type": "module"`)
- **Framework:** Express
- **Auth:** JWT (`jsonwebtoken`), delivered via httpOnly cookie (`cookie-parser`)
- **Passwords:** `bcrypt`
- **Validation:** `Joi`
- **Persistence:** local JSON file now (`src/infrastructure/db`), MongoDB planned later
- **Security headers / CORS:** `helmet`, `cors`

## Project Structure

```
project-root/
├── server.js                        # Entry point
├── data/
│   └── users.json                   # Local persisted user data (auto-created)
├── src/
│   ├── api/routes/
│   │   ├── index.js                 # Mounts all route modules under /api
│   │   └── auth.route.js            # /auth routes
│   ├── controllers/
│   │   └── auth.controller.js       # Request/response handling
│   ├── application/
│   │   └── auth.service.js          # Business logic (validation, role rules, tokens)
│   ├── validations/
│   │   └── auth.validation.js       # Joi schemas
│   ├── config/
│   │   └── jwt.js                   # JWT secret/expiry + cookie options (single source)
│   ├── infrastructure/db/
│   │   └── index.js                 # JSON-file data layer
│   ├── middleware/
│   │   ├── authenticate.js          # Reads cookie, verifies token, confirms user in DB
│   │   ├── authorize.js             # Role check (after authenticate)
│   │   ├── validate.js              # Runs a Joi schema against the request
│   │   ├── notFound.js              # Catches unmatched routes
│   │   └── errorHandler.js          # Shapes every error response
│   └── utils/
│       ├── app.js                   # Express app assembly
│       ├── jwt.js                   # sign/verify helpers
│       ├── appError.js              # Custom error class
│       └── passwordHasher.js        # bcrypt hash/compare
└── .env.example
```

**Why two things named differently than you might expect:**
- `application/auth.service.js` (not `services/`) holds the business logic — validation rules, the role allow-list, calling the hasher and signing tokens. It talks to `infrastructure/db` through a small interface (`findUserByEmail`, `createUser`, ...), so swapping JSON for MongoDB later only means changing that one file.
- `authenticate` and `authorize` are separate middleware on purpose — a route can require just a valid session, or a valid session *and* a specific role, without duplicating logic.

## Getting Started

```bash
npm install
cp .env.example .env   # fill in a real JWT_SECRET
node server.js
```

Required `.env` values:

| Variable | Purpose |
|---|---|
| `PORT` | server port (default 4000) |
| `JWT_SECRET` | signs/verifies tokens — long, random, never committed |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `1h` |
| `CLIENT_ORIGIN` | your frontend's origin, for CORS + cookies |

## API

Base URL: `/api/auth`

| Method | Endpoint | Auth required | Body |
|---|---|---|---|
| POST | `/register` | no | `{ name, email, password, role? }` |
| POST | `/login` | no | `{ email, password }` |
| POST | `/logout` | no | — |
| GET | `/me` | yes | — |

Login and register don't return the token in the JSON body — it's set as an HTTP Only cookie, so frontend JS never has direct access to it (mitigates token theft via XSS). Protected routes just need `authenticate` (and optionally `authorize('role')`) added in front of the controller.

Registration accepts a `role`, but only values in the self-registerable allow-list (currently `client`, `freelancer`) are honoured — anything else, including `admin`, silently falls back to the default role. Admin accounts are meant to be created out-of-band, not through this endpoint.

## Error Responses

Every error goes through `errorHandler.js` and comes back as:

```json
{ "success": false, "message": "...", "details": [ /* only for validation errors */ ] }
```

Stack traces, file paths, and config values are never included — unexpected errors are logged server-side and returned to the client as a generic message.

## Roadmap

- [ ] Swap `infrastructure/db` for a real MongoDB implementation
- [ ] Admin-only endpoint for role management
- [ ] Refresh tokens / revocation
- [ ] Automated tests for the auth service and middleware
