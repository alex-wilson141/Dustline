# Build 38: a Rocketbox avatar (FBX + TGA) -> one .glb for DUSTLINE: fewer bones, fewer triangles, one material with one
# colour atlas and one normal atlas, the real camouflage and every insignia painted out, the uniform recoloured.
# Run: Blender -b --python convert_body.py -- <variant> <out.glb> [tris]
import bpy, bmesh, sys, os, math, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import texlib as T
args = sys.argv[sys.argv.index('--') + 1:]; VARIANT, OUT = args[0], args[1]; TRIS = int(args[2]) if len(args) > 2 else 4500
RB = os.environ.get('ROCKETBOX') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'incoming', 'rocketbox')   # the avatars' folders as downloaded (never tracked)
TAN, COYOTE, HELMET = (.60, .52, .37), (.33, .28, .20), (.52, .45, .32)
OLIVE, OLIVE_CAP, BOOT_DARK = (.235, .262, .205), (.215, .240, .190), (.13, .115, .10)
V = {
 'squad': dict(dir='Military_Male_03', pre='sm004', body=dict(uniform=TAN, gear=COYOTE,
     paint=[(140, 500, 226, 610), (792, 512, 880, 632), (470, 356, 552, 386), (532, 942, 606, 1006)],
     gear_rects=[(418, 100, 604, 730), (322, 556, 706, 736), (160, 222, 270, 318), (752, 222, 862, 318), (0, 858, 262, 1024), (762, 858, 1024, 1024), (282, 110, 420, 250), (600, 110, 700, 240), (0, 0, 140, 60), (880, 0, 1024, 60)]),
   helmet=dict(uniform=HELMET, gear=None, paint=[(612, 568, 690, 606)], all_cloth=True), equipment=dict(uniform=COYOTE, gear=COYOTE, paint=[]), head=None),
 'kareth_a': dict(dir='Military_Male_02', pre='sm024', body=dict(uniform=OLIVE, gear=None, boots=BOOT_DARK,
     paint=[(132, 530, 216, 646), (804, 540, 888, 662), (398, 556, 466, 584), (490, 596, 540, 640), (540, 554, 628, 586)]),
   head=dict(uniform=OLIVE_CAP, gear=None, paint=[(852, 584, 966, 630)])),
 'kareth_b': dict(dir='Military_Male_06', pre='sm021', body=dict(uniform=OLIVE, gear=None, boots=BOOT_DARK,
     paint=[(132, 528, 216, 646), (804, 538, 888, 658), (398, 554, 476, 584), (488, 594, 536, 638), (540, 554, 630, 586)]),
   head=dict(uniform=OLIVE_CAP, gear=None, paint=[(852, 584, 966, 630)])),
}[VARIANT]
KEEP = ['Bip01 Pelvis', 'Bip01 Spine', 'Bip01 Spine1', 'Bip01 Spine2', 'Bip01 Neck', 'Bip01 Head'] + [f'Bip01 {s} {b}' for s in 'LR' for b in ('Clavicle', 'UpperArm', 'Forearm', 'Hand', 'Thigh', 'Calf', 'Foot')]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(RB, V['dir'], V['dir'] + '.fbx'), automatic_bone_orientation=False)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
for o in list(bpy.data.objects):
    if o not in (arm, mesh): bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
def select(*objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
# metres, upright, facing the game's way (glTF -Z: Blender +Y)
select(arm, mesh); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
arm.rotation_euler = (0, 0, math.pi); select(arm, mesh); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---- bones: what is not kept gives its weights to its nearest kept ancestor
bones = arm.data.bones; parent_kept = {}
for b in bones:
    if b.name in KEEP: continue
    p = b.parent
    while p and p.name not in KEEP: p = p.parent
    parent_kept[b.name] = p.name if p else 'Bip01 Pelvis'
vg = mesh.vertex_groups; idx_name = {g.index: g.name for g in vg}
for name in KEEP:
    if name not in vg: vg.new(name=name)
for v in mesh.data.vertices:
    add = {}
    for g in v.groups:
        n = idx_name[g.group]
        if n in parent_kept: add[parent_kept[n]] = add.get(parent_kept[n], 0) + g.weight
    for n, w in add.items(): vg[n].add([v.index], w, 'ADD')
for n in list(parent_kept):
    if n in vg: vg.remove(vg[n])
select(arm); bpy.ops.object.mode_set(mode='EDIT')
for eb in list(arm.data.edit_bones):
    if eb.name not in KEEP: arm.data.edit_bones.remove(eb)
bpy.ops.object.mode_set(mode='OBJECT')

# ---- triangles
mesh.data.calc_loop_triangles(); before = len(mesh.data.loop_triangles)
select(mesh); d = mesh.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1, TRIS / before); d.use_collapse_triangulate = True
while mesh.modifiers[0] != d: bpy.ops.object.modifier_move_up(modifier=d.name)
bpy.ops.object.modifier_apply(modifier=d.name)
mesh.data.calc_loop_triangles(); after = len(mesh.data.loop_triangles)

