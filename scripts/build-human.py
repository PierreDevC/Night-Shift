"""Embed the CC0 MakeHuman facial mesh for offline Babylon.js use."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
vertices, faces, group = [], [], ''
for line in (root / 'assets/models/human-base.obj').read_text().splitlines():
    if line.startswith('v '): vertices.append(list(map(float, line.split()[1:4])))
    elif line.startswith('g '): group = line[2:]
    elif line.startswith('f ') and group == 'body':
        face = [int(v.split('/')[0]) - 1 for v in line.split()[1:]]
        if all(vertices[i][1] > 5.65 and abs(vertices[i][0]) < 1.43 for i in face): faces.append(face)
used = sorted({i for face in faces for i in face})
remap = {v: i for i, v in enumerate(used)}
positions = [round(a, 5) for i in used for a in
             (vertices[i][0] * .105, vertices[i][1] * .105 + .96, vertices[i][2] * .105 - .045)]
indices = []
for f in faces:
    for i in range(1, len(f)-1): indices.extend([remap[f[0]], remap[f[i]], remap[f[i+1]]])
(root / 'assets/models/human-head.js').write_text('/* CC0 MakeHuman; see MAKEHUMAN-LICENSE.md. */\nwindow.NightHumanHead=' + json.dumps({'positions': positions, 'indices': indices}, separators=(',', ':')) + ';\n')
print(f'Embedded {len(used)} facial vertices, {len(indices)//3} triangles')
