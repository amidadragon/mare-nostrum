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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_phoenicia.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_water = make_mat("Water", (0.04, 0.12, 0.3), 0.05)
mat_grass = make_mat("Grass", (0.2, 0.4, 0.1), 0.8)
mat_sand = make_mat("Sand", (0.76, 0.65, 0.45), 0.9)
mat_sandstone = make_mat("Sandstone", (0.75, 0.6, 0.4), 0.7)
mat_white_wall = make_mat("WhiteWall", (0.88, 0.85, 0.78), 0.5)
mat_purple_cloth = make_mat("PurpleCloth", (0.45, 0.02, 0.4), 0.7)
mat_cedar = make_mat("Cedar", (0.12, 0.28, 0.08), 0.75)
mat_trunk = make_mat("Trunk", (0.3, 0.18, 0.08), 0.9)
mat_dock_wood = make_mat("DockWood", (0.3, 0.18, 0.08), 0.85)
mat_hull = make_mat("Hull", (0.25, 0.15, 0.07), 0.8)
mat_sail = make_mat("Sail", (0.8, 0.75, 0.6), 0.85)
mat_lighthouse = make_mat("Lighthouse", (0.7, 0.65, 0.55), 0.6)
mat_fire = make_mat("Fire", (1.0, 0.6, 0.1), 0.0)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)
mat_rope = make_mat("Rope", (0.4, 0.3, 0.15), 0.9)
mat_rock = make_mat("Rock", (0.4, 0.38, 0.35), 0.9)
mat_red_roof = make_mat("RedRoof", (0.55, 0.15, 0.08), 0.7)
mat_mast = make_mat("Mast", (0.3, 0.18, 0.08), 0.85)

# Make fire material emissive
mat_fire.use_nodes = True
nodes = mat_fire.node_tree.nodes
bsdf = nodes["Principled BSDF"]
bsdf.inputs["Emission Color"].default_value = (1.0, 0.5, 0.1, 1)
bsdf.inputs["Emission Strength"].default_value = 15.0

# Ocean with waves
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.subdivide(number_cuts=40)
bpy.ops.object.mode_set(mode='OBJECT')
wave = ocean.modifiers.new("Wave", 'WAVE')
wave.height = 0.3
wave.width = 2.0
wave.speed = 0.5

# Island terrain
bpy.ops.mesh.primitive_uv_sphere_add(radius=14, segments=64, ring_count=32, location=(0, 2, -1.5))
island = bpy.context.active_object
island.scale = (1.2, 1, 0.2)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_grass)

# Beach
bpy.ops.mesh.primitive_torus_add(major_radius=14, minor_radius=1.3, location=(0, 2, -0.2))
beach = bpy.context.active_object
beach.scale = (1.2, 1, 0.15)
beach.data.materials.append(mat_sand)

# Hillside behind city (raised terrain)
bpy.ops.mesh.primitive_uv_sphere_add(radius=8, segments=32, ring_count=16, location=(0, 8, -0.5))
hill = bpy.context.active_object
hill.scale = (1.5, 1, 0.35)
bpy.ops.object.transform_apply(scale=True)
hill.data.materials.append(mat_grass)

# === HARBOR / DOCKS ===
# Main dock - large L-shaped
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -5, 0.0))
dock_main = bpy.context.active_object
dock_main.scale = (8, 1, 0.15)
dock_main.data.materials.append(mat_dock_wood)

bpy.ops.mesh.primitive_cube_add(size=1, location=(-7, -3, 0.0))
dock_arm = bpy.context.active_object
dock_arm.scale = (1, 3, 0.15)
dock_arm.data.materials.append(mat_dock_wood)

bpy.ops.mesh.primitive_cube_add(size=1, location=(7, -3, 0.0))
dock_arm2 = bpy.context.active_object
dock_arm2.scale = (1, 3, 0.15)
dock_arm2.data.materials.append(mat_dock_wood)

