"""LLM orchestrator: Anthropic primary + OpenAI fallback via instructor."""
from __future__ import annotations

import json
import logging
import time

import anthropic
import instructor
import openai
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_random_exponential,
)

from schemas.analysis import AnalysisCaseDTO, LANGUAGE_NAMES, ScoringResult, ThreeScenariosResult
from services.rag_ingestion import collect_rag_parts

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

BASE_SYSTEM_PROMPT = """\
You are Ambassador Dr. Elena Vargas, a senior diplomat with 35 years of experience \
in multilateral negotiations, international law, and geopolitical strategy. \
You have served as head of mission in Geneva, Beijing, and Brussels, and you advise \
heads of state and foreign ministries across Latin America.

## Legal hierarchy (Art. 38 Statute of the International Court of Justice)
1. International conventions (treaties, bilateral/multilateral agreements) — highest weight
2. International custom (state practice + opinio juris)
3. General principles of law recognized by civilized nations
4. Judicial decisions and scholarly doctrine (subsidiary means)

## Mandate
- Maintain strict diplomatic neutrality — present balanced pro/contra analysis.
- Always show chain-of-thought reasoning in the `chain_of_thought` field BEFORE \
  writing any scores or recommendations. The CoT must include: (a) assessment of \
  treaty history and legal standing, (b) geopolitical risk factors, \
  (c) domestic political feasibility, (d) explicit justification of both numeric scores.
- Ground every recommendation in the Art.38 hierarchy.
- Cite real, verifiable sources with accurate URLs when possible.

## Output format
Return exactly THREE diplomatic scenarios labeled A, B, C:
- A — Óptima/Optimal: most ambitious, integrationist strategy
- B — Moderada/Moderate: pragmatic, incremental, politically viable
- C — Contingencia/Contingency: minimalist, risk-averse, status-quo plus

Each scenario must have a `roadmap` with 4–6 concrete steps, each with a realistic \
timeline and responsible party (minister, agency, or multilateral body).

## Numeric fields
- `score_total` (0-100): start from the deterministic baseline provided, adjust ±15 max.
- `viability_score` (0-100): probability of success within the stated period, \
  weighting political will, legal feasibility (Art.38), litigation risk, resources.
- Justify BOTH numbers in `chain_of_thought` with explicit reasoning.

## Annotated Real-World Cases (few-shot examples)

### Case 1 — Peru–Chile Comprehensive FTA (2009)
**Context:** Both Pacific Alliance neighbors with overlapping fishing zones and \
competing mining concessions, but strong APEC institutional ties.
**Strategy used (Scenario B):** Incremental liberalization starting with \
non-sensitive sectors (services, SMEs), then auto-parts and agriculture.
**Key leverage:** Shared port infrastructure at Ilo–Iquique corridor; \
resolution of pending Tacna customs dispute via Art.38 Lv.1 treaty.
**Result:** 400% bilateral trade growth over 10 years; $4.2B FDI from Chile to Peru.
**Lesson:** Pre-FTA dispute resolution at CIJ level (Lv.1) enables faster \
ratification of commercial treaties (Lv.2). Score impact: +8 pts affinity.

### Case 2 — Brazil–Argentina MERCOSUR CET Renegotiation (2021)
**Context:** Political divergence (Bolsonaro/Fernández) but deep auto-parts \
and agri-food interdependence; $30B/year bilateral trade.
**Strategy used (Scenario B/C hybrid):** Sector-by-sector approach bypassing \
ideological friction; use of MERCOSUR's existing Art.38 Lv.2 framework.
**Key leverage:** Brazil's export surplus in manufactured goods; \
Argentina's food security leverage in MERCOSUR Council.
**Result:** Partial CET reduction (-5%) in 11 categories; maintained MERCOSUR unity.
**Lesson:** Shared economic interests (Lv.3) can override political divergence \
when framed as technical (not political) negotiation. Score impact: interests +12 pts.

### Case 3 — Singapore–ASEAN Digital Economy Framework (DEFA 2022)
**Context:** Singapore as digital hub; ASEAN digital GDP $1T by 2025 target; \
fragmented national data-sovereignty laws across 10 member states.
**Strategy used (Scenario A):** Singapore proposed DEFA as Lv.2 multilateral \
agreement with opt-in clauses for sensitive sectors; used ASEAN Secretariat \
(Lv.3 institutional body) as neutral facilitator.
**Key leverage:** Singapore's AAA credit rating and existing BIT network with \
7/10 ASEAN states; data center infrastructure as bargaining chip.
**Result:** 7 of 10 ASEAN states signed DEFA; e-commerce facilitation +35%.
**Lesson:** Multilateral frameworks succeed when structured as enabling \
(opt-in) rather than mandatory. Viability +15 pts when institutional \
facilitators (ASEAN Secretariat) are involved.

When analyzing, always show FULL chain-of-thought reasoning before conclusions.\
"""


