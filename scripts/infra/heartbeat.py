#!/usr/bin/env python3
"""Infra heartbeat + quarterly policy review for DipApp (stdlib only).

Modes
  heartbeat  Health-check backend (Render), frontend (Vercel), Upstash Redis
             (read-only DBSIZE, only if secrets exist) and TLS expiry; keep the
             scheduler alive by re-enabling this workflow via the REST API.
  review     Re-fetch provider docs and check that the inactivity/quota
             thresholds this setup relies on are still stated the same way.

Alerts: a GitHub issue labelled `infra-alert` (GitHub e-mails the repo owner)
plus a red workflow run. Recovery closes the issue. Secrets are never printed.
"""
from __future__ import annotations

import json
import os
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse

GH_API = os.environ.get("GITHUB_API_URL", "https://api.github.com")
REPO = os.environ.get("GITHUB_REPOSITORY", "")
GH_TOKEN = os.environ.get("GITHUB_TOKEN", "")
WORKFLOW_FILE = os.environ.get("WORKFLOW_FILE", "infra-heartbeat.yml")
RUN_URL = (
    f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{REPO}"
    f"/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
)
UA = "dipapp-infra-heartbeat"
ALERT_LABEL = "infra-alert"

RUNBOOK = "docs/infraestructura.md#runbook"
RESTORE = {
    "backend": (
        "Render → https://dashboard.render.com → servicio `dipapp-api` → Events/Logs. "
        "Si dice *suspended* por horas gratuitas agotadas: esperar al día 1 del mes o pasar a Starter. "
        "Si falló un deploy: *Manual Deploy → Deploy latest commit*."
    ),
    "frontend": (
        "Vercel → https://vercel.com/dashboard → proyecto → Usage. "
        "`503 DEPLOYMENT_PAUSED` = límite Hobby excedido (pausa ~30 días o pasar a Pro). "
        "Si es error de build: Deployments → *Redeploy* del último deploy sano."
    ),
    "upstash": (
        "Upstash → https://console.upstash.com → base de datos. "
        "Si fue archivada por inactividad: crear base nueva → *Restore* desde el backup de archivado "
        "y actualizar `UPSTASH_REDIS_REST_URL/TOKEN` en Render y en GitHub Secrets."
    ),
    "tls": "Certificados gestionados por el proveedor (Render/Vercel). Revisar dominio en el dashboard; abrir ticket si no se renueva.",
    "scheduler": "GitHub → Actions → *Infra heartbeat* → *Enable workflow*.",
}


