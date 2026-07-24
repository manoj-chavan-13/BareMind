from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.config import settings
from app.api.api_v1.api import api_router
from sqlalchemy import text
from app.db.session import engine
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from starlette.middleware.base import BaseHTTPMiddleware

# ─── Security Headers Middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https: blob:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "connect-src 'self' http: https: ws: wss:;"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ─── Auto-migrate database schema ─────────────────────────────────────────────
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(50);"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_profiles_username ON profiles (username);"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY,
                user_id VARCHAR(255),
                action VARCHAR(255) NOT NULL,
                resource_type VARCHAR(255),
                resource_id VARCHAR(255),
                ip_address VARCHAR(255),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.commit()
except Exception as e:
    print("DB migration error:", e)

# ─── Startup / Shutdown ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    # ── Bloom Filter + Auto-tag sync ──────────────────────────────────────────
    from app.core.bloom_filter import UsernameBloomFilter
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        await UsernameBloomFilter.sync_from_db(db)
        from app.models.blog import Blog
        from app.services.auto_tagger import auto_tagger
        from app.services.auto_categorizer import auto_categorizer
        
        untagged_blogs = db.query(Blog).filter(~Blog.tags.any()).all()
        for b in untagged_blogs:
            b.tags = auto_tagger.suggest_tags(db, b.title, b.content)

        uncategorized_blogs = db.query(Blog).filter(Blog.category_id == None).all()
        for b in uncategorized_blogs:
            cat = auto_categorizer.suggest_category(db, b.title, b.content)
            b.category_id = cat.id

        if untagged_blogs or uncategorized_blogs:
            db.commit()
    except Exception as e:
        print("Startup sync error:", e)
    finally:
        db.close()

    # ── WebSocket Manager ─────────────────────────────────────────────────────
    from app.services.ws_manager import ws_manager
    await ws_manager.startup()

    # ── Notification Publisher (Kafka producer + Redis) ───────────────────────
    from app.services.notification_publisher import notification_publisher
    await notification_publisher.start()
    
    # ── Search Publisher ──────────────────────────────────────────────────────
    from app.services.search_publisher import search_publisher
    await search_publisher.start()

    # ── Kafka Consumer Worker ─────────────────────────────────────────────────
    from app.workers.notification_consumer import start_consumer
    start_consumer()
    
    # ── Search Consumer Worker ────────────────────────────────────────────────
    from app.workers.search_consumer import search_consumer
    await search_consumer.start()


@app.on_event("shutdown")
async def shutdown_event():
    from app.services.ws_manager import ws_manager
    await ws_manager.shutdown()

    from app.services.notification_publisher import notification_publisher
    await notification_publisher.stop()

    from app.services.search_publisher import search_publisher
    await search_publisher.stop()
    
    from app.workers.search_consumer import search_consumer
    await search_consumer.stop()

    from app.workers.notification_consumer import stop_consumer
    stop_consumer()

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static uploads ───────────────────────────────────────────────────────────
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to BareMind API"}
