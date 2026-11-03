"""Auth middleware tests — JWT validation and RBAC."""
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from tests.conftest import make_test_jwt

from middleware.auth import Role, require_role, validate_token


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


async def test_token_without_exp_is_rejected():
    """Tokens lacking ``exp`` must not be accepted (they would never expire)."""
    token = make_test_jwt(role="editor", secret="test-secret", exp_offset=None)
    with pytest.raises(HTTPException) as exc:
        await validate_token(token, secret="test-secret")
    assert exc.value.status_code == 401


async def test_expired_token_is_rejected():
    token = make_test_jwt(role="editor", secret="test-secret", exp_offset=-60)
    with pytest.raises(HTTPException) as exc:
        await validate_token(token, secret="test-secret")
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


async def test_empty_sub_is_rejected():
    """An empty subject would collapse every user into one rate-limit bucket."""
    token = make_test_jwt(role="editor", secret="test-secret", sub="")
    with pytest.raises(HTTPException) as exc:
        await validate_token(token, secret="test-secret")
    assert exc.value.status_code == 401


async def test_claims_match_web_backend_token_shape():
    """backendToken.ts emits {sub, role, iat, exp}; claims expose sub + role."""
    token = make_test_jwt(role="superadmin", secret="test-secret", sub="octocat")
    claims = await validate_token(token, secret="test-secret")
    assert claims == {"sub": "octocat", "role": "superadmin"}
