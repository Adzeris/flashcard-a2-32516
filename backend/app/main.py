import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import get_password_hash
from .database import Base, SessionLocal, engine
from .models import Flashcard, Test, User
from .routers import (
    auth_router,
    flashcards_router,
    guest_router,
    histories_router,
    tests_router,
    users_router,
)

app = FastAPI(title="Flashcard Learning App v2", version="2.0.0")

# CORS: dev frontend lives on a different port (5000) than this API (4533),
# so the browser would otherwise block fetches. We don't use cookies for
# auth (it's a Bearer token in headers), so allow_credentials stays False
# which lets us safely keep allow_origins="*" for local dev.
allowed_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_default_admin(db: Session) -> None:
    admin = db.query(User).filter(User.role == "admin").first()
    if not admin:
        # The default password is only for first-run convenience so the marker
        # has something to log in with. Override via ADMIN_DEFAULT_PASSWORD
        # env var in any non-trivial deployment.
        default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash(default_password),
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    existing_count = db.query(Test).filter(Test.user_id == admin.id).count()
    if existing_count == 0:
        for name in ("Test 1", "Test 2", "Test 3"):
            db.add(Test(user_id=admin.id, name=name))
        db.commit()


def ensure_users_have_default_tests(db: Session) -> None:
    users = db.query(User).all()
    for user in users:
        existing_count = db.query(Test).filter(Test.user_id == user.id).count()
        if existing_count == 0:
            for name in ("Test 1", "Test 2", "Test 3"):
                db.add(Test(user_id=user.id, name=name))
    db.commit()


def migrate_legacy_flashcard_categories(db: Session) -> None:
    users = db.query(User).all()
    for user in users:
        tests = db.query(Test).filter(Test.user_id == user.id).order_by(Test.id.asc()).all()
        if not tests:
            continue
        valid_names = {test.name for test in tests}
        fallback_name = tests[0].name
        cards = db.query(Flashcard).filter(Flashcard.user_id == user.id).all()
        changed = False
        for card in cards:
            if card.category not in valid_names:
                card.category = fallback_name
                changed = True
        if changed:
            db.commit()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_admin(db)
        ensure_users_have_default_tests(db)
        migrate_legacy_flashcard_categories(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(tests_router.router)
app.include_router(users_router.router)
app.include_router(flashcards_router.router)
app.include_router(histories_router.router)
app.include_router(guest_router.router)
