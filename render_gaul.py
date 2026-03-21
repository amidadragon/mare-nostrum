import bpy
import math
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'CUDA'
prefs.get_devices()
for d in prefs.devices:
    d.use = True
scene.cycles.device = 'GPU'
scene.cycles.samples = 128
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_gaul.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_water = make_mat("Water", (0.04, 0.12, 0.25), 0.05)
mat_grass = make_mat("Grass", (0.15, 0.38, 0.08), 0.85)
mat_dark_grass = make_mat("DarkGrass", (0.1, 0.3, 0.05), 0.85)
mat_sand = make_mat("Sand", (0.6, 0.52, 0.35), 0.9)
mat_wood = make_mat("Wood", (0.3, 0.18, 0.08), 0.85)
mat_dark_wood = make_mat("DarkWood", (0.2, 0.12, 0.05), 0.9)
mat_thatch = make_mat("Thatch", (0.55, 0.42, 0.2), 0.95)
mat_oak_leaf = make_mat("OakLeaf", (0.12, 0.32, 0.06), 0.8)
mat_oak_dark = make_mat("OakDark", (0.08, 0.25, 0.04), 0.8)
mat_trunk = make_mat("Trunk", (0.22, 0.14, 0.06), 0.9)
mat_stone = make_mat("Stone", (0.5, 0.48, 0.44), 0.9)
mat_moss_stone = make_mat("MossStone", (0.35, 0.42, 0.3), 0.85)
mat_mud = make_mat("Mud", (0.3, 0.22, 0.12), 0.95)
mat_green_banner = make_mat("GreenBanner", (0.15, 0.4, 0.08), 0.7)
mat_mist = make_mat("Mist", (0.7, 0.75, 0.72), 0.1)

# Ocean with gentle waves
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.subdivide(number_cuts=30)
bpy.ops.object.mode_set(mode='OBJECT')
wave = ocean.modifiers.new("Wave", 'WAVE')
wave.height = 0.2
wave.width = 3.0
wave.speed = 0.3

# Island terrain
bpy.ops.mesh.primitive_uv_sphere_add(radius=14, segments=64, ring_count=32, location=(0, 0, -1.5))
island = bpy.context.active_object
island.scale = (1, 1, 0.22)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_dark_grass)

# Beach
bpy.ops.mesh.primitive_torus_add(major_radius=13.5, minor_radius=1.2, location=(0, 0, -0.2))
beach = bpy.context.active_object
beach.scale.z = 0.15
beach.data.materials.append(mat_sand)

# Hill for the fort
bpy.ops.mesh.primitive_uv_sphere_add(radius=5, segments=32, ring_count=16, location=(0, 0, 0.5))
hill = bpy.context.active_object
hill.scale = (1, 1, 0.4)
bpy.ops.object.transform_apply(scale=True)
hill.data.materials.append(mat_grass)

# === CIRCULAR WOODEN PALISADE ===
palisade_radius = 4.5
num_posts = 36
for i in range(num_posts):
    angle = (2 * math.pi * i) / num_posts
    px = math.cos(angle) * palisade_radius
    py = math.sin(angle) * palisade_radius
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2.5, location=(px, py, 1.75))
    post = bpy.context.active_object
    post.data.materials.append(mat_dark_wood)
    # Pointed top
    bpy.ops.mesh.primitive_cone_add(radius1=0.12, radius2=0.02, depth=0.3, location=(px, py, 3.1))
    tip = bpy.context.active_object
    tip.data.materials.append(mat_dark_wood)

# Horizontal beams connecting palisade
for ring_h in [1.2, 2.2]:
    bpy.ops.mesh.primitive_torus_add(major_radius=palisade_radius, minor_radius=0.05, location=(0, 0, ring_h + 0.5))
    beam_ring = bpy.context.active_object
    beam_ring.data.materials.append(mat_wood)

# Gate opening (two thicker posts + lintel)
gate_angle = math.radians(-90)  # South facing
for side in [-1, 1]:
    gx = math.cos(gate_angle + side * 0.09) * palisade_radius
    gy = math.sin(gate_angle + side * 0.09) * palisade_radius
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=3.0, location=(gx, gy, 2.0))
    gpost = bpy.context.active_object
    gpost.data.materials.append(mat_dark_wood)

# Gate lintel
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -palisade_radius, 3.2))
lintel = bpy.context.active_object
lintel.scale = (0.8, 0.15, 0.15)
lintel.data.materials.append(mat_dark_wood)

# === THATCHED ROUND HOUSES ===
house_positions = [
    (0, 0, 0.8), (-2, 1.5, 0.7), (2, 1.5, 0.7),
    (-1.5, -1.5, 0.7), (1.5, -1.5, 0.7), (0, 2.5, 0.6),
    (-2.5, -0.5, 0.6), (2.5, -0.5, 0.6),
]
for i, (hx, hy, hz) in enumerate(house_positions):
    size = 1.0 if i == 0 else 0.7  # Chief's house is biggest
    # Round wall
    bpy.ops.mesh.primitive_cylinder_add(radius=0.7 * size, depth=1.0 * size, location=(hx, hy, hz + 0.5 * size))
    wall = bpy.context.active_object
    wall.data.materials.append(mat_mud if i > 3 else mat_wood)
    # Thatched cone roof
    bpy.ops.mesh.primitive_cone_add(radius1=0.9 * size, radius2=0.05, depth=1.0 * size, location=(hx, hy, hz + 1.3 * size))
    roof = bpy.context.active_object
    roof.data.materials.append(mat_thatch)

