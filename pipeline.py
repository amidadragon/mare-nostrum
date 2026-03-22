#!/usr/bin/env python3
"""
Mare Nostrum 3D Sprite Pipeline
Generates 3D models via API, renders isometric sprite sheets via Blender CLI.

Usage:
    python3 pipeline.py                          # run full pipeline
    python3 pipeline.py --step generate          # only generate 3D models
    python3 pipeline.py --step render            # only render existing models
    python3 pipeline.py --step compile           # only compile sprite sheets
    python3 pipeline.py --step test              # render a test cube
    python3 pipeline.py --target characters      # only process characters
    python3 pipeline.py --asset rome_player      # only process one asset
"""
import os, json, subprocess, sys, urllib.request, urllib.error, time, math, argparse

SPRITES_DIR = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.path.dirname(SPRITES_DIR)
MODELS_DIR = os.path.join(SPRITES_DIR, 'models')
RENDERS_DIR = os.path.join(SPRITES_DIR, 'renders')
SHEETS_DIR = os.path.join(SPRITES_DIR, 'sheets')
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'

for d in (MODELS_DIR, RENDERS_DIR, SHEETS_DIR):
    os.makedirs(d, exist_ok=True)

# ===================================================================
# STEP 1: Generate 3D models via API
# ===================================================================

def load_api_key(name):
    """Load API key from ~/.mare-nostrum-keys.json"""
    keys_path = os.path.expanduser('~/.mare-nostrum-keys.json')
    if os.path.exists(keys_path):
        with open(keys_path) as f:
            keys = json.load(f)
            return keys.get(name)
    return os.environ.get(name)

def generate_model_tripo(prompt, output_path):
    """Generate 3D model via Tripo3D API. Requires TRIPO_API_KEY."""
    api_key = load_api_key('TRIPO_API_KEY')
    if not api_key:
        print("    [skip] No TRIPO_API_KEY configured")
        return False

    print("    Requesting model from Tripo3D...")
    data = json.dumps({
        "type": "text_to_model",
        "prompt": prompt,
        "model_version": "v2.0-20240919",
        "texture": True,
    }).encode()
    req = urllib.request.Request(
        "https://api.tripo3d.ai/v2/openapi/task",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key
        }
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        task_id = result['data']['task_id']
        print("    Task created: " + task_id)
    except Exception as e:
        print("    [error] Tripo create: " + str(e))
        return False

    for attempt in range(120):
        time.sleep(5)
        poll_req = urllib.request.Request(
            "https://api.tripo3d.ai/v2/openapi/task/" + task_id,
            headers={"Authorization": "Bearer " + api_key}
        )
        try:
            resp = urllib.request.urlopen(poll_req, timeout=15)
            status = json.loads(resp.read())
            state = status['data']['status']
            if state == 'success':
                model_url = status['data']['output']['model']
                print("    Downloading model...")
                urllib.request.urlretrieve(model_url, output_path)
                print("    -> " + output_path)
                return True
            elif state in ('failed', 'cancelled'):
                print("    [error] Task " + state)
                return False
            else:
                if attempt % 6 == 0:
                    print("    Waiting... (" + state + ")")
        except Exception as e:
            print("    [poll error] " + str(e))

    print("    [timeout] Model generation took too long")
    return False

def generate_model_meshy(prompt, output_path):
    """Generate 3D model via Meshy.ai API. Requires MESHY_API_KEY."""
    api_key = load_api_key('MESHY_API_KEY')
    if not api_key:
        print("    [skip] No MESHY_API_KEY configured")
        return False

    print("    Requesting model from Meshy...")
    data = json.dumps({
        "mode": "preview",
        "prompt": prompt,
        "art_style": "low-poly",
        "negative_prompt": "blurry, low quality, distorted"
    }).encode()
    req = urllib.request.Request(
        "https://api.meshy.ai/v2/text-to-3d",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key
        }
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        task_id = result['result']
        print("    Task created: " + task_id)
    except Exception as e:
        print("    [error] Meshy create: " + str(e))
        return False

    for attempt in range(120):
        time.sleep(5)
        poll_req = urllib.request.Request(
            "https://api.meshy.ai/v2/text-to-3d/" + task_id,
            headers={"Authorization": "Bearer " + api_key}
        )
        try:
            resp = urllib.request.urlopen(poll_req, timeout=15)
            status = json.loads(resp.read())
            state = status.get('status')
            if state == 'SUCCEEDED':
                model_url = status['model_urls']['glb']
                urllib.request.urlretrieve(model_url, output_path)
                print("    -> " + output_path)
                return True
            elif state == 'FAILED':
                print("    [error] Task failed")
                return False
            else:
                if attempt % 6 == 0:
                    progress = status.get('progress', '?')
                    print("    Waiting... (" + str(state) + ", " + str(progress) + "%)")
        except Exception as e:
            print("    [poll error] " + str(e))

    return False

