from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class FollowerResponse(BaseModel):
    id: int
    follower_id: UUID
    following_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: UUID
    type: str
    content: str
    is_read: bool
    related_user_id: Optional[UUID] = None
    related_blog_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
