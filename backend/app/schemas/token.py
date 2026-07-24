from pydantic import BaseModel, Field
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None
    jti: Optional[str] = None

# ─── OTP / Auth request bodies ─────────────────────────────────────────────────

class VerifyEmailRequest(BaseModel):
    user_id: str
    otp: str

class ResendOtpRequest(BaseModel):
    user_id: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    user_id: str
    otp: str
    new_password: str = Field(..., min_length=8, max_length=64)
