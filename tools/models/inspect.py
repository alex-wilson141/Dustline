import bpy, sys, os
path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
print('UNITS scale_length', bpy.context.scene.unit_settings.scale_length)
for o in bpy.data.objects:
    if o.type == 'MESH':
        m = o.data; m.calc_loop_triangles()
        mats = [s.material.name if s.material else None for s in o.material_slots]
        print('MESH', o.name, 'verts', len(m.vertices), 'tris', len(m.loop_triangles), 'mats', mats, 'vgroups', len(o.vertex_groups), 'dims', [round(d, 3) for d in o.dimensions], 'loc', [round(v,3) for v in o.matrix_world.translation], 'scale', [round(v,3) for v in o.scale], 'parent', o.parent.name if o.parent else None)
    elif o.type == 'ARMATURE':
        print('ARMATURE', o.name, 'bones', len(o.data.bones), 'scale', [round(v,3) for v in o.scale], 'rot', [round(v,3) for v in o.rotation_euler])
        for b in o.data.bones:
            h = o.matrix_world @ b.head_local
            print('  BONE', b.name, '<-', b.parent.name if b.parent else None, 'head', [round(v, 3) for v in h], 'len', round(b.length, 3))
    else:
        print('OBJ', o.type, o.name)
for m in bpy.data.materials:
    tex = [n.image.name for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if m.node_tree else []
    print('MAT', m.name, tex)
print('ACTIONS', [a.name for a in bpy.data.actions])
