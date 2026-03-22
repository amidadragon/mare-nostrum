
import bpy, sys, os, math, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)

argv = sys.argv[sys.argv.index("--") + 1:]
model_path = argv[0]
output_dir = argv[1]
frame_size = int(argv[2]) if len(argv) > 2 else 64
num_directions = int(argv[3]) if len(argv) > 3 else 8

# Import model
ext = os.path.splitext(model_path)[1].lower()
if ext in ('.glb', '.gltf'):
    bpy.ops.import_scene.gltf(filepath=model_path)
elif ext == '.obj':
    bpy.ops.wm.obj_import(filepath=model_path)
elif ext == '.fbx':
    bpy.ops.import_scene.fbx(filepath=model_path)
else:
    print("Unknown format: " + ext)
    sys.exit(1)

# Center and scale
imported = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if imported:
    min_co = [float('inf')] * 3
    max_co = [float('-inf')] * 3
    for obj in imported:
        for v in obj.bound_box:
            world_v = obj.matrix_world @ mathutils.Vector(v)
            for i in range(3):
                min_co[i] = min(min_co[i], world_v[i])
                max_co[i] = max(max_co[i], world_v[i])
    center = [(min_co[i] + max_co[i]) / 2 for i in range(3)]
    size = max(max_co[i] - min_co[i] for i in range(3))
    scale_factor = 1.5 / max(size, 0.001)
    for obj in imported:
        obj.location.x -= center[0]
        obj.location.y -= center[1]
        obj.location.z -= center[2]
        obj.scale *= scale_factor

# Camera
cam_data = bpy.data.cameras.new("IsoCam")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 3.0
cam = bpy.data.objects.new("IsoCam", cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# Lighting
sun = bpy.data.lights.new("Sun", type='SUN')
sun.energy = 3.0
sun_obj = bpy.data.objects.new("Sun", sun)
sun_obj.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
bpy.context.scene.collection.objects.link(sun_obj)

fill = bpy.data.lights.new("Fill", type='SUN')
fill.energy = 0.8
fill_obj = bpy.data.objects.new("Fill", fill)
fill_obj.rotation_euler = (math.radians(-30), math.radians(-45), 0)
bpy.context.scene.collection.objects.link(fill_obj)

# Render settings - EEVEE for speed
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = frame_size
scene.render.resolution_y = frame_size
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

os.makedirs(output_dir, exist_ok=True)
dist = 7.07
elev = 4.08

for i in range(num_directions):
    angle = (i / num_directions) * 2 * math.pi
    cam.location.x = math.cos(angle + math.pi/4) * dist
    cam.location.y = math.sin(angle + math.pi/4) * dist
    cam.location.z = elev

    direction = mathutils.Vector((0, 0, 0)) - cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()

    scene.render.filepath = os.path.join(output_dir, "dir_%02d.png" % i)
    bpy.ops.render.render(write_still=True)
    print("  Rendered direction %d/%d" % (i + 1, num_directions))

print("Render complete!")
