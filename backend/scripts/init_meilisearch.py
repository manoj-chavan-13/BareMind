import asyncio
import os
import sys

# Add backend to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.models.blog import Blog
from app.models.category import Category
from app.models.tag import Tag
from app.models.comment import Comment
from app.models.interaction import Bookmark, Like
from app.models.follower import Follower
from app.models.notification import Notification
import meilisearch

def init_search_indices():
    print(f"Connecting to Meilisearch at {settings.MEILISEARCH_URL}")
    client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)

    # 1. Blogs Index
    try:
        client.create_index('blogs', {'primaryKey': 'id'})
        print("Created index 'blogs'")
    except Exception as e:
        print(f"Index 'blogs' might already exist: {e}")
    
    client.index('blogs').update_searchable_attributes(['title', 'content', 'slug'])
    client.index('blogs').update_filterable_attributes(['author_id', 'is_published'])

    # 2. Users Index
    try:
        client.create_index('users', {'primaryKey': 'id'})
        print("Created index 'users'")
    except Exception as e:
        print(f"Index 'users' might already exist: {e}")
        
    client.index('users').update_searchable_attributes(['username', 'first_name', 'last_name', 'bio'])

def bulk_import():
    db = SessionLocal()
    client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)
    try:
        # Import Users
        print("Importing users...")
        users = db.query(User).all()
        user_docs = []
        for user in users:
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            user_docs.append({
                "id": str(user.id),
                "username": profile.username if profile else (user.email.split('@')[0] if user.email else ""),
                "first_name": profile.first_name if profile else "",
                "last_name": profile.last_name if profile else "",
                "bio": profile.bio if profile else "",
                "avatar_url": profile.avatar_url if profile else ""
            })
        if user_docs:
            client.index('users').add_documents(user_docs)
            print(f"Queued {len(user_docs)} users for indexing.")

        # Import Blogs
        print("Importing blogs...")
        blogs = db.query(Blog).filter(Blog.is_published == True).all()
        blog_docs = []
        for blog in blogs:
            blog_docs.append({
                "id": blog.id,
                "title": blog.title,
                "content": blog.content,
                "slug": blog.slug,
                "author_id": str(blog.author_id),
                "is_published": blog.is_published,
                "created_at": blog.created_at.isoformat() if blog.created_at else None
            })
        if blog_docs:
            client.index('blogs').add_documents(blog_docs)
            print(f"Queued {len(blog_docs)} blogs for indexing.")
            
    finally:
        db.close()

if __name__ == "__main__":
    init_search_indices()
    bulk_import()
    print("Done!")
