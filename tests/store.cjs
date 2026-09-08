/* Physical layout, concurrent checkout and fridge regression tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launch } = require('./helpers/browser.cjs');
(async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
    const page = await context.newPage(), errors = [], network = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    page.on('pageerror', e => errors.push(e.message));
    context.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
    await page.goto(pathToFileURL(path.resolve('index.html')).href + '?debug=1');
    await page.waitForSelector('#menu:not(.hidden)', { timeout: 60000 });
    await page.evaluate(() => { __nightShift.G.ambientEnabled = false; });
    await page.click('#start');
    await page.evaluate(() => {
      const d = __nightShift;
      d.closeModal();
      d.engine.stopRenderLoop(); // Advance deterministic world time below.
    });
    const evaluate = fn => page.evaluate(fn);
    const tick = seconds => page.evaluate(s => __nightShift.tick(s), seconds);
    const action = id => page.evaluate(id => __nightShift.interact(id), id);
    assert.deepEqual(await evaluate(() => __nightShift.W.auditSpots()), []);
    assert.equal(await evaluate(() => {
      const W = __nightShift.W;
      // No open east-wall strip and no corridor between the sales floor and rooms.
      for (let z = -10.4; z < 5; z += 0.15) if (!W.isBlocked(9.1, z, 0.24)) return false;
      return !W.scene.meshes.some(m => m.name === 'corridor wall') &&
        W.officeDoor.x === 0 && W.officeDoor.z < W.L.backRooms.z1 &&
        W.stockDoor.z === W.L.backRooms.z1;
    }), true, 'East wall is continuous; hallway removed');
    for (const id of ['office-door', 'stock-door', 'rear-door', 'staff-door']) {
      await page.evaluate(id => {
        const d = __nightShift.W.doors.find(d => d.id === id);
        d.target = 0; d.autoClose = 0;
      }, id);
      await tick(2);
      assert.equal(await page.evaluate(id => {
        const W = __nightShift.W, d = W.doors.find(d => d.id === id);
        return W.isBlocked(d.x, d.z, 0.24);
      }, id), true, id + ' blocks while closed');
      await action(id);
      await tick(2);
      assert.equal(await page.evaluate(id => {
        const W = __nightShift.W, d = W.doors.find(d => d.id === id);
        return W.isBlocked(d.x, d.z, 0.24);
      }, id), false, id + ' has a real wall opening');
    }
    assert.equal(await evaluate(() => {
      const W = __nightShift.W, s = W.spots.counter, a = W.spots.attendant;
      const start = { x: s[0], z: s[1] }, goal = { x: a[0], z: a[1] };
      return W.findPath(start, goal, 0.24, false).length === 0 && W.findPath(start, goal).length > 0;
    }), true, 'Customers cannot enter booth even with gate open; Passenger can path through gate');

    // The staff gate must swing outward from the booth. Measure the leaf, not openSign,
    // so changing the rotation convention cannot silently reverse the door
    // while the sign still reads the same.
    assert.equal(await evaluate(() => {
      const W = __nightShift.W, B = window.BABYLON;
      const d = W.staffDoor, pivot = d.pivot;
      const tip = () => {
        pivot.computeWorldMatrix(true);
        return B.Vector3.TransformCoordinates(new B.Vector3(d.width, 0, 0), pivot.getWorldMatrix());
      };
      // The door loop above leaves the gate open, so drive both poses here
      // rather than sampling whatever the animation happens to be showing.
      const was = pivot.rotation.y;
      pivot.rotation.y = d.baseRot || 0;
      const closed = tip();
      pivot.rotation.y = (d.baseRot || 0) + (d.openSign || -1) * Math.PI * 0.52;
      const open = tip();
      pivot.rotation.y = was; // world.js rewrites this from d.open on the next tick
      // The booth is at greater z; the free edge must travel out toward -z.
      return open.z < closed.z - 1;
    }), true, 'Staff gate swings outward from the booth');

    // No door may sweep through furniture. Sampling points along each leaf
    // through its arc catches a doorway that was sited without checking what
    // stands opposite it — the leaf lying flat on its own wall at full open is
    // the one contact that is meant to happen.
    assert.deepEqual(await evaluate(() => {
      const W = __nightShift.W, fouled = [];
      for (const d of W.doors) {
        const wall = { 'office-door': 'back room divider', 'stock-door': 'sales back wall',
          'rear-door': 'rear wall', 'staff-door': null }[d.id];
        for (let k = 0; k <= 24; k++) {
          const rot = (d.baseRot || 0) + (k / 24) * Math.PI * 0.52 * (d.openSign || -1);
          for (let t = 0.12; t <= d.width; t += 0.12) {
            const px = d.pivot.position.x + Math.cos(rot) * t,
              pz = d.pivot.position.z - Math.sin(rot) * t;
            for (const c of W.colliders) {
              if (!c.enabled || c.car || c.transparent || c.door) continue;
              const name = c.mesh ? c.mesh.name : '(unnamed)';
              if (name === wall) continue; // the leaf rests against this one
              if (px > c.x - c.hx && px < c.x + c.hx && pz > c.z - c.hz && pz < c.z + c.hz)
                if (!fouled.some(f => f === d.id + ' -> ' + name)) fouled.push(d.id + ' -> ' + name);
            }
          }
        }
      }
      return fouled;
    }), [], 'No door leaf sweeps through furniture');

    // Nothing on the till may hover. This is the check that catches equipment
    // being moved "deeper into the booth" off the edge of its work surface.
    assert.deepEqual(await evaluate(() => {
      const W = __nightShift.W, B = window.BABYLON, floating = [];
      const resting = ['cash register', 'register display head', 'barcode scanner',
        'fuel validation computer', 'counter telephone', 'alarm plinth',
        'entrance intercom', 'receipt printer', 'counter bell', 'customer pass tray'];
      for (const name of resting) {
        const m = W.scene.meshes.find(m => m.name === name);
        if (!m) { floating.push(name + ' (missing)'); continue; }
        m.computeWorldMatrix(true);
        const b = m.getBoundingInfo().boundingBox;
        const cx = (b.minimumWorld.x + b.maximumWorld.x) / 2,
          cz = (b.minimumWorld.z + b.maximumWorld.z) / 2;
        const foot = new B.Vector3(cx, b.minimumWorld.y - 0.004, cz);
        const hit = W.scene.pickWithRay(new B.Ray(foot, new B.Vector3(0, -1, 0), 4),
          o => o.isVisible && o.name !== name);
        // The counter body sits 0.09 under its own top, so anything resting on
        // the finished surface reports at most that much clear air beneath it.
        if (hit && hit.hit && b.minimumWorld.y - hit.pickedPoint.y <= 0.1) continue;
        // A fixture seated on another one (the display head on the register)
        // starts its ray inside that mesh, where picking finds nothing. Being
        // enclosed by a neighbour is support too; open air is not.
        const seated = W.scene.meshes.some(o => {
          if (!o.isVisible || o.name === name) return false;
          o.computeWorldMatrix(true);
          const n = o.getBoundingInfo().boundingBox;
          return foot.x > n.minimumWorld.x && foot.x < n.maximumWorld.x &&
            foot.y > n.minimumWorld.y && foot.y < n.maximumWorld.y &&
            foot.z > n.minimumWorld.z && foot.z < n.maximumWorld.z;
        });
        if (!seated) floating.push(name);
      }
      return floating;
    }), [], 'Every till fixture rests on the counter');
    assert.deepEqual(await evaluate(() => {
      const scene = __nightShift.scene, overlaps = [];
      const fixtures = ['cash register', 'barcode scanner', 'fuel validation computer',
        'counter telephone', 'alarm plinth', 'entrance intercom', 'receipt printer'];
      for (let i = 0; i < fixtures.length; i++) {
        const a = scene.getMeshByName(fixtures[i]);
        a.computeWorldMatrix(true);
        for (let j = i + 1; j < fixtures.length; j++) {
          const b = scene.getMeshByName(fixtures[j]);
          b.computeWorldMatrix(true);
          if (a.intersectsMesh(b, true)) overlaps.push([a.name, b.name]);
        }
      }
      return overlaps;
    }), [], 'Counter appliances do not overlap each other');

    // Raised deck: the height the camera is lifted by is the height the player
    // can see under their feet, and the tread at the gate is above the floor.
    assert.equal(await evaluate(() => {
      const W = __nightShift.W;
      const box = n => {
        const m = W.scene.meshes.find(m => m.name === n);
        m.computeWorldMatrix(true);
        return m.getBoundingInfo().boundingBox;
      };
      const deck = box('raised attendant deck'), step = box('raised deck step'),
        floor = box('tiled sales floor');
      // Measure the tread against the shut panel: that is the pose that would
      // clip, and the swung panel only ever travels further away from it.
      const d = W.staffDoor, was = d.pivot.rotation.y;
      d.pivot.rotation.y = d.baseRot || 0;
      const panel = box('staff-door panel');
      d.pivot.rotation.y = was;
      const rise = deck.maximumWorld.y - floor.maximumWorld.y;
      return Math.abs(rise - W.staffFloorHeight) < 0.005 &&
        deck.minimumWorld.y <= floor.maximumWorld.y &&      // no gap under the slab
        step.maximumWorld.y > floor.maximumWorld.y &&        // tread is not buried
        step.maximumWorld.y < deck.maximumWorld.y &&         // and is a half step
        step.minimumWorld.z > panel.maximumWorld.z;          // clear of the closed panel
    }), true, 'Deck rise matches the camera lift and the tread is clear of the gate');

    // Measure the real camera over each visible walking surface. This catches
    // a lift that looks right in geometry but starts late or omits the floor.
    assert.equal(await evaluate(() => {
      const d = __nightShift, W = d.W;
      d.G.settings.bob = false;
      for (const [x, z, surface] of [[7.6, -0.3, 'tiled sales floor'],
        [7.6, 0.31, 'raised deck step'], [7.6, 0.42, 'raised attendant deck']]) {
        d.teleport(x, z);
        const m = W.scene.getMeshByName(surface);
        m.computeWorldMatrix(true);
        if (Math.abs(d.getCamera().position.y - m.getBoundingInfo().boundingBox.maximumWorld.y - 1.68) > 0.005)
          return false;
      }
      return true;
    }), true, 'Player eye height follows floor, half step and platform');

    // Use the actual player camera and include opaque decorative equipment,
    // even when it is not an interaction target.
    assert.equal(await evaluate(() => {
      const W = __nightShift.W, B = window.BABYLON;
      const a = W.spots.attendant, c = W.spots.counter, floor = 0.23;
      __nightShift.teleport(a[0], a[1], -Math.PI / 2);
      const eye = __nightShift.getCamera().position.clone();
      const head = new B.Vector3(c[0], floor + 1.62, c[1]);
      const dir = head.subtract(eye), len = dir.length();
      const hit = W.scene.pickWithRay(new B.Ray(eye, dir.normalize(), len),
        m => m.isVisible && m.isEnabled() && !/glass|glazing/i.test(m.name));
      return !(hit && hit.hit);
    }), true, 'Customer-facing sightline over the till is unobstructed');
    fs.mkdirSync('test-results', { recursive: true });
    for (const [name, x, z, yaw, pitch] of [
      ['staff-gate-outward', 6.6, -3.6, 0.35, 0.15],
      ['staff-platform', 7.6, -0.25, 0, 0.65],
      ['stockroom-entry', 3.6, -4.1, Math.PI, 0.02],
      ['nested-office', 2.5, -8.45, -Math.PI / 2, 0.02],
    ]) {
      await page.evaluate(({ x, z, yaw, pitch }) => {
        __nightShift.teleport(x, z, yaw, pitch); __nightShift.scene.render();
      }, { x, z, yaw, pitch });
      await page.screenshot({ path: `test-results/${name}.png` });
    }
    await evaluate(() => {
      const W = __nightShift.W;
      W.restockCoffee();
      __nightShift.teleport(-0.1, -4.0, Math.PI, 0.07);
      W.scene.render();
    });
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/fridges.png' });
    await action('cooler-2');
    await evaluate(() => __nightShift.closeModal());
    await tick(1);
    assert.ok(await evaluate(() => __nightShift.W.fridges[2].open > 0.9), 'Player opens fridge');
    await evaluate(() => { __nightShift.teleport(-2.5, -4.0, Math.PI, 0.05); __nightShift.scene.render(); });
    await page.screenshot({ path: 'test-results/fridge-open.png' });
    await tick(4);
    assert.ok(await evaluate(() => __nightShift.W.fridges[2].open < 0.02), 'Fridge self-closes');
    await evaluate(() => {
      const d = __nightShift;
      d.teleport(7.6, 3.2, -Math.PI / 2);
      d.summon('emi');
      d.G.trafficRandom = () => 0.4; // Two drink shoppers, stable orders.
      d.spawnWalkIn(); d.spawnWalkIn();
    });
    assert.equal(await evaluate(() => __nightShift.G.shoppers.length), 3, 'Three customers coexist');
    assert.equal(await evaluate(() => new Set(__nightShift.G.shoppers.filter(c => c.bay).map(c => c.bay.id)).size), 2, 'Walk-ins reserve distinct marked bays');
    await tick(100);
    assert.equal(await evaluate(() => __nightShift.G.queue.length), 2, 'Two customers queue while another uses till');
    await evaluate(() => {
      __nightShift.teleport(7.6, 3.2, -Math.PI / 2, 0.12); __nightShift.scene.render();
    });
    await page.screenshot({ path: 'test-results/attendant-customer-view.png' });
    assert.ok(await evaluate(() => __nightShift.W.fridges.reduce((sum, f) => sum + f.cycles, 0) >= 3), 'Shoppers open refrigerators for drinks');
    assert.equal(await evaluate(() => __nightShift.G.shoppers.filter(c => c.bay).every(c => {
      const p = c.car.root.position;
      return Math.abs(p.x - c.bay.x) < 0.01 && Math.abs(p.z - c.bay.z) < 0.01 && Math.abs(p.x - __nightShift.W.frontDoor.x) > 2.5;
    })), true, 'Cars finish inside reserved bays, away from entrance');
    await evaluate(() => { __nightShift.teleport(2.7, 3.5, Math.PI / 2, 0); __nightShift.scene.render(); });
    await page.screenshot({ path: 'test-results/customer-queue.png' });
    await evaluate(() => __nightShift.teleport(7.6, 3.2, -Math.PI / 2));
    const served = [];
    for (let i = 0; i < 3; i++) {
      const order = await evaluate(() => ({ id: __nightShift.G.customer.id, count: __nightShift.G.customer.order.length }));
      served.push(order.id);
      assert.equal(await evaluate(() => __nightShift.G.scan), 0, 'New order starts unscanned');
      for (let j = 0; j < order.count; j++) await action('scanner');
      await evaluate(() => { __nightShift.G.customer.fuelAuthorized = true; });
      await action('register');
      await tick(5);
    }
    assert.equal(new Set(served).size, 3, 'Every queued customer receives a separate checkout');
    await tick(80);
    assert.equal(await evaluate(() => __nightShift.G.shoppers.filter(c => c.ambient).length), 0, 'Walk-ins leave after payment');
    assert.equal(await evaluate(() => __nightShift.G.phase), 'daichi', 'Story continues in original order');
    assert.equal(await evaluate(() => __nightShift.W.parkingBays.filter(b => b.occupied).length), 1, 'Departed customers release bays');
    await evaluate(() => {
      const d = __nightShift;
      d.G.ambientEnabled = true; d.G.nextAmbient = d.G.elapsed; d.G.trafficRandom = () => 0.7;
    });
    await tick(0.1);
    assert.equal(await evaluate(() => __nightShift.G.shoppers.filter(c => c.ambient).length), 1, 'Random arrival scheduler adds shoppers');
    await evaluate(() => {
      __nightShift.G.ambientEnabled = false;
      __nightShift.summon('shibata');
    });
    assert.equal(await evaluate(() => __nightShift.G.pendingStory), 'shibata', 'Supernatural scene waits for ordinary shoppers');
    assert.equal(await evaluate(() => __nightShift.spawnWalkIn()), null, 'No new walk-ins during story transition');
    await evaluate(() => { __nightShift.teleport(18, 21, -2.25, 0.1); __nightShift.scene.render(); });
    await page.screenshot({ path: 'test-results/station-updated.png' });
    await evaluate(() => { __nightShift.teleport(0, 25, 0, 0); __nightShift.scene.render(); });
    await page.screenshot({ path: 'test-results/surroundings.png' });
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log('PASS: solid shell, four usable doors, restricted cashier booth, stocked animated fridges, concurrent shoppers, queue/payment isolation, marked parking, random arrivals, story transition, offline textures.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
