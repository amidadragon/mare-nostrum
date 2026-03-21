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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_persia.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_water = make_mat("Water", (0.05, 0.18, 0.4), 0.05)
mat_grass = make_mat("Grass", (0.2, 0.45, 0.1), 0.8)
mat_sand = make_mat("Sand", (0.76, 0.65, 0.45), 0.9)
mat_palace_wall = make_mat("PalaceWall", (0.85, 0.8, 0.7), 0.4)
mat_gold_dome = make_mat("GoldDome", (0.9, 0.7, 0.15), 0.2)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)
mat_purple = make_mat("Purple", (0.4, 0.05, 0.35), 0.6)
mat_cypress = make_mat("Cypress", (0.06, 0.2, 0.04), 0.8)
mat_trunk = make_mat("Trunk", (0.25, 0.15, 0.08), 0.9)
mat_tile_blue = make_mat("TileBlue", (0.1, 0.2, 0.6), 0.3)
mat_garden = make_mat("Garden", (0.15, 0.5, 0.1), 0.7)
mat_column = make_mat("Column", (0.8, 0.75, 0.65), 0.3)
mat_gate = make_mat("Gate", (0.5, 0.35, 0.15), 0.7)
mat_path = make_mat("Path", (0.7, 0.6, 0.45), 0.85)
mat_pool = make_mat("Pool", (0.1, 0.35, 0.5), 0.1)

# Ocean
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)

# Island terrain
bpy.ops.mesh.primitive_uv_sphere_add(radius=14, segments=64, ring_count=32, location=(0, 0, -1.5))
island = bpy.context.active_object
island.scale = (1, 1, 0.2)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_grass)

# Beach
bpy.ops.mesh.primitive_torus_add(major_radius=13.5, minor_radius=1.4, location=(0, 0, -0.2))
beach = bpy.context.active_object
beach.scale.z = 0.15
beach.data.materials.append(mat_sand)

# === PALACE COMPLEX ===
# Main palace platform
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.8))
platform = bpy.context.active_object
platform.scale = (6, 5, 0.4)
platform.data.materials.append(mat_palace_wall)

# Main hall
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2.0))
hall = bpy.context.active_object
hall.scale = (4, 3, 1.2)
hall.data.materials.append(mat_palace_wall)

# Main dome
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.5, location=(0, 0, 3.8))
dome = bpy.context.active_object
dome.scale.z = 0.6
dome.data.materials.append(mat_gold_dome)

# Smaller domes on corners
for dx, dy in [(-3, -2.5), (3, -2.5), (-3, 2.5), (3, 2.5)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, dy, 1.8))
    tower = bpy.context.active_object
    tower.scale = (1.2, 1.2, 1.0)
    tower.data.materials.append(mat_palace_wall)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(dx, dy, 2.8))
    d = bpy.context.active_object
    d.scale.z = 0.5
    d.data.materials.append(mat_gold_dome)

# Twisted columns at entrance
for i in range(4):
    for side in [-1, 1]:
        x = -3 + i * 2
        y = -5.2 * side * 0.6
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=3.0, location=(x * 0.5, y + side * 1.5, 2.0))
        col = bpy.context.active_object
        col.data.materials.append(mat_column)
        # Gold cap
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(x * 0.5, y + side * 1.5, 3.6))
        cap = bpy.context.active_object
        cap.data.materials.append(mat_gold)

# Ornate gate
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -4.5, 1.8))
gate = bpy.context.active_object
gate.scale = (2.5, 0.3, 1.8)
gate.data.materials.append(mat_gate)
# Gate arch
bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.3, location=(0, -4.5, 3.0))
arch = bpy.context.active_object
arch.rotation_euler.x = math.radians(90)
arch.scale.z = 0.5
arch.data.materials.append(mat_gold)

# Central avenue / path
for i in range(10):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -5 - i * 0.9, 0.5))
    p = bpy.context.active_object
    p.scale = (1.2, 0.4, 0.03)
    p.data.materials.append(mat_path)

