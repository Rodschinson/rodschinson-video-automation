#!/usr/bin/env python3
"""
RODSCHINSON — Setup Check
Tests all API connections for the Puppeteer video pipeline.

USAGE:
    python scripts/setup_check.py
    python scripts/setup_check.py --only anthropic
    python scripts/setup_check.py --only sheets
    python scripts/setup_check.py --only elevenlabs
    python scripts/setup_check.py --only odoo
    python scripts/setup_check.py --only metricool
    python scripts/setup_check.py --only puppeteer
    python scripts/setup_check.py --only ffmpeg
"""

import os, sys, json, argparse, subprocess, requests
from pathlib import Path

try:
    from dotenv import load_dotenv
    ROOT = Path(__file__).parent.parent
    load_dotenv(ROOT / ".env")
except Exception:
    ROOT = Path.cwd()

OK   = "\033[92m✅\033[0m"
FAIL = "\033[91m❌\033[0m"
WARN = "\033[93m⚠️ \033[0m"
INFO = "\033[94mℹ️ \033[0m"

def sep(title):  print(f"\n{'─'*52}\n  {title}\n{'─'*52}")
def ok(m):       print(f"  {OK}  {m}")
def fail(m):     print(f"  {FAIL}  {m}")
def warn(m):     print(f"  {WARN} {m}")
def info(m):     print(f"  {INFO} {m}")


# ── ANTHROPIC ─────────────────────────────────────────────────────────────────

def test_anthropic() -> bool:
    sep("Anthropic (Claude API)")
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        fail("ANTHROPIC_API_KEY manquante dans .env")
        info("→ console.anthropic.com/settings/keys")
        return False
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": "Reply: OK"}]
        )
        ok(f"Connecté — {msg.content[0].text.strip()}")
        ok(f"Modèle : claude-sonnet-4-20250514")
        return True
    except Exception as e:
        fail(str(e))
        return False


# ── GOOGLE SHEETS ─────────────────────────────────────────────────────────────

def test_sheets() -> bool:
    sep("Google Sheets")
    sa_path = ROOT / os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "service_account.json")
    if not sa_path.exists():
        fail(f"service_account.json introuvable : {sa_path}")
        info("1. console.cloud.google.com → Créer projet")
        info("2. Activer Sheets API + Drive API")
        info("3. IAM → Comptes de service → Créer → Télécharger JSON")
        info(f"4. Placer ici : {sa_path}")
        return False
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        creds = Credentials.from_service_account_file(str(sa_path),
            scopes=["https://spreadsheets.google.com/feeds",
                    "https://www.googleapis.com/auth/drive"])
        client = gspread.authorize(creds)
        with open(sa_path) as f:
            email = json.load(f).get("client_email", "?")
        ok(f"Service account : {email}")
        for name, env_key in [("Rodschinson", "SHEET_ID_RODSCHINSON"), ("Rachid", "SHEET_ID_RACHID")]:
            sid = os.getenv(env_key, "")
            if not sid:
                warn(f"{env_key} manquant dans .env")
                continue
            try:
                sh = client.open_by_key(sid)
                tabs = [w.title for w in sh.worksheets()]
                ok(f"Sheet {name} : {sh.title}")
                ok(f"  Onglets : {tabs}")
            except Exception as e:
                fail(f"Sheet {name} inaccessible : {e}")
                info(f"  Partagez le Sheet avec : {email}")
        return True
    except Exception as e:
        fail(str(e))
        return False


# ── ELEVENLABS ────────────────────────────────────────────────────────────────

