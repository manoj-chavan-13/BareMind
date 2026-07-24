"""
notification_publisher.py
─────────────────────────
Publishes notification events to:
  1. Redis Pub/Sub — for IMMEDIATE (<5ms) real-time WebSocket delivery to browser
  2. Kafka — for durable background processing & PostgreSQL persistence

Usage:
    from app.services.notification_publisher import notification_publisher
    await notification_publisher.publish(
        user_id="<uuid-str>",
        type="blog_like",
        content="...",
        related_user_id="<uuid-str>",   # optional
        related_blog_id=42,             # optional
    )
"""

import json
import asyncio
import logging
from typing import Optional
from uuid import UUID

import redis.asyncio as aioredis
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaConnectionError

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationPublisher:
    """Singleton that holds shared Kafka producer and Redis client."""

    def __init__(self):
        self._kafka_producer: Optional[AIOKafkaProducer] = None
        self._redis: Optional[aioredis.Redis] = None
        self._kafka_ready = False

    # ─── Lifecycle ────────────────────────────────────────────────────────────

    async def start(self):
        """Called once at app startup."""
        # 1. Connect Redis
        try:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._redis.ping()
            logger.info("NotificationPublisher: Redis connected ✓")
        except Exception as exc:
            logger.error("NotificationPublisher: Redis connection failed — %s", exc)
            self._redis = None

        # 2. Connect Kafka
        try:
            self._kafka_producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            await self._kafka_producer.start()
            self._kafka_ready = True
            logger.info("NotificationPublisher: Kafka producer started ✓")
        except Exception as exc:
            logger.warning(
                "NotificationPublisher: Kafka unavailable (%s) — using direct Redis/DB fallback",
                exc,
            )
            self._kafka_producer = None
            self._kafka_ready = False

    async def stop(self):
        """Called once at app shutdown."""
        if self._kafka_producer and self._kafka_ready:
            try:
                await self._kafka_producer.stop()
            except Exception:
                pass
        if self._redis:
            await self._redis.close()

    # ─── Publish ──────────────────────────────────────────────────────────────

    async def publish(
        self,
        user_id: str,
        type: str,
        content: str,
        related_user_id: Optional[str] = None,
        related_blog_id: Optional[int] = None,
    ) -> None:
        """
        Publish a notification event.

        1. Immediate Redis Pub/Sub broadcast -> WebSocket pushes to browser tabs
        2. Durable Kafka event (or direct DB fallback if Kafka disabled) -> Persisted to PostgreSQL
        """
        payload = {
            "user_id": str(user_id),
            "type": type,
            "content": content,
            "related_user_id": str(related_user_id) if related_user_id else None,
            "related_blog_id": related_blog_id,
        }

        # ── 1. Immediate Real-Time Broadcast via Redis Pub/Sub ─────────────────
        if self._redis:
            try:
                channel = f"notifications:{user_id}"
                await self._redis.publish(channel, json.dumps(payload))
                logger.info("NotificationPublisher: Broadcasted to Redis channel %s", channel)
            except Exception as exc:
                logger.error("Redis publish failed: %s", exc)

        # ── 2. Durable Event Persistence via Kafka ────────────────────────────
        if self._kafka_producer and self._kafka_ready:
            try:
                await self._kafka_producer.send_and_wait(
                    settings.KAFKA_NOTIFICATIONS_TOPIC,
                    value=payload,
                    key=str(user_id).encode("utf-8"),
                )
                logger.info("NotificationPublisher: Produced event to Kafka topic '%s'", settings.KAFKA_NOTIFICATIONS_TOPIC)
                return
            except Exception as exc:
                logger.error("Kafka produce error (%s) — falling back to direct DB write", exc)

        # ── Fallback DB Persistence if Kafka unavailable ──────────────────────
        try:
            from app.db.session import SessionLocal
            from app.models.notification import Notification

            db = SessionLocal()
            try:
                notif = Notification(
                    user_id=UUID(str(user_id)),
                    type=type,
                    content=content,
                    is_read=False,
                    related_user_id=UUID(str(related_user_id)) if related_user_id else None,
                    related_blog_id=related_blog_id,
                )
                db.add(notif)
                db.commit()
                logger.info("NotificationPublisher (fallback): Saved notification id=%s to DB", notif.id)
            finally:
                db.close()
        except Exception as exc:
            logger.error("NotificationPublisher direct DB save error: %s", exc)


# ── Module-level singleton ────────────────────────────────────────────────────
notification_publisher = NotificationPublisher()
