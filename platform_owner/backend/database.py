"""Dedicated owner database only. No connection to company ERP databases."""

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from platform_owner.backend.settings import OwnerSettings


class OwnerBase(DeclarativeBase):
    pass


def make_owner_engine(settings: OwnerSettings):
    settings.validate()
    url = URL.create(
        drivername="mysql+pymysql",
        username=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
    )
    return create_engine(url, pool_pre_ping=True, echo=False)


def make_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
