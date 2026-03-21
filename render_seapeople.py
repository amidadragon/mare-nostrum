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
scene.render.filepath = "C:/Users/amida/mare-nostrum/cutscenes/faction_seapeople.png"
scene.render.image_settings.file_format = 'PNG'

def make_mat(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

mat_dark_water = make_mat("DarkWater", (0.02, 0.06, 0.18), 0.05)
mat_hull = make_mat("Hull", (0.2, 0.12, 0.06), 0.8)
mat_deck = make_mat("Deck", (0.35, 0.22, 0.1), 0.75)
mat_sail = make_mat("Sail", (0.7, 0.65, 0.55), 0.9)
mat_shield_red = make_mat("ShieldRed", (0.6, 0.08, 0.05), 0.6)
mat_shield_blue = make_mat("ShieldBlue", (0.05, 0.1, 0.5), 0.6)
mat_serpent = make_mat("Serpent", (0.15, 0.08, 0.03), 0.7)
mat_gold = make_mat("Gold", (0.85, 0.65, 0.1), 0.3)
mat_rope = make_mat("Rope", (0.4, 0.3, 0.15), 0.9)
mat_crew = make_mat("Crew", (0.5, 0.35, 0.2), 0.8)
mat_foam = make_mat("Foam", (0.85, 0.9, 0.95), 0.4)
mat_mast = make_mat("Mast", (0.3, 0.18, 0.08), 0.85)

# Ocean plane with wave modifier
bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, 0))
ocean = bpy.context.active_object
ocean.name = "Ocean"
ocean.data.materials.append(mat_dark_water)
# Subdivide for waves
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.subdivide(number_cuts=60)
bpy.ops.object.mode_set(mode='OBJECT')
wave1 = ocean.modifiers.new("Wave1", 'WAVE')
wave1.height = 0.6
wave1.width = 2.5
wave1.speed = 0.8
wave1.narrowness = 1.5
wave2 = ocean.modifiers.new("Wave2", 'WAVE')
wave2.height = 0.3
wave2.width = 1.5
wave2.speed = 1.2
wave2.start_position_x = 5
wave2.start_position_y = 3
wave2.narrowness = 2.0

# White caps / foam patches
for fx, fy in [(-3, 5), (6, -4), (-8, 8), (10, 2), (-5, -7), (12, -6), (-10, 3)]:
    bpy.ops.mesh.primitive_plane_add(size=1.5, location=(fx, fy, 0.35))
    foam = bpy.context.active_object
    foam.scale = (1.5, 0.4, 1)
    foam.rotation_euler.z = math.radians(fx * 15)
    foam.data.materials.append(mat_foam)

