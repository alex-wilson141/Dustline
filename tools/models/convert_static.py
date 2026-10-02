# Build 38: a static model (weapon, blade, throwable) -> one small .glb for DUSTLINE, in the game's frame.
# Run: Blender -b --python convert_static.py -- <in> <out.glb> '<json options>'
# options: rot [x,y,z] degrees (Blender axes, applied first), move [x,y,z] metres (after), scale s, tex N (largest picture side),
#          drop ["normal","orm"] (pictures not kept), names {old: new} (objects renamed), split: report only
import bpy, sys, os, json, math
from mathutils import Matrix, Euler, Vector
args = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT = args[0], args[1]; O = json.loads(args[2]) if len(args) > 2 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(SRC)[1].lower()
if ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=SRC)
elif ext == '.fbx': bpy.ops.import_scene.fbx(filepath=SRC)
elif ext == '.obj': bpy.ops.wm.obj_import(filepath=SRC)
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
T = Matrix.Translation(Vector(O.get('move', (0, 0, 0)))) @ Matrix.Scale(O.get('scale', 1), 4) @ Euler([math.radians(a) for a in O.get('rot', (0, 0, 0))], 'XYZ').to_matrix().to_4x4()
# every mesh takes its world place into its vertices; parents and empties go
for o in meshes:
    mw = T @ o.matrix_world; o.parent = None; o.matrix_world = Matrix.Identity(4); o.data.transform(mw)
    if mw.determinant() < 0: o.data.flip_normals()
    for a in list(o.data.color_attributes): o.data.color_attributes.remove(a)
    if o.name in O.get('names', {}): o.name = O['names'][o.name]
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)
if O.get('join'):
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join(); meshes = [meshes[0]]; meshes[0].name = O['join']
N = O.get('tex', 512)
for img in bpy.data.images:
    if img.size[0] > N or img.size[1] > N:
        k = N / max(img.size); img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))
for m in bpy.data.materials:
    if not m.node_tree: continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: continue
    for key, inputs in (('normal', ['Normal']), ('orm', ['Metallic', 'Roughness'])):
        if key in O.get('drop', []):
            for name in inputs:
                for l in list(b.inputs[name].links): m.node_tree.links.remove(l)
    if 'rough' in O: b.inputs['Roughness'].default_value = O['rough']
    if 'metal' in O: b.inputs['Metallic'].default_value = O['metal']
tris = 0
for o in meshes: o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=85, export_animations=False, export_yup=True, export_apply=True, export_tangents=False)
lo = [min((o.matrix_world @ v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)]; hi = [max((o.matrix_world @ v.co)[i] for o in meshes for v in o.data.vertices) for i in range(3)]
print('DONE', os.path.basename(OUT), 'meshes', [o.name for o in meshes], 'tris', tris, 'blender min', [round(v, 3) for v in lo], 'max', [round(v, 3) for v in hi], 'file', os.path.getsize(OUT))
