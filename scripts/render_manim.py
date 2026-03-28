#!/usr/bin/env python3
"""
=============================================================================
RODSCHINSON — Pipeline Vidéo — Étape B : Render Manim
=============================================================================

Lit le JSON script, rend chaque scène via Manim, produit les MP4.

USAGE :
    source ~/rodschinson-venv/bin/activate

    # Toutes les scènes
    python render_manim.py --script ../output/scripts/script_rod_cap_rate.json

    # Une seule scène (debug)
    python render_manim.py --script ... --scene 1 --quality l

    # Mode demo (5 scènes exemples, qualité 480p)
    python render_manim.py --demo --brand rodschinson

QUALITÉS :
    h = 1080p (production)
    m = 720p  (review)
    l = 480p  (dev rapide ~10x plus vite)

RÉSULTAT :
    output/scenes/scene_01_hook.mp4
    output/scenes/scene_02_definition.mp4
    ...
=============================================================================
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
SCENES_DIR = SCRIPT_DIR.parent / "manim_scenes"
OUTPUT_DIR = SCRIPT_DIR.parent / "output"
SCENES_OUT = OUTPUT_DIR / "scenes"
sys.path.insert(0, str(SCENES_DIR))
SCENES_OUT.mkdir(parents=True, exist_ok=True)

# ── Mapping type_visuel → (module, class) ────────────────────────────────────
SCENE_MAP = {
    "title_card":    ("scene_title_card",   "TitleCard"),
    "big_number":    ("scene_big_number",   "BigNumber"),
    "bar_chart":     ("scene_bar_chart",    "BarChart"),
    "process_steps": ("scene_process_steps","ProcessSteps"),
    "cta_screen":    ("scene_cta",          "CTAScreen"),
    "text_bullets":  ("scene_text_bullets", "TextBullets"),
    "split_screen":  ("scene_split_screen", "SplitScreen"),
}

QUALITY_FLAGS = {
    "h": ["--quality", "h", "--resolution", "1920,1080"],
    "m": ["--quality", "m", "--resolution", "1920,1080"],
    "l": ["--quality", "l", "--resolution", "1920,1080"],
}


def build_override_file(module: str, cls: str, scene: dict, tmp: Path):
    """Génère un fichier Python temporaire avec les params de la scène."""
    visuel = scene.get("visuel", {})
    nom    = scene.get("nom", f"s{scene.get('id',0)}").replace("-","_").replace(" ","_")
    cls_name = f"Scene_{nom}"

    ov = {}
    if cls == "TitleCard":
        ov = {
            "titre_principal": visuel.get("titre_principal", nom),
            "sous_titre":      visuel.get("sous_titre", ""),
            "eyebrow_text":    visuel.get("eyebrow", "Brussels · Dubai · Casablanca"),
            "scene_number":    f"0{scene.get('id',1)}",
        }
    elif cls == "BigNumber":
        ov = {
            "valeur":    str(visuel.get("valeur", "0")),
            "unite":     visuel.get("unite", ""),
            "eyebrow_t": visuel.get("eyebrow", ""),
            "contexte":  visuel.get("contexte", ""),
            "formule":   visuel.get("formule", ""),
            "animation": visuel.get("animation", "count_up"),
        }
    elif cls == "BarChart":
        ov = {
            "chart_titre": visuel.get("titre", nom),
            "series":      visuel.get("series", []),
            "unite":       visuel.get("unite", "%"),
            "source":      visuel.get("source", ""),
        }
    elif cls == "ProcessSteps":
        ov = {
            "titre":  visuel.get("titre", nom),
            "etapes": visuel.get("etapes", []),
            "active": visuel.get("active", 0),
        }
    elif cls == "CTAScreen":
        ov = {
            "eyebrow_t":  visuel.get("eyebrow", "Rodschinson Investment"),
            "headline":   visuel.get("headline", visuel.get("cta_text", "")),
            "headline_em":visuel.get("headline_em", ""),
            "cta_text":   visuel.get("cta_text", "Consultation Gratuite — 30 min"),
            "url":        visuel.get("url", "rodschinson.com"),
            "sous_cta":   visuel.get("sous_cta", ""),
        }

    lines = [
        f"import sys",
        f"sys.path.insert(0, r'{SCENES_DIR}')",
        f"from {module} import {cls} as _B",
        f"class {cls_name}(_B):",
    ]
    if ov:
        for k, v in ov.items():
            lines.append(f"    {k} = {repr(v)}")
    else:
        lines.append("    pass")

    fpath = tmp / f"{cls_name}.py"
    fpath.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return fpath, cls_name


def render_scene(scene: dict, quality: str, tmp: Path) -> Path | None:
    sid    = scene.get("id", 0)
    nom    = scene.get("nom", f"scene_{sid}")
    type_v = scene.get("type_visuel", "")
    duree  = scene.get("duree_sec", 0)

    if type_v not in SCENE_MAP:
        print(f"  ⚠️  [{sid:02d}] type '{type_v}' non supporté — ignoré")
        return None

    module, cls = SCENE_MAP[type_v]
    print(f"  [{sid:02d}] {nom:<26} [{type_v}]  {duree}s  ...", end=" ", flush=True)

    scene_file, cls_name = build_override_file(module, cls, scene, tmp)
    out_stem = f"scene_{sid:02d}_{nom.replace(' ','_')}"

    cmd = [
        "manim", str(scene_file), cls_name,
        *QUALITY_FLAGS[quality],
        "--output_file", out_stem,
        "--media_dir", str(OUTPUT_DIR),
        "--disable_caching",
        "--no_latex_cleanup",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print("❌")
        for line in result.stderr.split("\n"):
            if any(w in line for w in ["Error", "error", "Exception", "Traceback"]):
                print(f"     {line}")
        return None

    # Chercher le MP4
    for mp4 in OUTPUT_DIR.rglob("*.mp4"):
        if out_stem in mp4.stem or out_stem == mp4.stem:
            dest = SCENES_OUT / f"{out_stem}.mp4"
            if os.path.abspath(str(mp4)) != os.path.abspath(str(dest)): shutil.copy2(str(mp4), str(dest))
            print(f"✅ {dest.name}")
            return dest

    print("⚠️  MP4 introuvable")
    return None


def render_script(script_path: str, quality: str = "h", only_scene: int = None):
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    meta   = script["meta"]
    scenes = script["scenes"]

    print(f"\n{'═'*60}")
    print(f"  🎬  {meta.get('titre','')}")
    print(f"  Brand : {meta.get('brand')}  |  {meta.get('format')} {meta.get('ratio')}")
    print(f"  {len(scenes)} scènes  |  qualité {quality}  |  {meta.get('duree_totale_sec',0)}s")
    print(f"{'═'*60}\n")

    tmp = Path(tempfile.mkdtemp(prefix="rod_manim_"))
    rendered, errors = [], 0

    try:
        for s in scenes:
            if only_scene and s["id"] != only_scene:
                continue
            mp4 = render_scene(s, quality, tmp)
            if mp4:
                rendered.append(mp4)
            else:
                errors += 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"\n{'─'*60}")
    print(f"  ✅ {len(rendered)} scènes  |  ❌ {errors} erreur(s)")
    print(f"  📁 {SCENES_OUT}")
    print(f"\n  Étape suivante :")
    print(f"  python generate_audio.py --script {script_path}")
    return rendered


def main():
    parser = argparse.ArgumentParser(description="Rodschinson — Render Manim")
    parser.add_argument("--script",  help="Chemin JSON script")
    parser.add_argument("--scene",   type=int, help="Rendre une seule scène (ID)")
    parser.add_argument("--quality", choices=["h","m","l"], default="h")
    parser.add_argument("--demo",    action="store_true")
    parser.add_argument("--brand",   choices=["rodschinson","rachid"], default="rodschinson")
    args = parser.parse_args()

    if args.demo:
        # Chercher le dernier script demo généré
        scripts = sorted((OUTPUT_DIR / "scripts").glob("*.json"), key=lambda p: p.stat().st_mtime)
        if scripts:
            render_script(str(scripts[-1]), quality="l", only_scene=args.scene)
        else:
            print("❌ Aucun script trouvé — lancez d'abord :")
            print("   python generate_video_script.py --demo --brand rodschinson")
    elif args.script:
        render_script(args.script, quality=args.quality, only_scene=args.scene)
    else:
        parser.print_help()
        print("\n  Exemples :")
        print("  python render_manim.py --demo --quality l")
        print("  python render_manim.py --script ../output/scripts/script_rod_cap_rate.json")
        print("  python render_manim.py --script ... --scene 1 --quality l")


if __name__ == "__main__":
    main()
