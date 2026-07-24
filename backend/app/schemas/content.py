from pydantic import BaseModel, model_validator, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

from app.schemas.taxonomy import CategoryResponse, TagResponse
# We will use a simplified User schema to avoid circular imports
class AuthorResponse(BaseModel):
    id: UUID
    email: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_following: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def extract_profile(cls, obj: Any) -> Any:
        # If it's a dict (e.g. from tests or dict representations), just return
        if isinstance(obj, dict):
            return obj
            
        # If it's an SQLAlchemy object
        profile = None
        if hasattr(obj, "profile") and obj.profile:
            profile = obj.profile[0] if isinstance(obj.profile, list) else obj.profile

        if profile:
            # We must mutate the object or return a dict. Returning a dict is easiest for Pydantic.
            return {
                "id": getattr(obj, "id", None),
                "email": getattr(obj, "email", None),
                "username": getattr(profile, "username", None),
                "first_name": getattr(profile, "first_name", None),
                "last_name": getattr(profile, "last_name", None),
                "avatar_url": getattr(profile, "avatar_url", None),
                "is_following": getattr(obj, "is_following", None),
            }
        
        # If no profile, but object has is_following, make sure we keep it
        if hasattr(obj, "is_following") and not isinstance(obj, dict):
            return {
                "id": getattr(obj, "id", None),
                "email": getattr(obj, "email", None),
                "is_following": getattr(obj, "is_following", None),
            }
            
        return obj

    class Config:
        from_attributes = True

# Shared properties
class BlogBase(BaseModel):
    title: str = Field(..., max_length=200)
    content: str = Field(..., max_length=100000) # 100k chars ~ 100KB max per blog
    is_published: Optional[bool] = False
    cover_image: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

from pydantic import BaseModel, model_validator, field_validator, Field
from app.core.sanitizer import sanitize_html

# Properties to receive on blog creation
class BlogCreate(BlogBase):
    slug: str = Field(..., max_length=200)
    tags: Optional[List[int]] = [] # list of tag IDs

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_blog_content(cls, v: Any) -> Any:
        if isinstance(v, str):
            return sanitize_html(v)
        return v

# Properties to receive on blog update
class BlogUpdate(BlogBase):
    slug: Optional[str] = Field(None, max_length=200)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, max_length=100000)
    tags: Optional[List[int]] = None
    scheduled_at: Optional[datetime] = None

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_blog_content(cls, v: Any) -> Any:
        if isinstance(v, str):
            return sanitize_html(v)
        return v

# Properties shared by models stored in DB
class BlogInDBBase(BlogBase):
    id: int
    slug: str
    author_id: UUID
    reading_time: Optional[int] = 0
    views: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Properties to return to client
class BlogResponse(BlogInDBBase):
    author: Optional[AuthorResponse] = None
    category: Optional[CategoryResponse] = None
    tags: Optional[List[TagResponse]] = []
    likes_count: int = 0
    comments_count: int = 0
    is_liked_by_user: bool = False
    is_bookmarked_by_user: bool = False


# Course Schemas
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[float] = 0.0
    thumbnail_url: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    title: Optional[str] = None

class CourseInDBBase(CourseBase):
    id: int
    instructor_id: UUID

    class Config:
        from_attributes = True

class CourseResponse(CourseInDBBase):
    pass

class ConnectionResponse(AuthorResponse):
    bio: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    followers_count: int = 0
    blogs_count: int = 0
    is_verified: bool = False
    recommendation_reason: Optional[str] = None
