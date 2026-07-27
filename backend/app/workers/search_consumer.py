import asyncio
import json
import logging
import time
from aiokafka import AIOKafkaConsumer
import meilisearch

from app.core.config import settings

logger = logging.getLogger(__name__)

class SearchConsumer:
    def __init__(self):
        self.consumer = None
        self.client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_SEARCH_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="search_indexing_group",
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="earliest"
        )
        try:
            await self.consumer.start()
            logger.info("SearchConsumer: started listening on %s", settings.KAFKA_SEARCH_TOPIC)
            asyncio.create_task(self.consume())
        except Exception as e:
            logger.error("SearchConsumer: failed to start: %s", e)
            self.consumer = None

    async def consume(self):
        try:
            async for msg in self.consumer:
                await self.process_message(msg.value)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("SearchConsumer: consume loop error: %s", e)

    async def process_message(self, data: dict):
        action = data.get("action")
        index_name = data.get("index")
        doc_id = data.get("id")
        payload = data.get("payload")

        if not all([action, index_name, doc_id]):
            logger.warning("SearchConsumer: invalid message format: %s", data)
            return

        try:
            # Using asyncio.to_thread because meilisearch python client is synchronous
            if action == "index" and payload:
                index = self.client.index(index_name)
                await asyncio.to_thread(index.add_documents, [payload])
                logger.info(f"SearchConsumer: indexed {index_name} doc {doc_id}")
            elif action == "delete":
                index = self.client.index(index_name)
                await asyncio.to_thread(index.delete_document, doc_id)
                logger.info(f"SearchConsumer: deleted {index_name} doc {doc_id}")
            elif action in ("query", "click"):
                query_str = payload.get("query")
                if query_str:
                    from app.core.redis_client import redis_client
                    query_lower = query_str.lower()
                    
                    if action == "query":
                        await redis_client.hincrby(f"search:stats:{query_lower}", "queries", 1)
                        logger.debug(f"SearchConsumer: recorded query '{query_lower}'")
                    elif action == "click":
                        await redis_client.hincrby(f"search:stats:{query_lower}", "clicks", 1)
                        # Track which exact blog was clicked for this query
                        blog_id = payload.get("blog_id")
                        if blog_id:
                            await redis_client.zincrby(f"search:query:{query_lower}:clicks", 1, str(blog_id))
                        logger.debug(f"SearchConsumer: recorded click '{query_lower}' for blog {blog_id}")

                    # Calculate ML heuristic score: queries * 1 + clicks * 5
                    queries_val = await redis_client.hget(f"search:stats:{query_lower}", "queries")
                    clicks_val = await redis_client.hget(f"search:stats:{query_lower}", "clicks")
                    
                    queries = int(queries_val) if queries_val else 0
                    clicks = int(clicks_val) if clicks_val else 0
                    score = queries + (clicks * 5)
                    
                    # Update trending:searches sorted set
                    await redis_client.zadd("trending:searches", {query_lower: score})

                    # Track personalized search history
                    user_id = payload.get("user_id") if payload else None
                    if user_id:
                        history_key = f"user:{user_id}:recent_searches"
                        await redis_client.zadd(history_key, {query_lower: time.time()})
                        await redis_client.zremrangebyrank(history_key, 0, -21)
                        logger.debug(f"SearchConsumer: updated search history for user {user_id}")
                    
            elif action in ("blog_view", "blog_like", "blog_comment", "blog_bookmark"):
                if doc_id:
                    from app.core.redis_client import redis_client
                    
                    if action == "blog_view":
                        await redis_client.hincrby(f"blog:stats:{doc_id}", "views", 1)
                        logger.debug(f"SearchConsumer: recorded view for blog {doc_id}")
                    elif action == "blog_like":
                        await redis_client.hincrby(f"blog:stats:{doc_id}", "likes", 1)
                        logger.debug(f"SearchConsumer: recorded like for blog {doc_id}")

                    # Calculate blog ML heuristic score: views * 1 + likes * 10
                    views_val = await redis_client.hget(f"blog:stats:{doc_id}", "views")
                    likes_val = await redis_client.hget(f"blog:stats:{doc_id}", "likes")
                    
                    views = int(views_val) if views_val else 0
                    likes = int(likes_val) if likes_val else 0
                    score = views + (likes * 10)
                    
                    # Update trending:blogs sorted set
                    await redis_client.zadd("trending:blogs", {str(doc_id): score})
                    
                    # Personalized behavioral tracking
                    user_id = payload.get("user_id") if payload else None
                    if user_id:
                        from app.services.recommendation import recommendation_engine
                        from uuid import UUID
                        interaction_type = action.replace("blog_", "")
                        await recommendation_engine.track_interest(UUID(user_id), int(doc_id), interaction_type)
                        logger.debug(f"SearchConsumer: updated behavioral profile for user {user_id}")
                    
            else:
                logger.warning(f"SearchConsumer: unknown action or missing payload: {action}")
        except Exception as e:
            logger.error(f"SearchConsumer: Error processing {action} for {index_name} ID {doc_id}: {e}")

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()
            logger.info("SearchConsumer: stopped")

search_consumer = SearchConsumer()
