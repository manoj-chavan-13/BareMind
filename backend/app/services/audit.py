from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    """
    Log a security or system action to the audit_logs table.
    Captures IP address and User-Agent from Request if provided.
    """
    try:
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        log_entry = AuditLog(
            user_id=str(user_id) if user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Audit log error: {e}")
        db.rollback()
