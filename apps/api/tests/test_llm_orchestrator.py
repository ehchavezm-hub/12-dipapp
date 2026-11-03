"""Tests for LLM orchestrator (TDD — written before implementation)."""
import pytest
from unittest.mock import AsyncMock, patch
from schemas.analysis import AnalysisCaseDTO, ScoringWeights, ScoringResult, ScoreBreakdown


@pytest.fixture(autouse=True)
def _no_network_un_votes():
    """Keep orchestrator tests offline and deterministic."""
    with patch("services.rag_ingestion.fetch_un_votes", new_callable=AsyncMock) as mock:
        mock.return_value = ""
        yield mock


def sample_case():
    return AnalysisCaseDTO(
        target_profiles=[{"id": "c-per", "name": "Peru", "country_code": "PE"}],
        geopolitical_context={"region": "americas", "description": "Pacific Alliance"},
        diplomatic_objective={"type": "trade", "description": "Negotiate TLC"},
        scoring_weights=ScoringWeights(),
        analysis_period_years=10,
        support_documents=[],
    )


def sample_scores():
    return ScoringResult(
        score_total=72.5,
        breakdown=ScoreBreakdown(affinity=80.0, history=70.0, interests=65.0),
        litigation_penalty=0.0,
    )


def make_mock_result():
    """Return a ThreeScenariosResult-compatible dict for mocking."""
    from schemas.analysis import ThreeScenariosResult, Scenario, RoadmapStep, SourceCitation, AnalysisMetadata
    scenarios = [
        Scenario(
            label=lbl, name=f"Scenario {lbl}", strategy=f"Strategy {lbl}",
            roadmap=[RoadmapStep(step=1, action="Sign MOU", timeline="Q1 2025", responsible="Chancellery")],
            pros=["Benefit"], cons=["Risk"], leverage_points=["Key point"],
            score_total=70.0, viability_score=75.0,
            sources=[SourceCitation(title="UN Report", url="https://un.org/report", date="2024-01")],
            chain_of_thought="Reasoning here."
        )
        for lbl in ["A", "B", "C"]
    ]
    return ThreeScenariosResult(
        scenarios=scenarios,
        analysis_metadata=AnalysisMetadata(model_used="claude-opus-4-5", processing_time_s=5.0, rag_sources_count=2),
    )


@pytest.mark.asyncio
async def test_result_has_exactly_3_scenarios():
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock:
        mock.return_value = make_mock_result()
        from services.llm_orchestrator import orchestrate
        result = await orchestrate(case=sample_case(), scores=sample_scores())
    assert len(result.scenarios) == 3


@pytest.mark.asyncio
async def test_scenarios_labeled_A_B_C():
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock:
        mock.return_value = make_mock_result()
        from services.llm_orchestrator import orchestrate
        result = await orchestrate(case=sample_case(), scores=sample_scores())
    assert [s.label for s in result.scenarios] == ["A", "B", "C"]


@pytest.mark.asyncio
async def test_all_scores_in_range():
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock:
        mock.return_value = make_mock_result()
        from services.llm_orchestrator import orchestrate
        result = await orchestrate(case=sample_case(), scores=sample_scores())
    for s in result.scenarios:
        assert 0 <= s.score_total <= 100
        assert 0 <= s.viability_score <= 100


@pytest.mark.asyncio
async def test_chain_of_thought_non_empty():
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock:
        mock.return_value = make_mock_result()
        from services.llm_orchestrator import orchestrate
        result = await orchestrate(case=sample_case(), scores=sample_scores())
    assert all(len(s.chain_of_thought) > 0 for s in result.scenarios)


@pytest.mark.asyncio
async def test_anthropic_failure_falls_back_to_openai():
    mock_result = make_mock_result()
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock_anth:
        mock_anth.side_effect = Exception("Anthropic API error")
        with patch("services.llm_orchestrator._call_openai", new_callable=AsyncMock) as mock_oai:
            mock_oai.return_value = mock_result
            from services.llm_orchestrator import orchestrate
            result = await orchestrate(case=sample_case(), scores=sample_scores())
    assert len(result.scenarios) == 3


@pytest.mark.asyncio
async def test_rag_sources_count_reflects_sources_actually_used(_no_network_un_votes):
    """A failed UN lookup must not be counted as a RAG source."""
    with patch("services.llm_orchestrator._call_anthropic", new_callable=AsyncMock) as mock:
        mock.return_value = make_mock_result()
        from services.llm_orchestrator import orchestrate
        result = await orchestrate(case=sample_case(), scores=sample_scores())
    assert result.analysis_metadata.rag_sources_count == 0


@pytest.mark.asyncio
async def test_baseline_score_is_in_prompt():
    from services.llm_orchestrator import _build_user_prompt
    prompt = _build_user_prompt(sample_case(), sample_scores(), "")
    assert "Baseline total score: 72.5/100" in prompt


def test_retry_predicate_uses_status_codes():
    from services.llm_orchestrator import _is_retryable

    class _Err(Exception):
        def __init__(self, code: int):
            super().__init__(f"error code {code}")
            self.status_code = code

    assert _is_retryable(_Err(429))
    assert _is_retryable(_Err(503))
    assert not _is_retryable(_Err(400))
    assert not _is_retryable(Exception("invalid field value 500 chars"))