# ---- pictures: one colour atlas and one normal atlas
slots = [s.material.name for s in mesh.material_slots]; pre = V['pre']
def tex(part, kind):
    for suf in (f'{pre}_{part}_{kind}_acu.tga', f'{pre}_{part}_{kind}.tga'):
        p = os.path.join(RB, V['dir'], suf)
        if os.path.exists(p): return T.load(p)
    return None
def colour(part):
    x = tex(part, 'color'); cfg = V.get(part)
    if x is None: return None, None
    island = (x.max(2) > .035).astype(np.float32)
    if cfg:
        x = T.inpaint(x, island, cfg['paint'])
        x, island = T.decamo(x, cfg['uniform'], cfg['gear'], gear_rects=cfg.get('gear_rects', ()), cloth_rects=[(0, 0, 1024, 1024)] if cfg.get('all_cloth') else cfg['paint'])
        if cfg.get('boots'):
            r, g, b = x[:, :, 0], x[:, :, 1], x[:, :, 2]; boots = island * ((r - b) > .1) * (r < g * 1.2) * (T.lum(x) > .2)
            boots = np.clip(T.blur(boots.astype(np.float32), 2) * 1.4, 0, 1) * island; x = T.tint_where(x, boots, cfg['boots'])
    return T.bleed(x, island), cfg
def normal(part, cfg):
    n = tex(part, 'normal')
    if n is None: return None
    if cfg and cfg['paint']:
        m = np.clip(T.blur(T.rect_mask(n.shape, cfg['paint']), 3) * 1.5, 0, 1)[:, :, None]; n = n * (1 - m) + np.array((.5, .5, 1), np.float32) * m
    return n
parts = [s.replace(pre + '_', '') for s in slots]           # body, head, helmet, equipment, pistol ...
if len(parts) <= 2: W, H, quad = 2048, 1024, {'body': (0, 0, .5, 1), 'head': (.5, 0, 1, 1)}
else: W, H, quad = 2048, 2048, {'body': (0, .5, .5, 1), 'head': (.5, .5, 1, 1), 'helmet': (0, 0, .5, .5), 'equipment': (.5, .25, 1, .5), 'pistol': (.5, 0, .75, .25), 'combat_knife': (.5, 0, .75, .25)}
atlasC = np.zeros((H, W, 3), np.float32); atlasN = np.zeros((H, W, 3), np.float32); atlasN[:] = (.5, .5, 1)
def fit(x, w, h):
    while x.shape[1] > w: x = T.half(x)
    assert x.shape[0] == h and x.shape[1] == w, (x.shape, w, h); return x
for part in parts:
    u0, v0, u1, v1 = quad[part]; x0, y0, w, h = int(u0 * W), int(v0 * H), int((u1 - u0) * W), int((v1 - v0) * H)
    c, cfg = colour(part); n = normal(part, cfg)
    if c is not None: atlasC[y0:y0 + h, x0:x0 + w] = fit(c, w, h)
    if n is not None: atlasN[y0:y0 + h, x0:x0 + w] = fit(n, w, h)
    print('ATLAS', part, (x0, y0, w, h))
uv = mesh.data.uv_layers.active.data
for poly in mesh.data.polygons:
    u0, v0, u1, v1 = quad[parts[poly.material_index]]
    for li in poly.loop_indices:
        u, v = uv[li].uv; u, v = min(max(u, 0), 1), min(max(v, 0), 1); uv[li].uv = (u0 + u * (u1 - u0), v0 + v * (v1 - v0))
imgC = T.to_image(atlasC, VARIANT + '_colour'); imgN = T.to_image(atlasN, VARIANT + '_normal'); imgN.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new(VARIANT); mat.use_nodes = True; nt = mat.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = imgC; nt.links.new(tc.outputs['Color'], bsdf.inputs['Base Color'])
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = imgN; nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = .86; bsdf.inputs['Metallic'].default_value = 0
mesh.data.materials.clear(); mesh.data.materials.append(mat)
for poly in mesh.data.polygons: poly.material_index = 0
if os.environ.get('ATLAS_PREVIEW'): T.save(T.half(atlasC), os.environ['ATLAS_PREVIEW'])

for a_ in list(mesh.data.color_attributes): mesh.data.color_attributes.remove(a_)      # two all-white sets: dead weight
# what the model is, written into the file for whoever loads it (the pictures cannot be read without drawing them)
arm['look'] = VARIANT; arm['uniform'] = [round(c, 3) for c in V['body']['uniform']]; arm['headgear'] = 'helmet' if 'helmet' in V else 'cap'; arm['armour'] = bool(V['body'].get('gear_rects')); arm['source'] = 'Microsoft Rocketbox ' + V['dir'] + ' (MIT)'
arm.name = 'Rig'; mesh.name = 'Body'; select(arm, mesh)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_image_format='JPEG', export_jpeg_quality=84, export_animations=False, export_skins=True, export_yup=True, export_apply=False, export_tangents=False, export_materials='EXPORT', export_extras=True)
print('DONE', VARIANT, 'bones', len(arm.data.bones), 'tris', before, '->', after, 'file', os.path.getsize(OUT))
