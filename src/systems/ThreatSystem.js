/* The Passenger: spawning, line of sight, hearing and pursuit. */
window.NS = window.NS || {};
NS.ThreatSystem = class ThreatSystem extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus } = ctx;
  const F = ctx.fn;
  const {
    show,
    toast,
    say,
    later,
    journal,
    objective,
    phase,
    openModal,
    closeModal,
    dialogue,
    focusCharacter,
    held,
    updateOrder,
    capture,
    release,
    hurt,
    die,
    takeCarry,
    dropCarry,
    total,
    dismiss,
    summon,
    advanceQueue,
    queueCustomer,
    spawnKatagiri,
    spawnWalkIn,
    startIntruder,
    checkEvidence,
    beginRescue,
    rescueEmi,
    beginSiege,
    startSiegeThreat,
    finalRegister,
    finish,
    restoreCheckpoint,
    startChore,
    choreDone,
    setCam,
    cameraView,
    closeCamera,
    interact,
    pick,
    tryJump,
    customerPerson,
    browseCustomer,
    customerAtCounter,
    arriveCustomer,
    placeCustomerItems,
    customerSpot,
    interactCar,
    completeSale,
    checkout,
    updateWatcher,
    cctvCaption,
    aimCam,
    watcherStage,
    updatePlayer,
    updateChores,
    updateTraffic,
    alarm,
    beginNight,
    journalView,
    settings,
    pause,
  } = F;
  const findPath = (start, goal) => W.findPath(start, goal);

  function spawnThreat(x, z) {
    const n = W.makeNPC("The Passenger", "#444b40", "#222920");
    n.root.position.set(x, 0.23, z);
    n.threat = true;
    n.speed = 1.8;
    G.threat = n;
    show("danger-label");
    return n;
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
  this.registerFns({ spawnThreat, updateThreat, canSee, findPath });
  this.update = (dt) => updateThreat(dt);


  }
};
