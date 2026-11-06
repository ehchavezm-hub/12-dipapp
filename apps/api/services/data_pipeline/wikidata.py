"""Source 4: Wikidata P530 — diplomatic relations (SPARQL).

Property P530 = "diplomatic relation" between countries.
Endpoint: https://query.wikidata.org/sparql

Returns bilateral_treaty edges for all bilateral diplomatic relations.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

_SPARQL_URL = "https://query.wikidata.org/sparql"

# SPARQL query: all pairs of countries with P530 (diplomatic relations)
_QUERY = """
SELECT ?country1Code ?country2Code WHERE {
  ?country1 wdt:P530 ?country2 .
  ?country1 wdt:P298 ?country1Code .
  ?country2 wdt:P298 ?country2Code .
  FILTER(?country1 != ?country2)
}
"""


def fetch_diplomatic_edges() -> list[dict[str, Any]]:
    """Fetch Wikidata P530 diplomatic relations."""
    cache_key = "wikidata_p530_relations"
    cached = C.get(cache_key)
    if cached:
        return cached

    try:
        resp = httpx.post(
            _SPARQL_URL,
            data={"query": _QUERY, "format": "json"},
            headers={"Accept": "application/sparql-results+json",
                     "User-Agent": "DipApp/1.0 (automated academic research)"},
            timeout=60,
            follow_redirects=True,
        )
        resp.raise_for_status()
        results = resp.json().get("results", {}).get("bindings", [])
    except Exception as exc:
        log.warning("Wikidata SPARQL failed: %s", exc)
        return _fallback_diplomatic_edges()

    seen: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []
    for row in results:
        c1 = row.get("country1Code", {}).get("value", "").lower()
        c2 = row.get("country2Code", {}).get("value", "").lower()
        if not c1 or not c2 or c1 == c2:
            continue
        key = (min(c1, c2), max(c1, c2))
        if key in seen:
            continue
        seen.add(key)
        edges.append({
            "source": f"c-{c1}",
            "target": f"c-{c2}",
            "type": "bilateral_treaty",
            "weight": 0.5,
            "treatyLevel": 2,
        })

    if edges:
        C.set(cache_key, edges, ttl=C.AMBASSADOR_TTL)  # 12 h — ambassador rotations change frequently
        return edges
    return _fallback_diplomatic_edges()


def _fallback_diplomatic_edges() -> list[dict[str, Any]]:
    """Major bilateral diplomatic relations when Wikidata is unreachable."""
    # UN member states: virtually all have relations with the P5 + major powers
    p5 = ["usa", "gbr", "fra", "chn", "rus"]
    major = [
        "deu","jpn","ind","bra","can","ita","aus","kor","mex","idn",
        "tur","sau","are","isr","egy","zaf","arg","tha","nld","esp",
        "pol","swe","nor","dnk","fin","che","aut","bel","grc","prt",
        "ukr","col","chl","per","nga","ken","eth","pak","bgd","vnm",
        "phl","mys","sgp","nzl","mar","dza","tun","irq","lbn","jor",
        "kwt","qat","omn","kaz","uzb","aze","geo","arm",
    ]
    seen: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []

    # Every major power has bilateral relations with every other major country
    all_countries = p5 + major
    for i, a in enumerate(all_countries):
        for b in all_countries[i + 1:]:
            # Skip known non-relations
            if _are_non_relations(a, b):
                continue
            key = (min(a, b), max(a, b))
            if key in seen:
                continue
            seen.add(key)
            # P5 pairs get higher weight
            w = 0.7 if (a in p5 and b in p5) else 0.5
            edges.append({
                "source": f"c-{a}",
                "target": f"c-{b}",
                "type": "bilateral_treaty",
                "weight": w,
                "treatyLevel": 2,
            })
    return edges


def _are_non_relations(a: str, b: str) -> bool:
    """Return True for well-known diplomatic non-recognition pairs."""
    non_relations = {
        frozenset(["usa", "irn"]),
        frozenset(["usa", "prk"]),
        frozenset(["usa", "cub"]),
        frozenset(["isr", "irn"]),
        frozenset(["isr", "syr"]),
        frozenset(["isr", "sau"]),  # pre-Abraham Accords normalisation
        frozenset(["chn", "twn"]),  # PRC doesn't recognise ROC
        frozenset(["prk", "jpn"]),
        frozenset(["prk", "kor"]),
    }
    return frozenset([a, b]) in non_relations
