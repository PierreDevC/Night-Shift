/* Original procedural environment, textures, vehicles and characters. */
(function () {
  "use strict";
  const B = BABYLON,
    V = B.Vector3;
  window.createNightWorld = function (engine) {
    const scene = new B.Scene(engine);
    scene.clearColor = new B.Color4(0.012, 0.022, 0.028, 1);
    scene.ambientColor = new B.Color3(0.07, 0.1, 0.09);
    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.019;
    scene.fogColor = new B.Color3(0.022, 0.038, 0.045);
    scene.skipPointerMovePicking = true;
    const W = {
      scene,
      colliders: [],
      interactions: [],
      doors: [],
      windows: [],
      lights: [],
      cars: [],
      npcs: [],
      items: [],
      power: true,
      time: 0,
      stock: {},
      counterItems: [],
      breakCount: 0,
    };
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
    const products = (W.products = [
      {
        id: "coffee",
        name: "Canned coffee",
        price: 160,
        color: "#6c4429",
        label: "BLACK",
        type: "can",
      },
      {
        id: "tea",
        name: "Green tea",
        price: 140,
        color: "#668340",
        label: "お茶",
        type: "bottle",
      },
      {
        id: "water",
        name: "Mineral water",
        price: 110,
        color: "#71989d",
        label: "MIZU",
        type: "bottle",
      },
      {
        id: "soda",
        name: "Orange soda",
        price: 150,
        color: "#c37636",
        label: "ORANGE",
        type: "can",
      },
      {
        id: "energy",
        name: "Energy drink",
        price: 210,
        color: "#526743",
        label: "RAID",
        type: "can",
      },
      {
        id: "milk",
        name: "Fresh milk",
        price: 190,
        color: "#b8bbaa",
        label: "MILK",
        type: "box",
      },
      {
        id: "noodles",
        name: "Cup noodles",
        price: 230,
        color: "#b15d47",
        label: "NOODLE",
        type: "can",
      },
      {
        id: "rice",
        name: "Salmon rice ball",
        price: 170,
        color: "#a5a48b",
        label: "鮭",
        type: "box",
      },
      {
        id: "sandwich",
        name: "Egg sandwich",
        price: 260,
        color: "#c6b973",
        label: "EGG",
        type: "box",
      },
      {
        id: "chips",
        name: "Salted crisps",
        price: 180,
        color: "#b2954b",
        label: "CRISPS",
        type: "box",
      },
      {
        id: "chocolate",
        name: "Dark chocolate",
        price: 130,
        color: "#635049",
        label: "CACAO",
        type: "box",
      },
      {
        id: "gum",
        name: "Mint gum",
        price: 100,
        color: "#548c7b",
        label: "MINT",
        type: "box",
      },
      {
        id: "mints",
        name: "Mint sweets",
        price: 120,
        color: "#bbc8ac",
        label: "MINTS",
        type: "box",
      },
      {
        id: "bread",
        name: "Sweet bread",
        price: 180,
        color: "#b49769",
        label: "BAKERY",
        type: "box",
      },
      {
        id: "catfood",
        name: "Cat food",
        price: 220,
        color: "#775873",
        label: "NEKO",
        type: "can",
      },
      {
        id: "batteries",
        name: "AA batteries",
        price: 380,
        color: "#936045",
        label: "POWER",
        type: "box",
      },
      {
        id: "tissues",
        name: "Pocket tissues",
        price: 90,
        color: "#859a9b",
        label: "SOFT",
        type: "box",
      },
      {
        id: "lighter",
        name: "Pocket lighter",
        price: 120,
        color: "#976552",
        label: "FIRE",
        type: "box",
      },
    ]);
    products.push(...[
      ['juice','Apple juice',170,'#aa7338','APPLE','bottle'],['sports','Sports drink',180,'#526c94','ION','bottle'],
      ['biscuits','Butter biscuits',240,'#ac995c','BISCUITS','box'],['curry','Curry noodles',250,'#a48e38','CURRY','can'],
      ['peanuts','Roasted peanuts',190,'#ab614b','NUTS','can'],['cereal','Breakfast cereal',320,'#9d7956','MORNING','box'],
      ['oil','Engine oil',980,'#7b6260','10W-40','bottle'],['coolant','Engine coolant',650,'#5b826c','COOLANT','bottle'],
      ['gloves','Work gloves',340,'#7d8156','WORK','box'],['wipes','Cleaning wipes',260,'#658c8b','CLEAN','box'],
      ['detergent','Laundry powder',420,'#8185a3','FRESH','box'],['plasters','Adhesive bandages',280,'#a77a77','CARE','box']
    ].map(([id,name,price,color,label,type])=>({id,name,price,color,label,type})));
    for (const p of products) {
      p.mat = mat(p.id + " package", p.color);
      p.labelMat = label(
        p.id + " label",
        [
          { text: p.label, size: 36, y: 0.35 },
          { text: "KUROSE SELECT", size: 12, y: 0.64 },
          { text: "▪ ▎▌▏▌ ▏▎▌", size: 15, y: 0.86 },
        ],
        128,
        128,
        p.color,
        "#e5dfc4",
      );
      W.stock[p.id] = 12;
    }
    // A shelf row is dozens of identical packages. Kept as separate meshes they
    // dominate the frame time, so each row is merged down to one mesh per
    // material once it is placed.
    function mergeRow(roots, name) {
      const byMat = new Map();
      for (const r of roots) {
        r.computeWorldMatrix(true);
        for (const m of r.getChildMeshes()) {
          m.computeWorldMatrix(true);
          if (!byMat.has(m.material)) byMat.set(m.material, []);
          byMat.get(m.material).push(m);
        }
      }
      const out = [];
      for (const [material, list] of byMat) {
        const merged = B.Mesh.MergeMeshes(list, true, true, undefined, false, false);
        if (!merged) continue;
        merged.name = name;
        merged.material = material;
        merged.isPickable = false;
        out.push(merged);
      }
      for (const r of roots) if (!r.isDisposed()) r.dispose();
      return out;
    }
    W.mergeRow = mergeRow;
    W.makeProduct = function (id, x, y, z, parent = null) {
      const p = products.find((p) => p.id === id) || products[0];
      const root = new B.TransformNode("product " + id, scene);
      root.position.set(x, y, z);
      if (parent) root.parent = parent;
      let mesh;
      if (p.type === "can") {
        mesh = cyl(
          id,
          0,
          0.14,
          0,
          p.id === "noodles" ? 0.23 : 0.12,
          p.id === "noodles" ? 0.24 : 0.25,
          p.mat,
          10,
          root,
        );
        cyl(
          "can lid",
          0,
          0.269,
          0,
          p.id === "noodles" ? 0.23 : 0.12,
          0.012,
          M.cream,
          10,
          root,
        );
        plane("label", 0, 0.15, 0.065, 0.105, 0.19, p.labelMat, Math.PI, root);
      } else if (p.type === "bottle") {
        mesh = cyl(id, 0, 0.15, 0, 0.12, 0.25, p.mat, 8, root);
        cyl("bottle neck", 0, 0.3, 0, 0.07, 0.07, p.mat, 8, root);
        cyl("bottle cap", 0, 0.343, 0, 0.072, 0.025, M.cream, 8, root);
        plane("label", 0, 0.17, 0.062, 0.105, 0.14, p.labelMat, Math.PI, root);
      } else {
        mesh = box(id, 0, 0.12, 0, 0.18, 0.24, 0.095, p.mat, false, root);
        plane("label", 0, 0.12, 0.049, 0.17, 0.22, p.labelMat, Math.PI, root);
      }
      root.main = mesh;
      return root;
    };
    // ---------------------------------------------------------------------
    // Layout. One source of truth, modelled on a standard Japanese roadside
    // konbini: entrance at the front-left corner, magazine rack along the
    // window, cashier run down the right-hand wall with the hot-food back
    // counter behind it, low gondola aisles across the middle, reach-in drink
    // coolers along the whole back wall, open chilled case on the left wall.
    // The customer "golden path" is entrance -> magazines -> aisles -> back
    // wall -> counter. Staff walk the cashier lane through to the back rooms.
    // ---------------------------------------------------------------------
    const L = (W.L = {
      floor: { west: -8, east: 9, back: -6, front: 5 },
      wall: 0.24,
      height: 3.5,
      entrance: { x: -5.4, z: 5.12, width: 2.4 },
      counter: { x0: 5.9, x1: 6.85, z0: -0.75, z1: 4.15 },
      lane: { x0: 6.85, x1: 8.45 },
      backCounter: { x0: 8.45, x1: 9.0, z0: -0.5, z1: 4.0 },
      coolers: { z: -5.4, depth: 0.85, x0: -7.9, x1: 5.3 },
      chilled: { x: -7.6, depth: 0.8, z0: -4.4, z1: 0.6 },
      magazines: { z: 4.6, depth: 0.4, x0: -3.9, x1: 2.6 },
      corridor: { z0: -7.4, z1: -6.12 },
      backRooms: { z0: -10.6, z1: -7.4, divider: 0 },
      yard: -10.6,
      canopy: { x0: -9, x1: 9, z0: 11, z1: 23, clear: 4.8 },
      islands: [-4.6, 4.6],
      pumpZ: [19.8, 14.2],
      road: 32,
    });
    const wallY = L.height / 2 + 0.22;
    // Standing positions in front of fixtures. Every one is checked against
    // the collision world at the end of the build, so customers can never be
    // routed inside a shelf again.
    W.itemSpots = {};
    W.spots = {};
    function spot(name, x, z) {
      W.spots[name] = [x, z];
      return [x, z];
    }
    function wall(n, x, z, sx, sz, m = M.wall) {
      return box(n, x, wallY, z, sx, L.height, sz, m, true);
    }

    // Ground, road and apron ------------------------------------------------
    box("ground", 0, -0.16, 6, 170, 0.2, 150, M.asphalt);
    box("highway", 0, -0.045, L.road, 170, 0.04, 9, M.black);
    for (let x = -80; x < 82; x += 6)
      box("road center dash", x, -0.018, L.road, 3, 0.01, 0.1, M.cream);
    for (const z of [L.road - 4.35, L.road + 4.35])
      box("road edge", 0, -0.02, z, 170, 0.01, 0.1, M.cream);
    box("forecourt apron", 0, -0.02, 14, 44, 0.02, 28, M.concrete);
    box("shop foundation", 0.5, 0.04, -2.3, 18.4, 0.28, 17.4, M.concrete);
    box("tiled sales floor", 0.5, 0.19, -0.5, 17.6, 0.08, 11.4, M.floor);
    box("back of house floor", 0.5, 0.19, -8.4, 17.6, 0.08, 5, M.floor);

    // Shell -----------------------------------------------------------------
    wall("west wall", L.floor.west - L.wall / 2, -2.75, L.wall, 16.1);
    wall("east wall sales", L.floor.east + L.wall / 2, -0.5, L.wall, 11.4);
    wall("east wall back", L.floor.east + L.wall / 2, -8.9, L.wall, 4.1);
    wall("rear wall", 0.5, L.yard - L.wall / 2, 17.6 + L.wall, L.wall);
    // Back-of-house divider, with the cashier lane left open as the staff way through.
    wall("sales back wall", -0.75, L.floor.back - L.wall / 2, 14.9, L.wall);
    // Corridor south wall, with an office and a stockroom doorway.
    for (const [x, w] of [
      [-6.55, 3.3],
      [-1.62, 3.86],
      [1.98, 2.36],
      [6.7, 3.8],
    ])
      wall("corridor wall", x, L.corridor.z0 - L.wall / 2, w, L.wall);
    wall("back room divider", L.backRooms.divider, -9, L.wall, 3.2);
    box("roof", 0.5, L.height + 0.35, -2.3, 18.6, 0.24, 17.6, M.metal);
    box("interior ceiling", 0.5, L.height + 0.1, -2.3, 18, 0.1, 17, M.wall);
    box("shop front fascia", 0.5, L.height + 0.02, 5.24, 18.6, 0.72, 0.3, M.red);
    sign(
      "KUROSE illuminated fascia",
      0.5,
      L.height + 0.02,
      5.41,
      13.4,
      0.5,
      [{ text: "KUROSE  SERVICE   ·   黒瀬給油所", size: 24, y: 0.5 }],
      "#913d30",
      "#f0ecd2",
    );

    // Storefront glazing. The entrance sits at the front-left corner.
    const mullions = [-8.1, -6.7, -4.1, -1.6, 0.9, 3.4, 5.9, 9.1];
    for (const x of mullions)
      box("window mullion", x, 1.95, L.entrance.z, 0.09, 2.25, 0.18, M.metal, true);
    const panes = [
      [-7.4, 1.3],
      [-2.85, 2.4],
      [-0.35, 2.4],
      [2.15, 2.4],
      [4.65, 2.4],
      [7.5, 3.1],
    ];
    W.breachWindow = 4;
    panes.forEach(([x, w], i) => {
      const kick = box(
        "front kick wall " + i,
        x,
        0.52,
        L.entrance.z,
        w,
        0.55,
        0.2,
        M.wall,
        true,
      );
      const kickCollider = W.colliders[W.colliders.length - 1];
      const glass = box(
        "front glass " + i,
        x,
        1.98,
        L.entrance.z,
        w,
        2.2,
        0.025,
        M.glass,
      );
      W.windows.push({
        mesh: glass,
        kick,
        kickCollider,
        collider: collider(x, L.entrance.z, w / 2, 0.07),
        x,
        w,
        z: L.entrance.z,
        state: 0,
        cracks: [],
        debris: [],
        breach: i === W.breachWindow,
      });
      box(
        "window reflection " + i,
        x - w * 0.18,
        2.4,
        L.entrance.z + 0.03,
        0.03,
        1.2,
        0.015,
        M.white,
      ).visibility = 0.1;
    });
    box(
      "entrance threshold",
      L.entrance.x,
      0.24,
      L.entrance.z,
      L.entrance.width + 0.4,
      0.04,
      0.5,
      M.metal,
    );

    // Powered sliding entrance ---------------------------------------------
    const front = {
      id: "front",
      x: L.entrance.x,
      z: L.entrance.z,
      half: L.entrance.width / 2,
      open: 0,
      target: 0,
      locked: false,
      powered: true,
      hold: 0,
      panels: [],
      colliders: [],
    };
    W.frontDoor = front;
    for (const side of [-1, 1]) {
      const root = new B.TransformNode("sliding door " + side, scene);
      const half = front.half / 2;
      root.position.set(front.x + side * half, 1.62, front.z);
      box("door glass", 0, 0, 0, front.half - 0.03, 2.7, 0.035, M.glass, false, root);
      for (const x of [-half + 0.03, half - 0.03])
        box("door vertical frame", x, 0, 0, 0.055, 2.7, 0.09, M.metal, false, root);
      for (const y of [-1.32, 1.32])
        box("door horizontal frame", 0, y, 0, front.half, 0.055, 0.09, M.metal, false, root);
      box("door safety stripe", 0, -0.2, 0.025, front.half - 0.05, 0.08, 0.015, M.red, false, root);
      sign(
        "door arrow " + side,
        0,
        0.05,
        0.051,
        0.45,
        0.16,
        [{ text: side < 0 ? "← AUTO" : "AUTO →", size: 30, y: 0.5 }],
        "#d1d0b5",
        "#303f32",
        Math.PI,
        root,
      );
      front.panels.push({ root, side, half });
      front.colliders.push(collider(front.x + side * half, front.z, half, 0.08, { door: front }));
    }
    box("entrance sensor", front.x, 3.06, front.z + 0.19, 0.26, 0.08, 0.1, M.black);
    box("sensor led", front.x + 0.07, 3.06, front.z + 0.25, 0.025, 0.025, 0.015, M.redGlow);

    // Swing doors -----------------------------------------------------------
    function swingDoor(id, x, z, width, labelText, height = 2.55, axis = "x") {
      const pivot = new B.TransformNode(id + " hinge", scene);
      const along = axis === "x";
      pivot.position.set(along ? x - width / 2 : x, 0.22, along ? z : z - width / 2);
      if (!along) pivot.rotation.y = Math.PI / 2;
      const mesh = box(
        id + " panel",
        width / 2,
        height / 2,
        0,
        width,
        height,
        0.09,
        M.wood,
        false,
        pivot,
      );
      box(id + " push plate", width - 0.18, height * 0.48, 0.06, 0.13, 0.32, 0.04, M.metal, false, pivot);
      sign(
        id + " sign",
        width / 2,
        height * 0.75,
        0.056,
        width * 0.65,
        0.3,
        [{ text: labelText, size: 29, y: 0.5 }],
        "#bdbf9f",
        "#27352b",
        Math.PI,
        pivot,
      );
      const d = {
        id,
        pivot,
        open: 0,
        target: 0,
        x,
        z,
        width,
        axis,
        baseRot: along ? 0 : Math.PI / 2,
        locked: false,
        co: collider(x, z, along ? width / 2 : 0.09, along ? 0.09 : width / 2, { mesh }),
      };
      d.co.door = d;
      W.doors.push(d);
      interact(id, mesh, "Open " + labelText.toLowerCase(), "door", { door: d }, 2.4);
      return d;
    }
    W.swingDoor = swingDoor;
    W.officeDoor = swingDoor("office-door", -4.2, L.corridor.z0, 1.3, "OFFICE");
    W.stockDoor = swingDoor("stock-door", 3.6, L.corridor.z0, 1.4, "STOCKROOM");
    W.rearDoor = swingDoor("rear-door", 6.4, L.yard, 1.5, "SERVICE EXIT");

    // Cashier run -----------------------------------------------------------
    const C = L.counter,
      cx = (C.x0 + C.x1) / 2,
      cz = (C.z0 + C.z1) / 2,
      cw = C.x1 - C.x0,
      cd = C.z1 - C.z0;
    box("checkout counter", cx, 0.77, cz, cw, 1.08, cd, M.wood, true);
    box("countertop", cx, 1.34, cz, cw + 0.16, 0.09, cd + 0.08, M.cream);
    box("counter kick rail", C.x0 - 0.04, 0.33, cz, 0.06, 0.06, cd, M.metal);
    sign(
      "checkout number",
      C.x0 - 0.005,
      0.9,
      cz + 1.1,
      2.4,
      0.35,
      [{ text: "お会計   /   CHECKOUT", size: 24, y: 0.5 }],
      "#6e725c",
      "#dedeca",
      FACE.nx,
    );
    // Staff-side equipment. Screens face the attendant lane (+x).
    const staffFace = FACE.px;
    const register = box("cash register", 6.5, 1.56, 3.2, 0.56, 0.34, 0.5, M.metal);
    box("register screen case", 6.52, 1.87, 3.2, 0.5, 0.42, 0.14, M.black);
    W.registerScreen = sign(
      "register display",
      6.78,
      1.87,
      3.2,
      0.44,
      0.3,
      [
        { text: "KUROSE", size: 30, y: 0.24 },
        { text: "READY", size: 25, y: 0.57 },
        { text: "¥ 0", size: 24, y: 0.83 },
      ],
      "#10271c",
      "#a4d392",
      staffFace,
    );
    W.register = register;
    interact("register", register, "Use cash register", "register", {}, 2.5);
    box("register cash drawer", 6.5, 1.38, 3.2, 0.6, 0.1, 0.54, M.black);
    const scanner = box("barcode scanner", 6.45, 1.46, 2.45, 0.3, 0.16, 0.32, M.black);
    box("scanner red glass", 6.45, 1.551, 2.45, 0.22, 0.015, 0.22, M.redGlow);
    interact("scanner", scanner, "Scan customer items", "scanner", {}, 2.5);
    const fuelComputer = box("fuel validation computer", 6.55, 1.44, 0.55, 0.5, 0.5, 0.46, M.black);
    W.fuelScreen = sign(
      "fuel computer screen",
      6.81,
      1.72,
      0.55,
      0.42,
      0.3,
      [
        { text: "FUEL DESK", size: 24, y: 0.2 },
        { text: "PUMP —", size: 28, y: 0.52 },
        { text: "IDLE", size: 20, y: 0.83 },
      ],
      "#123126",
      "#b4d499",
      staffFace,
    );
    interact("fuel-terminal", fuelComputer, "Validate fuel amount on computer", "fuel-terminal", {}, 2.6);
    const phone = box("counter telephone", 6.55, 1.46, 1.35, 0.3, 0.16, 0.36, M.black);
    box("telephone receiver", 6.55, 1.6, 1.35, 0.11, 0.07, 0.42, M.metal);
    interact("phone", phone, "Use telephone", "phone");
    const intercom = box("entrance intercom", 6.6, 1.5, 3.92, 0.2, 0.24, 0.18, M.metal);
    interact("intercom", intercom, "Entrance intercom / door lock", "intercom", {}, 2.6);
    const alarm = box("security alarm button", 6.72, 1.29, -0.35, 0.14, 0.2, 0.16, M.redGlow);
    interact("alarm", alarm, "Sound security alarm", "alarm");
    sign(
      "alarm label",
      6.72,
      1.53,
      -0.35,
      0.26,
      0.17,
      [{ text: "ALARM", size: 44, y: 0.5 }],
      "#d1c5a1",
      "#4c2824",
      staffFace,
    );
    // Customer-side surface: bell, pass tray, printed receipt.
    const bell = cyl("counter bell", 6.06, 1.43, 2.45, 0.15, 0.09, M.cream);
    interact("bell", bell, "Ring counter bell", "bell");
    const tray = box("customer pass tray", 6.02, 1.41, 3.2, 0.5, 0.04, 0.62, M.metal);
    box("pass tray lip", 6.02, 1.45, 3.2, 0.54, 0.06, 0.05, M.cream);
    interact("cash-tray", tray, "Take cash from the tray", "cash-tray", {}, 2.6);
    const printer = box("receipt printer", 6.62, 1.5, 3.86, 0.2, 0.2, 0.26, M.black);
    const receipt = box("paper receipt", 6.5, 1.62, 3.86, 0.16, 0.015, 0.3, M.cream);
    interact("receipt", receipt, "Read last receipt", "receipt");
    W.counterSpot = spot("counter", 5.35, 3.2);
    W.attendantSpot = spot("attendant", 7.6, 3.2);

    // Back counter: hot food, coffee, microwave — behind the attendant.
    const BC = L.backCounter,
      bcx = (BC.x0 + BC.x1) / 2;
    box("back counter", bcx, 0.76, (BC.z0 + BC.z1) / 2, BC.x1 - BC.x0, 1.06, BC.z1 - BC.z0, M.wood, true);
    box("back countertop", bcx, 1.31, (BC.z0 + BC.z1) / 2, BC.x1 - BC.x0 + 0.1, 0.08, BC.z1 - BC.z0, M.cream);
    const micro = box("microwave oven", 8.72, 1.6, 3.4, 0.5, 0.48, 0.62, M.cream);
    box("microwave window", 8.46, 1.61, 3.4, 0.016, 0.28, 0.44, M.dark);
    interact("microwave", micro, "Use microwave", "microwave", {}, 2.4);
    const brewer = box("coffee machine", 8.74, 1.65, 2.3, 0.46, 0.62, 0.5, M.black);
    cyl("coffee pot", 8.5, 1.47, 2.3, 0.22, 0.23, M.dark);
    interact("coffee-machine", brewer, "Pour a coffee", "coffee", {}, 2.4);
    for (let i = 0; i < 5; i++)
      cyl("paper cup", 8.72, 1.4, 1.62 - i * 0.13, 0.105, 0.16, M.cream, 10);
    box("hot food case", 8.72, 1.6, 0.7, 0.48, 0.5, 0.7, M.metal);
    box("hot food glass", 8.46, 1.62, 0.7, 0.016, 0.36, 0.6, M.glass);
    sign(
      "hot food poster",
      8.98,
      2.42,
      2.2,
      2.4,
      0.9,
      [
        { text: "HOT  &  READY", size: 44, y: 0.22 },
        { text: "コーヒー ¥160  ·  肉まん ¥140", size: 27, y: 0.53 },
        { text: "ALL NIGHT. EVERY NIGHT.", size: 19, y: 0.8 },
      ],
      "#978148",
      "#e6dec0",
      FACE.nx,
    );
    sign(
      "cigarette wall",
      8.98,
      2.45,
      -0.1,
      1.5,
      0.9,
      [
        { text: "たばこ", size: 40, y: 0.2 },
        { text: "01 · 02 · 03 · 04", size: 24, y: 0.5 },
        { text: "ID REQUIRED", size: 20, y: 0.8 },
      ],
      "#4a4c3e",
      "#cfd2b4",
      FACE.nx,
    );
    sign(
      "staff only notice",
      L.lane.x0 + 0.02,
      2.5,
      -1.4,
      0.9,
      0.34,
      [{ text: "STAFF ONLY / 関係者以外立入禁止", size: 22, y: 0.5 }],
      "#425447",
      "#d3d7b6",
      FACE.nx,
    );

    // Merchandising ---------------------------------------------------------
    // Gondolas run across the store so the attendant can see down every aisle.
    function gondola(name, x0, x1, z, ids, header) {
      const len = x1 - x0,
        mx = (x0 + x1) / 2;
      box(name + " base", mx, 0.28, z, len, 0.16, 1.0, M.metal, true);
      box(name + " spine", mx, 1.0, z, len, 1.6, 0.14, M.shelf, true);
      for (const side of [-1, 1]) {
        const face = z + side * 0.5;
        for (let row = 0; row < 3; row++) {
          const y = 0.52 + row * 0.46;
          box(name + " deck", mx, y, z + side * 0.28, len, 0.045, 0.46, M.shelf);
          const id = ids[(row + (side > 0 ? 0 : 3)) % ids.length];
          const p = products.find((q) => q.id === id);
          const count = Math.max(3, Math.floor(len / 0.32));
          const roots = [];
          for (let c = 0; c < count; c++) {
            const pr = W.makeProduct(id, x0 + 0.18 + c * ((len - 0.36) / (count - 1)), y + 0.026, z + side * 0.34);
            if (side < 0) pr.rotation.y = Math.PI;
            roots.push(pr);
          }
          W.items.push(...mergeRow(roots, "shelf stock " + id));
          const tag = sign(
            "price " + name + " " + id + " " + side,
            mx,
            y - 0.05,
            face + side * 0.012,
            len - 0.1,
            0.08,
            [{ text: p.name.toUpperCase() + "     ¥" + p.price, size: 26, y: 0.5 }],
            "#c8c6a5",
            "#253729",
            side > 0 ? Math.PI : 0,
          );
          interact(
            "stock-" + name + "-" + id + "-" + side,
            tag,
            "Inspect " + p.name.toLowerCase(),
            "product",
            { product: p },
            2.2,
          );
          // Shoppers stand in the aisle on this side of the run.
          W.itemSpots[id] = spot("item-" + id, mx + (row - 1) * 1.1, face + side * 0.95);
        }
      }
      for (const s of [-1, 1])
        box(name + " end cap", x0 + (s > 0 ? len : 0), 1.0, z, 0.05, 1.6, 1.0, M.shelf);
      sign(
        name + " header",
        mx,
        2.45,
        z,
        Math.min(len, 3.2),
        0.3,
        [{ text: header, size: 30, y: 0.5 }],
        "#a4b29a",
        "#293a2a",
        0,
      );
    }
    gondola("aisle-1", -5.9, 3.6, 2.0, ["noodles", "curry", "chips", "biscuits", "chocolate", "gum"], "01  即席麺 / INSTANT & SNACKS");
    gondola("aisle-2", -5.9, 3.6, -0.4, ["bread", "cereal", "peanuts", "mints", "chocolate", "biscuits"], "02  パン / BAKERY & SWEETS");
    gondola("aisle-3", -5.9, 1.4, -2.8, ["tissues", "batteries", "lighter", "gloves", "wipes", "detergent"], "03  日用品 / DAILY GOODS");

    // Ice cream chest, in line with the end of aisle three.
    box("ice cream chest", 2.6, 0.79, -2.8, 1.9, 1.15, 1.0, M.cream, true);
    box("chest freezer lid", 2.6, 1.39, -2.8, 1.76, 0.05, 0.88, M.glass);
    const chestRoots = [];
    for (let i = 0; i < 10; i++) {
      const p = W.makeProduct(i % 2 ? "milk" : "chocolate", 1.9 + (i % 5) * 0.36, 1.06, -3.0 + Math.floor(i / 5) * 0.38);
      p.scaling.setAll(0.85);
      chestRoots.push(p);
    }
    mergeRow(chestRoots, "freezer stock");
    const chestTag = sign(
      "freezer sign",
      2.6,
      1.05,
      -2.29,
      1.7,
      0.28,
      [{ text: "アイス / ICE CREAM", size: 30, y: 0.5 }],
      "#557465",
      "#e8e5c5",
      FACE.pz,
    );
    interact("freezer", chestTag, "Browse the freezer", "product", { product: products.find((p) => p.id === "chocolate") });

    // Reach-in drink coolers across the whole back wall.
    W.coffeeStockMeshes = [];
    W.stock.coffee = 0;
    const coolerIds = [
      ["coffee", "tea", "water"],
      ["water", "sports", "juice"],
      ["soda", "energy", "juice"],
      ["tea", "water", "sports"],
      ["milk", "rice", "sandwich"],
      ["sandwich", "rice", "milk"],
    ];
    const coolerTitles = [
      "コーヒー / COFFEE",
      "水 / WATER",
      "炭酸 / SODA",
      "お茶 / TEA",
      "冷蔵 / CHILLED",
      "弁当 / BENTO",
    ];
    for (let j = 0; j < 6; j++) {
      const x = L.coolers.x0 + 1.1 + j * 2.2;
      box("cooler cabinet " + j, x, 1.45, L.coolers.z, 2.15, 2.5, L.coolers.depth, M.cream, true);
      box("cooler interior " + j, x, 1.5, L.coolers.z + 0.12, 1.95, 2.05, 0.1, M.dark);
      box("cooler light " + j, x, 2.56, L.coolers.z + 0.2, 1.9, 0.035, 0.035, M.white);
      for (let r = 0; r < 3; r++) {
        box("cooler shelf", x, 0.72 + r * 0.56, L.coolers.z + 0.22, 2.0, 0.045, 0.42, M.shelf);
        const id = coolerIds[j][r];
        const roots = [];
        for (let k = 0; k < 8; k++)
          roots.push(W.makeProduct(id, x - 0.86 + k * 0.245, 0.744 + r * 0.56, L.coolers.z + 0.26));
        const rowMeshes = mergeRow(roots, "cooler stock " + id);
        if (j === 0 && r === 0) {
          W.coffeeStockMeshes.push(...rowMeshes);
          rowMeshes.forEach((m) => m.setEnabled(false));
        }
        if (!W.itemSpots[id] || j === 0)
          W.itemSpots[id] = spot("item-" + id, x, L.coolers.z + L.coolers.depth / 2 + 0.95);
      }
      box("cooler glazed door " + j, x, 1.5, L.coolers.z + 0.42, 2.05, 2.1, 0.025, M.glass);
      box("cooler handle " + j, x + 0.9, 1.5, L.coolers.z + 0.47, 0.035, 0.6, 0.035, M.metal);
      sign(
        "cooler header " + j,
        x,
        2.82,
        L.coolers.z + 0.44,
        2.05,
        0.24,
        [{ text: coolerTitles[j], size: 26, y: 0.5 }],
        "#314e3b",
        "#d6e0bd",
        FACE.pz,
      );
      const target = box("cooler target " + j, x, 1.5, L.coolers.z + 0.45, 2.0, 2.05, 0.015, M.glass);
      target.visibility = 0;
      interact(
        "cooler-" + j,
        target,
        j === 0 ? "Restock canned coffee" : "Browse " + coolerTitles[j].split(" / ")[1].toLowerCase(),
        j === 0 ? "restock" : "product",
        { product: products.find((p) => p.id === coolerIds[j][0]) },
        2.6,
      );
    }
    W.restockSpot = spot("restock", L.coolers.x0 + 1.1, L.coolers.z + 1.3);

    // Open chilled case on the west wall: rice balls, sandwiches, bento.
    const CH = L.chilled;
    box("chilled case", CH.x, 0.8, (CH.z0 + CH.z1) / 2, CH.depth, 1.6, CH.z1 - CH.z0, M.cream, true);
    box("chilled case back", CH.x - 0.3, 1.7, (CH.z0 + CH.z1) / 2, 0.2, 1.2, CH.z1 - CH.z0, M.shelf);
    for (let r = 0; r < 3; r++) {
      box("chilled deck", CH.x + 0.06, 0.86 + r * 0.42, (CH.z0 + CH.z1) / 2, 0.6, 0.04, CH.z1 - CH.z0 - 0.1, M.shelf);
      const chilledRoots = [];
      for (let k = 0; k < 11; k++)
        chilledRoots.push(
          W.makeProduct(["rice", "sandwich", "bread"][r], CH.x + 0.1, 0.885 + r * 0.42, CH.z0 + 0.3 + k * 0.44),
        );
      mergeRow(chilledRoots, "chilled stock");
    }
    sign(
      "chilled header",
      CH.x + 0.05,
      2.24,
      (CH.z0 + CH.z1) / 2,
      4.6,
      0.3,
      [{ text: "おにぎり · サンドイッチ / RICE BALLS & SANDWICHES", size: 22, y: 0.5 }],
      "#314e3b",
      "#d6e0bd",
      FACE.px,
    );
    for (const id of ["rice", "sandwich"])
      W.itemSpots[id] = spot("item-" + id, CH.x + CH.depth / 2 + 0.95, (CH.z0 + CH.z1) / 2);

    // Magazine rack along the front window.
    const MG = L.magazines;
    box("magazine rack", (MG.x0 + MG.x1) / 2, 0.85, MG.z, MG.x1 - MG.x0, 1.5, MG.depth, M.metal, true);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 14; c++)
        sign(
          "magazine cover " + r + c,
          MG.x0 + 0.3 + c * ((MG.x1 - MG.x0 - 0.6) / 13),
          0.55 + r * 0.42,
          MG.z - MG.depth / 2 - 0.01,
          0.3,
          0.38,
          [
            { text: ["ROUTE", "MOTOR", "TRAVEL", "NIGHT", "週刊"][(r + c) % 5], size: 40, y: 0.24 },
            { text: "1998 / 04", size: 24, y: 0.77 },
          ],
          ["#7c6b48", "#865345", "#4c6b69", "#615974", "#6a5f45"][(r + c) % 5],
          "#e7dfc2",
          0,
        );
    const magazine = scene.getMeshByName("magazine cover 00");
    interact("magazines", magazine, "Read a road magazine", "magazine", {}, 2.2);
    spot("magazines", (MG.x0 + MG.x1) / 2, MG.z - 1.1);

    // Baskets and umbrellas by the door, the way every konbini stocks them.
    for (let i = 0; i < 5; i++) {
      box("shopping basket rim", -7.2, 0.43 + i * 0.06, 3.6, 0.62, 0.07, 0.42, M.red);
      box("shopping basket handle", -7.2, 0.67 + i * 0.025, 3.6, 0.04, 0.025, 0.37, M.metal);
    }
    cyl("umbrella bucket", -7.4, 0.6, 2.3, 0.42, 0.76, M.metal, 12);
    for (let i = 0; i < 5; i++) {
      const stick = cyl("umbrella shaft", -7.52 + i * 0.06, 1.3, 2.3, 0.025, 1.1, M.cream, 6);
      cyl("folded umbrella", stick.position.x, 1.15, 2.3, 0.07, 0.65, i % 2 ? M.red : M.metal, 6);
    }

    // Back of house ---------------------------------------------------------
    box("office desk", -5.6, 0.82, -9.5, 2.8, 0.13, 1.1, M.wood, true);
    for (const x of [-6.75, -4.45]) box("desk leg", x, 0.46, -9.5, 0.08, 0.7, 0.8, M.metal);
    const monitor = box("security monitor", -6.4, 1.21, -9.5, 0.73, 0.64, 0.57, M.black);
    W.monitorScreen = sign(
      "security screen",
      -6.4,
      1.21,
      -9.206,
      0.61,
      0.43,
      [
        { text: "CAM 02", size: 26, y: 0.2 },
        { text: "▥ ▥ ▥", size: 53, y: 0.51 },
        { text: "KUROSE SECURITY", size: 14, y: 0.84 },
      ],
      "#19392b",
      "#8fa97e",
      Math.PI,
    );
    interact("cctv", monitor, "View forecourt camera", "cctv");
    const file = box("locked desk drawer", -4.85, 0.59, -9.28, 0.87, 0.36, 0.68, M.wood);
    interact("drawer", file, "Open locked desk drawer", "drawer");
    const notes = box("shift instructions", -4.95, 0.91, -9.33, 0.44, 0.022, 0.49, M.cream);
    interact("note", notes, "Read supervisor’s note", "note");
    const clock = box("time clock", -7.86, 1.63, -8.4, 0.16, 0.57, 0.35, M.metal);
    interact("timeclock", clock, "Clock in", "timeclock");
    sign(
      "time clock label",
      -7.755,
      1.67,
      -8.4,
      0.24,
      0.33,
      [
        { text: "STAFF", size: 40, y: 0.25 },
        { text: "23:42", size: 39, y: 0.62 },
      ],
      "#152b1e",
      "#bcd099",
      -Math.PI / 2,
    );
    const photo = sign(
      "old photograph",
      -5.6,
      2.25,
      -10.47,
      1.05,
      0.65,
      [
        { text: "KUROSE SERVICE", size: 26, y: 0.18 },
        { text: "▰ ▰  ▰ ▰", size: 60, y: 0.49 },
        { text: "SUMMER 1980", size: 23, y: 0.82 },
      ],
      "#a29b76",
      "#32392b",
      FACE.pz,
    );
    interact("photo", photo, "Examine folded photograph", "photo");
    box("office chair cushion", -5.6, 0.65, -8.5, 0.55, 0.13, 0.54, M.black);
    box("office chair back", -5.6, 1.0, -8.25, 0.55, 0.67, 0.09, M.black);
    cyl("chair stem", -5.6, 0.4, -8.5, 0.06, 0.5, M.metal);
    const firstaid = box("first aid box", -3.2, 1.04, -9.5, 0.32, 0.26, 0.26, M.cream);
    sign(
      "first aid cross",
      -3.2,
      1.04,
      -9.361,
      0.2,
      0.18,
      [{ text: "+", size: 80, y: 0.5 }],
      "#c4c5a8",
      "#964b3c",
      Math.PI,
    );
    interact("firstaid", firstaid, "Take first-aid supplies", "firstaid");
    spot("office", -5.6, -8.6);

    // Stockroom: delivery, workbench, evidence.
    W.deliveryMeshes = [];
    for (let i = 0; i < 6; i++) {
      const start = scene.meshes.length;
      const x = 1.1 + (i % 3) * 1.3,
        z = -9.2 - Math.floor(i / 3) * 1.05;
      box("delivery carton", x, 0.5, z, 0.85, 0.56, 0.7, M.wood, true);
      box("packing tape", x, 0.789, z, 0.12, 0.012, 0.71, M.cream);
      sign(
        "carton print " + i,
        x,
        0.52,
        z + 0.356,
        0.65,
        0.32,
        [
          { text: i === 0 ? "COFFEE" : "KUROSE", size: 42, y: 0.37 },
          { text: "↑ THIS WAY UP ↑", size: 19, y: 0.75 },
        ],
        "#635d46",
        "#212d22",
        0,
      );
      if (i === 0) W.deliveryMeshes.push(...scene.meshes.slice(start));
    }
    const carton = box("coffee delivery", 1.1, 0.84, -9.2, 0.58, 0.16, 0.47, M.wood);
    W.deliveryMeshes.push(carton);
    interact("coffee-carton", W.deliveryMeshes[0], "Carry coffee delivery", "carton", {}, 2.6);
    spot("delivery", 1.1, -8.4);
    box("service workbench", 6.4, 0.85, -9.6, 2.2, 0.12, 0.85, M.wood, true);
    const key = box("brass drawer key", 5.8, 0.932, -9.4, 0.17, 0.02, 0.04, M.yellow);
    interact("key", key, "Take desk key", "key", {}, 2.2);
    const fuse = cyl("replacement fuse", 6.4, 0.955, -9.45, 0.055, 0.18, M.cream);
    fuse.rotation.z = Math.PI / 2;
    interact("fuse", fuse, "Take replacement fuse", "fuse");
    const report = box("maintenance report", 7.1, 0.933, -9.55, 0.37, 0.02, 0.42, M.cream);
    interact("report", report, "Read emergency report", "report");
    const rearLatch = box("rear latch", 7.3, 1.43, -10.42, 0.09, 0.2, 0.075, M.metal);
    interact("latch", rearLatch, "Secure loose rear-door latch", "latch");
    spot("stockroom", 6.4, -8.6);
    sign(
      "delivery marker",
      3.6,
      1.9,
      -7.32,
      1.6,
      0.26,
      [{ text: "COFFEE → COOLER 01", size: 29, y: 0.5 }],
      "#ad9564",
      "#283a27",
      FACE.pz,
    );

    // Rear yard -------------------------------------------------------------
    const breaker = box("exterior disconnect", 4.0, 1.6, L.yard - 0.28, 0.65, 0.9, 0.28, M.metal);
    interact("breaker", breaker, "Inspect pump disconnect", "breaker", {}, 2.6);
    sign(
      "breaker warning",
      4.0,
      1.65,
      L.yard - 0.43,
      0.45,
      0.6,
      [
        { text: "DANGER", size: 58, y: 0.16, color: "#e7be67" },
        { text: "PUMP 04", size: 50, y: 0.44 },
        { text: "ISOLATED", size: 43, y: 0.65 },
        { text: "1980 / 04 / 17", size: 27, y: 0.86 },
      ],
      "#323d35",
      "#bac8a1",
      FACE.nz,
    );
    const trash = cyl("yard rubbish bin", 9.6, 0.55, -12.1, 0.85, 1.1, M.metal, 12);
    collider(9.6, -12.1, 0.45, 0.45);
    interact("trash", trash, "Take out rubbish / inspect yard", "trash");
    box("rear drainage grate", 1.2, 0.1, -12.6, 2.3, 0.1, 0.85, M.black);
    for (let i = 0; i < 12; i++)
      box("grate bar", 0.2 + i * 0.18, 0.17, -12.6, 0.035, 0.02, 0.8, M.metal);
    spot("yard", 4.0, -11.6);

    // Forecourt: canopy, islands, pumps -------------------------------------
    const CA = L.canopy,
      canW = CA.x1 - CA.x0,
      canD = CA.z1 - CA.z0,
      canX = (CA.x0 + CA.x1) / 2,
      canZ = (CA.z0 + CA.z1) / 2,
      canY = CA.clear;
    box("canopy roof", canX, canY + 0.3, canZ, canW, 0.34, canD, M.cream);
    box("canopy rim front", canX, canY + 0.16, CA.z1, canW, 0.6, 0.18, M.red);
    box("canopy rim rear", canX, canY + 0.16, CA.z0, canW, 0.6, 0.18, M.red);
    for (const x of [CA.x0, CA.x1]) box("canopy side rim", x, canY + 0.16, canZ, 0.18, 0.6, canD, M.red);
    sign(
      "canopy lettering",
      canX,
      canY + 0.16,
      CA.z1 + 0.1,
      12,
      0.44,
      [{ text: "KUROSE     /     OPEN 24 HOURS", size: 27, y: 0.5 }],
      "#913d30",
      "#e7e8cf",
      Math.PI,
    );
    for (const ix of L.islands) {
      box("pump island", ix, 0.12, canZ, 2.4, 0.32, 8.2, M.concrete, true);
      for (const cz of [CA.z0 + 1.2, CA.z1 - 1.2]) {
        box("canopy column", ix, canY / 2, cz, 0.4, canY, 0.4, M.metal, true);
        cyl("column base", ix, 0.3, cz, 0.7, 0.6, M.yellow, 8);
      }
      for (const bz of [canZ - 3.6, canZ + 3.6]) cyl("yellow bollard", ix, 0.6, bz, 0.14, 1.1, M.yellow);
    }
    function pump(n, x, z) {
      const root = new B.TransformNode("fuel pump " + n, scene);
      root.position.set(x, 0.26, z);
      box("pump foot", 0, 0.16, 0, 0.95, 0.32, 0.8, M.metal, false, root);
      box("red pump pedestal", 0, 0.76, 0, 0.79, 1, 0.64, M.red, false, root);
      box("pump enamel head", 0, 1.66, 0, 1.05, 0.94, 0.72, M.cream, false, root);
      for (const face of [-1, 1]) {
        box("pump display", 0, 1.78, face * 0.372, 0.8, 0.34, 0.025, M.black, false, root);
        sign(
          "pump digits " + n + (face > 0 ? "" : " rear"),
          0,
          1.81,
          face * 0.388,
          0.68,
          0.22,
          [{ text: n === 4 ? "——.——" : "000.00", size: 43, y: 0.5 }],
          "#0c221b",
          n === 4 ? "#778575" : "#b4c6a1",
          face > 0 ? Math.PI : 0,
          root,
        );
        sign(
          "pump number " + n + (face > 0 ? "" : " rear"),
          0,
          2.22,
          face * 0.03,
          0.48,
          0.33,
          [{ text: "0" + n, size: 57, y: 0.5 }],
          "#283d31",
          "#d8e3b9",
          face > 0 ? Math.PI : 0,
          root,
        );
        sign(
          "pump instructions " + n + (face > 0 ? "" : " rear"),
          0,
          1.3,
          face * 0.379,
          0.68,
          0.16,
          [{ text: n === 4 ? "OUT OF SERVICE" : "REGULAR  •  レギュラー", size: 25, y: 0.5 }],
          "#425447",
          "#d3d7b6",
          face > 0 ? Math.PI : 0,
          root,
        );
      }
      const hose = B.MeshBuilder.CreateTube(
        "fuel hose",
        {
          path: [
            new V(0.55, 1.82, 0),
            new V(0.86, 1.25, 0.05),
            new V(0.82, 0.3, 0.2),
            new V(0.52, 0.3, 0.3),
            new V(0.47, 1.37, 0.22),
          ],
          radius: 0.032,
          tessellation: 6,
        },
        scene,
      );
      hose.material = M.black;
      hose.parent = root;
      hose.isPickable = false;
      box("nozzle", 0.5, 1.44, 0.26, 0.09, 0.29, 0.12, M.metal, false, root);
      if (n === 4)
        for (const y of [0.65, 1.07]) {
          const tape = box("maintenance tape", 0, y, 0.401, 1.18, 0.07, 0.015, M.yellow, false, root);
          tape.rotation.z = 0.26;
        }
      collider(x, z, 0.62, 0.5);
      const target = box("pump interaction " + n, 0, 1.56, 0, 1.06, 1.8, 0.76, M.cream, false, root);
      target.visibility = 0;
      interact(
        "pump-" + n,
        target,
        n === 4 ? "Inspect disconnected Pump Four" : "Inspect pump " + n,
        "pump",
        { number: n },
        2.8,
      );
      spot("pump-" + n, x + 1.5, z);
      return root;
    }
    // Pump Four is the near island on the counter side: visible from the till.
    pump(1, L.islands[0], L.pumpZ[0]);
    pump(2, L.islands[0], L.pumpZ[1]);
    pump(3, L.islands[1], L.pumpZ[0]);
    pump(4, L.islands[1], L.pumpZ[1]);
    for (const x of L.islands)
      for (const z of [canZ - 3.4, canZ, canZ + 3.4])
        box("canopy fluorescent", x, canY - 0.16, z, 2.6, 0.04, 0.22, M.white);

    // Apron markings, parking, roadside sign, exterior services.
    for (let i = 0; i < 6; i++)
      box("parking stripe", -7.6 + i * 2.6, 0.002, 7.8, 0.08, 0.01, 4.6, M.cream);
    for (const [x, z] of [[-4.6, 10.4], [4.6, 10.4]])
      box("island approach chevron", x, 0.002, z, 2.4, 0.01, 0.1, M.yellow);
    box("price sign pole", -15.5, 3.6, 26, 0.24, 7.2, 0.24, M.metal, true);
    box("price sign case", -15.5, 6.5, 26, 3.4, 2.7, 0.24, M.cream);
    sign(
      "roadside prices",
      -15.5,
      6.5,
      26.14,
      3.2,
      2.5,
      [
        { text: "KUROSE", size: 61, y: 0.15 },
        { text: "レギュラー", size: 28, y: 0.36 },
        { text: "¥ 118", size: 68, y: 0.57 },
        { text: "OPEN 24H", size: 31, y: 0.85 },
      ],
      "#273b31",
      "#d7e2a8",
      Math.PI,
    );
    const vending = box("vending machine", 11.6, 1.24, 4.2, 1.12, 2.35, 0.88, M.red, true);
    box("vending window", 11.6, 1.53, 4.653, 0.84, 1.29, 0.03, M.dark);
    const vendRoots = [];
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 4; k++)
        vendRoots.push(W.makeProduct(products[k].id, 11.29 + k * 0.2, 1.02 + r * 0.34, 4.68));
    mergeRow(vendRoots, "vending stock");
    sign(
      "vending label",
      11.6,
      2.28,
      4.66,
      0.93,
      0.21,
      [{ text: "COLD DRINKS", size: 30, y: 0.5 }],
      "#b04334",
      "#efe2c4",
      Math.PI,
    );
    interact("vending", vending, "Inspect vending machine", "vending");
    box("air and water bay", 13.4, 0.7, 8.4, 0.9, 1.4, 0.7, M.yellow, true);
    sign(
      "air water sign",
      13.4,
      1.7,
      8.4,
      0.8,
      0.4,
      [{ text: "空気 / AIR · WATER", size: 26, y: 0.5 }],
      "#7d7134",
      "#efe8c8",
      FACE.nx,
    );
    box("outdoor bench", -9.6, 0.63, 3.4, 0.65, 0.12, 2.2, M.wood, true);
    for (const z of [2.6, 4.2]) box("bench leg", -9.6, 0.33, z, 0.5, 0.6, 0.08, M.metal);
    box("ice merchandiser", -9.7, 0.75, 6.4, 1.1, 1.5, 0.8, M.metal, true);
    sign(
      "ice sign",
      -9.7,
      1.6,
      6.81,
      0.9,
      0.36,
      [{ text: "氷 / ICE", size: 40, y: 0.5 }],
      "#3d5560",
      "#dfe9ee",
      Math.PI,
    );
    sign(
      "open sign",
      -4.1,
      2.3,
      L.entrance.z + 0.06,
      0.92,
      0.5,
      [
        { text: "OPEN", size: 69, y: 0.38 },
        { text: "24 HOURS", size: 22, y: 0.79 },
      ],
      "#243e30",
      "#e78e70",
      Math.PI,
    );
    const posterData = [
      ["STAY AWAKE", "BLACK COFFEE", "¥160"],
      ["LATE NIGHT", "HOT NOODLES", "¥230"],
      ["MISSING", "AKI FUJIMOTO", "PLEASE CALL"],
    ];
    posterData.forEach((p, i) =>
      sign(
        "window poster " + i,
        -2.6 + i * 1.5,
        1.5,
        L.entrance.z + 0.04,
        0.68,
        0.86,
        [
          { text: p[0], size: 35, y: 0.17 },
          { text: p[1], size: 24, y: 0.48 },
          { text: p[2], size: 31, y: 0.82 },
        ],
        i === 2 ? "#bbb796" : "#727d58",
        "#192d22",
        Math.PI,
      ),
    );
    for (const x of [-19, 22])
      for (let z = 2; z < 26; z += 4) {
        box("guard rail", x, 0.81, z, 0.1, 0.19, 3.9, M.metal);
        box("guard rail post", x, 0.42, z, 0.1, 0.84, 0.1, M.metal, true);
      }

    // Weather, planting, distance.
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 34 - 17,
        z = rnd() * 24 + 5.5;
      const p = B.MeshBuilder.CreateDisc("rain puddle", { radius: 0.4 + rnd() * 1.4, tessellation: 14 }, scene);
      p.position.set(x, 0.007, z);
      p.rotation.x = Math.PI / 2;
      p.scaling.y = 0.2 + rnd() * 0.5;
      p.material = M.puddle;
      p.isPickable = false;
    }
    for (let i = 0; i < 54; i++) {
      const x = rnd() * 76 - 38,
        z = rnd() * 62 - 24;
      if (x > -22 && x < 25 && z > -18 && z < 40) continue;
      const h = 5 + rnd() * 7;
      cyl("cedar trunk", x, h * 0.35, z, 0.22, h * 0.7, M.bark, 6);
      const crown = B.MeshBuilder.CreateCylinder(
        "cedar crown",
        { diameterTop: 0, diameterBottom: 2.5 + rnd() * 2, height: h, tessellation: 7 },
        scene,
      );
      crown.position.set(x, h * 0.7, z);
      crown.material = M.leaf;
      crown.isPickable = false;
    }
    for (let i = 0; i < 26; i++) {
      const m = B.MeshBuilder.CreateCylinder(
        "mountain silhouette",
        { diameterTop: 1, diameterBottom: 25, height: 16 + rnd() * 16, tessellation: 5 },
        scene,
      );
      m.position.set(-92 + i * 7.6, 2, -48 - rnd() * 12);
      m.material = M.leaf;
      m.isPickable = false;
    }
    for (const x of [-28, 28]) {
      cyl("utility pole", x, 5.7, L.road - 5, 0.2, 11.4, M.bark, 8);
      box("utility crossbar", x, 10.3, L.road - 5, 2, 0.1, 0.15, M.metal);
    }
    for (const z of [L.road - 5.5, L.road - 4.5]) {
      const cable = B.MeshBuilder.CreateLines(
        "power cable",
        {
          points: [
            new V(-60, 10.4, z),
            new V(-28, 11, z),
            new V(0, 9.7, z),
            new V(28, 11, z),
            new V(65, 10.2, z),
          ],
        },
        scene,
      );
      cable.color = color("#142520");
      cable.isPickable = false;
    }
    // Lighting: hard fluorescent pools inside, a cold wet dark everywhere else.
    const hemi = new B.HemisphericLight("night ambient", new V(0, 1, 0), scene);
    hemi.intensity = 0.44;
    hemi.diffuse = color("#8b969a");
    hemi.groundColor = color("#333c33");
    const moon = new B.DirectionalLight("moon", new V(-0.4, -0.85, 0.35), scene);
    moon.intensity = 0.2;
    moon.diffuse = color("#61808f");
    function light(n, x, y, z, intensity, range, c) {
      const l = new B.PointLight(n, new V(x, y, z), scene);
      l.diffuse = color(c);
      l.intensity = intensity;
      l.range = range;
      W.lights.push({ light: l, base: intensity });
      return l;
    }
    light("sales fluorescent west", -5.2, 3.05, 1.6, 1.85, 13, "#eaf0dc");
    light("sales fluorescent mid", -0.4, 3.05, -0.6, 1.95, 13, "#e7eeda");
    light("sales fluorescent east", 4.2, 3.05, 1.2, 1.8, 12, "#e4ecd6");
    light("cooler wall glow", -1.5, 2.4, -4.7, 1.1, 11, "#c6ded0");
    light("counter light", 7.2, 3.05, 2.4, 1.6, 9, "#edf2e0");
    light("corridor lamp", 1.5, 3.0, -6.8, 0.9, 8, "#c9d3a5");
    light("office lamp", -5.6, 3.0, -9, 1.0, 7.5, "#e5d8a0");
    light("stockroom lamp", 5.4, 3.0, -9, 0.95, 8.5, "#c9d3a5");
    light("canopy west", L.islands[0], canY - 0.5, canZ, 1.9, 18, "#dfe9d6");
    light("canopy east", L.islands[1], canY - 0.5, canZ, 1.8, 18, "#e2ebd8");
    light("vending glow", 11.4, 2, 5.2, 0.35, 4.5, "#b4d7c0");
    light("forecourt spill", 0.5, 3.4, 7.4, 0.7, 12, "#a8c6b4");
    const safety = new B.PointLight("emergency lamp", new V(3.4, 2.9, 1.2), scene);
    safety.diffuse = color("#dc6249");
    safety.intensity = 0.07;
    safety.range = 14;
    W.safety = safety;
    for (const [x, z] of [
      [-5.2, 3.4],
      [-5.2, 0.2],
      [-0.4, 3.4],
      [-0.4, 0.2],
      [-0.4, -3.2],
      [4.2, 3.4],
      [4.2, 0.2],
      [4.2, -3.2],
      [7.4, 3.4],
      [7.4, 0.2],
    ]) {
      box("ceiling fixture", x, L.height + 0.04, z, 2.1, 0.06, 0.3, M.metal);
      box("ceiling fluorescent", x, L.height - 0.005, z, 1.95, 0.025, 0.16, M.white);
    }
    box("office fluorescent", -5.6, L.height - 0.005, -9, 1.6, 0.035, 0.16, M.white);
    box("stock fluorescent", 5.4, L.height - 0.005, -9, 1.6, 0.035, 0.16, M.white);
    box("corridor fluorescent", 1.5, L.height - 0.005, -6.75, 2.2, 0.035, 0.16, M.white);

    // Rain. The texture is generated so file:// launch needs no image assets.
    const rainTexture = new B.DynamicTexture("raindrop", { width: 8, height: 64 }, scene, false),
      rc = rainTexture.getContext();
    rc.clearRect(0, 0, 8, 64);
    const rg = rc.createLinearGradient(0, 0, 0, 64);
    rg.addColorStop(0, "transparent");
    rg.addColorStop(0.8, "#b2c7bd");
    rg.addColorStop(1, "transparent");
    rc.fillStyle = rg;
    rc.fillRect(3, 0, 2, 64);
    rainTexture.update();
    const rain = new B.ParticleSystem("rain", 1800, scene);
    rain.particleTexture = rainTexture;
    rain.emitter = new V(0, 13, 14);
    rain.minEmitBox = new V(-24, 0, -12);
    rain.maxEmitBox = new V(24, 0, 18);
    rain.color1 = new B.Color4(0.57, 0.7, 0.69, 0.3);
    rain.color2 = new B.Color4(0.7, 0.8, 0.74, 0.16);
    rain.colorDead = new B.Color4(0.3, 0.4, 0.4, 0);
    rain.minSize = 0.15;
    rain.maxSize = 0.32;
    rain.minScaleX = 0.12;
    rain.maxScaleX = 0.18;
    rain.minScaleY = 2.8;
    rain.maxScaleY = 4.2;
    rain.minLifeTime = 0.6;
    rain.maxLifeTime = 0.95;
    rain.emitRate = 1700;
    rain.direction1 = new V(-1, -18, 0);
    rain.direction2 = new V(-0.3, -15, 0.6);
    rain.minEmitPower = 1;
    rain.maxEmitPower = 1;
    rain.updateSpeed = 0.018;
    rain.start();
    W.rain = rain;
    // Rain only splashes where it can actually fall: under the canopy it stops.
    const canopyDrip = new B.ParticleSystem("canopy drip", 260, scene);
    canopyDrip.particleTexture = rainTexture;
    canopyDrip.emitter = new V(canX, canY + 0.1, canZ);
    canopyDrip.minEmitBox = new V(-canW / 2, 0, -canD / 2);
    canopyDrip.maxEmitBox = new V(canW / 2, 0, canD / 2);
    canopyDrip.color1 = new B.Color4(0.6, 0.72, 0.7, 0.22);
    canopyDrip.color2 = new B.Color4(0.7, 0.8, 0.74, 0.1);
    canopyDrip.minSize = 0.1;
    canopyDrip.maxSize = 0.2;
    canopyDrip.minScaleY = 1.4;
    canopyDrip.maxScaleY = 2.4;
    canopyDrip.minLifeTime = 0.5;
    canopyDrip.maxLifeTime = 0.8;
    canopyDrip.emitRate = 90;
    canopyDrip.direction1 = new V(0, -9, 0);
    canopyDrip.direction2 = new V(0, -7, 0.2);
    canopyDrip.updateSpeed = 0.018;
    canopyDrip.start();

    for (const { light: l } of W.lights) {
      l.renderPriority = l.name.includes("canopy") ? 40 : 20;
      l.excludedMeshes = scene.meshes.filter((m) => {
        m.computeWorldMatrix(true);
        return (
          B.Vector3.Distance(m.getAbsolutePosition(), l.position) >
          l.range + Math.min(2, m.getBoundingInfo().boundingSphere.radiusWorld)
        );
      });
    }
    hemi.renderPriority = 90;
    moon.renderPriority = 80;
    safety.renderPriority = 70;

    // ---------------------------------------------------------------------
    // Shared navigation. Customers and the Passenger use the same grid, so a
    // route that exists for one exists for the other and nobody walks through
    // a gondola. Step is small enough to fit the 1.6 m cashier lane.
    // ---------------------------------------------------------------------
    const NAV = { step: 0.42, minX: -24, minZ: -16, w: 118, h: 122, clearance: 0.22 };
    W.nav = NAV;
    // A shut door is a doorway, not a wall: whoever arrives will open it. A
    // locked one is a wall, which is what makes locking the entrance matter.
    W.navBlocked = function (x, z, r) {
      if (x < -24 || x > 26 || z < -16 || z > 34) return true;
      for (const c of W.colliders) {
        if (!c.enabled || c.car) continue;
        if (c.door && !c.door.locked) continue;
        if (x > c.x - c.hx - r && x < c.x + c.hx + r && z > c.z - c.hz - r && z < c.z + c.hz + r)
          return true;
      }
      return false;
    };
    W.findPath = function (start, goal, clearance = NAV.clearance) {
      const cell = (x, z) => [
          Math.round((x - NAV.minX) / NAV.step),
          Math.round((z - NAV.minZ) / NAV.step),
        ],
        point = (i, j) => [NAV.minX + i * NAV.step, NAV.minZ + j * NAV.step],
        key = (i, j) => i + j * NAV.w;
      const clamp = (v, hi) => Math.max(0, Math.min(hi - 1, v));
      let [sx, sz] = cell(start.x, start.z),
        [gx, gz] = cell(goal.x, goal.z);
      sx = clamp(sx, NAV.w);
      sz = clamp(sz, NAV.h);
      gx = clamp(gx, NAV.w);
      gz = clamp(gz, NAV.h);
      const open = [{ x: sx, z: sz, f: 0, g: 0 }],
        came = new Map(),
        cost = new Map([[key(sx, sz), 0]]);
      let end = null,
        loops = 0;
      while (open.length && loops++ < 9000) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
        const a = open.splice(bi, 1)[0];
        if (Math.abs(a.x - gx) + Math.abs(a.z - gz) <= 1) {
          end = a;
          break;
        }
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const i = a.x + dx,
            j = a.z + dz;
          if (i < 0 || j < 0 || i >= NAV.w || j >= NAV.h) continue;
          const [wx, wz] = point(i, j);
          if (W.navBlocked(wx, wz, clearance)) continue;
          const k = key(i, j),
            g = a.g + 1;
          if (g >= (cost.get(k) ?? Infinity)) continue;
          cost.set(k, g);
          came.set(k, a);
          open.push({ x: i, z: j, g, f: g + Math.abs(i - gx) + Math.abs(j - gz) });
        }
      }
      if (!end) return [];
      const path = [];
      while (end && (end.x !== sx || end.z !== sz)) {
        path.push(point(end.x, end.z));
        end = came.get(key(end.x, end.z));
      }
      path.reverse();
      path.push([goal.x, goal.z]);
      return path;
    };

    // Build-time self check. A standing position that ends up inside a fixture
    // is the bug that put customers inside the shelving, so fail loudly here.
    W.auditSpots = function () {
      const bad = [];
      for (const [name, [x, z]] of Object.entries(W.spots))
        if (W.isBlocked(x, z, 0.26, true)) bad.push(name + " @ " + x + "," + z);
      return bad;
    };
    W.setPower = function (on) {
      W.power = on;
      for (const l of W.lights) l.light.intensity = on ? l.base : l.base * 0.07;
      safety.intensity = on ? 0.07 : 0.62;
      M.white.emissiveColor = color(on ? "#cce8bd" : "#283129");
      front.powered = on;
    };
    W.breakWindow = function (index) {
      const o = W.windows[index];
      if (!o || o.state >= 2) return false;
      o.state++;
      if (o.state === 1) {
        for (let i = 0; i < 9; i++) {
          const end = new V(o.x + (rnd() - 0.5) * o.w, 1 + rnd() * 1.9, o.z + 0.04);
          const line = B.MeshBuilder.CreateLines(
            "glass crack",
            { points: [new V(o.x, 1.8, o.z + 0.05), end] },
            scene,
          );
          line.color = color("#b3d6c3");
          line.isPickable = false;
          o.cracks.push(line);
        }
      } else {
        o.mesh.setEnabled(false);
        o.collider.enabled = false;
        if (o.kickCollider) o.kickCollider.enabled = false;
        if (o.kick) o.kick.setEnabled(false);
        o.cracks.forEach((m) => m.dispose());
        o.cracks = [];
        for (let i = 0; i < 17; i++) {
          const s = box(
            "broken glass",
            o.x + (rnd() - 0.5) * o.w,
            0.245,
            o.z - 0.15 - rnd() * 1.1,
            0.05 + rnd() * 0.2,
            0.009,
            0.03 + rnd() * 0.12,
            M.glass,
          );
          s.rotation.y = rnd() * 6.28;
          o.debris.push(s);
        }
        W.breakCount++;
      }
      return true;
    };
    W.glassUnderfoot = function (x, z) {
      return W.windows.some(
        (w) =>
          w.state === 2 &&
          Math.abs(x - w.x) < w.w * 0.5 + 0.3 &&
          Math.abs(z - (w.z - 0.6)) < 0.9,
      );
    };
    // Vehicles are simple articulated meshes driven on continuous routes.
    W.makeCar = function (
      type = "sedan",
      paint = "#76827a",
      plate = "KU 17-04",
    ) {
      const root = new B.TransformNode(type + " vehicle", scene),
        body = mat(type + " paint " + W.cars.length, paint),
        glass = mat(type + " windows " + W.cars.length, "#19343b", 0.035),
        car = {
          root,
          type,
          parts: [],
          wheels: [],
          path: [],
          speed: 0,
          targetSpeed: 7,
          moving: false,
          done: null,
          plate,
        };
      function cb(n, x, y, z, sx, sy, sz, m) {
        return box(n, x, y, z, sx, sy, sz, m, false, root);
      }
      cb("undercarriage", 0, 0.39, 0, 1.68, 0.22, 3.75, M.black);
      cb("body", 0, 0.71, 0, 1.8, 0.52, 3.95, body);
      cb("hood", 0, 0.95, 1.23, 1.72, 0.16, 1.2, body);
      cb("cabin", 0, 1.18, -0.25, 1.5, 0.73, 1.85, glass);
      cb("roof", 0, 1.61, -0.29, 1.62, 0.12, 1.96, body);
      cb("windshield divider", 0, 1.23, 0.72, 1.6, 0.05, 0.045, body);
      for (const x of [-0.79, 0.79]) {
        cb("window pillar", x, 1.26, -0.1, 0.06, 0.72, 0.1, body);
        cb("door line", x * 1.15, 0.86, -0.25, 0.025, 0.37, 0.018, M.black);
        cb("mirror", x * 1.24, 1.08, 0.53, 0.23, 0.12, 0.16, body);
      }
      if (type === "van") {
        cb("cargo body", 0, 1.29, -0.74, 1.8, 1.18, 2.28, body);
        cb("cargo roof", 0, 1.91, -0.74, 1.85, 0.1, 2.35, body);
        cb("van rear seam", 0, 1.21, -1.992, 0.025, 1.05, 0.012, M.black);
      }
      if (type === "pickup") {
        cb("truck bed floor", 0, 0.89, -1.12, 1.6, 0.08, 1.55, M.black);
        for (const x of [-0.84, 0.84])
          cb("truck bed rail", x, 1.15, -1.2, 0.13, 0.44, 1.5, body);
      }
      if (type === "taxi") {
        cb("taxi roof sign", 0, 1.77, -0.25, 0.64, 0.2, 0.26, M.warm);
        sign(
          "taxi lettering",
          0,
          1.78,
          -0.108,
          0.58,
          0.15,
          [{ text: "TAXI", size: 59, y: 0.5 }],
          "#d8cd8e",
          "#253c2a",
          Math.PI,
          root,
        );
      }
      for (const z of [-1.25, 1.25])
        for (const side of [-1, 1]) {
          const wh = cyl(
            "tire",
            side * 0.9,
            0.43,
            z,
            0.68,
            0.18,
            M.black,
            12,
            root,
          );
          wh.rotation.z = Math.PI / 2;
          const hub = cyl(
            "wheel hub",
            side * 1.002,
            0.43,
            z,
            0.37,
            0.017,
            M.metal,
            8,
            root,
          );
          hub.rotation.z = Math.PI / 2;
          car.wheels.push(wh, hub);
        }
      cb("front bumper", 0, 0.51, 2.01, 1.86, 0.12, 0.08, M.metal);
      cb("rear bumper", 0, 0.51, -2.01, 1.86, 0.12, 0.08, M.metal);
      for (const x of [-0.61, 0.61]) {
        cb("headlamp", x, 0.85, 1.995, 0.42, 0.2, 0.02, M.warm);
        const tail = cb(
          "tail light",
          x,
          0.84,
          -1.997,
          0.36,
          0.19,
          0.02,
          M.redGlow,
        );
        car.parts.push(tail);
      }
      sign(
        "vehicle plate " + plate,
        0,
        0.61,
        2.057,
        0.62,
        0.19,
        [{ text: plate, size: 35, y: 0.5 }],
        "#c5c6ad",
        "#2b4030",
        Math.PI,
        root,
      );
      car.doorPivot = new B.TransformNode("driver door hinge", scene);
      car.doorPivot.parent = root;
      car.doorPivot.position.set(0.92, 0.92, 0.63);
      box(
        "driver door panel",
        0,
        0,
        -0.64,
        0.06,
        0.45,
        1.25,
        body,
        false,
        car.doorPivot,
      );
      box(
        "driver door glass",
        0,
        0.44,
        -0.64,
        0.025,
        0.42,
        1.25,
        glass,
        false,
        car.doorPivot,
      );
      car.doorOpen = 0;
      car.doorTarget = 0;
      const hit = cb(
        "vehicle body interaction",
        0,
        1,
        0,
        1.85,
        1.5,
        4.02,
        body,
      );
      hit.visibility = 0;
      car.hit = hit;
      car.co = collider(0, 0, 1, 2.15, { car });
      car.route = function (points, done) {
        this.path = points.map((p) => new V(p[0], 0, p[1]));
        this.done = done;
        this.moving = true;
      };
      car.root.position.set(-60, 0, 32);
      W.cars.push(car);
      return car;
    };
    W.makeNPC = function (
      name,
      coat = "#505951",
      hair = "#272c27",
      female = false,
    ) {
      const root = new B.TransformNode(name, scene);
      const skin = mat(name + " skin", "#9d987e"),
        cloth = mat(name + " coat", coat),
        pants = mat(name + " trousers", "#283531"),
        hm = mat(name + " hair", hair);
      const n = {
        name,
        root,
        path: [],
        speed: 1.28,
        walking: false,
        done: null,
        legs: [],
        arms: [],
        threat: false,
        active: true,
      };
      cyl("torso", 0, 1.13, 0, 0.41, 0.61, cloth, 8, root).scaling.z = 0.66;
      box("shirt collar", 0, 1.46, 0.04, 0.26, 0.08, 0.2, M.cream, false, root);
      box("neck", 0, 1.48, 0, 0.13, 0.13, 0.13, skin, false, root);
      const head = ellipsoid("head", 0, 1.67, 0, 0.265, 0.34, 0.27, skin, root);
      ellipsoid("hair crown", 0, 1.79, -0.037, 0.272, 0.18, 0.253, hm, root);
      if (female)
        ellipsoid("back hair", 0, 1.64, -0.1, 0.29, 0.43, 0.18, hm, root);
      box("nose", 0, 1.65, 0.136, 0.05, 0.065, 0.05, skin, false, root);
      for (const x of [-0.064, 0.064]) {
        box("eye", x, 1.715, 0.119, 0.031, 0.014, 0.01, M.black, false, root);
        box("brow", x, 1.74, 0.118, 0.046, 0.012, 0.012, hm, false, root);
      }
      box("mouth", 0, 1.59, 0.118, 0.056, 0.012, 0.009, hm, false, root);
      for (const s of [-1, 1]) {
        const leg = new B.TransformNode("leg", scene);
        leg.parent = root;
        leg.position.set(s * 0.115, 0.83, 0);
        cyl("trouser leg", 0, -0.32, 0, 0.17, 0.64, pants, 7, leg);
        box("shoe", 0, -0.65, 0.055, 0.17, 0.13, 0.32, M.black, false, leg);
        n.legs.push(leg);
        const arm = new B.TransformNode("arm", scene);
        arm.parent = root;
        arm.position.set(s * 0.285, 1.38, 0);
        cyl("sleeve", 0, -0.24, 0, 0.16, 0.49, cloth, 7, arm);
        ellipsoid("shoulder", 0, 0, 0, 0.19, 0.19, 0.19, cloth, arm);
        ellipsoid("hand", 0, -0.51, 0.015, 0.11, 0.16, 0.12, skin, arm);
        n.arms.push(arm);
      }
      const hit = box(
        name + " interaction",
        0,
        1,
        0,
        0.56,
        1.8,
        0.43,
        cloth,
        false,
        root,
      );
      hit.visibility = 0;
      interact(
        "npc-" + name + "-" + W.npcs.length,
        hit,
        "Talk to " + name,
        "npc",
        { npc: n },
        2.8,
      );
      n.hit = hit;
      n.route = function (points, done) {
        this.path = points.map((p) => new V(p[0], 0.23, p[1]));
        this.done = done;
        this.walking = true;
      };
      n.root.position.set(10, 0.23, 12);
      W.npcs.push(n);
      return n;
    };
    W.setDisplay = function (mesh, top, large, bottom) {
      const tex = mesh.material.diffuseTexture;
      if (!tex || !tex.getContext) return;
      const c = tex.getContext(),
        size = tex.getSize();
      c.fillStyle = "#10271c";
      c.fillRect(0, 0, size.width, size.height);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#b0d698";
      c.font = "bold " + Math.round(size.height * 0.13) + "px monospace";
      c.fillText(top, size.width / 2, size.height * 0.19);
      c.font = "bold " + Math.round(size.height * 0.26) + "px monospace";
      c.fillText(large, size.width / 2, size.height * 0.5);
      c.font = Math.round(size.height * 0.09) + "px monospace";
      c.fillText(bottom, size.width / 2, size.height * 0.82);
      tex.update();
    };
    // Customers and the Passenger navigate with the shared grid rather than
    // walking through fixtures in a straight line.
    const baseMakeNPC = W.makeNPC;
    W.makeNPC = function () {
      const n = baseMakeNPC.apply(this, arguments);
      n.walkTo = function (x, z, done) {
        const path = W.findPath(this.root.position, { x, z }, 0.24);
        if (path.length) this.route(path, done);
        else this.route([[x, z]], done);
        return path.length > 0;
      };
      return n;
    };

    // The pass tray on the customer side of the counter holds their shopping.
    W.trayOrigin = new V(6.02, 1.46, 3.2);
    W.clearCounter = function () {
      W.counterItems.forEach((p) => p.dispose());
      W.counterItems = [];
    };
    W.trayPosition = function (i) {
      const o = W.trayOrigin;
      return new V(o.x - 0.12 + (i % 2) * 0.2, o.y, o.z - 0.22 + Math.floor(i / 2) * 0.22);
    };
    W.scannedPosition = function (i) {
      const o = W.trayOrigin;
      return new V(o.x + 0.16, o.y, o.z + 0.18 - i * 0.06);
    };

    W.update = function (dt, player) {
      W.time += dt;
      const t = W.time;
      for (const car of W.cars) {
        if (!car.root.isEnabled()) {
          car.co.enabled = false;
          continue;
        }
        car.co.enabled = true;
        car.doorOpen = B.Scalar.Lerp(car.doorOpen, car.doorTarget, Math.min(1, dt * 5));
        car.doorPivot.rotation.y = -car.doorOpen * 1.04;
        if (car.moving && car.path.length) {
          const to = car.path[0],
            p = car.root.position,
            d = to.subtract(p);
          d.y = 0;
          const dist = d.length();
          const blocked =
            player &&
            B.Vector3.Distance(new V(player.x, 0, player.z), p) < 3.2 &&
            V.Dot(new V(player.x - p.x, 0, player.z - p.z), d) > 0;
          car.speed = B.Scalar.Lerp(car.speed, blocked ? 0 : car.targetSpeed, Math.min(1, dt * 2));
          const step = car.speed * dt;
          if (dist < Math.max(0.15, step)) {
            p.copyFrom(to);
            car.path.shift();
            if (!car.path.length) {
              car.moving = false;
              car.speed = 0;
              const f = car.done;
              car.done = null;
              if (f) f();
            }
          } else {
            p.addInPlace(d.scale(step / dist));
            const yaw = Math.atan2(d.x, d.z),
              delta = Math.atan2(
                Math.sin(yaw - car.root.rotation.y),
                Math.cos(yaw - car.root.rotation.y),
              );
            car.root.rotation.y += delta * Math.min(1, dt * 5);
            car.wheels.forEach((w) => (w.rotation.x += step * 2.6));
          }
        }
        const yaw = car.root.rotation.y;
        car.co.x = car.root.position.x;
        car.co.z = car.root.position.z;
        car.co.hx = Math.abs(Math.cos(yaw)) * 0.94 + Math.abs(Math.sin(yaw)) * 2.05;
        car.co.hz = Math.abs(Math.sin(yaw)) * 0.94 + Math.abs(Math.cos(yaw)) * 2.05;
      }
      // Proximity sensor on the sliding entrance, wherever the entrance is.
      const atDoor = (x, z, pad) =>
        Math.abs(x - front.x) < front.half + pad && Math.abs(z - front.z) < 2.1;
      let near = player && atDoor(player.x, player.z, 0.5);
      for (const n of W.npcs)
        if (n.active && n.root.isEnabled() && atDoor(n.root.position.x, n.root.position.z, 0.5))
          near = true;
      front.hold = Math.max(0, front.hold - dt);
      const desired = front.powered && !front.locked && (near || front.hold > 0);
      if (desired && front.target === 0 && W.onDoor) W.onDoor();
      front.target = desired ? 1 : 0;
      front.open = B.Scalar.Lerp(front.open, front.target, Math.min(1, dt * 8));
      front.panels.forEach(({ root, side, half }, i) => {
        root.position.x = front.x + side * (half + front.open * front.half);
        front.colliders[i].x = root.position.x;
      });
      for (const d of W.doors) {
        if (d.autoClose && t > d.autoClose) {
          d.target = 0;
          d.autoClose = 0;
        }
        d.open = B.Scalar.Lerp(d.open, d.target, Math.min(1, dt * 5));
        d.pivot.rotation.y = (d.baseRot || 0) - d.open * Math.PI * 0.52;
        d.co.enabled = d.open < 0.7;
      }
      for (const n of W.npcs) {
        if (!n.active || !n.root.isEnabled()) continue;
        if (n.walking && n.path.length) {
          const p = n.root.position,
            to = n.path[0],
            d = to.subtract(p);
          d.y = 0;
          const dist = d.length();
          const crossing =
            Math.abs(p.x - front.x) < front.half + 0.3 &&
            Math.abs(p.z - front.z) < 1.5 &&
            ((p.z > front.z && to.z < front.z) || (p.z < front.z && to.z > front.z));
          const waitDoor = crossing && front.open < 0.73;
          const playerBlocks =
            player && !n.threat && Math.hypot(player.x - p.x, player.z - p.z) < 0.65;
          const step = waitDoor || playerBlocks ? 0 : dt * n.speed;
          // Anyone who walks up to a shut, unlocked door pushes it open.
          for (const door of W.doors)
            if (!door.locked && door.target === 0 && Math.hypot(p.x - door.x, p.z - door.z) < 1.2) {
              door.target = 1;
              door.autoClose = t + 8;
              if (W.onDoor) W.onDoor();
            }
          if (dist < Math.max(0.08, step)) {
            p.x = to.x;
            p.z = to.z;
            n.path.shift();
            if (!n.path.length) {
              n.walking = false;
              const f = n.done;
              n.done = null;
              if (f) f();
            }
          } else if (step > 0) {
            p.addInPlace(d.scale(step / dist));
            const yaw = Math.atan2(d.x, d.z),
              delta = Math.atan2(
                Math.sin(yaw - n.root.rotation.y),
                Math.cos(yaw - n.root.rotation.y),
              );
            n.root.rotation.y += delta * Math.min(1, dt * 9);
          }
          n.legs.forEach(
            (l, i) => (l.rotation.x = step > 0 ? Math.sin(t * 8 + i * Math.PI) * 0.37 : 0),
          );
          n.arms.forEach(
            (a, i) =>
              (a.rotation.x = step > 0 ? Math.sin(t * 8 + i * Math.PI + Math.PI) * 0.24 : 0),
          );
        } else {
          n.legs.forEach((l) => (l.rotation.x *= 0.8));
          n.arms.forEach((l) => (l.rotation.x *= 0.8));
        }
      }
    };
    W.isBlocked = function (x, z, r = 0.25, ignoreCars = false) {
      if (x < -24 || x > 26 || z < -16 || z > 34) return true;
      for (const c of W.colliders) {
        if (!c.enabled || (ignoreCars && c.car)) continue;
        if (x > c.x - c.hx - r && x < c.x + c.hx + r && z > c.z - c.hz - r && z < c.z + c.hz + r)
          return true;
      }
      return false;
    };
    if (window.NightStoreOps) window.NightStoreOps.install(W);
    const badSpots = W.auditSpots();
    if (badSpots.length)
      console.warn("Night Shift: standing positions inside geometry:", badSpots);
    return W;
  };
})();
