#!/usr/bin/env python3
"""
Generate game assets from Blender primitives and export as GLB.
Run with: /Applications/Blender.app/Contents/MacOS/Blender --background --python generate_primitives.py
"""
import bpy
import math
import os
import sys

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def make_material(name, color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat

def assign_mat(obj, mat):
    obj.data.materials.append(mat)

def export_glb(filepath):
    bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB')
    print("Exported: " + filepath)

# ============================================================
# ASSET: Roman Temple
# ============================================================
def build_roman_temple():
    reset_scene()
    white_marble = make_material("WhiteMarble", (0.9, 0.88, 0.85, 1), roughness=0.3)
    red_roof = make_material("RedRoof", (0.72, 0.22, 0.12, 1), roughness=0.6)
    stone = make_material("Stone", (0.7, 0.68, 0.63, 1), roughness=0.7)

    # Base platform / steps
    for i in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, i*0.08))
        step = bpy.context.active_object
        step.scale = (1.8 - i*0.15, 1.2 - i*0.1, 0.04)
        assign_mat(step, stone)

    # Floor
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.28))
    floor = bpy.context.active_object
    floor.scale = (1.5, 1.0, 0.04)
    assign_mat(floor, white_marble)

    # Columns (6 front, 6 back)
    for row_y in [-0.85, 0.85]:
        for i in range(6):
            x = -1.15 + i * 0.46
            bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.9, location=(x, row_y, 0.75))
            col = bpy.context.active_object
            assign_mat(col, white_marble)

    # Back wall
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.75))
    wall = bpy.context.active_object
    wall.scale = (1.5, 0.03, 0.45)
    assign_mat(wall, white_marble)

    # Roof (triangular prism via scaled cone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.7, depth=0.5, location=(0, 0, 1.45))
    roof = bpy.context.active_object
    roof.scale = (1, 0.65, 1)
    roof.rotation_euler = (0, 0, math.radians(45))
    assign_mat(roof, red_roof)

    export_glb(os.path.join(MODELS_DIR, 'roman_temple.glb'))

# ============================================================
# ASSET: Roman Villa
# ============================================================
def build_roman_villa():
    reset_scene()
    white_wall = make_material("WhiteWall", (0.92, 0.9, 0.85, 1), roughness=0.6)
    red_roof = make_material("RedRoof", (0.72, 0.22, 0.12, 1), roughness=0.6)
    brown_wood = make_material("Wood", (0.45, 0.28, 0.15, 1), roughness=0.7)
    water_blue = make_material("Water", (0.3, 0.55, 0.8, 1), roughness=0.1, metallic=0.2)

    # Main building - L shape
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.4))
    main = bpy.context.active_object
    main.scale = (1.5, 1.0, 0.4)
    assign_mat(main, white_wall)

    # Wing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(1.0, -0.5, 0.3))
    wing = bpy.context.active_object
    wing.scale = (0.5, 0.5, 0.3)
    assign_mat(wing, white_wall)

    # Roof main
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.85))
    roof = bpy.context.active_object
    roof.scale = (1.6, 1.1, 0.06)
    roof.rotation_euler = (math.radians(5), 0, 0)
    assign_mat(roof, red_roof)

    # Roof wing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(1.0, -0.5, 0.65))
    rwing = bpy.context.active_object
    rwing.scale = (0.6, 0.6, 0.05)
    assign_mat(rwing, red_roof)

    # Courtyard fountain
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.1, location=(0, -0.6, 0.05))
    basin = bpy.context.active_object
    assign_mat(basin, water_blue)

    # Columns along courtyard
    for i in range(4):
        x = -0.6 + i * 0.4
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.6, location=(x, -0.3, 0.3))
        assign_mat(bpy.context.active_object, white_wall)

    # Door
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.0, 0.25))
    door = bpy.context.active_object
    door.scale = (0.15, 0.02, 0.25)
    assign_mat(door, brown_wood)

    export_glb(os.path.join(MODELS_DIR, 'roman_villa.glb'))

