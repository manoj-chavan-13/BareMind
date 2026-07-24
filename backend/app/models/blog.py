from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    content = Column(Text, nullable=False)
    cover_image = Column(String, nullable=True)
    reading_time = Column(Integer, default=0)
    views = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    author = relationship("User", backref="blogs")
    category = relationship("Category", backref="blogs")
    tags = relationship("Tag", secondary="blog_tags", backref="blogs")
    comments = relationship("Comment", backref="blog", cascade="all, delete-orphan")
    likes = relationship("Like", backref="blog", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", backref="blog", cascade="all, delete-orphan")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
