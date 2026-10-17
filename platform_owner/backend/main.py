"""Entrypoint: uvicorn platform_owner.backend.main:app --host 127.0.0.1 --port 8100"""

from platform_owner.backend.app import create_app

app = create_app()
