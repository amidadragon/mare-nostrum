#!/usr/bin/env python3
"""
Reformat rendered sprite sheets to match SpriteManager expectations.
Characters: 32x32 frames, 4 cols (walk cycle), 4 rows (directions)
Buildings: 64x64 frames, 2+ cols
Props: 64x64 or 32x32, 2+ cols (duplicate single frames)
"""
import os
from PIL import Image

SHEETS = '/Users/ioio/mare-nostrum/sprites/sheets'
RENDERS = '/Users/ioio/mare-nostrum/sprites/renders'
SPRITES = '/Users/ioio/mare-nostrum/sprites'

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def reformat_character(name, src_sheet, dest_path, target_frame=32):
    """
    Source: 512x64 = 8 frames at 64px (8 directions, single pose)
    Target: 128x128 = 4 cols x 4 rows at 32x32
    We use 4 directions (S, W, E, N from the 8), duplicate each for 4-frame walk cycle
    with slight offset to simulate walking.
    """
    src = Image.open(src_sheet)
    src_frame = src.height  # 64px
    num_frames = src.width // src_frame

    cols = 4  # walk cycle frames
    rows = 4  # directions: S, W, E, N
    sheet = Image.new('RGBA', (cols * target_frame, rows * target_frame), (0, 0, 0, 0))

    # Map 8 directions to 4 rows: S=0, W=2, E=6, N=4
    dir_map = [0, 2, 6, 4]  # S, W, E, N from 8-direction source

    for row, src_dir in enumerate(dir_map):
        frame = src.crop((src_dir * src_frame, 0, (src_dir + 1) * src_frame, src_frame))
        frame = frame.resize((target_frame, target_frame), Image.LANCZOS)

        # Create 4 walk cycle frames with subtle shifts
        for col in range(4):
            f = frame.copy()
            # Shift pixels slightly for walk animation
            if col == 1:
                shifted = Image.new('RGBA', f.size, (0, 0, 0, 0))
                shifted.paste(f, (0, -1))
                f = shifted
            elif col == 3:
                shifted = Image.new('RGBA', f.size, (0, 0, 0, 0))
                shifted.paste(f, (0, 1))
                f = shifted
            sheet.paste(f, (col * target_frame, row * target_frame))

    ensure_dir(os.path.dirname(dest_path))
    sheet.save(dest_path)
    print("  -> " + dest_path + " (" + str(sheet.size[0]) + "x" + str(sheet.size[1]) + ")")

def reformat_building(name, src_sheet, dest_path, target_frame=64):
    """
    Source: 512x128 = 4 frames at 128px (4 directions)
    Target: 128x128 = 2 cols x 2 rows at 64x64
    """
    src = Image.open(src_sheet)
    src_frame_w = src.height  # frames are square, height = frame size
    num_frames = src.width // src_frame_w

    if num_frames >= 4:
        cols, rows = 2, 2
    elif num_frames >= 2:
        cols, rows = 2, 1
    else:
        cols, rows = 2, 1  # duplicate

    sheet = Image.new('RGBA', (cols * target_frame, rows * target_frame), (0, 0, 0, 0))

    for i in range(cols * rows):
        src_idx = min(i, num_frames - 1)
        frame = src.crop((src_idx * src_frame_w, 0, (src_idx + 1) * src_frame_w, src_frame_w))
        frame = frame.resize((target_frame, target_frame), Image.LANCZOS)
        c = i % cols
        r = i // cols
        sheet.paste(frame, (c * target_frame, r * target_frame))

    ensure_dir(os.path.dirname(dest_path))
    sheet.save(dest_path)
    print("  -> " + dest_path + " (" + str(sheet.size[0]) + "x" + str(sheet.size[1]) + ")")

