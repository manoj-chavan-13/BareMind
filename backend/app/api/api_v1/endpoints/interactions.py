from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.interaction import Like, Bookmark
from app.models.comment import Comment
from app.models.blog import Blog
from app.models.user import User
from app.schemas.interaction import CommentCreate, CommentResponse, LikeResponse, BookmarkResponse
from app.services.recommendation import recommendation_engine
from app.services.search_publisher import publish_search_event

router = APIRouter()


async def _publish_notification(user_id, type: str, content: str, related_user_id=None, related_blog_id=None):
    """Helper to publish a notification via the publisher (fire-and-forget)."""
    try:
        from app.services.notification_publisher import notification_publisher
        await notification_publisher.publish(
            user_id=str(user_id),
            type=type,
            content=content,
            related_user_id=str(related_user_id) if related_user_id else None,
            related_blog_id=related_blog_id,
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Failed to publish notification: %s", exc)


# --- Comments ---
@router.get("/blogs/{blog_id}/comments", response_model=List[CommentResponse])
def get_comments(blog_id: int, db: Session = Depends(deps.get_db), skip: int = 0, limit: int = 100) -> Any:
    return db.query(Comment).filter(Comment.blog_id == blog_id).offset(skip).limit(limit).all()

@router.post("/blogs/{blog_id}/comments", response_model=CommentResponse)
def create_comment(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    comment = Comment(
        content=comment_in.content,
        parent_id=comment_in.parent_id,
        blog_id=blog_id,
        user_id=current_user.id
    )
    db.add(comment)
    
    # Increment comments_count
    if blog.comments_count is None:
        blog.comments_count = 0
    blog.comments_count += 1
    
    db.commit()
    db.refresh(comment)
    
    # Notify author (async via Kafka + Redis, no direct DB write)
    if blog.author_id != current_user.id:
        display = (
            getattr(current_user, "first_name", None)
            or (current_user.email.split('@')[0] if current_user.email else "Someone")
        )
        background_tasks.add_task(
            _publish_notification,
            user_id=blog.author_id,
            type="new_comment",
            content=f"{display} commented on your blog '{blog.title}'",
            related_user_id=current_user.id,
            related_blog_id=blog.id,
        )
    
    background_tasks.add_task(
        publish_search_event,
        "blog_comment",
        "blogs",
        blog.id,
        {"blog_id": blog.id, "user_id": str(current_user.id)}
    )
    
    return comment

@router.delete("/comments/{comment_id}")
def delete_comment(
    *,
    db: Session = Depends(deps.get_db),
    comment_id: int,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Decrement comments_count
    blog = db.query(Blog).filter(Blog.id == comment.blog_id).first()
    if blog:
        if blog.comments_count is None:
            blog.comments_count = 0
        blog.comments_count = max(0, blog.comments_count - 1)
        
    db.delete(comment)
    db.commit()
    return {"success": True}

# --- Likes ---
@router.post("/blogs/{blog_id}/like")
def toggle_like(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    blog = db.query(Blog).filter(Blog.id == blog_id).with_for_update().first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    like = db.query(Like).filter(Like.blog_id == blog_id, Like.user_id == current_user.id).first()
    if like:
        db.delete(like)
        if blog.likes_count is None:
            blog.likes_count = 0
        blog.likes_count = max(0, blog.likes_count - 1)
        db.commit()
        return {"status": "unliked"}
    else:
        new_like = Like(blog_id=blog_id, user_id=current_user.id)
        db.add(new_like)
        
        if blog.likes_count is None:
            blog.likes_count = 0
        blog.likes_count += 1
        db.commit()
        
        # Notify author (async via Kafka + Redis)
        if blog.author_id != current_user.id:
            display = (
                getattr(current_user, "first_name", None)
                or (current_user.email.split('@')[0] if current_user.email else "Someone")
            )
            background_tasks.add_task(
                _publish_notification,
                user_id=blog.author_id,
                type="blog_like",
                content=f"{display} liked your blog '{blog.title}'",
                related_user_id=current_user.id,
                related_blog_id=blog.id,
            )
        
        background_tasks.add_task(
            publish_search_event,
            "blog_like",
            "blogs",
            blog.id,
            {"blog_id": blog.id, "user_id": str(current_user.id)}
        )
        return {"status": "liked"}

# --- Bookmarks ---
@router.post("/blogs/{blog_id}/bookmark")
def toggle_bookmark(
    *,
    db: Session = Depends(deps.get_db),
    blog_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    blog = db.query(Blog).filter(Blog.id == blog_id).with_for_update().first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    bookmark = db.query(Bookmark).filter(Bookmark.blog_id == blog_id, Bookmark.user_id == current_user.id).first()
    if bookmark:
        db.delete(bookmark)
        db.commit()
        return {"status": "unbookmarked"}
    else:
        new_bookmark = Bookmark(blog_id=blog_id, user_id=current_user.id)
        db.add(new_bookmark)
        db.commit()
        
        background_tasks.add_task(
            publish_search_event,
            "blog_bookmark",
            "blogs",
            blog.id,
            {"blog_id": blog.id, "user_id": str(current_user.id)}
        )
        return {"status": "bookmarked"}
