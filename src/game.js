/* Night Shift: Pump 4. Plain scripts intentionally support opening index.html directly. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    B = window.BABYLON;
  if (!B) {
    $("load-status").textContent =
      "Babylon.js could not load. Keep the vendor folder next to index.html.";
    return;
  }
  const V = B.Vector3,
    canvas = $("game");
  let engine, W, scene, camera, securityCamera;
  const audio = new NightAudio(),
    keys = new Set();
  const G = {
    mode: "menu",
    phase: "handover",
    elapsed: 0,
    health: 100,
    flags: {},
    journal: [],
    held: null,
    carry: null,
    customer: null,
    storyCustomer: null,
    shoppers: [],
    queue: [],
    ambientEnabled: true,
    nextAmbient: 0,
    ambientSerial: 0,
    trafficRandom: Math.random,
    threat: null,
    events: [],
    serial: 0,
    scan: 0,
    torch: false,
    stamina: 100,
    winded: false,
    jumpY: 0,
    jumpV: 0,
    cctv: false,
    modal: false,
    started: false,
    foot: 0,
    phoneTimer: 0,
    lastDamage: -10,
    navTimer: 0,
    checkpoint: "start",
    interact: null,
    grace: 0,
    settings: {
      volume: 0.55,
      sensitivity: 1,
      grain: true,
      bob: true,
      quality: "balanced",
      fps: false,
    },
    player: { x: -5.4, z: 9.6, yaw: Math.PI, pitch: 0.02 },
  };
  const EYE = 1.68;
  // Walking field of view, and the tighter one a conversation pulls in to.
  const BASE_FOV = 1.02, TALK_FOV = 0.74;
  const phases = {
    apartment: ["05:38 PM", "BEFORE THE SHIFT"],
    orientation: ["06:12 PM", "THE DAYLIGHT HANDOVER"],
    handover: ["11:42 PM", "THE HANDOVER"],
    prep: ["11:48 PM", "FIRST DUTIES"],
    emi: ["12:03 AM", "PEOPLE PASSING THROUGH"],
    daichi: ["12:17 AM", "A WARM MEAL"],
    hasegawa: ["12:28 AM", "THE OLD ROAD"],
    ryo: ["12:38 AM", "THE EMPTY CAN"],
    shibata: ["01:06 AM", "PUMP FOUR"],
    mimic: ["01:29 AM", "THE CUSTOMER WHO RETURNS"],
    intruder: ["01:32 AM", "TELL HIM WE ARE CLOSED"],
    investigate: ["01:46 AM", "I DID NOT CLOCK OUT"],
    rescue: ["02:14 AM", "SOMEONE OUTSIDE"],
    siege: ["02:31 AM", "THE UNFINISHED SALE"],
    finale: ["02:48 AM", "YOUR SHIFT IS OVER"],
  };
  const orders = {
    emi: ["coffee", "rice"],
    daichi: ["noodles", "energy", "gum"],
    hasegawa: ["batteries", "bread", "catfood"],
    ryo: ["water", "tissues"],
    shibata: ["water", "mints"],
    mimic: ["noodles", "energy", "gum"],
  };
  const people = {
    emi: {
      name: "Emi Tanabe",
      type: "taxi",
      paint: "#818f79",
      coat: "#8c7760",
      female: true,
      plate: "KU 23-81",
      line: "Twelve litres on Two, coffee, and a rice ball. First night? Keep the radio on. Otherwise you start hearing the refrigerators think.",
    },
    daichi: {
      name: "Daichi Sato",
      type: "van",
      paint: "#8b9385",
      coat: "#435c67",
      plate: "KU 31-09",
      line: "Noodles, a blue can, and gum. Could you heat the noodles? Long road ahead.",
    },
    hasegawa: {
      name: "Mrs. Hasegawa",
      type: "sedan",
      paint: "#796764",
      coat: "#74637b",
      female: true,
      plate: "KU 04-62",
      line: "He still makes someone stay overnight? …Never mind. Just these, please.",
    },
    ryo: {
      name: "Ryo",
      type: "pickup",
      paint: "#8a674b",
      coat: "#62644d",
      plate: "KU 68-12",
      line: "Someone followed me from the bridge. I cut my arm on the truck window. Please, I just need a minute.",
    },
    shibata: {
      name: "Mr. Shibata",
      type: "sedan",
      paint: "#a9ac94",
      coat: "#565b55",
      plate: "KU 17-04",
      line: "Four. Fill it. …It worked last time.",
    },
    mimic: {
      name: "Daichi Sato",
      type: "van",
      paint: "#8b9385",
      coat: "#435c67",
      plate: "KU 31-09",
      line: "Noodles. Blue can. Gum.",
    },
  };
  function show(id, on = true) {
    $(id).classList.toggle("hidden", !on);
  }
  function later(seconds, fn) {
    G.events.push({ at: G.elapsed + seconds, fn, serial: G.serial });
  }
  function toast(t) {
    $("toast").textContent = t;
    show("toast");
    G.toastUntil = G.elapsed + 4;
  }
  function say(who, text, duration = 7) {
    $("subtitle").querySelector("b").textContent = who;
    $("subtitle").querySelector("p").textContent = text;
    show("subtitle");
    G.subtitleUntil = G.elapsed + duration;
    document.body.classList.add('speaking');
  }
  function journal(title, text) {
    if (G.journal.some((e) => e.title === title)) return;
    G.journal.push({ title, text });
    toast("Journal updated · " + title);
  }
  function objective(text, hint = "") {
    $("objective-text").textContent = text;
    $("objective-hint").textContent = hint;
    G.objectiveUntil=G.elapsed+9;
  }
  function phase(id) {
    G.phase = id;
    if (id === "daichi" && G.ambientEnabled) later(14, spawnKatagiri);
    const p = phases[id];
    if (p) {
      $("clock").textContent = p[0];
      $("chapter-label").textContent = p[1];
      $("task-count").textContent = String(
        Object.keys(phases).indexOf(id) + 1,
      ).padStart(2, "0");
    }
  }
  function release() {
    if (document.pointerLockElement === canvas) {
      G.expectedUnlock = true;
      document.exitPointerLock();
    }
  }
  function capture() {
    if (G.mode !== "playing" || G.modal || G.cctv || G.expectedUnlock) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }
  function openModal(tag, title, body, buttons = [["Continue", () => {}]]) {
    G.modalDismiss = buttons.length === 1 ? buttons[0][1] : () => {};
    G.modal = true;
    release();
    show("prompt", false);
    show("modal");
    $("modal-tag").textContent = tag;
    $("modal-title").textContent = title;
    $("modal-body").innerHTML = body;
    $("modal-buttons").replaceChildren();
    for (const [text, fn] of buttons) {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = () => {
        closeModal();
        fn();
      };
      $("modal-buttons").appendChild(b);
    }
    setTimeout(() => $("modal-buttons").querySelector("button")?.focus(), 0);
  }
  function closeModal() {
    G.modal = false;
    G.focus=null;
    document.body.classList.remove('conversing');
    $('modal').classList.remove('conversation');
    // No fov snap here. Advancing a line closes and reopens the modal in the
    // same click, so a reset would restart the push-in on every line; the
    // render loop eases back out once nothing is focused any more.
    show("modal", false);
    if (G.mode === "playing") setTimeout(capture, 0);
  }
  function focusCharacter(n) { G.focus=n;document.body.classList.add('conversing'); }
  function dialogue(n, lines, done=()=>{}) {
    let index=0;
    const next=()=>{
      if(index>=lines.length){done();return;}
      const [who,text]=lines[index++];
      openModal(who,'', '<p>'+text+'</p>',[[index===lines.length?'Continue':'Next',next]]);
      $('modal').classList.add('conversation');focusCharacter(n);
    };
    next();
  }
  function held() {
    $("held-text").textContent = G.held ? G.held + " · G SET DOWN" : "EMPTY HANDS";
    W.setHeldVisual(camera,G.carry);
  }
  function takeCarry(kind,id,name) {
    if(G.flags.pouring){toast('Let the coffee finish pouring first.');return false;}
    if(G.carry){toast("Set down "+G.carry.name.toLowerCase()+" first (G).");return false;}
    G.carry={kind,id,name};G.held=name.toUpperCase();G.flags.carton=kind==='carton';held();audio.play('switch');return true;
  }
  function dropCarry(){
    if(!G.carry){toast('Your hands are empty.');return;}
    const p=G.player,x=p.x+Math.sin(p.yaw)*.85,z=p.z+Math.cos(p.yaw)*.85;
    if(W.isBlocked(x,z,.3)){toast('Find a clear patch of floor to set this down.');return;}
    W.dropCarry(G.carry,x,z,p.yaw);G.carry=null;G.held=null;G.flags.carton=false;held();audio.play('switch');
  }

  function hurt(amount, source) {
    if (G.elapsed - G.lastDamage < 1.8 || G.grace > 0) return;
    G.lastDamage = G.elapsed;
    G.health = Math.max(0, G.health - amount);
    $("health-bar").style.width = G.health + "%";
    $("damage").style.opacity = ".8";
    audio.play("hit");
    later(0.7, () => ($("damage").style.opacity = "0"));
    if (G.health <= 0) die();
    else if (source) toast(source);
  }
  function die() {
    G.mode = "dead";
    release();
    show("danger-label", false);
    openModal(
      "SHIFT INTERRUPTED",
      "The night is not finished.",
      `<p>The Passenger found you.</p><p>Use doors, shelves, and the alarm to create distance. The security alarm briefly stuns it. Your investigation notes survive the checkpoint.</p>`,
      [
        ["Retry checkpoint", restoreCheckpoint],
        ["Return to title", () => location.reload()],
      ],
    );
  }
  function restoreCheckpoint() {
    G.serial++;
    G.events = [];
    G.health = 100;
    G.lastDamage = -10;
    G.grace = 6;
    G.mode = "playing";
    $("health-bar").style.width = "100%";
    $("health-bar").classList.remove("low");
    G.stamina = 100;
    G.winded = false;
    G.jumpY = 0;
    G.jumpV = 0;
    $("damage").style.opacity = "0";
    const safe = W.spots.office;
    G.player.x = safe[0];
    G.player.z = safe[1];
    G.player.yaw = 0;
    G.player.pitch = 0;
    G.carry = null;
    G.held = null;
    held();
    W.doors.forEach((d) => {
      d.target = 1;
    });
    if (G.threat) {
      G.threat.root.setEnabled(false);
      G.threat.active = false;
      G.threat = null;
    }
    if (G.checkpoint === "siege") {
      if (G.siegeInventory) {
        Object.assign(G.flags, G.siegeInventory);
        const item = W.interactions.find((o) => o.id === "fuse");
        item.enabled = !G.flags.fuse;
        item.mesh.setEnabled(!G.flags.fuse);
      }
      phase("siege");
      W.setPower(false);
      W.frontDoor.locked = true;
      G.flags.powerRestored = false;
      G.flags.saleCancelled = false;
      const pane = W.windows[W.breachWindow];
      pane.state = 0;
      pane.mesh.setEnabled(true);
      pane.collider.enabled = true;
      if (pane.kickCollider) pane.kickCollider.enabled = true;
      if (pane.kick) pane.kick.setEnabled(true);
      pane.debris.forEach((d) => d.dispose());
      pane.debris = [];
      pane.cracks.forEach((m) => m.dispose());
      pane.cracks = [];
      objective(
        "Restore the backup circuit.",
        "Take the spare fuse from the stockroom workbench; use the exterior disconnect.",
      );
      later(10, startSiegeThreat);
    } else if (G.checkpoint === "finale") {
      phase("finale");
      G.flags.saleCancelled = true;
      objective(
        "Isolate Pump Four at the rear disconnect.",
        "Leave through the stockroom service exit. The Passenger is searching.",
      );
      spawnThreat(W.spots.counter[0] - 2, 3);
    } else {
      phase("intruder");
      objective(
        "Sound the security alarm.",
        "Red button behind the glass beside the fuel computer.",
      );
      spawnThreat(-2, 3.2);
    }
    capture();
  }
  function settings() {
    const back = G.mode;
    openModal(
      "YOUR EXPERIENCE",
      "Settings & controls",
      `<div class="setting"><label for="volume">Master volume</label><input id="volume" type="range" min="0" max="1" step=".05" value="${G.settings.volume}"></div><div class="setting"><label for="sensitivity">Mouse sensitivity</label><input id="sensitivity" type="range" min=".3" max="2" step=".1" value="${G.settings.sensitivity}"></div><div class="setting"><label for="grain-setting">VHS camcorder look</label><input id="grain-setting" type="checkbox" ${G.settings.grain ? "checked" : ""}></div><div class="setting"><label for="bob-setting">Head movement</label><input id="bob-setting" type="checkbox" ${G.settings.bob ? "checked" : ""}></div><div class="setting"><label for="fps-setting">FPS counter</label><input id="fps-setting" type="checkbox" ${G.settings.fps ? "checked" : ""}></div><div class="setting"><label for="quality-setting">Graphics</label><select id="quality-setting"><option value="balanced">Balanced</option><option value="crisp">Crisp</option><option value="low">Low</option></select></div><p style="margin-top:18px"><b>WASD</b> walk · <b>Shift</b> sprint (drains stamina) · <b>Space</b> jump · <b>E</b> interact<br><b>F</b> flashlight · <b>G</b> set down item<br><b>Tab</b> journal · <b>Esc</b> pause<br><b>H</b> use first aid · <b>R</b> use road flare</p><p>Desktop keyboard and mouse required. Contains pursuit, sudden sounds, and breakable glass. Grain and head movement are optional.</p>`,
      [
        [
          back === "menu" ? "Back" : "Return to shift",
          () => {
            if (back === "playing") {
              audio.pause(false);
              capture();
            }
          },
        ],
      ],
    );
    $("fps-setting").onchange=e=>{
      G.settings.fps=e.target.checked;show('fps-counter',G.settings.fps);
      try{localStorage.setItem('nightShift.fps',String(G.settings.fps));}catch{}
    };
    $("quality-setting").value = G.settings.quality;
    $("volume").oninput = (e) => {
      G.settings.volume = +e.target.value;
      audio.setVolume(G.settings.volume);
    };
    $("sensitivity").oninput = (e) =>
      (G.settings.sensitivity = +e.target.value);
    $("grain-setting").onchange = (e) => {
      G.settings.grain = e.target.checked;
      $("grain").style.opacity = e.target.checked ? ".05" : "0";
      show("camcorder", e.target.checked);
      if (G.look) G.look.setEnabled(e.target.checked);
    };
    $("bob-setting").onchange = (e) => (G.settings.bob = e.target.checked);
    $("quality-setting").onchange = (e) => {
      G.settings.quality = e.target.value;
      engine.setHardwareScalingLevel(
        e.target.value === "crisp" ? 1 : e.target.value === "low" ? 1.9 : 1.35,
      );
    };
  }
  function pause() {
    if (G.mode !== "playing" || G.cctv || G.modal) return;
    release();
    audio.pause(true);
    openModal(
      "KUROSE SERVICE",
      "Off the clock.",
      `<p>The shift is paused.</p><p>${$("objective-text").textContent}</p>`,
      [
        [
          "Resume",
          () => {
            audio.pause(false);
            capture();
          },
        ],
        [
          "Settings",
          () => {
            audio.pause(false);
            settings();
          },
        ],
        [
          "Restart shift",
          () =>
            openModal(
              "START OVER",
              "Begin a new shift?",
              "<p>This restarts the story from the handover.</p>",
              [
                [
                  "Keep playing",
                  () => {
                    audio.pause(false);
                  },
                ],
                ["Restart", () => location.reload()],
              ],
            ),
        ],
      ],
    );
  }
  function journalView() {
    openModal(
      "NAO MORI / SHIFT NOTES",
      "Night log",
      `<p><b>Current task:</b> ${$("objective-text").textContent}</p>${G.journal.map((e) => `<div class="journal-entry"><b>${e.title}</b><p>${e.text}</p></div>`).join("") || "<p>No evidence collected yet.</p>"}<p style="margin-top:16px">Supplies: ${G.flags.medkit ? "first-aid kit" : "no first aid"} · ${G.flags.flare ? "road flare" : "no flare"} · ${G.flags.key ? "desk key" : "no key"} · ${G.flags.fuse ? "spare fuse" : "no fuse"}</p>`,
    );
  }
  function updateOrder() {
    const c = G.customer;
    if (!c || c.state !== "waiting") {
      show("checkout", false);
      return;
    }
    show("checkout");
    $("order-name").textContent = customerPerson(c).name;
    $("order-lines").innerHTML = c.order
      .map((id, i) => {
        const p = W.products.find((p) => p.id === id);
        return `<div class="${i < G.scan ? "scanned" : ""}"><span>${i < G.scan ? "✓ " : ""}${p.name}</span><span>¥${p.price}</span></div>`;
      })
      .join("");
    if (c.fuel)
      $("order-lines").innerHTML +=
        `<div><span>Pump 0${c.pump} · ${c.fuel} litres</span><span>¥${c.fuel * 118}</span></div>`;
    $("order-total").textContent = "¥" + total(c);
    W.setDisplay(
      W.registerScreen,
      c.fuelAuthorized ? "PUMP 0" + c.pump + " AUTHORIZED" : "CHECKOUT",
      "¥ " + total(c),
      G.scan + " / " + c.order.length + " ITEMS SCANNED",
    );
    $("order-help").textContent =
      G.scan < c.order.length
        ? "Use the barcode scanner."
        : c.id === "daichi" && !G.flags.noodlesHeated
            ? "Heat the noodles in the microwave."
          : c.fuel && !c.fuelAuthorized
            ? "Validate Pump 0" + c.pump + " on the fuel computer."
            : "Use the cash register to take payment.";
  }
  const customerPerson = (c) => c.person || people[c.id];
  const ordinaryPhases = new Set(["emi", "daichi", "hasegawa", "ryo"]);

  // One till, several independently arriving shoppers. Narrative customers
  // retain their identity even when a walk-in is currently being served.
  function queueCustomer(c) {
    if (!G.shoppers.includes(c)) return;
    c.state = "queued";
    if (!G.queue.includes(c)) G.queue.push(c);
    advanceQueue();
  }
  function advanceQueue() {
    const busy = G.customer && ["approaching", "waiting", "strange", "hostile"].includes(G.customer.state);
    if (!busy && G.queue.length) {
      const c = G.queue.shift();
      G.customer = c;
      G.scan = 0;
      c.state = "approaching";
      c.npc.walkTo(W.spots.counter[0], W.spots.counter[1], () => customerAtCounter(c, c.npc));
    }
    G.queue.forEach((c, i) => {
      const x = 4.85 - i * 0.85, z = 3.65;
      c.npc.walkTo(x, z, () => { c.npc.root.rotation.y = Math.PI / 2; });
    });
  }
  // -----------------------------------------------------------------------
  // Chores. A petrol station at night is mostly maintenance with customers in
  // between, so the quiet gaps hand out small real jobs: mop what the rain
  // tracked in, refill a shelf from the stockroom, take the counter bag out
  // to the yard. Each one uses the same carry/walk machinery as the story and
  // the trash run walks the player through the rear door on purpose.
  // -----------------------------------------------------------------------
  const CHORE_SPILLS = [[-8.6, 3.0], [0, 0.9], [-2.2, -3.9]];
  // Gondola lines only: drinks live in the coolers and have no shelf row.
  const CHORE_SHELF_IDS = ["chips", "noodles", "crackers", "biscuits", "tissues", "cereal"];
  function startChore(type) {
    if (G.chore) return null;
    if (!G.choreBag || !G.choreBag.length)
      G.choreBag = ["mop", "trash", "restock"].sort(() => G.trafficRandom() - 0.5);
    type = type || G.choreBag.pop();
    if (type === "mop") {
      const [x, z] = CHORE_SPILLS[Math.floor(G.trafficRandom() * CHORE_SPILLS.length) % CHORE_SPILLS.length];
      G.chore = { type, spill: W.makeSpill(x, z) };
      toast("Rainwater has been tracked across the floor. The mop is in the stockroom.");
    } else if (type === "trash") {
      W.binBag.setEnabled(true);
      W.binBagInteraction.enabled = true;
      G.chore = { type };
      toast("The counter bin is overflowing. Take the bag to the yard bin out back.");
    } else {
      const id = CHORE_SHELF_IDS[Math.floor(G.trafficRandom() * CHORE_SHELF_IDS.length) % CHORE_SHELF_IDS.length];
      const gap = W.emptyShelfRow(id);
      if (!gap) { G.nextChore = G.elapsed + 30; return null; }
      W.choreBox.setEnabled(true);
      W.choreBoxInteraction.enabled = true;
      G.chore = { type: "restock", gap };
      toast("The " + (W.products.find((p) => p.id === id)?.name.toLowerCase() || id) +
        " shelf is running empty. A stock carton is on the workbench.");
    }
    audio.play("paper");
    return G.chore;
  }
  function choreDone(message) {
    G.choresDone = (G.choresDone || 0) + 1;
    G.chore = null;
    G.nextChore = G.elapsed + 40 + G.trafficRandom() * 45;
    toast(message);
    audio.play("switch");
  }
  function updateChores() {
    if (!G.ambientEnabled || !ordinaryPhases.has(G.phase) || G.pendingStory || G.threat || G.chore) return;
    if (!G.nextChore) { G.nextChore = G.elapsed + 26 + G.trafficRandom() * 30; return; }
    if (G.elapsed < G.nextChore) return;
    if (G.customer && G.customer.state === "waiting") return;
    startChore();
  }
  function updateTraffic() {
    if (!G.ambientEnabled || !ordinaryPhases.has(G.phase) || G.pendingStory === "shibata") return;
    if (G.elapsed < G.nextAmbient) return;
    G.nextAmbient = G.elapsed + 75 + G.trafficRandom() * 105;
    if (G.shoppers.filter(c => c.ambient).length < 2) spawnWalkIn();
  }
  // Mr. Katagiri visits the shop exactly once, in person, early in the night.
  // Every appearance after that is on the cameras only. He is deliberately an
  // unremarkable transaction: the player has no reason to remember him until
  // the tape starts insisting on him.
  function spawnKatagiri() {
    if (G.flags.katagiriCame || !ordinaryPhases.has(G.phase) || G.pendingStory) return null;
    const bay = W.reserveBay("katagiri");
    if (!bay) return null;
    G.flags.katagiriCame = true;
    const person = {
      name: "Mr. Katagiri",
      coat: "#4a4d4a",
      paint: "#3d4547",
      type: "sedan",
      plate: "KU 09-77",
      katagiri: true,
      line: "Tape. Batteries. \u2026The camera over your counter. Does it record, or does it only watch?",
    };
    const car = W.makeCar(person.type, person.paint, person.plate);
    car.root.position.set(-58, 0, W.L.road);
    car.targetSpeed = 6;
    const c = { id: "katagiri", ambient: true, person, bay, car, npc: null,
      state: "driving", order: ["tape", "batteries"], fuel: 0, pump: 0, carriedItems: [] };
    G.shoppers.push(c);
    arriveCustomer(c, person, [bay.x, bay.z]);
    return c;
  }
  function spawnWalkIn() {
    if (!ordinaryPhases.has(G.phase) || G.pendingStory === "shibata") return null;
    if (G.shoppers.filter(c => c.ambient).length >= 2) return null;
    const id = "walk-in-" + (++G.ambientSerial), bay = W.reserveBay(id);
    if (!bay) return null;
    const profiles = [
      { name: "Local commuter", coat: "#657c86", paint: "#496674", type: "sedan" },
      { name: "Delivery driver", coat: "#a28b62", paint: "#b5ae97", type: "van" },
      { name: "Night traveler", coat: "#81657b", paint: "#645865", type: "sedan", female: true },
      { name: "Road worker", coat: "#9b744b", paint: "#66725c", type: "pickup" },
    ];
    const random = G.trafficRandom, profile = profiles[Math.floor(random() * profiles.length) % profiles.length];
    const pool = ["tea", "soda", "water", "energy", "chips", "biscuits", "bread", "gum"];
    const order = Array.from({ length: 1 + Math.floor(random() * 3) }, () => pool[Math.floor(random() * pool.length) % pool.length]);
    const person = { ...profile, line: "Just these, please. A long night for both of us." };
    const car = W.makeCar(person.type, person.paint, "KU " + String(50 + G.ambientSerial) + "-28");
    car.root.position.set(-58, 0, W.L.road);
    car.targetSpeed = 7;
    const c = { id, ambient: true, person, bay, car, npc: null, state: "driving", order, fuel: 0, pump: 0, carriedItems: [] };
    G.shoppers.push(c);
    arriveCustomer(c, person, [bay.x, bay.z]);
    return c;
  }
  function arriveCustomer(c, person, park) {
    c.park = park;
    c.doorSide = c.pump === 4 ? 1 : -1;
    const route = c.pump
      ? [[-22, W.L.road], [-15, 27], [c.pump === 4 ? 11 : -11, 26], [park[0], 24], [park[0], park[1]]]
      : [[-22, W.L.road], [-15, 27], [-13, 23], [-11, 11.6], [park[0], 11.6], [park[0], park[1]]];
    c.car.route(route, () => {
      if (!G.shoppers.includes(c)) return;
      c.car.root.rotation.y = c.doorSide < 0 ? Math.PI : 0;
      c.car.doorTarget = 1;
      later(2, () => (c.car.doorTarget = 0));
      const npc = W.makeNPC(person.name, person.coat, "#2a2b25", person.female);
      c.npc = npc;
      npc.customer = c;
      npc.root.position.set(park[0] + c.doorSide * 1.3, 0.23, park[1] - 0.2);
      c.state = "walking";
      npc.walkTo(W.frontDoor.x, W.frontDoor.z - 1.6, () => {
        if (!G.shoppers.includes(c)) return;
        browseCustomer(c, npc, () => queueCustomer(c));
      });
    });
  }
  function customerSpot(id) {
    return W.itemSpots[id] || W.spots.counter;
  }
  function placeCustomerItems(c) {
    W.clearCounter();
    c.carriedItems = c.carriedItems || [];
    c.carriedItems.forEach((item, i) => {
      item.parent = null;
      item.position.copyFrom(W.trayPosition(i));
      item.rotation.y = 0;
      item.scaling.set(0.9, 0.9, 0.9);
      W.counterItems.push(item);
    });
  }
  // Shoppers walk the aisles on the shared navigation grid, so they stop in
  // front of a fixture instead of standing inside it.
  function browseCustomer(c, npc, done) {
    const ids = c.order || [];
    let index = 0;
    const next = () => {
      if (!G.shoppers.includes(c) || c.state === "hostile") return;
      if (index >= ids.length) {
        done();
        return;
      }
      const id = ids[index],
        spot = customerSpot(id);
      c.state='walking';
      npc.walkTo(spot[0], spot[1], () => {
        if (!G.shoppers.includes(c) || c.state === "hostile") return;
        c.state='browsing';c.browseSection=id;
        const linger=3+G.trafficRandom()*9+(G.trafficRandom()<.12?12:0);
        later(linger, () => {
        if (!G.shoppers.includes(c) || c.state === 'hostile') return;
        const fridge = W.productFridges[id];
        W.openFridge(fridge, 2.6);
        later(fridge ? 0.8 : 0.3, () => {
          if (!G.shoppers.includes(c) || c.state === "hostile") return;
        const item = W.makeProduct(id, 0, 0, 0);
        item.parent = npc.root;
        item.position.set(index % 2 ? -0.22 : 0.22, 1.03, -0.2);
        item.scaling.set(0.78, 0.78, 0.78);
        item.productId = id;
        c.carriedItems.push(item);
        // No announcement: the item visibly rides in their hands, and what
        // they chose is discovered at the till, the way it would be.
        audio.play("paper");
        index++;
        later(0.65, next);
        });
        });
      });
    };
    next();
  }
  function customerAtCounter(c, npc) {
    if (!G.shoppers.includes(c) || G.customer !== c) return;
    placeCustomerItems(c);
    c.state = "waiting";
    npc.root.rotation.y = Math.PI / 2;
    npc.root.position.set(W.spots.counter[0], 0.23, W.spots.counter[1]);
    say(customerPerson(c).name, customerPerson(c).line, 9);
    objective(
      c.id === "shibata"
        ? "Serve the customer at Pump Four."
        : c.id === "mimic"
          ? "Daichi has returned. Something feels wrong."
          : "Serve " + customerPerson(c).name + ".",
      c.id === "daichi"
        ? "Scan the items, heat the noodles, then validate fuel or take payment."
        : c.fuel
          ? "Scan the items, validate Pump 0" + c.pump + " on the fuel computer, then take payment."
          : "Scan the items on the counter, then use the register.",
    );
    updateOrder();
    if (c.id === "mimic") {
      G.flags.phoneRinging = true;
      audio.play("phone");
      journal(
        "A familiar order",
        "Daichi has returned with exactly the same order. He is not behaving like the man from earlier.",
      );
    }
    if (c.id === "ryo")
      journal(
        "The injured driver",
        "Ryo says a car followed him. His appearance is alarming, but the pickup may explain his injuries.",
      );
  }
  function summon(id) {
    if (!people[id]) return;
    // Let the last ordinary shoppers pay and leave before the supernatural
    // sequence begins. Nothing can replace Shibata or the returning double.
    if (id === "shibata" && G.shoppers.some(c => c.ambient)) {
      G.pendingStory = id;
      later(2, () => summon(id));
      return;
    }
    G.pendingStory = null;
    const d = people[id];
    const pump = id === "shibata" ? 4 : id === "emi" ? 2 : 0;
    const bay = pump ? null : W.reserveBay(id);
    if (!pump && !bay) { later(2, () => summon(id)); return; }
    phase(id);
    G.flags.customerSeen = false;
    const park = pump === 4 ? [6.9, W.L.pumpZ[1]] : pump ? [-6.9, W.L.pumpZ[1]] : [bay.x, bay.z];
    const car = W.makeCar(d.type, d.paint, d.plate);
    car.root.position.set(-58, 0, W.L.road);
    car.targetSpeed = 8;
    const c = {
      id, car, bay, npc: null, state: "driving", order: [...orders[id]],
      fuel: id === "emi" ? 12 : 0, pump, fuelAuthorized: false, carriedItems: [],
    };
    G.storyCustomer = c;
    G.shoppers.push(c);
    if (!G.customer || G.customer.state === "leaving") { G.customer = c; G.scan = 0; }
    interactCar(car, id);
    if (!G.customer || G.customer === c)
      objective("A vehicle is approaching.", "Shoppers may arrive together. Serve each order at the till.");
    if (!G.nextAmbient) G.nextAmbient = G.elapsed + 65 + G.trafficRandom() * 70;
    arriveCustomer(c, d, park);
  }
  function interactCar(car, id) {
    W.interact(
      "car-" + id + "-" + W.cars.length,
      car.hit,
      "Inspect " + people[id].name + "’s vehicle",
      "car",
      { car, id },
      3.2,
    );
  }
  function dismiss(after) {
    const c = G.customer;
    if (!c) return;
    if (c.person?.katagiri && !G.flags.katagiriVisited) {
      G.flags.katagiriVisited = true;
      journal(
        "The customer with the tape",
        "He paid exact change for cloth tape and batteries, and asked whether the camera records. His sedan is grey. KU 09-77.",
      );
    }
    c.state = "leaving";
    W.clearCounter();
    show("checkout", false);
    if (c.npc) {
      c.npc.walkTo(
        c.car.root.position.x + c.doorSide * 1.3,
        c.car.root.position.z - 0.2,
        () => {
          c.car.doorTarget = 1;
          c.npc.walking = false;
          later(c.fuel ? 6 : 1, () => {
            c.npc.root.setEnabled(false);
            c.npc.active = false;
            c.car.doorTarget = 0;
            if (c.fuel) {
              const screen = W.scene.getMeshByName("pump digits " + c.pump);
              if (screen)
                W.setDisplay(screen, "REGULAR", c.fuel.toFixed(2), "¥ " + c.fuel * 118);
            }
            later(1, () =>
              c.car.route(
                [
                  [c.car.root.position.x, c.bay ? 11.6 : 24],
                  [-11, c.bay ? 11.6 : 24],
                  [-13, 26],
                  [-8, W.L.road],
                  [62, W.L.road],
                ],
                () => {
                  c.car.root.setEnabled(false);
                  c.car.co.enabled = false;
                  W.releaseBay(c.bay);
                  G.shoppers = G.shoppers.filter(shopper => shopper !== c);
                  if (G.customer === c) G.customer = null;
                  advanceQueue();
                  if (after) later(2, after);
                },
              ),
            );
          });
        },
      );
    } else if (after) after();
    advanceQueue();
  }
  function total(c) {
    return (
      c.order.reduce(
        (a, id) => a + W.products.find((p) => p.id === id).price,
        0,
      ) +
      (c.fuel || 0) * 118
    );
  }
  function checkout() {
    const c = G.customer;
    if (G.phase === "siege" && G.flags.powerRestored) {
      finalRegister();
      return;
    }
    if (!c || c.state !== "waiting") {
      toast("Register ready. Wait for a customer at the counter.");
      return;
    }
    if (G.scan < c.order.length) {
      toast("Scan every item before taking payment.");
      return;
    }
    if (c.id === "daichi" && !G.flags.noodlesHeated) {
      toast("Daichi asked for hot noodles. Use the microwave.");
      return;
    }
    if (c.fuel && !c.fuelAuthorized) {
      toast("Validate Pump 0" + c.pump + " on the fuel computer before taking payment.");
      return;
    }
    if (c.id === "shibata") {
      audio.play("paper");
      W.setDisplay(
        W.registerScreen,
        "17 APRIL 1980",
        "PUMP 04",
        "ATTENDANT REQUIRED",
      );
      G.flags.strangeReceipt = true;
      journal(
        "Receipt: 17 April 1980",
        "PUMP 04 · KU 17-04 · PAYMENT RECEIVED · ATTENDANT REQUIRED. The receipt is eighteen years old.",
      );
      openModal(
        "TRANSACTION 0004 / 01:06",
        "Attendant required.",
        `<blockquote>KUROSE SERVICE<br>17 APRIL 1980 · 01:06<br>PUMP: 04<br>VEHICLE: KU 17-04<br>WATER · MINT SWEETS<br><br>PAYMENT RECEIVED<br>ATTENDANT REQUIRED</blockquote><p>Shibata watches the receipt emerge.</p><p>“I need you to check the number. Outside.”</p>`,
        [
          [
            "Keep the receipt",
            () => {
              c.state = "strange";
              show("checkout", false);
              objective(
                "Compare Pump Four with the security camera.",
                "Enter the stockroom, then the office on your left. The CCTV monitor is on the desk.",
              );
              say("NAO", "That date… this can’t be right.");
            },
          ],
        ],
      );
      return;
    }
    if (c.id === "mimic") {
      startIntruder();
      return;
    }
    if (c.id === "ryo" && !G.flags.ryoDecision) {
      openModal(
        "RYO / ROADSIDE DRIVER",
        "Blood on his sleeve.",
        `<p>“I lost my wallet. I can pay when I come back.”</p><p>You can check the pickup before deciding. A frightening appearance is not evidence of a threat.</p>`,
        [
          [
            "Let me check the truck",
            () => {
              objective(
                "Inspect Ryo’s pickup outside.",
                "Return to the register when you have checked his story.",
              );
            },
          ],
          [
            "Let him take the supplies",
            () => {
              G.flags.ryoDecision = true;
              G.flags.ryoHelped = true;
              G.flags.flare = true;
              journal(
                "Ryo’s flare",
                "You helped the injured driver. He left you a road flare: press R to use it once during an attack.",
              );
              completeSale();
            },
          ],
          [
            "Refuse the sale",
            () => {
              G.flags.ryoDecision = true;
              say("RYO", "All right. Just… don’t go near that car.");
              G.pendingStory = "shibata";
              dismiss(() => summon("shibata"));
            },
          ],
        ],
      );
      return;
    }
    completeSale();
  }
  function completeSale() {
    const c = G.customer;
    if (!c) return;
    audio.play("cash");
    if (W.placeCash) W.placeCash(total(c));
    toast("Cash left on the counter. Payment received.");
    W.setDisplay(
      W.registerScreen,
      "PAYMENT RECEIVED",
      "¥ " + total(c),
      "THANK YOU / ありがとうございました",
    );
    for (const id of c.order) W.stock[id] = Math.max(0, W.stock[id] - 1);
    if (c.ambient) {
      say(customerPerson(c).name, "Thanks. Have a good night.", 4);
      dismiss();
      return;
    }
    if (c.id === "ryo") G.pendingStory = "shibata";
    const next = {
      emi: "daichi",
      daichi: "hasegawa",
      hasegawa: "ryo",
      ryo: "shibata",
    };
    if (c.id === "emi") {
      say(
        "EMI",
        "Thanks, Nao. Coffee and a salmon rice ball. Same thing every night. I may be back before dawn.",
      );
      journal(
        "Emi, the taxi driver",
        "Emi bought canned coffee and a salmon rice ball. Her taxi plate is KU 23-81. She may return.",
      );
    }
    if (c.id === "daichi") {
      say(
        "DAICHI",
        "Rear door isn’t latching. Pull it hard, or fix the catch. Take care.",
      );
      journal(
        "The loose latch",
        "Daichi noticed the rear service door does not latch properly. The catch can be repaired from the stockroom.",
      );
    }
    if (c.id === "hasegawa") {
      say(
        "MRS. HASEGAWA",
        "The old road flooded in 1980. Aki was working. He never talks about her.",
      );
      journal(
        "Aki Fujimoto",
        "Mrs. Hasegawa remembers an attendant named Aki, and the flood of 1980. There may be records in the office.",
      );
    }
    if (c.id === "ryo")
      say(
        "RYO",
        "Take the flare. If that cream car stops here, don’t go out to it.",
      );
    objective(
      "Customer served.",
      "They will return to their vehicle. Prepare for the next arrival.",
    );
    dismiss(() => summon(next[c.id]));
  }
  function startIntruder() {
    if (G.phase === "intruder") return;
    phase("intruder");
    G.checkpoint = "intruder";
    G.flags.phoneRinging = false;
    W.clearCounter();
    show("checkout", false);
    audio.play("scare");
    const c = G.customer;
    if (c?.npc) {
      G.threat = c.npc;
      G.threat.threat = true;
      G.threat.speed = 1.8;
      G.threat.path = [];
      G.threat.walking = false;
      c.state = "hostile";
    } else spawnThreat(W.spots.counter[0] - 1.6, 3.4);
    say("THE CUSTOMER", "Tell him we’re closed.", 6);
    objective(
      "Sound the security alarm.",
      "The red button is behind the glass beside the fuel computer. Keep your distance.",
    );
    show("danger-label");
    G.grace = 2;
  }
  function alarm() {
    audio.play("alarm");
    if (G.phase === "intruder") {
      W.frontDoor.locked = false;
      const n = G.threat;
      if (n) {
        n.threat = false;
        n.walkTo(W.frontDoor.x, W.frontDoor.z + 6, () => {
          n.route([[-14, 16], [-18, 24]], () => {
            n.root.setEnabled(false);
            n.active = false;
          });
        });
      }
      G.threat = null;
      if (G.customer) {
        G.customer.state = "leaving";
        const c = G.customer;
        c.car.route(
          [
            [c.car.root.position.x, 20],
            [-14, 26],
            [-8, W.L.road],
            [62, W.L.road],
          ],
          () => c.car.root.setEnabled(false),
        );
        G.customer = null;
      }
      show("danger-label", false);
      phase("investigate");
      G.flags.replicaGone = true;
      G.flags.phoneRinging = true;
      objective(
        "Find out what happened to Aki.",
        "Inspect the stockroom report and the locked office drawer. The workbench holds a key.",
      );
      journal(
        "The false customer",
        "Daichi called from the next town while his double stood at the counter. The alarm drove the double out.",
      );
      later(3, () =>
        say("TELEPHONE", "The office telephone is ringing again."),
      );
      checkEvidence();
    } else if (G.threat) {
      if ((G.alarmReady || 0) > G.elapsed) {
        toast("Alarm capacitor recharging.");
        return;
      }
      G.threat.stunned = 4;
      G.alarmReady = G.elapsed + 16;
      toast("The Passenger recoils. Move now.");
    } else {
      // No threat: the alarm is just terribly loud in a small shop at night,
      // and every ordinary person in it behaves like one. Who does NOT react
      // is the plot doing its work.
      let reacted = false;
      for (const c of G.shoppers) {
        const n = c.npc;
        if (!n?.active || !n.root.isEnabled()) continue;
        // Everyone flinches toward the counter; the walk loop eases them back.
        const at = W.spots.attendant;
        n.root.rotation.y = Math.atan2(at[0] - n.root.position.x, at[1] - n.root.position.z);
      }
      const c = G.customer, n = c?.npc;
      if (n?.active && n.root.isEnabled() && c.state !== "leaving") {
        reacted = true;
        G.flags.falseAlarm = true;
        if (c.id === "shibata" || c.id === "mimic") {
          say("NAO", "The alarm is screaming. He has not moved at all.", 6);
          if (!G.flags.alarmUnmoved) {
            G.flags.alarmUnmoved = true;
            journal(
              "He did not flinch",
              "I set off the alarm with him at the counter. Everyone tonight jumps at the door chime. He did not even blink.",
            );
          }
        } else if (c.person?.katagiri) {
          say("NAO", "Mr. Katagiri did not look up from counting his change.", 6);
          if (!G.flags.alarmKatagiri) {
            G.flags.alarmKatagiri = true;
            journal(
              "He did not look up",
              "The alarm went off half a metre from Mr. Katagiri. He kept counting coins. Everyone looks up.",
            );
          }
        } else {
          const lines = {
            emi: [["EMI", "—! Was that necessary? You scared me halfway onto the road."],
              ["NAO", "Sorry. Wrong switch. First night."],
              ["EMI", "Test it on an empty shop, then. This road rattles people enough on its own."]],
            daichi: [["DAICHI", "WHOA—! Nearly wore the noodles."],
              ["NAO", "Sorry — wrong button."],
              ["DAICHI", "At the depot that sound means run. Don't teach it to mean nothing out here."]],
            hasegawa: [["MRS. HASEGAWA", "That bell. Kurose rang it the night— back when the old pumps were still in."],
              ["NAO", "It's only the security alarm, ma'am."],
              ["MRS. HASEGAWA", "I know exactly what it is, dear. I had hoped never to hear it again."]],
            ryo: [["RYO", "Why did you do that?! Did you see him? Is he outside?!"],
              ["NAO", "No — no. It was a mistake."],
              ["RYO", "Then don't. Don't call anything toward us."]],
          }[c.id];
          if (lines) {
            dialogue(n, lines);
            if (c.id === "hasegawa" && !G.flags.alarmHasegawa) {
              G.flags.alarmHasegawa = true;
              journal(
                "The alarm, before",
                "Mrs. Hasegawa flinched like it was another decade. \u201cKurose rang it the night\u2014\u201d She would not finish the sentence.",
              );
            }
          } else say(customerPerson(c).name, "\u2026Was that entirely necessary?", 5);
        }
      }
      if (!reacted) toast("Security alarm tested.");
    }
  }
  function spawnThreat(x, z) {
    const n = W.makeNPC("The Passenger", "#444b40", "#222920");
    n.root.position.set(x, 0.23, z);
    n.threat = true;
    n.speed = 1.8;
    G.threat = n;
    show("danger-label");
    return n;
  }
  function checkEvidence() {
    if (G.phase !== "investigate") return;
    if (G.flags.original && G.flags.report && G.flags.cameraClue) {
      objective(
        "The taxi is returning.",
        "Close the front entrance using the counter intercom.",
      );
      later(6, beginRescue);
    } else {
      const needs = [];
      if (!G.flags.report) needs.push("stockroom report");
      if (!G.flags.original)
        needs.push("original receipt in the office drawer");
      if (!G.flags.cameraClue) needs.push("security camera");
      objective(
        "Find Aki’s original transaction.",
        "Still needed: " + needs.join(", ") + ".",
      );
    }
  }
  function beginRescue() {
    if (G.phase !== "investigate") return;
    phase("rescue");
    G.flags.phoneRinging = false;
    W.frontDoor.locked = true;
    const car = W.makeCar("taxi", "#818f79", "KU 23-81");
    car.root.position.set(-58, 0, W.L.road);
    G.rescueCar = car;
    const bay = W.reserveBay("emi-rescue");
    G.rescueBay = bay;
    car.route(
      [
        [-20, W.L.road],
        [-15, W.L.road - 6],
        [-11, 11.6],
        [bay.x, 11.6],
        [bay.x, bay.z],
      ],
      () => {
        const emi = W.makeNPC("Emi Tanabe", "#8c7760", "#302c27", true);
        car.root.rotation.y = Math.PI;
        emi.root.position.set(bay.x - 1.3, 0.23, bay.z - 0.2);
        G.emi = emi;
        emi.walkTo(W.frontDoor.x, W.frontDoor.z + 1.5, () => {
            emi.root.rotation.y = Math.PI;
            G.flags.emiAtDoor = true;
            audio.play("phone");
            say(
              "EMI / INTERCOM",
              "Nao. Open the door. There’s someone sitting in my back seat.",
              10,
            );
            objective(
              "Verify Emi through the intercom.",
              "The intercom is on the staff side of the cashier counter.",
            );
        });
      },
    );
  }
  function rescueEmi() {
    G.flags.emiVerified = true;
    W.frontDoor.locked = false;
    W.frontDoor.hold = 7;
    G.emi.walkTo(-5.6, -4.2, () => {
        G.flags.emiSaved = true;
        G.flags.emiAtDoor = false;
        W.frontDoor.locked = true;
        say(
          "EMI",
          "I called for help. They can’t get through the flood. What is happening here?",
          10,
        );
        journal(
          "Emi is safe",
          "Emi remembered her first visit. You admitted her and locked the entrance after she cleared the threshold.",
        );
        objective(
          "Listen to the register.",
          "A message is printing at the counter.",
        );
        later(7, beginSiege);
    });
    toast("Entrance released. The sensor will wait until Emi clears the door.");
  }
  function beginSiege() {
    if (G.phase === "siege" || G.phase === "finale") return;
    phase("siege");
    G.checkpoint = "siege";
    G.siegeInventory = {
      fuse: !!G.flags.fuse,
      medkit: !!G.flags.medkit,
      medkitTaken: !!G.flags.medkitTaken,
      flare: !!G.flags.flare,
    };
    G.flags.phoneRinging = false;
    W.frontDoor.locked = true;
    W.setPower(false);
    audio.play("scare");
    say("RECEIPT PRINTER", "I DID NOT CLOCK OUT.", 8);
    journal(
      "I did not clock out",
      "Aki preserved the carbon copies. Kuroda left her and the stranded travelers inside during the flood. Completing the old sale would give the Passenger a replacement attendant.",
    );
    objective(
      "Restore the backup circuit.",
      "Take the spare fuse from the stockroom workbench. The disconnect is outside the rear door.",
    );
    later(10, startSiegeThreat);
  }
  function startSiegeThreat() {
    audio.play("knock");
    W.breakWindow(W.breachWindow);
    say("OUTSIDE", "You forgot the receipt.", 5);
    later(4, () => {
      W.breakWindow(W.breachWindow);
      audio.play("glass");
      spawnThreat(W.windows[W.breachWindow].x, W.frontDoor.z + 1.1);
      objective(
        G.flags.powerRestored
          ? "Reprint Aki’s transaction at the register."
          : "Restore power. Something has broken the glass.",
        G.flags.powerRestored
          ? "Use the original carbon copy."
          : "The exterior disconnect is behind the stockroom.",
      );
    });
  }
  function finalRegister() {
    openModal(
      "TRANSACTION 0004",
      "One unfinished sale.",
      `<p>The terminal wakes on backup power. Aki’s original carbon copy fits beneath the scanner.</p><blockquote>PUMP 04<br>VEHICLE KU 17-04<br>ATTENDANT: AKI FUJIMOTO<br>STATUS: UNFINISHED</blockquote><p>Kuroda’s last instruction was to complete the sale. Aki’s notes say to preserve the original and isolate the pump.</p>`,
      [
        [
          "Reprint original & cancel sale",
          () => {
            G.flags.saleCancelled = true;
            phase("finale");
            G.checkpoint = "finale";
            audio.play("paper");
            journal(
              "The original restored",
              "You cancelled the transaction under Aki’s attendant number. Isolate Pump Four at the rear disconnect to end the cycle.",
            );
            objective(
              "Isolate Pump Four at the rear disconnect.",
              "Leave through the stockroom service exit. Use the alarm or flare to create distance.",
            );
            say("AKI", "Go home. Your shift is over.", 7);
            if (!G.threat) spawnThreat(W.windows[W.breachWindow].x, 3.6);
          },
        ],
        ["Complete sale", () => finish("replacement")],
      ],
    );
  }
  function finish(type) {
    G.mode = "ending";
    G.threat = null;
    release();
    show("hud", false);
    show("camcorder", false);
    show("ending");
    audio.engine(false);
    audio.play(type === "replacement" ? "scare" : "switch");
    const saved = G.flags.emiSaved;
    const texts = {
      complete: [
        "ENDING 01 / 03",
        "Shift complete.",
        `The rain stops before the sky begins to brighten. The station is damaged, but the original receipts survive.${saved ? " Emi waits with you beside her taxi. Neither of you speaks until you hear the first morning truck." : ""} In the unfolded photograph, Aki stands beside her coworkers. For the first time, you can see her face.`,
      ],
      replacement: [
        "ENDING 02 / 03",
        "Your relief has arrived.",
        `At dawn, a new attendant walks past you and clocks in. You try to answer his greeting. He cannot hear you. Outside, your own car pulls up to Pump Four. Someone wearing your face gets out. The register prints a new name.`,
      ],
      escape: [
        "ENDING 03 / 03",
        "Roadside escape.",
        `You and Emi leave before the sale is finished. In the taxi’s mirror, the station disappears into rain. Then its canopy lights return. A dispatch crackles through the radio: “Kurose Service. One passenger waiting.”`,
      ],
    }[type];
    $("ending-number").textContent = texts[0];
    $("ending-title").textContent = texts[1];
    $("ending-text").textContent = texts[2];
    if (type === "complete") {
      W.setPower(false);
      scene.fogColor = new B.Color3(0.14, 0.19, 0.19);
      scene.clearColor = new B.Color4(0.09, 0.14, 0.16, 1);
    }
    G.ending = type;
  }
  const CAMS = [
    { id: "01", label: "SALES FLOOR", pos: [-11.2, 3.1, 4.4], target: [4, 0.9, -2], fov: 1.15,
      idle: "CAM 01 · Sales floor. The aisles hum under the tubes." },
    { id: "02", label: "FORECOURT", pos: [-8.4, 3.4, 6.4], target: [5.5, 1.2, 16], fov: 1.05,
      idle: "CAM 02 · Forecourt. Rain washes across the lens." },
    { id: "03", label: "REAR YARD", pos: [0.2, 3.0, -13.6], target: [6.4, 1.0, -10.5], fov: 1.1,
      idle: "CAM 03 · Rear yard. The service light hums over the door." },
    { id: "04", label: "STOCKROOM", pos: [0.8, 3.05, -6.6], target: [7.2, 0.8, -9.8], fov: 1.1,
      idle: "CAM 04 · Stockroom. Boxes from the evening delivery." },
  ];
  // Where the tape says Katagiri is standing right now. One stage per band of
  // the night, each on a different camera, each a step closer to the player:
  // road edge, then the aisles, then the stockroom. He is never in the room.
  function watcherStage() {
    if (!G.flags.katagiriVisited) return null;
    const ph = G.phase;
    if (ph === "daichi" || ph === "hasegawa")
      return { cam: 1, pos: [7.5, 0.23, 13.2], yaw: Math.PI, flag: "watcher1",
        caption: "A man stands at the edge of the parking bays, facing the shop. There is no car on the image.",
        note: ["A figure on the forecourt camera", "Across the road, not waiting for anything. The grey sedan is nowhere on the image."] };
    if (ph === "ryo")
      return { cam: 0, pos: [-6.5, 0.23, 3.8], yaw: Math.PI, flag: "watcher2",
        caption: "There is a customer standing in front of aisle two. The shop is empty. The door has not opened.",
        note: ["A customer who is not there", "Aisle two on the sales floor camera. I can see the whole shop from the counter. There is no one in it."] };
    if (ph === "shibata" || ph === "mimic")
      return { cam: 3, pos: [2.2, 0.23, -10.0], yaw: Math.PI, flag: "watcher3",
        caption: "Someone is in the stockroom, facing the wall. The stockroom door is shut.",
        note: ["Facing the wall", "The stockroom camera. He is inches from the south wall, perfectly still. The latch on the service door is the one I repaired."] };
    return null;
  }
  function updateWatcher() {
    if (!W.watcher) {
      W.watcher = W.makeNPC("Katagiri", "#4a4d4a", "#2a2d2a");
      W.setTapeOnly(W.watcher);
      W.watcher.root.setEnabled(false);
    }
    const st = watcherStage();
    const on = st && G.cam === st.cam;
    W.watcher.root.setEnabled(!!on);
    W.watcher.tapeCaption = on ? st.caption : null;
    W.watcher.tapeCam = on ? st.cam : -1;
    if (on) {
      W.watcher.root.position.set(st.pos[0], st.pos[1], st.pos[2]);
      W.watcher.root.rotation.y = st.yaw;
      if (!G.flags[st.flag]) {
        G.flags[st.flag] = true;
        journal(st.note[0], st.note[1]);
        audio.play("scare");
      }
    }
  }
  function aimCam(i) {
    const c = CAMS[i];
    securityCamera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    securityCamera.setTarget(new V(c.target[0], c.target[1], c.target[2]));
    securityCamera.fov = c.fov;
  }
  function setCam(i, blip = true) {
    G.cam = (i + CAMS.length) % CAMS.length;
    aimCam(G.cam);
    updateWatcher();
    $("cctv-cam").textContent = "KUROSE SECURITY / CAM " + CAMS[G.cam].id + " · " + CAMS[G.cam].label;
    $("cctv-caption").textContent = cctvCaption(G.cam);
    if (blip) audio.play("switch");
  }
  // What the selected camera has to say right now. Story moments override the
  // idle line; they are all tied to specific cameras, which is what makes
  // flipping through the bank an act of looking rather than a menu.
  function cctvCaption(i) {
    const cam = CAMS[i];
    if (i === 1) {
      if (G.flags.strangeReceipt)
        return "The cream sedan is missing from the image. The camera timestamp reads 17 APRIL 1980. A figure stands where Pump Four should be.";
      if (G.phase === "ryo")
        return "A dark vehicle passes the road without stopping. Ryo\u2019s pickup has a broken side window.";
    }
    if (W.watcher?.tapeCaption && W.watcher.tapeCam === i) return W.watcher.tapeCaption;
    return cam.idle;
  }
  function cameraView() {
    if (G.threat) {
      toast("No time to watch the cameras while someone is inside.");
      return;
    }
    G.cctv = true;
    if(W.heldRoot)W.heldRoot.setEnabled(false);
    release();
    show("hud", false);
    show("cctv");
    scene.activeCamera = securityCamera;
    $("cctv-time").textContent =
      G.phase === "shibata"
        ? "01:06:44 / 1980"
        : phases[G.phase]?.[0] || "02:14";
    setCam(G.cam ?? 1, false);
    let caption = cctvCaption(G.cam);
    if (G.flags.strangeReceipt) {
      G.flags.cameraClue = true;
      caption =
        "The cream sedan is missing from the image. The camera timestamp reads 17 APRIL 1980. A figure stands where Pump Four should be.";
      if (!W.aki) {
        W.aki = W.makeNPC("Aki Fujimoto", "#879a8e", "#333b33", true);
        W.aki.root.position.set(W.L.islands[1] + 1.6, 0.23, W.L.pumpZ[1]);
        W.aki.root.rotation.y = Math.PI;
        W.aki.hit.isPickable = false;
      }
      W.aki.root.setEnabled(true);
      if (G.phase === "shibata") {
        G.customer.car.root.setEnabled(false);
        G.customer.car.co.enabled = false;
        G.customer.npc.root.setEnabled(false);
        G.customer.npc.active = false;
        W.clearCounter();
        G.flags.shibataCamera = true;
      }
      journal(
        "Camera discrepancy",
        "The camera date is 17 April 1980. The sedan is absent. The vehicle registration on the receipt is KU 17-04.",
      );
    }
    if (G.phase === "ryo") {
      caption =
        "A dark vehicle passes the road without stopping. Ryo’s pickup has a broken side window.";
      G.flags.ryoChecked = true;
    }
    $("cctv-caption").textContent = caption;
  }
  function closeCamera() {
    if (!G.cctv) return;
    G.cctv = false;
    G.cam = 1;
    aimCam(1);
    if (W.watcher) { W.watcher.root.setEnabled(false); W.watcher.tapeCaption = null; }
    if(W.heldRoot)W.heldRoot.setEnabled(true);
    scene.activeCamera = camera;
    show("cctv", false);
    show("hud");
    if (W.aki) W.aki.root.setEnabled(false);
    if (G.phase === "shibata" && G.flags.shibataCamera) {
      G.customer = null;
      phase("mimic");
      objective(
        "The sedan has gone.",
        "Return to the counter. Another van is approaching.",
      );
      later(6, () => summon("mimic"));
    }
    checkEvidence();
    capture();
  }
  function interact(o) {
    if (!o || G.mode !== "playing" || G.modal || G.cctv) return;
    if(o.kind==='home'){W.prologue.act(o.id);return;}
    if(o.kind==='boss'){W.prologue.talkBoss();return;}
    if (o.data.fridge) W.openFridge(o.data.fridge, 3);
    switch (o.kind) {
      case "door": {
        const d = o.data.door;
        if (d.locked) {
          toast("Locked.");
          break;
        }
        d.target = d.target > 0.5 ? 0 : 1;
        audio.play("door");
        break;
      }
      case "mop":
        if (G.carry?.kind === "mop") {
          if (G.chore?.type === "mop" && G.chore.spill) { toast("The spill is still wet."); break; }
          G.carry = null; G.held = null; held();
          o.mesh.setEnabled(true);
          scene.getMeshByName("mop head")?.setEnabled(true);
          audio.play("switch");
          if (G.chore?.type === "mop") choreDone("Mop back in its corner. The floor is dry.");
          else toast("You lean the mop back in its corner.");
          break;
        }
        if (!takeCarry("mop", null, "Mop")) break;
        o.mesh.setEnabled(false);
        scene.getMeshByName("mop head")?.setEnabled(false);
        break;
      case "spill": {
        if (G.carry?.kind !== "mop") { toast("You need the mop from the stockroom."); break; }
        const sp = G.chore?.spill;
        if (!sp || sp.mesh !== o.mesh) break;
        sp.wipes--;
        audio.play("paper");
        if (sp.wipes > 0) { sp.mesh.scaling.scaleInPlace(0.62); break; }
        sp.mesh.dispose();
        sp.o.enabled = false;
        G.chore.spill = null;
        toast("Floor dried. Lean the mop back in the stockroom.");
        break;
      }
      case "bin-bag":
        if (!takeCarry("trashbag", null, "Rubbish bag")) break;
        W.binBag.setEnabled(false);
        W.binBagInteraction.enabled = false;
        break;
      case "yard-bin":
        if (G.carry?.kind === "trashbag") {
          G.carry = null; G.held = null; held();
          if (G.chore?.type === "trash") choreDone("The bag lands in the yard bin. The rain keeps falling.");
          else toast("The bag lands in the yard bin.");
        } else toast("The yard bin smells of rain and old oil.");
        break;
      case "chore-carton":
        if (!takeCarry("stockbox", null, "Stock carton")) break;
        W.choreBox.setEnabled(false);
        W.choreBoxInteraction.enabled = false;
        break;
      case "chore-shelf": {
        if (G.carry?.kind !== "stockbox") { toast("You need the stock carton from the workbench."); break; }
        const gap = G.chore?.gap;
        if (!gap || gap.gap !== o.mesh) break;
        gap.row.setEnabled(true);
        gap.gap.dispose();
        gap.o.enabled = false;
        G.carry = null; G.held = null; held();
        choreDone("Shelf refilled and faced up.");
        break;
      }
      case "timeclock":
        if(W.prologue.stage==='orientation'){toast('Speak to Mr. Kuroda before beginning your night shift.');break;}
        if (!G.flags.clocked) {
          G.flags.clocked = true;
          phase("prep");
          audio.play("switch");
          journal(
            "The supervisor’s instructions",
            "Pump Four is disconnected. The rear door has a loose latch. Leave the carbon copies in the register.",
          );
          objective(
            "Restock the canned coffee.",
            "Carry the COFFEE carton from the stockroom to the left refrigerator.",
          );
          say("NAO", "Nao Mori. First shift. Just keep busy.");
        } else toast("Clocked in at 11:42 PM. Your shift is still open.");
        break;
      case "note":
        openModal(
          "STAFF HANDOVER",
          "Before you begin.",
          `<p>Nao — thanks for covering.</p><blockquote>1. Clock in. The machine is on the office wall.<br>2. Coffee delivery is in the stockroom. Fill cooler 01 on the back wall.<br>3. Customers choose their own items. Scan what they bring to the counter.<br>4. For fuel, validate the litres on the employee computer before taking payment.<br>5. Heat noodles if asked.<br>6. Pump Four is disconnected. Cancel it if it lights up.<br>7. Pull the rear door until you hear the latch.<br>8. Leave the carbon copies in the register.</blockquote><p>— Kuroda</p>`,
        );
        break;
      case "carton":
        if (!G.flags.clocked) {
          toast("Clock in first. The time clock is in the office.");
          break;
        }
        if(G.flags.stocked){toast('The delivery is already stocked.');break;}
        if(!takeCarry('carton',null,'Coffee delivery'))break;
        W.consumeDelivery();
        toast("Carry the carton to the left refrigerator in the shop.");
        break;
      case "restock":
        if (G.carry?.kind === "carton" && !G.flags.stocked) {
          G.flags.carton = false;
          G.flags.stocked = true;
          G.held = null;
          G.carry = null;
          held();
          W.restockCoffee();
          audio.play("switch");
          toast("Coffee restocked.");
          if (G.phase === "prep") {
            objective(
              "Return to the checkout counter.",
              "Your first customer is approaching.",
            );
            later(3, () => summon("emi"));
          }
        } else
          openModal(
            "REFRIGERATED DRINKS",
            "Canned coffee",
            `<p>Black coffee, green tea, and mineral water. The compressor rattles behind the shelves.</p><p>Coffee in stock: ${W.stock.coffee}. The delivery carton is in the stockroom.</p>`,
          );
        break;
      case "product": {
        const p = o.data.product;
        openModal(
          "KUROSE SELECT",
          p.name,
          `<p>¥${p.price} · ${W.stock[p.id]} in stock.</p><p>${p.id === "mints" ? "A familiar brand of mint sweets. The packaging looks as though it has not changed in twenty years." : "Everyday supplies for people passing through."}</p>`,
          [
            ["Put it back", () => {}],
            [
              "Carry one to inspect",
              () => {
                if(!takeCarry('product',p.id,p.name))return;
                toast(
                  "Examining " +
                    p.name +
                    ". Customer stock is collected at checkout.",
                );
              },
            ],
          ],
        );
        break;
      }
      case 'pickup':
        if(takeCarry(o.data.carry.kind,o.data.carry.id,o.data.carry.name)){o.enabled=false;o.data.root.dispose();}
        break;
      case 'magazine':
        openModal('ROUTE MAGAZINE / APRIL 1998','The old mountain road.', '<p>A faded road map shows a bridge behind Kurose Service. The current route bends around it.</p><p>A handwritten note marks the old road: CLOSED SINCE 1980.</p>');
        break;
      case "scanner":
        if (
          G.customer?.state === "waiting" &&
          G.scan < G.customer.order.length
        ) {
          audio.play("scan");
          G.scan++;
          const p = W.counterItems[G.scan - 1];
          if (p) p.position.copyFrom(W.scannedPosition(G.scan - 1));
          updateOrder();
        } else toast("No unscanned customer items.");
        break;
      case "fuel-terminal": {
        const c = G.customer;
        if (!c || c.state !== "waiting" || !c.fuel) {
          toast("The fuel computer is idle. Wait for a pump customer.");
          break;
        }
        openModal(
          "PUMP 0" + c.pump + " / FUEL COMPUTER",
          "Validate the delivery",
          '<p>Confirm the litres shown on the pump before opening the cash drawer.</p><label for="fuel-liters">Litres dispensed</label><input id="fuel-liters" type="number" min="0" step="0.1" value="' +
            c.fuel +
            '"><p class="muted">Pump 0' + c.pump + ' reports ' +
            c.fuel +
            " litres.</p>",
          [
            [
              "Authorize fuel",
              () => {
                const entered = Number(document.getElementById("fuel-liters")?.value);
                if (!Number.isFinite(entered) || Math.abs(entered - c.fuel) > 0.05) {
                  toast("The litres do not match Pump 0" + c.pump + ".");
                  return;
                }
                c.fuelAuthorized = true;
                audio.play("switch");
                W.setDisplay(
                  W.registerScreen,
                  "PUMP 0" + c.pump + " AUTHORIZED",
                  c.fuel.toFixed(2) + " L",
                  "VERIFY / ¥" + total(c),
                );
                toast("Pump 0" + c.pump + " validated. Take payment at the register.");
                updateOrder();
              },
            ],
            ["Cancel", () => {}],
          ],
        );
        break;
      }
      case "register":
        checkout();
        break;
      case "cash-tray":
        if (!W.cashPiles || !W.cashPiles.length) {
          toast("The pass-through tray is empty.");
          break;
        }
        W.takeCash();
        audio.play("cash");
        toast("Cash counted and secured in the register.");
        break;
      case "bell":
        audio.play("bell");
        toast("The bell sounds much louder at night.");
        break;
      case "microwave":
        if (
          G.customer?.id === "daichi" &&
          G.customer.state === "waiting" &&
          !G.flags.noodlesHeated
        ) {
          if (G.flags.heating) {
            toast("Microwave running…");
            break;
          }
          G.flags.heating = true;
          const meal=W.counterItems[0];
          audio.tone(110, 0.6, 0.025);
          toast("Loading noodles. Door closes, then heat for 8 seconds.");
          W.startMicrowave(meal, () => {
            G.flags.noodlesHeated = true;
            G.flags.heating = false;
            if (meal) meal.position.copyFrom(W.trayPosition(0));
            audio.play("bell");
            toast("Noodles ready. Take Daichi’s payment at the register.");
            updateOrder();
          });
        } else {
          W.microwave.target=W.microwave.target>.5?0:1;
          audio.play("switch");
          toast(W.microwave.target?'Microwave door open.':'Microwave door closed.');
        }
        break;
      case "coffee":
        if(G.carry){toast('Set down what you are carrying first.');break;}
        if(W.coffee.remaining){toast('Coffee is still pouring.');break;}
        openModal('COFFEE MACHINE','Select your coffee','<p>A fresh cup will fill under the nozzle.</p>',[
          ...['Black coffee','Americano','Café au lait'].map(recipe=>[recipe,()=>{
            G.flags.pouring=true;
            W.pourCoffee(recipe,()=>{G.flags.pouring=false;takeCarry('coffee',null,recipe);audio.play('bell');toast(recipe+' ready.');});
            const target=new V(8.48,1.58,2.3),d=target.subtract(camera.position);
            G.player.yaw=Math.atan2(d.x,d.z);G.player.pitch=-Math.atan2(d.y,Math.hypot(d.x,d.z));
            audio.noise(2,.025,900);toast('Pouring '+recipe.toLowerCase()+'…');
          }]),['Cancel',()=>{}]
        ]);
        break;
      case 'generator':
        openModal('STANDBY DIESEL / SERVICE LOCK','Emergency generator','<p>Fuel tank: three quarters full. Transfer switch: OFF. A maintenance tag reads: DO NOT START UNDER LOAD.</p><p>This unit is separate from the pump disconnect. Kuroda keeps the service key.</p>');
        break;
      case "phone":
        if (G.phase === "mimic") {
          G.flags.phoneRinging = false;
          openModal(
            "INCOMING CALL / DAICHI",
            "I’m at the depot.",
            `<p>“Hey, it’s the noodle guy. Did I leave my wallet? I’m at the next town’s depot.”</p><p>The man at the counter stops moving. He turns toward the telephone.</p><blockquote>Tell him we’re closed.</blockquote>`,
            [["Put down the telephone", startIntruder]],
          );
        } else if (G.phase === "investigate") {
          G.flags.phoneRinging = false;
          openModal(
            "INCOMING CALL / KURODA",
            "Close early.",
            `<p>“Put every receipt in the disposal bag. Leave it beside Four. Then clock out.”</p><p>You ask about Aki.</p><p>For several seconds, you hear rain at the other end.</p><blockquote>Just finish the transaction, Nao.</blockquote><p>The line goes dead.</p>`,
          );
        } else if (G.flags.falseAlarm && !G.flags.falseAlarmCall && ordinaryPhases.has(G.phase)) {
          G.flags.falseAlarmCall = true;
          audio.play("phone");
          openModal(
            "INCOMING CALL / KURODA",
            "The panel rings through to my house.",
            `<p>\u201cThe alarm panel rings through to my house, Nao. I was halfway to my boots.\u201d</p><p>You apologise. Rain crackles on the line.</p><blockquote>Use it when you mean it. Out here, nobody comes the second time.</blockquote>`,
          );
        } else {
          audio.play("phone");
          toast("No answer. The road lines are unreliable in the rain.");
        }
        break;
      case "alarm":
        alarm();
        break;
      case "intercom":
        if (G.phase === "rescue" && G.flags.emiAtDoor && !G.flags.emiVerified) {
          openModal(
            "ENTRANCE INTERCOM",
            "Emi is outside.",
            `<p>Her taxi is parked by the shop. She keeps turning toward its rear seat.</p><p>“Nao. Please.”</p>`,
            [
              [
                "Ask what she bought earlier",
                () =>
                  openModal(
                    "VERIFY THE VISITOR",
                    "Coffee and a rice ball.",
                    `<p>“Black coffee. Salmon rice ball. I said the refrigerators would start thinking. Please let me in.”</p><p>Her voice breaks. She remembers details the double could not.</p>`,
                    [
                      ["Buzz Emi in", rescueEmi],
                      [
                        "Leave her outside",
                        () => {
                          toast(
                            "Emi waits beneath the awning. Use the intercom when you are ready.",
                          );
                        },
                      ],
                    ],
                  ),
              ],
              ["Leave the intercom", () => {}],
            ],
          );
        } else if (G.phase === "rescue" && G.flags.emiVerified)
          toast("Door sensor active. Waiting for Emi to clear the entrance.");
        else {
          const p = G.player;
          const D = W.frontDoor,
            inDoorway = (x, z) =>
              Math.abs(x - D.x) < D.half + 0.2 && Math.abs(z - D.z) < 0.9;
          const occupied =
            W.npcs.some(
              (n) => n.active && n.root.isEnabled() && inDoorway(n.root.position.x, n.root.position.z),
            ) || inDoorway(p.x, p.z);
          if (occupied && !W.frontDoor.locked) {
            toast("Threshold occupied. Let the doorway clear before locking.");
            break;
          }
          W.frontDoor.locked = !W.frontDoor.locked;
          audio.play("switch");
          toast(
            "Front entrance " + (W.frontDoor.locked ? "locked." : "unlocked."),
          );
        }
        break;
      case "cctv":
        cameraView();
        break;
      case "drawer":
        if (!G.flags.key) {
          toast(
            "The drawer is locked. Look for a key on the stockroom workbench.",
          );
          break;
        }
        if (!G.flags.strangeReceipt) {
          openModal(
            "ARCHIVED RECORDS",
            "Carbon copies.",
            `<p>A bundle of receipts is tied with string. One is dated 17 April 1980. You leave the brittle pages together for now.</p>`,
          );
          break;
        }
        G.flags.original = true;
        journal(
          "Aki’s original receipt",
          "17 April 1980. Vehicle KU 17-04. Attendant Aki Fujimoto. On the back: “Do not complete it. Reprint the original. Cancel the sale. Isolate the pump.”",
        );
        openModal(
          "ORIGINAL CARBON / 1980",
          "Aki Fujimoto.",
          `<blockquote>17 APRIL 1980<br>PUMP 04 · KU 17-04<br>ATTENDANT: AKI FUJIMOTO<br>STATUS: UNFINISHED</blockquote><p>Aki wrote on the reverse:</p><blockquote>Do not complete it.<br>Reprint the original.<br>Cancel the sale.<br>Isolate the pump.</blockquote><p>Someone has repeatedly tried to scrape her name from the paper.</p>`,
          [["Keep the original", checkEvidence]],
        );
        break;
      case "photo":
        openModal(
          "OFFICE PHOTOGRAPH",
          "Summer, 1980.",
          `<p>The staff stand beneath a newly painted canopy. The old road passes behind the station.</p><p>A fold conceals the attendant standing beside Pump Four. Her name on the back is <b>Aki Fujimoto</b>.</p><p>The young man beside her is Kuroda.</p>`,
        );
        journal(
          "The folded photograph",
          "Kuroda worked here with Aki in 1980. The old road passed behind the building.",
        );
        break;
      case "key":
        G.flags.key = true;
        o.mesh.setEnabled(false);
        o.enabled = false;
        audio.play("switch");
        toast("Desk key acquired.");
        break;
      case "fuse":
        G.flags.fuse = true;
        o.mesh.setEnabled(false);
        o.enabled = false;
        audio.play("switch");
        toast("Spare fuse acquired.");
        break;
      case "firstaid":
        if (G.flags.medkitTaken) {
          toast("The first-aid box is empty.");
          break;
        }
        G.flags.medkit = true;
        G.flags.medkitTaken = true;
        toast("First-aid supplies acquired · H to treat injuries.");
        break;
      case "report":
        G.flags.report = true;
        journal(
          "Emergency report: the flood",
          "Aki sheltered stranded travelers. The vehicle at Pump Four had already been recovered from the flooded road. Kuroda left through the rear door and locked it behind him. The transaction was omitted from the official account.",
        );
        openModal(
          "EMERGENCY REPORT / FILE 04",
          "The road was already closed.",
          `<p><b>17 April 1980, 00:52:</b> cream sedan recovered from the flooded mountain road. No surviving occupants.</p><p><b>01:06:</b> the same registration appears on a fuel receipt at Kurose Service.</p><p>Aki sheltered travelers inside. Assistant manager Kuroda exited through the service door. The door was found locked from outside.</p><p>“Flood accident.” The receipt was omitted from the report.</p>`,
          [["Keep a copy", checkEvidence]],
        );
        break;
      case "latch":
        G.flags.latchFixed = true;
        audio.play("switch");
        toast("Rear latch secured. The door will stay closed.");
        journal(
          "Rear latch repaired",
          "You tightened the service-door latch. This can give you a place to shelter.",
        );
        break;
      case "trash":
        audio.noise(0.4, 0.03, 800);
        if (!G.flags.trashDone) {
          G.flags.trashDone = true;
          toast("Rubbish cleared. Something scrapes inside the drain.");
          later(2, () => audio.play("knock"));
        } else toast("The rear road ends at a sealed drainage channel.");
        break;
      case "breaker":
        if (G.phase === "finale" && G.flags.saleCancelled) {
          audio.play("switch");
          finish("complete");
        } else if (G.phase === "siege") {
          if (!G.flags.fuse) {
            toast(
              "The backup fuse is blown. A spare is on the stockroom workbench.",
            );
            break;
          }
          if (!G.flags.powerRestored) {
            G.flags.powerRestored = true;
            G.flags.fuse = false;
            W.setPower(true);
            W.frontDoor.locked = true;
            audio.play("switch");
            objective(
              "Reprint Aki’s original at the cash register.",
              "Return through the stockroom. Avoid the breached storefront.",
            );
            say("NAO", "Backup power. Now the original receipt.");
          } else
            toast(
              "Backup power restored. The final isolation switch is still interlocked with the transaction.",
            );
        } else
          openModal(
            "MAINTENANCE DISCONNECT",
            "Pump Four is isolated.",
            `<p>The feed to Pump Four was disconnected in 1980. Its meter should not be receiving power.</p><p>A diagram labels the upper circuit <b>REGISTER BACKUP</b> and the lower lever <b>PUMP ISOLATION</b>.</p>`,
          );
        break;
      case "receipt":
        if (G.flags.strangeReceipt)
          openModal(
            "RECEIPT 0004",
            "Attendant required.",
            `<blockquote>17 APRIL 1980<br>KU 17-04 · PUMP 04<br>ATTENDANT REQUIRED</blockquote><p>The original may still be in the office records.</p>`,
          );
        else toast("Only ordinary transactions. So far.");
        break;
      case "pump":
        if (o.data.number === 4) {
          journal(
            "Disconnected pump",
            "The maintenance tape is old. The electrical feed was isolated in 1980. The pump should be dead.",
          );
          openModal(
            "PUMP FOUR",
            "Out of service.",
            `<p>The nozzle is dry. The hose is cold.</p><p>Maintenance tape crosses the cabinet. An old label reads: <b>ISOLATED — 17 APRIL 1980</b>.</p>${G.phase === "shibata" ? "<p>Behind you, a car door opens.</p>" : ""}`,
          );
          if (G.phase === "shibata") {
            audio.play("scare");
            later(1, () =>
              hurt(22, "Do not approach the open car. Check the CCTV inside."),
            );
          }
        } else
          toast(
            "Pump " +
              o.data.number +
              " · regular unleaded · authorize at checkout.",
          );
        break;
      case "car":
        if (o.data.id === "ryo") {
          G.flags.ryoChecked = true;
          journal(
            "Ryo’s story checks out",
            "Fresh impact damage and glass on the driver’s seat explain his injury. His account matches the road camera.",
          );
          openModal(
            "RYO’S PICKUP",
            "A broken side window.",
            `<p>Fresh glass is scattered across the seat. A long scrape runs along the door. The injury matches his story.</p><p>He seems frightened, not threatening. You can help him at the register.</p>`,
          );
        } else if (o.data.id === "mimic") {
          journal(
            "The empty van",
            "The van has the same plate as Daichi’s, but the cargo compartment is entirely empty.",
          );
          toast(
            "No parcels. Not even the stacked delivery crates from earlier.",
          );
        } else if (o.data.id === "shibata") {
          audio.play("scare");
          hurt(30, "Something moves behind the fogged glass. Get back inside.");
        } else
          toast(people[o.data.id].name + "’s vehicle · " + o.data.car.plate);
        break;
      case "vending":
        audio.play("switch");
        toast(
          "The vending machine hums. A can shifts inside, although you inserted no money.",
        );
        break;
      case "npc": {
        const n = o.data.npc;
        if (n === G.emi && G.flags.emiSaved) {
          if (["siege", "finale"].includes(G.phase)) {
            openModal(
              "EMI TANABE",
              "We could leave.",
              `<p>“My taxi is still outside. We can get to the road through the side of the forecourt.”</p><p>Leaving now would abandon Aki’s unfinished transaction.</p>`,
              [
                ["Stay and finish this", () => {}],
                ["Escape with Emi", () => finish("escape")],
              ],
            );
          } else say("EMI", "I can hear someone at the front window.");
        } else if (n.threat) {
          hurt(24, "Stay away from the Passenger.");
        } else if (n.customer?.state === "waiting") {
          dialogue(n,[[n.name,customerPerson(n.customer).line]]);
          updateOrder();
        } else if(n.customer && ['browsing','walking','queued','approaching'].includes(n.customer.state)) {
          const c=n.customer,product=W.products.find(p=>p.id===c.browseSection);
          dialogue(n,[[n.name,c.state==='browsing'?'Just looking at '+(product?.name.toLowerCase()||'these shelves')+'. No hurry. Is it your first night here?':'I’ll be with you in a moment.'],['NAO','It is. Let me know if you need anything.'],[n.name,c.id==='hasegawa'?'Keep the lights on. This road gets lonely after midnight.':'Thank you. I’m taking a little break from the road.']]);
        } else dialogue(n,[[n.name,'Evening. Weather looks like it is turning.']]);
        break;
      }
    }
  }
  // Navigation is shared with the customers and lives in the world module, so
  // a route the shoppers can walk is a route the Passenger can walk.
  const findPath = (start, goal) => W.findPath(start, goal);
  function canSee(from, to) {
    const dx = to.x - from.x,
      dz = to.z - from.z,
      len = Math.hypot(dx, dz);
    for (let t = 0.3; t < len - 0.35; t += 0.22) {
      const x = from.x + (dx * t) / len,
        z = from.z + (dz * t) / len;
      for (const c of W.colliders) {
        if (!c.enabled || c.car || c.transparent) continue;
        if (c.mesh && c.mesh.getBoundingInfo().boundingBox.maximumWorld.y < 1.4)
          continue;
        if (
          x > c.x - c.hx &&
          x < c.x + c.hx &&
          z > c.z - c.hz &&
          z < c.z + c.hz
        )
          return false;
      }
    }
    return true;
  }
  function updateThreat(dt) {
    const n = G.threat;
    if (!n || !n.active) return;
    if (n.stunned > 0) {
      n.stunned -= dt;
      n.walking = false;
      return;
    }
    const pos = n.root.position,
      p = G.player;
    const distance = Math.hypot(p.x - pos.x, p.z - pos.z);
    const sees = canSee(pos, p);
    if (sees && distance < 19) n.lastKnown = { x: p.x, z: p.z };
    if (G.moving && distance < (G.sprinting ? 14 : 7))
      n.lastKnown = { x: p.x, z: p.z };
    G.navTimer -= dt;
    if (G.navTimer <= 0) {
      G.navTimer = 0.8;
      const target = n.lastKnown || {
        x: W.spots.counter[0],
        z: W.spots.counter[1],
      };
      // Doors count as doorways for the planner, so there is no hiding place
      // it simply cannot reach; shutting and locking one is what buys time.
      const path = findPath(pos, target);
      if (path.length) n.route(path);
      else {
        n.walking = false;
        if (distance < 2 && sees) n.route([[p.x, p.z]]);
      }
      if (
        !G.flags.latchFixed &&
        G.phase === "siege" &&
        W.rearDoor.target === 0 &&
        distance > 4 &&
        Math.hypot(pos.x - W.rearDoor.x, pos.z - W.rearDoor.z) < 2
      ) {
        W.rearDoor.target = 1;
        audio.play("knock");
      }
    }
    if (distance < 1.15 && sees)
      hurt(
        30,
        "The Passenger is too close. Use the alarm, a flare, or a door.",
      );
  }
  function pick() {
    G.interact = null;
    show("prompt", false);
    $("crosshair").classList.remove("active");
    if (G.modal || G.cctv || G.mode !== "playing") return;
    if (W.prologue?.stage === "driving") return; // hands on the wheel
    const ray = camera.getForwardRay(3.5);
    let best = null;
    for (const o of W.interactions) {
      if (!o.enabled || !o.mesh.isEnabled() || !o.mesh.isPickable) continue;
      const hit = ray.intersectsMesh(o.mesh, false);
      if (!hit.hit || hit.distance > o.radius || hit.distance < 0.04) continue;
      if (best && best.hit.distance < hit.distance) continue;
      best = { o, hit };
    }
    if (!best) return;
    const d = best.hit.distance;
    for (let t = 0.1; t < d - 0.2; t += 0.13) {
      const pos = ray.origin.add(ray.direction.scale(t));
      for (const c of W.colliders) {
        if (!c.enabled || c.car || c.transparent || c.mesh === best.o.mesh) continue;
        const min = c.mesh
            ? c.mesh.getBoundingInfo().boundingBox.minimumWorld.y
            : 0,
          max = c.mesh
            ? c.mesh.getBoundingInfo().boundingBox.maximumWorld.y
            : 3.3;
        if (pos.y < min || pos.y > max) continue;
        if (
          pos.x > c.x - c.hx &&
          pos.x < c.x + c.hx &&
          pos.z > c.z - c.hz &&
          pos.z < c.z + c.hz
        )
          return;
      }
    }
    G.interact = best.o;
    let text = best.o.label;
    if (best.o.kind === "door")
      text =
        (best.o.data.door.target > 0.5 ? "Close " : "Open ") +
        best.o.id.replace("-door", "") +
        " door";
    if (best.o.id === "scanner" && G.customer?.state === "waiting")
      text =
        G.scan < G.customer.order.length
          ? "Scan " +
            W.products.find((p) => p.id === G.customer.order[G.scan]).name
          : "All items scanned";
    $("prompt").querySelector("span").textContent = text;
    show("prompt");
    $("crosshair").classList.add("active");
  }
  function tryJump() {
    if (G.mode !== "playing" || G.modal || G.cctv || G.jumpY > 0 || G.jumpV) return;
    if (W.prologue?.stage === "driving") return;
    if (G.stamina < 10) { toast("Too winded to jump."); return; }
    G.stamina -= 10;
    G.jumpV = 3.3;
    audio.play("step");
  }
  function updatePlayer(dt) {
    const p = G.player;
    const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
      side = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    let dx = Math.sin(p.yaw) * forward + Math.cos(p.yaw) * side,
      dz = Math.cos(p.yaw) * forward - Math.sin(p.yaw) * side;
    const len = Math.hypot(dx, dz),
      wantSprint = keys.has("ShiftLeft") || keys.has("ShiftRight"),
      sprint = wantSprint && len > 0 && !G.winded && G.stamina > 0;
    G.moving = len > 0;
    G.sprinting = sprint;
    // Stamina: sprinting spends it, everything else slowly buys it back, and
    // running dry means walking until you have genuinely caught your breath.
    if (sprint) G.stamina = Math.max(0, G.stamina - 20 * dt);
    else G.stamina = Math.min(100, G.stamina + 12 * dt);
    if (G.stamina <= 0) G.winded = true;
    if (G.winded && G.stamina >= 30) G.winded = false;
    const staminaBar = $("stamina-bar");
    staminaBar.style.width = G.stamina + "%";
    staminaBar.classList.toggle("winded", G.winded);
    $("health-bar").classList.toggle("low", G.health <= 35);
    // Jumping: a small hop with real gravity on the camera height.
    if (G.jumpV || G.jumpY > 0) {
      G.jumpY += G.jumpV * dt;
      G.jumpV -= 10.5 * dt;
      if (G.jumpY <= 0) {
        G.jumpY = 0;
        G.jumpV = 0;
        audio.play("step");
      }
    }
    if (len) {
      let speed = (sprint ? 3.55 : 2.2) * dt;
      dx = (dx / len) * speed;
      dz = (dz / len) * speed;
      if (!W.isBlocked(p.x + dx, p.z, 0.24)) p.x += dx;
      if (!W.isBlocked(p.x, p.z + dz, 0.24)) p.z += dz;
      G.foot += dt;
      if (G.foot > (sprint ? 0.34 : 0.52)) {
        G.foot = 0;
        audio.play("step");
        if (W.glassUnderfoot(p.x, p.z)) {
          audio.play("gravel");
          hurt(8, "Broken glass underfoot. Use another entrance.");
        }
      }
    }
    // Handheld camcorder: a walking bob plus a slow idle drift that never
    // quite settles, so the frame is never mechanically still.
    const t = G.elapsed,
      moving = G.settings.bob && len;
    const bob = moving ? Math.sin(t * (sprint ? 12.5 : 9.5)) * 0.026 : 0;
    const breathe = G.settings.bob ? Math.sin(t * 1.15) * 0.006 : 0;
    const swayX = G.settings.bob
      ? (moving ? Math.sin(t * (sprint ? 6.2 : 4.7)) * 0.011 : Math.sin(t * 0.73) * 0.005)
      : 0;
    const swayY = G.settings.bob
      ? (moving ? Math.sin(t * (sprint ? 12.5 : 9.5) + 1.6) * 0.007 : Math.cos(t * 0.61) * 0.004)
      : 0;
    const roll = G.settings.bob
      ? (moving ? Math.sin(t * (sprint ? 6.2 : 4.7) + 0.4) * 0.018 : Math.sin(t * 0.52) * 0.008)
      : 0;
    // Match the visible floor, half step and cashier platform underfoot.
    camera.position.set(p.x, EYE + W.floorElevation(p.x, p.z) + G.jumpY + bob + breathe, p.z);
    camera.rotation.set(p.pitch + swayY, p.yaw + swayX, roll);
    W.torch.position.copyFrom(camera.position);
    W.torch.direction.copyFrom(camera.getForwardRay().direction);
    W.torch.intensity = G.torch ? 2.9 : 0;
    if(W.heldRoot){W.heldRoot.position.y=-.55+(G.settings.bob&&len?Math.sin(G.elapsed*8)*.012:0);}

  }
  function start() {
    G.mode = "playing";
    G.started = true;
    G.elapsed = 0;
    G.health = 100;
    audio.start();
    audio.setVolume(G.settings.volume);
    show("menu", false);
    show("hud");
    scene.activeCamera = camera;
    const api={G,phase,objective,say,toast,openModal,dialogue,focus:focusCharacter,audio,
      camera:()=>camera,teleport:(x,z,yaw=0,pitch=0)=>{Object.assign(G.player,{x,z,yaw,pitch});updatePlayer(0);},night:beginNight};
    if(new URLSearchParams(location.search).has('debug')&&new URLSearchParams(location.search).has('skipIntro'))beginNight();
    else W.prologue.start(api);
    capture();updatePlayer(0);
  }
  function beginNight() {
    W.prologue.skip();
    Object.assign(G.player,{x:7.6,z:2.9,yaw:-Math.PI/2,pitch:.1});
    G.events=[];G.elapsed=0;
    phase("handover");
    objective(
      "Clock in at the office.",
      "Walk to the stockroom door at the back. The office is inside, through the interior staff door. Read the note on the desk.",
    );
    say(
      "KURODA / MEMORY",
      "Pump Four is disconnected. Leave the carbon copies in the register.",
      9,
    );
    capture();
    updatePlayer(0);
  }
  function init() {
    try {
      engine = new B.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        powerPreference: "high-performance",
      });
      // A slightly soft internal resolution reads like tape rather than glass.
      engine.setHardwareScalingLevel(1.35);
      W = createNightWorld(engine);
      W.onThunder=()=>{audio.noise(3,.1,180);audio.tone(38,2.8,.06,'sine',22);};
      scene = W.scene;
      camera = new B.UniversalCamera("attendant", new V(-5.4, EYE, 9.6), scene);
      camera.inputs.clear();
      camera.minZ = 0.07;
      camera.maxZ = 150;
      camera.fov = BASE_FOV;
      securityCamera = new B.FreeCamera(
        "security",
        new V(-8.4, 3.4, 6.4),
        scene,
      );
      securityCamera.setTarget(new V(5.5, 1.2, 16));
      securityCamera.fov = 1.05;
      // Only the security cameras are allowed to see the tape-only layer.
      securityCamera.layerMask = W.cameraMask;
      securityCamera.minZ = 0.1;
      const titleCamera = new B.FreeCamera(
        "title camera",
        new V(21, 7.4, 30),
        scene,
      );
      titleCamera.setTarget(new V(-1.5, 2.1, 9));
      titleCamera.fov = 0.98;
      scene.activeCamera = titleCamera;
      W.torch = new B.SpotLight(
        "attendant flashlight",
        camera.position,
        new V(0, 0, 1),
        0.8,
        7,
        scene,
      );
      W.torch.diffuse = new B.Color3(0.95, 0.96, 0.77);
      W.torch.range = 21;
      W.torch.intensity = 0;
      W.torch.renderPriority = 100;
      // A real render texture supplies the in-world security screen.
      const rtt = new B.RenderTargetTexture(
        "CCTV feed",
        { width: 256, height: 192 },
        scene,
        false,
      );
      rtt.activeCamera = securityCamera;
      rtt.renderList = scene.meshes.filter(
        (m) =>
          m !== W.monitorScreen &&
          (m.position.z > 5 || m.layerMask === W.CAMERA_LAYER),
      );
      rtt.refreshRate = 6;
      scene.customRenderTargets.push(rtt);
      const screenMat = new B.StandardMaterial("live CCTV phosphor", scene);
      screenMat.diffuseColor = B.Color3.Black();
      screenMat.emissiveTexture = rtt;
      screenMat.emissiveColor = new B.Color3(0.54, 0.75, 0.55);
      screenMat.disableLighting = true;
      W.monitorScreen.material = screenMat;
      W.rtt = rtt;
      W.onDoor = () => {
        if (G.mode === "playing") audio.play("door");
      };
      if (window.NightLook)
        G.look = window.NightLook.install(scene, engine, [camera, titleCamera]);
      show("camcorder", true);
      try{G.settings.fps=localStorage.getItem('nightShift.fps')==='true';}catch{}
      show('fps-counter',G.settings.fps);
      $("start").onclick = start;
      $("settings-menu").onclick = settings;
      $("restart").onclick = () => location.reload();
      $("close-cctv").onclick = closeCamera;
      document.addEventListener("keydown", (e) => {
        if (["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code))
          e.preventDefault();
        if (e.repeat) return;
        if(G.modal && $('modal').classList.contains('conversation') && (e.code==='KeyE'||e.code==='Space'||/^Digit[1-9]$/.test(e.code))) {
          e.preventDefault();const buttons=$('modal-buttons').querySelectorAll('button');buttons[e.code.startsWith('Digit')?Number(e.code.slice(-1))-1:0]?.click();return;
        }
        keys.add(e.code);
        if (e.code === "Escape") {
          if (G.cctv) closeCamera();
          else if (G.modal) {
            if (G.mode === "playing") {
              const done = G.modalDismiss;
              closeModal();
              if (done) done();
              audio.pause(false);
            }
          } else pause();
          return;
        }
        if (G.mode !== "playing") return;
        if (G.cctv) {
          if (e.code === "KeyE") closeCamera();
          else if (e.code === "KeyD" || e.code === "ArrowRight") setCam(G.cam + 1);
          else if (e.code === "KeyA" || e.code === "ArrowLeft") setCam(G.cam - 1);
          else if (/^Digit[1-4]$/.test(e.code)) setCam(+e.code.slice(5) - 1);
          return;
        }
        if (G.modal) return;
        if (e.code === "KeyE") interact(G.interact);
        if (e.code === "Space") tryJump();
        if (e.code === "KeyG") dropCarry();
        if (e.code === "KeyF") {
          G.torch = !G.torch;
          audio.play("switch");
          toast("Flashlight " + (G.torch ? "on" : "off"));
        }
        if (e.code === "Tab") journalView();
        if (e.code === "KeyH") {
          if (G.flags.medkit && G.health < 100) {
            G.flags.medkit = false;
            G.health = Math.min(100, G.health + 55);
            $("health-bar").style.width = G.health + "%";
            toast("Injuries treated.");
          } else
            toast(
              G.flags.medkit
                ? "You are not injured."
                : "No first-aid supplies. Look in the office.",
            );
        }
        if (e.code === "KeyR") {
          if (G.flags.flare && G.threat) {
            G.flags.flare = false;
            G.threat.stunned = 10;
            audio.noise(2, 0.06, 2600);
            toast("Flare burning. The Passenger recoils for ten seconds.");
          } else
            toast(
              G.flags.flare
                ? "Save the flare for an attack."
                : "No road flare.",
            );
        }
      });
      document.addEventListener("keyup", (e) => keys.delete(e.code));
      window.addEventListener("blur", () => {
        keys.clear();
        if (G.mode === "playing" && !G.modal && !G.cctv) pause();
      });
      document.addEventListener("mousemove", (e) => {
        if (G.mode !== "playing" || G.modal || G.cctv) return;
        if (document.pointerLockElement === canvas) {
          G.player.yaw += e.movementX * 0.0019 * G.settings.sensitivity;
          G.player.pitch = Math.max(
            -1.35,
            Math.min(
              1.35,
              G.player.pitch + e.movementY * 0.0019 * G.settings.sensitivity,
            ),
          );
        }
      });
      canvas.addEventListener("click", capture);
      document.addEventListener("pointerlockchange", () => {
        const lock = document.pointerLockElement === canvas;
        const released = G.hadPointerLock && !lock;
        const intentional = !lock && G.expectedUnlock;
        if (!lock) G.expectedUnlock = false;
        G.hadPointerLock = lock;
        if (released) keys.clear();
        if (released && !intentional && G.mode === "playing" && !G.modal && !G.cctv) pause();
        if (intentional && G.mode === "playing" && !G.modal && !G.cctv) setTimeout(capture, 0);
        show("lock-hint", G.mode === "playing" && !G.modal && !G.cctv && !lock);
      });
      window.addEventListener("resize", () => engine.resize());
      scene.executeWhenReady(() => {
        show("loading", false);
        show("menu");
      });
      engine.runRenderLoop(() => {
        const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
        if (G.mode === "menu") {
          const t = performance.now() * 0.00005;
          titleCamera.position.set(
            23 + Math.sin(t) * 1.2,
            7.1,
            28 + Math.cos(t) * 0.6,
          );
          titleCamera.setTarget(new V(-1.5, 2.1, 9));
          W.update(dt, null);
        }
        if (G.mode === "playing" && !G.modal) {
          G.elapsed += dt;
          G.grace = Math.max(0, G.grace - dt);
          const ready = G.events.filter((e) => e.at <= G.elapsed);
          G.events = G.events.filter((e) => e.at > G.elapsed);
          for (const e of ready) if (e.serial === G.serial) e.fn();
          if (!G.cctv) {
            if(W.prologue.stage!=='driving')updatePlayer(dt);
            W.prologue.update(dt);
            updateThreat(dt);
            pick();
          }
          W.update(dt, G.player);
          updateTraffic();
          updateChores();
          audio.update(
            G.player.z < 5.2 && G.player.z > -9.1 && Math.abs(G.player.x) < 7,
            W.power,
            !!G.threat,
          );
          audio.engine(
            W.cars.some(
              (c) =>
                c.moving &&
                c.root.isEnabled() &&
                Math.abs(c.root.position.x) < 28,
            ),
          );
          if (G.flags.phoneRinging) {
            G.phoneTimer -= dt;
            if (G.phoneTimer <= 0) {
              audio.play("phone");
              G.phoneTimer = 3.5;
            }
          }
          if (G.subtitleUntil && G.elapsed > G.subtitleUntil)
            show("subtitle", false);
          document.body.classList.toggle('speaking',!$('subtitle').classList.contains('hidden'));
          $('objective').classList.toggle('quiet',G.elapsed>G.objectiveUntil);
          $('checkout').classList.toggle('distant',Math.hypot(G.player.x-7.6,G.player.z-3.2)>3.2);
          if (G.toastUntil && G.elapsed > G.toastUntil) show("toast", false);
          if (W.rtt)
            W.rtt.renderList = scene.meshes.filter(
              (m) =>
                m !== W.monitorScreen &&
                m.isEnabled() &&
                (m.getAbsolutePosition().z > 5 ||
                  m.layerMask === W.CAMERA_LAYER),
            );
        }
        if (G.modal) W.updateFridges(dt);
        if(G.focus) {
          const p=G.focus.root.position,target=new V(p.x,p.y+1.67,p.z),d=target.subtract(camera.position);
          const yaw=Math.atan2(d.x,d.z),pitch=-Math.atan2(d.y,Math.hypot(d.x,d.z));
          camera.rotation.y+=Math.atan2(Math.sin(yaw-camera.rotation.y),Math.cos(yaw-camera.rotation.y))*Math.min(1,dt*5);
          camera.rotation.x=B.Scalar.Lerp(camera.rotation.x,pitch,Math.min(1,dt*5));
          camera.fov=B.Scalar.Lerp(camera.fov,TALK_FOV,Math.min(1,dt*3));
        } else if (camera && camera.fov !== BASE_FOV) {
          camera.fov = B.Scalar.Lerp(camera.fov, BASE_FOV, Math.min(1, dt * 3));
          if (Math.abs(camera.fov - BASE_FOV) < 0.002) camera.fov = BASE_FOV;
        }
        if (G.look) {
          G.look.update(dt, G.threat ? 1 : G.phase === "siege" ? 0.45 : 0);
          if (performance.now() - (G.lastTape || 0) > 250) {
            G.lastTape = performance.now();
            const total = 3906 + Math.floor(G.elapsed);
            const hh = String(Math.floor(total / 3600)).padStart(2, "0"),
              mm = String(Math.floor(total / 60) % 60).padStart(2, "0"),
              ss = String(total % 60).padStart(2, "0");
            $("cc-time").textContent = hh + ":" + mm + ":" + ss;
          }
        }
        if(G.settings.fps && performance.now()-(G.lastFpsUpdate||0)>500){
          const fps=engine.getFps();$('fps-counter').textContent=Math.round(fps)+' FPS · '+(fps>0?1000/fps:0).toFixed(1)+' ms';G.lastFpsUpdate=performance.now();
        }
        scene.render();
      });
      if (new URLSearchParams(location.search).has("debug"))
        window.__nightShift = {
          G,
          W,
          engine,
          scene,
          start,
          beginNight,
          dialogue,
          interact: (id) => interact(W.interactions.find((o) => o.id === id)),
          summon,
          spawnWalkIn,
          spawnKatagiri,
          setCam,
          startChore,
          tryJump,
          updatePlayer,
          keys,
          advanceQueue,
          phase,
          beginSiege,
          beginRescue,
          spawnThreat,
          findPath,
          canSee,
          restoreCheckpoint,
          finalRegister,
          finish,
          tick(seconds) {
            let n = Math.ceil(seconds / 0.05);
            for (let i = 0; i < n; i++) {
              G.elapsed += 0.05;
              const ready = G.events.filter((e) => e.at <= G.elapsed);
              G.events = G.events.filter((e) => e.at > G.elapsed);
              ready.forEach((e) => {
                if (e.serial === G.serial) e.fn();
              });
              W.update(0.05, G.player);
              updateTraffic();
          updateChores();
            }
          },
          teleport(x, z, yaw = 0, pitch = 0) {
            Object.assign(G.player, { x, z, yaw, pitch });
            updatePlayer(0);
          },
          closeModal,
          closeCamera,
          updateOrder,
          dropCarry,
          takeCarry,
          checkEvidence,
          completeSale,
          alarm,
          getCamera: () => camera,
          pick,
        };
    } catch (e) {
      console.error(e);
      $("load-status").textContent =
        "Unable to start: " +
        e.message +
        ". A desktop browser with WebGL is required.";
    }
  }
  init();
})();
