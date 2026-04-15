from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Flashcard, User, ViewHistory
from ..schemas import ViewHistoryCreate, ViewHistoryOut, ViewHistoryUpdate

router = APIRouter(prefix="/api/histories", tags=["View History"])


def _to_history_out(item: ViewHistory) -> ViewHistoryOut:
    return ViewHistoryOut(
        id=item.id,
        user_id=item.user_id,
        flashcard_id=item.flashcard_id,
        notes=item.notes,
        was_correct=item.was_correct,
        viewed_at=item.viewed_at,
        flashcard_question=item.flashcard.question if item.flashcard else None,
        username=item.user.username if item.user else None,
    )


@router.get("", response_model=list[ViewHistoryOut])
def list_histories(
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ViewHistory)
    if current_user.role != "admin":
        q = q.filter(ViewHistory.user_id == current_user.id)
    elif user_id is not None:
        q = q.filter(ViewHistory.user_id == user_id)

    items = q.order_by(ViewHistory.id.desc()).all()
    return [_to_history_out(item) for item in items]


@router.post("", response_model=ViewHistoryOut, status_code=201)
def create_history(
    payload: ViewHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = payload.user_id if (current_user.role == "admin" and payload.user_id) else current_user.id
    card = db.query(Flashcard).filter(Flashcard.id == payload.flashcard_id).first()
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    item = ViewHistory(
        user_id=owner_id,
        flashcard_id=payload.flashcard_id,
        notes=payload.notes.strip() if payload.notes else None,
        was_correct=payload.was_correct,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_history_out(item)


@router.put("/{history_id}", response_model=ViewHistoryOut)
def update_history(
    history_id: int,
    payload: ViewHistoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ViewHistory).filter(ViewHistory.id == history_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="History not found")
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this history")

    item.notes = payload.notes.strip() if payload.notes else None
    item.was_correct = payload.was_correct
    db.commit()
    db.refresh(item)
    return _to_history_out(item)


@router.delete("/{history_id}")
def delete_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ViewHistory).filter(ViewHistory.id == history_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="History not found")
    if current_user.role != "admin" and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this history")

    db.delete(item)
    db.commit()
    return {"message": "History deleted"}
