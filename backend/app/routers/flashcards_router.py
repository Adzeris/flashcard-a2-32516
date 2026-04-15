from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Flashcard, User
from ..schemas import FlashcardCreate, FlashcardOut, FlashcardUpdate

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


def _to_flashcard_out(card: Flashcard) -> FlashcardOut:
    return FlashcardOut(
        id=card.id,
        user_id=card.user_id,
        owner_username=card.owner.username if card.owner else None,
        question=card.question,
        answer=card.answer,
        category=card.category,
        difficulty=card.difficulty,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.get("", response_model=list[FlashcardOut])
def list_flashcards(
    search: str = Query(default="", max_length=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Flashcard)
    if current_user.role != "admin":
        q = q.filter(Flashcard.user_id == current_user.id)

    search_term = search.strip()
    if search_term:
        like = f"%{search_term}%"
        q = q.filter(
            (Flashcard.question.ilike(like))
            | (Flashcard.answer.ilike(like))
            | (Flashcard.category.ilike(like))
        )

    cards = q.order_by(Flashcard.id.desc()).all()
    return [_to_flashcard_out(card) for card in cards]


@router.post("", response_model=FlashcardOut, status_code=201)
def create_flashcard(
    payload: FlashcardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = payload.user_id if (current_user.role == "admin" and payload.user_id) else current_user.id
    owner = db.query(User).filter(User.id == owner_id).first()
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner user not found")

    card = Flashcard(
        user_id=owner_id,
        question=payload.question.strip(),
        answer=payload.answer.strip(),
        category=payload.category.strip(),
        difficulty=payload.difficulty,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return _to_flashcard_out(card)


@router.put("/{card_id}", response_model=FlashcardOut)
def update_flashcard(
    card_id: int,
    payload: FlashcardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    if current_user.role != "admin" and card.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to edit this flashcard")

    if payload.question is not None:
        card.question = payload.question.strip()
    if payload.answer is not None:
        card.answer = payload.answer.strip()
    if payload.category is not None:
        card.category = payload.category.strip()
    if payload.difficulty is not None:
        card.difficulty = payload.difficulty

    db.commit()
    db.refresh(card)
    return _to_flashcard_out(card)


@router.delete("/{card_id}")
def delete_flashcard(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    if current_user.role != "admin" and card.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this flashcard")

    db.delete(card)
    db.commit()
    return {"message": "Flashcard deleted"}
