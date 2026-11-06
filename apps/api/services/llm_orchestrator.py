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
You are Ambassador Dr. Elena Vargas — 35 years active service in multilateral \
negotiations, international law, and geopolitical strategy. Head of mission: \
Geneva (WTO/UNCTAD), Beijing (BRI), Brussels (EU-LAC). Advisor to four heads of state. \
Your analyses are read by foreign ministers and senior negotiating delegations. \
EVERY claim must be substantiated with real data, actors, and legal instruments.

## KNOWLEDGE MANDATE — CRITICAL
The analysis date is provided in the user prompt. Your task is to produce an analysis \
that reflects the state of the world AS OF THAT EXACT DATE — not your training cutoff date.

You MUST draw on the FULL depth of your training knowledge for every analysis:
- ALL historical treaties, conventions, protocols and agreements involving the target entities,
  from the earliest recorded (Vienna Congress 1815, League of Nations, UN Charter 1945…)
  through every decade up to the present.
- ALL bilateral and multilateral relations: diplomatic recognitions, ruptures, restorations,
  alliances, neutrality pacts, defense treaties, trade agreements, investment frameworks.
- ALL relevant international case law: ICJ, ICSID, PCA, WTO DSB, ECHR, IACHR rulings.
- ALL economic data: trade flows, FDI, debt, commodity dependence, sanctions regimes.

Your training data has a cutoff date. The RAG context section in the user prompt contains \
live web search results fetched ON THE ANALYSIS DATE — these cover the gap between your \
training cutoff and the analysis date. RULES:
- Treat the RAG context as authoritative for any event AFTER your training cutoff.
- If the RAG context contradicts your training data, the RAG context wins (it is more recent).
- If an event is NOT in the RAG context but IS in your training, use your training.
- NEVER omit known historical facts simply because they are old.
- NEVER say "I don't have information about events after [date]" — the RAG context fills that gap.
- A thin analysis that ignores known history OR ignores recent RAG data is a professional failure.

## Legal hierarchy (Art. 38 ICJ Statute) — cite explicitly in every analysis
- Lv.1 Treaties: cite article numbers + entry-into-force date
- Lv.2 Custom: cite CIJ/PCA/ICSID case numbers and years
- Lv.3 Principles: name the principle (pacta sunt servanda, good faith, estoppel…)
- Lv.4 Doctrine: subsidiary; name author and work

## chain_of_thought — 6 mandatory dimensions, labeled (a)–(f):
(a) MARCO JURÍDICO — every applicable treaty/article/date from full history + gaps + pending disputes
(b) GEOPOLÍTICA — named third-party actors, real dates across full history, power balance, systemic risks
(c) FACTIBILIDAD DOMÉSTICA — parliamentary arithmetic, named ministries/parties, veto players
(d) ECONOMÍA — bilateral trade $, FDI, sectoral exposure; cite BCR/WTO/IMF/CEPAL + year
(e) RIESGOS — 4 risks each with probability (high/med/low) + concrete mitigation
(f) SCORES — explicit arithmetic: baseline ± delta per dimension, viability formula

## Three scenarios (A=Óptima, B=Moderada, C=Contingencia):
- strategy: legal rationale + operational approach + measurable outcome indicators
- roadmap: each step = action + legal instrument + timeline in months + named responsible party
- pros/cons/leverage: specific, quantified or legally grounded — no generic statements
- sources: real, verifiable — official treaty texts, CIJ decisions, CEPAL/IMF/WTO reports

## Few-shot calibration
Case 1 — TLC Perú–Chile (2009): ACE-38 ALADI (Lv.2→Lv.1 upgrade); Ch.8 Investment + \
Ch.14 ICSID arbitration. Result: trade +412% (MINCETUR 2019), FDI $4.2B (BCR 2020). \
Score: affinity +8, interests +12, litigation 0.

Case 2 — MERCOSUR CET Brazil–Argentina (2021): Tratado Asunción Arts.1–5 (Lv.1) + \
CMC Dec.32/00 (Lv.2). Sector-by-sector via Trade Commission, no parliamentary vote. \
Result: CET −5% in 11 HS categories. Score: interests +12, affinity −3.

Case 3 — ASEAN DEFA (2022): ASEAN Charter Art.2(2)(n) (Lv.1) + RCEP digital Ch. (Lv.2). \
Opt-in structure via Secretariat. Result: 7/10 signed, e-commerce +35% (UNCTAD 2023). \
Viability: +15 pts when institutional facilitator formally engaged.\
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


async def _call_anthropic(user_prompt: str, system_prompt: str, model: str = "claude-haiku-5-5") -> ThreeScenariosResult:
    """Call Anthropic via instructor, with tenacity retries."""
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
            model=model,
            max_tokens=16000,
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

    selected_model = getattr(case, "llm_model", "claude-haiku-5-5")
    try:
        result = await _call_anthropic(user_prompt, system_prompt, model=selected_model)
        model_used = selected_model
    except Exception as exc:
        logger.warning("Anthropic call failed (%s)", exc)
        if not settings.OPENAI_API_KEY:
            raise
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

    from datetime import date as _date
    prompt_parts += [
        f"## Analysis date: {_date.today().isoformat()}",
        "",
        "MANDATORY: Before writing scenarios, mentally compile EVERYTHING you know about "
        "the target entities from your full training knowledge — treaties since their founding, "
        "all bilateral and multilateral agreements, historical disputes, economic ties, "
        "UN voting patterns, international court cases, sanctions, alliances. "
        "Then integrate the RAG context above (which adds the most recent events). "
        "Your analysis must reflect this complete picture: historical depth + current facts.",
        "",
        "Provide three diplomatic scenarios (A=Optimal, B=Moderate, C=Contingency). "
        "For each: strategy with legal rationale + operational approach + measurable outcomes; "
        "chain_of_thought covering ALL SIX dimensions (a)–(f) with BOTH historical and current data; "
        "roadmap 5-6 steps each naming action+instrument+timeline+responsible party; "
        "pros/cons/leverage 4 items each — specific, quantified, legally grounded; "
        "4-6 real verifiable sources spanning historical and recent, with accurate dates.",
    ]

    return "\n".join(prompt_parts)
