from schemas.analysis import ScoringWeights, Treaty, ScoreBreakdown, ScoringResult

TREATY_MULTIPLIERS = {1: 3.0, 2: 2.0, 3: 1.0}


class GeopoliticalScorer:
    def _treaty_score(self, treaties: list[Treaty]) -> float:
        """Weight each treaty by Art.38 CIJ multiplier, normalize to [0, 100]."""
        active_treaties = [t for t in treaties if t.active]
        if not active_treaties:
            return 0.0
        weighted_sum = sum(TREATY_MULTIPLIERS[t.level] for t in active_treaties)
        max_possible = len(active_treaties) * 3.0  # all level-1 would be max
        return (weighted_sum / max_possible) * 100.0

    def _litigation_penalty(self, icj_cases: int) -> float:
        """Returns icj_cases * -15.0"""
        return icj_cases * -15.0

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

    def compute(self, case) -> ScoringResult:
        """Orchestrate scoring. S_afinidad and S_intereses use placeholder values
        from the case context until RAG is wired in Task 7."""
        weights = ScoringWeights()

        # Placeholder values until RAG integration in Task 7
        treaties = getattr(case, "treaties", [])
        icj_cases = getattr(case, "icj_cases", 0)
        s_affinity = getattr(case, "s_affinity", 50.0)
        s_interests = getattr(case, "s_interests", 50.0)

        s_history = self._treaty_score(treaties)
        litigation_penalty = self._litigation_penalty(icj_cases)

        score_total = self._compute_total(
            s_affinity=s_affinity,
            s_history=s_history,
            s_interests=s_interests,
            weights=weights,
            litigation_penalty=litigation_penalty,
        )

        return ScoringResult(
            score_total=score_total,
            breakdown=ScoreBreakdown(
                affinity=s_affinity,
                history=s_history,
                interests=s_interests,
            ),
            litigation_penalty=litigation_penalty,
        )
