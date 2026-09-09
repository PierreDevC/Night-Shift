/* The shared navigation grid: one walkability test and one A* planner used
   by customers, the Passenger and the chore routes alike, plus the
   string-pulling pass that turns grid staircases into natural diagonals.
   Installed onto the world so the tested surface (W.findPath, W.navBlocked,
   W.nav) is unchanged. */
window.NS = window.NS || {};
NS.NavGrid = class NavGrid {
  static install(W) {
    const NAV = { step: 0.42, minX: -24, minZ: -16, w: 118, h: 122, clearance: 0.22 };
    W.nav = NAV;
    // A shut door is a doorway, not a wall: whoever arrives will open it. A
    // locked one is a wall, which is what makes locking the entrance matter.
    W.navBlocked = function (x, z, r, staffAllowed = true) {
      if (x < -24 || x > 26 || z < -16 || z > 34) return true;
      for (const c of W.colliders) {
        if (c.door?.staffOnly && !staffAllowed) {
          if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) return true;
          continue;
        }
        if (!c.enabled || c.car) continue;
        if (c.door && !c.door.locked) continue;
        if (x > c.x - c.hx - r && x < c.x + c.hx + r && z > c.z - c.hz - r && z < c.z + c.hz + r)
          return true;
      }
      return false;
    };
    W.findPath = function (start, goal, clearance = NAV.clearance, staffAllowed = true) {
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
          if (W.navBlocked(wx, wz, clearance, staffAllowed)) continue;
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
      // String-pulling. The grid is 4-connected, so the raw path is an
      // axis-aligned staircase and anyone following it walks like a rook.
      // Replace each run of cells with the longest straight segment that the
      // same walkability test accepts, sampled finely enough that a segment
      // cannot thread between two checks. People then cross open floor on
      // diagonals and only turn where there is actually something to turn for.
      const clear = (a, b) => {
        const dx = b[0] - a[0], dz = b[1] - a[1],
          steps = Math.ceil(Math.hypot(dx, dz) / 0.15);
        for (let s = 1; s < steps; s++)
          if (W.navBlocked(a[0] + (dx * s) / steps, a[1] + (dz * s) / steps, clearance, staffAllowed))
            return false;
        return true;
      };
      const smooth = [];
      let anchor = [start.x, start.z], i = 0;
      while (i < path.length) {
        let j = i;
        while (j + 1 < path.length && clear(anchor, path[j + 1])) j++;
        smooth.push(path[j]);
        anchor = path[j];
        i = j + 1;
      }
      return smooth;
    };
    W.navGrid = new NS.NavGrid(W);
  }
  constructor(W) {
    this.W = W;
  }
  findPath(start, goal, clearance, staffAllowed) {
    return this.W.findPath(start, goal, clearance, staffAllowed);
  }
  blocked(x, z, r, staffAllowed) {
    return this.W.navBlocked(x, z, r, staffAllowed);
  }
};
