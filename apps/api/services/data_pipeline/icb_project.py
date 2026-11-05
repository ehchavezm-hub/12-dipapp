"""Source 7: ICB Project — International Crisis Behavior.

Data: https://sites.duke.edu/icbdata/ (Duke/ICB)
CSV available via Harvard Dataverse:
  https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/NVBTAN

We fetch the ICB System-Level dyadic data (dyadic_v14.csv equivalent).
Returns dispute edges for each documented international crisis pair.
"""
from __future__ import annotations

import csv
import io
import logging
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

# ICB Dataverse persistent URL — system-level data CSV
_ICB_DYADIC_URL = (
    "https://dataverse.harvard.edu/api/access/datafile/"
    ":persistentId?persistentId=doi:10.7910/DVN/NVBTAN/BQJW0A"
)

# ICB uses COW codes — reuse the mapping from cow_exchange
# COW numeric → ISO-3 (abbreviated subset)
_COW_TO_ISO3: dict[int, str] = {
    2: "usa", 20: "can", 40: "cub", 70: "mex", 100: "col", 101: "ven",
    130: "ecu", 135: "per", 140: "bra", 145: "bol", 155: "chl", 160: "arg",
    200: "gbr", 210: "nld", 220: "fra", 230: "esp", 235: "prt", 255: "deu",
    290: "pol", 300: "aut", 310: "hun", 315: "cze", 325: "ita", 339: "alb",
    345: "bih", 350: "grc", 355: "bul", 360: "rou", 365: "rus", 366: "ukr",
    371: "arm", 372: "aze", 375: "fin", 380: "swe", 390: "dnk", 395: "isl",
    432: "bfa", 471: "cmr", 475: "nga", 490: "cod", 501: "eth", 520: "som",
    530: "eth", 531: "eri", 540: "dza", 560: "zaf", 580: "mdg", 600: "mar",
    615: "dza", 616: "tun", 620: "lby", 625: "sdn", 630: "irn", 640: "tur",
    645: "irq", 651: "egy", 652: "syr", 660: "lbn", 663: "jor", 666: "isr",
    670: "sau", 678: "yem", 690: "kwt", 700: "afg", 701: "pak", 710: "chn",
    730: "kor", 731: "prk", 740: "jpn", 750: "ind", 771: "bgd", 775: "mmr",
    816: "vnm", 820: "mys", 830: "sgp", 840: "phl", 850: "idn",
    900: "aus", 940: "nzl",
}


def fetch_icb_edges() -> list[dict[str, Any]]:
    """Fetch ICB dyadic crisis data and return dispute edges."""
    cache_key = "icb_project_crises"
    cached = C.get(cache_key)
    if cached:
        return cached

    try:
        resp = httpx.get(_ICB_DYADIC_URL, timeout=40, follow_redirects=True)
        resp.raise_for_status()
        raw = resp.text
    except Exception as exc:
        log.warning("ICB download failed: %s — using fallback", exc)
        return _fallback_icb_edges()

    pair_counts: dict[tuple[str, str], int] = {}
    reader = csv.DictReader(io.StringIO(raw))
    for row in reader:
        try:
            c1 = _COW_TO_ISO3.get(int(row.get("crisact") or row.get("actor1", 0)))
            c2 = _COW_TO_ISO3.get(int(row.get("crisact2") or row.get("actor2", 0)))
            if not c1 or not c2 or c1 == c2:
                continue
            key = (min(c1, c2), max(c1, c2))
            pair_counts[key] = pair_counts.get(key, 0) + 1
        except (ValueError, KeyError):
            continue

    if not pair_counts:
        return _fallback_icb_edges()

    max_count = max(pair_counts.values())
    edges = [
        {
            "source": f"c-{a}",
            "target": f"c-{b}",
            "type": "dispute",
            "weight": round(0.3 + 0.7 * (count / max_count), 4),
            "treatyLevel": 3,
        }
        for (a, b), count in pair_counts.items()
    ]
    C.set(cache_key, edges, ttl=C.STATIC_TTL)
    return edges


def _fallback_icb_edges() -> list[dict[str, Any]]:
    """Major historical international crises from ICB (1918–2010)."""
    crises = [
        ("usa", "rus", 0.9), ("usa", "chn", 0.7), ("usa", "irn", 0.7),
        ("usa", "irq", 0.7), ("usa", "prk", 0.6), ("usa", "cub", 0.5),
        ("usa", "vnm", 0.6), ("usa", "afg", 0.6),
        ("isr", "egy", 0.9), ("isr", "syr", 0.9), ("isr", "jor", 0.7),
        ("isr", "irn", 0.7), ("isr", "lbn", 0.7), ("isr", "irq", 0.7),
        ("ind", "pak", 0.9), ("ind", "chn", 0.7),
        ("chn", "kor", 0.6), ("chn", "vnm", 0.7), ("chn", "twn", 0.8),
        ("chn", "jpn", 0.5), ("chn", "phl", 0.4), ("chn", "mys", 0.4),
        ("kor", "prk", 0.9), ("jpn", "prk", 0.5),
        ("rus", "ukr", 1.0), ("rus", "geo", 0.8), ("rus", "mda", 0.5),
        ("tur", "grc", 0.7), ("tur", "cyp", 0.8),
        ("irn", "irq", 0.9), ("irn", "sau", 0.6),
        ("egy", "lby", 0.5), ("eth", "som", 0.7), ("eth", "eri", 0.8),
        ("aze", "arm", 0.9), ("sau", "yem", 0.8),
        ("sdn", "ssd", 0.7), ("sdn", "eth", 0.5),
    ]
    return [
        {"source": f"c-{a}", "target": f"c-{b}",
         "type": "dispute", "weight": w, "treatyLevel": 3}
        for a, b, w in crises
    ]
