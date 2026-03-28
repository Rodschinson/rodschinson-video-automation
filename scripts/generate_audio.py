#!/usr/bin/env python3
"""
=============================================================================
RODSCHINSON — Pipeline Vidéo — Étape C : Audio + Sous-titres
=============================================================================

1. Concatène les narrations de toutes les scènes
2. ElevenLabs → narration MP3 complète
3. Whisper → sous-titres SRT synchronisés

USAGE :
    python scripts/generate_audio.py \
        --script output/scripts/script_rod_cap_rate.json

    # Tester avec un court texte
    python scripts/generate_audio.py --demo
=============================================================================
"""

import os
import sys
import json
import argparse
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

ELEVENLABS_API_KEY      = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID     = (os.getenv("ELEVENLABS_VOICE_ID_RACHID") or
                           os.getenv("ELEVENLABS_VOICE_ID_STANDARD",
                                     "pNInz6obpgDQGcFmaJgB"))
ELEVENLABS_MODEL        = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
WHISPER_MODEL_SIZE      = os.getenv("WHISPER_MODEL", "medium")

OUTPUT_AUDIO    = ROOT / "output" / "audio"
OUTPUT_SUBTITLES= ROOT / "output" / "subtitles"
OUTPUT_AUDIO.mkdir(parents=True, exist_ok=True)
OUTPUT_SUBTITLES.mkdir(parents=True, exist_ok=True)


# ─── ELEVENLABS ───────────────────────────────────────────────────────────────

def generate_narration(text: str, output_path: Path,
                       voice_id: str = None,
                       stability: float = 0.5,
                       similarity: float = 0.8,
                       style: float = 0.2) -> bool:
    """
    Génère un fichier MP3 via ElevenLabs.
    Retourne True si succès.
    """
    vid = voice_id or ELEVENLABS_VOICE_ID

    if not ELEVENLABS_API_KEY:
        print("  ❌ ELEVENLABS_API_KEY manquant dans .env")
        return False

    print(f"  🎙️  ElevenLabs → {output_path.name}  ({len(text)} car)")

    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": ELEVENLABS_MODEL,
            "voice_settings": {
                "stability":        stability,
                "similarity_boost": similarity,
                "style":            style,
                "use_speaker_boost": True,
            },
        },
        timeout=60,
    )

    if resp.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(resp.content)
        size_kb = output_path.stat().st_size // 1024
        print(f"     ✅ Audio sauvegardé — {size_kb} KB")
        return True
    else:
        print(f"     ❌ ElevenLabs error {resp.status_code} : {resp.text[:150]}")
        return False


def generate_per_scene(scenes: list, slug: str) -> list:
    """
    Génère un MP3 par scène (pour synchronisation précise avec Manim).
    Retourne la liste des chemins audio dans l'ordre.
    """
    audio_paths = []

    for scene in scenes:
        sid      = scene.get("id", 0)
        nom      = scene.get("nom", f"scene_{sid}")
        narration= scene.get("narration", "").strip()

        if not narration:
            print(f"  ⚠️  Scène {sid} ({nom}) — narration vide, ignorée")
            audio_paths.append(None)
            continue

        out = OUTPUT_AUDIO / f"audio_{slug}_{sid:02d}_{nom}.mp3"

        if out.exists():
            print(f"  [{sid:02d}] {nom} — déjà généré, skip")
            audio_paths.append(out)
            continue

        success = generate_narration(narration, out)
        audio_paths.append(out if success else None)

        # Pause entre les appels pour éviter rate limiting
        time.sleep(0.5)

    return audio_paths


def generate_full_narration(scenes: list, slug: str) -> Path | None:
    """
    Génère un seul MP3 avec toutes les narrations concaténées.
    Une pause de 1.5s est insérée entre les scènes.
    """
    # Construire le texte complet avec pauses SSML
    parts = []
    for scene in scenes:
        narration = scene.get("narration", "").strip()
        if narration:
            parts.append(narration)

    # ElevenLabs ne supporte pas SSML complet — on utilise des points
    # pour créer des pauses naturelles entre les scènes
    full_text = " ... ".join(parts)

    out = OUTPUT_AUDIO / f"narration_{slug}_full.mp3"
    success = generate_narration(full_text, out)
    return out if success else None


# ─── WHISPER ──────────────────────────────────────────────────────────────────

