import secrets
import json
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings
from app.core.redis_client import redis_client

# ─── FastAPI-Mail connection config ────────────────────────────────────────────
mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAILS_FROM_EMAIL,
    MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

fastmail = FastMail(mail_config)


# ─── OTP Helpers ───────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _otp_key(purpose: str, user_id: str) -> str:
    return f"otp:{purpose}:{user_id}"


async def store_otp(purpose: str, user_id: str, otp: str) -> None:
    """Store OTP in Redis with expiry. Overwrites any existing OTP for this user+purpose."""
    key = _otp_key(purpose, user_id)
    value = json.dumps({"code": otp, "attempts": 0})
    await redis_client.set(key, value, ex=settings.OTP_EXPIRE_SECONDS)


async def verify_otp(purpose: str, user_id: str, code: str) -> bool:
    """
    Verify submitted OTP.
    - Increments attempt counter.
    - Deletes key after success OR after max attempts.
    Returns True if correct, False otherwise.
    Raises ValueError if OTP expired or max attempts exceeded.
    """
    key = _otp_key(purpose, user_id)
    raw = await redis_client.get(key)
    if not raw:
        raise ValueError("OTP expired or not found. Please request a new one.")

    data = json.loads(raw)
    attempts = data.get("attempts", 0) + 1

    if attempts > settings.OTP_MAX_ATTEMPTS:
        await redis_client.delete(key)
        raise ValueError("Too many incorrect attempts. Please request a new OTP.")

    if data["code"] != code:
        # Update attempt count
        data["attempts"] = attempts
        # Preserve remaining TTL
        ttl = await redis_client.ttl(key)
        await redis_client.set(key, json.dumps(data), ex=max(ttl, 1))
        return False

    # Correct — delete immediately (one-time use)
    await redis_client.delete(key)
    return True


async def delete_otp(purpose: str, user_id: str) -> None:
    """Manually invalidate an OTP (e.g., on resend)."""
    key = _otp_key(purpose, user_id)
    await redis_client.delete(key)


# ─── Email Senders ─────────────────────────────────────────────────────────────

