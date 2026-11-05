"""Graph builder — combines all 8 data sources into nodes + edges.

Sources:
  1. World Bank WITS       → trade_agreement edges (live API, 24h cache)
  2. WTO RTA-IS            → trade_agreement edges (live API, 24h cache)
  3. UCDP GED              → dispute edges       (live API, 24h cache)
  4. Wikidata P530         → bilateral_treaty     (SPARQL, 24h cache)
  5. COW Diplomatic Exch.  → bilateral_treaty     (CSV, 7-day cache)
  6. MFA proxy (COW+Wiki)  → bilateral_treaty     (derived)
  7. ICB Project           → dispute edges       (CSV, 7-day cache)
  8. Voeten UNGA           → un_vote_alignment   (CSV, 7-day cache)
"""
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from .country_meta import ALL_CODES, get_cluster, get_label, get_region
from .world_bank import fetch_trade_edges
from .wto_rta import fetch_rta_edges
from .ucdp import fetch_conflict_edges
from .wikidata import fetch_diplomatic_edges
from .cow_exchange import fetch_cow_edges
from .icb_project import fetch_icb_edges
from .voeten_unga import fetch_unga_edges
from . import cache as C

log = logging.getLogger(__name__)

_GRAPH_CACHE_KEY = "built_graph_v1"
_GRAPH_TTL = 3_600  # re-merge every hour even if individual caches are fresh


def _build_nodes(active_codes: set[str]) -> list[dict[str, Any]]:
    """Build node list for every known country (all codes, not just active)."""
    nodes = []
    for code in ALL_CODES:
        nodes.append({
            "id": f"c-{code}",
            "type": "country",
            "label": get_label(code),
            "region": get_region(code),
            "affinityScore": 50.0,  # will be overwritten by scoring engine
            "clusterId": get_cluster(code),
        })
    return nodes


def _merge_edges(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deduplicate and merge edges: same (src, tgt, type) → max weight."""
    best: dict[tuple[str, str, str], dict[str, Any]] = {}
    for e in raw:
        src = e["source"]
        tgt = e["target"]
        # canonical order
        if src > tgt:
            src, tgt = tgt, src
        key = (src, tgt, e["type"])
        existing = best.get(key)
        if existing is None or e["weight"] > existing["weight"]:
            best[key] = {
                "source": src,
                "target": tgt,
                "type": e["type"],
                "weight": e["weight"],
                "treatyLevel": e.get("treatyLevel", 2),
            }
    return list(best.values())


def _fetch_all_sources() -> list[dict[str, Any]]:
    """Fetch all 8 sources in parallel using threads (all are blocking I/O)."""
    fetchers = [
        ("world_bank",   fetch_trade_edges),
        ("wto_rta",      fetch_rta_edges),
        ("ucdp",         fetch_conflict_edges),
        ("wikidata",     fetch_diplomatic_edges),
        ("cow_exchange", fetch_cow_edges),
        ("icb_project",  fetch_icb_edges),
        ("voeten_unga",  fetch_unga_edges),
    ]

    all_edges: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=7) as pool:
        futures = {pool.submit(fn): name for name, fn in fetchers}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                edges = fut.result()
                log.info("Source %-15s → %d edges", name, len(edges))
                all_edges.extend(edges)
            except Exception as exc:
                log.error("Source %s failed: %s", name, exc)

    return all_edges


def _compute_affinity_scores(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> None:
    """Update affinityScore on each node based on edge weights.

    Score = average weight of non-dispute edges (0–100 scale).
    Nodes with more high-weight cooperative ties score higher.
    """
    coop_weights: dict[str, list[float]] = {}
    for e in edges:
        if e["type"] != "dispute":
            for party in (e["source"], e["target"]):
                coop_weights.setdefault(party, []).append(e["weight"])

    for node in nodes:
        weights = coop_weights.get(node["id"], [])
        if weights:
            node["affinityScore"] = round(min(100.0, sum(weights) / len(weights) * 100), 1)


def build_graph(force_refresh: bool = False) -> dict[str, Any]:
    """Build and return the full graph {nodes, edges}.

    Results are cached for _GRAPH_TTL seconds. Pass force_refresh=True
    to bypass the merged-graph cache (individual source caches still apply).
    """
    if not force_refresh:
        cached = C.get(_GRAPH_CACHE_KEY)
        if cached:
            return cached

    log.info("Building diplomatic graph from all 8 sources…")
    raw_edges = _fetch_all_sources()
    edges = _merge_edges(raw_edges)

    # Collect all ISO-3 codes that appear in edges
    active = set()
    for e in edges:
        active.add(e["source"].removeprefix("c-"))
        active.add(e["target"].removeprefix("c-"))

    nodes = _build_nodes(active)
    _compute_affinity_scores(nodes, edges)

    result = {"nodes": nodes, "edges": edges}
    C.set(_GRAPH_CACHE_KEY, result, ttl=_GRAPH_TTL)
    log.info(
        "Graph built: %d nodes, %d edges (from %d raw)",
        len(nodes), len(edges), len(raw_edges),
    )
    return result
