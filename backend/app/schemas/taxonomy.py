from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    followers_count: Optional[int] = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True

class TagBase(BaseModel):
    name: str
    slug: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
