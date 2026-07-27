import sys
import asyncio
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.category import Category
from app.core.config import settings
import meilisearch

def seed_categories():
    client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        
        docs = []
        for cat in categories:
            docs.append({
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "slug": cat.slug,
            })
            
        if docs:
            # Create index if not exists
            client.index("categories").update_settings({
                "searchableAttributes": ["name", "description"],
                "filterableAttributes": ["id", "slug"]
            })
            
            task = client.index("categories").add_documents(docs)
            print(f"Pushed {len(docs)} categories to Meilisearch! Task UID: {task.task_uid}")
        else:
            print("No categories found in DB.")
            
    except Exception as e:
        print(f"Failed to seed categories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding categories to Meilisearch...")
    seed_categories()
