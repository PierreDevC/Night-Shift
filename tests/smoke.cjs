/* End-to-end game checks. Requires Playwright only for development, never for play. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { launch } = require("./helpers/browser.cjs");
(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.setOffline(true);
  const page = await context.newPage(),
    errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 300));
  });
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  const url = pathToFileURL(path.resolve("index.html")).href;
  await page.goto(url + "?debug=1");
  await page.waitForSelector("#menu:not(.hidden)", { timeout: 60000 });
  await page.screenshot({ path: "test-results/title.png" });

  // The layout validates its own standing positions while it builds.
  assert.deepEqual(
    await page.evaluate(() => __nightShift.W.auditSpots()),
    [],
    "Every fixture standing position is clear of geometry",
  );

  // Story regression is deterministic; overlapping traffic has its own test.
  await page.evaluate(() => (__nightShift.G.ambientEnabled = false));
  await page.click("#start");
  assert.equal(await page.evaluate(() => __nightShift.G.mode), "playing");
  const action = (id) => page.evaluate((id) => __nightShift.interact(id), id);
  const tick = (s) => page.evaluate((s) => __nightShift.tick(s), s);
  const state = () =>
    page.evaluate(() => {
      const { G, W } = __nightShift;
      return {
        phase: G.phase,
        flags: { ...G.flags },
        customer: G.customer
          ? {
              id: G.customer.id,
              state: G.customer.state,
              position: G.customer.npc?.root.position.asArray(),
              car: G.customer.car.root.position.asArray(),
            }
          : null,
        scan: G.scan,
        mode: G.mode,
        ending: G.ending,
        health: G.health,
        door: W.frontDoor.open,
      };
    });
  const close = () => page.evaluate(() => __nightShift.closeModal());
  const choice = async (text) => {
    await page.evaluate((text) => {
      const b = [...document.querySelectorAll("#modal-buttons button")].find(
        (b) => b.textContent.trim() === text,
      );
      if (!b) throw new Error("Missing modal choice: " + text);
      b.click();
    }, text);
  };

  // Walk-up aiming. The vantage point is searched for rather than hard-coded,
  // so the checks follow the layout instead of drifting out of date with it.
  const aim = (id) =>
    page.evaluate((id) => {
      const d = __nightShift,
        W = d.W,
        o = W.interactions.find((o) => o.id === id);
      if (!o) throw new Error("No interaction: " + id);
      o.mesh.computeWorldMatrix(true);
      const c = o.mesh.getBoundingInfo().boundingBox.centerWorld;
      for (let ring = 0.6; ring < 3.2; ring += 0.2)
        for (let a = 0; a < 32; a++) {
          const t = (a / 32) * Math.PI * 2,
            px = c.x + Math.cos(t) * ring,
            pz = c.z + Math.sin(t) * ring;
          if (W.isBlocked(px, pz, 0.24)) continue;
          d.teleport(px, pz, 0, 0);
          const v = c.subtract(d.getCamera().position.clone());
          d.teleport(px, pz, Math.atan2(v.x, v.z), -Math.atan2(v.y, Math.hypot(v.x, v.z)));
          d.scene.render();
          d.pick();
          if (d.G.interact && d.G.interact.id === id) return id;
        }
      return d.G.interact?.id ?? null;
    }, id);

  // No collision bypass: keyboard movement enters only once the door opens.
  await page.evaluate(() =>
    __nightShift.teleport(__nightShift.W.frontDoor.x, __nightShift.W.frontDoor.z + 2.4, Math.PI),
  );
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(5000);
  await page.keyboard.up("KeyW");
  assert.ok(
    await page.evaluate(() => __nightShift.G.player.z < __nightShift.W.frontDoor.z - 0.4),
    "Can walk through the automatic front door",
  );
  await page.evaluate(() => {
    const d = __nightShift;
    d.W.frontDoor.locked = true;
    d.teleport(d.W.frontDoor.x, d.W.frontDoor.z + 1.3, Math.PI);
  });
  await tick(2);
  assert.ok(
    await page.evaluate(() =>
      __nightShift.W.isBlocked(__nightShift.W.frontDoor.x, __nightShift.W.frontDoor.z, 0.24),
    ),
    "Locked sliding door blocks passage",
  );
  await page.evaluate(() => (__nightShift.W.frontDoor.locked = false));

  // Every interaction in the game must be usable from somewhere a player can
  // physically stand. This is the check that a teleporting test cannot make.
  const unreachable = await page.evaluate(() => {
    const d = __nightShift,
      W = d.W;
    const step = 0.1,
      r = 0.24,
      x0 = -24,
      x1 = 26,
      z0 = -16,
      z1 = 34;
    const nx = Math.round((x1 - x0) / step),
      nz = Math.round((z1 - z0) / step),
      idx = (i, j) => i * nz + j;
    const doors = W.doors.map((x) => [x.target, x.open, x.co.enabled]);
    W.doors.forEach((x) => {
      x.target = 1;
      x.open = 1;
      x.co.enabled = false;
    });
    W.frontDoor.colliders.forEach((c) => (c.enabled = false));
    const free = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        free[idx(i, j)] = W.isBlocked(x0 + i * step, z0 + j * step, r) ? 0 : 1;
    const seen = new Uint8Array(nx * nz);
    const si = Math.round((d.G.player.x - x0) / step),
      sj = Math.round((d.G.player.z - z0) / step);
    const st = [[si, sj]];
    seen[idx(si, sj)] = 1;
    while (st.length) {
      const [i, j] = st.pop();
      for (const [a, b] of [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ]) {
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const k = idx(a, b);
        if (seen[k] || !free[k]) continue;
        seen[k] = 1;
        st.push([a, b]);
      }
    }
    const bad = [];
    for (const o of W.interactions) {
      if (!o.enabled || !o.mesh || o.mesh.isDisposed()) continue;
      o.mesh.computeWorldMatrix(true);
      const c = o.mesh.getBoundingInfo().boundingBox.centerWorld;
      const rad = Math.ceil(3.6 / step),
        ci = Math.round((c.x - x0) / step),
        cj = Math.round((c.z - z0) / step);
      let ok = false;
      for (let i = Math.max(0, ci - rad); i < Math.min(nx, ci + rad) && !ok; i++)
        for (let j = Math.max(0, cj - rad); j < Math.min(nz, cj + rad) && !ok; j++) {
          if (!seen[idx(i, j)]) continue;
          const px = x0 + i * step,
            pz = z0 + j * step;
          if (Math.hypot(px - c.x, pz - c.z) > 3.4) continue;
          d.teleport(px, pz, 0, 0);
          const v = c.subtract(d.getCamera().position.clone());
          d.teleport(px, pz, Math.atan2(v.x, v.z), -Math.atan2(v.y, Math.hypot(v.x, v.z)));
          d.scene.render();
          d.pick();
          if (d.G.interact && d.G.interact.id === o.id) ok = true;
        }
      if (!ok) bad.push(o.id);
    }
    W.doors.forEach((x, i) => {
      x.target = doors[i][0];
      x.open = doors[i][1];
      x.co.enabled = doors[i][2];
    });
    W.frontDoor.colliders.forEach((c) => (c.enabled = true));
    return bad;
  });
  assert.deepEqual(unreachable, [], "Every interaction is usable on foot");

  // Story: clock in, restock, then the night's customers.
  assert.equal(await aim("stock-door"), "stock-door");
  await page.keyboard.press("KeyE");
  await tick(1);
  assert.equal(await aim("office-door"), "office-door");
  await page.keyboard.press("KeyE");
  await tick(1);
  assert.equal(await aim("timeclock"), "timeclock");
  await page.keyboard.press("KeyE");
  assert.equal((await state()).phase, "prep");
  assert.equal(await aim("coffee-carton"), "coffee-carton");
  await page.keyboard.press("KeyE");
  assert.ok(await page.evaluate(() => __nightShift.G.carry?.kind === "carton"), "Carton in hand");
  assert.equal(await aim("cooler-0"), "cooler-0");
  await page.keyboard.press("KeyE");
  assert.ok((await state()).flags.stocked, "Coffee restocked into the back-wall cooler");
  await page.evaluate(() => {
    const s = __nightShift.W.spots.attendant;
    __nightShift.teleport(s[0], s[1], -Math.PI / 2, 0.1);
  });
  await tick(4);
  let s = await state();
  assert.equal(s.customer.id, "emi");
  assert.ok(s.customer.car[0] < -20, "Customer starts on the road");
  await tick(7);
  assert.ok((await state()).customer.car[0] > -40, "Car physically advances");
  await tick(60);
  s = await state();
  assert.equal(s.customer.state, "waiting", "Emi shops the aisles and reaches the counter");
  await page.screenshot({ path: "test-results/checkout.png" });

  // Shoppers must never end up standing inside a fixture.
  assert.ok(
    await page.evaluate(() => {
      const c = __nightShift.G.customer.npc.root.position;
      return !__nightShift.W.isBlocked(c.x, c.z, 0.2);
    }),
    "Customer stands on open floor, not inside the shelving",
  );

  assert.equal(await aim("scanner"), "scanner");
  await page.keyboard.press("KeyE");
  await action("scanner");
  assert.equal((await state()).scan, 2);
  await action("fuel-terminal");
  await page.locator("#fuel-liters").fill("12");
  await choice("Authorize fuel");
  assert.ok(
    await page.evaluate(() => __nightShift.G.customer.fuelAuthorized),
    "Fuel authorization precedes payment",
  );
  await action("register");
  assert.equal((await state()).customer.state, "leaving");
  await tick(70);
  assert.equal((await state()).customer.id, "daichi");
  await tick(60);
  assert.equal((await state()).customer.state, "waiting");
  for (let i = 0; i < 3; i++) await action("scanner");
  await action("register");
  assert.equal(
    (await state()).customer.state,
    "waiting",
    "Cold noodles cannot be sold as the requested hot meal",
  );
  // The microwave is on the back counter, so the attendant can actually reach it.
  assert.equal(await aim("microwave"), "microwave");
  await page.keyboard.press("KeyE");
  await tick(9);
  assert.ok((await state()).flags.noodlesHeated, "Noodles heated at the back counter");
  await action("register");
  await tick(95);
  assert.equal((await state()).customer.id, "hasegawa");
  assert.equal((await state()).customer.state, "waiting");
  for (let i = 0; i < 3; i++) await action("scanner");
  await action("register");
  await tick(95);
  assert.equal((await state()).customer.id, "ryo");
  const ryoCar = await page.evaluate(
    () => __nightShift.W.interactions.find((o) => o.kind === "car" && o.data.id === "ryo").id,
  );
  await action(ryoCar);
  await close();
  assert.ok((await state()).flags.ryoChecked);
  await action("scanner");
  await action("scanner");
  await action("register");
  await choice("Let him take the supplies");
  assert.ok((await state()).flags.flare);
  await tick(120);
  assert.equal((await state()).customer.id, "shibata");
  assert.equal((await state()).customer.state, "waiting");
  await action("scanner");
  await action("scanner");
  await action("register");
  await choice("Keep the receipt");
  assert.ok((await state()).flags.strangeReceipt);
  await action("cctv");
  await page.screenshot({ path: "test-results/cctv.png" });
  await page.evaluate(() => __nightShift.closeCamera());
  await tick(120);
  assert.equal((await state()).customer.id, "mimic");
  assert.equal((await state()).customer.state, "waiting");
  await action("phone");
  await choice("Put down the telephone");
  assert.equal((await state()).phase, "intruder");
  await action("alarm");
  assert.equal((await state()).phase, "investigate");
  await action("key");
  await action("fuse");
  await action("firstaid");
  await action("latch");
  await action("report");
  await close();
  await action("drawer");
  await choice("Keep the original");
  await tick(70);
  assert.equal((await state()).phase, "rescue");
  assert.ok((await state()).flags.emiAtDoor, "Emi reaches the locked entrance");
  await action("intercom");
  await choice("Ask what she bought earlier");
  await choice("Buzz Emi in");
  await tick(28);
  assert.ok((await state()).flags.emiSaved);
  assert.equal((await state()).phase, "siege");
  await tick(16);
  const breach = await page.evaluate(() => __nightShift.W.breachWindow);
  assert.equal(
    await page.evaluate((b) => __nightShift.W.windows[b].state, breach),
    2,
    "Storefront pane is broken through",
  );
  assert.equal(
    await page.evaluate(
      (b) => __nightShift.W.isBlocked(__nightShift.W.windows[b].x, __nightShift.W.windows[b].z, 0.22),
      breach,
    ),
    false,
    "Broken pane creates a traversable opening",
  );

  // The Passenger must be able to reach the attendant anywhere in the shop,
  // including behind the counter. A safe spot would defuse the whole siege.
  const hunted = await page.evaluate(() => {
    const d = __nightShift,
      W = d.W,
      from = d.G.threat.root.position;
    const out = {};
    for (const [k, v] of Object.entries(W.spots))
      out[k] = d.findPath(from, { x: v[0], z: v[1] }).length;
    return out;
  });
  const stranded = Object.entries(hunted).filter(([, n]) => n === 0);
  assert.deepEqual(stranded, [], "Passenger can path to every standing position");

  await page.evaluate(() => {
    const s = __nightShift.W.spots.attendant;
    __nightShift.teleport(s[0], s[1], -Math.PI / 2, 0);
    __nightShift.G.threat.stunned = 20;
  });
  await page.screenshot({ path: "test-results/siege.png" });
  assert.equal(await aim("breaker"), "breaker");
  await page.keyboard.press("KeyE");
  assert.ok((await state()).flags.powerRestored);
  await action("register");
  await choice("Reprint original & cancel sale");
  assert.equal((await state()).phase, "finale");
  await action("breaker");
  assert.equal((await state()).ending, "complete");
  await page.screenshot({ path: "test-results/ending.png" });

  // Both alternate endings, through their gameplay controls.
  await page.evaluate(() => {
    const d = __nightShift;
    d.G.mode = "playing";
    d.G.phase = "siege";
    d.G.flags.powerRestored = true;
    document.getElementById("ending").classList.add("hidden");
    d.G.customer = null;
  });
  await action("register");
  await choice("Complete sale");
  assert.equal((await state()).ending, "replacement");
  await page.evaluate(() => {
    const d = __nightShift;
    d.G.mode = "playing";
    d.G.phase = "siege";
    document.getElementById("ending").classList.add("hidden");
  });
  const emiId = await page.evaluate(
    () =>
      __nightShift.W.interactions.find(
        (o) => o.kind === "npc" && o.data.npc === __nightShift.G.emi,
      ).id,
  );
  await action(emiId);
  await choice("Escape with Emi");
  assert.equal((await state()).ending, "escape");

  // Retry restores a dangerous but solvable checkpoint without old callbacks.
  await page.evaluate(() => {
    const d = __nightShift;
    d.G.checkpoint = "siege";
    document.getElementById("ending").classList.add("hidden");
    d.restoreCheckpoint();
  });
  assert.equal((await state()).phase, "siege");
  assert.equal((await state()).health, 100);
  await tick(16);
  assert.equal(await page.evaluate((b) => __nightShift.W.windows[b].state, breach), 2);
  await action("breaker");
  assert.equal((await state()).flags.fuse, false);

  // Real render-loop damage, first aid, death, and inventory-safe retry.
  await page.evaluate(() => {
    const d = __nightShift,
      s = d.W.spots.counter;
    d.G.grace = 0;
    d.G.lastDamage = -10;
    d.teleport(s[0], s[1], 0);
    d.G.threat.root.position.set(s[0], 0.23, s[1] + 0.55);
    d.G.threat.stunned = 0;
  });
  await page.waitForTimeout(250);
  assert.ok((await state()).health < 100, "Nearby hostile causes damage");
  await page.keyboard.press("KeyH");
  assert.equal((await state()).health, 100, "First aid heals injury");
  await page.evaluate(() => {
    const d = __nightShift;
    d.G.health = 10;
    d.G.lastDamage = -10;
    d.G.threat.root.position.set(d.G.player.x, 0.23, d.G.player.z + 0.4);
  });
  await page.waitForTimeout(250);
  assert.equal((await state()).mode, "dead");
  await choice("Retry checkpoint");
  assert.equal((await state()).health, 100);
  assert.ok(
    (await state()).flags.fuse,
    "Retry restores the consumed fuse so the power puzzle remains solvable",
  );

  // Usual launch has no debug interface, still with network disabled.
  const ordinary = await context.newPage();
  await ordinary.goto(url);
  await ordinary.waitForSelector("#menu:not(.hidden)", { timeout: 60000 });
  assert.equal(await ordinary.evaluate(() => typeof window.__nightShift), "undefined");
  assert.deepEqual(errors, [], "No browser runtime errors");
  assert.deepEqual(network, [], "No network requests");
  console.log(
    "PASS: offline file launch, layout self-audit, every interaction reachable on foot, door collision, shoppers routed around fixtures, six transactions, heated food, evidence, rescue, breach navigation, no safe spot from the Passenger, three endings, checkpoint, no runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
