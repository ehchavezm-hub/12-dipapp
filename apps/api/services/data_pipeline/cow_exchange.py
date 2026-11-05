"""Source 5: COW Diplomatic Exchange dataset (up to 2005) + Proxy.

Correlates of War project: https://correlatesofwar.org/data-sets/diplomatic-exchange/
Direct CSV download (v2006.1):
  https://correlatesofwar.org/wp-content/uploads/Diplomatic_Exchange_2006v1.csv

Also used as Source 6 proxy for national MFAs (no public APIs available).
Returns bilateral_treaty edges with weight based on diplomatic level.
"""
from __future__ import annotations

import csv
import io
import logging
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

_CSV_URL = (
    "https://correlatesofwar.org/wp-content/uploads/Diplomatic_Exchange_2006v1.csv"
)

# COW numeric codes → ISO-3
_COW_TO_ISO3: dict[int, str] = {
    2: "usa", 20: "can", 40: "cub", 42: "hti", 51: "dom", 52: "jam",
    70: "mex", 80: "bel", 90: "gtm", 91: "hnd", 92: "slv", 93: "nic",
    94: "cri", 95: "pan", 100: "col", 101: "ven", 110: "guy", 115: "sur",
    130: "ecu", 135: "per", 140: "bra", 145: "bol", 150: "pry", 155: "chl",
    160: "arg", 165: "ury", 200: "gbr", 205: "irl", 210: "nld", 211: "bel",
    212: "lux", 220: "fra", 225: "che", 230: "esp", 232: "and", 235: "prt",
    255: "deu", 260: "deu", 265: "deu", 290: "pol", 300: "aut", 305: "aut",
    310: "hun", 315: "cze", 316: "svk", 317: "hrv", 325: "ita", 338: "mlt",
    339: "alb", 340: "srb", 341: "mne", 345: "bih", 346: "mkd",
    349: "slv", 350: "grc", 352: "cyp", 355: "bul", 360: "rou", 365: "rus",
    366: "ukr", 367: "blr", 368: "mda", 369: "geo", 371: "arm", 372: "aze",
    375: "fin", 380: "swe", 385: "nor", 390: "dnk", 395: "isl",
    400: "mar", 402: "mrt", 403: "mli", 404: "sen", 411: "gha",
    420: "civ", 432: "bfa", 433: "nig", 434: "mli", 435: "gambia",
    436: "mrt", 437: "sen", 438: "gnb", 439: "gin", 450: "lbr",
    451: "sle", 452: "gnq", 461: "bfa", 471: "cmr", 475: "nga",
    481: "bdi", 482: "cog", 483: "ago", 484: "caf", 490: "cod",
    501: "eth", 510: "eth", 516: "bur", 517: "rwa", 520: "som",
    522: "dji", 530: "eth", 531: "eri", 540: "dza", 541: "mdg",
    551: "zmb", 552: "zwe", 553: "mwi", 560: "zaf", 565: "nam",
    570: "moz", 571: "swz", 572: "lso", 580: "mdg", 581: "com",
    600: "mar", 615: "dza", 616: "tun", 620: "lby", 625: "sdn",
    626: "ssd", 630: "irn", 640: "tur", 645: "irq", 651: "egy",
    652: "syr", 660: "lbn", 663: "jor", 666: "isr", 670: "sau",
    678: "yem", 690: "kwt", 694: "qat", 696: "bhr", 698: "omn",
    700: "afg", 701: "pak", 710: "chn", 712: "mng", 713: "twn",
    730: "kor", 731: "prk", 740: "jpn", 750: "ind", 760: "bhu",
    770: "pak", 771: "bgd", 775: "mmr", 780: "lka", 790: "npl",
    800: "tha", 811: "khm", 812: "lao", 816: "vnm", 820: "mys",
    830: "sgp", 835: "brn", 840: "phl", 850: "idn", 860: "tls",
    900: "aus", 920: "png", 940: "nzl",
}


