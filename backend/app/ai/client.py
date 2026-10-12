from functools import lru_cache
from openai import OpenAI
from app.core.config import settings


@lru_cache(maxsize=1)
def _create_client():
    api_key = settings.OPENAI_API_KEY.strip()

    if not api_key:
        raise RuntimeError(
            "Purchase Bill AI requires an OpenAI API key. "
            "Configure OPENAI_API_KEY in the backend .env file."
        )

    return OpenAI(api_key=api_key)


class LazyOpenAIClient:
    def __getattr__(self, name):
        return getattr(_create_client(), name)


client = LazyOpenAIClient()
