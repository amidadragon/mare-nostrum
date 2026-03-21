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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_egypt.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_golden_sand = make_mat("GoldenSand", (0.85, 0.72, 0.40), 0.9)
mat_sand = make_mat("Sand", (0.78, 0.65, 0.42), 0.85)
mat_water = make_mat("Water", (0.03, 0.10, 0.25), 0.05)
mat_limestone = make_mat("Limestone", (0.82, 0.75, 0.55), 0.7)
mat_gold = make_mat("Gold", (0.90, 0.70, 0.15), 0.2)
mat_turquoise = make_mat("Turquoise", (0.15, 0.65, 0.60), 0.3)
mat_papyrus = make_mat("Papyrus", (0.30, 0.50, 0.15), 0.75)
mat_dark_stone = make_mat("DarkStone", (0.35, 0.30, 0.22), 0.8)
mat_palm_trunk = make_mat("PalmTrunk", (0.30, 0.20, 0.10), 0.9)
mat_palm_leaf = make_mat("PalmLeaf", (0.15, 0.35, 0.08), 0.7)
mat_wood = make_mat("Wood", (0.35, 0.2, 0.1), 0.8)
mat_dock = make_mat("Dock", (0.3, 0.18, 0.08), 0.85)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)

bpy.ops.mesh.primitive_uv_sphere_add(radius=13, segments=64, ring_count=32, location=(0, 0, -1.6))
island = bpy.context.active_object
island.scale = (1, 0.9, 0.16)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_golden_sand)

bpy.ops.mesh.primitive_torus_add(major_radius=12.5, minor_radius=1.3, location=(0, 0, -0.25))
beach = bpy.context.active_object
beach.scale.z = 0.12
beach.data.materials.append(mat_sand)

bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=4, radius2=0, depth=5, location=(0, 0, 2.8))
pyramid = bpy.context.active_object
pyramid.rotation_euler.z = math.radians(45)
pyramid.data.materials.append(mat_limestone)

bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.6, radius2=0, depth=0.8, location=(0, 0, 5.5))
cap = bpy.context.active_object
cap.rotation_euler.z = math.radians(45)
cap.data.materials.append(mat_gold)

obelisk_positions = [(-4, -3, 0.4), (4, -3, 0.4), (-3, 4, 0.4), (3, 4, 0.4)]
for ox, oy, oz in obelisk_positions:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(ox, oy, oz + 1.5))
    ob = bpy.context.active_object
    ob.scale = (0.25, 0.25, 1.5)
    ob.data.materials.append(mat_dark_stone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.3, radius2=0, depth=0.5, location=(ox, oy, oz + 3.25))
    tip = bpy.context.active_object
    tip.rotation_euler.z = math.radians(45)
    tip.data.materials.append(mat_gold)

for i in range(3):
    for side in [-1, 1]:
        x = -1.5 + i * 1.5
        y = -4 + side * 0.8
        bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=2.5, location=(x, y - 1, 1.6))
        col = bpy.context.active_object
        col.data.materials.append(mat_limestone)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(x, y - 1, 3.0))
        lotus = bpy.context.active_object
        lotus.scale.z = 0.5
        lotus.data.materials.append(mat_turquoise)

building_data = [
    (5, 2, 0.5, 1.5, 1.2, 0.8),
    (-5, 2, 0.5, 1.3, 1.0, 0.9),
    (6, -2, 0.4, 1.0, 0.9, 0.7),
    (-6, -1, 0.4, 1.2, 1.0, 0.8),
    (3, 5, 0.35, 1.0, 0.8, 0.7),
    (-3, -5, 0.3, 1.1, 0.9, 0.7),
    (7, 0, 0.3, 0.9, 0.8, 0.6),
    (-4, 5, 0.35, 1.0, 1.0, 0.8),
]
for bx, by, bz, sx, sy, sz in building_data:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz))
    b = bpy.context.active_object
    b.scale = (sx, sy, sz)
    b.data.materials.append(mat_limestone)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz + sz + 0.03))
    trim = bpy.context.active_object
    trim.scale = (sx + 0.05, sy + 0.05, 0.03)
    trim.data.materials.append(mat_turquoise)

palm_positions = [
    (7, 4, 0.25), (-7, 3, 0.25), (8, -3, 0.15), (-8, -2, 0.15),
    (4, 7, 0.15), (-4, -7, 0.15), (9, 1, 0.1), (-6, 6, 0.15),
    (2, -7, 0.15), (-9, 0, 0.1), (6, -5, 0.1), (-3, 7, 0.15)
]
for tx, ty, tz in palm_positions:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2.5, location=(tx, ty, tz + 1.25))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_palm_trunk)
    for angle in range(0, 360, 60):
        bpy.ops.mesh.primitive_cone_add(radius1=0.8, radius2=0.05, depth=0.1, location=(tx, ty, tz + 2.7))
        leaf = bpy.context.active_object
        leaf.scale = (0.3, 1.2, 1)
        leaf.rotation_euler = (math.radians(40), 0, math.radians(angle))
        leaf.data.materials.append(mat_palm_leaf)

for i in range(20):
    angle = math.radians(i * 18)
    r = 11 + (i % 3) * 0.3
    px = r * math.cos(angle)
    py = r * math.sin(angle)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.2, location=(px, py, 0.3))
    reed = bpy.context.active_object
    reed.rotation_euler.x = math.radians(5 + i % 8)
    reed.data.materials.append(mat_papyrus)

bpy.ops.mesh.primitive_cube_add(size=1, location=(11, 0, -0.05))
dock = bpy.context.active_object
dock.scale = (3, 0.8, 0.1)
dock.data.materials.append(mat_dock)
for dx in [-1.5, 0, 1.5]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.5, location=(11 + dx, 0, -0.5))
    post = bpy.context.active_object
    post.data.materials.append(mat_wood)

bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.5, location=(12.5, 0, 1.0))
fp = bpy.context.active_object
fp.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(12.5, 0.3, 2.0))
fl = bpy.context.active_object
fl.scale = (0.4, 0.6, 1)
fl.data.materials.append(mat_turquoise)

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
sky.sun_direction = Vector((-0.3, 0.1, 0.12)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 2.0

bpy.ops.object.light_add(type='SUN', location=(-10, 3, 5))
sun = bpy.context.active_object
sun.data.energy = 5
sun.data.color = (1.0, 0.72, 0.25)
sun.rotation_euler = (math.radians(72), math.radians(-10), math.radians(20))

bpy.ops.object.light_add(type='AREA', location=(10, -5, 6))
fill = bpy.context.active_object
fill.data.energy = 30
fill.data.color = (1.0, 0.80, 0.55)
fill.data.size = 5

bpy.ops.object.camera_add(location=(12, -6, 3))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 3.0)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 32

bpy.ops.render.render(write_still=True)
print("Egypt render complete!")
