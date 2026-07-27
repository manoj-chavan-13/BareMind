from typing import List, Dict, Optional
from datetime import datetime, timezone
import math
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.redis_client import redis_client
from app.models.blog import Blog

# Weights for interactions to build user profiles
INTERACTION_WEIGHTS = {
    "view": 1,
    "like": 5,
    "comment": 7,
    "bookmark": 10,
}

class RecommendationEngine:
    @staticmethod
    async def track_interest(user_id: UUID, blog_id: int, interaction_type: str, db: Optional[Session] = None):
        """
        Update the user's interest profile in Redis based on a blog interaction.
        This acts like a real-time event streaming processor.
        """
        from app.db.session import SessionLocal
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            weight = INTERACTION_WEIGHTS.get(interaction_type, 1)
            
            # Fetch blog to get category and tags
            blog = db.query(Blog).filter(Blog.id == blog_id).first()
            if not blog:
                return
                
            redis_pipeline = redis_client.pipeline()
            
            # 1. Update Category Affinity
            if blog.category_id:
                cat_key = f"user:{user_id}:affinity:category"
                redis_pipeline.zincrby(cat_key, weight, str(blog.category_id))
                
            # 2. Update Tag Affinity
            if blog.tags:
                tag_key = f"user:{user_id}:affinity:tag"
                for tag in blog.tags:
                    redis_pipeline.zincrby(tag_key, weight, str(tag.id))

            # 3. Update Author Affinity
            if blog.author_id:
                author_key = f"user:{user_id}:affinity:author"
                redis_pipeline.zincrby(author_key, weight, str(blog.author_id))

            # 4. Record in Viewed History Set (for deprioritizing already-read stories)
            if interaction_type == "view":
                viewed_key = f"user:{user_id}:history:viewed"
                redis_pipeline.sadd(viewed_key, str(blog_id))
                    
            await redis_pipeline.execute()
        finally:
            if close_db and db:
                db.close()


    @staticmethod
    async def get_user_affinity(user_id: UUID) -> Dict[str, Dict[str, float]]:
        """
        Retrieve the top categories, tags, and authors the user is interested in.
        """
        cat_key = f"user:{user_id}:affinity:category"
        tag_key = f"user:{user_id}:affinity:tag"
        author_key = f"user:{user_id}:affinity:author"
        
        top_cats = await redis_client.zrevrange(cat_key, 0, 9, withscores=True)
        top_tags = await redis_client.zrevrange(tag_key, 0, 19, withscores=True)
        top_authors = await redis_client.zrevrange(author_key, 0, 9, withscores=True)
        
        return {
            "categories": {k: float(v) for k, v in top_cats},
            "tags": {k: float(v) for k, v in top_tags},
            "authors": {k: float(v) for k, v in top_authors},
        }


    @staticmethod
    def calculate_base_score(blog: Blog) -> float:
        """
        Calculate the base popularity score of a blog from engagement metrics.
        Likes = 15 pts, Comments = 20 pts, Bookmarks = 25 pts, Views = 1 pt.
        """
        likes = blog.likes_count or 0
        comments = blog.comments_count or 0
        views = blog.views or 0
        bookmarks = len(blog.bookmarks) if hasattr(blog, "bookmarks") and blog.bookmarks else 0
        
        return (likes * 15.0) + (comments * 20.0) + (bookmarks * 25.0) + (views * 1.0)


    @staticmethod
    def calculate_gravity_score(base_score: float, created_at: datetime) -> float:
        """
        Apply time decay to the engagement score.
        Posts with real views and likes should ALWAYS rank above zero-engagement posts,
        while maintaining smooth time decay for stories over time.
        """
        if not created_at:
            age_hours = 0.0
        else:
            now = datetime.now(timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            age_hours = max(0.0, (now - created_at).total_seconds() / 3600.0)
        
        # Smooth 24-hour decay factor
        time_factor = 1.0 / math.pow(1.0 + (age_hours / 24.0), 1.2)
        
        if base_score > 0:
            # Scale engagement score cleanly with time decay
            return (base_score * 0.5 + 1.0) * time_factor
        else:
            # Zero-engagement stories get a baseline score scaled by freshness
            return 0.1 * time_factor


    @classmethod
    async def rank_feed(cls, user_id: Optional[UUID], blogs: List[Blog], is_search: bool = False, search_query: Optional[str] = None) -> List[Blog]:
        """
        Rank a list of blogs using Popularity, Time Decay (Gravity), and Behavioral Personalization.
        Cold-Start: If new user / guest, returns famous trending content.
        Active User: Returns hyper-personalized feed matching user interests and penalizes already-read posts (unless is_search=True).
        """
        user_affinity = None
        viewed_ids = set()

        if user_id:
            user_affinity = await cls.get_user_affinity(user_id)
            viewed_key = f"user:{user_id}:history:viewed"
            raw_viewed = await redis_client.smembers(viewed_key)
            if raw_viewed:
                viewed_ids = {v.decode("utf-8") if isinstance(v, bytes) else str(v) for v in raw_viewed}
            
        search_clicks_map = {}
        if search_query:
            query_lower = search_query.strip().lower()
            str_ids = [str(b.id) for b in blogs]
            if str_ids:
                click_scores = await redis_client.zmscore(f"search:query:{query_lower}:clicks", str_ids)
                search_clicks_map = {b_id: (score if score else 0) for b_id, score in zip(str_ids, click_scores)}

        scored_blogs = []
        
        for blog in blogs:
            # 1. Base Popularity Score
            base_score = cls.calculate_base_score(blog)
            
            # 2. Time Decay (Gravity)
            time_decay_score = cls.calculate_gravity_score(base_score, blog.created_at)
            
            # 3. Behavioral Personalization Multiplier
            personalization_multiplier = 1.0
            
            if user_affinity:
                # Category match
                if blog.category_id:
                    cat_score = user_affinity["categories"].get(str(blog.category_id), 0)
                    personalization_multiplier += (cat_score * 0.1)
                
                # Tag match
                if blog.tags:
                    for tag in blog.tags:
                        tag_score = user_affinity["tags"].get(str(tag.id), 0)
                        personalization_multiplier += (tag_score * 0.05)

                # Author match
                if blog.author_id:
                    author_score = user_affinity["authors"].get(str(blog.author_id), 0)
                    personalization_multiplier += (author_score * 0.15)
                        
            # 4. Already-Read Story Penalty
            if is_search:
                read_multiplier = 1.0 # Don't penalize read stories in search (users want to find things they've seen)
            else:
                read_multiplier = 0.2 if str(blog.id) in viewed_ids else 1.0

            # 5. Query-Specific Click Boost
            search_click_multiplier = 1.0
            if search_query:
                exact_clicks = search_clicks_map.get(str(blog.id), 0)
                if exact_clicks > 0:
                    search_click_multiplier += (exact_clicks * 50.0) # Massive boost for previously clicked posts

            # Final Ranked Score
            final_score = time_decay_score * personalization_multiplier * read_multiplier * search_click_multiplier
            
            blog.feed_rank_score = final_score
            scored_blogs.append(blog)
            
        # Sort descending by final score
        scored_blogs.sort(key=lambda x: getattr(x, "feed_rank_score", 0), reverse=True)
        return scored_blogs

recommendation_engine = RecommendationEngine()