# ============================================================
# ASSET: Market Stall
# ============================================================
def build_market_stall():
    reset_scene()
    wood = make_material("Wood", (0.5, 0.32, 0.18, 1), roughness=0.7)
    cloth_red = make_material("ClothRed", (0.75, 0.15, 0.1, 1), roughness=0.8)
    clay = make_material("Clay", (0.72, 0.52, 0.35, 1), roughness=0.7)

    # Table surface
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.4))
    table = bpy.context.active_object
    table.scale = (0.8, 0.4, 0.03)
    assign_mat(table, wood)

    # Table legs
    for x in [-0.7, 0.7]:
        for y in [-0.3, 0.3]:
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.2))
            leg = bpy.context.active_object
            leg.scale = (0.03, 0.03, 0.2)
            assign_mat(leg, wood)

    # Awning poles
    for x in [-0.7, 0.7]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=1.0, location=(x, -0.35, 0.8))
        assign_mat(bpy.context.active_object, wood)

    # Awning cloth
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.2))
    awning = bpy.context.active_object
    awning.scale = (0.85, 0.5, 0.02)
    awning.rotation_euler = (math.radians(10), 0, 0)
    assign_mat(awning, cloth_red)

    # Amphora on table
    for i in range(3):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(-0.3 + i*0.3, 0, 0.52))
        assign_mat(bpy.context.active_object, clay)

    export_glb(os.path.join(MODELS_DIR, 'market_stall.glb'))

# ============================================================
# ASSET: Olive Tree
# ============================================================
def build_olive_tree():
    reset_scene()
    bark = make_material("Bark", (0.35, 0.22, 0.12, 1), roughness=0.9)
    leaves = make_material("Leaves", (0.4, 0.52, 0.3, 1), roughness=0.8)

    # Trunk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.8, location=(0, 0, 0.4))
    trunk = bpy.context.active_object
    trunk.rotation_euler = (math.radians(5), math.radians(-3), 0)
    assign_mat(trunk, bark)

    # Branch stubs
    for angle, height, tilt in [(0, 0.6, 40), (120, 0.65, 35), (240, 0.55, 45)]:
        rad = math.radians(angle)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.3,
            location=(math.cos(rad)*0.15, math.sin(rad)*0.15, height))
        branch = bpy.context.active_object
        branch.rotation_euler = (math.radians(tilt)*math.cos(rad), math.radians(tilt)*math.sin(rad), 0)
        assign_mat(branch, bark)

    # Foliage clusters
    for x, y, z, r in [(0, 0, 1.0, 0.35), (-0.25, 0.15, 0.9, 0.25), (0.2, -0.2, 0.85, 0.22),
                         (0.15, 0.25, 1.05, 0.2), (-0.1, -0.2, 1.1, 0.18)]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z))
        leaf = bpy.context.active_object
        leaf.scale = (1.2, 1.0, 0.7)
        assign_mat(leaf, leaves)

    export_glb(os.path.join(MODELS_DIR, 'olive_tree.glb'))

# ============================================================
# ASSET: Amphora
# ============================================================
def build_amphora():
    reset_scene()
    clay = make_material("Clay", (0.72, 0.48, 0.3, 1), roughness=0.7)
    dark_clay = make_material("DarkBand", (0.5, 0.3, 0.18, 1), roughness=0.7)

    # Body
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.35))
    body = bpy.context.active_object
    body.scale = (1, 1, 1.4)
    assign_mat(body, clay)

    # Neck
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.3, location=(0, 0, 0.82))
    neck = bpy.context.active_object
    assign_mat(neck, clay)

    # Rim
    bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.025, location=(0, 0, 0.97))
    assign_mat(bpy.context.active_object, dark_clay)

    # Pointed base
    bpy.ops.mesh.primitive_cone_add(radius1=0.12, radius2=0.02, depth=0.2, location=(0, 0, -0.05))
    assign_mat(bpy.context.active_object, clay)

    # Handles
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.02,
            location=(side*0.3, 0, 0.6))
        handle = bpy.context.active_object
        handle.rotation_euler = (0, math.radians(90), 0)
        handle.scale = (1, 0.5, 1)
        assign_mat(handle, clay)

    export_glb(os.path.join(MODELS_DIR, 'amphora.glb'))