def reformat_prop_single(name, src_sheet, dest_path, target_frame=64):
    """
    Source: single frame (64x64 or 32x32)
    Target: 2 cols x 1 row (duplicate for validation)
    """
    src = Image.open(src_sheet)
    frame = src.resize((target_frame, target_frame), Image.LANCZOS)

    # Make 2-column sheet (duplicate frame) for SpriteManager validation
    sheet = Image.new('RGBA', (target_frame * 2, target_frame), (0, 0, 0, 0))
    sheet.paste(frame, (0, 0))
    sheet.paste(frame, (target_frame, 0))

    ensure_dir(os.path.dirname(dest_path))
    sheet.save(dest_path)
    print("  -> " + dest_path + " (" + str(sheet.size[0]) + "x" + str(sheet.size[1]) + ")")

def reformat_prop_multi(name, src_sheet, dest_path, target_frame=64):
    """
    Source: multi-frame (e.g. 256x64 = 4 frames)
    Target: same structure, scaled to target frame size
    """
    src = Image.open(src_sheet)
    src_frame = src.height
    num_frames = src.width // src_frame

    sheet = Image.new('RGBA', (num_frames * target_frame, target_frame), (0, 0, 0, 0))
    for i in range(num_frames):
        frame = src.crop((i * src_frame, 0, (i + 1) * src_frame, src_frame))
        frame = frame.resize((target_frame, target_frame), Image.LANCZOS)
        sheet.paste(frame, (i * target_frame, 0))

    ensure_dir(os.path.dirname(dest_path))
    sheet.save(dest_path)
    print("  -> " + dest_path + " (" + str(sheet.size[0]) + "x" + str(sheet.size[1]) + ")")

# ============================================================
# REFORMAT ALL
# ============================================================
print("Reformatting sprite sheets for SpriteManager...")

# Characters: 32x32, 4x4 grid
print("\n--- Characters ---")
reformat_character('rome_player',
    os.path.join(SHEETS, 'rome_player.png'),
    os.path.join(SPRITES, 'characters', 'rome_player.png'), 32)

# Buildings: 64x64, 2x2 grid
print("\n--- Buildings ---")
for name in ['roman_temple', 'roman_villa', 'harbor_dock']:
    src = os.path.join(SHEETS, name + '.png')
    if os.path.exists(src):
        # Map to expected filenames
        dest_name = name
        if name == 'roman_temple':
            dest_name = 'temple'
        elif name == 'roman_villa':
            dest_name = 'villa'
        reformat_building(name, src, os.path.join(SPRITES, 'buildings', dest_name + '.png'), 64)

reformat_building('market_stall',
    os.path.join(SHEETS, 'market_stall.png'),
    os.path.join(SPRITES, 'buildings', 'market.png'), 64)

# Props - single frame, need 2 columns minimum
print("\n--- Props (single frame -> 2-col) ---")
for name, target in [('olive_tree', 64), ('cypress_tree', 64), ('palm_tree', 64),
                       ('marble_column', 64), ('fountain', 64), ('amphora', 32)]:
    src = os.path.join(SHEETS, name + '.png')
    if os.path.exists(src):
        reformat_prop_single(name, src, os.path.join(SPRITES, 'items', name + '.png'), target)

# Props - multi frame
print("\n--- Props (multi-frame) ---")
reformat_prop_multi('wooden_cart',
    os.path.join(SHEETS, 'wooden_cart.png'),
    os.path.join(SPRITES, 'items', 'wooden_cart.png'), 64)

# Also copy harbor_dock to environment
print("\n--- Environment ---")
reformat_building('harbor_dock',
    os.path.join(SHEETS, 'harbor_dock.png'),
    os.path.join(SPRITES, 'environment', 'harbor_dock.png'), 64)

print("\nDone! All sprites reformatted for SpriteManager.")

# Verify all output files
print("\n--- Verification ---")
for subdir in ['characters', 'buildings', 'items', 'environment']:
    d = os.path.join(SPRITES, subdir)
    if os.path.exists(d):
        files = [f for f in os.listdir(d) if f.endswith('.png')]
        for f in sorted(files):
            img = Image.open(os.path.join(d, f))
            print("  " + subdir + "/" + f + ": " + str(img.size[0]) + "x" + str(img.size[1]))
