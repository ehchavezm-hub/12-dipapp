"""Source 2: WTO RTA-IS — official Regional Trade Agreements.

Endpoint: https://rtais.wto.org/UI/PublicMaintainRTAHome.aspx (scraping not viable)
Public dataset: https://www.wto.org/english/tratop_e/region_e/rta_participation_map_e.htm
Using the WTO RTA API (JSON): https://rtais.wto.org/api/

Returns trade_agreement edges for all RTA memberships.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

_API_URL = "https://rtais.wto.org/api/allRTAs"

# ISO 3-letter to WTO member code mapping (WTO uses numeric ids + ISO-2)
_ISO2_TO_ISO3: dict[str, str] = {
    "US": "usa", "CN": "chn", "GB": "gbr", "DE": "deu", "FR": "fra",
    "JP": "jpn", "KR": "kor", "IN": "ind", "CA": "can", "IT": "ita",
    "NL": "nld", "AU": "aus", "BR": "bra", "RU": "rus", "MX": "mex",
    "ES": "esp", "SG": "sgp", "ZA": "zaf", "SA": "sau", "AE": "are",
    "TR": "tur", "ID": "idn", "PL": "pol", "AR": "arg", "CL": "chl",
    "CO": "col", "PE": "per", "EG": "egy", "TH": "tha", "MY": "mys",
    "PH": "phl", "VN": "vnm", "PK": "pak", "BD": "bgd", "UA": "ukr",
    "IR": "irn", "NG": "nga", "KE": "ken", "ET": "eth", "NZ": "nzl",
    "SE": "swe", "NO": "nor", "DK": "dnk", "FI": "fin", "AT": "aut",
    "CH": "che", "GR": "grc", "PT": "prt", "BE": "bel", "CZ": "cze",
    "SK": "svk", "HU": "hun", "RO": "rou", "HR": "hrv", "IL": "isr",
    "JO": "jor", "KW": "kwt", "QA": "qat", "OM": "omn", "LB": "lbn",
    "DZ": "dza", "MA": "mar", "TN": "tun", "GH": "gha", "CM": "cmr",
    "SN": "sen", "CI": "civ", "TZ": "tza", "MZ": "moz", "ZW": "zwe",
    "ZM": "zmb", "AO": "ago", "RW": "rwa", "UG": "uga",
    "MM": "mmr", "KH": "khm", "LA": "lao", "LK": "lka", "NP": "npl",
    "GT": "gtm", "HN": "hnd", "SV": "slv", "NI": "nic", "CR": "cri",
    "PA": "pan", "CU": "cub", "DO": "dom", "JM": "jam",
    "KZ": "kaz", "UZ": "uzb", "GE": "geo", "AZ": "aze", "AM": "arm",
    "BY": "blr", "MD": "mda", "RS": "srb", "BA": "bih", "MN": "mng",
}


def _iso2_to_iso3(code2: str) -> str | None:
    return _ISO2_TO_ISO3.get(code2.upper())


def fetch_rta_edges() -> list[dict[str, Any]]:
    """Fetch all active RTAs and return bilateral treaty edges."""
    cache_key = "wto_rta_all"
    cached = C.get(cache_key)
    if cached:
        return cached

    try:
        r = httpx.get(_API_URL, timeout=30, follow_redirects=True)
        r.raise_for_status()
        rtas = r.json()
    except Exception as exc:
        log.warning("WTO RTA API unavailable: %s", exc)
        return _fallback_known_rtas()

    # Group RTAs by id → collect member ISO-3 codes
    rta_members: dict[int, set[str]] = {}
    for entry in rtas:
        rta_id = entry.get("rtaId") or entry.get("RtaId")
        members_raw = entry.get("parties") or entry.get("Parties") or []
        iso3_set: set[str] = set()
        for m in members_raw:
            code2 = m.get("iso") or m.get("Iso") or ""
            iso3 = _iso2_to_iso3(code2)
            if iso3:
                iso3_set.add(iso3)
        if rta_id and len(iso3_set) >= 2:
            rta_members.setdefault(rta_id, set()).update(iso3_set)

    # Build edges for every pair within each RTA
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for members in rta_members.values():
        members_list = sorted(members)
        for i, a in enumerate(members_list):
            for b in members_list[i + 1:]:
                key = (a, b)
                if key in seen:
                    continue
                seen.add(key)
                edges.append({
                    "source": f"c-{a}",
                    "target": f"c-{b}",
                    "type": "trade_agreement",
                    "weight": 0.75,
                    "treatyLevel": 1,
                })

    if edges:
        C.set(cache_key, edges, ttl=C.API_TTL)
        return edges
    return _fallback_known_rtas()


def _fallback_known_rtas() -> list[dict[str, Any]]:
    """Hard-coded well-known RTAs when API is unreachable."""
    agreements = [
        # EU single market (27 members — subset listed)
        {"members": ["deu","fra","ita","esp","prt","nld","bel","pol","aut","swe","dnk","fin","grc","rou","hun","cze","hrv","svk"], "level": 1},
        # USMCA / NAFTA
        {"members": ["usa","can","mex"], "level": 1},
        # Mercosur
        {"members": ["bra","arg","ury","pry"], "level": 1},
        # ASEAN
        {"members": ["idn","tha","mys","phl","sgp","vnm","mmr","khm","lao","brn"], "level": 1},
        # AfCFTA major signatories
        {"members": ["nga","zaf","egy","eth","ken","dza","mar","gha","tza","cmr","civ","sen","ago","moz","zmb","zwe","rwa","uga","tun"], "level": 2},
        # CIS Free Trade Area
        {"members": ["rus","blr","kaz","ukr","arm","geo","mda","uzb"], "level": 2},
        # Pacific Alliance
        {"members": ["chl","col","per","mex"], "level": 1},
        # CPTPP
        {"members": ["jpn","can","aus","nzl","sgp","mys","vnm","chl","per","mex"], "level": 1},
        # RCEP
        {"members": ["chn","jpn","kor","aus","nzl","idn","tha","mys","phl","vnm","mmr","khm","lao"], "level": 1},
        # US bilateral FTAs
        {"members": ["usa","kor"], "level": 1},
        {"members": ["usa","aus"], "level": 1},
        {"members": ["usa","sgp"], "level": 1},
        {"members": ["usa","chl"], "level": 1},
        {"members": ["usa","col"], "level": 1},
        {"members": ["usa","per"], "level": 1},
        {"members": ["usa","isr"], "level": 1},
        {"members": ["usa","jor"], "level": 1},
        {"members": ["usa","mar"], "level": 1},
        # EU-Canada CETA
        {"members": ["deu","fra","ita","esp","prt","nld","bel","pol","aut","swe","dnk","fin","grc","rou","hun","cze","hrv","svk","can"], "level": 1},
    ]
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for ag in agreements:
        members = sorted(ag["members"])
        for i, a in enumerate(members):
            for b in members[i + 1:]:
                key = (a, b)
                if key in seen:
                    continue
                seen.add(key)
                edges.append({
                    "source": f"c-{a}",
                    "target": f"c-{b}",
                    "type": "trade_agreement",
                    "weight": 0.75,
                    "treatyLevel": ag["level"],
                })
    return edges
