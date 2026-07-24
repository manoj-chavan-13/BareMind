from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4, Field
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=64)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    username: Optional[str] = Field(None, min_length=3, max_length=30)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=160)
    avatar_url: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=100)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., max_length=64)
    new_password: str = Field(..., min_length=8, max_length=64)

class UserInDBBase(UserBase):
    id: UUID4
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(UserInDBBase):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0

class UserProfileResponse(BaseModel):
    id: UUID4
    is_active: bool
    created_at: datetime
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None

    class Config:
        from_attributes = True
