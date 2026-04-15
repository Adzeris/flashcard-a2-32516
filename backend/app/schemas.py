from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: int | None = None


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=72)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=72)
    role: str | None = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    created_at: datetime


class FlashcardBase(BaseModel):
    question: str = Field(min_length=2)
    answer: str = Field(min_length=1)
    category: str = Field(default="General", min_length=2, max_length=80)
    difficulty: int = Field(default=1, ge=1, le=5)


class FlashcardCreate(FlashcardBase):
    user_id: int | None = None


class FlashcardUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=2)
    answer: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    difficulty: int | None = Field(default=None, ge=1, le=5)


class FlashcardOut(FlashcardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    owner_username: str | None = None
    created_at: datetime
    updated_at: datetime


class ViewHistoryBase(BaseModel):
    flashcard_id: int
    notes: str | None = None
    was_correct: bool | None = None


class ViewHistoryCreate(ViewHistoryBase):
    user_id: int | None = None


class ViewHistoryUpdate(BaseModel):
    notes: str | None = None
    was_correct: bool | None = None


class ViewHistoryOut(ViewHistoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    viewed_at: datetime
    flashcard_question: str | None = None
    username: str | None = None
