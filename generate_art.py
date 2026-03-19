#!/usr/bin/env python3
"""
ComfyUI API client for Mare Nostrum art generation.
Sends prompts to local ComfyUI and saves output images.

Usage:
    python3 generate_art.py "pixel art Roman villa, top-down, warm sunset" --output villa.png
    python3 generate_art.py "pixel art olive tree sprite, transparent bg" --width 128 --height 128
"""

import json
import sys
import time
import uuid
import urllib.request
import urllib.error
import argparse
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8000"
OUTPUT_DIR = Path("/Users/ioio/Documents/ComfyUI/output")
CLIENT_ID = str(uuid.uuid4())

# FLUX.1-schnell workflow as API format
def build_workflow(prompt, width=512, height=512, steps=4, seed=None):
    if seed is None:
        seed = int(time.time()) % (2**31)

    return {
        "6": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            }
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["13", 0],
                "vae": ["10", 0]
            }
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "mare_nostrum",
                "images": ["8", 0]
            }
        },
        "10": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "ae.safetensors"
            }
        },
        "11": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux"
            }
        },
        "12": {
            "class_type": "UnetLoaderGGUF",
            "inputs": {
                "unet_name": "flux1-schnell-Q4_K_S.gguf"
            }
        },
        "13": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["12", 0],
                "positive": ["14", 0],
                "negative": ["15", 0],
                "latent_image": ["6", 0],
                "seed": seed,
                "steps": steps,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0
            }
        },
        "14": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["11", 0]
            }
        },
        "15": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "",
                "clip": ["11", 0]
            }
        }
    }


def queue_prompt(workflow):
    payload = json.dumps({"prompt": workflow, "client_id": CLIENT_ID}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["prompt_id"]


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
        time.sleep(1)
    raise TimeoutError(f"Generation timed out after {timeout}s")


def get_image(filename, subfolder="", folder_type="output"):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": folder_type})
    resp = urllib.request.urlopen(f"{COMFYUI_URL}/view?{params}")
    return resp.read()


def generate(prompt, output_path=None, width=512, height=512, steps=4, seed=None):
    import urllib.parse

    print(f"Generating: {prompt}")
    print(f"Size: {width}x{height}, Steps: {steps}")

    workflow = build_workflow(prompt, width, height, steps, seed)
    prompt_id = queue_prompt(workflow)
    print(f"Queued: {prompt_id}")

    result = wait_for_completion(prompt_id)

    # Check for errors
    status = result.get("status", {})
    if status.get("status_str") == "error":
        for msg in status.get("messages", []):
            if msg[0] == "execution_error":
                raise RuntimeError(f"ComfyUI error on node {msg[1].get('node_id')}: {msg[1].get('exception_message')}")
        raise RuntimeError("ComfyUI execution failed")

    # Extract output image info
    outputs = result.get("outputs", {})
    for node_id, node_output in outputs.items():
        if "images" in node_output:
            for img_info in node_output["images"]:
                img_data = get_image(img_info["filename"], img_info.get("subfolder", ""))

                if output_path:
                    out = Path(output_path)
                else:
                    out = Path(img_info["filename"])

                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(img_data)
                print(f"Saved: {out} ({len(img_data)} bytes)")
                return str(out)

    raise RuntimeError("No image output found")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate art via ComfyUI FLUX.1-schnell")
    parser.add_argument("prompt", help="Text prompt for image generation")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--width", "-W", type=int, default=512)
    parser.add_argument("--height", "-H", type=int, default=512)
    parser.add_argument("--steps", "-s", type=int, default=4)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    generate(args.prompt, args.output, args.width, args.height, args.steps, args.seed)
