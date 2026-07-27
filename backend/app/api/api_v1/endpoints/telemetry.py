import json
import logging
from fastapi import APIRouter, Depends, Request
from aiokafka import AIOKafkaProducer

from app.api import deps
from app.core.config import settings
from app.schemas.telemetry import TelemetryBatch
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

# Producer singleton to reuse connection
producer = None

async def get_kafka_producer():
    global producer
    if producer is None:
        producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await producer.start()
    return producer

@router.post("/track", status_code=202)
async def track_telemetry(
    batch: TelemetryBatch,
    request: Request,
    current_user: User = Depends(deps.get_current_user_optional)
):
    """
    Accepts a batch of telemetry events from the frontend and publishes them to Kafka.
    """
    try:
        p = await get_kafka_producer()
        
        # Enrich events with server-side info
        user_id = str(current_user.id) if current_user else None
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        kafka_payload = {
            "session_id": batch.session_id,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "events": [event.model_dump() for event in batch.events]
        }
        
        # We use convert times to strings for json serialization
        for ev in kafka_payload["events"]:
            if ev.get("timestamp"):
                ev["timestamp"] = ev["timestamp"].isoformat()
        
        await p.send_and_wait(settings.KAFKA_TELEMETRY_TOPIC, kafka_payload)
        return {"status": "accepted"}
    except Exception as e:
        logger.error(f"Failed to publish telemetry to Kafka: {e}")
        # We don't want to crash the client if telemetry fails, just return 202
        return {"status": "error", "message": str(e)}
