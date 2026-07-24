from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_content
from app.schemas.content import BlogCreate, BlogUpdate, BlogResponse, AuthorResponse
from app.models.user import User
from app.models.blog import Blog as BlogModel
from app.models.follower import Follower
from app.models.profile import Profile
from app.services.notification_publisher import notification_publisher
from app.services.search_publisher import publish_search_event

router = APIRouter()

@router.get("/", response_model=List[BlogResponse])
def read_blogs(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    tag: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = "latest",
    search_query: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve blogs with user interaction state, with optional search, tag/category filtering and sorting.
    """
    from app.models.interaction import Like, Bookmark
    from app.models.follower import Follower
    from app.models.tag import Tag as TagModel
    from app.models.category import Category as CategoryModel
    
    query = db.query(BlogModel).filter(BlogModel.is_published == True)
    
    # Optional Meilisearch filtering for robust content-based search
    meilisearch_ids = None
    if search_query and search_query.strip():
        clean_q = search_query.strip()
        
        # Publish query for analytics (trending keywords)
        if len(clean_q) > 2:
            background_tasks.add_task(
                publish_search_event,
                "query",
                "search_queries",
                clean_q,
                {"query": clean_q}
            )
        from app.api.api_v1.endpoints.search import get_meilisearch_client
        client = get_meilisearch_client()
        try:
            ms_res = client.index('blogs').search(search_query.strip(), {'limit': 500, 'attributesToRetrieve': ['id']})
            meilisearch_ids = [hit['id'] for hit in ms_res.get('hits', [])]
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Meilisearch query failed: %s", e)
            meilisearch_ids = []
            
    db_skip = skip
    db_limit = limit

    if meilisearch_ids is not None:
        if meilisearch_ids:
            try:
                import asyncio
                from app.core.redis_client import redis_client
                
                str_ids = [str(i) for i in meilisearch_ids]
                scores = asyncio.run(redis_client.zmscore("trending:blogs", str_ids))
                # Fetch query-specific click scores
                query_lower = search_query.strip().lower()
                query_clicks_raw = asyncio.run(redis_client.zmscore(f"search:query:{query_lower}:clicks", str_ids))
                
                ranked_items = []
                max_rank = len(meilisearch_ids)
                
                for idx, (b_id, r_score, q_click) in enumerate(zip(meilisearch_ids, scores, query_clicks_raw)):
                    m_score = max_rank - idx
                    realtime_score = r_score if r_score is not None else 0
                    query_click_score = q_click if q_click is not None else 0
                    
                    # Boost final score massively if the user previously clicked this EXACT post for this EXACT query
                    final_score = (m_score * 1.0) + (realtime_score * 10.0) + (query_click_score * 500.0)
                    ranked_items.append((final_score, b_id))
                    
                ranked_items.sort(key=lambda x: x[0], reverse=True)
                meilisearch_ids = [item[1] for item in ranked_items]
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Error blending ML scores: %s", e)

            # Python-side pagination
            paginated_ids = meilisearch_ids[skip : skip + limit]
            query = query.filter(BlogModel.id.in_(paginated_ids))
            
            # Reset DB pagination since we sliced in Python
            db_skip = 0
            sort_by = None
        else:
            query = query.filter(False)

    if tag:
        tag_obj = db.query(TagModel).filter((TagModel.slug == tag) | (TagModel.name == tag)).first()
        if tag_obj:
            query = query.filter(BlogModel.tags.any(TagModel.id == tag_obj.id))
        else:
            query = query.filter(False)
            
    if category:
        cat_obj = db.query(CategoryModel).filter(CategoryModel.slug == category).first()
        if cat_obj:
            query = query.filter(BlogModel.category_id == cat_obj.id)
        else:
            query = query.filter(False)
            
    redis_ids = None
    if sort_by == "trending":
        if meilisearch_ids is None:
            import asyncio
            from app.core.redis_client import redis_client
            try:
                # Fetch only the paginated slice from Redis
                trending_keys = asyncio.run(redis_client.zrevrange("trending:blogs", skip, skip + limit - 1))
                redis_ids = [int(k) for k in trending_keys] if trending_keys else []
                
                if redis_ids:
                    query = query.filter(BlogModel.id.in_(redis_ids))
                    db_skip = 0 # Reset DB skip because we already paginated in Redis
                else:
                    query = query.order_by(BlogModel.likes_count.desc(), BlogModel.views.desc(), BlogModel.created_at.desc())
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error fetching trending blogs from redis: {e}")
                query = query.order_by(BlogModel.likes_count.desc(), BlogModel.views.desc(), BlogModel.created_at.desc())
    elif sort_by is not None:
        query = query.order_by(BlogModel.created_at.desc())
        
    blogs = query.offset(db_skip).limit(db_limit).all()
    
    # In-memory sorting for ML ranking
    if meilisearch_ids is not None and meilisearch_ids:
        blog_map = {b.id: b for b in blogs}
        blogs = [blog_map[b_id] for b_id in paginated_ids if b_id in blog_map]
        
        # Apply hyper-personalization to search results
        if current_user:
            from app.services.recommendation import recommendation_engine
            import asyncio
            ranked = asyncio.run(recommendation_engine.rank_feed(user_id=current_user.id, blogs=blogs, is_search=True, search_query=search_query))
            blogs = ranked
            
    elif sort_by == "trending" and redis_ids:
        blog_map = {b.id: b for b in blogs}
        blogs = [blog_map[b_id] for b_id in redis_ids if b_id in blog_map]
        
        # Apply hyper-personalization to trending feed
        if current_user:
            from app.services.recommendation import recommendation_engine
            import asyncio
            ranked = asyncio.run(recommendation_engine.rank_feed(user_id=current_user.id, blogs=blogs))
            blogs = ranked
    
    if current_user:
        blog_ids = [b.id for b in blogs]
        liked_blog_ids = {like.blog_id for like in db.query(Like).filter(Like.user_id == current_user.id, Like.blog_id.in_(blog_ids)).all()}
        bookmarked_blog_ids = {bm.blog_id for bm in db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.blog_id.in_(blog_ids)).all()}
        follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
        following_ids = {f.following_id for f in follows}
        
        for blog in blogs:
            blog.is_liked_by_user = blog.id in liked_blog_ids
            blog.is_bookmarked_by_user = blog.id in bookmarked_blog_ids
            if blog.author:
                blog.author.is_following = blog.author_id in following_ids
    else:
        for blog in blogs:
            blog.is_liked_by_user = False
            blog.is_bookmarked_by_user = False
            if blog.author:
                blog.author.is_following = False
            
    return blogs


from app.schemas.taxonomy import CategoryResponse, TagResponse
from pydantic import BaseModel

class AutoTagRequest(BaseModel):
    title: str = ""
    content: str = ""

@router.post("/auto-category", response_model=CategoryResponse)
def suggest_category_for_content(
    *,
    db: Session = Depends(deps.get_db),
    body: AutoTagRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Analyze title & content to suggest category automatically."""
    from app.services.auto_categorizer import auto_categorizer
    return auto_categorizer.suggest_category(db, body.title, body.content)


@router.post("/auto-tag", response_model=List[TagResponse])
def suggest_tags_for_content(
    *,
    db: Session = Depends(deps.get_db),
    body: AutoTagRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Analyze title & content to suggest tags automatically."""
    from app.services.auto_tagger import auto_tagger
    return auto_tagger.suggest_tags(db, body.title, body.content)


@router.get("/recommended", response_model=List[BlogResponse])
async def get_recommended_blogs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """Get personalized blog recommendations based on interest vector."""
    from app.services.recommendation import recommendation_engine
    blogs = crud_content.get_blogs(db, skip=skip, limit=limit * 2)
    user_id = current_user.id if current_user else None
    ranked = await recommendation_engine.rank_feed(user_id=user_id, blogs=blogs)
    return ranked[:limit]


@router.get("/{blog_id}/similar", response_model=List[BlogResponse])
async def get_similar_blogs(
    blog_id: int,
    db: Session = Depends(deps.get_db),
    limit: int = 5,
) -> Any:
    """Get similar articles sharing category or tags."""
    blog = crud_content.get_blog(db=db, blog_id=blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    query = db.query(BlogModel).filter(BlogModel.id != blog_id, BlogModel.is_published == True)
    if blog.category_id:
        query = query.filter(BlogModel.category_id == blog.category_id)

    similar = query.order_by(BlogModel.created_at.desc()).limit(limit).all()
    return similar


# ─── Background helper ────────────────────────────────────────────────────────

async def _notify_followers_of_new_blog(
    author_id: str,
    author_name: str,
    blog_title: str,
    blog_id: int,
) -> None:
    """
    Runs in the background after a published blog is created.
    Sends a 'new_blog' notification to every follower of the author.
    """
    import asyncio
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        followers = (
            db.query(Follower)
            .filter(Follower.following_id == author_id)
            .all()
        )

        content = f"{author_name} published a new story: \"{blog_title}\""

        tasks = [
            notification_publisher.publish(
                user_id=str(follower.follower_id),
                type="new_blog",
                content=content,
                related_user_id=str(author_id),
                related_blog_id=blog_id,
            )
            for follower in followers
        ]

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(
            "_notify_followers_of_new_blog error: %s", exc
        )
    finally:
        db.close()


@router.post("/", response_model=BlogResponse)
def create_blog(
    *,
    db: Session = Depends(deps.get_db),
    blog_in: BlogCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new blog. Notifies all followers when the post is published.
    """
    blog = crud_content.get_blog_by_slug(db, slug=blog_in.slug)
    if blog:
        raise HTTPException(status_code=400, detail="Blog with this slug already exists.")
    blog = crud_content.create_blog(db=db, obj_in=blog_in, author_id=current_user.id)

    # Resolve author display name via Profile
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == current_user.id)
        .first()
    )
    author_name = "Unknown"
    author_username = "unknown"
    if profile:
        author_username = profile.username or "unknown"
        if profile.first_name:
            author_name = f"{profile.first_name} {profile.last_name or ''}".strip()
        elif profile.username:
            author_name = profile.username

    # Notify followers only for published posts
    if blog_in.is_published:
        notify_name = author_name if author_name != "Unknown" else "A writer you follow"
        import asyncio
        background_tasks.add_task(
            asyncio.run,
            _notify_followers_of_new_blog(
                author_id=str(current_user.id),
                author_name=notify_name,
                blog_title=blog.title,
                blog_id=blog.id,
            ),
        )

    background_tasks.add_task(
        publish_search_event,
        "index",
        "blogs",
        blog.id,
        {
            "id": blog.id,
            "title": blog.title,
            "content": blog.content,
            "slug": blog.slug,
            "author_id": str(blog.author_id),
            "author_name": author_name,
            "author_username": author_username,
            "is_published": blog.is_published,
            "created_at": blog.created_at.isoformat() if blog.created_at else None
        }
    )

    return blog


