#!/usr/bin/env python3
"""Generate Mare Nostrum full soundtrack using MusicGen-small on Apple Silicon."""
import os
import time
import json
import torch
import numpy as np
import scipy.io.wavfile
from transformers import AutoProcessor, MusicgenForConditionalGeneration

OUTPUT_DIR = "/Users/ioio/mare-nostrum/sounds"

TRACKS = {
    "music_menu": {
        "prompt": "epic cinematic ancient Roman orchestral theme, brass fanfare, war drums, heroic melody, grand and majestic, instrumental, film score",
        "duration": 60,
    },
    "music_peaceful": {
        "prompt": "gentle ancient lyre solo melody, Mediterranean breeze, peaceful pastoral, warm sunlight, relaxing ambient, instrumental",
        "duration": 60,
    },
    "music_peaceful_2": {
        "prompt": "soft ancient cithara plucking, olive grove ambiance, gentle wind, calm sea, contemplative Roman garden, instrumental, ambient",
        "duration": 60,
    },
    "music_night": {
        "prompt": "mysterious soft lyre melody, night ambient, ancient Roman evening, contemplative, minor key, slow tempo, instrumental, dark ambient",
        "duration": 60,
    },
    "music_combat": {
        "prompt": "intense ancient war drums, battle tension, Roman legion marching, aggressive percussion, bronze horns, fast tempo, instrumental, action",
        "duration": 45,
    },
    "music_combat_epic": {
        "prompt": "epic ancient battle music, war horns blaring, choir chanting, Roman triumph, climactic orchestral, instrumental, epic trailer",
        "duration": 45,
    },
    "music_sailing": {
        "prompt": "adventurous Mediterranean sailing theme, wind in sails, flute melody, gentle waves, exploration, hopeful journey, instrumental, adventure",
        "duration": 60,
    },
    "music_temple": {
        "prompt": "sacred ancient temple ambient, echoing choral voices, reverberant hymn, mysterious sacred, stone halls, instrumental, ethereal choir",
        "duration": 60,
    },
    "music_festival": {
        "prompt": "joyful ancient Roman festival celebration, fast lyre and drums, dancing rhythm, clapping, cheerful party, instrumental, folk dance",
        "duration": 45,
    },
    "music_vulcan": {
        "prompt": "dark volcanic ambient, deep rumbling, fire crackling, ominous brass, ancient forge, danger and power, slow heavy drums, instrumental, dark",
        "duration": 45,
    },
    "music_hyperborea": {
        "prompt": "ethereal frozen ambient, ice crystals chiming, arctic wind, mysterious northern lights, haunting choir, cold beauty, instrumental",
        "duration": 45,
    },
    "music_necropolis": {
        "prompt": "eerie ancient tomb ambient, ghostly whispers, underground echoes, death and mystery, slow minor strings, instrumental, horror ambient",
        "duration": 45,
    },
    "music_rome_theme": {
        "prompt": "triumphant Roman empire theme, brass fanfare, martial drums, victorious, short heroic, instrumental, cinematic",
        "duration": 30,
    },
    "music_egypt_theme": {
        "prompt": "mystical ancient Egyptian theme, desert wind, exotic percussion, pyramid mystery, instrumental, middle eastern",
        "duration": 30,
    },
    "music_greece_theme": {
        "prompt": "philosophical ancient Greek theme, lyre and flute harmony, Aegean sea, wisdom and beauty, instrumental, classical",
        "duration": 30,
    },
    "music_sad": {
        "prompt": "sorrowful ancient lyre melody, loss and grief, slow minor key, lamenting, funeral dirge, instrumental, melancholic",
        "duration": 45,
    },
    "music_victory": {
        "prompt": "triumphant victory fanfare, brass and drums, glory and honor, ascending melody, celebration, instrumental, cinematic triumph",
        "duration": 30,
    },
}


def main():
    print(f"=== Mare Nostrum Soundtrack Generator (MusicGen) ===")
    print(f"Tracks to generate: {len(TRACKS)}")
    print(f"Output directory: {OUTPUT_DIR}")

    print("\nLoading MusicGen-small model...")
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = model.to(device)
    print(f"Model loaded on {device}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = {}
    total_start = time.time()

    for i, (name, config) in enumerate(TRACKS.items()):
        duration = config["duration"]
        # ~51.2 tokens per second
        max_tokens = int(duration * 51.2)

        print(f"\n[{i+1}/{len(TRACKS)}] Generating: {name} ({duration}s, {max_tokens} tokens)")
        print(f"  Prompt: {config['prompt'][:70]}...")

        track_start = time.time()
        output_path = os.path.join(OUTPUT_DIR, f"{name}.wav")

        try:
            inputs = processor(
                text=[config["prompt"]],
                padding=True,
                return_tensors="pt",
            ).to(device)

            with torch.no_grad():
                audio_values = model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    do_sample=True,
                    temperature=1.0,
                )

            sampling_rate = model.config.audio_encoder.sampling_rate
            audio_data = audio_values[0, 0].cpu().numpy()
            actual_duration = len(audio_data) / sampling_rate

            scipy.io.wavfile.write(output_path, rate=sampling_rate, data=audio_data)

            elapsed = time.time() - track_start
            file_size = os.path.getsize(output_path) / (1024 * 1024)
            print(f"  Done in {elapsed:.1f}s | {actual_duration:.1f}s audio | {file_size:.1f}MB")
            results[name] = {
                "status": "ok",
                "gen_time": round(elapsed, 1),
                "audio_duration": round(actual_duration, 1),
                "file_size_mb": round(file_size, 1),
                "path": output_path,
            }

        except Exception as e:
            elapsed = time.time() - track_start
            print(f"  FAILED after {elapsed:.1f}s: {e}")
            results[name] = {"status": "error", "gen_time": round(elapsed, 1), "error": str(e)}

        # Clear MPS cache between tracks
        if device == "mps":
            torch.mps.empty_cache()

    total_elapsed = time.time() - total_start
    print(f"\n=== Generation Complete ===")
    print(f"Total time: {total_elapsed:.0f}s ({total_elapsed/60:.1f} min)")

    ok = sum(1 for v in results.values() if v["status"] == "ok")
    fail = sum(1 for v in results.values() if v["status"] == "error")
    print(f"Success: {ok}/{len(TRACKS)}, Failed: {fail}")

    log_path = os.path.join(OUTPUT_DIR, "generation_log.json")
    with open(log_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to {log_path}")

    print("\n--- Generated Files ---")
    for name, res in results.items():
        if res["status"] == "ok":
            print(f"  {name}.wav  {res['audio_duration']}s  {res['file_size_mb']}MB  ({res['gen_time']}s gen)")
        else:
            print(f"  {name}.wav  FAILED: {res.get('error', '')[:50]}")


if __name__ == "__main__":
    main()
