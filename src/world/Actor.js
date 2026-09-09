/* Everyone with a body: the procedural figure, its walk cycle, and routing
   along the shared navigation grid. Customers, the supervisor, the Passenger
   and the tape-only watcher are all Actors; what differs is who drives them.

   Installed as W.makeNPC so existing call sites and tests are unchanged. */
window.NS = window.NS || {};
NS.Actor = class Actor {
  static install(W, scene) {
    const B = BABYLON, V = B.Vector3;
    const { mat, box, cyl, ellipsoid, interact, M } = W.kit;
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
        if (window.NightModels) NightModels.dress(W, n, coat, hair, female);
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
  }
};
