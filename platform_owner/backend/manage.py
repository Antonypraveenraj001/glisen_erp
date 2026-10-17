"""Run explicitly: python -m platform_owner.backend.manage <command>."""

import argparse
import getpass
import sys

from sqlalchemy import inspect

from platform_owner.backend.bootstrap import bootstrap_first_owner
from platform_owner.backend.database import OwnerBase, make_owner_engine, make_session_factory
from platform_owner.backend.models import OwnerAccount  # register metadata
from platform_owner.backend.company_models import OwnerCompany, OwnerCompanyEvent  # owner-only registry metadata
from platform_owner.backend.license_models import OwnerLicensePlan, OwnerLicenseTerm  # owner-only license metadata
from platform_owner.backend.settings import load_settings


def main() -> int:
    parser = argparse.ArgumentParser(description="CASTLE owner-only setup")
    parser.add_argument("command", choices=["init-db", "bootstrap-owner"])
    parser.add_argument("--confirm-owner-only", action="store_true")
    args = parser.parse_args()
    if not args.confirm_owner_only:
        parser.error("Refusing to proceed without --confirm-owner-only")

    settings = load_settings()
    engine = make_owner_engine(settings)
    try:
        # No CREATE DATABASE. The explicitly separate DB/user must already exist.
        with engine.connect() as connection:
            db_name = connection.exec_driver_sql("SELECT DATABASE()").scalar()
        if db_name != settings.db_name:
            raise RuntimeError("Connected to unexpected database; refusing setup")

        if args.command == "init-db":
            OwnerBase.metadata.create_all(bind=engine)
            print("Owner-only tables initialized. No company ERP tables accessed.")
            return 0

        if "owner_accounts" not in inspect(engine).get_table_names():
            raise RuntimeError("Run init-db before bootstrap-owner")
        pw = getpass.getpass("New Platform Owner password (hidden): ")
        again = getpass.getpass("Confirm password (hidden): ")
        if pw != again:
            raise ValueError("Passwords did not match")
        db = make_session_factory(engine)()
        try:
            bootstrap_first_owner(db, settings.owner_email, pw)
        finally:
            db.close()
        print("Initial owner created. Password not displayed.")
        return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, RuntimeError) as exc:
        print(f"Setup blocked: {exc}", file=sys.stderr)
        sys.exit(1)
