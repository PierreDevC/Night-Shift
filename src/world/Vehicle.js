/* Cars, vans and pickups: procedural bodywork, lamps, opening doors and the
   scripted routes they drive along the road and forecourt.

   Installed as W.makeCar so existing call sites and tests are unchanged. */
window.NS = window.NS || {};
NS.Vehicle = class Vehicle {
  static install(W, scene) {
    const B = BABYLON, V = B.Vector3;
    const { mat, box, cyl, ellipsoid, sign, interact, collider, M } = W.kit;
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
        if (window.NightModels) NightModels.car(W, car, body, glass);
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
  }
};
