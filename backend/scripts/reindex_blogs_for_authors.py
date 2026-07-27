import sys
import os
import asyncio

# Add backend directory to sys.path so 'app' can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.blog import Blog
from app.models.user import User
from app.models.profile import Profile
from app.models.category import Category
from app.models.tag import Tag
from app.models.comment import Comment
from app.models.interaction import Like, Bookmark

# Re-use the existing search publisher
from app.services.search_publisher import search_publisher

async def reindex_blogs():
    db = SessionLocal()
    await search_publisher.start()
    try:
        blogs = db.query(Blog).filter(Blog.is_published == True).all()
        tasks = []
        for blog in blogs:
            profile = db.query(Profile).filter(Profile.user_id == blog.author_id).first()
            author_name = "Unknown"
            author_username = "unknown"
            if profile:
                author_username = profile.username or "unknown"
                if profile.first_name:
                    author_name = f"{profile.first_name} {profile.last_name or ''}".strip()
                elif profile.username:
                    author_name = profile.username
                    
            print(f"Queueing index for Blog {blog.id} (Author: {author_name})")
            
            task = search_publisher.publish(
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
            tasks.append(task)
            
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            
        print("Done reindexing blogs for author names.")
    except Exception as e:
        print(f"Error reindexing blogs: {e}")
    finally:
        await search_publisher.stop()
        db.close()

if __name__ == "__main__":
    asyncio.run(reindex_blogs())
