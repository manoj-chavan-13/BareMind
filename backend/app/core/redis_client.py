import redis.asyncio as aioredis
from app.core.config import settings

# Async Redis client (used in async FastAPI endpoints)
redis_client: aioredis.Redis = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)
