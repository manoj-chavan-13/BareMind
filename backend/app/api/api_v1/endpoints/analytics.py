from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.api import deps
from app.models.user import User
from app.models.blog import Blog
from app.models.interaction import Like, Bookmark
from app.models.comment import Comment
from app.models.category import Category
from app.models.audit_log import AuditLog

router = APIRouter()

@router.get("/overview")
async def get_analytics_overview(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get platform analytics overview:
    Daily Active Users (DAU), Total Blogs, Views, Likes, Comments, and Bookmarks.
    """
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)
    thirty_days_ago = now - timedelta(days=30)

    # DAU (Users active in last 24h via audit logs or users table)
    dau = (
        db.query(func.count(func.distinct(AuditLog.user_id)))
        .filter(AuditLog.created_at >= one_day_ago, AuditLog.user_id.isnot(None))
        .scalar() or 0
    )

    # MAU (Users active in last 30 days)
    mau = (
        db.query(func.count(func.distinct(AuditLog.user_id)))
        .filter(AuditLog.created_at >= thirty_days_ago, AuditLog.user_id.isnot(None))
        .scalar() or 0
    )

    total_blogs = db.query(func.count(Blog.id)).filter(Blog.is_published == True).scalar() or 0
    total_views = db.query(func.sum(Blog.views)).scalar() or 0
    total_likes = db.query(func.count(Like.id)).scalar() or 0
    total_comments = db.query(func.count(Comment.id)).scalar() or 0
    total_bookmarks = db.query(func.count(Bookmark.id)).scalar() or 0

    return {
        "dau": dau,
        "mau": mau,
        "total_published_blogs": total_blogs,
        "total_views": total_views,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_bookmarks": total_bookmarks,
    }


@router.get("/trending-topics")
async def get_trending_topics(
    db: Session = Depends(deps.get_db),
) -> Any:
    """Get top categories ranked by publication and view activity."""
    categories = (
        db.query(
            Category.id,
            Category.name,
            Category.slug,
            func.count(Blog.id).label("blog_count"),
            func.coalesce(func.sum(Blog.views), 0).label("total_views")
        )
        .outerjoin(Blog, (Blog.category_id == Category.id) & (Blog.is_published == True))
        .group_by(Category.id, Category.name, Category.slug)
        .order_by(func.coalesce(func.sum(Blog.views), 0).desc(), func.count(Blog.id).desc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "blog_count": c.blog_count,
            "total_views": c.total_views,
        }
        for c in categories
    ]


@router.get("/blogs/{blog_id}")
async def get_blog_analytics(
    blog_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get detailed performance metrics for a specific blog post."""
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")

    likes_count = db.query(func.count(Like.id)).filter(Like.blog_id == blog_id).scalar() or 0
    comments_count = db.query(func.count(Comment.id)).filter(Comment.blog_id == blog_id).scalar() or 0
    bookmarks_count = db.query(func.count(Bookmark.id)).filter(Bookmark.blog_id == blog_id).scalar() or 0

    return {
        "blog_id": blog.id,
        "title": blog.title,
        "views": blog.views or 0,
        "likes": likes_count,
        "comments": comments_count,
        "bookmarks": bookmarks_count,
        "reading_time_minutes": blog.reading_time or 0,
        "created_at": blog.created_at,
    }
