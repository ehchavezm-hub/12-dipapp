"""Source 8: Voeten UNGA Voting Dataset.

Erik Voeten, Anton Strezhnev, Michael Bailey — Harvard Dataverse
DOI: https://doi.org/10.7910/DVN/LEJUQZ

We fetch the ideal-point estimates CSV (UNVotes_updated.csv) which contains
country ideal points per session. We compute pairwise cosine similarity
between ideal-point vectors to generate un_vote_alignment edges.

Fallback: use regional/political alignment as proxy.
"""
from __future__ import annotations

import csv
import io
import logging
import math
from typing import Any

import httpx

from . import cache as C
from .country_meta import ALL_CODES

log = logging.getLogger(__name__)

# Harvard Dataverse direct file access
_VOETEN_URL = (
    "https://dataverse.harvard.edu/api/access/datafile/"
    ":persistentId?persistentId=doi:10.7910/DVN/LEJUQZ/MPT5TH"
)

# Voeten COW codes → ISO-3 (key subset)
_COW_TO_ISO3: dict[int, str] = {
    2: "usa", 20: "can", 40: "cub", 70: "mex", 100: "col", 101: "ven",
    110: "guy", 115: "sur", 130: "ecu", 135: "per", 140: "bra", 145: "bol",
    150: "pry", 155: "chl", 160: "arg", 165: "ury",
    200: "gbr", 210: "nld", 211: "bel", 220: "fra", 230: "esp", 235: "prt",
    255: "deu", 290: "pol", 300: "aut", 310: "hun", 315: "cze", 316: "svk",
    325: "ita", 338: "mlt", 350: "grc", 355: "bul", 360: "rou", 365: "rus",
    366: "ukr", 367: "blr", 371: "arm", 372: "aze", 375: "fin", 380: "swe",
    385: "nor", 390: "dnk", 395: "isl",
    432: "bfa", 433: "nig", 471: "cmr", 475: "nga", 482: "cog", 483: "ago",
    501: "eth", 510: "eth", 516: "bur", 517: "rwa", 520: "som", 530: "eth",
    540: "dza", 551: "zmb", 552: "zwe", 560: "zaf", 570: "moz", 580: "mdg",
    600: "mar", 615: "dza", 616: "tun", 620: "lby", 625: "sdn",
    630: "irn", 640: "tur", 645: "irq", 651: "egy", 652: "syr",
    660: "lbn", 663: "jor", 666: "isr", 670: "sau", 678: "yem",
    690: "kwt", 694: "qat", 698: "omn",
    700: "afg", 701: "pak", 710: "chn", 712: "mng", 730: "kor", 731: "prk",
    740: "jpn", 750: "ind", 771: "bgd", 775: "mmr", 780: "lka",
    800: "tha", 811: "khm", 816: "vnm", 820: "mys", 830: "sgp", 840: "phl",
    850: "idn", 900: "aus", 940: "nzl",
}


def fetch_unga_edges() -> list[dict[str, Any]]:
    """Fetch Voeten UNGA ideal points and compute pairwise alignment."""
    cache_key = "voeten_unga_alignment"
    cached = C.get(cache_key)
    if cached:
        return cached

    # Ideal points keyed by ISO-3 → list of session ideal_points
    ideal_points: dict[str, list[float]] = {}

    try:
        resp = httpx.get(_VOETEN_URL, timeout=60, follow_redirects=True)
        resp.raise_for_status()
        raw = resp.text
        reader = csv.DictReader(io.StringIO(raw))
        # Columns: ccode, session, idealpoint, ...
        for row in reader:
            try:
                ccode = int(row.get("ccode") or row.get("CountryCode") or 0)
                iso3 = _COW_TO_ISO3.get(ccode)
                if not iso3:
                    continue
                ip_str = row.get("idealpoint") or row.get("IdealPoint") or ""
                if ip_str and ip_str.lower() not in ("na", "", "nan"):
                    ideal_points.setdefault(iso3, []).append(float(ip_str))
            except (ValueError, KeyError):
                continue
    except Exception as exc:
        log.warning("Voeten dataset failed: %s — using proxy", exc)
        return _proxy_unga_edges()

    if len(ideal_points) < 10:
        return _proxy_unga_edges()

    # Compute mean ideal point per country
    means: dict[str, float] = {iso3: sum(pts) / len(pts)
                                for iso3, pts in ideal_points.items()
                                if pts}

    # Pairwise alignment: similarity = 1 - |ip_a - ip_b| / max_range
    all_vals = list(means.values())
    val_range = max(all_vals) - min(all_vals) if all_vals else 1

    seen: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []
    countries = sorted(means.keys())
    for i, a in enumerate(countries):
        for b in countries[i + 1:]:
            diff = abs(means[a] - means[b])
            similarity = 1.0 - (diff / val_range) if val_range > 0 else 0.5
            if similarity < 0.3:  # too divergent — not aligned
                continue
            key = (min(a, b), max(a, b))
            if key in seen:
                continue
            seen.add(key)
            edges.append({
                "source": f"c-{a}",
                "target": f"c-{b}",
                "type": "un_vote_alignment",
                "weight": round(similarity, 4),
                "treatyLevel": 2,
            })

    if edges:
        C.set(cache_key, edges, ttl=C.STATIC_TTL)
        return edges
    return _proxy_unga_edges()


def _proxy_unga_edges() -> list[dict[str, Any]]:
    """Known UNGA voting blocs as proxy when dataset is unavailable."""
    # Western liberal bloc — tend to vote together
    western = ["usa","can","gbr","fra","deu","ita","jpn","aus","nzl",
                "kor","isr","pol","swe","nor","dnk","fin","nld","bel",
                "aut","che","esp","prt","grc"]
    # Global South / Non-Aligned Movement — high internal coherence
    nam = ["ind","bra","zaf","idn","nga","ken","eth","dza","mar","egy",
           "mys","tha","phl","arg","col","per","chl","ury","ecu","bol",
           "pry","cri","pan","gtm","hnd","dom","jam","cub","ven",
           "gha","civ","sen","cmr","tza","moz","zmb","zwe","ago","rwa","uga"]
    # Russia-aligned
    russia = ["rus","chn","blr","kaz","uzb","aze","arm","geo","srb"]
    # China-aligned
    china = ["chn","pak","mys","mmr","khm","lao","prk","irn","zwe",
             "cod","ago","nga","eth","ken","dza","egy"]

    seen: set[tuple[str, str]] = set()
    edges: list[dict[str, Any]] = []

    def add_bloc(members: list[str], weight: float) -> None:
        for i, a in enumerate(members):
            for b in members[i + 1:]:
                key = (min(a, b), max(a, b))
                if key in seen:
                    return
                seen.add(key)
                edges.append({
                    "source": f"c-{a}",
                    "target": f"c-{b}",
                    "type": "un_vote_alignment",
                    "weight": weight,
                    "treatyLevel": 2,
                })

    add_bloc(western, 0.80)
    add_bloc(nam, 0.65)
    add_bloc(russia, 0.75)
    add_bloc(china, 0.70)
    return edges
