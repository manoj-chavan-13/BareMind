from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.profile import Profile
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_email_or_username(db: Session, identifier: str) -> Optional[User]:
    clean_identifier = identifier.strip()
    # Check by email
    user = db.query(User).filter(User.email.ilike(clean_identifier)).first()
    if user:
        return user
    # Check by username in Profile
    username_id = clean_identifier.lower().replace("@", "")
    profile = db.query(Profile).filter(Profile.username == username_id).first()
    if profile:
        return db.query(User).filter(User.id == profile.user_id).first()
    return None

def create_user(db: Session, user_in: UserCreate) -> User:
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(db_user)
    db.flush() # To get the user ID
    
    clean_username = user_in.username.strip().lower().replace("@", "") if user_in.username else user_in.email.split("@")[0]
    
    # Ensure username uniqueness
    existing = db.query(Profile).filter(Profile.username == clean_username).first()
    if existing:
        import random
        clean_username = f"{clean_username}{random.randint(100, 999)}"
    
    db_profile = Profile(
        user_id=db_user.id,
        username=clean_username,
        first_name=user_in.first_name,
        last_name=user_in.last_name
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)
    return db_user