# Cypress trees lining avenue
for i in range(8):
    for side in [-1, 1]:
        tx = side * 2.0
        ty = -5.5 - i * 1.0
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.8, location=(tx, ty, 1.4))
        trunk = bpy.context.active_object
        trunk.data.materials.append(mat_trunk)
        bpy.ops.mesh.primitive_cone_add(radius1=0.3, radius2=0.05, depth=2.8, location=(tx, ty, 3.2))
        foliage = bpy.context.active_object
        foliage.data.materials.append(mat_cypress)

# Hanging gardens - terraced platforms with greenery
for i, (gx, gy) in enumerate([(5, 2), (5, -2), (-5, 2), (-5, -2)]):
    for level in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(gx, gy, 0.8 + level * 0.6))
        terrace = bpy.context.active_object
        terrace.scale = (1.5 - level * 0.3, 1.5 - level * 0.3, 0.15)
        terrace.data.materials.append(mat_palace_wall)
        # Greenery on each level
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5 - level * 0.1, location=(gx, gy, 1.1 + level * 0.6))
        green = bpy.context.active_object
        green.scale.z = 0.4
        green.data.materials.append(mat_garden)

# Additional buildings
building_positions = [
    (7, 4, 0.5), (7, -3, 0.4), (-7, 4, 0.4),
    (-7, -3, 0.3), (4, -7, 0.3), (-4, -7, 0.4),
    (8, 0, 0.3), (-8, 1, 0.3)
]
for hx, hy, hz in building_positions:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(hx, hy, hz))
    h = bpy.context.active_object
    h.scale = (0.9, 0.7, 0.7)
    h.data.materials.append(mat_palace_wall)
    # Blue tiled roof
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.65, location=(hx, hy, hz + 0.8))
    r = bpy.context.active_object
    r.scale.z = 0.35
    r.data.materials.append(mat_tile_blue)

# Reflecting pool in front of palace
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -2.5, 0.55))
pool = bpy.context.active_object
pool.scale = (1.5, 1.5, 0.05)
pool.data.materials.append(mat_pool)

# Purple/gold banners
for bx, by in [(2, -3.5), (-2, -3.5), (4, 0), (-4, 0)]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=3.5, location=(bx, by, 2.3))
    pole = bpy.context.active_object
    pole.data.materials.append(mat_gold)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(bx, by + 0.3, 3.5))
    banner = bpy.context.active_object
    banner.scale = (0.5, 0.8, 1)
    banner.rotation_euler.x = math.radians(8)
    banner.data.materials.append(mat_purple)

# More trees around the island
tree_positions = [
    (9, 5, 0.3), (-9, 5, 0.3), (6, 8, 0.2), (-6, 8, 0.2),
    (10, -2, 0.2), (-10, -1, 0.2), (3, 9, 0.2), (-3, 9, 0.2),
    (8, -6, 0.2), (-8, -5, 0.2), (11, 2, 0.1), (-11, 3, 0.1)
]
for tx, ty, tz in tree_positions:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=1.5, location=(tx, ty, tz + 0.75))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_trunk)
    bpy.ops.mesh.primitive_cone_add(radius1=0.35, radius2=0.05, depth=2.5, location=(tx, ty, tz + 2.5))
    foliage = bpy.context.active_object
    foliage.data.materials.append(mat_cypress)

# === SKY / WORLD ===
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 2.5
sky.ground_albedo = 0.35
sky.sun_direction = Vector((0.6, 0.3, 0.2)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.8  # Warm golden

# Warm golden sun
bpy.ops.object.light_add(type='SUN', location=(10, 5, 8))
sun = bpy.context.active_object
sun.data.energy = 5
sun.data.color = (1.0, 0.8, 0.45)
sun.rotation_euler = (math.radians(60), math.radians(10), math.radians(-25))

bpy.ops.object.light_add(type='AREA', location=(-8, -5, 6))
fill = bpy.context.active_object
fill.data.energy = 60
fill.data.color = (1.0, 0.9, 0.7)
fill.data.size = 6

# Camera - wide shot showing palace and gardens
bpy.ops.object.camera_add(location=(12, -12, 8))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 2.0)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 32

bpy.ops.render.render(write_still=True)
print("Persia render complete!")
