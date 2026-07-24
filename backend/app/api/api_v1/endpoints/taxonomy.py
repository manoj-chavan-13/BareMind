from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.api import deps
from app.models.category import Category
from app.models.tag import Tag
from app.schemas.taxonomy import CategoryCreate, CategoryResponse, TagCreate, TagResponse
from app.models.user import User
from app.services.search_publisher import publish_search_event

router = APIRouter()

# Categories
from app.models.category import user_categories

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user_optional)
) -> Any:
    query = db.query(Category)
    
    if q and q.strip():
        clean_q = q.strip()
        
        if len(clean_q) > 2:
            background_tasks.add_task(
                publish_search_event,
                "query",
                "search_queries",
                clean_q,
                {"query": clean_q}
            )

        meilisearch_ids = None
        from app.api.api_v1.endpoints.search import get_meilisearch_client
        client = get_meilisearch_client()
        try:
            ms_res = client.index('categories').search(clean_q, {'limit': limit, 'attributesToRetrieve': ['id']})
            meilisearch_ids = [hit['id'] for hit in ms_res.get('hits', [])]
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Meilisearch query failed for categories: %s", e)
            
        if meilisearch_ids is not None:
            if meilisearch_ids:
                query = query.filter(Category.id.in_(meilisearch_ids))
                from sqlalchemy import case
                case_stmt = case(
                    {id_: index for index, id_ in enumerate(meilisearch_ids)},
                    value=Category.id
                )
                query = query.order_by(case_stmt)
            else:
                query = query.filter(False) # No results found
        else:
            search_pattern = f"%{clean_q}%"
            query = query.filter(
                Category.name.ilike(search_pattern) | Category.description.ilike(search_pattern)
            )
            
    categories = query.offset(skip).limit(limit).all()
    
    from sqlalchemy import func
    follower_counts = dict(db.query(user_categories.c.category_id, func.count(user_categories.c.user_id)).group_by(user_categories.c.category_id).all())
    
    user_following = set()
    if current_user:
        user_following = {row.category_id for row in db.query(user_categories.c.category_id).filter(user_categories.c.user_id == current_user.id).all()}
        
    for cat in categories:
        cat.followers_count = follower_counts.get(cat.id, 0)
        cat.is_following = cat.id in user_following
        
    return categories

@router.post("/categories/{category_id}/follow")
def follow_category(
    category_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    existing = db.query(user_categories).filter(
        user_categories.c.user_id == current_user.id,
        user_categories.c.category_id == category.id
    ).first()
    
    if existing:
        db.execute(user_categories.delete().where(
            user_categories.c.user_id == current_user.id,
            user_categories.c.category_id == category.id
        ))
        db.commit()
        return {"status": "unfollowed"}
    else:
        db.execute(user_categories.insert().values(
            user_id=current_user.id,
            category_id=category.id
        ))
        db.commit()
        return {"status": "followed"}

from app.schemas.content import AuthorResponse
from app.models.blog import Blog as BlogModel

@router.get("/categories/{slug}/writers", response_model=List[AuthorResponse])
def get_category_writers(
    slug: str,
    db: Session = Depends(deps.get_db),
    limit: int = 5,
    current_user: User = Depends(deps.get_current_user_optional)
) -> Any:
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    top_writers = (
        db.query(User)
        .join(BlogModel, BlogModel.author_id == User.id)
        .filter(BlogModel.category_id == category.id, BlogModel.is_published == True)
        .group_by(User.id)
        .order_by(func.count(BlogModel.id).desc())
        .limit(limit)
        .all()
    )
    
    if current_user:
        from app.models.follower import Follower
        follows = db.query(Follower).filter(Follower.follower_id == current_user.id).all()
        following_ids = {f.following_id for f in follows}
        for writer in top_writers:
            writer.is_following = writer.id in following_ids
    else:
        for writer in top_writers:
            writer.is_following = False
            
    return top_writers

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    *,
    db: Session = Depends(deps.get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    category = db.query(Category).filter(Category.slug == category_in.slug).first()
    if category:
        raise HTTPException(status_code=400, detail="Category with this slug already exists.")
    
    category = Category(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# Tags
@router.get("/tags", response_model=List[TagResponse])
def get_tags(db: Session = Depends(deps.get_db), skip: int = 0, limit: int = 100) -> Any:
    return db.query(Tag).offset(skip).limit(limit).all()

@router.post("/tags", response_model=TagResponse)
def create_tag(
    *,
    db: Session = Depends(deps.get_db),
    tag_in: TagCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    tag = db.query(Tag).filter(Tag.slug == tag_in.slug).first()
    if tag:
        raise HTTPException(status_code=400, detail="Tag with this slug already exists.")
    
    tag = Tag(**tag_in.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


from sqlalchemy import func
from app.models.tag import blog_tags

@router.get("/popular-tags", response_model=List[TagResponse])
def get_popular_tags(db: Session = Depends(deps.get_db), limit: int = 15) -> Any:
    """Get top tags ranked by blog post count."""
    popular = (
        db.query(Tag)
        .join(blog_tags)
        .group_by(Tag.id)
        .order_by(func.count(blog_tags.c.blog_id).desc())
        .limit(limit)
        .all()
    )
    if not popular:
        return db.query(Tag).limit(limit).all()
    return popular
