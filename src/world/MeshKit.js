/* Primitive builders shared by every part of the world: deterministic noise,
   materials and procedural textures, boxes/cylinders/planes/ellipsoids,
   canvas-drawn signs, collision volumes and interaction registration.
   Everything the station is made of bottoms out here.

   Installed onto the world as W.kit so call sites read the same as before. */
window.NS = window.NS || {};
NS.MeshKit = class MeshKit {
  static install(W, scene) {
    const B = BABYLON, V = B.Vector3;
      let seed = 17041998;
      function rnd() {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        return (seed >>> 0) / 4294967296;
      }
      W.random = rnd;
      const color = (h) => B.Color3.FromHexString(h);
      function mat(n, h, em = 0, alpha = 1) {
        let m = new B.StandardMaterial(n, scene);
        m.diffuseColor = color(h);
        m.specularColor = new B.Color3(0.08, 0.09, 0.08);
        m.emissiveColor = color(h).scale(em);
        m.alpha = alpha;
        m.maxSimultaneousLights = 6;
        return m;
      }
      W.mat = mat;
      function texture(n, base, type) {
        const t = new B.DynamicTexture(
            n,
            { width: 512, height: 512 },
            scene,
            false,
            B.Texture.TRILINEAR_SAMPLINGMODE,
          ),
          c = t.getContext();
        c.fillStyle = base;
        c.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 14000; i++) {
          let l = rnd() > 0.5 ? 255 : 0;
          c.fillStyle = `rgba(${l},${l},${l},${rnd() * 0.09})`;
          let s = rnd() * 3 + 0.5;
          c.fillRect(rnd() * 512, rnd() * 512, s, s);
        }
        if (type === "tile") {
          c.strokeStyle = "#242d294b";
          c.lineWidth = 3;
          for (let i = 0; i <= 512; i += 128) {
            c.beginPath();
            c.moveTo(i, 0);
            c.lineTo(i, 512);
            c.stroke();
            c.beginPath();
            c.moveTo(0, i);
            c.lineTo(512, i);
            c.stroke();
          }
          for (let i = 0; i < 70; i++) {
            c.strokeStyle = "#252b2920";
            c.beginPath();
            let x = rnd() * 512,
              y = rnd() * 512;
            c.moveTo(x, y);
            c.lineTo(x + rnd() * 20, y + rnd() * 40);
            c.stroke();
          }
        }
        if (type === "wall") {
          for (let y = 0; y < 512; y += 64) {
            c.fillStyle = "#10191020";
            c.fillRect(0, y, 512, 2);
          }
          for (let i = 0; i < 14; i++) {
            c.fillStyle = "#352b1720";
            c.fillRect(rnd() * 512, 0, rnd() * 20, 512);
          }
        }
        if (type === "road") {
          c.strokeStyle = "#10191870";
          c.lineWidth = 2;
          for (let j = 0; j < 7; j++) {
            c.beginPath();
            let x = rnd() * 512,
              y = rnd() * 512;
            c.moveTo(x, y);
            for (let i = 0; i < 8; i++) {
              x += rnd() * 40 - 20;
              y += rnd() * 45;
              c.lineTo(x, y);
            }
            c.stroke();
          }
        }
        t.update();
        return t;
      }
      function texMat(n, h, type, uv = 1) {
        const m = mat(n, h);
        m.diffuseColor = B.Color3.White();
        m.diffuseTexture = texture(n + " texture", h, type);
        m.diffuseTexture.uScale = m.diffuseTexture.vScale = uv;
        return m;
      }
      function ellipsoid(n, x, y, z, sx, sy, sz, m, parent = null) {
        const a = B.MeshBuilder.CreateSphere(
          n,
          { diameter: 1, segments: 6 },
          scene,
        );
        a.position.set(x, y, z);
        a.scaling.set(sx, sy, sz);
        a.material = m;
        a.isPickable = false;
        if (parent) a.parent = parent;
        return a;
      }
      const M = (W.M = {
        wall: texMat("aged cream siding", "#8a8e7d", "wall", 2),
        floor: texMat("scuffed floor", "#798574", "tile", 4),
        asphalt: texMat("rain darkened asphalt", "#252e30", "road", 12),
        concrete: texMat("concrete", "#555e59", "road", 3),
        metal: mat("painted charcoal steel", "#303c3a"),
        red: texMat("faded vermilion", "#983d31", "wall"),
        cream: mat("old enamel", "#c5c8ac"),
        black: mat("rubber", "#111a1b"),
        shelf: mat("shelf steel", "#7c897c"),
        wood: texMat("counter laminate", "#635d46", "wall"),
        glass: mat("dirty glass", "#557b73", 0.08, 0.12),
        white: mat("fluorescent tubes", "#cce8bd", 1.1),
        warm: mat("sodium glow", "#ebc783", 1.3),
        redGlow: mat("warning lamp", "#ed6047", 1.4),
        screen: mat("CRT green", "#76a787", 0.65),
        dark: mat("unlit window", "#11252a", 0.03),
        leaf: mat("forest", "#142b27"),
        bark: mat("tree bark", "#252d28"),
        yellow: mat("safety paint", "#b5a449"),
        puddle: mat("puddles", "#7faeae", 0.08, 0.15),
      });
      // Downloaded CC0 surface maps are bundled as data URLs for file:// play.
      function surface(material, name, repeats, tint) {
        const maps = window.NightTextures?.[name];
        if (!maps) return;
        if (material.diffuseTexture) material.diffuseTexture.dispose();
        material.diffuseTexture = new B.Texture(maps.color, scene);
        material.bumpTexture = new B.Texture(maps.normal, scene);
        for (const tex of [material.diffuseTexture, material.bumpTexture]) {
          tex.uScale = tex.vScale = repeats;
          tex.anisotropicFilteringLevel = 4;
        }
        material.bumpTexture.level = 0.35;
        material.diffuseColor = color(tint);
      }
      surface(M.asphalt, "asphalt", 42, "#667577");
      surface(M.concrete, "concrete", 10, "#939b91");
      surface(M.floor, "tiles", 7, "#a3aea0");
      M.asphalt.specularColor = new B.Color3(0.35, 0.42, 0.4);
      M.asphalt.specularPower = 90;
      M.glass.backFaceCulling = false;
      M.puddle.specularColor = new B.Color3(0.7, 0.8, 0.75);
      M.puddle.specularPower = 120;
      function box(n, x, y, z, sx, sy, sz, m, collide = false, parent = null) {
        const a = B.MeshBuilder.CreateBox(
          n,
          { width: sx, height: sy, depth: sz },
          scene,
        );
        a.position.set(x, y, z);
        a.material = m;
        a.isPickable = false;
        if (parent) a.parent = parent;
        if (collide)
          W.colliders.push({
            mesh: a,
            x,
            z,
            hx: sx / 2,
            hz: sz / 2,
            enabled: true,
          });
        return a;
      }
      W.box = box;
      function cyl(n, x, y, z, d, h, m, segments = 12, parent = null) {
        let a = B.MeshBuilder.CreateCylinder(
          n,
          { diameter: d, height: h, tessellation: segments },
          scene,
        );
        a.position.set(x, y, z);
        a.material = m;
        a.isPickable = false;
        if (parent) a.parent = parent;
        return a;
      }
      W.cyl = cyl;
      function plane(n, x, y, z, sx, sy, m, ry = Math.PI, parent = null) {
        let a = B.MeshBuilder.CreatePlane(
          n,
          {
            width: sx,
            height: sy,
            sideOrientation: B.Mesh.DOUBLESIDE,
            // Without flipped back UVs every sign reads mirrored from behind.
            frontUVs: new B.Vector4(0, 0, 1, 1),
            backUVs: new B.Vector4(1, 0, 0, 1),
          },
          scene,
        );
        a.position.set(x, y, z);
        a.rotation.y = ry;
        a.material = m;
        a.isPickable = false;
        if (parent) a.parent = parent;
        return a;
      }
      W.plane = plane;
      function label(n, lines, w = 512, h = 256, bg = "#17291f", fg = "#cbdba7") {
        const t = new B.DynamicTexture(
            n,
            { width: w, height: h },
            scene,
            false,
            B.Texture.NEAREST_SAMPLINGMODE,
          ),
          c = t.getContext();
        c.fillStyle = bg;
        c.fillRect(0, 0, w, h);
        c.textAlign = "center";
        c.textBaseline = "middle";
        for (const l of lines) {
          c.fillStyle = l.color || fg;
          c.font = `${l.weight || "bold"} ${l.size || 32}px ${l.font || "monospace"}`;
          c.fillText(l.text, w * (l.x ?? 0.5), h * l.y);
        }
        t.update();
        const m = mat(n + " material", "#ffffff", 0.2);
        m.diffuseTexture = t;
        m.emissiveTexture = t;
        m.emissiveColor = new B.Color3(0.35, 0.35, 0.3);
        return m;
      }
      W.label = label;
      // Which way a sign reads. A plane's readable face points -Z at ry = 0.
      const FACE = (W.FACE = {
        px: -Math.PI / 2,
        nx: Math.PI / 2,
        pz: Math.PI,
        nz: 0,
      });
      function sign(
        n,
        x,
        y,
        z,
        w,
        h,
        lines,
        bg,
        fg,
        ry = Math.PI,
        parent = null,
      ) {
        return plane(
          n,
          x,
          y,
          z,
          w,
          h,
          label(n, lines, 512, Math.max(64, Math.round((512 * h) / w)), bg, fg),
          ry,
          parent,
        );
      }
      W.sign = sign;
      function interact(id, mesh, labelText, kind, data = {}, radius = 2.35) {
        const o = {
          id,
          mesh,
          label: labelText,
          kind,
          data,
          radius,
          enabled: true,
        };
        mesh.isPickable = true;
        mesh.metadata = { interact: id };
        W.interactions.push(o);
        return o;
      }
      W.interact = interact;
      function collider(x, z, hx, hz, extra = {}) {
        const o = { x, z, hx, hz, enabled: true, ...extra };
        W.colliders.push(o);
        return o;
      }
    W.kit = { rnd, color, mat, texture, texMat, ellipsoid, box, cyl, plane,
      label, sign, interact, collider, M: W.M, FACE: W.FACE, products: W.products };
    return W.kit;
  }
};
