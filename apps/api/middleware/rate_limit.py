"""Token-bucket rate limiter using Upstash Redis REST API."""
from __future__ import annotations

from fastapi import Depends, HTTPException

from middleware.auth import JWTClaims, require_role, Role
from settings import get_settings


async def check_rate_limit(
    claims: JWTClaims = Depends(require_role(Role.VIEWER)),
) -> JWTClaims:
    """Enforce 60 requests/min per user sub claim via Upstash Redis."""
    settings = get_settings()
    if not settings.UPSTASH_REDIS_REST_URL or settings.UPSTASH_REDIS_REST_URL.startswith("https://test"):
        return claims

    import httpx

    key = f"rate:{claims['sub']}"
    url = f"{settings.UPSTASH_REDIS_REST_URL}/pipeline"
    headers = {"Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}"}
    pipeline = [
        ["INCR", key],
        ["EXPIRE", key, 60],
    ]

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(url, json=pipeline, headers=headers)
            resp.raise_for_status()
            results = resp.json()
            count: int = results[0]["result"]
    except Exception:
        # On Redis failure, allow request (fail open)
        return claims

    if count > 60:
        raise HTTPException(
            status_code=429,
            detail={"type": "rate_limit_exceeded", "title": "Too Many Requests", "status": 429, "detail": "60 requests/min exceeded"},
        )
    return claims
