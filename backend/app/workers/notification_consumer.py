"""
notification_consumer.py
────────────────────────
Kafka consumer worker — runs as an asyncio background task.

Consumes from the "notifications" Kafka topic and persists each event to the
PostgreSQL notifications table.
"""

import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError

from app.core.config import settings

logger = logging.getLogger(__name__)

_consumer_task: Optional[asyncio.Task] = None


async def _run_consumer():
    """Inner loop — reconnects automatically on failure."""
    while True:
        consumer: Optional[AIOKafkaConsumer] = None
        try:
            consumer = AIOKafkaConsumer(
                settings.KAFKA_NOTIFICATIONS_TOPIC,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id="baremind-notification-consumer",
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            )
            await consumer.start()
            logger.info("NotificationConsumer: started, listening on topic '%s'", settings.KAFKA_NOTIFICATIONS_TOPIC)

            async for msg in consumer:
                await _handle_message(msg.value)

        except KafkaConnectionError as exc:
            logger.warning("NotificationConsumer: Kafka unavailable (%s) — retrying in 10s", exc)
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            logger.info("NotificationConsumer: cancelled, shutting down")
            break
        except Exception as exc:
            logger.error("NotificationConsumer: unexpected error (%s) — retrying in 5s", exc)
            await asyncio.sleep(5)
        finally:
            if consumer:
                try:
                    await consumer.stop()
                except Exception:
                    pass


async def _handle_message(payload: dict):
    """Persist notification to PostgreSQL database."""
    try:
        from app.db.session import SessionLocal
        from app.models.notification import Notification
        from uuid import UUID

        user_id_raw = payload.get("user_id")
        if not user_id_raw:
            return

        db = SessionLocal()
        try:
            notification = Notification(
                user_id=UUID(str(user_id_raw)),
                type=payload.get("type", "general"),
                content=payload.get("content", ""),
                is_read=False,
                related_user_id=UUID(str(payload["related_user_id"])) if payload.get("related_user_id") else None,
                related_blog_id=payload.get("related_blog_id"),
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

            logger.info("NotificationConsumer: Persisted notification id=%d for user=%s to PostgreSQL", notification.id, user_id_raw)

        except Exception as exc:
            db.rollback()
            logger.error("NotificationConsumer: DB persist error — %s", exc)
        finally:
            db.close()

    except Exception as exc:
        logger.error("NotificationConsumer: _handle_message error — %s", exc)


# ── Public API ────────────────────────────────────────────────────────────────

def start_consumer():
    """Start the consumer as an asyncio background task. Call from app startup."""
    global _consumer_task
    _consumer_task = asyncio.create_task(_run_consumer())
    logger.info("NotificationConsumer: background task created")


def stop_consumer():
    """Cancel the consumer task. Call from app shutdown."""
    global _consumer_task
    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
