import json
import logging
from typing import Any, Dict
from aiokafka import AIOKafkaProducer
from app.core.config import settings

logger = logging.getLogger(__name__)

class SearchPublisher:
    def __init__(self):
        self.producer: AIOKafkaProducer | None = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8')
        )
        await self.producer.start()
        logger.info("SearchPublisher: started on %s", settings.KAFKA_BOOTSTRAP_SERVERS)

    async def stop(self):
        if self.producer:
            await self.producer.stop()
            logger.info("SearchPublisher: stopped")

    async def publish(self, action: str, index: str, doc_id: Any, payload: Dict[str, Any] = None):
        """
        Publish a search indexing event to Kafka.
        action: 'index' or 'delete'
        index: 'users' or 'blogs'
        doc_id: The ID of the document.
        payload: The full document dictionary to index (if action == 'index').
        """
        if not self.producer:
            logger.warning("SearchPublisher: producer not initialized")
            return
            
        event = {
            "action": action,
            "index": index,
            "id": str(doc_id)
        }
        if payload is not None:
            event["payload"] = payload
            
        try:
            await self.producer.send_and_wait(settings.KAFKA_SEARCH_TOPIC, event)
            logger.debug(f"SearchPublisher: published {action} event for {index} ID: {doc_id}")
        except Exception as e:
            logger.error(f"SearchPublisher: Error publishing {action} event for {index}: {e}")

async def publish_search_event(action: str, index: str, doc_id: Any, payload: Dict[str, Any] = None):
    await search_publisher.publish(action, index, doc_id, payload)

search_publisher = SearchPublisher()
