# JobTrack

A simple full-stack **Job Application Tracker** built with the MERN stack (MongoDB Atlas, Express, React, Node.js). Users register, log in, and manage their own job applications from a protected dashboard.

## Features

- Register (name, email, password, confirm password) with client- and server-side validation
- Login with a signed JWT stored in an **HTTP-only cookie** (never in `localStorage`)
- Logout (clears the cookie) and protected frontend routes
- Dashboard: welcome message, total count, count per status, application table
- Create, view, edit and delete job applications (delete asks for confirmation)
- Search by company or role; filter by status
- Loading indicators, empty states and clear error messages
- Responsive plain-CSS layout (table turns into cards on phones)
- Every application belongs to one user; all queries are scoped to the logged-in user

## Technologies

| Part     | Tools |
|----------|-------|
| Frontend | React 19 + Vite, React Router DOM, plain CSS, Fetch API |
| Backend  | Node.js, Express, Mongoose, bcryptjs, jsonwebtoken, dotenv, cors, cookie-parser |
| Database | MongoDB Atlas |
| Testing  | Node API test script (`npm test`), Postman, browser dev tools |

`cookie-parser` is the only dependency beyond the requested list; Express does not read cookies on its own.

## Folder structure

```
jobtrack/
├── client/
│   ├── index.html
│   ├── vite.config.js            # dev server + /api proxy to the backend
│   └── src/
│       ├── main.jsx, App.jsx     # entry point, routes, protected/guest route wrappers
│       ├── AuthContext.jsx       # who is logged in (calls GET /api/auth/me on load)
│       ├── index.css
│       ├── services/api.js      # all fetch calls
│       ├── pages/                # Register.jsx, Login.jsx, Dashboard.jsx
│       └── components/           # ApplicationForm, StatusBadge, Spinner
├── server/
│   ├── server.js                 # app setup; starts only after DB connects
│   ├── config/db.js              # env checks + Mongoose connection
│   ├── models/                   # User.js, JobApplication.js
│   ├── routes/                   # authRoutes.js, applicationRoutes.js
│   ├── controllers/              # authController.js, applicationController.js
│   ├── middleware/authMiddleware.js   # verifies JWT cookie, sets req.user
│   ├── scripts/api-test.js       # automated end-to-end API test
│   └── .env.example
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js 18+ and npm (developed with Node 22, npm 10)
- A MongoDB Atlas account and cluster
- Optional: Postman

## MongoDB Atlas setup

1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add your current IP address (or `0.0.0.0/0` for local testing only).
4. **Connect → Drivers** → copy the connection string. If your password has special characters (`@ : / ? # %`), URL-encode them.
5. You do not need to create the database or collections; Mongoose creates `jobtrack` and its collections on first write.

## Environment variables

```bash
cd server
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

Edit `server/.env`:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Your Atlas connection string |
| `DB_NAME` | Database name (default `jobtrack`) |
| `JWT_SECRET` | Long random string (16+ chars). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | Backend port (default `5000`) |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS (default `http://localhost:5173`) |

`.env` is git-ignored. If `MONGODB_URI` or `JWT_SECRET` is missing, the server exits with a message naming the missing variable.

## Install and run

Open two terminals.

```bash
# Terminal 1 – backend (http://localhost:5000)
cd server
npm install
npm start          # or: npm run dev  (auto-restart on changes)
```

```bash
# Terminal 2 – frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` to the backend, so the browser only sees one origin and the auth cookie works without extra cross-site settings.

## API documentation

All bodies and responses are JSON. Errors look like `{ "message": "..." }`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | – | Body: `name, email, password, confirmPassword`. `201` created, `400` invalid, `409` duplicate email |
| POST | `/api/auth/login` | – | Body: `email, password`. Sets the `token` cookie. `401` on bad credentials |
| POST | `/api/auth/logout` | – | Clears the cookie |
| GET | `/api/auth/me` | Cookie | Returns the current user (`id, name, email`) |

### Applications (all require login; only the owner's records are visible)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications?search=&status=` | List + `stats` (`total`, `byStatus`). Search matches company or role |
| POST | `/api/applications` | Create. Body: `company, role, appliedDate, status?, jobUrl?, notes?` |
| GET | `/api/applications/:id` | Get one |
| PUT | `/api/applications/:id` | Update (same body as create) |
| DELETE | `/api/applications/:id` | Delete |

`status` is one of `Applied, Assessment, Interview, Offer, Rejected`. Another user's application returns `404`, so its existence is not revealed.

## Testing

**Automated API test** (backend must be running; it creates two throwaway users in your database and deletes them afterwards):

```bash
cd server
npm test
```

**Postman:** log in with `POST /api/auth/login`; Postman stores the `token` cookie automatically and sends it on later requests. Then try the endpoints above. Try them without logging in to confirm `401`.

**Browser:** register → log in → add/edit/delete applications → search/filter → log out. Check DevTools → Application → Cookies: `token` is marked HttpOnly, and Local Storage is empty.

## Security notes

- Passwords hashed with bcryptjs (cost 10); the hash is never selected or returned by default
- JWT (7-day expiry) in an HTTP-only, `SameSite=Lax` cookie (`Secure` when `NODE_ENV=production`)
- Auth middleware on every application route; every query filters by `user` (ownership)
- Inputs are type-checked as strings (blocks `{"$ne": ""}`-style operator injection), search text is regex-escaped, ids are validated
- Same error message for unknown email and wrong password
- Secrets only in `server/.env`; connection errors never print the URI

## Known limitations

- No rate limiting or account lockout on login
- No password reset or email verification
- No pagination (fine for personal use)
- Logout clears the cookie but does not revoke the JWT server-side (it still expires after 7 days)
- For production, serve over HTTPS, set `NODE_ENV=production`, and add production CORS/cookie settings
- No automated frontend tests; the UI was tested manually in a browser

## AI development experience

This project was built with AI assistance from **Claude Code** (Anthropic's coding assistant, in the Claude desktop app). Tasks it helped with, as actually carried out:

1. Scaffolding the Express/Mongoose backend (models, auth and application controllers, JWT cookie middleware).
2. Designing the ownership checks and input validation (string-only fields, escaped search, id validation).
3. Writing `server/scripts/api-test.js`, an end-to-end test covering registration, login, protected routes, CRUD, search/filter and cross-user access (44 checks).
4. Building the React pages and the responsive CSS, then testing them in the in-app browser.
5. Spotting and fixing a re-render issue (an unmemoized `logout` function retriggering the dashboard load effect).

All AI-generated code was reviewed and tested before use.

> **Note to the author:** the assessment brief asks for "Code0". This README was written in a Claude Code session, so it names the tool that was actually used. If you used Code0 for any step, edit this section to describe that work accurately.
