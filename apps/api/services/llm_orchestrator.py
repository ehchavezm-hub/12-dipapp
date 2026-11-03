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
    wait_exponential,
)

from schemas.analysis import AnalysisCaseDTO, ScoringResult, ThreeScenariosResult
from services.rag_ingestion import build_rag_context

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are Ambassador Dr. Elena Vargas, a senior diplomat with 35 years of experience \
in multilateral negotiations and international law. You advise heads of state and \
chancelleries across Latin America on geopolitical strategy.

## Legal hierarchy (Art. 38 Statute of the International Court of Justice)
1. International conventions (treaties, bilateral/multilateral agreements)
2. International custom (state practice + opinio juris)
3. General principles of law recognized by civilized nations
4. Judicial decisions and scholarly doctrine (subsidiary means)

## Mandate
- Maintain strict neutrality — present balanced pro/contra analysis for each scenario.
- Apply chain-of-thought reasoning visible in the `chain_of_thought` field.
- Ground every recommendation in the Art.38 hierarchy above.
- Cite sources with real URLs when possible.

## Output format
Return exactly three diplomatic scenarios labeled A, B, C:
- A: Most ambitious / integrationist
- B: Pragmatic / incremental
- C: Minimalist / status-quo plus

## Few-shot examples

### Peru-Chile TLC (2009)
Peru and Chile concluded a comprehensive Free Trade Agreement leveraging Pacific \
Alliance momentum. Key leverage: shared Pacific seaboard, mining investment flows, \
and APEC membership. Result: 400 % trade increase in 10 years.

### Brazil-Argentina MERCOSUR deepening (2021)
Despite political differences, both nations prioritized MERCOSUR's Common External \
Tariff renegotiation. Shared interests in auto-parts and agri-food sectors overcame \
bilateral tensions.

### Singapore-ASEAN Digital Economy Framework (2022)
Singapore positioned itself as the digital hub for ASEAN's e-commerce corridor, \
using DEFA negotiations to lock in favorable data-flow standards while preserving \
national sovereignty clauses.

When analyzing, always show explicit reasoning before conclusions (chain_of_thought).
"""

# ---------------------------------------------------------------------------
# Retry predicates
# ---------------------------------------------------------------------------


def _is_retryable(exc: BaseException) -> bool:
    """Retry on 429 / 5xx-like errors from any SDK."""
    msg = str(exc).lower()
    return any(
        kw in msg for kw in ("429", "500", "502", "503", "rate limit", "overloaded")
    )


_retry_decorator = retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)


# ---------------------------------------------------------------------------
# LLM calls
# ---------------------------------------------------------------------------


async def _call_anthropic(user_prompt: str) -> ThreeScenariosResult:
    """Call claude-opus-4-5 via instructor, with tenacity retries."""
    from settings import get_settings

    settings = get_settings()

    @_retry_decorator
    async def _inner() -> ThreeScenariosResult:
        client = instructor.from_anthropic(
            anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        )
        return await client.chat.completions.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            response_model=ThreeScenariosResult,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
            system=SYSTEM_PROMPT,
        )

    return await _inner()


async def _call_openai(user_prompt: str) -> ThreeScenariosResult:
    """Fallback: call gpt-4o via instructor."""
    from settings import get_settings

    settings = get_settings()

    client = instructor.from_openai(
        openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    )
    return await client.chat.completions.create(
        model="gpt-4o",
        response_model=ThreeScenariosResult,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )


# ---------------------------------------------------------------------------
# Main orchestration entry point
# ---------------------------------------------------------------------------


async def orchestrate(case: AnalysisCaseDTO, scores: ScoringResult) -> ThreeScenariosResult:
    """Build RAG context, call Anthropic, fall back to OpenAI on failure."""
    t0 = time.monotonic()

    rag_context = await build_rag_context(case)

    user_prompt = _build_user_prompt(case, scores, rag_context)

    try:
        result = await _call_anthropic(user_prompt)
        model_used = "claude-opus-4-5"
    except Exception as exc:
        logger.warning("Anthropic call failed (%s), falling back to OpenAI", exc)
        result = await _call_openai(user_prompt)
        model_used = "gpt-4o"

    elapsed = time.monotonic() - t0

    # Patch metadata with actual runtime values
    result.analysis_metadata.model_used = model_used
    result.analysis_metadata.processing_time_s = round(elapsed, 2)
    result.analysis_metadata.rag_sources_count = len(case.target_profiles) + len(
        case.support_documents
    )

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
        f"## Geopolitical Scores",
        f"- Total score: {scores.score_total:.1f}/100",
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
        "Please provide three diplomatic scenarios (A, B, C) as specified. "
        "For each scenario, include a detailed chain_of_thought that shows your "
        "reasoning step by step before arriving at the strategy.",
    ]

    return "\n".join(prompt_parts)
