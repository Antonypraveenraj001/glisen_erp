"""
Base class for all SQLAlchemy models.
Every database model must inherit from Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass