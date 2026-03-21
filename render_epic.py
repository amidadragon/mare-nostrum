import bpy, math, os, random
random.seed(7)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
for w in list(bpy.data.worlds): bpy.data.worlds.remove(w)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'GPU'
scene.cycles.samples = 128
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'CUDA'
prefs.get_devices()
for d in prefs.devices: d.use = True

# Sky
world = bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.sun_elevation = math.radians(8)
sky.sun_rotation = math.radians(220)
out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
bg.inputs[1].default_value = 1.5
nt.links.new(bg.outputs[0], out.inputs[0])

def mat(name, col, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = col
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = rough
    return m

mat_ocean = mat("Ocean", (0.02, 0.12, 0.22, 1), 0.05)
mat_marble = mat("Marble", (0.92, 0.88, 0.78, 1), 0.3)
mat_roof = mat("Roof", (0.7, 0.35, 0.2, 1), 0.8)
mat_wood = mat("Wood", (0.4, 0.28, 0.15, 1), 0.85)
mat_stone = mat("Stone", (0.6, 0.55, 0.48, 1), 0.9)
mat_leaf = mat("Leaf", (0.18, 0.42, 0.12, 1), 0.9)
mat_leaf2 = mat("Leaf2", (0.25, 0.5, 0.18, 1), 0.9)
mat_trunk = mat("Trunk", (0.32, 0.22, 0.12, 1), 0.9)
mat_sand = mat("Sand", (0.82, 0.72, 0.52, 1), 0.95)
mat_flag = mat("Flag", (0.75, 0.15, 0.12, 1), 0.8)
mat_sail = mat("Sail", (0.95, 0.9, 0.8, 1), 0.9)
mat_gold = mat("Gold", (0.85, 0.65, 0.15, 1), 0.2)

# Ocean
bpy.ops.mesh.primitive_plane_add(size=500, location=(0, 0, -0.3))
o = bpy.context.active_object
o.data.materials.append(mat_ocean)
mod = o.modifiers.new("W", 'WAVE')
mod.height = 0.15; mod.width = 3; mod.speed = 0.3
s = o.modifiers.new("S", 'SUBSURF')
s.levels = 3; s.render_levels = 4

# Island
bpy.ops.mesh.primitive_uv_sphere_add(radius=12, segments=48, ring_count=24, location=(0, 0, 0))
isl = bpy.context.active_object
isl.scale = (1, 0.85, 0.22)
mat_isl = bpy.data.materials.new("Island")
mat_isl.use_nodes = True
n = mat_isl.node_tree.nodes
cr = n.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.35
cr.color_ramp.elements[0].color = (0.65, 0.55, 0.35, 1)
cr.color_ramp.elements[1].position = 0.55
cr.color_ramp.elements[1].color = (0.35, 0.5, 0.2, 1)
sep = n.new('ShaderNodeSeparateXYZ')
tc = n.new('ShaderNodeTexCoord')
mat_isl.node_tree.links.new(tc.outputs['Object'], sep.inputs[0])
mat_isl.node_tree.links.new(sep.outputs['Z'], cr.inputs[0])
mat_isl.node_tree.links.new(cr.outputs[0], n["Principled BSDF"].inputs["Base Color"])
n["Principled BSDF"].inputs["Roughness"].default_value = 0.85
isl.data.materials.append(mat_isl)

# Beach
bpy.ops.mesh.primitive_torus_add(major_radius=11.5, minor_radius=1.2, location=(0, 0, -0.15))
b = bpy.context.active_object
b.scale = (1, 0.85, 0.18)
b.data.materials.append(mat_sand)

# Temple
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.6))
bpy.context.active_object.scale = (3, 2, 0.3)
bpy.context.active_object.data.materials.append(mat_marble)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.5))
bpy.context.active_object.scale = (2.5, 1.5, 1.2)
bpy.context.active_object.data.materials.append(mat_marble)
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.2, depth=1.2, location=(0, 0, 2.8))
r = bpy.context.active_object
r.scale = (1.3, 0.8, 0.5)
r.rotation_euler = (0, 0, math.radians(45))
r.data.materials.append(mat_roof)
for i in range(6):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2, location=(-2.2+i*0.88, -1.6, 1.3))
    bpy.context.active_object.data.materials.append(mat_marble)

