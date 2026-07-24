import json
from typing import Dict, Any
from app.core.redis_client import redis_client

class EventBus:
    """
    Event Streaming Bus powered by Redis Streams & PubSub.
    Publishes async events (post_published, user_liked, user_commented, user_followed, post_viewed)
    and triggers non-blocking background processors for feature store, analytics, and notifications.
    """
    STREAM_KEY = "baremind:event_stream"

    @classmethod
    async def publish_event(cls, event_type: str, payload: Dict[str, Any]):
        """Publish an event to the Redis event stream."""
        try:
            event_data = {
                "event_type": event_type,
                "payload": json.dumps(payload, default=str),
            }
            await redis_client.xadd(cls.STREAM_KEY, event_data, maxlen=10000)
            await redis_client.publish(f"events:{event_type}", json.dumps(payload, default=str))
        except Exception as e:
            print(f"EventBus Publish Error [{event_type}]: {e}")

event_bus = EventBus()
