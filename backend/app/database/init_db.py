"""
Creates all database tables.
This will later be replaced by Alembic migrations.
"""

from app.database.base import Base
from app.database.session import engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)