def test_elevenlabs() -> bool:
    sep("ElevenLabs (Audio)")
    key = os.getenv("ELEVENLABS_API_KEY", "")
    if not key:
        fail("ELEVENLABS_API_KEY manquante")
        info("→ elevenlabs.io → Profile → API Keys")
        return False
    try:
        r = requests.get("https://api.elevenlabs.io/v1/user",
                         headers={"xi-api-key": key}, timeout=10)
        if r.status_code == 200:
            sub  = r.json().get("subscription", {})
            used = sub.get("character_count", 0)
            lim  = sub.get("character_limit", 0)
            ok(f"Connecté — {used:,} / {lim:,} caractères")
            # Check voice IDs
            for env, label in [
                ("ELEVENLABS_VOICE_ID_STANDARD", "Rodschinson"),
                ("ELEVENLABS_VOICE_ID_RACHID",   "Rachid"),
            ]:
                vid = os.getenv(env, "")
                if vid:
                    vr = requests.get(f"https://api.elevenlabs.io/v1/voices/{vid}",
                                      headers={"xi-api-key": key}, timeout=10)
                    if vr.status_code == 200:
                        ok(f"Voice {label} : {vr.json().get('name', vid)}")
                    else:
                        warn(f"Voice {label} ({vid}) introuvable")
                else:
                    warn(f"{env} non configuré")
            return True
        fail(f"API error {r.status_code} : {r.text[:100]}")
        return False
    except Exception as e:
        fail(str(e))
        return False


# ── ODOO ──────────────────────────────────────────────────────────────────────

def test_odoo() -> bool:
    sep("Odoo CRM")
    url  = os.getenv("ODOO_URL",  "")
    db   = os.getenv("ODOO_DB",   "")
    user = os.getenv("ODOO_USER", "")
    key  = os.getenv("ODOO_API_KEY", "")
    missing = [n for n, v in [("ODOO_URL",url),("ODOO_DB",db),
                               ("ODOO_USER",user),("ODOO_API_KEY",key)] if not v]
    if missing:
        fail(f"Variables manquantes : {', '.join(missing)}")
        return False
    try:
        import xmlrpc.client
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        uid = common.authenticate(db, user, key, {})
        if uid:
            models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
            count  = models.execute_kw(db, uid, key, "res.partner", "search_count", [[]])
            ok(f"Connecté — UID: {uid}  |  {count:,} contacts")
            return True
        fail("Authentification échouée")
        return False
    except Exception as e:
        fail(str(e))
        return False


# ── METRICOOL ─────────────────────────────────────────────────────────────────

