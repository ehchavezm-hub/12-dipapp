"""Tests for the /graph/data endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from jose import jwt

from app.main import app


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def make_test_jwt(role: str = "viewer", secret: str = "test-secret") -> str:
    payload = {
        "sub": "user-123",
        "role": role,
        "githubId": "gh-456",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


@pytest.fixture
async def auth_client():
    token = make_test_jwt(role="viewer", secret="test-secret")
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_graph_data_requires_auth(client):
    res = await client.get("/graph/data")
    assert res.status_code == 401


async def test_graph_data_returns_nodes_and_edges(auth_client):
    res = await auth_client.get("/graph/data")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data and "edges" in data
    assert all(n["type"] in ("country", "embassy", "diplomat", "organization") for n in data["nodes"])
