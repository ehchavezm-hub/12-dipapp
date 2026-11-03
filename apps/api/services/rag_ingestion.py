"""RAG context builder with domain whitelist and UN vote fetching."""
from __future__ import annotations

import asyncio
import logging
from datetime import date
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


async def collect_rag_parts(case: AnalysisCaseDTO) -> list[str]:
    """Collect RAG context blocks (UN vote summaries + sanitized support documents).

    UN vote lookups run concurrently; failed lookups are dropped, so the
    length of the result is the number of sources actually used.
    """
    votes = await asyncio.gather(
        *(fetch_un_votes(p.country_code, case.analysis_period_years) for p in case.target_profiles)
    )
    parts: list[str] = [
        f"[UN Voting — {profile.name}]\n{text}"
        for profile, text in zip(case.target_profiles, votes)
        if text
    ]
    parts.extend(
        f"[Document: {doc.source} #{doc.chunk_index}]\n{doc.content}"
        for doc in case.support_documents
        if doc.content.strip()
    )
    return parts


async def build_rag_context(case: AnalysisCaseDTO) -> str:
    """Build a RAG context string from UN vote data and support documents."""
    return "\n\n".join(await collect_rag_parts(case))
