"""
Database dependency for FastAPI.

Provides a SQLAlchemy database session for each request
and manages the transaction lifecycle.
"""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Create a database session for the current request.

    Successful requests are committed.
    Failed requests are rolled back.
    The session is always closed.
    """

    db = SessionLocal()

    try:
        yield db
        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()