import json
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GuestSession
from ..schemas import GuestSessionCreate, GuestSessionOut, GuestSessionUpdate

router = APIRouter(prefix="/api/guest", tags=["Guest Sessions"])


def _is_expired(session: GuestSession) -> bool:
    return session.expires_at < datetime.utcnow()


def _load_cards(session: GuestSession):
    try:
        cards = json.loads(session.flashcards_json)
        return cards if isinstance(cards, list) else []
    except json.JSONDecodeError:
        return []


def _to_guest_out(session: GuestSession) -> GuestSessionOut:
    return GuestSessionOut(
        token=session.token,
        title=session.title,
        flashcards=_load_cards(session),
        created_at=session.created_at,
        expires_at=session.expires_at,
    )


def _require_active_session(token: str, db: Session) -> GuestSession:
    session = db.query(GuestSession).filter(GuestSession.token == token).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Guest session not found")
    if _is_expired(session):
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=410, detail="Guest session expired")
    return session


@router.post("/sessions", response_model=GuestSessionOut, status_code=201)
def create_guest_session(payload: GuestSessionCreate, db: Session = Depends(get_db)):
    token = secrets.token_urlsafe(18)
    title = (payload.title or "Guest Session").strip() or "Guest Session"

    session = GuestSession(
        token=token,
        title=title,
        flashcards_json="[]",
        expires_at=datetime.utcnow() + timedelta(hours=payload.expires_in_hours),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _to_guest_out(session)


@router.get("/sessions/{token}", response_model=GuestSessionOut)
def get_guest_session(token: str, db: Session = Depends(get_db)):
    session = _require_active_session(token, db)
    return _to_guest_out(session)


@router.put("/sessions/{token}", response_model=GuestSessionOut)
def update_guest_session(
    token: str, payload: GuestSessionUpdate, db: Session = Depends(get_db)
):
    session = _require_active_session(token, db)

    if payload.title is not None:
        session.title = payload.title.strip() or "Guest Session"

    if payload.flashcards is not None:
        cards = [card.model_dump() for card in payload.flashcards]
        session.flashcards_json = json.dumps(cards)

    db.commit()
    db.refresh(session)
    return _to_guest_out(session)


@router.delete("/sessions/{token}")
def delete_guest_session(token: str, db: Session = Depends(get_db)):
    session = db.query(GuestSession).filter(GuestSession.token == token).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Guest session not found")
    db.delete(session)
    db.commit()
    return {"message": "Guest session deleted"}
