from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.blog import Blog
from app.schemas.content import BlogCreate, BlogUpdate
from app.models.tag import Tag
import math

def calculate_reading_time(content: str) -> int:
    word_count = len(content.split())
    # 200 words per minute average reading speed
    return max(1, math.ceil(word_count / 200))

def get_blog(db: Session, blog_id: int) -> Optional[Blog]:
    return db.query(Blog).filter(Blog.id == blog_id).first()

def get_blog_by_slug(db: Session, slug: str) -> Optional[Blog]:
    return db.query(Blog).filter(Blog.slug == slug).first()

def get_blogs(db: Session, skip: int = 0, limit: int = 100) -> List[Blog]:
    return db.query(Blog).filter(Blog.is_published == True).order_by(Blog.created_at.desc()).offset(skip).limit(limit).all()

def create_blog(db: Session, *, obj_in: BlogCreate, author_id: UUID) -> Blog:
    db_obj = Blog(
        title=obj_in.title,
        slug=obj_in.slug,
        content=obj_in.content,
        is_published=obj_in.is_published,
        cover_image=obj_in.cover_image,
        category_id=obj_in.category_id,
        scheduled_at=obj_in.scheduled_at,
        reading_time=calculate_reading_time(obj_in.content),
        author_id=author_id,
    )

    if not db_obj.category_id:
        from app.services.auto_categorizer import auto_categorizer
        cat = auto_categorizer.suggest_category(db, obj_in.title, obj_in.content)
        db_obj.category_id = cat.id

    if obj_in.tags:
        tags = db.query(Tag).filter(Tag.id.in_(obj_in.tags)).all()
        db_obj.tags = tags
    else:
        from app.services.auto_tagger import auto_tagger
        db_obj.tags = auto_tagger.suggest_tags(db, obj_in.title, obj_in.content)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_blog(db: Session, *, db_obj: Blog, obj_in: BlogUpdate) -> Blog:
    update_data = obj_in.model_dump(exclude_unset=True)
    
    if "content" in update_data:
        db_obj.reading_time = calculate_reading_time(update_data["content"])

    if "tags" in update_data:
        tags_list = update_data.pop("tags")
        if tags_list is not None:
            tags = db.query(Tag).filter(Tag.id.in_(tags_list)).all()
            db_obj.tags = tags

    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove_blog(db: Session, *, id: int) -> Blog:
    obj = db.query(Blog).get(id)
    db.delete(obj)
    db.commit()
    return obj
