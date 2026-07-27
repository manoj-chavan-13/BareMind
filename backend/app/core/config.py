from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "BareMind"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_USER: str = "baremind_user"
    POSTGRES_PASSWORD: str = "baremind_password"
    POSTGRES_DB: str = "baremind_db"
    POSTGRES_SERVER: str = "localhost"

    # JWT & Cookies
    SECRET_KEY: str = "b4r3m1nd_sup3r_s3cr3t_k3y_ch4ng3_1n_pr0d_2024"
    REFRESH_SECRET_KEY: str = "b4r3m1nd_r3fr3sh_s3cr3t_k3y_ch4ng3_1n_pr0d_2024"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15          # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7             # 7 days
    SECURE_COOKIE: bool = False                    # Set True in production (HTTPS)

    # Account Lockout & Security
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_TIME_SECONDS: int = 900                # 15 minutes
    SESSION_EXPIRE_SECONDS: int = 1800             # 30 minutes active session TTL

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_NOTIFICATIONS_TOPIC: str = "notifications"
    KAFKA_SEARCH_TOPIC: str = "search_indexing"
    KAFKA_TELEMETRY_TOPIC: str = "telemetry_events"

    # Meilisearch
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_MASTER_KEY: str = "masterKey123!"

    # Email (fastapi-mail)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@baremind.com"
    EMAILS_FROM_NAME: str = "BareMind"

    # OTP settings
    OTP_EXPIRE_SECONDS: int = 600      # 10 minutes
    OTP_MAX_ATTEMPTS: int = 3

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None
    CDN_DOMAIN: Optional[str] = None

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
