
import bpy, sys, os, math, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)

argv = sys.argv[sys.argv.index("--") + 1:]
output_dir = argv[0]
frame_size = int(argv[1]) if len(argv) > 1 else 64
num_directions = int(argv[2]) if len(argv) > 2 else 8

# Add a cube with material
bpy.ops.mesh.primitive_cube_add(size=1.2)
cube = bpy.context.active_object
mat = bpy.data.materials.new("TestMat")
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.8, 0.15, 0.15, 1)
    bsdf.inputs["Roughness"].default_value = 0.4
cube.data.materials.append(mat)

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

# Render settings
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

print("Test render complete!")
