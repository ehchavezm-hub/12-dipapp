"""RAG context builder with domain whitelist and UN vote fetching."""
from __future__ import annotations

import logging
from urllib.parse import urlparse

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
    url = (
        f"https://data.un.org/ws/rest/data/DF_GA_Voting_Records/A..{country}/"
        f"?startPeriod={(2026 - years)}&endPeriod=2026&format=json"
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


async def build_rag_context(case: AnalysisCaseDTO) -> str:
    """Build a RAG context string from UN vote data and support documents."""
    parts: list[str] = []

    # Fetch UN vote summaries for each target country
    for profile in case.target_profiles:
        votes_text = await fetch_un_votes(
            profile.country_code, case.analysis_period_years
        )
        if votes_text:
            parts.append(f"[UN Voting — {profile.name}]\n{votes_text}")

    # Append support documents (DocumentChunk objects or plain dicts)
    for doc in case.support_documents:
        if hasattr(doc, "content"):
            parts.append(f"[Document]\n{doc.content}")
        elif isinstance(doc, dict) and "content" in doc:
            parts.append(f"[Document]\n{doc['content']}")

    return "\n\n".join(parts)
