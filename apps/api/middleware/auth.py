"""JWT authentication middleware and RBAC helpers."""
from enum import IntEnum
from typing import TypedDict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

_bearer = HTTPBearer(auto_error=False)


class Role(IntEnum):
    """Role rank — higher value means more privilege."""

    VIEWER = 0
    EDITOR = 1
    SUPERADMIN = 2


_ROLE_RANK: dict[str, Role] = {
    "viewer": Role.VIEWER,
    "editor": Role.EDITOR,
    "superadmin": Role.SUPERADMIN,
}


class JWTClaims(TypedDict):
    """Validated claims extracted from a JWT.

    Mirrors the payload minted by ``apps/web/src/lib/server/backendToken.ts``:
    ``{ sub, role, iat, exp }``.
    """

    sub: str
    role: str


async def validate_token(token: str, secret: str) -> JWTClaims:
    """Decode and validate an HS256 JWT.

    Args:
        token: Raw JWT string (without the ``Bearer `` prefix).
        secret: HMAC secret used to verify the signature.

    Returns:
        Decoded claims as a :class:`JWTClaims` dict.

    Raises:
        :class:`fastapi.HTTPException` 401 on invalid signature or expiry.
    """
    try:
        # python-jose ignores a generic ``require`` list; each claim must be
        # required explicitly or tokens without ``exp`` never expire.
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require_exp": True, "require_sub": True, "verify_exp": True},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is empty",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = payload.get("role", "viewer")
    return JWTClaims(sub=sub, role=role if isinstance(role, str) else "viewer")


def require_role(min_role: Role):
    """FastAPI dependency factory that enforces a minimum role.

    Usage::

        @router.get("/protected")
        async def endpoint(claims: JWTClaims = Depends(require_role(Role.EDITOR))):
            ...

    For tests, the returned dependency can be called directly::

        await require_role(Role.EDITOR)(token_string)

    Args:
        min_role: Minimum :class:`Role` required to access the endpoint.

    Returns:
        An async FastAPI dependency that returns :class:`JWTClaims` or raises
        :class:`fastapi.HTTPException` 403 when the user's role is insufficient.
    """

    async def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    ) -> JWTClaims:
        from settings import get_settings  # lazy import avoids circular deps

        settings = get_settings()

        raw_token = credentials.credentials if credentials else ""

        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No token provided",
                headers={"WWW-Authenticate": "Bearer"},
            )

        claims = await validate_token(raw_token, settings.NEXTAUTH_SECRET)
        user_rank = _ROLE_RANK.get(claims["role"], Role.VIEWER)

        if user_rank < min_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role {min_role.name.lower()} or higher",
            )

        return claims

    return dependency
