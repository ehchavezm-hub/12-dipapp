"""Source 1: World Bank Trade API — bilateral trade volumes.

Endpoint: https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade/...
Fallback: https://api.worldbank.org/v2/country (connectivity/metadata)

Returns list of (reporter_iso3, partner_iso3, trade_usd) tuples.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from . import cache as C
from .country_meta import ALL_CODES

log = logging.getLogger(__name__)

_WITS_BASE = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade"
_WB_BASE   = "https://api.worldbank.org/v2"

# Top trade partners by volume — used to limit API calls (WITS rate-limits heavily)
_MAJOR = [
    "usa","chn","deu","jpn","gbr","fra","kor","ind","can","ita",
    "nld","aus","bra","rus","mex","esp","sgp","zaf","sau","are",
    "tur","idn","pol","arg","chl","col","per","egy","tha","mys",
    "phl","vnm","pak","bgd","ukr","irn","nga","ken","eth",
]


def _fetch_wits_reporter(reporter: str, year: int = 2022) -> list[tuple[str, str, float]]:
    """Fetch export data for one reporter from WITS."""
    url = (
        f"{_WITS_BASE}/reporter/{reporter.upper()}"
        f"/year/{year}/partner/ALL/product/Total/indicator/TV"
    )
    cache_key = f"wits_{reporter}_{year}"
    cached = C.get(cache_key)
    if cached:
        return [(r, p, v) for r, p, v in cached]

    try:
        r = httpx.get(url, timeout=20, follow_redirects=True)
        r.raise_for_status()
        data = r.json()
        rows: list[tuple[str, str, float]] = []
        # WITS SDMX-JSON structure: data.dataSets[0].series
        series = data.get("dataSets", [{}])[0].get("series", {})
        structure = data.get("structure", {})
        dimensions = structure.get("dimensions", {}).get("series", [])
        # Find partner dimension index
        partner_dim = next(
            (d for d in dimensions if d.get("id") == "PARTNER"), None
        )
        if not partner_dim:
            return []
        partner_values = {str(i): v.get("id", "").lower()
                          for i, v in enumerate(partner_dim.get("values", []))}
        for key, obs_dict in series.items():
            parts = key.split(":")
            # partner index is typically position 1
            if len(parts) < 2:
                continue
            partner_iso = partner_values.get(parts[1], "")
            if not partner_iso or partner_iso not in ALL_CODES:
                continue
            obs = obs_dict.get("observations", {})
            if obs:
                val_list = list(obs.values())
                if val_list and val_list[0]:
                    trade_val = float(val_list[0][0] or 0)
                    if trade_val > 0:
                        rows.append((reporter, partner_iso, trade_val))
        C.set(cache_key, [(r, p, v) for r, p, v in rows], ttl=C.API_TTL)
        return rows
    except Exception as exc:
        log.warning("WITS fetch failed for %s: %s", reporter, exc)
        return []


def fetch_trade_edges() -> list[dict[str, Any]]:
    """Return trade edges from World Bank WITS for major economies."""
    all_rows: list[tuple[str, str, float]] = []
    for code in _MAJOR:
        all_rows.extend(_fetch_wits_reporter(code))

    if not all_rows:
        log.warning("World Bank: no data fetched — using empty set")
        return []

    # Normalise weights to [0.1, 1.0]
    max_val = max(v for _, _, v in all_rows) if all_rows else 1
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for src, tgt, val in all_rows:
        if src == tgt:
            continue
        key = (min(src, tgt), max(src, tgt))
        if key in seen:
            continue
        seen.add(key)
        weight = round(0.1 + 0.9 * (val / max_val), 4)
        edges.append({
            "source": f"c-{src}",
            "target": f"c-{tgt}",
            "type": "trade_agreement",
            "weight": weight,
            "treatyLevel": 1 if weight >= 0.5 else 2,
        })
    return edges
