from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
import meilisearch
import asyncio

from app.core.config import settings
from app.services.search_publisher import publish_search_event
from app.core.redis_client import redis_client

router = APIRouter()

def get_meilisearch_client():
    return meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)

@router.get("/")
async def search_all(
    background_tasks: BackgroundTasks,
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = 20,
    type: Optional[str] = Query(None, description="Type of search: 'users' or 'blogs'"),
    client: meilisearch.Client = Depends(get_meilisearch_client),
) -> Any:
    """
    Full-text & fuzzy search across published blogs, authors using Meilisearch.
    """
    clean_q = q.strip()
    blogs = []
    authors = []

    # Publish query for analytics (trending keywords)
    if len(clean_q) > 2:
        background_tasks.add_task(
            publish_search_event,
            "query",
            "search_queries",
            clean_q,
            {"query": clean_q}
        )

    # Search Blogs
    if type is None or type == "blogs":
        try:
            blog_results = await asyncio.to_thread(
                client.index('blogs').search,
                clean_q,
                {'limit': limit, 'filter': ['is_published = true']}
            )
            blogs = blog_results.get('hits', [])
        except Exception:
            pass

    # Search Users (Authors)
    if type is None or type == "users":
        try:
            user_results = await asyncio.to_thread(
                client.index('users').search,
                clean_q,
                {'limit': limit}
            )
            authors = user_results.get('hits', [])
        except Exception:
            pass

    # Search Categories
    categories = []
    if type is None or type == "categories":
        try:
            cat_results = await asyncio.to_thread(
                client.index('categories').search,
                clean_q,
                {'limit': limit}
            )
            categories = cat_results.get('hits', [])
        except Exception:
            pass

    return {
        "query": clean_q,
        "blogs": blogs,
        "authors": [
            {
                "user_id": p.get("id"),
                "username": p.get("username"),
                "first_name": p.get("first_name"),
                "last_name": p.get("last_name"),
                "avatar_url": p.get("avatar_url"),
            }
            for p in authors
        ],
        "categories": categories,
        "tags": [],
    }

from pydantic import BaseModel

class SearchTrackRequest(BaseModel):
    query: str
    blog_id: Optional[int] = None

@router.post("/track")
async def track_search(
    request: SearchTrackRequest,
    background_tasks: BackgroundTasks,
) -> Any:
    """Track search clicks and queries to improve ML suggestions."""
    clean_q = request.query.strip()
    if len(clean_q) > 2:
        payload = {"query": clean_q}
        if request.blog_id:
            payload["blog_id"] = request.blog_id
        
        background_tasks.add_task(
            publish_search_event,
            "click" if request.blog_id else "query",
            "search_queries",
            clean_q,
            payload
        )
    return {"status": "tracked"}

@router.get("/suggestions")
async def get_search_suggestions(
    q: Optional[str] = Query("", description="Search query string"),
) -> Any:
    """Fast auto-complete keyword suggestions ranked by ML heuristic in Redis."""
    clean_q = q.strip().lower() if q else ""
    suggestions = []

    try:
        # Fetch top 200 trending searches from Redis
        trending_bytes = await redis_client.zrevrange("trending:searches", 0, 200)
        all_trending = [b.decode("utf-8") for b in trending_bytes]
        
        if clean_q:
            # Filter in-memory for prefix match
            suggestions = [term for term in all_trending if term.startswith(clean_q)]
        else:
            suggestions = all_trending

        # If not enough suggestions from prefix, do an infix match to backfill
        if clean_q and len(suggestions) < 8:
            infix_matches = [term for term in all_trending if clean_q in term and term not in suggestions]
            suggestions.extend(infix_matches)
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching suggestions: {e}")
        pass

    return {"suggestions": suggestions[:8]}
