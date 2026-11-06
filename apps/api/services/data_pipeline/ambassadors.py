"""Source: Wikidata SPARQL — current ambassadors (P39 position held).

Fetches people who currently hold ambassador positions, with:
- Ambassador name
- Sending country (ISO 3166-1 alpha-3)
- Receiving country (ISO 3166-1 alpha-3)
- Start date of appointment
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

_SPARQL_URL = "https://query.wikidata.org/sparql"

# Query: current ambassadors — people whose P39 (position held) is a subclass
# of Q121998 (ambassador), with no P582 (end date) = still in post.
# P17  = country (sending country of the position item)
# P131 = administrative location (receiving country, often set on the position)
# P580 = start time (appointment date)
_QUERY = """
SELECT DISTINCT
  ?personLabel
  ?fromCountryCode
  ?toCountryCode
  ?startDate
WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  ?pos wdt:P279* wd:Q121998 .
  FILTER NOT EXISTS { ?stmt pq:P582 [] }
  OPTIONAL {
    ?pos wdt:P17 ?fromCountry .
    ?fromCountry wdt:P298 ?fromCountryCode .
  }
  OPTIONAL {
    ?pos wdt:P131 ?toCountry .
    ?toCountry wdt:P298 ?toCountryCode .
  }
  OPTIONAL { ?stmt pq:P580 ?startDate }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
}
ORDER BY ?fromCountryCode ?personLabel
LIMIT 3000
"""


def fetch_ambassadors() -> list[dict[str, Any]]:
    """Return list of current ambassadors from Wikidata. Cached 12h."""
    cache_key = "wikidata_ambassadors_v1"
    cached = C.get(cache_key)
    if cached is not None:
        return cached

    try:
        resp = httpx.post(
            _SPARQL_URL,
            data={"query": _QUERY, "format": "json"},
            headers={
                "Accept": "application/sparql-results+json",
                "User-Agent": "DipApp/1.0 (automated academic research)",
            },
            timeout=90,
            follow_redirects=True,
        )
        resp.raise_for_status()
        bindings = resp.json().get("results", {}).get("bindings", [])
    except Exception as exc:
        log.warning("Wikidata ambassadors SPARQL failed: %s", exc)
        return []

    records: list[dict[str, Any]] = []
    for row in bindings:
        name = row.get("personLabel", {}).get("value", "")
        from_code = row.get("fromCountryCode", {}).get("value", "").upper()
        to_code = row.get("toCountryCode", {}).get("value", "").upper()
        raw_date = row.get("startDate", {}).get("value", "")

        # Skip anonymous Wikidata items (Qxxxxx labels)
        if not name or name.startswith("Q"):
            continue
        # Need at least one country
        if not from_code and not to_code:
            continue

        # Parse ISO date from xsd:dateTime or plain date string
        date_str = ""
        if raw_date:
            date_str = raw_date[:10]  # keep YYYY-MM-DD portion

        records.append({
            "name": name,
            "fromCountry": from_code,
            "toCountry": to_code,
            "startDate": date_str,
        })

    if records:
        C.set(cache_key, records, ttl=C.AMBASSADOR_TTL)
        log.info("Fetched %d ambassador records from Wikidata", len(records))
    return records
