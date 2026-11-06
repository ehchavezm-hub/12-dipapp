"""Simple file-based cache with TTL — no external dependencies."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

_CACHE_DIR = Path(os.environ.get("DIPAPP_CACHE_DIR", "/tmp/dipapp_cache"))
_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# TTLs configurable via env vars (seconds). Defaults: 24h live APIs, 24h datasets.
# Set DIPAPP_API_TTL / DIPAPP_STATIC_TTL in Render → Environment to override.
API_TTL    = int(os.environ.get("DIPAPP_API_TTL",    86_400))   # default 24 h
STATIC_TTL = int(os.environ.get("DIPAPP_STATIC_TTL", 86_400))   # default 24 h (was 7 days)
AMBASSADOR_TTL = int(os.environ.get("DIPAPP_AMBASSADOR_TTL", 43_200))  # default 12 h


def _path(key: str) -> Path:
    safe = key.replace("/", "_").replace(":", "_")
    return _CACHE_DIR / f"{safe}.json"


def get(key: str) -> Any | None:
    p = _path(key)
    if not p.exists():
        return None
    try:
        blob = json.loads(p.read_text())
        if time.time() - blob["ts"] > blob["ttl"]:
            p.unlink(missing_ok=True)
            return None
        return blob["data"]
    except Exception:
        return None


def set(key: str, data: Any, ttl: int = API_TTL) -> None:
    p = _path(key)
    try:
        p.write_text(json.dumps({"ts": time.time(), "ttl": ttl, "data": data}))
    except Exception:
        pass


def invalidate(key: str) -> None:
    _path(key).unlink(missing_ok=True)
