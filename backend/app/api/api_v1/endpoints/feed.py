from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_content
from app.schemas.content import BlogResponse
from app.models.user import User
from app.services.recommendation import recommendation_engine
from app.models.interaction import Like, Bookmark
from app.models.follower import Follower

router = APIRouter()

@router.get("/", response_model=List[BlogResponse])
async def get_personalized_feed(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Retrieve a personalized and ranked feed of blogs.
    """
    # Fetch base blogs (we fetch more to allow the engine to rank them properly)
    blogs = crud_content.get_blogs(db, skip=skip, limit=limit * 2)
    
    user_id = current_user.id if current_user else None
    
    # 1. Rank the feed using the Big Tech Recommendation Engine
    ranked_blogs = await recommendation_engine.rank_feed(user_id=user_id, blogs=blogs)
    
    # Trim back down to requested limit after ranking
    final_blogs = ranked_blogs[:limit]
    
    # 2. Inject Contextual Interaction States
    if current_user:
        blog_ids = [b.id for b in final_blogs]
        liked_blog_ids = {like.blog_id for like in db.query(Like).filter(Like.user_id == current_user.id, Like.blog_id.in_(blog_ids)).all()}
        bookmarked_blog_ids = {bm.blog_id for bm in db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.blog_id.in_(blog_ids)).all()}
        
        # Pre-fetch following IDs for author is_following injection
        follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
        following_ids = {f.following_id for f in follows}
        
        for blog in final_blogs:
            blog.is_liked_by_user = blog.id in liked_blog_ids
            blog.is_bookmarked_by_user = blog.id in bookmarked_blog_ids
            if blog.author:
                # We dynamically attach is_following to the author object so the schema can read it
                blog.author.is_following = blog.author_id in following_ids
    else:
        for blog in final_blogs:
            blog.is_liked_by_user = False
            blog.is_bookmarked_by_user = False
            if blog.author:
                blog.author.is_following = False
                
    return final_blogs

@router.get("/following", response_model=List[BlogResponse])
async def get_following_feed(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve a chronological feed of blogs only from authors the current user follows.
    """
    # Fetch followed user IDs
    follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
    following_ids = {f.following_id for f in follows}
    
    if not following_ids:
        return []
        
    from app.models.blog import Blog as BlogModel
    
    # Fetch blogs from those authors, ordered chronologically
    blogs = db.query(BlogModel)\
        .filter(BlogModel.author_id.in_(following_ids))\
        .order_by(BlogModel.created_at.desc())\
        .offset(skip).limit(limit).all()
        
    # Inject Contextual Interaction States
    blog_ids = [b.id for b in blogs]
    liked_blog_ids = {like.blog_id for like in db.query(Like).filter(Like.user_id == current_user.id, Like.blog_id.in_(blog_ids)).all()}
    bookmarked_blog_ids = {bm.blog_id for bm in db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.blog_id.in_(blog_ids)).all()}
    
    for blog in blogs:
        blog.is_liked_by_user = blog.id in liked_blog_ids
        blog.is_bookmarked_by_user = blog.id in bookmarked_blog_ids
        if blog.author:
            blog.author.is_following = True # Inherently true since it's the following feed
            
    return blogs