async def send_verification_email(
    email: str,
    user_id: str,
    otp: str
) -> None:
    """Send BareMind email verification OTP."""
    
    if not settings.SMTP_USER:
        print(f"\n{'='*50}\n[MOCK EMAIL] To: {email}\nSubject: Verify your BareMind account\nOTP: {otp}\n{'='*50}\n")
        return

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">

        <title>Verify your BareMind email</title>
    </head>

    <body
        style="
            margin: 0;
            padding: 0;
            background-color: #f6f7f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                         Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
        "
    >

        <!-- PAGE -->
        <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
                width: 100%;
                background-color: #f6f7f8;
            "
        >
            <tr>
                <td
                    align="center"
                    style="padding: 48px 16px;"
                >

                    <!-- EMAIL CONTAINER -->
                    <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                            width: 100%;
                            max-width: 520px;
                        "
                    >

                        <!-- BRAND -->
                        <tr>
                            <td
                                align="center"
                                style="padding-bottom: 20px;"
                            >
                                <div
                                    style="
                                        font-size: 22px;
                                        line-height: 28px;
                                        font-weight: 800;
                                        letter-spacing: -0.8px;
                                        color: #111827;
                                    "
                                >
                                    Bare<span style="color: #E05A47;">Mind</span>
                                </div>
                            </td>
                        </tr>

                        <!-- CARD -->
                        <tr>
                            <td
                                style="
                                    background-color: #ffffff;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 18px;
                                    padding: 40px;
                                "
                            >

                                <!-- ICON -->
                                <table
                                    role="presentation"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            align="center"
                                            valign="middle"
                                            width="42"
                                            height="42"
                                            style="
                                                width: 42px;
                                                height: 42px;
                                                background-color: #fff1ee;
                                                border-radius: 12px;
                                                color: #E05A47;
                                                font-size: 18px;
                                                font-weight: 800;
                                            "
                                        >
                                            ✓
                                        </td>
                                    </tr>
                                </table>

                                <!-- HEADING -->
                                <h1
                                    style="
                                        margin: 22px 0 8px;
                                        padding: 0;

                                        font-size: 24px;
                                        line-height: 32px;
                                        font-weight: 800;
                                        letter-spacing: -0.6px;

                                        color: #111827;
                                    "
                                >
                                    Verify your email
                                </h1>

                                <!-- DESCRIPTION -->
                                <p
                                    style="
                                        margin: 0;
                                        padding: 0;

                                        max-width: 400px;

                                        font-size: 14px;
                                        line-height: 22px;
                                        font-weight: 400;

                                        color: #64748b;
                                    "
                                >
                                    You're almost ready to start using BareMind.
                                    Enter the verification code below to confirm
                                    your email address.
                                </p>

                                <!-- OTP LABEL -->
                                <p
                                    style="
                                        margin: 30px 0 10px;

                                        font-size: 11px;
                                        line-height: 16px;
                                        font-weight: 700;

                                        letter-spacing: 1.2px;
                                        text-transform: uppercase;

                                        color: #94a3b8;
                                    "
                                >
                                    Your verification code
                                </p>

                                <!-- OTP BOX -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            align="center"
                                            style="
                                                padding: 24px 16px;

                                                background-color: #fafafa;

                                                border: 1px solid #e5e7eb;
                                                border-radius: 14px;
                                            "
                                        >
                                            <span
                                                style="
                                                    font-family:
                                                        'SFMono-Regular',
                                                        Consolas,
                                                        'Liberation Mono',
                                                        monospace;

                                                    font-size: 34px;
                                                    line-height: 42px;
                                                    font-weight: 700;

                                                    letter-spacing: 8px;

                                                    color: #111827;
                                                "
                                            >
                                                {otp}
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <!-- EXPIRY -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    style="margin-top: 14px;"
                                >
                                    <tr>
                                        <td
                                            style="
                                                font-size: 12px;
                                                line-height: 18px;
                                                color: #64748b;
                                            "
                                        >
                                            This code expires in
                                            <strong style="color: #334155;">
                                                10 minutes
                                            </strong>
                                            and can only be used once.
                                        </td>
                                    </tr>
                                </table>

                                <!-- DIVIDER -->
                                <div
                                    style="
                                        height: 1px;
                                        background-color: #f1f5f9;
                                        margin: 30px 0 22px;
                                    "
                                ></div>

                                <!-- SECURITY MESSAGE -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            valign="top"
                                            style="
                                                width: 24px;
                                                font-size: 14px;
                                                color: #94a3b8;
                                                padding-top: 1px;
                                            "
                                        >
                                            ◇
                                        </td>

                                        <td>
                                            <p
                                                style="
                                                    margin: 0 0 3px;

                                                    font-size: 12px;
                                                    line-height: 18px;
                                                    font-weight: 700;

                                                    color: #475569;
                                                "
                                            >
                                                Didn't create this account?
                                            </p>

                                            <p
                                                style="
                                                    margin: 0;

                                                    font-size: 12px;
                                                    line-height: 19px;

                                                    color: #94a3b8;
                                                "
                                            >
                                                You can safely ignore this email.
                                                No account verification will occur
                                                without this code.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td
                                align="center"
                                style="
                                    padding: 22px 20px 0;
                                "
                            >
                                <p
                                    style="
                                        margin: 0;

                                        font-size: 11px;
                                        line-height: 18px;

                                        color: #94a3b8;
                                    "
                                >
                                    This email was sent to
                                    <span
                                        style="
                                            color: #64748b;
                                            font-weight: 600;
                                        "
                                    >
                                        {email}
                                    </span>
                                </p>

                                <p
                                    style="
                                        margin: 6px 0 0;

                                        font-size: 11px;
                                        line-height: 18px;

                                        color: #c0c7d0;
                                    "
                                >
                                    © BareMind · Write freely. Think deeply.
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    """

    # Send using your existing mail service here.


    message = MessageSchema(
        subject="Verify your BareMind account",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )
    await fastmail.send_message(message)


async def send_password_reset_email(email: str, user_id: str, otp: str) -> None:
    """Send BareMind password reset OTP."""

    if not settings.SMTP_USER:
        print(f"\n{'='*50}\n[MOCK EMAIL] To: {email}\nSubject: Reset your BareMind password\nOTP: {otp}\n{'='*50}\n")
        return

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">

        <title>Reset your BareMind password</title>
    </head>

    <body
        style="
            margin: 0;
            padding: 0;
            background-color: #f6f7f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                         Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
        "
    >

        <!-- PAGE -->
        <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
                width: 100%;
                background-color: #f6f7f8;
            "
        >
            <tr>
                <td
                    align="center"
                    style="padding: 48px 16px;"
                >

                    <!-- EMAIL CONTAINER -->
                    <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                            width: 100%;
                            max-width: 520px;
                        "
                    >

                        <!-- =================================
                             BRAND
                        ================================== -->

                        <tr>
                            <td
                                align="center"
                                style="padding-bottom: 20px;"
                            >
                                <div
                                    style="
                                        font-size: 22px;
                                        line-height: 28px;
                                        font-weight: 800;
                                        letter-spacing: -0.8px;
                                        color: #111827;
                                    "
                                >
                                    Bare<span style="color: #E05A47;">Mind</span>
                                </div>
                            </td>
                        </tr>

                        <!-- =================================
                             MAIN CARD
                        ================================== -->

                        <tr>
                            <td
                                style="
                                    background-color: #ffffff;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 18px;
                                    padding: 40px;
                                "
                            >

                                <!-- Security icon -->
                                <table
                                    role="presentation"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            align="center"
                                            valign="middle"
                                            width="42"
                                            height="42"
                                            style="
                                                width: 42px;
                                                height: 42px;

                                                background-color: #fff1ee;
                                                border-radius: 12px;

                                                color: #E05A47;
                                                font-size: 18px;
                                                font-weight: 800;
                                            "
                                        >
                                            &#128274;
                                        </td>
                                    </tr>
                                </table>

                                <!-- Heading -->
                                <h1
                                    style="
                                        margin: 22px 0 8px;
                                        padding: 0;

                                        font-size: 24px;
                                        line-height: 32px;
                                        font-weight: 800;
                                        letter-spacing: -0.6px;

                                        color: #111827;
                                    "
                                >
                                    Reset your password
                                </h1>

                                <!-- Description -->
                                <p
                                    style="
                                        margin: 0;
                                        padding: 0;

                                        max-width: 410px;

                                        font-size: 14px;
                                        line-height: 22px;

                                        color: #64748b;
                                    "
                                >
                                    We received a request to reset the
                                    password for your BareMind account.
                                    Enter the verification code below to
                                    continue.
                                </p>

                                <!-- =================================
                                     OTP
                                ================================== -->

                                <p
                                    style="
                                        margin: 30px 0 10px;

                                        font-size: 11px;
                                        line-height: 16px;
                                        font-weight: 700;

                                        letter-spacing: 1.2px;
                                        text-transform: uppercase;

                                        color: #94a3b8;
                                    "
                                >
                                    Password reset code
                                </p>

                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            align="center"
                                            style="
                                                padding: 24px 16px;

                                                background-color: #fafafa;

                                                border: 1px solid #e5e7eb;
                                                border-radius: 14px;
                                            "
                                        >
                                            <span
                                                style="
                                                    font-family:
                                                        'SFMono-Regular',
                                                        Consolas,
                                                        'Liberation Mono',
                                                        monospace;

                                                    font-size: 34px;
                                                    line-height: 42px;
                                                    font-weight: 700;

                                                    letter-spacing: 8px;

                                                    color: #111827;
                                                "
                                            >
                                                {otp}
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Expiry -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    style="margin-top: 14px;"
                                >
                                    <tr>
                                        <td
                                            style="
                                                font-size: 12px;
                                                line-height: 18px;
                                                color: #64748b;
                                            "
                                        >
                                            This code expires in
                                            <strong style="color: #334155;">
                                                10 minutes
                                            </strong>
                                            and can only be used once.
                                        </td>
                                    </tr>
                                </table>

                                <!-- =================================
                                     SECURITY NOTICE
                                ================================== -->

                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    style="
                                        margin-top: 26px;

                                        background-color: #fff8f6;
                                        border: 1px solid #fde8e4;
                                        border-radius: 12px;
                                    "
                                >
                                    <tr>
                                        <td
                                            style="
                                                padding: 14px 16px;
                                            "
                                        >
                                            <p
                                                style="
                                                    margin: 0 0 4px;

                                                    font-size: 12px;
                                                    line-height: 18px;
                                                    font-weight: 700;

                                                    color: #334155;
                                                "
                                            >
                                                Keep this code private
                                            </p>

                                            <p
                                                style="
                                                    margin: 0;

                                                    font-size: 11px;
                                                    line-height: 18px;

                                                    color: #64748b;
                                                "
                                            >
                                                BareMind will never ask you
                                                to send this verification
                                                code to another person.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Divider -->
                                <div
                                    style="
                                        height: 1px;
                                        background-color: #f1f5f9;
                                        margin: 26px 0 22px;
                                    "
                                ></div>

                                <!-- =================================
                                     NOT YOU?
                                ================================== -->

                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                >
                                    <tr>
                                        <td
                                            valign="top"
                                            style="
                                                width: 25px;
                                                padding-top: 1px;

                                                font-size: 14px;
                                                color: #94a3b8;
                                            "
                                        >
                                            &#9671;
                                        </td>

                                        <td>
                                            <p
                                                style="
                                                    margin: 0 0 3px;

                                                    font-size: 12px;
                                                    line-height: 18px;
                                                    font-weight: 700;

                                                    color: #475569;
                                                "
                                            >
                                                Didn't request this?
                                            </p>

                                            <p
                                                style="
                                                    margin: 0;

                                                    font-size: 12px;
                                                    line-height: 19px;

                                                    color: #94a3b8;
                                                "
                                            >
                                                You can safely ignore this
                                                email. Your password will
                                                remain unchanged unless this
                                                code is successfully used.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>

                        <!-- =================================
                             FOOTER
                        ================================== -->

                        <tr>
                            <td
                                align="center"
                                style="
                                    padding: 22px 20px 0;
                                "
                            >
                                <p
                                    style="
                                        margin: 0;

                                        font-size: 11px;
                                        line-height: 18px;

                                        color: #94a3b8;
                                    "
                                >
                                    This security email was sent to

                                    <span
                                        style="
                                            color: #64748b;
                                            font-weight: 600;
                                        "
                                    >
                                        {email}
                                    </span>
                                </p>

                                <p
                                    style="
                                        margin: 6px 0 0;

                                        font-size: 11px;
                                        line-height: 18px;

                                        color: #c0c7d0;
                                    "
                                >
                                    © BareMind · Account Security
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    """

    # Use your existing email sender here.
    message = MessageSchema(
        subject="Reset your BareMind password",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )
    await fastmail.send_message(message)
