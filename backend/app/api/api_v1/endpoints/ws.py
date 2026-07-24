"""
ws.py
─────
WebSocket endpoint for real-time notification delivery.

Connection URL:
    ws://localhost:8000/api/v1/ws/notifications?token=<JWT>

The client sends the access token as a query parameter because browser
WebSocket APIs do not support custom headers.  The server validates the JWT
before accepting the connection.

Lifecycle:
    1. Client connects with valid JWT → connection accepted
    2. WSManager subscribes to Redis Pub/Sub for this user
    3. Every notification event published to Redis gets forwarded to the client
    4. On disconnect → WSManager cleans up
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.core.security import decode_access_token
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/notifications")
async def ws_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    Real-time notifications WebSocket.

    Authenticate via ?token=<access_token>.
    Receives JSON messages:
        { "event": "notification", "data": { ...notification fields... } }
    """
    # ── Authenticate ──────────────────────────────────────────────────────────
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("WS: rejected connection — invalid token")
        return

    user_id: str = payload.get("sub")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # ── Connect ───────────────────────────────────────────────────────────────
    await ws_manager.connect(user_id, websocket)

    try:
        # Keep the connection alive.  The client may send pings ("ping") which
        # we echo back as pongs.  We do NOT process any other client messages.
        while True:
            try:
                text = await websocket.receive_text()
                if text == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception as exc:
                logger.debug("WS receive error: %s", exc)
                break
    finally:
        ws_manager.disconnect(user_id, websocket)
        logger.info("WS: user=%s disconnected", user_id)
