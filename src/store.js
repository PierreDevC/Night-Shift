/* Store operations: carried props, first-person hands, cash, delivery and restocking.
   Installed explicitly by world.js once the layout exists. No monkey-patching:
   the layout has exactly one source of truth and this file never moves it. */
(function () {
  "use strict";
  window.NightStoreOps = {
    install(W) {
      const B = window.BABYLON,
        S = W.scene,
        M = W.M,
        box = W.box,
        cyl = W.cyl,
        sign = W.sign;

      // One prop definition serves both the held model and the dropped item.
      W.makeCarryProp = function (kind, id) {
        let root = new B.TransformNode("carried " + kind, S);
        if (kind === "carton") {
          root.main = box("carried coffee carton", 0, 0.17, 0, 0.56, 0.34, 0.4, M.wood, false, root);
          box("carton tape", 0, 0.345, 0, 0.07, 0.012, 0.4, M.cream, false, root);
          sign(
            "carried carton label",
            0,
            0.17,
            -0.206,
            0.45,
            0.21,
            [
              { text: "KUROSE COFFEE", size: 34, y: 0.28 },
              { text: "12 CANS / KEEP UPRIGHT", size: 19, y: 0.67 },
            ],
            "#a58b5d",
            "#26362a",
            0,
            root,
          );
          for (const x of [-0.25, 0.25])
            box("carton folded flap", x, 0.354, 0, 0.06, 0.015, 0.38, M.wood, false, root);
        } else if (kind === "coffee") {
          root.main = cyl("paper coffee cup", 0, 0.12, 0, 0.15, 0.24, M.cream, 12, root);
          cyl("coffee cup lid", 0, 0.248, 0, 0.16, 0.02, M.black, 12, root);
        } else {
          root.dispose();
          root = W.makeProduct(id, 0, 0, 0);
        }
        return root;
      };

      // Held items render in their own layer so the security camera never sees them.
      W.setHeldVisual = function (camera, carry) {
        if (W.heldRoot) W.heldRoot.dispose();
        W.heldRoot = null;
        if (!carry) return;
        const rig = new B.TransformNode("first-person hands", S);
        rig.parent = camera;
        rig.position.set(carry.kind === "carton" ? 0.02 : 0.3, -0.55, 0.65);
        const prop = W.makeCarryProp(carry.kind, carry.id);
        prop.parent = rig;
        const skin = W.handMaterial || (W.handMaterial = W.mat("attendant hands", "#b29978"));
        const sleeve = W.sleeveMaterial || (W.sleeveMaterial = W.mat("attendant uniform", "#485747"));
        for (const side of carry.kind === "carton" ? [-1, 1] : [1]) {
          const x = side * (carry.kind === "carton" ? 0.27 : 0.065);
          const arm = cyl("attendant sleeve", x, 0.01, -0.17, 0.13, 0.43, sleeve, 8, rig);
          arm.rotation.x = -0.95;
          const palm = box("attendant hand", x, 0.105, -0.035, 0.095, 0.075, 0.15, skin, false, rig);
          palm.rotation.z = side * 0.15;
        }
        for (const m of rig.getChildMeshes()) {
          m.isPickable = false;
          m.renderingGroupId = 2;
          m.layerMask = 0x10000000;
        }
        camera.layerMask |= 0x10000000;
        S.setRenderingAutoClearDepthStencil(2, true, true, true);
        W.heldRoot = rig;
      };

      W.dropCarry = function (carry, x, z, yaw) {
        const prop = W.makeCarryProp(carry.kind, carry.id);
        prop.position.set(x, 0.235, z);
        prop.rotation.y = yaw;
        const id = "dropped-item-" + W.interactions.length;
        W.interact(id, prop.main, "Pick up " + carry.name.toLowerCase(), "pickup", {
          carry: { ...carry },
          root: prop,
        });
        prop.computeWorldMatrix(true);
        prop.getChildMeshes().forEach((m) => m.computeWorldMatrix(true));
        return prop;
      };

      // Customers leave notes and coins on the pass tray.
      W.cashPiles = [];
      W.placeCash = function (amount) {
        const o = W.trayOrigin,
          root = new B.TransformNode("cash left by customer", S);
        root.position.set(o.x, o.y + 0.02, o.z);
        const notes = Math.min(3, Math.max(1, Math.floor(amount / 1000) + 1));
        for (let i = 0; i < notes; i++) {
          const n = box("bank note", -0.02 + i * 0.012, i * 0.004, 0.04 * i, 0.19, 0.003, 0.09, M.cream, false, root);
          n.rotation.y = (i - 1) * 0.09;
        }
        for (let i = 0; i < Math.min(6, Math.max(2, Math.ceil((amount % 1000) / 120))); i++) {
          const coin = cyl(
            "cash coin",
            0.1 + (i % 3) * 0.055,
            0.012,
            -0.12 + Math.floor(i / 3) * 0.07,
            0.055,
            0.02,
            i % 2 ? M.yellow : M.metal,
            10,
            root,
          );
          coin.rotation.x = Math.PI / 2;
        }
        W.cashPiles.push(root);
        return root;
      };
      W.takeCash = function () {
        if (!W.cashPiles.length) return false;
        W.cashPiles.forEach((p) => p.dispose());
        W.cashPiles.length = 0;
        return true;
      };

      W.consumeDelivery = function () {
        W.deliveryMeshes.forEach((m) => m.setEnabled(false));
        W.colliders
          .filter((c) => W.deliveryMeshes.includes(c.mesh))
          .forEach((c) => (c.enabled = false));
        const o = W.interactions.find((i) => i.id === "coffee-carton");
        if (o) o.enabled = false;
      };
      W.restockCoffee = function () {
        W.coffeeStockMeshes.forEach((m) => m.setEnabled(true));
        W.stock.coffee = 24;
      };
    },
  };
})();
