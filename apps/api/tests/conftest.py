"""Shared pytest fixtures and environment setup for the test suite."""
import os

# Set required environment variables BEFORE any settings are imported so that
# pydantic-settings / lru_cache picks them up on first call.
os.environ.setdefault("NEXTAUTH_SECRET", "test-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("UPSTASH_REDIS_REST_URL", "https://test.upstash.io")
os.environ.setdefault("UPSTASH_REDIS_REST_TOKEN", "test-token")

import pytest


@pytest.fixture(autouse=True, scope="session")
def mock_tiktoken_encoding(session_mocker=None):
    """Provide a local byte-level tiktoken encoding so tests run offline.

    cl100k_base normally requires downloading a ~2 MB file from
    openaipublic.blob.core.windows.net, which is not reachable in CI.
    This fixture patches tiktoken.get_encoding at the package level so any
    module that calls it during the test session gets a minimal byte-level
    encoding instead.  All token-count assertions remain meaningful: ASCII
    text produces one token per byte, which is an upper bound on real token
    counts, so a chunk that satisfies ``len <= 1500`` here will also satisfy
    it with the real cl100k_base encoder.
    """
    import tiktoken
    from tiktoken import Encoding

    _CL100K_PAT = (
        r"(?i:[sdmt]|ll|ve|re)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}"
        r"| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+"
    )

    # Byte-level BPE: rank each single byte as itself; no merge rules.
    _byte_ranks: dict[bytes, int] = {bytes([i]): i for i in range(256)}

    _local_enc = Encoding(
        name="cl100k_base",
        pat_str=_CL100K_PAT,
        mergeable_ranks=_byte_ranks,
        special_tokens={},
    )

    _original = tiktoken.get_encoding
    tiktoken.get_encoding = lambda _name: _local_enc
    yield _local_enc
    tiktoken.get_encoding = _original
