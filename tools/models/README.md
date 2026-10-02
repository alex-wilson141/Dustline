# Model conversion (Build 38)

How the files in `dist/assets/models/` were made. The sources are not in the repository: they are downloaded into
`incoming/` (ignored by git) and converted with Blender (5.2, run without a window).

```sh
B=/Applications/Blender.app/Contents/MacOS/Blender
# bodies: Microsoft Rocketbox (MIT), Assets/Avatars/Professions/Military_Male_02, _03, _06 (the .fbx and Textures/*.tga)
$B -b --python tools/models/convert_body.py -- squad    "$PWD/dist/assets/models/squad.glb"
$B -b --python tools/models/convert_body.py -- kareth_a "$PWD/dist/assets/models/kareth_a.glb"
$B -b --python tools/models/convert_body.py -- kareth_b "$PWD/dist/assets/models/kareth_b.glb"
# first-person arms, cut from Military_Male_03
$B -b --python tools/models/convert_arms.py -- "$PWD/dist/assets/models/arms.glb"
# a static model (Poly Haven machete, CC0)
$B -b --python tools/models/convert_static.py -- incoming/polyhaven/machete/machete.gltf "$PWD/dist/assets/models/machete.glb" \
   '{"rot":[-90,0,0],"scale":0.8,"move":[0,0.104,0],"tex":512,"drop":["normal"]}'
```

`convert_body.py`: 20 bones kept (face, fingers and toes give their weights to their parents), about 4,500 triangles, the
avatar's materials joined into one colour picture and one normal picture, every flag, name, rank and unit mark painted
out (rectangles listed per avatar, as seen at 1024 px), the real camouflage pattern replaced by plain shaded cloth
(`texlib.decamo`), the uniform recoloured (tan for the squad, olive-grey for the Kareth Brigade). The file records what it
is (`look`, `uniform`, `headgear`, `armour`, `source`) for the checks, which cannot see pictures.

After converting: `node tools/stamp-build.mjs`, then `node tests/test-models-b38.mjs`.