def generate_model(prompt, output_path):
    """Try each API in order until one succeeds."""
    if os.path.exists(output_path):
        print("    Model exists, skipping generation")
        return True

    for gen_fn in [generate_model_tripo, generate_model_meshy]:
        if gen_fn(prompt, output_path):
            return True

    pending = output_path + '.pending.json'
    with open(pending, 'w') as f:
        json.dump({"prompt": prompt, "status": "no_api_key"}, f, indent=2)
    print("    [fallback] Saved pending prompt: " + pending)
    print("    Configure API key in ~/.mare-nostrum-keys.json:")
    print('    {"TRIPO_API_KEY": "your_key"} or {"MESHY_API_KEY": "your_key"}')
    return False

# ===================================================================
# STEP 2: Render via Blender CLI
# ===================================================================

BLENDER_RENDER_SCRIPT = '''
import bpy, sys, os, math, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)

argv = sys.argv[sys.argv.index("--") + 1:]
model_path = argv[0]
output_dir = argv[1]
frame_size = int(argv[2]) if len(argv) > 2 else 64
num_directions = int(argv[3]) if len(argv) > 3 else 8

# Import model
ext = os.path.splitext(model_path)[1].lower()
if ext in ('.glb', '.gltf'):
    bpy.ops.import_scene.gltf(filepath=model_path)
elif ext == '.obj':
    bpy.ops.wm.obj_import(filepath=model_path)
elif ext == '.fbx':
    bpy.ops.import_scene.fbx(filepath=model_path)
else:
    print("Unknown format: " + ext)
    sys.exit(1)

# Center and scale
imported = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if imported:
    min_co = [float('inf')] * 3
    max_co = [float('-inf')] * 3
    for obj in imported:
        for v in obj.bound_box:
            world_v = obj.matrix_world @ mathutils.Vector(v)
            for i in range(3):
                min_co[i] = min(min_co[i], world_v[i])
                max_co[i] = max(max_co[i], world_v[i])
    center = [(min_co[i] + max_co[i]) / 2 for i in range(3)]
    size = max(max_co[i] - min_co[i] for i in range(3))
    scale_factor = 1.5 / max(size, 0.001)
    for obj in imported:
        obj.location.x -= center[0]
        obj.location.y -= center[1]
        obj.location.z -= center[2]
        obj.scale *= scale_factor

# Camera
cam_data = bpy.data.cameras.new("IsoCam")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 3.0
cam = bpy.data.objects.new("IsoCam", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Lighting
sun = bpy.data.lights.new("Sun", type='SUN')
sun.energy = 3.0
sun_obj = bpy.data.objects.new("Sun", sun)
sun_obj.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
bpy.context.scene.collection.objects.link(sun_obj)

fill = bpy.data.lights.new("Fill", type='SUN')
fill.energy = 0.8
fill_obj = bpy.data.objects.new("Fill", fill)
fill_obj.rotation_euler = (math.radians(-30), math.radians(-45), 0)
bpy.context.scene.collection.objects.link(fill_obj)

# Render settings - EEVEE for speed
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = frame_size
scene.render.resolution_y = frame_size
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

os.makedirs(output_dir, exist_ok=True)
dist = 7.07
elev = 4.08

for i in range(num_directions):
    angle = (i / num_directions) * 2 * math.pi
    cam.location.x = math.cos(angle + math.pi/4) * dist
    cam.location.y = math.sin(angle + math.pi/4) * dist
    cam.location.z = elev

    direction = mathutils.Vector((0, 0, 0)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()

    scene.render.filepath = os.path.join(output_dir, "dir_%02d.png" % i)
    bpy.ops.render.render(write_still=True)
    print("  Rendered direction %d/%d" % (i + 1, num_directions))

print("Render complete!")
'''

