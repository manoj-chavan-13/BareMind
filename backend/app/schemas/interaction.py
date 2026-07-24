from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.core.sanitizer import sanitize_html

class CommentBase(BaseModel):
    content: str = Field(..., max_length=2000)
    parent_id: Optional[int] = None

class CommentCreate(CommentBase):
    @field_validator("content", mode="before")
    @classmethod
    def sanitize_comment(cls, v: Any) -> Any:
        if isinstance(v, str):
            return sanitize_html(v)
        return v

from app.schemas.content import AuthorResponse

class CommentResponse(CommentBase):
    id: int
    user_id: UUID
    blog_id: int
    user: Optional[AuthorResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LikeResponse(BaseModel):
    id: int
    user_id: UUID
    blog_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BookmarkResponse(BaseModel):
    id: int
    user_id: UUID
    blog_id: int
    created_at: datetime

    class Config:
        from_attributes = True