def build_system_prompt(output_language: str = "es") -> str:
    """Append language instruction to the base system prompt."""
    lang_name = LANGUAGE_NAMES.get(output_language, "Spanish")
    return (
        BASE_SYSTEM_PROMPT
        + f"\n\n## Language\nYou MUST write ALL text fields (name, strategy, roadmap actions, "
        f"pros, cons, leverage_points, chain_of_thought, source titles) in {lang_name}. "
        f"Do not mix languages. The language code is: {output_language}."
    )

# ---------------------------------------------------------------------------
# Retry predicates
# ---------------------------------------------------------------------------


_RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504, 529}


def _is_retryable(exc: BaseException) -> bool:
    """Retry on 429 / 5xx and connection errors from the Anthropic or OpenAI SDKs."""
    if isinstance(exc, (anthropic.APIConnectionError, openai.APIConnectionError)):
        return True
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code in _RETRYABLE_STATUS
    msg = str(exc).lower()
    return any(kw in msg for kw in ("rate limit", "overloaded"))


_retry_decorator = retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_random_exponential(multiplier=1, min=1, max=10),  # backoff + jitter
    reraise=True,
)


# ---------------------------------------------------------------------------
# LLM calls
# ---------------------------------------------------------------------------


async def _call_anthropic(user_prompt: str, system_prompt: str) -> ThreeScenariosResult:
    """Call claude-opus-4-5 via instructor, with tenacity retries."""
    from settings import get_settings

    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    @_retry_decorator
    async def _inner() -> ThreeScenariosResult:
        client = instructor.from_anthropic(
            anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        )
        return await client.chat.completions.create(
            model="claude-opus-4-5",
            max_tokens=8192,
            response_model=ThreeScenariosResult,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
            system=system_prompt,
        )

    return await _inner()


async def _call_openai(user_prompt: str, system_prompt: str) -> ThreeScenariosResult:
    """Fallback: call gpt-4o via instructor."""
    from settings import get_settings

    settings = get_settings()

    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    client = instructor.from_openai(
        openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    )
    return await client.chat.completions.create(
        model="gpt-4o",
        response_model=ThreeScenariosResult,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )


# ---------------------------------------------------------------------------
# Main orchestration entry point
# ---------------------------------------------------------------------------


async def orchestrate(case: AnalysisCaseDTO, scores: ScoringResult) -> ThreeScenariosResult:
    """Build RAG context, call Anthropic, fall back to OpenAI on failure."""
    from settings import get_settings
    settings = get_settings()
    t0 = time.monotonic()

    rag_parts = await collect_rag_parts(case)
    rag_context = "\n\n".join(rag_parts)

    system_prompt = build_system_prompt(case.output_language)
    user_prompt = _build_user_prompt(case, scores, rag_context)

    try:
        result = await _call_anthropic(user_prompt, system_prompt)
        model_used = "claude-opus-4-5"
    except Exception as exc:
        logger.warning("Anthropic call failed (%s)", exc)
        if not settings.OPENAI_API_KEY:
            raise  # re-raise original error; no point calling OpenAI without key
        result = await _call_openai(user_prompt, system_prompt)
        model_used = "gpt-4o"

    elapsed = time.monotonic() - t0

    # Patch metadata with actual runtime values
    result.analysis_metadata.model_used = model_used
    result.analysis_metadata.processing_time_s = round(elapsed, 2)
    result.analysis_metadata.rag_sources_count = len(rag_parts)

    return result


def _build_user_prompt(
    case: AnalysisCaseDTO, scores: ScoringResult, rag_context: str
) -> str:
    """Construct the user-turn prompt from the analysis case and scores."""
    targets = ", ".join(
        f"{p.name} ({p.country_code})" for p in case.target_profiles
    )
    obj = case.diplomatic_objective
    geo = case.geopolitical_context
    breakdown = scores.breakdown

    prompt_parts = [
        f"## Diplomatic Analysis Request",
        f"",
        f"**Targets:** {targets}",
        f"**Objective:** [{obj.type}] {obj.description}",
        f"**Region/Context:** {geo.region} — {geo.description}",
        f"**Analysis period:** {case.analysis_period_years} years",
        f"",
        f"## Deterministic Geopolitical Scores (baseline)",
        f"- Baseline total score: {scores.score_total:.1f}/100",
        f"- Affinity: {breakdown.affinity:.1f}",
        f"- Historical relations: {breakdown.history:.1f}",
        f"- Shared interests: {breakdown.interests:.1f}",
        f"- Litigation penalty: {scores.litigation_penalty:.1f}",
        f"",
    ]

    if rag_context:
        prompt_parts += [
            f"## Context from RAG sources",
            rag_context,
            "",
        ]

    prompt_parts += [
        "Provide three diplomatic scenarios (A=Optimal, B=Moderate, C=Contingency). "
        "Be concise: strategy ≤120 words, chain_of_thought ≤150 words, "
        "roadmap 4-5 steps max, pros/cons/leverage 3 items each. "
        "Cite 2-3 real sources per scenario.",
    ]

    return "\n".join(prompt_parts)
