from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.core.redis_client import redis_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


async def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    """
    Validate the short-lived access token from Authorization header and check session validity in Redis.
    Raises 401 if missing, invalid, or session invalidated by another login.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = security.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    token_sid = payload.get("sid")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate active session in Redis
    active_sid = await redis_client.get(f"session:{user_id}")
    if not active_sid or not token_sid or active_sid != token_sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated or logged in from another device",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extend active session TTL on activity (sliding window)
    await redis_client.expire(f"session:{user_id}", settings.SESSION_EXPIRE_SECONDS)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    """
    Return the User if authenticated and session is active in Redis, else return None.
    Does not raise an error if unauthenticated.
    """
    if not token:
        return None
    payload = security.decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    token_sid = payload.get("sid")
    active_sid = await redis_client.get(f"session:{user_id}")
    if not active_sid or not token_sid or active_sid != token_sid:
        return None

    return db.query(User).filter(User.id == user_id).first()


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensures the user account is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Ensures the user has verified their email via OTP."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your account first.",
        )
    return current_user
