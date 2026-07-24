from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.models.user import User
from app.schemas.user import UserResponse, UserProfileResponse, UserUpdate, ChangePasswordRequest
from app.core import security
from app.models.follower import Follower
from app.models.notification import Notification
from app.schemas.social import NotificationResponse
from app.core.bloom_filter import UsernameBloomFilter
from app.models.interaction import Bookmark, Like
from app.models.comment import Comment
from app.services.search_publisher import publish_search_event
from app.models.blog import Blog as BlogModel
from app.schemas.content import BlogResponse, AuthorResponse
from uuid import UUID

router = APIRouter()

# ─── Safe fields for public profile (NO hashed_password, NO email for others) ──
PUBLIC_FIELDS = {"id", "is_active", "is_verified", "created_at"}


def _build_public_profile(user: User, profile, followers_count: int, following_count: int, is_following: bool = False) -> dict:
    """Build a safe public-facing user profile dict (no sensitive fields)."""
    default_username = user.email.split("@")[0] if user.email else str(user.id)
    return {
        "id": str(user.id),
        "is_active": user.is_active,
        "created_at": user.created_at,
        "username": (profile.username if profile and profile.username else default_username),
        "first_name": profile.first_name if profile else None,
        "last_name": profile.last_name if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "bio": profile.bio if profile else None,
        "website": profile.website if profile else None,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following,
    }


# ─── GET /me  (private — full data for the authenticated user only) ────────────

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    from app.models.profile import Profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    user_data = {c.name: getattr(current_user, c.name) for c in current_user.__table__.columns
                 if c.name != "hashed_password"}   # never expose hash
    if profile:
        user_data["username"] = profile.username or (current_user.email.split("@")[0] if current_user.email else None)
        user_data["first_name"] = profile.first_name
        user_data["last_name"] = profile.last_name
        user_data["avatar_url"] = profile.avatar_url
        user_data["bio"] = profile.bio
        user_data["website"] = profile.website
    else:
        user_data["username"] = current_user.email.split("@")[0] if current_user.email else None

    from app.models.follower import Follower
    followers_count = db.query(Follower).filter(Follower.following_id == current_user.id).count()
    following_count = db.query(Follower).filter(Follower.follower_id == current_user.id).count()
    user_data["followers_count"] = followers_count
    user_data["following_count"] = following_count

    return user_data


