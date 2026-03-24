"""
Mare Nostrum — Sprite Generator via ComfyUI API
Generates pixel-art sprites for the game using Stable Diffusion.
Run on Mac: python3 tools/generate_sprites.py
"""
import json
import urllib.request
import urllib.parse
import os
import time
import sys

COMFYUI_URL = "http://localhost:8188"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sprites")

# Sprite definitions: (filename, prompt, width, height)
SPRITES = [
    # Ships (side view, 128x64)
    ("ships/ship_rome.png", "pixel art roman trireme warship, red sails, bronze ram, side view, transparent background, 16-bit style, clean lines", 128, 64),
    ("ships/ship_carthage.png", "pixel art carthaginian merchant galley, purple sails, high stern, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_egypt.png", "pixel art ancient egyptian papyrus boat, gold decorations, curved ends, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_greece.png", "pixel art greek trireme, blue sails, eyes painted on bow, bronze ram, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_persia.png", "pixel art persian warship, red and gold sails, archer towers, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_gaul.png", "pixel art celtic longboat, green sail, animal figurehead, shields on sides, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_phoenicia.png", "pixel art phoenician trading galley, purple sails, cedar wood hull, side view, transparent background, 16-bit style", 128, 64),
    ("ships/ship_seapeople.png", "pixel art viking-style dragon ship, black sails, dragon head prow, bone decorations, side view, transparent background, 16-bit style", 128, 64),
    # Critters (32x32)
    ("critters/wolf.png", "pixel art gray wolf, side view, walking pose, transparent background, 16-bit style, clean", 32, 32),
    ("critters/eagle.png", "pixel art golden eagle, wings spread, soaring, transparent background, 16-bit style", 32, 32),
    ("critters/lion.png", "pixel art male lion with mane, side view, standing, transparent background, 16-bit style", 32, 32),
    ("critters/boar.png", "pixel art wild boar, brown, tusks visible, side view, transparent background, 16-bit style", 32, 32),
    ("critters/owl.png", "pixel art owl perched, front view, yellow eyes, transparent background, 16-bit style", 32, 32),
    ("critters/shark.png", "pixel art shark, dorsal fin visible, side view, transparent background, 16-bit style", 32, 32),
    ("critters/dolphin.png", "pixel art dolphin leaping, side view, transparent background, 16-bit style", 32, 32),
    ("critters/crocodile.png", "pixel art crocodile, green scales, side view, transparent background, 16-bit style", 32, 32),
    # Crops (32x32 each stage)
    ("crops/wheat_stage1.png", "pixel art tiny wheat seedling sprout in soil, transparent background, 16-bit style", 32, 32),
    ("crops/wheat_stage2.png", "pixel art young green wheat plants growing, transparent background, 16-bit style", 32, 32),
    ("crops/wheat_stage3.png", "pixel art tall golden wheat stalks ready to harvest, transparent background, 16-bit style", 32, 32),
    ("crops/olive.png", "pixel art small olive tree with green olives, transparent background, 16-bit style", 32, 32),
    ("crops/grape.png", "pixel art grape vine on trellis with purple grapes, transparent background, 16-bit style", 32, 32),
    # UI icons (32x32)
    ("ui/gold.png", "pixel art gold coin icon, shiny, transparent background, 16-bit style, clean simple", 32, 32),
    ("ui/food.png", "pixel art wheat sheaf icon, golden, transparent background, 16-bit style, clean simple", 32, 32),
    ("ui/wood.png", "pixel art wooden log icon, brown, transparent background, 16-bit style, clean simple", 32, 32),
    ("ui/stone.png", "pixel art gray stone rock icon, transparent background, 16-bit style, clean simple", 32, 32),
]

NEGATIVE = "blurry, watermark, text, signature, realistic, photographic, 3d render, complex background, busy, noisy"

def build_workflow(prompt, negative, w, h):
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": int(time.time() * 1000) % (2**32),
                "steps": 25,
                "cfg": 7.5,
                "sampler_name": "euler_ancestral",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            }
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "CyberRealistic_V4.2_FP16.safetensors"}
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": w * 4, "height": h * 4, "batch_size": 1}
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["4", 1]}
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": negative, "clip": ["4", 1]}
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]}
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "mare_nostrum_sprite", "images": ["8", 0]}
        }
    }

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def get_history(prompt_id):
    resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
    return json.loads(resp.read())

def download_image(filename, subfolder):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    resp = urllib.request.urlopen(f"{COMFYUI_URL}/view?{params}")
    return resp.read()

def generate_sprite(sprite_def):
    filepath, prompt, w, h = sprite_def
    full_path = os.path.join(OUTPUT_DIR, filepath)

    if os.path.exists(full_path):
        print(f"  SKIP {filepath} (exists)")
        return True

    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    print(f"  Generating {filepath}...")
    workflow = build_workflow(prompt, NEGATIVE, w, h)
    result = queue_prompt(workflow)
    prompt_id = result["prompt_id"]

    # Wait for completion
    for _ in range(120):  # 2 min timeout
        time.sleep(2)
        history = get_history(prompt_id)
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            if "9" in outputs:
                images = outputs["9"].get("images", [])
                if images:
                    img_data = download_image(images[0]["filename"], images[0].get("subfolder", ""))
                    with open(full_path, "wb") as f:
                        f.write(img_data)
                    print(f"  OK {filepath}")
                    return True

    print(f"  TIMEOUT {filepath}")
    return False

if __name__ == "__main__":
    print(f"Mare Nostrum Sprite Generator")
    print(f"ComfyUI: {COMFYUI_URL}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Sprites to generate: {len(SPRITES)}")
    print()

    success = 0
    for i, sprite in enumerate(SPRITES):
        print(f"[{i+1}/{len(SPRITES)}] {sprite[0]}")
        if generate_sprite(sprite):
            success += 1

    print(f"\nDone: {success}/{len(SPRITES)} sprites generated")
