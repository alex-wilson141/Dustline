# Build 38: first-person arms cut from the squad avatar (Rocketbox Military_Male_03): both arms from the shoulder, every
# finger bone kept, no triangles removed, the body picture cropped to what the arms use.
# Run: Blender -b --python convert_arms.py -- <out.glb>
import bpy, sys, os, math, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import texlib as T
OUT = sys.argv[sys.argv.index('--') + 1]; RB = os.environ.get('ROCKETBOX') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'incoming', 'rocketbox')   # the avatars' folders as downloaded (never tracked); DIR, PRE = 'Military_Male_03', 'sm004'
TAN, COYOTE = (.60, .52, .37), (.33, .28, .20)
PAINT = [(140, 500, 226, 610), (792, 512, 880, 632), (470, 356, 552, 386), (532, 942, 606, 1006)]
GEAR = [(418, 100, 604, 730), (322, 556, 706, 736), (160, 222, 270, 318), (752, 222, 862, 318), (0, 858, 262, 1024), (762, 858, 1024, 1024), (282, 110, 420, 250), (600, 110, 700, 240), (0, 0, 140, 60), (880, 0, 1024, 60)]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(RB, DIR, DIR + '.fbx'), automatic_bone_orientation=False)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
for o in list(bpy.data.objects):
    if o not in (arm, mesh): bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
def select(*objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
select(arm, mesh); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
arm.rotation_euler = (0, 0, math.pi); select(arm, mesh); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
def is_arm(n): return any(k in n for k in ('UpperArm', 'Forearm', 'Hand', 'Finger'))
KEEP = [b.name for b in arm.data.bones if is_arm(b.name)]
vg = mesh.vertex_groups; idx_name = {g.index: g.name for g in vg}
# a vertex belongs to an arm if most of its weight is on arm bones; a face is kept if all its vertices are
armw = np.zeros(len(mesh.data.vertices)); side = np.zeros(len(mesh.data.vertices))
for v in mesh.data.vertices:
    tot = sum(g.weight for g in v.groups) or 1
    armw[v.index] = sum(g.weight for g in v.groups if is_arm(idx_name[g.group])) / tot
body_slot = next(i for i, s in enumerate(mesh.material_slots) if s.material.name.endswith('_body'))
import bmesh
bm = bmesh.new(); bm.from_mesh(mesh.data)
drop = [f for f in bm.faces if not (f.material_index == body_slot and all(armw[v.index] > .5 for v in f.verts))]
bmesh.ops.delete(bm, geom=drop, context='FACES'); bm.to_mesh(mesh.data); bm.free(); mesh.data.update()
vg = mesh.vertex_groups; idx_name = {g.index: g.name for g in vg}
for v in mesh.data.vertices:
    lost = sum(g.weight for g in v.groups if idx_name[g.group] not in KEEP)
    if lost > 0:
        s = 'L' if v.co.x * (1 if True else 1) > 0 else 'R'      # after the half turn the left arm is at +x in Blender? decided below by the nearest upper arm
        best = min((n for n in KEEP if 'UpperArm' in n), key=lambda n: (arm.data.bones[n].head_local - v.co).length)
        vg[best].add([v.index], lost, 'ADD')
for n in [g.name for g in vg if g.name not in KEEP]: vg.remove(vg[n])
select(arm); bpy.ops.object.mode_set(mode='EDIT')
for eb in list(arm.data.edit_bones):
    if eb.name not in KEEP: arm.data.edit_bones.remove(eb)
bpy.ops.object.mode_set(mode='OBJECT')
mesh.data.calc_loop_triangles(); tris = len(mesh.data.loop_triangles)
# ---- the picture: the processed body picture, cropped to the rows the arms use
def load(kind):
    for suf in (f'{PRE}_body_{kind}_acu.tga', f'{PRE}_body_{kind}.tga'):
        p = os.path.join(RB, DIR, suf)
        if os.path.exists(p): return T.load(p)
c = load('color'); island = (c.max(2) > .035).astype(np.float32); c = T.inpaint(c, island, PAINT); c, island = T.decamo(c, TAN, COYOTE, gear_rects=GEAR, cloth_rects=PAINT); c = T.bleed(c, island)
n = load('normal'); m = np.clip(T.blur(T.rect_mask(n.shape, PAINT), 3) * 1.5, 0, 1)[:, :, None]; n = n * (1 - m) + np.array((.5, .5, 1), np.float32) * m
uv = mesh.data.uv_layers.active.data; us = np.array([d.uv[:] for d in uv]); u0, v0 = us.min(0); u1, v1 = us.max(0)
H, W = c.shape[:2]; pad = 8; y0 = max(0, int(v0 * H) - pad); y1 = min(H, int(math.ceil(v1 * H)) + pad); y1 = y0 + int(math.ceil((y1 - y0) / 4) * 4)
c = c[y0:y1]; n = n[y0:y1]
for d in uv: d.uv = (d.uv[0], (d.uv[1] * H - y0) / (y1 - y0))
imgC = T.to_image(c, 'arms_colour'); imgN = T.to_image(n, 'arms_normal'); imgN.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new('arms'); mat.use_nodes = True; nt = mat.node_tree; bsdf = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = imgC; nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = imgN; nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = .82; bsdf.inputs['Metallic'].default_value = 0
mesh.data.materials.clear(); mesh.data.materials.append(mat)
for poly in mesh.data.polygons: poly.material_index = 0
for a_ in list(mesh.data.color_attributes): mesh.data.color_attributes.remove(a_)
arm['look'] = 'arms'; arm['source'] = 'Microsoft Rocketbox Military_Male_03 (MIT)'
arm.name = 'ArmsRig'; mesh.name = 'Arms'; select(arm, mesh)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=88, export_animations=False, export_skins=True, export_yup=True, export_apply=False, export_tangents=False, export_materials='EXPORT', export_extras=True)
print('DONE arms bones', len(arm.data.bones), 'tris', tris, 'picture', c.shape, 'uv rows', round(float(v0), 3), round(float(v1), 3), 'file', os.path.getsize(OUT))
