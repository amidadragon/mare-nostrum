#!/usr/bin/env python3
"""
Mare Nostrum sprite generator via ComfyUI API.

Usage:
    python3 generate.py --prompt "pixel art..." --output characters/rome_player.png
    python3 generate.py --batch prompts.md  # generate all sprites from prompts file
    python3 generate.py --list              # list all prompts from prompts.md

Requires ComfyUI running at localhost:8188 (default).
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

COMFYUI_URL = "http://127.0.0.1:8188"
SPRITES_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CHECKPOINT = "v1-5-pruned-emaonly.safetensors"

NEGATIVE_PROMPT = (
    "blurry, 3d render, realistic, photo, watermark, text, signature, "
    "low quality, deformed, ugly, bad anatomy, disfigured"
)

WORKFLOW_TEMPLATE = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 7.5,
            "denoise": 1,
            "model": ["4", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "latent_image": ["5", 0],
            "sampler_name": "euler_ancestral",
            "scheduler": "normal",
            "seed": -1,
            "steps": 28
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": DEFAULT_CHECKPOINT}
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {"batch_size": 1, "height": 512, "width": 512}
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["4", 1], "text": ""}
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["4", 1], "text": NEGATIVE_PROMPT}
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {"samples": ["3", 0], "vae": ["4", 2]}
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {"filename_prefix": "mare_nostrum", "images": ["8", 0]}
    }
}


def parse_prompts_file(filepath):
    prompts = []
    current_prompt = None
    current_output = None
    current_name = None

    with open(filepath) as f:
        for line in f:
            line = line.rstrip()
            if line.startswith("### "):
                current_name = line[4:]
            elif line.startswith("pixel art") and current_name:
                current_prompt = line
            elif line.startswith("**Output**:"):
                current_output = line.split(": ", 1)[1].strip()
                if current_prompt and current_output:
                    prompts.append({
                        "name": current_name,
                        "prompt": current_prompt,
                        "output": current_output
                    })
                current_prompt = None
                current_output = None
                current_name = None

    return prompts


def queue_prompt(prompt_text, seed=-1):
    import random
    workflow = json.loads(json.dumps(WORKFLOW_TEMPLATE))
    workflow["6"]["inputs"]["text"] = prompt_text
    if seed == -1:
        seed = random.randint(0, 2**32 - 1)
    workflow["3"]["inputs"]["seed"] = seed

    payload = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return result.get("prompt_id")
    except urllib.error.URLError as e:
        print(f"Error connecting to ComfyUI at {COMFYUI_URL}: {e}")
        print("Make sure ComfyUI is running.")
        sys.exit(1)


def wait_for_completion(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
            history = json.loads(resp.read())
            if prompt_id in history:
                return history[prompt_id]
        except urllib.error.URLError:
            pass
        time.sleep(2)
    print(f"Timeout waiting for prompt {prompt_id}")
    return None


def download_image(history, output_path):
    outputs = history.get("outputs", {})
    for node_id, node_output in outputs.items():
        images = node_output.get("images", [])
        for img in images:
            filename = img["filename"]
            subfolder = img.get("subfolder", "")
            url = f"{COMFYUI_URL}/view?filename={filename}&subfolder={subfolder}&type=output"
            full_path = os.path.join(SPRITES_DIR, output_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            urllib.request.urlretrieve(url, full_path)
            print(f"Saved: {full_path}")
            return True
    return False


def generate_single(prompt_text, output_path):
    print(f"Generating: {output_path}")
    print(f"Prompt: {prompt_text[:80]}...")
    prompt_id = queue_prompt(prompt_text)
    if not prompt_id:
        print("Failed to queue prompt.")
        return False
    print(f"Queued (id: {prompt_id}). Waiting...")
    history = wait_for_completion(prompt_id)
    if history:
        return download_image(history, output_path)
    return False


def main():
    parser = argparse.ArgumentParser(description="Mare Nostrum sprite generator")
    parser.add_argument("--prompt", help="Single prompt text")
    parser.add_argument("--output", help="Output path (relative to sprites/)")
    parser.add_argument("--batch", help="Generate all from prompts file")
    parser.add_argument("--list", action="store_true", help="List prompts from file")
    parser.add_argument("--category", help="Filter batch by category (characters, buildings, etc.)")
    parser.add_argument("--seed", type=int, default=-1, help="Random seed (-1 for random)")
    args = parser.parse_args()

    if args.list:
        prompts_file = os.path.join(SPRITES_DIR, "prompts.md")
        prompts = parse_prompts_file(prompts_file)
        for i, p in enumerate(prompts):
            print(f"{i+1:2d}. [{p['output']}] {p['name']}")
        print(f"\nTotal: {len(prompts)} sprites")
        return

    if args.prompt and args.output:
        generate_single(args.prompt, args.output)
        return

    if args.batch:
        prompts = parse_prompts_file(args.batch)
        if args.category:
            prompts = [p for p in prompts if p["output"].startswith(args.category)]
        print(f"Generating {len(prompts)} sprites...")
        for i, p in enumerate(prompts):
            print(f"\n[{i+1}/{len(prompts)}] {p['name']}")
            generate_single(p["prompt"], p["output"])
        return

    parser.print_help()


if __name__ == "__main__":
    main()
