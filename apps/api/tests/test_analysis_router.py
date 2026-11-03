"""Tests for POST /analysis router."""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from jose import jwt

from app.main import app
from schemas.analysis import (
    AnalysisMetadata,
    RoadmapStep,
    Scenario,
    SourceCitation,
    ThreeScenariosResult,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_test_jwt(role: str = "editor", secret: str = "test-secret") -> str:
    payload = {"sub": "user-123", "role": role, "githubId": "gh-456"}
    return jwt.encode(payload, secret, algorithm="HS256")


def _analysis_payload() -> dict:
    return {
        "target_profiles": [{"id": "c-per", "name": "Peru", "country_code": "PE"}],
        "geopolitical_context": {"region": "americas", "description": "Pacific Alliance"},
        "diplomatic_objective": {"type": "trade", "description": "Negotiate TLC"},
        "scoring_weights": {"w_affinity": 0.40, "w_history": 0.35, "w_interests": 0.25},
        "analysis_period_years": 10,
        "support_documents": [],
    }


def _mock_three_scenarios() -> ThreeScenariosResult:
    scenarios = [
        Scenario(
            label=lbl,
            name=f"Scenario {lbl}",
            strategy=f"Strategy {lbl}",
            roadmap=[RoadmapStep(step=1, action="Sign MOU", timeline="Q1 2025", responsible="Chancellery")],
            pros=["Benefit"],
            cons=["Risk"],
            leverage_points=["Key point"],
            score_total=70.0,
            viability_score=75.0,
            sources=[SourceCitation(title="UN Report", url="https://un.org/report", date="2024-01")],
            chain_of_thought="Reasoning here.",
        )
        for lbl in ["A", "B", "C"]
    ]
    return ThreeScenariosResult(
        scenarios=scenarios,
        analysis_metadata=AnalysisMetadata(
            model_used="claude-opus-4-5", processing_time_s=1.0, rag_sources_count=1
        ),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_analysis_no_auth_returns_401(client):
    """POST /analysis/ without token must return 401."""
    res = await client.post("/analysis/", json=_analysis_payload())
    assert res.status_code == 401


async def test_analysis_viewer_role_returns_403(client):
    """POST /analysis/ with VIEWER role must return 403."""
    token = make_test_jwt(role="viewer")
    res = await client.post(
        "/analysis/",
        json=_analysis_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


async def test_analysis_editor_role_returns_200():
    """POST /analysis/ with EDITOR role and mocked orchestrate returns 200 with 3 scenarios."""
    token = make_test_jwt(role="editor")
    mock_result = _mock_three_scenarios()

    with patch(
        "routers.analysis.orchestrate", new_callable=AsyncMock
    ) as mock_orch:
        mock_orch.return_value = mock_result
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as c:
            res = await c.post(
                "/analysis/",
                json=_analysis_payload(),
                headers={"Authorization": f"Bearer {token}"},
            )

    assert res.status_code == 200
    data = res.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 3
    labels = [s["label"] for s in data["scenarios"]]
    assert labels == ["A", "B", "C"]
