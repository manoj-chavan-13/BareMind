from fastapi import APIRouter
from app.api.api_v1.endpoints import (
    auth, users, blogs, taxonomy, interactions, uploads, feed,
    notifications, analytics, search, ws
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(blogs.router, prefix="/blogs", tags=["blogs"])
api_router.include_router(taxonomy.router, prefix="/taxonomy", tags=["taxonomy"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
