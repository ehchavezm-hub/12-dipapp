"""RAG context builder with domain whitelist, UN vote fetching, and live web search."""
from __future__ import annotations

import asyncio
import logging
from datetime import date
from urllib.parse import urlparse

import anthropic
import httpx

from schemas.analysis import AnalysisCaseDTO

logger = logging.getLogger(__name__)

ALLOWED_DOMAINS: set[str] = {
    # Top-level government suffix
    "gov",
    # Latin-American government domains
    "gob.pe",
    "gob.mx",
    "gob.ar",
    "gob.cl",
    "gob.co",
    "gob.ec",
    # International organisations
    "un.org",
    "undocs.org",
    "europa.eu",
    "worldbank.org",
    "imf.org",
    "oas.org",
    "asean.org",
    "apec.org",
    # Verified press
    "reuters.com",
    "bbc.com",
    "ft.com",
    "bloomberg.com",
    "economist.com",
    "afp.com",
}


def is_domain_allowed(url: str) -> bool:
    """Return True if the URL's effective domain is in ALLOWED_DOMAINS."""
    try:
        hostname = urlparse(url).hostname or ""
        hostname = hostname.lower().removeprefix("www.")
        # Check exact match first, then suffix match for "gov" TLD
        if hostname in ALLOWED_DOMAINS:
            return True
        for allowed in ALLOWED_DOMAINS:
            if hostname == allowed or hostname.endswith("." + allowed):
                return True
        return False
    except Exception:
        return False


async def fetch_un_votes(country: str, years: int) -> str:
    """Fetch UN General Assembly voting alignment summary for a country.

    Calls the UN DATA API (or a stub when unavailable). Returns an empty string
    on any network error — graceful degradation.
    """
    current_year = date.today().year
    url = (
        f"https://data.un.org/ws/rest/data/DF_GA_Voting_Records/A..{country}/"
        f"?startPeriod={current_year - years}&endPeriod={current_year}&format=json"
    )
    if not is_domain_allowed(url):
        logger.warning("fetch_un_votes: domain not in whitelist for URL %s", url)
        return ""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            # Extract a simple text summary
            series = data.get("data", {}).get("dataSets", [{}])
            count = len(series[0].get("series", {})) if series else 0
            return f"UN votes for {country} ({years}y): {count} records found."
    except Exception as exc:
        logger.warning("fetch_un_votes failed for %s: %s", country, exc)
        return ""


async def fetch_live_context(targets: str, objective: str) -> str:
    """Use claude-haiku-5-5 + web_search to get a brief current geopolitical summary.

    One search, max 200 words response — minimum token cost (~$0.001 per call).
    Returns empty string on any error (graceful degradation).
    """
    from settings import get_settings
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        return ""
    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        query = (
            f"Situación geopolítica actual de {targets} relevante para: {objective}. "
            f"Incluir: relaciones diplomáticas recientes, acuerdos vigentes, tensiones activas. "
            f"Responde en máximo 200 palabras, solo hechos verificables del {date.today().year}."
        )
        # Default verified domains — extend via SEARCH_ALLOWED_DOMAINS env var
        # (comma-separated list in Render → Environment, e.g. "apnews.com,dw.com")
        default_domains = [
            "un.org", "undocs.org", "worldbank.org", "imf.org",
            "oas.org", "asean.org", "apec.org", "europa.eu",
            "reuters.com", "bbc.com", "ft.com", "bloomberg.com",
            "economist.com", "afp.com",
        ]
        import os
        extra = [d.strip() for d in os.environ.get("SEARCH_ALLOWED_DOMAINS", "").split(",") if d.strip()]
        allowed_domains = list(dict.fromkeys(default_domains + extra))  # deduplicate, preserve order

        response = await client.messages.create(
            model="claude-haiku-5-5",
            max_tokens=300,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 1,
                "allowed_domains": allowed_domains,
            }],
            messages=[{"role": "user", "content": query}],
        )
        # Extract only text blocks from the response
        text_parts = [b.text for b in response.content if hasattr(b, "text") and b.text]
        summary = " ".join(text_parts).strip()
        if summary:
            logger.info("Live web context fetched (%d chars)", len(summary))
        return summary
    except Exception as exc:
        logger.warning("fetch_live_context failed: %s", exc)
        return ""


async def collect_rag_parts(case: AnalysisCaseDTO) -> list[str]:
    """Collect RAG context blocks: live web search + UN votes + support documents."""
    targets_str = ", ".join(p.name for p in case.target_profiles)
    objective_str = case.diplomatic_objective.description if case.diplomatic_objective else ""

    # Run live web search and UN votes concurrently
    live_ctx, *votes = await asyncio.gather(
        fetch_live_context(targets_str, objective_str),
        *(fetch_un_votes(p.country_code, case.analysis_period_years) for p in case.target_profiles),
    )

    parts: list[str] = []
    if live_ctx:
        parts.append(f"[Contexto actual — búsqueda web {date.today()}]\n{live_ctx}")

    parts.extend(
        f"[UN Voting — {profile.name}]\n{text}"
        for profile, text in zip(case.target_profiles, votes)
        if text
    )
    parts.extend(
        f"[Document: {doc.source} #{doc.chunk_index}]\n{doc.content}"
        for doc in case.support_documents
        if doc.content.strip()
    )
    return parts


async def build_rag_context(case: AnalysisCaseDTO) -> str:
    """Build a RAG context string from UN vote data and support documents."""
    return "\n\n".join(await collect_rag_parts(case))