# ============================================================
# ASSET: Marble Column
# ============================================================
def build_marble_column():
    reset_scene()
    marble = make_material("Marble", (0.9, 0.88, 0.82, 1), roughness=0.3, metallic=0.05)
    gold = make_material("Gold", (0.83, 0.69, 0.22, 1), roughness=0.3, metallic=0.8)

    # Base
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.08))
    base = bpy.context.active_object
    base.scale = (0.35, 0.35, 0.08)
    assign_mat(base, marble)

    # Column shaft
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.15, depth=1.2, location=(0, 0, 0.76))
    shaft = bpy.context.active_object
    assign_mat(shaft, marble)

    # Capital
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.15, location=(0, 0, 1.44))
    cap = bpy.context.active_object
    assign_mat(cap, marble)

    # Capital decorative scrolls
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(side*0.2, 0, 1.44))
        assign_mat(bpy.context.active_object, gold)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(0, side*0.2, 1.44))
        assign_mat(bpy.context.active_object, gold)

    # Top slab
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.56))
    top = bpy.context.active_object
    top.scale = (0.3, 0.3, 0.04)
    assign_mat(top, marble)

    export_glb(os.path.join(MODELS_DIR, 'marble_column.glb'))

# ============================================================
# ASSET: Fountain
# ============================================================
def build_fountain():
    reset_scene()
    stone = make_material("Stone", (0.75, 0.72, 0.68, 1), roughness=0.5)
    water = make_material("Water", (0.2, 0.45, 0.7, 1), roughness=0.05, metallic=0.3)
    bronze = make_material("Bronze", (0.7, 0.45, 0.2, 1), roughness=0.3, metallic=0.7)

    # Outer basin
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.6, depth=0.15, location=(0, 0, 0.08))
    assign_mat(bpy.context.active_object, stone)

    # Inner water
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.5, depth=0.08, location=(0, 0, 0.12))
    assign_mat(bpy.context.active_object, water)

    # Center pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.1, depth=0.5, location=(0, 0, 0.4))
    assign_mat(bpy.context.active_object, stone)

    # Lion head (simplified sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 0.7))
    assign_mat(bpy.context.active_object, bronze)

    # Spout
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.15, location=(0, 0.1, 0.65))
    spout = bpy.context.active_object
    spout.rotation_euler = (math.radians(60), 0, 0)
    assign_mat(spout, bronze)

    # Base ring detail
    bpy.ops.mesh.primitive_torus_add(major_radius=0.6, minor_radius=0.04, location=(0, 0, 0.0))
    assign_mat(bpy.context.active_object, stone)

    export_glb(os.path.join(MODELS_DIR, 'fountain.glb'))

# ============================================================
# ASSET: Cypress Tree
# ============================================================
def build_cypress_tree():
    reset_scene()
    bark = make_material("Bark", (0.3, 0.2, 0.1, 1), roughness=0.9)
    foliage = make_material("DarkGreen", (0.15, 0.32, 0.12, 1), roughness=0.85)

    # Trunk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.5, location=(0, 0, 0.75))
    assign_mat(bpy.context.active_object, bark)

    # Foliage - tall narrow cone shape, stacked
    for z, r, h in [(0.6, 0.25, 0.6), (0.95, 0.22, 0.5), (1.25, 0.18, 0.5), (1.5, 0.14, 0.4)]:
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=r, radius2=r*0.6, depth=h, location=(0, 0, z))
        assign_mat(bpy.context.active_object, foliage)

    # Top cone
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.1, depth=0.3, location=(0, 0, 1.8))
    assign_mat(bpy.context.active_object, foliage)

    export_glb(os.path.join(MODELS_DIR, 'cypress_tree.glb'))

