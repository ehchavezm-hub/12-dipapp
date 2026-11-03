"""Deterministic pre-LLM geopolitical scoring.

Score_total = W_afinidad x S_afinidad + W_historial x S_historial + W_intereses x S_intereses
              - 15 x (pending ICJ / PCA / ICSID cases), clamped to [0, 100].
"""
from schemas.analysis import (
    AnalysisCaseDTO,
    ScoreBreakdown,
    ScoringResult,
    ScoringWeights,
    TargetProfile,
    Treaty,
)
from services.graph_seed import country_affinity

# Art. 38 ICJ Statute hierarchy: level 1 (alliance/peace/borders) x3,
# level 2 (FTAs/regional integration) x2, level 3 (technical/cultural) x1.
TREATY_MULTIPLIERS = {1: 3.0, 2: 2.0, 3: 1.0}
LITIGATION_PENALTY_PER_CASE = -15.0
NEUTRAL_SCORE = 50.0


class GeopoliticalScorer:
    def _treaty_score(self, treaties: list[Treaty]) -> float:
        """Weight each active treaty by its Art.38 CIJ multiplier, normalize to [0, 100]."""
        active_treaties = [t for t in treaties if t.active]
        if not active_treaties:
            return 0.0
        weighted_sum = sum(TREATY_MULTIPLIERS[t.level] for t in active_treaties)
        max_possible = len(active_treaties) * TREATY_MULTIPLIERS[1]  # all level-1 is max
        return (weighted_sum / max_possible) * 100.0

    def _litigation_penalty(self, icj_cases: int) -> float:
        """Returns icj_cases * -15.0"""
        return icj_cases * LITIGATION_PENALTY_PER_CASE

    def _affinity_score(self, profiles: list[TargetProfile]) -> float:
        """Mean seeded affinity of the target countries; neutral 50 when none are known."""
        known = [a for a in (country_affinity(p.country_code) for p in profiles) if a is not None]
        if not known:
            return NEUTRAL_SCORE
        return sum(known) / len(known)

    def _compute_total(
        self,
        s_affinity: float,
        s_history: float,
        s_interests: float,
        weights: ScoringWeights,
        litigation_penalty: float,
    ) -> float:
        """Apply formula, clamp result to [0, 100]."""
        raw = (
            weights.w_affinity * s_affinity
            + weights.w_history * s_history
            + weights.w_interests * s_interests
        ) + litigation_penalty
        return max(0.0, min(100.0, raw))

    def compute(self, case: AnalysisCaseDTO) -> ScoringResult:
        """Compute the deterministic score for an analysis case."""
        weights = case.scoring_weights

        s_affinity = (
            case.s_affinity if case.s_affinity is not None else self._affinity_score(case.target_profiles)
        )
        s_interests = case.s_interests if case.s_interests is not None else NEUTRAL_SCORE
        s_history = self._treaty_score(case.treaties)
        litigation_penalty = self._litigation_penalty(case.icj_cases)

        score_total = self._compute_total(
            s_affinity=s_affinity,
            s_history=s_history,
            s_interests=s_interests,
            weights=weights,
            litigation_penalty=litigation_penalty,
        )

        return ScoringResult(
            score_total=round(score_total, 2),
            breakdown=ScoreBreakdown(
                affinity=round(s_affinity, 2),
                history=round(s_history, 2),
                interests=round(s_interests, 2),
            ),
            litigation_penalty=litigation_penalty,
        )