def generate_subtitles(audio_path: Path, output_srt: Path,
                       language: str = "fr") -> bool:
    """
    Transcrit l'audio avec Whisper et génère un fichier SRT.
    """
    try:
        import whisper
    except ImportError:
        print("  ❌ Whisper non installé — pip install openai-whisper")
        return False

    print(f"  📝 Whisper → {output_srt.name}  (modèle: {WHISPER_MODEL_SIZE})")

    try:
        model  = whisper.load_model(WHISPER_MODEL_SIZE)
        result = model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=True,
            verbose=False,
        )

        srt_content = _segments_to_srt(result["segments"])

        with open(output_srt, "w", encoding="utf-8") as f:
            f.write(srt_content)

        n_segments = len(result["segments"])
        print(f"     ✅ {n_segments} segments — {output_srt.name}")
        return True

    except Exception as e:
        print(f"     ❌ Whisper error : {e}")
        return False


def _seconds_to_srt_time(seconds: float) -> str:
    """Convertit des secondes en format SRT HH:MM:SS,mmm."""
    h   = int(seconds // 3600)
    m   = int((seconds % 3600) // 60)
    s   = int(seconds % 60)
    ms  = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _segments_to_srt(segments: list) -> str:
    """Convertit les segments Whisper en format SRT."""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _seconds_to_srt_time(seg["start"])
        end   = _seconds_to_srt_time(seg["end"])
        text  = seg["text"].strip()
        lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)


# ─── PIPELINE COMPLET ────────────────────────────────────────────────────────

def process_script(script_path: str) -> dict:
    """
    Pipeline complet pour un script JSON :
    1. Génération audio par scène (ElevenLabs)
    2. Sous-titres complets (Whisper)
    Retourne un dict avec les chemins générés.
    """
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    meta   = script["meta"]
    scenes = script["scenes"]
    slug   = meta.get("id", "video").replace(" ", "_")
    lang   = meta.get("langue", "fr")

    print(f"\n{'═'*55}")
    print(f"  🎙️  AUDIO — {meta.get('titre','')[:45]}")
    print(f"  Scènes : {len(scenes)}  |  Langue : {lang}")
    print(f"{'═'*55}\n")

    # 1. Audio par scène
    print(f"  Génération audio par scène :\n")
    audio_paths = generate_per_scene(scenes, slug)

    # 2. Audio complet (concat texte)
    print(f"\n  Génération narration complète :\n")
    full_audio = generate_full_narration(scenes, slug)

    # 3. Sous-titres depuis l'audio complet
    srt_path = None
    if full_audio:
        print(f"\n  Génération sous-titres :\n")
        srt_path = OUTPUT_SUBTITLES / f"subtitles_{slug}.srt"
        generate_subtitles(full_audio, srt_path, language=lang)

    # Rapport
    success = sum(1 for p in audio_paths if p)
    print(f"\n{'─'*55}")
    print(f"  ✅ {success}/{len(scenes)} fichiers audio")
    if full_audio:
        print(f"  ✅ Narration complète : {full_audio.name}")
    if srt_path:
        print(f"  ✅ Sous-titres : {srt_path.name}")
    print(f"\n  Prochaine étape :")
    print(f"  python scripts/assemble_video.py --script {script_path}")

    return {
        "audio_scenes": audio_paths,
        "audio_full":   full_audio,
        "subtitles":    srt_path,
    }


# ─── DEMO ─────────────────────────────────────────────────────────────────────

def run_demo():
    """Test rapide avec un court texte."""
    print("\n🎭 Mode DEMO — test ElevenLabs\n")

    test_text = (
        "Bienvenue sur Rodschinson Investment. "
        "Nous accompagnons les investisseurs HNWI et family offices "
        "dans leurs opérations immobilières et M&A à travers l'Europe et le Golfe."
    )

    out = OUTPUT_AUDIO / "demo_narration.mp3"
    success = generate_narration(test_text, out)

    if success:
        print(f"\n  ✅ Audio de test généré : {out}")
        print(f"  Ouvrez le fichier pour écouter le résultat")

        # Test Whisper
        srt = OUTPUT_SUBTITLES / "demo_subtitles.srt"
        generate_subtitles(out, srt)
    else:
        print(f"\n  ❌ Échec — vérifiez ELEVENLABS_API_KEY dans .env")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Rodschinson — Génération Audio")
    parser.add_argument("--script", help="Chemin vers le JSON script")
    parser.add_argument("--demo",   action="store_true")
    parser.add_argument("--language", default="fr")
    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.script:
        process_script(args.script)
    else:
        parser.print_help()
        print("\n  Exemples :")
        print("  python scripts/generate_audio.py --demo")
        print("  python scripts/generate_audio.py --script output/scripts/script_rod_cap_rate.json")


if __name__ == "__main__":
    main()
