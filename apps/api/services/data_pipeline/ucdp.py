"""Source 3: UCDP API — Uppsala Conflict Data Program.

Endpoint: https://ucdpapi.pcr.uu.se/api/gedevents/22.1?pagesize=1000
Provides GED (Georeferenced Event Dataset) with country-of-conflict pairs.
Returns dispute edges weighted by conflict intensity.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from . import cache as C
from .country_meta import ALL_CODES

log = logging.getLogger(__name__)

_API_BASE = "https://ucdpapi.pcr.uu.se/api"

# UCDP uses country names; map to ISO-3
_NAME_TO_ISO3: dict[str, str] = {
    "United States of America": "usa", "Russia (Soviet Union)": "rus",
    "Russia": "rus", "China": "chn", "United Kingdom": "gbr",
    "France": "fra", "Germany": "deu", "India": "ind", "Pakistan": "pak",
    "Iran (Persia)": "irn", "Iran": "irn", "Iraq": "irq", "Israel": "isr",
    "Saudi Arabia": "sau", "Turkey (Ottoman Empire)": "tur", "Turkey": "tur",
    "Egypt": "egy", "Libya": "lby", "Syria": "syr", "Yemen (North Yemen)": "yem",
    "Yemen": "yem", "Somalia": "som", "Sudan": "sdn", "Ethiopia": "eth",
    "Nigeria": "nga", "Democratic Republic of the Congo": "cog",
    "Afghanistan": "afg", "Ukraine": "ukr", "Myanmar (Burma)": "mmr",
    "Myanmar": "mmr", "Colombia": "col", "Mexico": "mex",
    "Philippines": "phl", "Indonesia": "idn", "Thailand": "tha",
    "South Africa": "zaf", "Kenya": "ken", "Rwanda": "rwa",
    "Uganda": "uga", "Cameroon": "cmr", "Mali": "mli",
    "Burkina Faso": "bfa", "Niger": "nig", "Mozambique": "moz",
    "Zimbabwe": "zwe", "Angola": "ago", "Palestine": "pse",
    "Azerbaijan": "aze", "Armenia": "arm", "Georgia": "geo",
    "Venezuela": "ven", "Peru": "per", "Bolivia": "bol",
    "Cambodia": "khm", "Vietnam": "vnm", "North Korea": "prk",
    "South Korea": "kor", "Japan": "jpn", "Lebanon": "lbn",
    "Jordan": "jor", "Morocco": "mar", "Algeria": "dza",
    "Tunisia": "tun", "Senegal": "sen", "Ghana": "gha",
    "Côte d'Ivoire": "civ", "Tanzania": "tza", "Zambia": "zmb",
    "Malawi": "mwi", "Madagascar": "mdg", "Sierra Leone": "sle",
    "Liberia": "lbr", "Guinea": "gin", "Chad": "tcd",
    "Central African Republic": "caf", "South Sudan": "ssd",
}


def _resolve_country(name: str) -> str | None:
    iso3 = _NAME_TO_ISO3.get(name)
    if iso3 and iso3 in ALL_CODES:
        return iso3
    return None


def fetch_conflict_edges() -> list[dict[str, Any]]:
    """Fetch recent armed conflicts and return dispute edges."""
    cache_key = "ucdp_ged_conflicts"
    cached = C.get(cache_key)
    if cached:
        return cached

    # Count conflict events per country-pair
    pair_counts: dict[tuple[str, str], int] = {}

    page = 1
    while page <= 5:  # limit pages to avoid timeouts
        url = f"{_API_BASE}/gedevents/23.1?pagesize=1000&page={page}"
        try:
            resp = httpx.get(url, timeout=30, follow_redirects=True)
            resp.raise_for_status()
            data = resp.json()
            events = data.get("Result", [])
            if not events:
                break
            for ev in events:
                side_a = _resolve_country(ev.get("country", "") or ev.get("side_a_new_id", ""))
                side_b_name = ev.get("side_b", "") or ""
                side_b = _resolve_country(side_b_name)
                # Also try dyad countries
                if not side_b:
                    side_b = _resolve_country(ev.get("region", "") or "")
                if side_a and side_b and side_a != side_b:
                    key = (min(side_a, side_b), max(side_a, side_b))
                    pair_counts[key] = pair_counts.get(key, 0) + 1
            if not data.get("NextPageUrl"):
                break
            page += 1
        except Exception as exc:
            log.warning("UCDP page %d failed: %s", page, exc)
            break

    if not pair_counts:
        log.warning("UCDP: no data — using known conflict pairs")
        return _fallback_conflict_edges()

    max_count = max(pair_counts.values()) if pair_counts else 1
    edges: list[dict[str, Any]] = []
    for (a, b), count in pair_counts.items():
        weight = round(0.3 + 0.7 * (count / max_count), 4)
        edges.append({
            "source": f"c-{a}",
            "target": f"c-{b}",
            "type": "dispute",
            "weight": weight,
            "treatyLevel": 3,
        })

    C.set(cache_key, edges, ttl=C.API_TTL)
    return edges


def _fallback_conflict_edges() -> list[dict[str, Any]]:
    """Known active/recent conflicts when UCDP API is unreachable."""
    pairs = [
        ("rus", "ukr", 1.0),
        ("isr", "pse", 0.9),
        ("usa", "afg", 0.6),
        ("usa", "irq", 0.6),
        ("usa", "irn", 0.5),
        ("usa", "prk", 0.5),
        ("chn", "twn", 0.6),
        ("ind", "pak", 0.7),
        ("irn", "isr", 0.6),
        ("sau", "yem", 0.8),
        ("eth", "som", 0.5),
        ("eth", "eri", 0.5),
        ("sdn", "ssd", 0.6),
        ("aze", "arm", 0.7),
        ("chn", "ind", 0.4),
        ("chn", "phl", 0.4),
        ("chn", "vnm", 0.4),
        ("tur", "syr", 0.6),
        ("tur", "irq", 0.5),
        ("rus", "geo", 0.5),
        ("col", "ven", 0.4),
        ("kor", "prk", 0.6),
    ]
    return [
        {"source": f"c-{a}", "target": f"c-{b}", "type": "dispute",
         "weight": w, "treatyLevel": 3}
        for a, b, w in pairs
    ]
