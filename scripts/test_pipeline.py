#!/usr/bin/env python3
"""
=============================================================================
RODSCHINSON — Test Pipeline End-to-End
=============================================================================

Lance le pipeline complet en mode demo pour valider toutes les étapes.

USAGE :
    python scripts/test_pipeline.py --demo
    python scripts/test_pipeline.py --demo --skip-audio   # sans ElevenLabs
    python scripts/test_pipeline.py --demo --scene 1      # une seule scène
=============================================================================
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

OK   = "\033[92m✅\033[0m"
FAIL = "\033[91m❌\033[0m"
SKIP = "\033[93m⏭️ \033[0m"


def run(cmd: list, label: str) -> bool:
    print(f"\n  {'─'*50}")
    print(f"  ▶  {label}")
    print(f"  {'─'*50}")
    result = subprocess.run(cmd, cwd=str(ROOT))
    if result.returncode == 0:
        print(f"\n  {OK} {label} — OK")
        return True
    else:
        print(f"\n  {FAIL} {label} — ÉCHEC")
        return False


def main():
    parser = argparse.ArgumentParser(description="Test Pipeline Rodschinson")
    parser.add_argument("--demo",        action="store_true")
    parser.add_argument("--skip-audio",  action="store_true",
                        help="Sauter ElevenLabs + Whisper")
    parser.add_argument("--skip-video",  action="store_true",
                        help="Sauter FFmpeg assemblage")
    parser.add_argument("--scene",       type=int, default=None,
                        help="Tester une seule scène Manim")
    parser.add_argument("--quality",     choices=["h","m","l"], default="l",
                        help="Qualité Manim (l=480p rapide)")
    parser.add_argument("--brand",       choices=["rodschinson","rachid"],
                        default="rodschinson")
    args = parser.parse_args()

    print(f"\n{'═'*55}")
    print(f"  RODSCHINSON — Test Pipeline End-to-End")
    print(f"  {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"{'═'*55}")

    results = {}
    script_path = None

    # ── ÉTAPE A : Génération script ─────────────────────────────────────
    cmd_a = [
        "python", "scripts/generate_video_script.py",
        "--demo", "--brand", args.brand, "--summary",
    ]
    ok = run(cmd_a, "Étape A — Génération script (demo)")
    results["A_script"] = ok

    if ok:
        # Trouver le script généré
        scripts = sorted(
            (ROOT / "output" / "scripts").glob("*.json"),
            key=lambda p: p.stat().st_mtime,
        )
        if scripts:
            script_path = scripts[-1]
            print(f"\n  Script : {script_path.name}")

    # ── ÉTAPE B : Rendu Manim ────────────────────────────────────────────
    if script_path:
        cmd_b = [
            "python", "scripts/render_manim.py",
            "--script", str(script_path),
            "--quality", args.quality,
        ]
        if args.scene:
            cmd_b += ["--scene", str(args.scene)]

        ok = run(cmd_b, f"Étape B — Rendu Manim (qualité {args.quality})")
        results["B_manim"] = ok
    else:
        print(f"\n  {SKIP} Étape B ignorée (pas de script)")
        results["B_manim"] = False

    # ── ÉTAPE C : Audio + Sous-titres ────────────────────────────────────
    if args.skip_audio:
        print(f"\n  {SKIP} Étape C ignorée (--skip-audio)")
        results["C_audio"] = None
    elif script_path:
        elevenlabs_key = os.getenv("ELEVENLABS_API_KEY","")
        if not elevenlabs_key:
            print(f"\n  {SKIP} Étape C ignorée (ELEVENLABS_API_KEY non configurée)")
            results["C_audio"] = None
        else:
            cmd_c = [
                "python", "scripts/generate_audio.py",
                "--script", str(script_path),
            ]
            ok = run(cmd_c, "Étape C — Audio ElevenLabs + Whisper")
            results["C_audio"] = ok

    # ── ÉTAPE D : Assemblage FFmpeg ──────────────────────────────────────
    if args.skip_video:
        print(f"\n  {SKIP} Étape D ignorée (--skip-video)")
        results["D_video"] = None
    elif script_path and results.get("B_manim"):
        cmd_d = [
            "python", "scripts/assemble_video.py",
            "--script", str(script_path),
        ]
        if not results.get("C_audio"):
            cmd_d.append("--no-subtitles")

        ok = run(cmd_d, "Étape D — Assemblage FFmpeg")
        results["D_video"] = ok
    else:
        print(f"\n  {SKIP} Étape D ignorée (Manim non complété)")
        results["D_video"] = None

    # ── RAPPORT ──────────────────────────────────────────────────────────
    print(f"\n{'═'*55}")
    print(f"  RÉSULTAT DU TEST")
    print(f"{'═'*55}")

    labels = {
        "A_script": "Étape A — Script Claude",
        "B_manim":  "Étape B — Rendu Manim",
        "C_audio":  "Étape C — Audio ElevenLabs",
        "D_video":  "Étape D — Assemblage FFmpeg",
    }

    for key, label in labels.items():
        val = results.get(key)
        if val is True:
            print(f"  {OK}  {label}")
        elif val is False:
            print(f"  {FAIL}  {label}")
        else:
            print(f"  {SKIP}  {label} — ignoré")

    success = all(v for v in results.values() if v is not None)

    if success:
        print(f"\n  🚀 Pipeline OK — vidéo dans output/video/")
    else:
        failed = [labels[k] for k, v in results.items() if v is False]
        print(f"\n  À corriger : {', '.join(failed)}")
        print(f"  Relancez : python scripts/setup_check.py")

    print()


if __name__ == "__main__":
    main()
