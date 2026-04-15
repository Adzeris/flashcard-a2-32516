# Flashcard Learning App v2 (Assignment 2)

## Project Description

This project is a single-page flashcard learning system designed for subject revision. It improves on Assignment 1 by adding:

- secure authentication and role-based access (`user`, `admin`)
- live search for flashcards while typing
- full CRUD operations across three entities: `users`, `flashcards`, and `view_histories`
- an admin-only interface to review each user's learning history
- a guest mode with temporary shareable sessions (separate from user/admin data)

The system demonstrates a realistic business workflow where students create flashcards, track their own learning progress, and administrators audit activity.

## Technical Stack

- **Frontend:** React + Vite (SPA with one `index.html`)
- **Backend:** FastAPI (Python)
- **Database:** SQLite via SQLAlchemy ORM
- **Security:** JWT authentication + password hashing (`PBKDF2-SHA256`) + role-based access control

## Main Features

1. **Registration/Login**
   - User registration with hashed passwords
   - JWT-based login and authenticated API requests
2. **Flashcard CRUD**
   - Create, read, update, delete flashcards
   - Live search (`question`, `answer`) without page reload
   - Difficulty-based study filtering (level 1 shows only level 1, level 5 shows level 1-5)
3. **View History CRUD**
   - Add review records with notes and correctness
   - Edit/delete view history entries
4. **User/Profile CRUD**
   - Users update their profile details
   - Admin manages users and role assignment
5. **Admin Dashboard**
   - Admin can inspect all users
   - Admin can view each selected user's learning history
6. **Guest Mode**
   - Start temporary guest session without login
   - Share one URL token with others for the same temporary flashcard set
   - Guest data is isolated from registered users and expires automatically
7. **Study Modes**
   - Practice mode: flip and navigate cards without scoring
   - Exam mode: grade each answer as right/wrong and show final percentage
   - Optional shuffle when starting a study session

## Project Structure

```text
Assignment 2/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth_router.py
│   │   │   ├── flashcards_router.py
│   │   │   ├── guest_router.py
│   │   │   ├── histories_router.py
│   │   │   └── users_router.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── schema.sql
│   └── sample_data.json
├── start-backend.ps1
├── start-frontend.ps1
└── README.md
```

## Setup and Run

### 1) Backend

From `Assignment 2` root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt
uvicorn app.main:app --reload --host localhost --port 4533 --app-dir .\backend
```

Backend URL: `http://localhost:4533`

### 2) Frontend

Open a new terminal in `Assignment 2` root:

```powershell
cd .\frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5000`

### 3) Default Admin Account

- username: `admin`
- password: `admin123`

> Change these credentials for production use.

## API Highlights

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/flashcards`
- `GET/POST/PUT/DELETE /api/histories`
- `GET/PUT /api/users/me`
- `GET/PUT/DELETE /api/users` (admin)
- `GET /api/users/{user_id}/history` (admin)
- `POST/GET/PUT/DELETE /api/guest/sessions` (temporary guest link sessions)

## Design Rationale (Individual Marking Support)

- `useState` is used for local form and list state for clarity and low overhead.
- `useEffect` handles API synchronization (initial loading and live search updates).
- A small `api.js` wrapper centralizes request and error handling, reducing repeated code.
- Role checks are enforced in backend route dependencies to prevent frontend-only security assumptions.

## Security Notes

- Passwords are never stored in plain text; they are hashed with `PBKDF2-SHA256`.
- JWT tokens are required for protected endpoints.
- Role-based authorization controls admin-only operations.
- Sensitive values are moved to environment variables (`.env.example` provided).

## Workload Allocation (Group Requirement)

Fill this section before submission.

| Member | Student ID | Main Responsibilities | Key Files |
|---|---|---|---|
| Member 1 |  | Backend auth, models, API design | `backend/app/auth.py`, `backend/app/models.py`, `backend/app/routers/*` |
| Member 2 |  | Frontend views and SPA UX | `frontend/src/App.jsx`, `frontend/src/index.css`, `frontend/src/api.js` |
| Member 3 |  | Testing, README, video demo, deployment polish | `README.md`, `database/*`, test evidence files |

## Submission Checklist

- [ ] Public GitHub repository link included
- [ ] Source code uploaded
- [ ] Database export included (`database/schema.sql`, `database/sample_data.json`)
- [ ] README complete (title, stack, setup, structure, workload)
- [ ] One group video (<= 3 minutes) showing core frontend/business workflows

