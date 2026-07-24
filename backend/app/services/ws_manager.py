"""
ws_manager.py
─────────────
WebSocket Connection Manager — maintains per-user WebSocket connections and
fans out messages received from Redis Pub/Sub to all active browser tabs for
that user.

Architecture:
    Redis Pub/Sub channel: "notifications:{user_id}"
         │
         ▼
    [WSManager.subscribe_and_forward]  ← asyncio task per connected user
         │
         ▼
    WebSocket.send_text  →  Browser
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, List

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.config import settings

logger = logging.getLogger(__name__)


class WSManager:
    """
    Manages WebSocket connections grouped by user_id.

    One asyncio background task per *user* (not per connection) subscribes to
    that user's Redis channel.  If a user has multiple tabs open they all share
    the same subscription task.
    """

    def __init__(self):
        # user_id (str) → list of active WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = defaultdict(list)
        # user_id → asyncio.Task that reads Redis Pub/Sub and forwards to WS
        self._sub_tasks: Dict[str, asyncio.Task] = {}
        self._redis: aioredis.Redis | None = None

    # ─── Lifecycle ────────────────────────────────────────────────────────────

    async def startup(self):
        """Create the shared Redis client for Pub/Sub."""
        try:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._redis.ping()
            logger.info("WSManager: Redis connected ✓")
        except Exception as exc:
            logger.error("WSManager: Redis connection failed — %s", exc)
            self._redis = None

    async def shutdown(self):
        for task in self._sub_tasks.values():
            task.cancel()
        if self._redis:
            await self._redis.close()

    # ─── Connect / Disconnect ─────────────────────────────────────────────────

    async def connect(self, user_id: str, ws: WebSocket):
        """Register a new WebSocket connection for the given user."""
        await ws.accept()
        self._connections[user_id].append(ws)
        logger.info("WS connected: user=%s, total_tabs=%d", user_id, len(self._connections[user_id]))

        # Start a Redis subscriber task for this user if not already running
        if user_id not in self._sub_tasks or self._sub_tasks[user_id].done():
            task = asyncio.create_task(self._subscribe(user_id))
            self._sub_tasks[user_id] = task

    def disconnect(self, user_id: str, ws: WebSocket):
        """Remove a WebSocket connection; cancel the subscriber when last tab closes."""
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)

        if not conns:
            # No more open tabs for this user — stop Redis subscription
            task = self._sub_tasks.pop(user_id, None)
            if task:
                task.cancel()
            self._connections.pop(user_id, None)
            logger.info("WS disconnected (last tab): user=%s", user_id)
        else:
            logger.info("WS disconnected (tab): user=%s, remaining=%d", user_id, len(conns))

    # ─── Send ─────────────────────────────────────────────────────────────────

    async def send_to_user(self, user_id: str, message: dict):
        """Push a JSON message to all open WebSocket connections for a user."""
        dead: List[WebSocket] = []
        text = json.dumps(message)
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(user_id, ws)

    # ─── Redis Pub/Sub Subscriber ─────────────────────────────────────────────

    async def _subscribe(self, user_id: str):
        """
        Background task: subscribe to 'notifications:{user_id}' on Redis and
        forward every message to all WebSocket connections for this user.
        """
        if not self._redis:
            logger.warning("WSManager._subscribe: Redis unavailable, skipping for user=%s", user_id)
            return

        channel = f"notifications:{user_id}"
        pubsub = self._redis.pubsub()

        try:
            await pubsub.subscribe(channel)
            logger.info("WSManager: Subscribed to Redis channel %s", channel)

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                try:
                    data = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    continue

                # Forward to all open tabs
                await self.send_to_user(user_id, {"event": "notification", "data": data})

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("WSManager._subscribe error for user=%s: %s", user_id, exc)
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
            except Exception:
                pass


# ── Module-level singleton ────────────────────────────────────────────────────
ws_manager = WSManager()
