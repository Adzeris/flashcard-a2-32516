from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import get_password_hash
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth_router, flashcards_router, histories_router, users_router

app = FastAPI(title="Flashcard Learning App v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_default_admin(db: Session) -> None:
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        return

    default_admin = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        role="admin",
    )
    db.add(default_admin)
    db.commit()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(flashcards_router.router)
app.include_router(histories_router.router)