# ============================================================
# ASSET: Harbor Dock
# ============================================================
def build_harbor_dock():
    reset_scene()
    wood = make_material("Wood", (0.45, 0.3, 0.18, 1), roughness=0.8)
    dark_wood = make_material("DarkWood", (0.3, 0.2, 0.1, 1), roughness=0.8)
    rope_mat = make_material("Rope", (0.6, 0.5, 0.35, 1), roughness=0.9)
    water = make_material("Water", (0.15, 0.35, 0.55, 1), roughness=0.1, metallic=0.2)

    # Water surface
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, -0.15))
    assign_mat(bpy.context.active_object, water)

    # Main dock platform
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.05))
    dock = bpy.context.active_object
    dock.scale = (1.5, 0.6, 0.05)
    assign_mat(dock, wood)

    # Support posts underneath
    for x in [-1.2, -0.4, 0.4, 1.2]:
        for y in [-0.4, 0.4]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.4, location=(x, y, -0.1))
            assign_mat(bpy.context.active_object, dark_wood)

    # Mooring posts on top
    for x in [-1.0, 0, 1.0]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.3, location=(x, -0.5, 0.2))
        assign_mat(bpy.context.active_object, dark_wood)

    # Rope coil on a post
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.015, location=(0, -0.5, 0.22))
    assign_mat(bpy.context.active_object, rope_mat)

    # Crates
    for i, (x, y) in enumerate([(0.6, 0.1), (0.8, 0.15), (0.7, -0.1)]):
        bpy.ops.mesh.primitive_cube_add(size=0.2, location=(x, y, 0.18 + i*0.05))
        assign_mat(bpy.context.active_object, dark_wood if i % 2 else wood)

    # Barrel
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.2, location=(-0.7, 0.1, 0.18))
    assign_mat(bpy.context.active_object, dark_wood)

    export_glb(os.path.join(MODELS_DIR, 'harbor_dock.glb'))

# ============================================================
# ASSET: Rome Player (simplified soldier)
# ============================================================
def build_rome_player():
    reset_scene()
    skin = make_material("Skin", (0.8, 0.6, 0.45, 1), roughness=0.7)
    red_tunic = make_material("RedTunic", (0.7, 0.15, 0.1, 1), roughness=0.7)
    metal = make_material("Metal", (0.6, 0.58, 0.55, 1), roughness=0.35, metallic=0.8)
    brown = make_material("Leather", (0.4, 0.25, 0.12, 1), roughness=0.7)
    red_plume = make_material("Plume", (0.8, 0.1, 0.08, 1), roughness=0.8)

    # Legs
    for side in [-0.08, 0.08]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.35, location=(side, 0, 0.18))
        assign_mat(bpy.context.active_object, brown)

    # Tunic/body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.52))
    body = bpy.context.active_object
    body.scale = (0.16, 0.1, 0.18)
    assign_mat(body, red_tunic)

    # Armor chest plate
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.05, 0.55))
    armor = bpy.context.active_object
    armor.scale = (0.15, 0.06, 0.14)
    assign_mat(armor, metal)

    # Head
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(0, 0, 0.78))
    assign_mat(bpy.context.active_object, skin)

    # Helmet
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(0, 0, 0.82))
    helmet = bpy.context.active_object
    helmet.scale = (1, 1, 0.7)
    assign_mat(helmet, metal)

    # Helmet plume
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.95))
    plume = bpy.context.active_object
    plume.scale = (0.02, 0.08, 0.06)
    assign_mat(plume, red_plume)

    # Arms
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.3, location=(side*0.19, 0, 0.5))
        arm = bpy.context.active_object
        arm.rotation_euler = (0, math.radians(10*side), 0)
        assign_mat(arm, skin)

    # Shield (left hand)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.25, 0, 0.5))
    shield = bpy.context.active_object
    shield.scale = (0.02, 0.12, 0.18)
    assign_mat(shield, red_tunic)

    # Sword (right hand)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.25, 0, 0.5))
    sword = bpy.context.active_object
    sword.scale = (0.015, 0.015, 0.2)
    assign_mat(sword, metal)

    export_glb(os.path.join(MODELS_DIR, 'rome_player.glb'))

