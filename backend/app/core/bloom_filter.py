import hashlib
from typing import List
from sqlalchemy.orm import Session
from app.core.redis_client import redis_client

# Parameters for Bloom Filter
# n = 1,000,000 (Expected number of usernames)
# p = 0.01 (1% False positive rate)
# m = ~10,000,000 bits (~1.19 MB)
# k = 7 hash functions
BLOOM_FILTER_KEY = "bloom:username"
M_BITS = 10_000_000
K_HASHES = 7

def _get_hash_indices(username: str) -> List[int]:
    """Generates K hash indices for a given username using MD5."""
    clean_username = username.strip().lower()
    
    indices = []
    for i in range(K_HASHES):
        salted = f"{clean_username}:{i}".encode('utf-8')
        h = int(hashlib.md5(salted).hexdigest()[:8], 16)  # Use first 32 bits
        indices.append(h % M_BITS)
        
    return indices

class UsernameBloomFilter:
    
    @staticmethod
    async def add(username: str) -> None:
        """Adds a username to the Redis Bloom Filter."""
        indices = _get_hash_indices(username)
        
        pipeline = redis_client.pipeline()
        for idx in indices:
            pipeline.setbit(BLOOM_FILTER_KEY, idx, 1)
        
        await pipeline.execute()

    @staticmethod
    async def might_contain(username: str) -> bool:
        """
        Checks if a username MIGHT exist.
        Returns False if definitely available.
        Returns True if possibly taken (requires DB check).
        """
        indices = _get_hash_indices(username)
        
        pipeline = redis_client.pipeline()
        for idx in indices:
            pipeline.getbit(BLOOM_FILTER_KEY, idx)
            
        results = await pipeline.execute()
        
        if 0 in results:
            return False
            
        return True

    @staticmethod
    async def sync_from_db(db: Session) -> None:
        """
        Loads all existing usernames from the database into the Bloom Filter.
        Should run on application startup.
        """
        from app.models.profile import Profile
        
        is_populated = await redis_client.exists(BLOOM_FILTER_KEY)
        if is_populated:
            return
            
        profiles = db.query(Profile.username).filter(Profile.username.isnot(None)).all()
        
        if not profiles:
            return
            
        pipeline = redis_client.pipeline()
        count = 0
        
        for p in profiles:
            if not p.username:
                continue
            indices = _get_hash_indices(p.username)
            for idx in indices:
                pipeline.setbit(BLOOM_FILTER_KEY, idx, 1)
                
            count += 1
            if count % 1000 == 0:
                await pipeline.execute()
                pipeline = redis_client.pipeline()
                
        if count % 1000 != 0:
            await pipeline.execute()
            
        print(f"[Bloom Filter] Successfully synced {count} usernames from database.")