BLENDER_TEST_SCRIPT = '''
import bpy, sys, os, math, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)

argv = sys.argv[sys.argv.index("--") + 1:]
output_dir = argv[0]
frame_size = int(argv[1]) if len(argv) > 1 else 64
num_directions = int(argv[2]) if len(argv) > 2 else 8

# Add a cube with material
bpy.ops.mesh.primitive_cube_add(size=1.2)
cube = bpy.context.active_object
mat = bpy.data.materials.new("TestMat")
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.8, 0.15, 0.15, 1)
    bsdf.inputs["Roughness"].default_value = 0.4
cube.data.materials.append(mat)

# Camera
cam_data = bpy.data.cameras.new("IsoCam")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 3.0
cam = bpy.data.objects.new("IsoCam", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Lighting
sun = bpy.data.lights.new("Sun", type='SUN')
sun.energy = 3.0
sun_obj = bpy.data.objects.new("Sun", sun)
sun_obj.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
bpy.context.scene.collection.objects.link(sun_obj)

fill = bpy.data.lights.new("Fill", type='SUN')
fill.energy = 0.8
fill_obj = bpy.data.objects.new("Fill", fill)
fill_obj.rotation_euler = (math.radians(-30), math.radians(-45), 0)
bpy.context.scene.collection.objects.link(fill_obj)

# Render settings
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = frame_size
scene.render.resolution_y = frame_size
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

os.makedirs(output_dir, exist_ok=True)
dist = 7.07
elev = 4.08

for i in range(num_directions):
    angle = (i / num_directions) * 2 * math.pi
    cam.location.x = math.cos(angle + math.pi/4) * dist
    cam.location.y = math.sin(angle + math.pi/4) * dist
    cam.location.z = elev

    direction = mathutils.Vector((0, 0, 0)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()

    scene.render.filepath = os.path.join(output_dir, "dir_%02d.png" % i)
    bpy.ops.render.render(write_still=True)
    print("  Rendered direction %d/%d" % (i + 1, num_directions))

print("Test render complete!")
'''

def write_blender_script(name, content):
    path = os.path.join(SPRITES_DIR, '_blender_' + name + '.py')
    with open(path, 'w') as f:
        f.write(content)
    return path

