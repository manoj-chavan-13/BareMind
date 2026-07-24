"""
base_class.py
─────────────
Defines the SQLAlchemy declarative Base ONLY.
No model imports here — that breaks circular imports.

All models should import Base from THIS file:
    from app.db.base_class import Base

app/db/base.py imports all models (Alembic needs them for autogenerate).
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
