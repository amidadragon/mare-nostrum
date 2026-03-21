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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_greece.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_white_marble = make_mat("WhiteMarble", (0.95, 0.93, 0.90), 0.15)
mat_grass = make_mat("Grass", (0.28, 0.48, 0.15), 0.8)
mat_sand = make_mat("Sand", (0.76, 0.65, 0.45), 0.9)
mat_water = make_mat("Water", (0.04, 0.18, 0.40), 0.05)
mat_blue = make_mat("Blue", (0.10, 0.25, 0.65), 0.4)
mat_olive = make_mat("Olive", (0.30, 0.42, 0.18), 0.75)
mat_olive_trunk = make_mat("OliveTrunk", (0.32, 0.25, 0.15), 0.9)
mat_terracotta = make_mat("Terracotta", (0.72, 0.38, 0.18), 0.7)
mat_stone = make_mat("Stone", (0.60, 0.58, 0.52), 0.8)
mat_wood = make_mat("Wood", (0.35, 0.2, 0.1), 0.8)
mat_dock = make_mat("Dock", (0.3, 0.18, 0.08), 0.85)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)

bpy.ops.mesh.primitive_uv_sphere_add(radius=14, segments=64, ring_count=32, location=(0, 0, -1.8))
island = bpy.context.active_object
island.scale = (1, 1, 0.17)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_grass)

bpy.ops.mesh.primitive_torus_add(major_radius=13.5, minor_radius=1.3, location=(0, 0, -0.25))
beach = bpy.context.active_object
beach.scale.z = 0.12
beach.data.materials.append(mat_sand)

bpy.ops.mesh.primitive_uv_sphere_add(radius=4, location=(0, 0, 0.2))
acropolis = bpy.context.active_object
acropolis.scale = (1, 0.8, 0.3)
acropolis.data.materials.append(mat_stone)

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.5))
platform = bpy.context.active_object
platform.scale = (4.5, 2.5, 0.25)
platform.data.materials.append(mat_white_marble)

for s in range(3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -2.5 - s * 0.3, 1.2 - s * 0.15))
    step = bpy.context.active_object
    step.scale = (4.5 + s * 0.2, 0.15, 0.08)
    step.data.materials.append(mat_white_marble)

for i in range(6):
    for j in [-1, 1]:
        x = -3.5 + i * 1.4
        y = j * 1.8
        bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=2.8, location=(x, y, 3.1))
        col = bpy.context.active_object
        col.data.materials.append(mat_white_marble)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.25, minor_radius=0.06, location=(x, y, 4.55))
        cap = bpy.context.active_object
        cap.data.materials.append(mat_white_marble)

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 4.7))
ent = bpy.context.active_object
ent.scale = (4.6, 2.2, 0.2)
ent.data.materials.append(mat_white_marble)

bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=4.8, radius2=0, depth=1.5, location=(0, 0, 5.5))
ped = bpy.context.active_object
ped.scale = (1, 0.48, 0.5)
ped.rotation_euler.z = math.radians(90)
ped.data.materials.append(mat_white_marble)

bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=4.2, radius2=0, depth=1.2, location=(0, 0, 5.48))
ped_accent = bpy.context.active_object
ped_accent.scale = (1, 0.46, 0.45)
ped_accent.rotation_euler.z = math.radians(90)
ped_accent.data.materials.append(mat_blue)

bpy.ops.mesh.primitive_cylinder_add(radius=2.5, depth=0.8, location=(-6, -3, 0.4))
amp_base = bpy.context.active_object
amp_base.data.materials.append(mat_stone)
for tier in range(3):
    bpy.ops.mesh.primitive_torus_add(major_radius=2.0 + tier * 0.4, minor_radius=0.15, location=(-6, -3, 0.5 + tier * 0.25))
    ring = bpy.context.active_object
    ring.scale.z = 0.5
    ring.data.materials.append(mat_white_marble)

house_positions = [
    (4, 4, 0.5, 1.2, 1.0), (-4, 5, 0.4, 1.0, 0.8),
    (5, -3, 0.4, 1.0, 0.9), (6, 1, 0.35, 0.9, 0.8),
    (-6, 1, 0.35, 1.1, 0.9), (-3, -5, 0.3, 0.9, 0.8),
    (3, -6, 0.3, 1.0, 0.7), (7, -1, 0.3, 0.8, 0.7),
]
for i, (hx, hy, hz, sx, sy) in enumerate(house_positions):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(hx, hy, hz))
    h = bpy.context.active_object
    h.scale = (sx, sy, 0.7)
    h.data.materials.append(mat_white_marble)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(hx, hy, hz + 0.72))
    roof = bpy.context.active_object
    roof.scale = (sx + 0.05, sy + 0.05, 0.04)
    roof.data.materials.append(mat_blue if i % 2 == 0 else mat_terracotta)

olive_positions = [
    (7, 5, 0.2), (-7, 4, 0.2), (8, -4, 0.15), (-8, -3, 0.15),
    (5, 7, 0.15), (-5, -7, 0.15), (9, 2, 0.1), (-9, 1, 0.1),
    (3, 8, 0.1), (-3, 8, 0.1), (6, -6, 0.1), (-6, -5, 0.1)
]
for tx, ty, tz in olive_positions:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1.2, location=(tx, ty, tz + 0.6))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_olive_trunk)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(tx, ty, tz + 1.6))
    canopy = bpy.context.active_object
    canopy.scale = (1.2, 1.2, 0.8)
    canopy.data.materials.append(mat_olive)

bpy.ops.mesh.primitive_cube_add(size=1, location=(11, -2, -0.05))
dock = bpy.context.active_object
dock.scale = (3, 0.8, 0.1)
dock.data.materials.append(mat_dock)
for dx in [-1.5, 0, 1.5]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.5, location=(11 + dx, -2, -0.5))
    post = bpy.context.active_object
    post.data.materials.append(mat_wood)

bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.5, location=(12.5, -2, 1.0))
fp = bpy.context.active_object
fp.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(12.5, -1.7, 2.0))
fl = bpy.context.active_object
fl.scale = (0.4, 0.6, 1)
fl.data.materials.append(mat_blue)

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 2.0
sky.ground_albedo = 0.3
sky.sun_direction = Vector((0.1, 0.1, 0.95)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.2

bpy.ops.object.light_add(type='SUN', location=(0, 0, 15))
sun = bpy.context.active_object
sun.data.energy = 5
sun.data.color = (1.0, 0.95, 0.88)
sun.rotation_euler = (math.radians(15), math.radians(5), 0)

bpy.ops.object.light_add(type='AREA', location=(-8, -8, 8))
fill = bpy.context.active_object
fill.data.energy = 40
fill.data.color = (0.85, 0.90, 1.0)
fill.data.size = 6

bpy.ops.object.camera_add(location=(16, -16, 14))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 1.5)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 28

bpy.ops.render.render(write_still=True)
print("Greece render complete!")
