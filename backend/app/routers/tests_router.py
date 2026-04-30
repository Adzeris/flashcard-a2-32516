from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Flashcard, Test, User, ViewHistory
from ..schemas import TestCreate, TestOut, TestUpdate

router = APIRouter(prefix="/api/tests", tags=["Tests"])


def _to_test_out(db: Session, test: Test, current_user: User) -> TestOut:
    q = db.query(Flashcard).filter(Flashcard.category == test.name)
    if current_user.role != "admin":
        q = q.filter(Flashcard.user_id == test.user_id)
    count = q.count()
    return TestOut(
        id=test.id,
        user_id=test.user_id,
        name=test.name,
        created_at=test.created_at,
        flashcard_count=count,
    )


@router.get("", response_model=list[TestOut])
def list_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Test).filter(Test.user_id == current_user.id).order_by(Test.id.asc()).all()
    )
    return [_to_test_out(db, item, current_user) for item in items]


@router.post("", response_model=TestOut, status_code=201)
def create_test(
    payload: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    existing = (
        db.query(Test)
        .filter(Test.user_id == current_user.id, Test.name == name)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Test name already exists")

    item = Test(user_id=current_user.id, name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_test_out(db, item, current_user)


@router.put("/{test_id}", response_model=TestOut)
def update_test(
    test_id: int,
    payload: TestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(Test)
        .filter(Test.id == test_id, Test.user_id == current_user.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Test not found")

    name = payload.name.strip()
    duplicate = (
        db.query(Test)
        .filter(Test.user_id == current_user.id, Test.name == name, Test.id != test_id)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=400, detail="Test name already exists")

    previous_name = item.name
    item.name = name
    if previous_name != name:
        (
            db.query(Flashcard)
            .filter(Flashcard.user_id == current_user.id, Flashcard.category == previous_name)
            .update({Flashcard.category: name}, synchronize_session=False)
        )
    db.commit()
    db.refresh(item)
    return _to_test_out(db, item, current_user)


@router.delete("/{test_id}")
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(Test)
        .filter(Test.id == test_id, Test.user_id == current_user.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Test not found")

    flashcards = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == current_user.id, Flashcard.category == item.name)
        .all()
    )
    flashcard_ids = [card.id for card in flashcards]
    if flashcard_ids:
        (
            db.query(ViewHistory)
            .filter(ViewHistory.flashcard_id.in_(flashcard_ids))
            .delete(synchronize_session=False)
        )
        (
            db.query(Flashcard)
            .filter(Flashcard.id.in_(flashcard_ids))
            .delete(synchronize_session=False)
        )

    db.delete(item)
    db.commit()
    return {"message": "Test deleted"}
