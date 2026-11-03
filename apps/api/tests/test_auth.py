"""Auth middleware tests — JWT validation and RBAC."""
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from middleware.auth import Role, require_role, validate_token


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def make_test_jwt(role: str, secret: str) -> str:
    """Create a minimal HS256-signed JWT for testing.

    Args:
        role: Role string (``"viewer"``, ``"editor"``, or ``"superadmin"``).
        secret: HMAC signing secret.

    Returns:
        Encoded JWT string.
    """
    payload = {
        "sub": "user-123",
        "role": role,
        "githubId": "gh-456",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_valid_token_extracts_role():
    """validate_token returns claims with the correct role."""
    token = make_test_jwt(role="editor", secret="test-secret")
    claims = await validate_token(token, secret="test-secret")
    assert claims["role"] == "editor"


async def test_wrong_secret_raises_401():
    """validate_token raises 401 when the JWT secret is wrong."""
    token = make_test_jwt(role="editor", secret="correct")
    with pytest.raises(HTTPException) as exc:
        await validate_token(token, secret="wrong")
    assert exc.value.status_code == 401


async def test_viewer_cannot_access_editor_route():
    """require_role raises 403 when the user's role rank is too low."""
    token = make_test_jwt(role="viewer", secret="test-secret")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc:
        await require_role(Role.EDITOR)(credentials=creds)
    assert exc.value.status_code == 403