# ============================================================
# ASSET: Wooden Cart
# ============================================================
def build_wooden_cart():
    reset_scene()
    wood = make_material("Wood", (0.5, 0.32, 0.18, 1), roughness=0.7)
    dark_wood = make_material("DarkWood", (0.35, 0.22, 0.1, 1), roughness=0.8)
    metal = make_material("Metal", (0.5, 0.48, 0.45, 1), roughness=0.4, metallic=0.7)

    # Cart bed
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.35))
    bed = bpy.context.active_object
    bed.scale = (0.6, 0.35, 0.05)
    assign_mat(bed, wood)

    # Side walls
    for y in [-0.3, 0.3]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y, 0.48))
        wall = bpy.context.active_object
        wall.scale = (0.6, 0.025, 0.1)
        assign_mat(wall, wood)

    # Front/back walls
    for x in [-0.55, 0.55]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0, 0.48))
        wall = bpy.context.active_object
        wall.scale = (0.025, 0.35, 0.1)
        assign_mat(wall, dark_wood)

    # Wheels
    for x in [-0.4, 0.4]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.025, location=(x, -0.4, 0.15))
        wheel = bpy.context.active_object
        wheel.rotation_euler = (math.radians(90), 0, 0)
        assign_mat(wheel, dark_wood)

        bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.025, location=(x, 0.4, 0.15))
        wheel2 = bpy.context.active_object
        wheel2.rotation_euler = (math.radians(90), 0, 0)
        assign_mat(wheel2, dark_wood)

    # Axles
    for x in [-0.4, 0.4]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.9, location=(x, 0, 0.15))
        axle = bpy.context.active_object
        axle.rotation_euler = (math.radians(90), 0, 0)
        assign_mat(axle, metal)

    # Yoke
    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.5, location=(-0.85, 0, 0.3))
    yoke = bpy.context.active_object
    yoke.rotation_euler = (math.radians(90), 0, 0)
    assign_mat(yoke, dark_wood)

    # Tongue
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.5, location=(-0.7, 0, 0.32))
    tongue = bpy.context.active_object
    tongue.rotation_euler = (0, math.radians(80), 0)
    assign_mat(tongue, wood)

    export_glb(os.path.join(MODELS_DIR, 'wooden_cart.glb'))

# ============================================================
# ASSET: Palm Tree
# ============================================================
def build_palm_tree():
    reset_scene()
    bark = make_material("PalmBark", (0.45, 0.35, 0.2, 1), roughness=0.9)
    frond = make_material("PalmFrond", (0.2, 0.45, 0.15, 1), roughness=0.8)

    # Trunk - slightly curved
    for i in range(5):
        z = i * 0.3 + 0.15
        offset = math.sin(i * 0.3) * 0.03
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08 - i*0.005, depth=0.32, location=(offset, 0, z))
        assign_mat(bpy.context.active_object, bark)

    # Fronds - flat cones radiating from top
    top_z = 1.55
    for i in range(7):
        angle = i * (360 / 7)
        rad = math.radians(angle)
        dx = math.cos(rad) * 0.3
        dy = math.sin(rad) * 0.3
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.15, radius2=0.01, depth=0.6,
            location=(dx, dy, top_z - 0.1))
        frond_obj = bpy.context.active_object
        frond_obj.scale = (0.3, 1, 0.08)
        frond_obj.rotation_euler = (math.radians(50)*math.cos(rad), math.radians(50)*math.sin(rad), rad)
        assign_mat(frond_obj, frond)

    # Coconuts
    for i in range(3):
        a = math.radians(i * 120)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=(math.cos(a)*0.08, math.sin(a)*0.08, 1.4))
        assign_mat(bpy.context.active_object, bark)

    export_glb(os.path.join(MODELS_DIR, 'palm_tree.glb'))

# ============================================================
# BUILD ALL
# ============================================================
print("=" * 60)
print("GENERATING BLENDER PRIMITIVE ASSETS")
print("=" * 60)

builders = [
    ("Roman Temple", build_roman_temple),
    ("Roman Villa", build_roman_villa),
    ("Market Stall", build_market_stall),
    ("Olive Tree", build_olive_tree),
    ("Amphora", build_amphora),
    ("Marble Column", build_marble_column),
    ("Fountain", build_fountain),
    ("Cypress Tree", build_cypress_tree),
    ("Harbor Dock", build_harbor_dock),
    ("Rome Player", build_rome_player),
    ("Wooden Cart", build_wooden_cart),
    ("Palm Tree", build_palm_tree),
]

success = 0
failed = 0
for name, builder in builders:
    print("\n--- Building: " + name + " ---")
    try:
        builder()
        print("  OK: " + name)
        success += 1
    except Exception as e:
        print("  FAILED: " + name + ": " + str(e))
        failed += 1

print("\n" + "=" * 60)
print("DONE! " + str(success) + " succeeded, " + str(failed) + " failed")
print("Models in: " + MODELS_DIR)
print("=" * 60)
