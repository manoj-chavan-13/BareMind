"""
base.py
───────
Imports Base + ALL models so Alembic can auto-discover tables.
Do NOT import this from model files — use base_class.py instead.
"""
from app.db.base_class import Base  # noqa: F401

# Import all models here so Alembic sees them during autogenerate
from app.models.user import User          # noqa: F401
from app.models.profile import Profile    # noqa: F401
from app.models.blog import Blog          # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.tag import Tag, blog_tags # noqa: F401
from app.models.comment import Comment    # noqa: F401
from app.models.interaction import Like, Bookmark # noqa: F401
from app.models.follower import Follower  # noqa: F401
from app.models.notification import Notification # noqa: F401
from app.models.course import Course, Module, Lesson  # noqa: F401
