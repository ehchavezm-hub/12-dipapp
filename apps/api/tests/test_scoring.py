import pytest
from pydantic import ValidationError
from schemas.analysis import AnalysisCaseDTO, ScoringWeights, Treaty
from services.scoring import GeopoliticalScorer

def test_weights_must_sum_to_one():
    with pytest.raises(ValidationError):
        ScoringWeights(w_affinity=0.5, w_history=0.4, w_interests=0.2)

def test_default_weights_sum_to_one():
    w = ScoringWeights()
    assert abs(w.w_affinity + w.w_history + w.w_interests - 1.0) < 0.001

def test_treaty_level_1_weighted_3x():
    scorer = GeopoliticalScorer()
    score = scorer._treaty_score([Treaty(level=1, active=True)])
    assert score > scorer._treaty_score([Treaty(level=3, active=True)])

def test_active_icj_case_subtracts_15():
    scorer = GeopoliticalScorer()
    penalty = scorer._litigation_penalty(icj_cases=1)
    assert penalty == -15.0

def test_two_icj_cases_subtract_30():
    scorer = GeopoliticalScorer()
    assert scorer._litigation_penalty(icj_cases=2) == -30.0

def test_score_total_within_bounds():
    scorer = GeopoliticalScorer()
    result = scorer._compute_total(
        s_affinity=100, s_history=100, s_interests=100,
        weights=ScoringWeights(), litigation_penalty=0
    )
    assert 0 <= result <= 100



def _case(**overrides) -> AnalysisCaseDTO:
    base = {
        "target_profiles": [{"id": "c-per", "name": "Peru", "country_code": "PE"}],
        "geopolitical_context": {"region": "americas", "description": "x"},
        "diplomatic_objective": {"type": "trade", "description": "x"},
        "scoring_weights": {"w_affinity": 0.40, "w_history": 0.35, "w_interests": 0.25},
        "analysis_period_years": 10,
    }
    return AnalysisCaseDTO(**(base | overrides))


def test_compute_implements_spec_formula():
    """Score_total = 0.40*S_afinidad + 0.35*S_historial + 0.25*S_intereses (+ penalty)."""
    result = GeopoliticalScorer().compute(
        _case(s_affinity=80, s_interests=60, treaties=[{"level": 2, "active": True}])
    )
    s_history = 2.0 / 3.0 * 100
    assert result.breakdown.history == pytest.approx(s_history, abs=0.01)
    assert result.score_total == pytest.approx(0.40 * 80 + 0.35 * s_history + 0.25 * 60, abs=0.01)


def test_compute_uses_case_weights():
    weights = {"w_affinity": 1.0, "w_history": 0.0, "w_interests": 0.0}
    result = GeopoliticalScorer().compute(_case(scoring_weights=weights, s_affinity=73))
    assert result.score_total == pytest.approx(73)


def test_affinity_derived_from_seed_graph_when_not_provided():
    result = GeopoliticalScorer().compute(_case())
    assert result.breakdown.affinity == pytest.approx(62.0)  # seeded c-per affinity


def test_unknown_country_falls_back_to_neutral_affinity():
    result = GeopoliticalScorer().compute(
        _case(target_profiles=[{"id": "x", "name": "Atlantis", "country_code": "ZZ"}])
    )
    assert result.breakdown.affinity == pytest.approx(50.0)


def test_inactive_treaties_are_ignored():
    scorer = GeopoliticalScorer()
    assert scorer._treaty_score([Treaty(level=1, active=False)]) == 0.0


def test_litigation_penalty_applied_and_clamped_at_zero():
    result = GeopoliticalScorer().compute(_case(s_affinity=10, s_interests=10, icj_cases=5))
    assert result.litigation_penalty == -75.0
    assert result.score_total == 0.0
