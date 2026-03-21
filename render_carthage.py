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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_carthage.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_sand = make_mat("Sand", (0.82, 0.72, 0.50), 0.9)
mat_desert = make_mat("Desert", (0.75, 0.60, 0.38), 0.85)
mat_water = make_mat("Water", (0.04, 0.12, 0.30), 0.05)
mat_clay = make_mat("Clay", (0.70, 0.52, 0.35), 0.8)
mat_white_wall = make_mat("WhiteWall", (0.88, 0.85, 0.78), 0.7)
mat_purple = make_mat("Purple", (0.35, 0.05, 0.45), 0.6)
mat_palm_trunk = make_mat("PalmTrunk", (0.30, 0.20, 0.10), 0.9)
mat_palm_leaf = make_mat("PalmLeaf", (0.15, 0.35, 0.08), 0.7)
mat_wood = make_mat("Wood", (0.35, 0.2, 0.1), 0.8)
mat_dock = make_mat("Dock", (0.3, 0.18, 0.08), 0.85)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)
mat_red_cloth = make_mat("RedCloth", (0.6, 0.15, 0.1), 0.7)
mat_silver = make_mat("Silver", (0.75, 0.75, 0.78), 0.2)
mat_ship_hull = make_mat("ShipHull", (0.25, 0.15, 0.08), 0.8)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)

bpy.ops.mesh.primitive_uv_sphere_add(radius=14, segments=64, ring_count=32, location=(0, 0, -1.8))
island = bpy.context.active_object
island.scale = (1, 0.8, 0.15)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_desert)

bpy.ops.mesh.primitive_torus_add(major_radius=13, minor_radius=1.5, location=(0, 0, -0.3))
beach = bpy.context.active_object
beach.scale.z = 0.12
beach.data.materials.append(mat_sand)

building_positions = [
    (0, 0, 0.6, 2.0, 1.5, 1.5),
    (3.5, 2, 0.5, 1.2, 1.0, 1.2),
    (-3, 3, 0.5, 1.5, 1.2, 1.0),
    (4, -2.5, 0.4, 1.0, 1.0, 0.8),
    (-4, -2, 0.4, 1.3, 1.0, 1.0),
    (-2, -4, 0.35, 1.0, 0.8, 0.9),
    (2, -4, 0.35, 1.1, 0.9, 0.8),
    (5.5, 0, 0.35, 1.0, 1.0, 0.9),
]
for i, (bx, by, bz, sx, sy, sz) in enumerate(building_positions):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz))
    b = bpy.context.active_object
    b.scale = (sx, sy, sz)
    b.data.materials.append(mat_white_wall if i % 2 == 0 else mat_clay)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bz + sz + 0.05))
    rf = bpy.context.active_object
    rf.scale = (sx + 0.1, sy + 0.1, 0.05)
    rf.data.materials.append(mat_clay)

stall_positions = [(1.5, 1, 0.4), (-1, 1.5, 0.4), (0.5, -1.5, 0.35), (-1.5, -1, 0.35)]
for i, (sx, sy, sz) in enumerate(stall_positions):
    for dx in [-0.4, 0.4]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=1.2, location=(sx + dx, sy, sz + 0.6))
        p = bpy.context.active_object
        p.data.materials.append(mat_wood)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(sx, sy, sz + 1.2))
    c = bpy.context.active_object
    c.scale = (0.6, 0.4, 1)
    c.data.materials.append(mat_red_cloth if i % 2 == 0 else mat_purple)

palm_positions = [
    (6, 4, 0.3), (-6, 5, 0.3), (7, -3, 0.2), (-7, -2, 0.2),
    (3, 6, 0.2), (-3, -6, 0.2), (8, 2, 0.15), (-5, -5, 0.2),
    (-8, 1, 0.15), (5, -5, 0.15), (9, -1, 0.1), (-2, 7, 0.15)
]
for i, (tx, ty, tz) in enumerate(palm_positions):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2.5, location=(tx, ty, tz + 1.25))
    trunk = bpy.context.active_object
    trunk.rotation_euler.x = math.radians(3)
    trunk.data.materials.append(mat_palm_trunk)
    for angle in range(0, 360, 60):
        bpy.ops.mesh.primitive_cone_add(radius1=0.8, radius2=0.05, depth=0.1, location=(tx, ty, tz + 2.7))
        leaf = bpy.context.active_object
        leaf.scale = (0.3, 1.2, 1)
        leaf.rotation_euler = (math.radians(40), 0, math.radians(angle))
        leaf.data.materials.append(mat_palm_leaf)

banner_spots = [(1, 3, 1.8), (-2, 2, 1.5), (3, -1, 1.5)]
for bx, by, bz in banner_spots:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=3, location=(bx, by, bz))
    pole = bpy.context.active_object
    pole.data.materials.append(mat_gold)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(bx, by + 0.3, bz + 1.2))
    banner = bpy.context.active_object
    banner.scale = (0.5, 0.8, 1)
    banner.data.materials.append(mat_purple)

bpy.ops.mesh.primitive_torus_add(major_radius=0.4, minor_radius=0.08, location=(0, -1.51, 1.5))
crescent = bpy.context.active_object
crescent.rotation_euler.x = math.radians(90)
crescent.data.materials.append(mat_silver)

bpy.ops.mesh.primitive_cube_add(size=1, location=(10, -2, -0.05))
dock = bpy.context.active_object
dock.scale = (4, 1, 0.1)
dock.data.materials.append(mat_dock)
for dx in [-2, 0, 2]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.5, location=(10 + dx, -2, -0.5))
    post = bpy.context.active_object
    post.data.materials.append(mat_wood)

ship_positions = [(13, -3, -0.2), (12, 2, -0.2), (14, 0, -0.2)]
for sx, sy, sz in ship_positions:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, sz))
    hull = bpy.context.active_object
    hull.scale = (1.5, 0.4, 0.3)
    hull.data.materials.append(mat_ship_hull)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.5, location=(sx, sy, sz + 1.25))
    mast = bpy.context.active_object
    mast.data.materials.append(mat_wood)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(sx, sy + 0.3, sz + 1.5))
    sail = bpy.context.active_object
    sail.scale = (0.6, 1.0, 1)
    sail.data.materials.append(mat_white_wall)

bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.5, location=(10, -3, 1.0))
fp = bpy.context.active_object
fp.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(10, -2.7, 2.0))
fl = bpy.context.active_object
fl.scale = (0.4, 0.6, 1)
fl.data.materials.append(mat_purple)

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 4.0
sky.ground_albedo = 0.4
sky.sun_direction = Vector((0.4, 0.2, 0.2)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.8

bpy.ops.object.light_add(type='SUN', location=(10, 5, 8))
sun = bpy.context.active_object
sun.data.energy = 5
sun.data.color = (1.0, 0.65, 0.30)
sun.rotation_euler = (math.radians(60), math.radians(10), math.radians(-20))

bpy.ops.object.light_add(type='AREA', location=(-8, -5, 6))
fill = bpy.context.active_object
fill.data.energy = 40
fill.data.color = (1.0, 0.85, 0.7)
fill.data.size = 6

bpy.ops.object.camera_add(location=(18, -12, 8))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((2, 0, 0.5)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 24

bpy.ops.render.render(write_still=True)
print("Carthage render complete!")