# === STANDING STONES / MENHIR CIRCLE ===
stone_circle_radius = 7.5
num_stones = 8
for i in range(num_stones):
    angle = (2 * math.pi * i) / num_stones + math.radians(22)
    mx = math.cos(angle) * stone_circle_radius
    my = math.sin(angle) * stone_circle_radius
    height = 2.0 + (i % 3) * 0.5
    bpy.ops.mesh.primitive_cube_add(size=1, location=(mx, my, height / 2 + 0.3))
    stone = bpy.context.active_object
    stone.scale = (0.4, 0.25, height / 2)
    stone.rotation_euler.z = angle + math.radians(10)
    stone.rotation_euler.y = math.radians(3 + i * 2)  # Slight lean
    stone.data.materials.append(mat_moss_stone if i % 2 == 0 else mat_stone)

# Central altar stone (flat)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -7.5, 0.6))
altar = bpy.context.active_object
altar.scale = (1.2, 0.6, 0.25)
altar.data.materials.append(mat_moss_stone)

# === DENSE OAK FOREST ===
oak_positions = [
    (8, 3, 0.3), (9, -2, 0.2), (-8, 4, 0.3), (-9, -1, 0.2),
    (7, 6, 0.3), (-7, 6, 0.3), (10, 1, 0.1), (-10, 2, 0.1),
    (6, -7, 0.2), (-6, -7, 0.2), (8, -5, 0.2), (-8, -5, 0.2),
    (5, 8, 0.2), (-5, 8, 0.2), (11, -1, 0.1), (-11, 0, 0.1),
    (9, 5, 0.2), (-9, 5, 0.2), (7, -8, 0.1), (-7, -8, 0.1),
    (4, -9, 0.1), (-4, -9, 0.1), (10, 4, 0.1), (-10, 4, 0.1),
]
for i, (tx, ty, tz) in enumerate(oak_positions):
    # Thick trunk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=2.0, location=(tx, ty, tz + 1.0))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_trunk)
    # Round bushy canopy (oak style)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.2, location=(tx, ty, tz + 2.8))
    canopy = bpy.context.active_object
    canopy.scale = (1.0, 1.0, 0.7)
    canopy.data.materials.append(mat_oak_leaf if i % 2 == 0 else mat_oak_dark)
    # Some trees get a second canopy blob
    if i % 3 == 0:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(tx + 0.4, ty + 0.3, tz + 3.2))
        c2 = bpy.context.active_object
        c2.scale = (0.9, 0.9, 0.6)
        c2.data.materials.append(mat_oak_dark)

# Banner / flag
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=4, location=(0, 0, 3.5))
pole = bpy.context.active_object
pole.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.4, 5.0))
banner = bpy.context.active_object
banner.scale = (0.6, 0.9, 1)
banner.rotation_euler.x = math.radians(10)
banner.data.materials.append(mat_green_banner)

# === MIST PLANES (volumetric fog effect) ===
# Semi-transparent planes at low altitude for mist
for i, (mx, my) in enumerate([(-5, 3), (5, -3), (-3, -6), (7, 5), (-7, -2), (0, 7), (3, -8)]):
    bpy.ops.mesh.primitive_plane_add(size=6, location=(mx, my, 0.6 + i * 0.05))
    mist_plane = bpy.context.active_object
    mist_plane.rotation_euler.z = math.radians(i * 30)
    # Create translucent mist material
    mist_mat = bpy.data.materials.new(f"Mist{i}")
    mist_mat.use_nodes = True
    nodes = mist_mat.node_tree.nodes
    links = mist_mat.node_tree.links
    nodes.clear()
    output_node = nodes.new('ShaderNodeOutputMaterial')
    mix = nodes.new('ShaderNodeMixShader')
    transparent = nodes.new('ShaderNodeBsdfTransparent')
    diffuse = nodes.new('ShaderNodeBsdfDiffuse')
    diffuse.inputs["Color"].default_value = (0.75, 0.8, 0.75, 1)
    mix.inputs["Fac"].default_value = 0.85  # Mostly transparent
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(diffuse.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output_node.inputs[0])
    mist_plane.data.materials.append(mist_mat)

# === SKY / WORLD — misty morning ===
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 6.0  # Hazy
sky.ground_albedo = 0.4
sky.sun_direction = Vector((0.3, 0.5, 0.12)).normalized()  # Low morning sun
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.2  # Subdued, misty

# Soft diffused light
bpy.ops.object.light_add(type='SUN', location=(5, 8, 6))
sun = bpy.context.active_object
sun.data.energy = 2.5  # Softer
sun.data.color = (0.85, 0.9, 0.8)  # Slightly green-tinted
sun.rotation_euler = (math.radians(72), math.radians(10), math.radians(-40))

bpy.ops.object.light_add(type='AREA', location=(-6, -4, 5))
fill = bpy.context.active_object
fill.data.energy = 40
fill.data.color = (0.8, 0.85, 0.75)
fill.data.size = 8

# Extra fill for the mist
bpy.ops.object.light_add(type='AREA', location=(0, 0, 2))
mist_light = bpy.context.active_object
mist_light.data.energy = 15
mist_light.data.color = (0.85, 0.9, 0.8)
mist_light.data.size = 12

# Camera - atmospheric shot through morning mist
bpy.ops.object.camera_add(location=(10, -10, 4))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 1.5)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 35

bpy.ops.render.render(write_still=True)
print("Gaul render complete!")
