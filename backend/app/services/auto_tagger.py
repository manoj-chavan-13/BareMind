import re
from typing import List
from sqlalchemy.orm import Session
from app.models.tag import Tag
import re

# Domain keyword clusters mapping to standard tag names and slugs
KEYWORD_TAXONOMY = {
    "Python": ["python", "fastapi", "django", "flask", "pydantic", "pip", "pytest", "asyncio"],
    "JavaScript": ["javascript", "js", "typescript", "ts", "node", "nodejs", "npm", "ecmascript"],
    "React": ["react", "reactjs", "redux", "jsx", "tsx", "nextjs", "next.js", "vite"],
    "DevOps": ["devops", "ci/cd", "cicd", "pipeline", "ansible", "terraform", "github actions"],
    "Docker": ["docker", "container", "dockerfile", "docker-compose", "podman"],
    "Kubernetes": ["kubernetes", "k8s", "kubectl", "helm", "cluster"],
    "AI & ML": ["ai", "artificial intelligence", "machine learning", "ml", "llm", "openai", "chatgpt", "pytorch", "tensorflow", "neural network"],
    "Database": ["database", "sql", "postgresql", "postgres", "mysql", "redis", "mongodb", "sqlalchemy", "indexing"],
    "Security": ["security", "auth", "jwt", "oauth", "encryption", "xss", "csrf", "hashing"],
    "Cloud": ["cloud", "aws", "s3", "azure", "gcp", "serverless", "lambda"],
    "System Design": ["system design", "architecture", "microservices", "scalability", "caching", "event streaming"],
    "Web Development": ["web development", "frontend", "backend", "api", "rest", "graphql", "css", "html", "tailwind"],
}

class AutoTagger:
    @classmethod
    def suggest_tags(cls, db: Session, title: str, content: str, max_tags: int = 5) -> List[Tag]:
        """
        Analyze article title and content to automatically extract and assign relevant tags.
        """
        combined_text = f"{title} {content}".lower()
        # Clean HTML tags and special characters
        clean_text = re.sub(r"<[^>]*>", " ", combined_text)
        clean_text = re.sub(r"[^\w\s\+\-\/\.\#]", " ", clean_text)
        
        matches = {}
        for tag_name, keywords in KEYWORD_TAXONOMY.items():
            count = 0
            for kw in keywords:
                # Title matches get 3x weight
                title_matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", title.lower()))
                content_matches = len(re.findall(r"\b" + re.escape(kw) + r"\b", clean_text))
                count += (title_matches * 3) + content_matches
            
            if count > 0:
                matches[tag_name] = count
                
        if not matches:
            # Fallback default tag if no specific tech keywords match
            matches["Web Development"] = 1
            
        # Sort by match frequency descending
        sorted_tag_names = sorted(matches.keys(), key=lambda k: matches[k], reverse=True)[:max_tags]
        
        assigned_tags = []
        for name in sorted_tag_names:
            slug = name.lower().replace(" & ", "-").replace(" ", "-").replace("/", "-")
            existing_tag = db.query(Tag).filter((Tag.slug == slug) | (Tag.name == name)).first()
            if not existing_tag:
                existing_tag = Tag(name=name, slug=slug)
                db.add(existing_tag)
                db.commit()
                db.refresh(existing_tag)
            assigned_tags.append(existing_tag)
            
        return assigned_tags

auto_tagger = AutoTagger()