# Houses
for x, y, z, sx, sy, sz in [(-4,3,0.8,1.3,1,1),(3.5,-2,0.7,1,0.8,0.9),(-3,-3.5,0.65,0.9,0.9,0.85),(5,3,0.6,1.1,0.7,0.8),(-5.5,-1,0.55,0.8,0.8,0.75),(2,4.5,0.6,1,0.8,0.8)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    bpy.context.active_object.scale = (sx, sy, sz)
    bpy.context.active_object.data.materials.append(mat_stone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=max(sx,sy)*1.1, depth=0.6, location=(x, y, z+sz+0.2))
    bpy.context.active_object.rotation_euler = (0, 0, math.radians(45))
    bpy.context.active_object.data.materials.append(mat_roof)

# Fort
bpy.ops.mesh.primitive_cube_add(size=1, location=(6, -5, 1))
bpy.context.active_object.scale = (2, 1.5, 1.5)
bpy.context.active_object.data.materials.append(mat_stone)
for tx, ty in [(5,-4),(7,-4),(5,-6),(7,-6)]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=2.5, location=(tx, ty, 1.5))
    bpy.context.active_object.data.materials.append(mat_stone)

# Trees
for i in range(10):
    a = random.uniform(0, math.pi*2)
    d = random.uniform(5, 9)
    tx, ty = math.cos(a)*d, math.sin(a)*d*0.85
    bpy.ops.mesh.primitive_cone_add(radius1=0.45, depth=3, location=(tx, ty, 1.8))
    bpy.context.active_object.data.materials.append(mat_leaf if i%2==0 else mat_leaf2)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.2, location=(tx, ty, 0.5))
    bpy.context.active_object.data.materials.append(mat_trunk)
for i in range(5):
    a = random.uniform(0, math.pi*2)
    d = random.uniform(4, 7)
    tx, ty = math.cos(a)*d, math.sin(a)*d*0.85
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(tx, ty, 1.5))
    bpy.context.active_object.scale = (1, 1, 0.7)
    bpy.context.active_object.data.materials.append(mat_leaf2)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1.2, location=(tx, ty, 0.5))
    bpy.context.active_object.data.materials.append(mat_trunk)

# Flag
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=3.5, location=(0.5, -2.5, 2))
bpy.context.active_object.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(1, -2.5, 3.2))
f = bpy.context.active_object
f.scale = (0.7, 0.01, 0.4)
f.rotation_euler = (0, 0, math.radians(15))
f.data.materials.append(mat_flag)

# Dock + boat
bpy.ops.mesh.primitive_cube_add(size=1, location=(-10, 0, 0.15))
bpy.context.active_object.scale = (3, 0.6, 0.08)
bpy.context.active_object.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_cube_add(size=1, location=(-12, 1, 0))
bpy.context.active_object.scale = (1.2, 0.4, 0.2)
bpy.context.active_object.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=1.8, location=(-12, 1, 1))
bpy.context.active_object.data.materials.append(mat_wood)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-11.7, 1, 1.2))
bpy.context.active_object.scale = (0.6, 0.01, 0.5)
bpy.context.active_object.data.materials.append(mat_sail)

# Sun
bpy.ops.object.light_add(type='SUN', location=(20, -10, 12))
s = bpy.context.active_object
s.data.energy = 5
s.data.color = (1, 0.85, 0.6)
s.rotation_euler = (math.radians(55), math.radians(10), math.radians(40))
bpy.ops.object.light_add(type='AREA', location=(-15, 8, 8))
bpy.context.active_object.data.energy = 200
bpy.context.active_object.data.color = (0.6, 0.7, 0.9)
bpy.context.active_object.data.size = 10

# Camera
bpy.ops.object.camera_add(location=(20, -14, 11))
cam = bpy.context.active_object
scene.camera = cam
t = cam.constraints.new(type='TRACK_TO')
t.target = isl
t.track_axis = 'TRACK_NEGATIVE_Z'
t.up_axis = 'UP_Y'

# Render
output = os.path.join(os.path.expanduser("~"), "mare-nostrum", "cutscene_epic.png")
scene.render.filepath = output
bpy.ops.render.render(write_still=True)
print("RENDERED:", output)
