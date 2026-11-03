"""Shared pytest fixtures and environment setup for the test suite."""
import os

# Set required environment variables BEFORE any settings are imported so that
# pydantic-settings / lru_cache picks them up on first call.
os.environ.setdefault("NEXTAUTH_SECRET", "test-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("UPSTASH_REDIS_REST_URL", "https://test.upstash.io")
os.environ.setdefault("UPSTASH_REDIS_REST_TOKEN", "test-token")