def test_metricool() -> bool:
    sep("Metricool (Scheduling)")
    token = os.getenv("METRICOOL_API_TOKEN", "")
    if not token:
        fail("METRICOOL_API_TOKEN manquant")
        info("→ app.metricool.com → Paramètres → API")
        return False
    try:
        r = requests.get(
            "https://app.metricool.com/api/v2/analytics/blogs",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if r.status_code == 200:
            blogs = r.json()
            ok(f"Connecté — {len(blogs)} compte(s)")
            for b in blogs:
                print(f"     • {b.get('type',''):<12} {b.get('name',''):<30} ID: {b.get('id','')}")
            return True
        fail(f"API error {r.status_code} : {r.text[:150]}")
        return False
    except Exception as e:
        fail(str(e))
        return False


# ── PUPPETEER ────────────────────────────────────────────────────────────────

def test_puppeteer() -> bool:
    sep("Puppeteer (Video Renderer)")
    pdir     = ROOT / "puppeteer"
    renderer = pdir / "renderer.js"

    if not renderer.exists():
        fail(f"renderer.js introuvable : {renderer}")
        return False

    # Node.js
    r = subprocess.run(["node", "--version"], capture_output=True, text=True)
    if r.returncode != 0:
        fail("Node.js introuvable — brew install node")
        return False
    ok(f"Node.js {r.stdout.strip()}")

    # Puppeteer module
    nm = pdir / "node_modules" / "puppeteer"
    if not nm.exists():
        fail("Puppeteer non installé")
        info(f"  cd {pdir} && npm install")
        return False
    ok("Puppeteer installé")

    # Templates
    templates = ["rodschinson_premium", "news_reel", "tech_data", "corporate_minimal"]
    for t in templates:
        tmpl = pdir / "templates" / f"{t}.html"
        if tmpl.exists():
            ok(f"Template : {t}")
        else:
            warn(f"Template manquant : {t}.html")

    return True


# ── FFMPEG ────────────────────────────────────────────────────────────────────

def test_ffmpeg() -> bool:
    sep("FFmpeg (Video Assembly)")
    r = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    if r.returncode == 0:
        ok(r.stdout.split("\n")[0][:70])
        return True
    fail("FFmpeg introuvable — brew install ffmpeg")
    return False


# ── WHISPER ───────────────────────────────────────────────────────────────────

def test_whisper() -> bool:
    sep("Whisper (Subtitles)")
    try:
        import whisper
        model = os.getenv("WHISPER_MODEL", "medium")
        ok(f"Whisper installé — modèle : {model}")
        info("Premier lancement = téléchargement du modèle (~1-5 Go)")
        return True
    except ImportError:
        fail("Whisper non installé — pip install openai-whisper")
        return False


# ── TEAMS ─────────────────────────────────────────────────────────────────────

def test_teams() -> bool:
    sep("Microsoft Teams (Notifications)")
    url = os.getenv("TEAMS_WEBHOOK_URL", "")
    if not url:
        warn("TEAMS_WEBHOOK_URL non configuré — notifications désactivées")
        info("Teams → Canal → ... → Connectors → Incoming Webhook")
        return True  # Optional — don't block setup
    try:
        payload = {
            "@type":    "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary":  "Test Rodschinson",
            "themeColor": "08316F",
            "sections": [{"activityTitle": "✅ Rodschinson — Connexion Teams OK"}]
        }
        r = requests.post(url, json=payload, timeout=10)
        if r.status_code in [200, 202]:
            ok("Webhook Teams opérationnel")
            return True
        fail(f"Teams error {r.status_code}")
        return False
    except Exception as e:
        fail(str(e))
        return False


# ── REPORT ────────────────────────────────────────────────────────────────────

def print_report(results: dict):
    print(f"\n{'═'*52}\n  RAPPORT FINAL\n{'═'*52}")
    for k, v in results.items():
        icon = "✅" if v else "❌"
        print(f"  {icon}  {k}")
    ready = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\n  {ready}/{total} services opérationnels")
    if ready == total:
        print(f"\n  🚀 Tout est prêt — lancez le pipeline !")
        print(f"  python scripts/generate_video_script.py --demo --brand rodschinson --summary")
    else:
        failed = [k for k, v in results.items() if not v]
        print(f"\n  À configurer : {', '.join(failed)}")
        print(f"  Éditez .env puis relancez : python scripts/setup_check.py")
    print()


# ── MAIN ──────────────────────────────────────────────────────────────────────

ALL_TESTS = {
    "anthropic":  test_anthropic,
    "sheets":     test_sheets,
    "elevenlabs": test_elevenlabs,
    "odoo":       test_odoo,
    "metricool":  test_metricool,
    "puppeteer":  test_puppeteer,
    "ffmpeg":     test_ffmpeg,
    "whisper":    test_whisper,
    "teams":      test_teams,
}

def main():
    parser = argparse.ArgumentParser(description="Rodschinson — Setup Check")
    parser.add_argument("--only", default="all",
                        choices=["all"] + list(ALL_TESTS.keys()))
    args = parser.parse_args()

    print(f"\n{'═'*52}")
    print(f"  RODSCHINSON — Setup & Connexions")
    print(f"  Projet : {ROOT}")
    print(f"  Python : {sys.version.split()[0]}")
    print(f"{'═'*52}")

    tests = ALL_TESTS if args.only == "all" else {args.only: ALL_TESTS[args.only]}
    results = {}

    for name, fn in tests.items():
        try:
            results[name] = fn()
        except Exception as e:
            fail(f"Erreur inattendue [{name}] : {e}")
            results[name] = False

    if args.only == "all":
        print_report(results)

if __name__ == "__main__":
    main()
