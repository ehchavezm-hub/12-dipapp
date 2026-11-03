import pytest
from pydantic import ValidationError
from schemas.analysis import ScoringWeights, Treaty
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
