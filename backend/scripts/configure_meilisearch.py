import meilisearch
import sys
import os

# Add backend directory to sys.path so 'app' can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def configure():
    client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_MASTER_KEY)
    
    print("Configuring 'blogs' index...")
    index = client.index('blogs')
    
    # We want to make sure author_name and author_username are searchable
    # The order of searchable attributes implies priority in Meilisearch.
    # We'll put title first, then author names, then content.
    searchable_attributes = [
        'title',
        'author_name',
        'author_username',
        'content'
    ]
    
    response = index.update_searchable_attributes(searchable_attributes)
    print("Update task queued:", response)

if __name__ == "__main__":
    configure()