# === MAIN LONGSHIP ===
def make_longship(loc, rot_z, scale_factor=1.0, name="MainShip"):
    sx, sy, sz = loc
    # Hull - elongated stretched cube
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, sz + 0.4))
    hull = bpy.context.active_object
    hull.name = name + "_Hull"
    hull.scale = (6 * scale_factor, 1.2 * scale_factor, 0.5 * scale_factor)
    hull.rotation_euler.z = math.radians(rot_z)
    hull.data.materials.append(mat_hull)

    cos_r = math.cos(math.radians(rot_z))
    sin_r = math.sin(math.radians(rot_z))

    # Deck
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, sz + 0.7))
    deck = bpy.context.active_object
    deck.name = name + "_Deck"
    deck.scale = (5.5 * scale_factor, 1.0 * scale_factor, 0.05 * scale_factor)
    deck.rotation_euler.z = math.radians(rot_z)
    deck.data.materials.append(mat_deck)

    # Mast
    mast_x = sx + cos_r * 0.5 * scale_factor
    mast_y = sy + sin_r * 0.5 * scale_factor
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08 * scale_factor, depth=5 * scale_factor, location=(mast_x, mast_y, sz + 3))
    mast = bpy.context.active_object
    mast.name = name + "_Mast"
    mast.data.materials.append(mat_mast)

    # Yard (horizontal beam)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05 * scale_factor, depth=3 * scale_factor, location=(mast_x, mast_y, sz + 4.2))
    yard = bpy.context.active_object
    yard.name = name + "_Yard"
    yard.rotation_euler.y = math.radians(90)
    yard.rotation_euler.z = math.radians(rot_z)
    yard.data.materials.append(mat_mast)

    # Square sail
    bpy.ops.mesh.primitive_plane_add(size=1, location=(mast_x, mast_y, sz + 3.2))
    sail = bpy.context.active_object
    sail.name = name + "_Sail"
    sail.scale = (2.8 * scale_factor, 1, 2.0 * scale_factor)
    sail.rotation_euler.z = math.radians(rot_z)
    sail.data.materials.append(mat_sail)

    # Dragon/serpent prow
    prow_dist = 6.2 * scale_factor
    prow_x = sx + cos_r * prow_dist
    prow_y = sy + sin_r * prow_dist
    # Neck
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15 * scale_factor, depth=2.5 * scale_factor, location=(prow_x, prow_y, sz + 1.8))
    neck = bpy.context.active_object
    neck.name = name + "_Prow"
    neck.rotation_euler.y = math.radians(-25)
    neck.rotation_euler.z = math.radians(rot_z)
    neck.data.materials.append(mat_serpent)
    # Head
    head_x = prow_x + cos_r * 0.8 * scale_factor
    head_y = prow_y + sin_r * 0.8 * scale_factor
    bpy.ops.mesh.primitive_cone_add(radius1=0.3 * scale_factor, radius2=0.05 * scale_factor, depth=0.8 * scale_factor, location=(head_x, head_y, sz + 3.2))
    head = bpy.context.active_object
    head.name = name + "_Head"
    head.rotation_euler.y = math.radians(-60)
    head.rotation_euler.z = math.radians(rot_z)
    head.data.materials.append(mat_serpent)
    # Eye (gold)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06 * scale_factor, location=(head_x - sin_r * 0.15, head_y + cos_r * 0.15, sz + 3.3))
    eye = bpy.context.active_object
    eye.data.materials.append(mat_gold)

    # Shields along sides
    for i in range(8):
        offset_along = (-4 + i * 1.1) * scale_factor
        for side in [-1, 1]:
            shield_x = sx + cos_r * offset_along - sin_r * (1.25 * scale_factor * side)
            shield_y = sy + sin_r * offset_along + cos_r * (1.25 * scale_factor * side)
            bpy.ops.mesh.primitive_cylinder_add(radius=0.25 * scale_factor, depth=0.05 * scale_factor, location=(shield_x, shield_y, sz + 0.9))
            s = bpy.context.active_object
            s.rotation_euler.x = math.radians(90)
            s.rotation_euler.z = math.radians(rot_z)
            s.data.materials.append(mat_shield_red if (i + side) % 2 == 0 else mat_shield_blue)

    # Crew figures on deck
    for i in range(6):
        cx = sx + cos_r * (-3 + i * 1.2) * scale_factor
        cy = sy + sin_r * (-3 + i * 1.2) * scale_factor
        bpy.ops.mesh.primitive_cylinder_add(radius=0.1 * scale_factor, depth=0.6 * scale_factor, location=(cx, cy, sz + 1.1))
        crew = bpy.context.active_object
        crew.data.materials.append(mat_crew)
        # Head
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08 * scale_factor, location=(cx, cy, sz + 1.5))
        ch = bpy.context.active_object
        ch.data.materials.append(mat_crew)

    # Stern tail (curving up)
    stern_dist = -6.0 * scale_factor
    stern_x = sx + cos_r * stern_dist
    stern_y = sy + sin_r * stern_dist
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1 * scale_factor, depth=2 * scale_factor, location=(stern_x, stern_y, sz + 1.5))
    stern = bpy.context.active_object
    stern.rotation_euler.y = math.radians(20)
    stern.rotation_euler.z = math.radians(rot_z)
    stern.data.materials.append(mat_hull)

# Main flagship - large
make_longship((0, 0, 0), 15, scale_factor=1.0, name="Flagship")

# Fleet ships - smaller, surrounding
fleet_positions = [
    (-12, 8, 0, -10, 0.55),
    (10, 12, 0, 25, 0.5),
    (-15, -6, 0, 5, 0.5),
    (14, -8, 0, 20, 0.45),
    (-8, -14, 0, -5, 0.45),
    (6, -15, 0, 30, 0.4),
    (-18, 2, 0, -15, 0.4),
    (18, 5, 0, 10, 0.4),
]
for i, (fx, fy, fz, frot, fscale) in enumerate(fleet_positions):
    make_longship((fx, fy, fz), frot, scale_factor=fscale, name=f"Fleet{i}")

# === SKY / WORLD ===
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
bg = nt.nodes.new('ShaderNodeBackground')
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'HOSEK_WILKIE'
sky.turbidity = 8.0  # Stormy
sky.ground_albedo = 0.2
sky.sun_direction = Vector((0.3, 0.2, 0.08)).normalized()
output = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(sky.outputs[0], bg.inputs[0])
nt.links.new(bg.outputs[0], output.inputs[0])
bg.inputs["Strength"].default_value = 0.8  # Darker for storm

# Lighting - dramatic and moody
bpy.ops.object.light_add(type='SUN', location=(10, 5, 8))
sun = bpy.context.active_object
sun.data.energy = 3
sun.data.color = (0.7, 0.7, 0.8)
sun.rotation_euler = (math.radians(75), math.radians(10), math.radians(-20))

bpy.ops.object.light_add(type='AREA', location=(-5, -3, 4))
fill = bpy.context.active_object
fill.data.energy = 40
fill.data.color = (0.6, 0.65, 0.8)
fill.data.size = 8

# Rim light from behind for drama
bpy.ops.object.light_add(type='SPOT', location=(-10, 5, 3))
rim = bpy.context.active_object
rim.data.energy = 200
rim.data.color = (0.8, 0.85, 1.0)
rim.data.spot_size = math.radians(60)
rim.rotation_euler = (math.radians(70), 0, math.radians(150))

# Camera - low angle from water level looking up at ship
bpy.ops.object.camera_add(location=(8, -6, 0.5))
cam = bpy.context.active_object
scene.camera = cam
direction = Vector((0, 0, 2.5)) - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 24  # Wide angle for drama

bpy.ops.render.render(write_still=True)
print("Sea People render complete!")