def render_model(model_path, output_dir, frame_size=64, directions=8):
    if not os.path.exists(model_path):
        print("    [skip] No model file: " + model_path)
        return False

    script = write_blender_script('render', BLENDER_RENDER_SCRIPT)
    cmd = [
        BLENDER, '--background', '--python', script,
        '--', model_path, output_dir, str(frame_size), str(directions)
    ]
    print("    Rendering " + os.path.basename(model_path) + " -> " + str(directions) + " directions at " + str(frame_size) + "px...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            stderr = result.stderr[-300:] if result.stderr else ''
            print("    [error] Blender failed: " + stderr)
            return False
        rendered = [f for f in os.listdir(output_dir) if f.endswith('.png')]
        print("    -> " + str(len(rendered)) + " frames rendered")
        return len(rendered) > 0
    except subprocess.TimeoutExpired:
        print("    [timeout] Render took >5 min")
        return False
    except Exception as e:
        print("    [error] " + str(e))
        return False

def render_test_cube(output_dir, frame_size=64, directions=8):
    script = write_blender_script('test', BLENDER_TEST_SCRIPT)
    cmd = [
        BLENDER, '--background', '--python', script,
        '--', output_dir, str(frame_size), str(directions)
    ]
    print("  Rendering test cube -> " + str(directions) + " directions at " + str(frame_size) + "px...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print("  [error] " + result.stderr[-300:])
        return False
    rendered = [f for f in os.listdir(output_dir) if f.endswith('.png')]
    print("  -> " + str(len(rendered)) + " test frames rendered")
    return len(rendered) > 0

# ===================================================================
# STEP 3: Compile sprite sheet from rendered frames
# ===================================================================

def compile_sprite_sheet(renders_dir, output_path, frame_size=64):
    if not os.path.exists(renders_dir):
        print("    [skip] No renders dir: " + renders_dir)
        return False

    frames = sorted([f for f in os.listdir(renders_dir) if f.endswith('.png')])
    if not frames:
        print("    [skip] No rendered frames")
        return False

    try:
        from PIL import Image
    except ImportError:
        print("    [error] Pillow not installed. Run: pip3 install --break-system-packages Pillow")
        return False

    cols = len(frames)
    sheet = Image.new('RGBA', (cols * frame_size, frame_size), (0, 0, 0, 0))

    for i, fname in enumerate(frames):
        frame = Image.open(os.path.join(renders_dir, fname))
        if frame.size != (frame_size, frame_size):
            frame = frame.resize((frame_size, frame_size), Image.LANCZOS)
        sheet.paste(frame, (i * frame_size, 0))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sheet.save(output_path)
    print("    -> Sheet: " + output_path + " (" + str(cols) + " frames, " + str(cols * frame_size) + "x" + str(frame_size) + "px)")
    return True

# ===================================================================
# MAIN
# ===================================================================

def load_prompts():
    prompts_path = os.path.join(SPRITES_DIR, 'prompts.json')
    if not os.path.exists(prompts_path):
        print("[error] Missing " + prompts_path)
        sys.exit(1)
    with open(prompts_path) as f:
        return json.load(f)

def run_pipeline(step='all', target='all', asset=None):
    prompts = load_prompts()

    stats = {'generated': 0, 'rendered': 0, 'compiled': 0, 'skipped': 0, 'failed': 0}

    for category, items in prompts.items():
        if target != 'all' and category != target:
            continue

        print("\n" + "=" * 60)
        print("  " + category.upper())
        print("=" * 60)

        for name, info in items.items():
            if asset and name != asset:
                continue

            prompt = info['prompt']
            frame_size = info.get('size', 64)
            directions = info.get('directions', 8)

            model_path = os.path.join(MODELS_DIR, name + ".glb")
            render_dir = os.path.join(RENDERS_DIR, name)
            sheet_path = os.path.join(SHEETS_DIR, name + ".png")

            print("\n  [" + name + "]")

            if os.path.exists(sheet_path) and step == 'all':
                print("    Sheet exists, skipping")
                stats['skipped'] += 1
                continue

            if step in ('all', 'generate'):
                if generate_model(prompt, model_path):
                    stats['generated'] += 1

            if step in ('all', 'render'):
                if render_model(model_path, render_dir, frame_size, directions):
                    stats['rendered'] += 1

            if step in ('all', 'compile'):
                if compile_sprite_sheet(render_dir, sheet_path, frame_size):
                    stats['compiled'] += 1

    print("\n" + "=" * 60)
    print("  PIPELINE COMPLETE")
    print("  Generated: " + str(stats['generated']) + " | Rendered: " + str(stats['rendered']) +
          " | Compiled: " + str(stats['compiled']) + " | Skipped: " + str(stats['skipped']))
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description='Mare Nostrum 3D Sprite Pipeline')
    parser.add_argument('--step', choices=['generate', 'render', 'compile', 'test', 'all'],
                        default='all', help='Pipeline step to run')
    parser.add_argument('--target', default='all',
                        help='Category to process (characters, buildings, military, props, environment, ui)')
    parser.add_argument('--asset', default=None, help='Single asset name to process')
    parser.add_argument('--size', type=int, default=None, help='Override frame size')
    parser.add_argument('--directions', type=int, default=None, help='Override number of directions')
    args = parser.parse_args()

    print("Mare Nostrum 3D Sprite Pipeline")
    print("Blender: " + BLENDER)
    print("Models:  " + MODELS_DIR)
    print("Renders: " + RENDERS_DIR)
    print("Sheets:  " + SHEETS_DIR)

    if args.step == 'test':
        test_dir = os.path.join(RENDERS_DIR, '_test_cube')
        test_sheet = os.path.join(SHEETS_DIR, '_test_cube.png')
        if render_test_cube(test_dir, frame_size=64, directions=8):
            compile_sprite_sheet(test_dir, test_sheet, frame_size=64)
            print("\nTest passed! Check: " + test_sheet)
        else:
            print("\nTest FAILED. Check Blender installation.")
            sys.exit(1)
    else:
        run_pipeline(step=args.step, target=args.target, asset=args.asset)

if __name__ == '__main__':
    main()
