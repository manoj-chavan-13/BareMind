import re
from typing import Optional
from sqlalchemy.orm import Session
from app.models.category import Category

DEFAULT_CATEGORIES = [
    ("Technology", "technology"),
    ("Programming", "programming"),
    ("DevOps", "devops"),
    ("AI & Data", "ai-data"),
    ("Cloud", "cloud"),
    ("Business & Finance", "business-finance"),
    ("Education", "education"),
    ("Lifestyle & Health", "lifestyle-health"),
]

CATEGORY_TAXONOMY = {
    "Technology": ["technology", "tech", "hardware", "software", "gadgets", "innovation", "internet", "web"],
    "Programming": ["programming", "code", "python", "javascript", "react", "fastapi", "html", "css", "developer", "algorithm"],
    "DevOps": ["devops", "docker", "kubernetes", "k8s", "ci/cd", "pipeline", "ansible", "terraform", "server", "linux", "container"],
    "AI & Data": ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "llm", "chatgpt", "openai", "data", "neural"],
    "Cloud": ["cloud", "aws", "s3", "azure", "gcp", "serverless", "lambda", "infrastructure"],
    "Business & Finance": ["business", "finance", "startup", "money", "investing", "crypto", "marketing", "management", "economy"],
    "Education": ["education", "tutorial", "guide", "learn", "study", "course", "tips", "beginner", "how to"],
    "Lifestyle & Health": ["lifestyle", "health", "fitness", "travel", "food", "wellness", "mindfulness", "nutrition"],
}

class AutoCategorizer:
    @classmethod
    def seed_categories(cls, db: Session):
        """Ensure standard categories exist in database."""
        for name, slug in DEFAULT_CATEGORIES:
            cat = db.query(Category).filter((Category.slug == slug) | (Category.name == name)).first()
            if not cat:
                cat = Category(name=name, slug=slug)
                db.add(cat)
        db.commit()

    @classmethod
    def suggest_category(cls, db: Session, title: str, content: str) -> Category:
        """
        Analyze article title and content to automatically categorize the story.
        """
        cls.seed_categories(db)
        
        combined_text = f"{title} {content}".lower()
        clean_text = re.sub(r"<[^>]*>", " ", combined_text)
        clean_text = re.sub(r"[^\w\s\+\-\/\.\#]", " ", clean_text)
        
        matches = {}
        for cat_name, keywords in CATEGORY_TAXONOMY.items():
            count = 0
            for kw in keywords:
                title_matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", title.lower()))
                content_matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", clean_text))
                count += (title_matches * 4) + content_matches
            
            if count > 0:
                matches[cat_name] = count
                
        if matches:
            best_cat_name = max(matches.keys(), key=lambda k: matches[k])
        else:
            best_cat_name = "Technology" # Fallback default
            
        slug = best_cat_name.lower().replace(" & ", "-").replace(" ", "-").replace("/", "-")
        cat = db.query(Category).filter((Category.slug == slug) | (Category.name == best_cat_name)).first()
        if not cat:
            cat = Category(name=best_cat_name, slug=slug)
            db.add(cat)
            db.commit()
            db.refresh(cat)
            
        return cat

auto_categorizer = AutoCategorizer()