# Dock posts
for dx in range(-6, 7, 2):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=2, location=(dx, -5, -0.7))
    post = bpy.context.active_object
    post.data.materials.append(mat_dock_wood)

# === TRADING SHIPS ===
def make_trade_ship(loc, rot_z, scale=1.0):
    sx, sy, sz = loc
    cos_r = math.cos(math.radians(rot_z))
    sin_r = math.sin(math.radians(rot_z))
    # Hull
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, sz + 0.2))
    hull = bpy.context.active_object
    hull.scale = (3.5 * scale, 0.9 * scale, 0.4 * scale)
    hull.rotation_euler.z = math.radians(rot_z)
    hull.data.materials.append(mat_hull)
    # Deck
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, sz + 0.5))
    deck = bpy.context.active_object
    deck.scale = (3.0 * scale, 0.75 * scale, 0.05 * scale)
    deck.rotation_euler.z = math.radians(rot_z)
    deck.data.materials.append(mat_dock_wood)
    # Mast
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06 * scale, depth=3.5 * scale, location=(sx, sy, sz + 2.3))
    mast = bpy.context.active_object
    mast.data.materials.append(mat_mast)
    # Sail
    bpy.ops.mesh.primitive_plane_add(size=1, location=(sx + cos_r * 0.2, sy + sin_r * 0.2, sz + 2.2))
    sail = bpy.context.active_object
    sail.scale = (2.0 * scale, 1, 1.5 * scale)
    sail.rotation_euler.z = math.radians(rot_z)
    sail.data.materials.append(mat_sail)
    # Prow
    prow_x = sx + cos_r * 3.8 * scale
    prow_y = sy + sin_r * 3.8 * scale
    bpy.ops.mesh.primitive_cone_add(radius1=0.2 * scale, radius2=0.02 * scale, depth=1.5 * scale, location=(prow_x, prow_y, sz + 0.6))
    prow = bpy.context.active_object
    prow.rotation_euler.y = math.radians(-70)
    prow.rotation_euler.z = math.radians(rot_z)
    prow.data.materials.append(mat_hull)

ship_placements = [
    ((-3, -7, 0), 5, 0.8),
    ((3, -7.5, 0), -10, 0.75),
    ((-6, -4, 0), 80, 0.7),
    ((6, -4, 0), -80, 0.7),
    ((0, -9, 0), 15, 0.65),
    ((-8, -7, 0), 40, 0.6),
]
for loc, rot, sc in ship_placements:
    make_trade_ship(loc, rot, sc)

# === CITY BUILDINGS ===
building_positions = [
    (-3, 0, 0.5, 1.0), (-1, 1, 0.5, 0.9), (1, 0.5, 0.5, 1.1),
    (3, 1, 0.5, 0.85), (-4, 2, 0.6, 0.8), (4, 2.5, 0.5, 0.9),
    (-2, 3, 0.7, 0.7), (2, 3, 0.7, 0.75), (0, -2, 0.4, 1.0),
    (-5, -1, 0.4, 0.7),
]
for bx, by, bz, bs in building_positions:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz))
    b = bpy.context.active_object
    b.scale = (0.8 * bs, 0.6 * bs, 0.8 * bs)
    b.data.materials.append(mat_white_wall)
    # Flat roof / terrace style
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz + 0.5 * bs))
    r = bpy.context.active_object
    r.scale = (0.9 * bs, 0.7 * bs, 0.05)
    r.data.materials.append(mat_sandstone)

