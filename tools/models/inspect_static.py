import bpy, sys, os
from mathutils import Vector
path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(path)[1].lower()
if ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=path)
elif ext == '.fbx': bpy.ops.import_scene.fbx(filepath=path)
elif ext == '.obj': bpy.ops.wm.obj_import(filepath=path)
lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3); tot = 0
for o in bpy.data.objects:
    if o.type != 'MESH': print('OBJ', o.type, o.name, 'parent', o.parent.name if o.parent else None); continue
    m = o.data; m.calc_loop_triangles(); tot += len(m.loop_triangles)
    ws = [o.matrix_world @ v.co for v in m.vertices]; mn = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws))); mx = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
    lo = Vector((min(lo.x, mn.x), min(lo.y, mn.y), min(lo.z, mn.z))); hi = Vector((max(hi.x, mx.x), max(hi.y, mx.y), max(hi.z, mx.z)))
    print('MESH', o.name, 'tris', len(m.loop_triangles), 'min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx], 'mats', [s.material.name if s.material else None for s in o.material_slots], 'parent', o.parent.name if o.parent else None, 'vcol', [a.name for a in m.color_attributes])
print('TOTAL tris', tot, 'min', [round(v, 3) for v in lo], 'max', [round(v, 3) for v in hi], 'size', [round(v, 3) for v in (hi - lo)])
for m in bpy.data.materials:
    tex = [(n.image.name, tuple(n.image.size)) for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if m.node_tree else []
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.node_tree else None
    print('MAT', m.name, 'tex', tex, 'base', [round(c, 3) for c in b.inputs['Base Color'].default_value] if b else None, 'metal', round(b.inputs['Metallic'].default_value, 2) if b else None, 'rough', round(b.inputs['Roughness'].default_value, 2) if b else None)
