-- Same schema the SQLAlchemy models in backend/app/models.py create.
-- Just here so the marker can see the tables without running the app.

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL
);

CREATE UNIQUE INDEX ix_users_username ON users (username);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_id ON users (id);

CREATE TABLE tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    name VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_tests_user_name UNIQUE (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX ix_tests_user_id ON tests (user_id);

CREATE TABLE flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    difficulty INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX ix_flashcards_user_id ON flashcards (user_id);

CREATE TABLE view_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    flashcard_id INTEGER NOT NULL,
    notes TEXT,
    was_correct BOOLEAN,
    viewed_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (flashcard_id) REFERENCES flashcards (id)
);

CREATE TABLE guest_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    token VARCHAR(64) NOT NULL,
    title VARCHAR(120) NOT NULL,
    flashcards_json TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL
);

CREATE UNIQUE INDEX ix_guest_sessions_token ON guest_sessions (token);
