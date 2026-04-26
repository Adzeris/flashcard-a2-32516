# Flashcard app (assignment 2 - 32516)

MD Saadman Kabir, ID: 25502701, FEIT

This is the same flashcard idea from assignment 1, just bigger: now there are users, login, an admin section, and per-user history on top of the flashcards.

## What is used

- Frontend: React + Vite, plain JavaScript, CSS in `src/index.css`.
- Backend: Python with FastAPI + SQLAlchemy. Runs with Uvicorn.
- Database: SQLite, file is `flashcards_v2.db` (created by the backend on first start).
- Auth: JWT tokens (HS256) + PBKDF2-SHA256 password hashing.

The React app talks to FastAPI using `fetch` from `src/api.js`. Vite serves the SPA, FastAPI serves the JSON API on a different port and CORS is allowed in dev.

## Features

Works like an SPA: one `index.html`, the React app swaps screens by changing state (auth → flashcards/history/profile/admin → study modal). No full page reloads.

CRUD across three+ entities (the rubric only asks for three):

- **Users** - register, login, edit your own profile, change password. Admin can list/edit/delete users and flip the role between `user` and `admin`.
- **Tests** (per-user folders for cards) - create, rename, delete. Each new account gets `Test 1/2/3` so they have somewhere to start.
- **Flashcards** - create, edit, delete, list inside a test. Difficulty 1-5. Live search filters as you type (debounced 200ms so it doesn't hammer the API).
- **View histories** - every graded answer in exam mode writes a row. The history tab shows attempts/correct/wrong/accuracy per test. Admin can view any user's history.
- **Guest sessions** - "continue as guest" makes a temporary deck behind a `?guest=<token>` URL. Anyone with the link can edit it until it expires (12h). No login, no saved history. This is on top of the required entities, just kept it because it's useful.

Other stuff that was already there from assignment 1 and still works:

- Practice mode: flip the card, navigate prev/next, no scoring.
- Exam mode: flip, mark right/wrong, see a final percentage at the end. Each grade gets saved as a history row.
- Optional shuffle when starting a session.
- Difficulty filter ("up to 3" only studies cards with difficulty 1-3).

## Folder layout

```
Assignment 2/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth_router.py        # register / login / me
│   │   │   ├── users_router.py       # /api/users (admin) + /api/users/me
│   │   │   ├── tests_router.py       # /api/tests CRUD
│   │   │   ├── flashcards_router.py  # /api/flashcards CRUD + ?search=
│   │   │   ├── histories_router.py   # /api/histories CRUD
│   │   │   └── guest_router.py       # /api/guest/sessions
│   │   ├── auth.py        # JWT + password hashing helpers
│   │   ├── database.py    # SQLAlchemy engine + session
│   │   ├── deps.py        # get_current_user / require_admin dependencies
│   │   ├── models.py      # SQLAlchemy models (User, Test, Flashcard, ViewHistory, GuestSession)
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   └── main.py        # app + startup seeding + router includes
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # thin shell, picks which screen to show
│       ├── api.js                  # fetch wrapper + readable errors
│       ├── index.css
│       ├── hooks/
│       │   ├── useAuth.js          # token + current user + login/logout
│       │   └── useUiFeedback.js    # shared loading/error/success state
│       ├── utils/
│       │   ├── format.js           # date formatter
│       │   ├── url.js              # ?guest=<token> read/write
│       │   └── array.js            # shuffle
│       └── components/
│           ├── AuthScreen.jsx      # login + register card
│           ├── GuestMode.jsx       # whole guest experience
│           ├── Layout.jsx          # header + tab nav (logged-in shell)
│           ├── DifficultyPicker.jsx
│           ├── StudyPanel.jsx      # practice/exam runner (modal)
│           ├── FlashcardsTab.jsx   # picks list vs workspace
│           ├── TestList.jsx        # tests CRUD
│           ├── TestWorkspace.jsx   # per-test card CRUD + study + live search
│           ├── HistoryTab.jsx      # per-test summary
│           ├── ProfileTab.jsx      # edit own username/email/password
│           └── AdminTab.jsx        # users list + selected user history
├── database/
│   ├── schema.sql                  # raw schema for marker reference
│   └── sample_data.json
├── flashcards_v2.db                # gets created on first backend start
├── start-backend.ps1
├── start-frontend.ps1
└── README.md
```

## What the tester needs installed

- **Node.js** (includes `npm`) — for the frontend. <https://nodejs.org> LTS is fine.
- **Python 3** — for the backend (3.10+; I'm on 3.12).

You do **not** need to install MongoDB or any database server. SQLite ships with Python and the file gets created automatically.

## How to run it (first time)

There are two PowerShell scripts at the repo root that do everything for you, but here are the steps in case you want to run them manually.

**Terminal 1 — backend** (from the repo root):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt
uvicorn app.main:app --reload --host localhost --port 4533 --app-dir .\backend
```

Backend opens on `http://localhost:4533`. Health check: `GET /health`.

**Terminal 2 — frontend** (from `frontend/`):

```powershell
npm install
npm run dev
```

Frontend opens on `http://localhost:5000`.

The first time the backend starts, it seeds a default admin so you have something to log in with:

- username: `admin`
- password: `admin123` (override with the `ADMIN_DEFAULT_PASSWORD` env var if you care)

Anyone else can register normally from the login screen.

## API (quick reference)

- `GET /health`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Users: `GET /api/users` (admin), `PUT/DELETE /api/users/{id}` (admin), `GET/PUT /api/users/me`, `GET /api/users/{id}/history` (admin)
- Tests: `GET/POST /api/tests`, `PUT/DELETE /api/tests/{id}`
- Flashcards: `GET/POST /api/flashcards`, `PUT/DELETE /api/flashcards/{id}`, `?search=&test=` filters
- Histories: `GET/POST /api/histories`, `PUT/DELETE /api/histories/{id}`
- Guest: `POST /api/guest/sessions`, `GET/PUT/DELETE /api/guest/sessions/{token}`

## Stuff worth knowing for the demo

- `useState` is enough here — nothing has gnarly state transitions, so `useReducer` would have been overkill. The two custom hooks (`useAuth`, `useUiFeedback`) are the only place I deviate from the basics, and both exist to stop the same try/catch + token bookkeeping showing up in every component.
- Auth is a Bearer token in the `Authorization` header (not a cookie), so I don't need CSRF protection. Tokens expire after 3 hours by default.
- Role checks happen on the **backend** (`require_admin` dependency in `deps.py`). The frontend only hides the admin tab — the API would still reject a non-admin token even if someone forged the UI.
- Live search is a `setTimeout` debounce inside `TestWorkspace.jsx`. Each keystroke just updates state; only after 200ms of quiet does it actually hit `/api/flashcards?search=`.
- SPA without React Router: I just keep an `activeTab` string in state and conditionally render. The whole app is one `index.html`.

## Stuff that was annoying

Splitting `App.jsx` was the big job. After assignment 1 it had grown to about 1300 lines because every feature got tacked on inside the same file. Cutting it apart into per-tab components and pulling the auth / loading-state stuff into hooks made it way easier to reason about (and meant `index.css` was the only file I hadn't touched in a week, which is fine).

Other things: SQLite `flashcards_v2.db` is created on first run, so `git rm` it if you want a clean slate. CORS is wide open in dev because Vite (port 5000) and FastAPI (port 4533) live on different origins. PBKDF2 was picked over bcrypt because bcrypt's 72-byte input limit was annoying me when testing long passwords.

If something breaks, check the backend is running first, then look at the error text on the page (errors are surfaced from `api.js` instead of crashing the UI to a blank screen).

| Area                                  | Files                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend (auth, models, all routers)   | `backend/app/*.py`, `backend/app/routers/*.py`                                                                       |
| Frontend shell + hooks + utils        | `frontend/src/App.jsx`, `frontend/src/hooks/*`, `frontend/src/utils/*`, `frontend/src/api.js`, `frontend/src/main.jsx` |
| Frontend components (per feature)     | `frontend/src/components/*.jsx`                                                                                      |
| Styles                                | `frontend/src/index.css`                                                                                             |
| Database schema + sample data         | `database/schema.sql`, `database/sample_data.json`                                                                   |
| Docs and run scripts                  | `README.md`, `answers.txt`, `start-backend.ps1`, `start-frontend.ps1`                                                |

## Extra

Just pull and drop `start-frontend.ps1` and `start-backend.ps1` in two terminals to start the app quickly.