# Purple cloth hanging between buildings
cloth_pairs = [
    ((-3, 0, 1.3), (-1, 1, 1.3)),
    ((1, 0.5, 1.3), (3, 1, 1.3)),
    ((-2, 3, 1.2), (2, 3, 1.2)),
    ((-4, 2, 1.1), (-2, 3, 1.2)),
]
for (ax, ay, az), (bx, by, bz) in cloth_pairs:
    mx, my, mz = (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2 - 0.15
    bpy.ops.mesh.primitive_plane_add(size=1, location=(mx, my, mz))
    cloth = bpy.context.active_object
    dx = bx - ax
    dy = by - ay
    length = math.sqrt(dx * dx + dy * dy)
    cloth.scale = (length * 0.5, 0.4, 1)
    cloth.rotation_euler.z = math.atan2(dy, dx)
    cloth.rotation_euler.x = math.radians(15)
    cloth.data.materials.append(mat_purple_cloth)

# === LIGHTHOUSE on rocky outcrop ===
# Rocky outcrop
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.5, location=(10, -3, -0.5))
outcrop = bpy.context.active_object
outcrop.scale = (1, 1, 0.5)
bpy.ops.object.transform_apply(scale=True)
outcrop.data.materials.append(mat_rock)

# Lighthouse tower
bpy.ops.mesh.primitive_cone_add(radius1=0.8, radius2=0.5, depth=4, location=(10, -3, 2.5))
tower = bpy.context.active_object
tower.data.materials.append(mat_lighthouse)

# Lighthouse top platform
bpy.ops.mesh.primitive_cylinder_add(radius=0.7, depth=0.3, location=(10, -3, 4.7))
top = bpy.context.active_object
top.data.materials.append(mat_sandstone)

# Fire beacon
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4, location=(10, -3, 5.2))
fire = bpy.context.active_object
fire.data.materials.append(mat_fire)

# Point light at lighthouse
bpy.ops.object.light_add(type='POINT', location=(10, -3, 5.2))
beacon_light = bpy.context.active_object
beacon_light.data.energy = 200
beacon_light.data.color = (1.0, 0.6, 0.2)

# === CEDAR TREES on hillside ===
cedar_positions = [
    (-4, 7, 1.0), (-2, 8, 1.2), (0, 9, 1.3), (2, 8, 1.2),
    (4, 7, 1.0), (-6, 6, 0.7), (6, 6, 0.7), (-1, 10, 1.1),
    (1, 10, 1.1), (3, 9, 1.0), (-3, 9, 1.0), (-5, 8, 0.8),
]
for tx, ty, tz in cedar_positions:
    # Cedar - wide spreading shape
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=2.5, location=(tx, ty, tz + 1.25))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_trunk)
    # Layered flat canopy (cedar style)
    for layer in range(3):
        bpy.ops.mesh.primitive_cone_add(radius1=1.2 - layer * 0.25, radius2=0.8 - layer * 0.2, depth=0.4, location=(tx, ty, tz + 2.0 + layer * 0.7))
        canopy = bpy.context.active_object
        canopy.data.materials.append(mat_cedar)

# Banner/flag
bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=3.5, location=(0, -3.5, 2.2))
pole = bpy.context.active_object
pole.data.materials.append(mat_gold)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -3.2, 3.5))
flag = bpy.context.active_object
flag.scale = (0.6, 0.8, 1)
flag.data.materials.append(mat_purple_cloth)

# === SKY / WORLD — sunset ===
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 4.0
sky.ground_albedo = 0.35
sky.sun_direction = Vector((0.7, 0.1, 0.08)).normalized()  # Low sun for sunset
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.5

# Warm sunset sun
bpy.ops.object.light_add(type='SUN', location=(15, 3, 5))
sun = bpy.context.active_object
sun.data.energy = 4.5
sun.data.color = (1.0, 0.6, 0.3)
sun.rotation_euler = (math.radians(78), math.radians(5), math.radians(-15))

bpy.ops.object.light_add(type='AREA', location=(-8, -5, 6))
fill = bpy.context.active_object
fill.data.energy = 45
fill.data.color = (0.9, 0.7, 0.5)
fill.data.size = 6

# Camera - aerial view of harbor at sunset
bpy.ops.object.camera_add(location=(2, -18, 14))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 1.0)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 30

bpy.ops.render.render(write_still=True)
print("Phoenicia render complete!")