# --------------------------------------------------------------------------- http
def http(method: str, url: str, *, headers: dict | None = None, body: dict | None = None,
         timeout: float = 30) -> tuple[int, str]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"User-Agent": UA, **(headers or {})})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(200_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(20_000).decode("utf-8", "replace")
    except Exception as e:  # network / timeout / DNS
        return 0, f"{type(e).__name__}: {e}"


def with_retries(fn, attempts: int = 4, first_wait: float = 10):
    """Run fn() -> (ok, detail) with exponential backoff; returns last result."""
    wait = first_wait
    ok, detail = False, "not run"
    for i in range(1, attempts + 1):
        ok, detail = fn()
        print(f"    attempt {i}/{attempts}: {'OK' if ok else 'FAIL'} — {detail}")
        if ok:
            break
        if i < attempts:
            time.sleep(wait)
            wait *= 2
    return ok, detail


def gh(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    code, text = http(method, f"{GH_API}{path}", body=body, headers={
        "Authorization": f"Bearer {GH_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        return code, json.loads(text) if text else None
    except json.JSONDecodeError:
        return code, text


# --------------------------------------------------------------------------- checks
def check_backend(base: str) -> tuple[str, str]:
    print(f"[backend] GET {base}/health (timeout 90s; Render free cold start ≈ 1 min)")

    def once():
        code, text = http("GET", f"{base}/health", timeout=90)
        ok = code == 200 and '"ok"' in text
        return ok, f"HTTP {code} {text[:120]!r}"

    ok, detail = with_retries(once)
    if not ok:
        return "fail", detail
    code, text = http("GET", f"{base}/health/config", timeout=30)
    if code == 200:
        try:
            cfg = json.loads(text)
            if not cfg.get("anthropic_key_set"):
                return "warn", f"{detail}; /health/config: ANTHROPIC_API_KEY no configurada"
        except json.JSONDecodeError:
            pass
    return "ok", detail


def discover_frontend() -> str:
    explicit = os.environ.get("FRONTEND_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    code, deps = gh("GET", f"/repos/{REPO}/deployments?environment=Production&per_page=5")
    if code == 200 and isinstance(deps, list):
        for d in deps:
            c, statuses = gh("GET", f"/repos/{REPO}/deployments/{d['id']}/statuses?per_page=5")
            if c == 200 and isinstance(statuses, list):
                for s in statuses:
                    if s.get("state") == "success" and s.get("environment_url"):
                        return s["environment_url"].rstrip("/")
    return "https://12-dipapp.vercel.app"  # verified 2026-11-08 (/login → 200)


def check_frontend(url: str) -> tuple[str, str]:
    if not url:
        return "skip", "URL de producción no encontrada (definir variable de repo FRONTEND_URL)"
    print(f"[frontend] GET {url}/login")

    def once():
        code, text = http("GET", f"{url}/login", timeout=30)
        paused = "DEPLOYMENT_PAUSED" in text or "DEPLOYMENT_DISABLED" in text
        ok = 200 <= code < 500 and code != 0 and not paused and code not in (402,)
        return ok, f"HTTP {code}{' DEPLOYMENT_PAUSED' if paused else ''}"

    ok, detail = with_retries(once, attempts=3)
    return ("ok" if ok else "fail"), detail


def check_upstash() -> tuple[str, str]:
    url = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")
    if not url or not token:
        return "skip", "secretos UPSTASH_REDIS_REST_URL/TOKEN no configurados en GitHub"
    print("[upstash] DBSIZE (solo lectura, llega a la base de datos)")

    def once():
        code, text = http("GET", f"{url}/dbsize", headers={"Authorization": f"Bearer {token}"}, timeout=20)
        return code == 200 and '"result"' in text, f"HTTP {code}"

    ok, detail = with_retries(once, attempts=3, first_wait=5)
    return ("ok" if ok else "fail"), detail


def tls_days_left(host: str) -> int:
    ctx = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=15) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as s:
            not_after = s.getpeercert()["notAfter"]
    exp = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    return (exp - datetime.now(timezone.utc)).days


def check_tls(urls: list[str]) -> tuple[str, str]:
    notes, status = [], "ok"
    for u in urls:
        host = urlparse(u).hostname
        if not host:
            continue
        try:
            days = tls_days_left(host)
            notes.append(f"{host}: {days} d")
            if days < 30:
                status = "warn"
        except Exception as e:
            notes.append(f"{host}: error {type(e).__name__}")
            status = "warn" if status == "ok" else status
    return status, "; ".join(notes) or "sin hosts"


def keep_scheduler_alive() -> tuple[str, str]:
    """PUT .../enable on this workflow: no-op when enabled, resets the
    60-day inactivity auto-disable without filler commits."""
    code, _ = gh("PUT", f"/repos/{REPO}/actions/workflows/{WORKFLOW_FILE}/enable")
    return ("ok", f"enable → HTTP {code}") if code == 204 else ("warn", f"enable → HTTP {code}")


# --------------------------------------------------------------------------- alerts
def open_alert_issue(title_key: str) -> dict | None:
    code, issues = gh("GET", f"/repos/{REPO}/issues?labels={ALERT_LABEL}&state=open&per_page=50")
    if code != 200 or not isinstance(issues, list):
        return None
    return next((i for i in issues if i["title"].startswith(title_key)), None)


def raise_alert(component: str, status: str, detail: str) -> None:
    key = f"🚨 Infra alert: {component}"
    body = (
        f"**Estado:** `{status}`\n\n**Detalle:** {detail}\n\n**Restaurar:** {RESTORE.get(component, '')}\n\n"
        f"Runbook: https://github.com/{REPO}/blob/HEAD/{RUNBOOK} · Ejecución: {RUN_URL}\n\n"
        f"_Detectado {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC por el workflow Infra heartbeat._"
    )
    existing = open_alert_issue(key)
    if existing:
        code, _ = gh("POST", f"/repos/{REPO}/issues/{existing['number']}/comments", {"body": body})
        print(f"    alerta: comentario en issue #{existing['number']} (HTTP {code})")
    else:
        code, res = gh("POST", f"/repos/{REPO}/issues", {"title": key, "body": body, "labels": [ALERT_LABEL]})
        num = res.get("html_url") if isinstance(res, dict) else res
        print(f"    alerta: issue creado {num} (HTTP {code})")


def resolve_alert(component: str) -> None:
    existing = open_alert_issue(f"🚨 Infra alert: {component}")
    if existing:
        gh("POST", f"/repos/{REPO}/issues/{existing['number']}/comments",
           {"body": f"✅ Recuperado. Verificado en {RUN_URL}"})
        gh("PATCH", f"/repos/{REPO}/issues/{existing['number']}", {"state": "closed", "state_reason": "completed"})
        print(f"    alerta #{existing['number']} cerrada (recuperado)")


# --------------------------------------------------------------------------- modes
def heartbeat() -> int:
    backend = os.environ.get("BACKEND_URL", "").strip().rstrip("/") or "https://dipapp-api.onrender.com"
    frontend = discover_frontend()
    results = {
        "backend": check_backend(backend),
        "frontend": check_frontend(frontend),
        "upstash": check_upstash(),
        "tls": check_tls([backend, frontend]),
        "scheduler": keep_scheduler_alive(),
    }
    failed = False
    summary = ["| Componente | Estado | Detalle |", "|---|---|---|"]
    for comp, (status, detail) in results.items():
        print(f"==> {comp}: {status.upper()} — {detail}")
        summary.append(f"| {comp} | {status} | {detail.replace('|', '/')} |")
        if status in ("fail", "warn"):
            raise_alert(comp, status, detail)
            failed = failed or status == "fail"
        elif status == "ok":
            resolve_alert(comp)
    _summary("## Infra heartbeat\n\n" + "\n".join(summary))
    return 1 if failed else 0


# Each entry: (name, url, phrases that must all still appear on the page)
POLICIES = [
    ("Render free: spin-down 15 min / 750 h", "https://render.com/docs/free", ["15 minutes", "750"]),
    ("GitHub Actions: auto-disable 60 días", "https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows", ["60 days"]),
    ("Upstash free: archivado ≥30 días", "https://upstash.com/docs/redis/help/faq", ["30 days"]),
    ("Vercel Hobby: límites y pausa", "https://vercel.com/docs/plans/hobby", ["100 GB", "30 days"]),
]


def review() -> int:
    rows, changed = ["| Política | Estado | Detalle |", "|---|---|---|"], []
    for name, url, phrases in POLICIES:
        code, text = http("GET", f"{url}/login", timeout=30)
        missing = [p for p in phrases if p not in text]
        st = "sin cambios" if code == 200 and not missing else "REVISAR"
        detail = f"HTTP {code}" + (f"; falta: {', '.join(missing)}" if missing else "")
        print(f"[review] {name}: {st} — {detail}")
        rows.append(f"| [{name}]({url}) | {st} | {detail} |")
        if st != "sin cambios":
            changed.append(name)
    table = "\n".join(rows)
    _summary("## Revisión trimestral de políticas\n\n" + table)
    title = f"🗓️ Revisión trimestral de infraestructura {datetime.now(timezone.utc):%Y-%m}"
    body = (
        f"{'⚠️ **Posibles cambios de política:** ' + ', '.join(changed) if changed else '✅ Umbrales sin cambios detectados.'}\n\n"
        f"{table}\n\nChecklist manual (cuotas que requieren login):\n"
        "- [ ] Render → Billing: horas gratuitas usadas este mes\n- [ ] Vercel → Usage: % de cada métrica Hobby\n"
        "- [ ] Anthropic / OpenAI → saldo de créditos y límites\n- [ ] Actualizar `docs/infraestructura.md` si algo cambió\n\n"
        f"Ejecución: {RUN_URL}"
    )
    code, res = gh("POST", f"/repos/{REPO}/issues", {"title": title, "body": body, "labels": [ALERT_LABEL] if changed else []})
    print(f"[review] issue: {res.get('html_url') if isinstance(res, dict) else res} (HTTP {code})")
    return 1 if changed else 0


def _summary(md: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(md + "\n")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "heartbeat"
    sys.exit(review() if mode == "review" else heartbeat())