def fetch_cow_edges() -> list[dict[str, Any]]:
    """Download COW Diplomatic Exchange CSV and return bilateral edges."""
    cache_key = "cow_diplomatic_exchange"
    cached = C.get(cache_key)
    if cached:
        return cached

    try:
        resp = httpx.get(_CSV_URL, timeout=40, follow_redirects=True)
        resp.raise_for_status()
        raw = resp.text
    except Exception as exc:
        log.warning("COW CSV download failed: %s", exc)
        return _fallback_cow_edges()

    # CSV columns: ccode1, ccode2, year, dr_at_1, dr_at_2, dip_quality, version
    # dr_at_1: diplomatic representation level at country1 from country2
    # Levels: 0=none, 1=chargé, 2=minister, 3=ambassador
    pair_max_level: dict[tuple[str, str], int] = {}
    reader = csv.DictReader(io.StringIO(raw))
    for row in reader:
        try:
            year = int(row.get("year", 0))
            if year < 1990:  # only recent years
                continue
            c1 = _COW_TO_ISO3.get(int(row["ccode1"]))
            c2 = _COW_TO_ISO3.get(int(row["ccode2"]))
            if not c1 or not c2 or c1 == c2:
                continue
            level = max(
                int(row.get("dr_at_1") or 0),
                int(row.get("dr_at_2") or 0),
            )
            if level == 0:
                continue
            key = (min(c1, c2), max(c1, c2))
            pair_max_level[key] = max(pair_max_level.get(key, 0), level)
        except (ValueError, KeyError):
            continue

    if not pair_max_level:
        return _fallback_cow_edges()

    edges: list[dict[str, Any]] = []
    for (a, b), level in pair_max_level.items():
        weight = {3: 0.8, 2: 0.6, 1: 0.4}.get(level, 0.3)
        edges.append({
            "source": f"c-{a}",
            "target": f"c-{b}",
            "type": "bilateral_treaty",
            "weight": weight,
            "treatyLevel": {3: 1, 2: 2, 1: 3}.get(level, 3),
        })

    C.set(cache_key, edges, ttl=C.STATIC_TTL)
    return edges


def _fallback_cow_edges() -> list[dict[str, Any]]:
    """Key diplomatic pairs when COW CSV is unreachable."""
    # Ambassador-level relations among major powers (level 3 = weight 0.8)
    ambassador_pairs = [
        ("usa","gbr"),("usa","fra"),("usa","deu"),("usa","jpn"),("usa","aus"),
        ("usa","can"),("usa","ind"),("usa","bra"),("usa","mex"),("usa","kor"),
        ("usa","isr"),("usa","sau"),("usa","are"),("usa","egy"),("usa","zaf"),
        ("usa","tur"),("usa","idn"),("usa","tha"),("usa","phl"),("usa","sgp"),
        ("usa","nzl"),("usa","pol"),("usa","ita"),("usa","esp"),("usa","prt"),
        ("usa","nld"),("usa","bel"),("usa","swe"),("usa","nor"),("usa","dnk"),
        ("usa","fin"),("usa","aut"),("usa","che"),("usa","grc"),("usa","chl"),
        ("usa","col"),("usa","per"),("usa","arg"),("usa","ury"),
        ("chn","rus"),("chn","pak"),("chn","ind"),("chn","deu"),("chn","fra"),
        ("chn","gbr"),("chn","jpn"),("chn","kor"),("chn","aus"),("chn","bra"),
        ("chn","zaf"),("chn","nga"),("chn","ken"),("chn","eth"),
        ("rus","deu"),("rus","fra"),("rus","gbr"),("rus","ind"),("rus","chn"),
        ("rus","tur"),("rus","irn"),("rus","bra"),("rus","zaf"),("rus","arg"),
        ("gbr","fra"),("gbr","deu"),("gbr","aus"),("gbr","can"),("gbr","ind"),
        ("gbr","jpn"),("gbr","bra"),("gbr","zaf"),("gbr","sau"),
        ("fra","deu"),("fra","ita"),("fra","esp"),("fra","bra"),("fra","mar"),
        ("fra","dza"),("fra","tun"),("fra","sen"),("fra","civ"),
        ("deu","jpn"),("deu","ind"),("deu","bra"),("deu","chn"),
        ("jpn","kor"),("jpn","aus"),("jpn","ind"),("jpn","bra"),
        ("ind","bra"),("ind","zaf"),("ind","tha"),("ind","mys"),
    ]
    return [
        {"source": f"c-{a}", "target": f"c-{b}",
         "type": "bilateral_treaty", "weight": 0.8, "treatyLevel": 1}
        for a, b in ambassador_pairs
    ]