@router.get("/me/bookmarks", response_model=List[BlogResponse])
async def get_user_bookmarks(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all blogs bookmarked by the current user.
    """
    from app.models.interaction import Bookmark, Like
    
    # Get all bookmarks for the user
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()
    blog_ids = [bm.blog_id for bm in bookmarks]
    
    if not blog_ids:
        return []
        
    # Fetch the actual blogs
    blogs = db.query(BlogModel).filter(BlogModel.id.in_(blog_ids)).all()
    
    # Inject interaction states
    for blog in blogs:
        blog.is_bookmarked_by_user = True
        like = db.query(Like).filter(Like.user_id == current_user.id, Like.blog_id == blog.id).first()
        blog.is_liked_by_user = like is not None
        
    return blogs

from app.schemas.content import ConnectionResponse
from sqlalchemy import or_

def _build_connection_responses(db: Session, users: List[User], current_user_id) -> List[dict]:
    if not users:
        return []
        
    user_ids = [u.id for u in users]
    from app.models.profile import Profile
    from app.models.follower import Follower
    from app.models.blog import Blog as BlogModel
    from app.models.category import Category
    from sqlalchemy import func
    
    profiles = db.query(Profile).filter(Profile.user_id.in_(user_ids)).all()
    profile_map = {p.user_id: p for p in profiles}
    
    follower_counts = db.query(Follower.following_id, func.count(Follower.follower_id)).filter(Follower.following_id.in_(user_ids)).group_by(Follower.following_id).all()
    followers_map = {f[0]: f[1] for f in follower_counts}
    
    blogs_counts = db.query(BlogModel.author_id, func.count(BlogModel.id)).filter(BlogModel.author_id.in_(user_ids), BlogModel.is_published == True).group_by(BlogModel.author_id).all()
    blogs_map = {b[0]: b[1] for b in blogs_counts}
    
    topics_query = db.query(BlogModel.author_id, Category.name).join(Category, BlogModel.category_id == Category.id).filter(BlogModel.author_id.in_(user_ids), BlogModel.is_published == True).distinct().all()
    topics_map = {u.id: [] for u in users}
    for author_id, cat_name in topics_query:
        topics_map[author_id].append(cat_name)
        
    following_ids = set()
    if current_user_id:
        follows = db.query(Follower.following_id).filter(Follower.follower_id == current_user_id, Follower.following_id.in_(user_ids)).all()
        following_ids = {f[0] for f in follows}
        
    result = []
    for user in users:
        p = profile_map.get(user.id)
        result.append({
            "id": user.id,
            "email": user.email,
            "is_following": user.id in following_ids,
            "username": p.username if p else None,
            "first_name": p.first_name if p else None,
            "last_name": p.last_name if p else None,
            "avatar_url": p.avatar_url if p else None,
            "bio": p.bio if p else None,
            "is_verified": getattr(user, 'is_verified', False),
            "followers_count": followers_map.get(user.id, 0),
            "blogs_count": blogs_map.get(user.id, 0),
            "topics": topics_map.get(user.id, []),
            "recommendation_reason": "Publishing ideas you may enjoy"
        })
    return result

@router.get("/suggested-authors", response_model=List[ConnectionResponse])
async def get_suggested_authors(
    db: Session = Depends(deps.get_db),
    limit: int = 10,
    q: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """Get author suggestions or search."""
    from app.models.profile import Profile
    from app.models.follower import Follower

    query = db.query(User).filter(User.is_active == True)
    
    if q and q.strip():
        # Use Meilisearch for robust full-text search
        meilisearch_ids = None
        from app.api.api_v1.endpoints.search import get_meilisearch_client
        client = get_meilisearch_client()
        try:
            ms_res = client.index('users').search(q.strip(), {'limit': limit, 'attributesToRetrieve': ['id']})
            meilisearch_ids = [hit['id'] for hit in ms_res.get('hits', [])]
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Meilisearch query failed for users: %s", e)
            
        if meilisearch_ids is not None:
            # Filter the DB query by the IDs returned from Meilisearch
            if meilisearch_ids:
                query = query.filter(User.id.in_(meilisearch_ids))
                from sqlalchemy import case
                case_stmt = case(
                    {id_: index for index, id_ in enumerate(meilisearch_ids)},
                    value=User.id
                )
                query = query.order_by(case_stmt)
            else:
                query = query.filter(False) # No results found
        else:
            # Fallback to DB search if Meilisearch fails
            search_pattern = f"%{q.strip()}%"
            query = query.join(Profile, Profile.user_id == User.id).filter(
                or_(
                    Profile.username.ilike(search_pattern),
                    Profile.first_name.ilike(search_pattern),
                    Profile.last_name.ilike(search_pattern),
                    Profile.bio.ilike(search_pattern)
                )
            )
    else:
        query = query.filter(User.is_verified == True)
        if current_user:
            current_user_follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
            following_ids = {f.following_id for f in current_user_follows}
            following_ids.add(current_user.id)
            if following_ids:
                query = query.filter(~User.id.in_(following_ids))
                
    users = query.limit(limit).all()
    return _build_connection_responses(db, users, current_user.id if current_user else None)


# ─── GET /{identifier}  (public — safe fields only, no email/password) ────────

@router.get("/{identifier}", response_model=UserProfileResponse)
async def get_user_profile(
    *,
    db: Session = Depends(deps.get_db),
    identifier: str,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    from app.models.profile import Profile

    # Protect the /me path from falling into this handler
    if identifier == "me":
        raise HTTPException(status_code=400, detail="Use /users/me for your own profile")

    user = None

    # Try UUID first
    try:
        uuid_obj = UUID(identifier)
        user = db.query(User).filter(User.id == uuid_obj).first()
    except ValueError:
        pass

    # Then try username
    if not user:
        profile_match = db.query(Profile).filter(Profile.username == identifier).first()
        if profile_match:
            user = db.query(User).filter(User.id == profile_match.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    followers_count = db.query(Follower).filter(Follower.following_id == user.id).count()
    following_count = db.query(Follower).filter(Follower.follower_id == user.id).count()
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()

    is_following = False
    if current_user:
        is_following = db.query(Follower).filter(
            Follower.follower_id == current_user.id,
            Follower.following_id == user.id
        ).first() is not None

    # Return ONLY safe public fields — no email, no hashed_password
    return _build_public_profile(user, profile, followers_count, following_count, is_following)


# ─── POST /{identifier}/follow ────────────────────────────────────────────────

from app.schemas.content import AuthorResponse
from typing import List

@router.get("/{identifier}/followers", response_model=List[ConnectionResponse])
def get_user_followers(
    *,
    db: Session = Depends(deps.get_db),
    identifier: str,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    from app.models.profile import Profile
    from app.models.follower import Follower

    identifier_clean = identifier.strip()
    
    if identifier_clean == "me":
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        target_user = current_user
    else:
        target_user = None
        try:
            uuid_obj = UUID(identifier_clean)
            target_user = db.query(User).filter(User.id == uuid_obj).first()
        except ValueError:
            pass

        if not target_user:
            profile_match = db.query(Profile).filter(func.lower(Profile.username) == identifier_clean.lower()).first()
            if profile_match:
                target_user = db.query(User).filter(User.id == profile_match.user_id).first()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

    query = db.query(User).join(Follower, Follower.follower_id == User.id).filter(Follower.following_id == target_user.id)
    
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        query = query.join(Profile, Profile.user_id == User.id).filter(
            or_(
                Profile.username.ilike(search_pattern),
                Profile.first_name.ilike(search_pattern),
                Profile.last_name.ilike(search_pattern),
                Profile.bio.ilike(search_pattern)
            )
        )
        
    followers = query.order_by(Follower.created_at.desc()).offset(skip).limit(limit).all()

    return _build_connection_responses(db, followers, current_user.id if current_user else None)

@router.get("/{identifier}/following", response_model=List[ConnectionResponse])
def get_user_following(
    *,
    db: Session = Depends(deps.get_db),
    identifier: str,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    from app.models.profile import Profile
    from app.models.follower import Follower

    identifier_clean = identifier.strip()
    
    if identifier_clean == "me":
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        target_user = current_user
    else:
        target_user = None
        try:
            uuid_obj = UUID(identifier_clean)
            target_user = db.query(User).filter(User.id == uuid_obj).first()
        except ValueError:
            pass

        if not target_user:
            profile_match = db.query(Profile).filter(func.lower(Profile.username) == identifier_clean.lower()).first()
            if profile_match:
                target_user = db.query(User).filter(User.id == profile_match.user_id).first()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

    query = db.query(User).join(Follower, Follower.following_id == User.id).filter(Follower.follower_id == target_user.id)
    
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        query = query.join(Profile, Profile.user_id == User.id).filter(
            or_(
                Profile.username.ilike(search_pattern),
                Profile.first_name.ilike(search_pattern),
                Profile.last_name.ilike(search_pattern),
                Profile.bio.ilike(search_pattern)
            )
        )
        
    following = query.order_by(Follower.created_at.desc()).offset(skip).limit(limit).all()

    return _build_connection_responses(db, following, current_user.id if current_user else None)

@router.post("/{identifier}/follow")
async def toggle_follow(
    *,
    db: Session = Depends(deps.get_db),
    identifier: str,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    from app.models.profile import Profile
    from app.models.follower import Follower
    from app.models.notification import Notification

    # Find the target user by identifier (UUID or username)
    target_user = None
    identifier_clean = identifier.strip()
    try:
        uuid_obj = UUID(identifier_clean)
        target_user = db.query(User).filter(User.id == uuid_obj).first()
    except ValueError:
        pass

    if not target_user:
        profile_match = db.query(Profile).filter(func.lower(Profile.username) == identifier_clean.lower()).first()
        if profile_match:
            target_user = db.query(User).filter(User.id == profile_match.user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    follow = db.query(Follower).filter(
        Follower.follower_id == current_user.id,
        Follower.following_id == target_user.id
    ).first()

    if follow:
        db.delete(follow)
        db.commit()
        return {"status": "unfollowed"}
    else:
        new_follow = Follower(follower_id=current_user.id, following_id=target_user.id)
        db.add(new_follow)
        db.commit()

        # Notify target user via real-time notification publisher (safely)
        try:
            profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
            display = (
                (profile.first_name if profile and profile.first_name else None)
                or (profile.username if profile and profile.username else None)
                or (current_user.email.split('@')[0] if current_user.email else "Someone")
            )
            from app.services.notification_publisher import notification_publisher
            await notification_publisher.publish(
                user_id=str(target_user.id),
                type="new_follower",
                content=f"{display} started following you",
                related_user_id=str(current_user.id)
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("Failed to publish follow notification: %s", exc)

        # Event Bus Publish
        try:
            from app.core.event_bus import event_bus
            await event_bus.publish_event(
                "user_followed",
                {"follower_id": str(current_user.id), "following_id": str(target_user.id)}
            )
        except Exception:
            pass

        return {"status": "followed"}


@router.get("/{identifier}/mutual-connections", response_model=List[AuthorResponse])
async def get_mutual_connections(
    identifier: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Calculate mutual connections (followed users in common) between current user and target user."""
    from app.models.profile import Profile
    from app.models.follower import Follower

    target_user = None
    try:
        uuid_obj = UUID(identifier)
        target_user = db.query(User).filter(User.id == uuid_obj).first()
    except ValueError:
        pass

    if not target_user:
        profile_match = db.query(Profile).filter(Profile.username == identifier).first()
        if profile_match:
            target_user = db.query(User).filter(User.id == profile_match.user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    my_follows = {f.following_id for f in db.query(Follower).filter(Follower.follower_id == current_user.id).all()}
    their_follows = {f.following_id for f in db.query(Follower).filter(Follower.follower_id == target_user.id).all()}

    mutual_ids = my_follows.intersection(their_follows)
    if not mutual_ids:
        return []

    users = db.query(User).filter(User.id.in_(mutual_ids)).all()
    result = []
    for u in users:
        u_data = {"id": u.id, "email": u.email, "is_following": True}
        if hasattr(u, "profile") and u.profile:
            p = u.profile[0] if isinstance(u.profile, list) else u.profile
            u_data["username"] = p.username
            u_data["first_name"] = p.first_name
            u_data["last_name"] = p.last_name
            u_data["avatar_url"] = p.avatar_url
        result.append(u_data)
    return result


# ─── PUT /me  (private — only edit your own profile) ──────────────────────────

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    from app.models.profile import Profile

    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    if user_in.username is not None and user_in.username.strip() != "":
        clean_username = user_in.username.strip().lower().replace(" ", "")
        existing = db.query(Profile).filter(
            Profile.username == clean_username,
            Profile.user_id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username is already taken.")
        
        # Only add to bloom filter if it's actually changing
        if profile.username != clean_username:
            profile.username = clean_username
            background_tasks.add_task(UsernameBloomFilter.add, clean_username)

    if user_in.first_name is not None:
        profile.first_name = user_in.first_name
    if user_in.last_name is not None:
        profile.last_name = user_in.last_name
    if user_in.bio is not None:
        profile.bio = user_in.bio
    if user_in.avatar_url is not None:
        profile.avatar_url = user_in.avatar_url
    if user_in.website is not None:
        profile.website = user_in.website

    db.commit()
    db.refresh(current_user)

    user_data = {c.name: getattr(current_user, c.name) for c in current_user.__table__.columns
                 if c.name != "hashed_password"}   # never expose hash
    if profile:
        user_data["username"] = profile.username or (current_user.email.split("@")[0] if current_user.email else None)
        user_data["first_name"] = profile.first_name
        user_data["last_name"] = profile.last_name
        user_data["avatar_url"] = profile.avatar_url
        user_data["bio"] = profile.bio
        user_data["website"] = profile.website

    background_tasks.add_task(
        publish_search_event,
        "index",
        "users",
        current_user.id,
        {
            "id": str(current_user.id),
            "username": user_data.get("username"),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "bio": user_data.get("bio"),
            "avatar_url": user_data.get("avatar_url")
        }
    )

    return user_data

# ─── PUT /me/password ─────────────────────────────────────────────────────────

@router.put("/me/password")
async def change_password(
    *,
    db: Session = Depends(deps.get_db),
    body: ChangePasswordRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Change the password for the currently authenticated user."""
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as the current password")

    if not security.verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = security.get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


# ─── GET /me/activity ─────────────────────────────────────────────────────────

@router.get("/me/activity")
async def get_my_activity(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get recent activity (liked blogs, recent comments) for the authenticated user."""
    
    # 1. Liked Blogs
    likes = db.query(Like).filter(Like.user_id == current_user.id).order_by(Like.created_at.desc()).limit(20).all()
    liked_blogs = [like.blog for like in likes if like.blog]

    # Convert to response dict manually or rely on FastAPI response_model (but we have a mixed dict)
    from app.schemas.content import BlogResponse
    
    # 2. Recent Comments
    comments = db.query(Comment).filter(Comment.user_id == current_user.id).order_by(Comment.created_at.desc()).limit(20).all()
    
    # We can just return raw dicts that map to the frontend expectations.
    # We use BlogResponse.model_validate to properly shape the blogs
    liked_blogs_serialized = [BlogResponse.model_validate(b).model_dump() for b in liked_blogs]
    
    comments_serialized = []
    for c in comments:
        comments_serialized.append({
            "id": c.id,
            "content": c.content,
            "blog_id": c.blog_id,
            "created_at": c.created_at,
            "blog_title": c.blog.title if getattr(c, "blog", None) else "Deleted Blog"
        })

    return {
        "liked_blogs": liked_blogs_serialized,
        "comments": comments_serialized
    }

# ─── GET /me/notifications ────────────────────────────────────────────────────

@router.get("/me/notifications", response_model=List[NotificationResponse])
async def get_my_notifications(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get notifications for the authenticated user."""
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

# ─── GET /me/notifications/unread-count ──────────────────────────────────────

@router.get("/me/notifications/unread-count")
async def get_unread_notification_count(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get the count of unread notifications for the authenticated user."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"unread_count": count}

# ─── PUT /me/notifications/{id}/read ──────────────────────────────────────────

@router.put("/me/notifications/{id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark a specific notification as read."""
    notification = db.query(Notification).filter(Notification.id == id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