@router.get("/slug/{slug}", response_model=BlogResponse)
def read_blog_by_slug(
    *,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    slug: str,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get blog by slug with user interaction state (likes, bookmarks, follow status).
    """
    from app.models.interaction import Like, Bookmark
    from app.models.follower import Follower

    blog = db.query(BlogModel).filter(BlogModel.slug == slug).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    if current_user:
        blog.is_liked_by_user = (
            db.query(Like)
            .filter(Like.user_id == current_user.id, Like.blog_id == blog.id)
            .first() is not None
        )
        blog.is_bookmarked_by_user = (
            db.query(Bookmark)
            .filter(Bookmark.user_id == current_user.id, Bookmark.blog_id == blog.id)
            .first() is not None
        )

        # Inject is_following on the author so the Follow button initialises correctly
        if blog.author:
            is_following = (
                db.query(Follower)
                .filter(
                    Follower.follower_id == current_user.id,
                    Follower.following_id == blog.author_id,
                )
                .first() is not None
            )
            blog.author.is_following = is_following

            # Also inject username from Profile if not already present
            if not getattr(blog.author, "username", None):
                from app.models.profile import Profile as ProfileModel
                prof = (
                    db.query(ProfileModel)
                    .filter(ProfileModel.user_id == blog.author_id)
                    .first()
                )
                if prof:
                    blog.author.username = prof.username
    else:
        blog.is_liked_by_user = False
        blog.is_bookmarked_by_user = False
        if blog.author:
            blog.author.is_following = False
    return blog


@router.get("/{blog_id}", response_model=BlogResponse)
def read_blog(
    *,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get blog by ID.
    """
    from app.models.interaction import Like, Bookmark
    blog = crud_content.get_blog(db=db, blog_id=blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    if current_user:
        blog.is_liked_by_user = db.query(Like).filter(Like.user_id == current_user.id, Like.blog_id == blog.id).first() is not None
        blog.is_bookmarked_by_user = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.blog_id == blog.id).first() is not None
    else:
        blog.is_liked_by_user = False
        blog.is_bookmarked_by_user = False
        
    return blog


@router.put("/{blog_id}", response_model=BlogResponse)
def update_blog(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    blog_in: BlogUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a blog. If transitioning from draft → published, notifies followers.
    """
    blog = crud_content.get_blog(db=db, blog_id=blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if blog.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Track pre-update state to detect draft → published transition
    was_published = blog.is_published

    blog = crud_content.update_blog(db=db, db_obj=blog, obj_in=blog_in)

    # Resolve author display name via Profile
    profile = (
        db.query(Profile)
        .filter(Profile.user_id == current_user.id)
        .first()
    )
    author_name = "Unknown"
    author_username = "unknown"
    if profile:
        author_username = profile.username or "unknown"
        if profile.first_name:
            author_name = f"{profile.first_name} {profile.last_name or ''}".strip()
        elif profile.username:
            author_name = profile.username

    # Notify followers only on first publish (draft → published)
    if not was_published and blog_in.is_published:
        notify_name = author_name if author_name != "Unknown" else "A writer you follow"
        import asyncio
        background_tasks.add_task(
            asyncio.run,
            _notify_followers_of_new_blog(
                author_id=str(current_user.id),
                author_name=notify_name,
                blog_title=blog.title,
                blog_id=blog.id,
            ),
        )

    background_tasks.add_task(
        publish_search_event,
        "index",
        "blogs",
        blog.id,
        {
            "id": blog.id,
            "title": blog.title,
            "content": blog.content,
            "slug": blog.slug,
            "author_id": str(blog.author_id),
            "author_name": author_name,
            "author_username": author_username,
            "is_published": blog.is_published,
            "created_at": blog.created_at.isoformat() if blog.created_at else None
        }
    )

    return blog


@router.delete("/{blog_id}", response_model=BlogResponse)
def delete_blog(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a blog.
    """
    blog = crud_content.get_blog(db=db, blog_id=blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if blog.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    blog = crud_content.remove_blog(db=db, id=blog_id)
    
    background_tasks.add_task(
        publish_search_event,
        "delete",
        "blogs",
        blog_id
    )
    
    return blog

@router.post("/{blog_id}/view")
async def record_view(
    request: Request,
    blog_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Record a view for a blog, preventing duplicate views using Redis.
    """
    from app.core.redis_client import redis_client
    from app.services.recommendation import recommendation_engine
    
    blog = db.query(BlogModel).filter(BlogModel.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Fingerprint the viewer
    if current_user:
        viewer_id = f"user_{current_user.id}"
    else:
        ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        viewer_id = f"ip_{ip}_{hash(user_agent)}"
        
    redis_key = f"view:blog_{blog_id}:{viewer_id}"
    
    # Check if this user/IP has viewed this blog in the last 24 hours
    has_viewed = await redis_client.get(redis_key)
    
    if not has_viewed:
        if blog.views is None:
            blog.views = 0
        blog.views += 1
        db.commit()
        
        # Set redis key with 24-hour (86400 seconds) expiration
        await redis_client.setex(redis_key, 86400, "1")
        
        # Dispatch telemetry for trending and personalization
        payload = {"blog_id": blog.id}
        if current_user:
            payload["user_id"] = str(current_user.id)
            
        background_tasks.add_task(
            publish_search_event,
            "blog_view",
            "blogs",
            blog.id,
            payload
        )
    
    return {"status": "success", "views": blog.views}


@router.get("/{blog_id}/likers", response_model=List[AuthorResponse])
def get_blog_likers(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get users who liked a specific blog.
    """
    from app.models.interaction import Like
    from app.models.follower import Follower
    
    blog = db.query(BlogModel).filter(BlogModel.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    likes = db.query(Like).filter(Like.blog_id == blog_id).order_by(Like.created_at.desc()).offset(skip).limit(limit).all()
    
    users = []
    
    # Pre-fetch following IDs if user is logged in
    following_ids = set()
    if current_user:
        follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
        following_ids = {f.following_id for f in follows}
        
    for like in likes:
        user = db.query(User).filter(User.id == like.user_id).first()
        if user:
            user_data = {
                "id": user.id,
                "email": user.email,
                "is_following": user.id in following_ids if current_user else False
            }
            if hasattr(user, "profile") and user.profile:
                profile = user.profile[0] if isinstance(user.profile, list) else user.profile
                user_data["username"] = profile.username
                user_data["first_name"] = profile.first_name
                user_data["last_name"] = profile.last_name
                user_data["avatar_url"] = profile.avatar_url
            users.append(user_data)
            
    return users
