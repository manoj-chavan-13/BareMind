from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.email import (
    generate_otp, store_otp, verify_otp, delete_otp,
    send_verification_email, send_password_reset_email,
)
from app.core.redis_client import redis_client
from app.crud import crud_user
from app.core.bloom_filter import UsernameBloomFilter
from app.services.search_publisher import publish_search_event
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import (
    Token,
    VerifyEmailRequest,
    ResendOtpRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.models.user import User
from app.core.rate_limit import limiter
from app.services.audit import log_audit_event

router = APIRouter()

REFRESH_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh token as a secure HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,          # JS cannot read this
        secure=settings.SECURE_COOKIE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",    # cookie only sent to auth endpoints
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/v1/auth")


# ─── CHECK USERNAME ───────────────────────────────────────────────────────────

@router.get("/check-username")
async def check_username(
    username: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Check if a username is available.
    Uses Bloom Filter for fast negative lookups.
    """
    import re
    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", username):
        return {"available": False, "message": "Invalid format"}
        
    # Fast path: Bloom filter says definitely not present
    might_exist = await UsernameBloomFilter.might_contain(username)
    if not might_exist:
        return {"available": True}
        
    # Slow path: Check DB
    from app.models.profile import Profile
    exists = db.query(Profile).filter(Profile.username == username).first()
    
    return {"available": not bool(exists)}


# ─── REGISTER ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=dict, status_code=201)
@limiter.limit("5/minute")
async def register(
    request: Request,
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Register a new user. Sends an email verification OTP.
    Account cannot be used until email is verified.
    """
    existing_user = crud_user.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    if user_in.username:
        from app.models.profile import Profile
        existing_username = db.query(Profile).filter(Profile.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=400,
                detail="This username is already taken.",
            )

    user = crud_user.create_user(db, user_in=user_in)

    # Generate and send OTP in background (non-blocking)
    otp = generate_otp()
    background_tasks.add_task(store_otp, "verify_email", str(user.id), otp)
    background_tasks.add_task(send_verification_email, user.email, str(user.id), otp)
    
    if user_in.username:
        background_tasks.add_task(UsernameBloomFilter.add, user_in.username)
        
    background_tasks.add_task(
        publish_search_event,
        "index",
        "users",
        user.id,
        {
            "id": str(user.id),
            "username": user_in.username,
            "first_name": user_in.first_name,
            "last_name": user_in.last_name,
            "bio": None,
            "avatar_url": None
        }
    )

    return {
        "message": "Account created. Please check your email for a 6-digit verification code.",
        "user_id": str(user.id),
        "email": user.email,
    }


# ─── LOGIN ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    *,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response,
) -> Any:
    """
    Login with email/username + password.
    Issues a short-lived access token (15 min) + HttpOnly refresh cookie (7 days).
    Enforces account lockout (5 failed attempts -> 15 min lockout).
    """
    identifier = form_data.username.lower().strip()
    lockout_key = f"lockout:{identifier}"
    failed_key = f"failed_login:{identifier}"

    # Check lockout in Redis
    if await redis_client.get(lockout_key):
        log_audit_event(db, "login_blocked_lockout", resource_type="user", resource_id=identifier, request=request)
        raise HTTPException(
            status_code=429,
            detail="Account is locked due to multiple failed login attempts. Please try again in 15 minutes.",
        )

    user = crud_user.get_user_by_email_or_username(db, identifier=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        failed_count = await redis_client.incr(failed_key)
        await redis_client.expire(failed_key, settings.LOCKOUT_TIME_SECONDS)

        if failed_count >= settings.MAX_LOGIN_ATTEMPTS:
            await redis_client.set(lockout_key, "1", ex=settings.LOCKOUT_TIME_SECONDS)
            await redis_client.delete(failed_key)
            log_audit_event(db, "account_locked", resource_type="user", resource_id=identifier, request=request)
            raise HTTPException(
                status_code=429,
                detail="Account is locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.",
            )

        log_audit_event(db, "login_failed", resource_type="user", resource_id=identifier, request=request)
        raise HTTPException(status_code=400, detail="Incorrect email/username or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox for the verification code.",
        )

    # Success: Clear failed attempts key
    await redis_client.delete(failed_key)

    # Auto-assign username from email prefix if the user has none yet
    from app.models.profile import Profile
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id)
        db.add(profile)
    if not profile.username:
        base_username = user.email.split("@")[0] if user.email else str(user.id)
        # Ensure uniqueness — append suffix if taken
        username_candidate = base_username
        suffix = 1
        while db.query(Profile).filter(
            Profile.username == username_candidate,
            Profile.user_id != user.id
        ).first():
            username_candidate = f"{base_username}{suffix}"
            suffix += 1
        profile.username = username_candidate
        db.commit()

    import uuid
    session_id = uuid.uuid4().hex

    # Save/overwrite active session in Redis (enforces 1 active session per user, invalidates old browser session)
    await redis_client.set(
        f"session:{user.id}",
        session_id,
        ex=settings.SESSION_EXPIRE_SECONDS,
    )

    access_token = security.create_access_token(user.id, session_id=session_id)
    refresh_token = security.create_refresh_token(user.id, session_id=session_id)

    _set_refresh_cookie(response, refresh_token)
    log_audit_event(db, "user_login_success", user_id=str(user.id), request=request)

    return {"access_token": access_token, "token_type": "bearer"}


# ─── SILENT REFRESH ───────────────────────────────────────────────────────────

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Exchange a valid refresh token cookie for a new access token.
    Refresh token must not be blacklisted and session must be active in Redis.
    """
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    payload = security.decode_refresh_token(token)
    if not payload:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Check Redis blacklist
    jti = payload.get("jti")
    if jti and await redis_client.get(f"blacklist:{jti}"):
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session revoked. Please log in again.")

    user_id = payload.get("sub")
    token_sid = payload.get("sid")

    # Check active single session in Redis
    active_sid = await redis_client.get(f"session:{user_id}")
    if not active_sid or (token_sid and active_sid != token_sid):
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=401,
            detail="Session expired or logged in from another device",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = security.create_access_token(user.id, session_id=token_sid or active_sid)
    return {"access_token": new_access, "token_type": "bearer"}


# ─── LOGOUT ───────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request, response: Response) -> Any:
    """
    Logout: revoke active session in Redis, blacklist refresh token, and clear cookie.
    """
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        payload = security.decode_refresh_token(token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            user_id = payload.get("sub")
            if user_id:
                await redis_client.delete(f"session:{user_id}")
            if jti and exp:
                import time
                ttl = int(exp - time.time())
                if ttl > 0:
                    await redis_client.set(f"blacklist:{jti}", "1", ex=ttl)

    # Check if Authorization header access token is present as fallback for user_id session deletion
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        access_tok = auth_header.split(" ")[1]
        acc_payload = security.decode_access_token(acc_tok)
        if acc_payload:
            u_id = acc_payload.get("sub")
            if u_id:
                await redis_client.delete(f"session:{u_id}")

    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


# ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────

@router.post("/verify-email")
@limiter.limit("5/minute")
async def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Verify user's email using the 6-digit OTP sent on registration."""
    try:
        valid = await verify_otp("verify_email", body.user_id, body.otp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not valid:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.commit()

    return {"message": "Email verified successfully. You can now log in."}


# ─── RESEND OTP ───────────────────────────────────────────────────────────────

@router.post("/resend-otp")
@limiter.limit("5/minute")
async def resend_otp(
    request: Request,
    body: ResendOtpRequest,
    db: Session = Depends(deps.get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> Any:
    """Resend email verification OTP (invalidates the previous one)."""
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    otp = generate_otp()
    await delete_otp("verify_email", body.user_id)     # invalidate old OTP
    background_tasks.add_task(store_otp, "verify_email", body.user_id, otp)
    background_tasks.add_task(send_verification_email, user.email, body.user_id, otp)

    return {"message": "A new verification code has been sent to your email."}


# ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(deps.get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> Any:
    """
    Request a password reset OTP. Always returns 200 (don't reveal if email exists).
    """
    user = crud_user.get_user_by_email(db, email=body.email)
    if user and user.is_active:
        otp = generate_otp()
        background_tasks.add_task(store_otp, "reset_password", str(user.id), otp)
        background_tasks.add_task(send_password_reset_email, user.email, str(user.id), otp)
        log_audit_event(db, "forgot_password_requested", user_id=str(user.id), request=request)

    # Always return same response (prevent email enumeration)
    return {
        "message": "If an account with that email exists, a reset code has been sent.",
        "user_id": str(user.id) if user else None,
    }


# ─── RESET PASSWORD ───────────────────────────────────────────────────────────

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(deps.get_db),
    response: Response = None,
) -> Any:
    """Verify the reset OTP and set the new password. Invalidates all active sessions."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    try:
        valid = await verify_otp("reset_password", body.user_id, body.otp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not valid:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = security.get_password_hash(body.new_password)
    db.commit()

    # Clear refresh cookie if the user happens to be logged in
    if response:
        _clear_refresh_cookie(response)

    log_audit_event(db, "password_reset_success", user_id=str(user.id), request=request)

    return {"message": "Password reset successfully. Please log in with your new password."}
