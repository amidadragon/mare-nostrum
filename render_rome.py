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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_rome.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_marble = make_mat("Marble", (0.92, 0.90, 0.85), 0.15)
mat_grass = make_mat("Grass", (0.25, 0.45, 0.12), 0.8)
mat_sand = make_mat("Sand", (0.76, 0.65, 0.45), 0.9)
mat_water = make_mat("Water", (0.05, 0.15, 0.35), 0.05)
mat_red_roof = make_mat("RedRoof", (0.6, 0.15, 0.08), 0.7)
mat_stone = make_mat("Stone", (0.55, 0.50, 0.42), 0.85)
mat_cypress = make_mat("Cypress", (0.08, 0.22, 0.06), 0.8)
mat_trunk = make_mat("Trunk", (0.25, 0.15, 0.08), 0.9)
mat_red_banner = make_mat("RedBanner", (0.7, 0.05, 0.05), 0.6)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)
mat_wood = make_mat("Wood", (0.35, 0.2, 0.1), 0.8)
mat_dock = make_mat("Dock", (0.3, 0.18, 0.08), 0.85)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.3))
ocean = bpy.context.active_object
ocean.data.materials.append(mat_water)

bpy.ops.mesh.primitive_uv_sphere_add(radius=12, segments=64, ring_count=32, location=(0, 0, -1.5))
island = bpy.context.active_object
island.scale = (1, 1, 0.18)
bpy.ops.object.transform_apply(scale=True)
island.data.materials.append(mat_grass)

bpy.ops.mesh.primitive_torus_add(major_radius=11.5, minor_radius=1.2, location=(0, 0, -0.2))
beach = bpy.context.active_object
beach.scale.z = 0.15
beach.data.materials.append(mat_sand)

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.8))
platform = bpy.context.active_object
platform.scale = (4, 3, 0.3)
platform.data.materials.append(mat_marble)

for i in range(4):
    for j in range(2):
        x = -2.5 + i * 1.7
        y = -1.8 + j * 3.6
        bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=3, location=(x, y, 2.3))
        col = bpy.context.active_object
        col.data.materials.append(mat_marble)

bpy.ops.mesh.primitive_cone_add(radius1=4.5, radius2=0, depth=2, vertices=4, location=(0, 0, 4.2))
roof = bpy.context.active_object
roof.scale = (1, 0.8, 0.5)
roof.rotation_euler.z = math.radians(45)
roof.data.materials.append(mat_red_roof)

house_positions = [
    (5, 3, 0.5), (6.5, -2, 0.4), (-5, 4, 0.4),
    (-6, -3, 0.3), (3, -5, 0.3), (-3, 5, 0.4),
    (7, 1, 0.3), (-4, -5, 0.3)
]
for i, (hx, hy, hz) in enumerate(house_positions):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(hx, hy, hz))
    h = bpy.context.active_object
    h.scale = (0.8, 0.6, 0.6)
    h.data.materials.append(mat_stone)
    bpy.ops.mesh.primitive_cone_add(radius1=1.0, radius2=0, depth=0.6, vertices=4, location=(hx, hy, hz + 0.6))
    r = bpy.context.active_object
    r.rotation_euler.z = math.radians(45)
    r.data.materials.append(mat_red_roof)

cypress_positions = [
    (2, 5, 0.5), (-2, 6, 0.4), (4, -4, 0.3), (-5, -1, 0.4),
    (1, -6, 0.3), (-7, 2, 0.3), (8, -1, 0.2), (-3, -6, 0.2),
    (6, 4, 0.3), (-6, 5, 0.3), (3, 7, 0.2), (-1, -7, 0.2)
]
for i, (tx, ty, tz) in enumerate(cypress_positions):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.5, location=(tx, ty, tz + 0.75))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_trunk)
    bpy.ops.mesh.primitive_cone_add(radius1=0.4, radius2=0, depth=2.5, location=(tx, ty, tz + 2.7))
    foliage = bpy.context.active_object
    foliage.data.materials.append(mat_cypress)

for i in range(8):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.5 + i * 0.9, 0, 0.15))
    p = bpy.context.active_object
    p.scale = (0.4, 0.3, 0.02)
    p.data.materials.append(mat_stone)

bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=4, location=(2, 2, 2.5))
pole = bpy.context.active_object
pole.data.materials.append(mat_gold)
bpy.ops.mesh.primitive_plane_add(size=1, location=(2, 2.4, 3.8))
banner = bpy.context.active_object
banner.scale = (0.6, 0.9, 1)
banner.rotation_euler.x = math.radians(10)
banner.data.materials.append(mat_red_banner)

bpy.ops.mesh.primitive_cube_add(size=1, location=(10, 0, 0.0))
dock = bpy.context.active_object
dock.scale = (3, 0.8, 0.1)
dock.data.materials.append(mat_dock)
for dx in [-1.5, 0, 1.5]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.5, location=(10 + dx, 0, -0.5))
    post = bpy.context.active_object
    post.data.materials.append(mat_wood)

bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=2.5, location=(11.5, 0, 1.0))
fp = bpy.context.active_object
fp.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(11.5, 0.3, 2.0))
fl = bpy.context.active_object
fl.scale = (0.4, 0.6, 1)
fl.data.materials.append(mat_red_banner)

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 3.0
sky.ground_albedo = 0.3
sky.sun_direction = Vector((0.5, 0.3, 0.15)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 1.5

bpy.ops.object.light_add(type='SUN', location=(10, 5, 8))
sun = bpy.context.active_object
sun.data.energy = 4
sun.data.color = (1.0, 0.75, 0.45)
sun.rotation_euler = (math.radians(65), math.radians(15), math.radians(-30))

bpy.ops.object.light_add(type='AREA', location=(-8, -5, 6))
fill = bpy.context.active_object
fill.data.energy = 50
fill.data.color = (0.8, 0.85, 1.0)
fill.data.size = 5

bpy.ops.object.camera_add(location=(8, -8, 1.5))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 3.5)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 28

bpy.ops.render.render(write_still=True)
print("Rome render complete!")
