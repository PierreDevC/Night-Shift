/* The attendant: movement, stamina, jumping, injury, death and checkpoint
   restore, plus what their hands are carrying. */
window.NS = window.NS || {};
NS.PlayerSystem = class PlayerSystem extends NS.System {
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
    total,
    dismiss,
    summon,
    advanceQueue,
    queueCustomer,
    spawnKatagiri,
    spawnWalkIn,
    spawnThreat,
    startIntruder,
    checkEvidence,
    beginRescue,
    rescueEmi,
    beginSiege,
    startSiegeThreat,
    finalRegister,
    finish,
    startChore,
    choreDone,
    setCam,
    cameraView,
    closeCamera,
    interact,
    pick,
    customerPerson,
    browseCustomer,
    customerAtCounter,
    arriveCustomer,
    placeCustomerItems,
    customerSpot,
    interactCar,
    completeSale,
    checkout,
    findPath,
    canSee,
    updateWatcher,
    cctvCaption,
    aimCam,
    watcherStage,
    updateThreat,
    updateChores,
    updateTraffic,
    alarm,
    beginNight,
    journalView,
    settings,
    pause,
  } = F;

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
      else if (!W.isBlocked(p.x + dx * 0.45, p.z, 0.24)) p.x += dx * 0.45;
      if (!W.isBlocked(p.x, p.z + dz, 0.24)) p.z += dz;
      else if (!W.isBlocked(p.x, p.z + dz * 0.45, 0.24)) p.z += dz * 0.45;
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
    // Match the visible floor, half step and cashier platform underfoot with smooth step transition.
    const targetFloorY = EYE + W.floorElevation(p.x, p.z);
    G.smoothedFloorY = (G.smoothedFloorY === undefined || !dt) ? targetFloorY : B.Scalar.Lerp(G.smoothedFloorY, targetFloorY, Math.min(1, dt * 14));
    camera.position.set(p.x, G.smoothedFloorY + G.jumpY + bob + breathe, p.z);
    camera.rotation.set(p.pitch + swayY, p.yaw + swayX, roll);
    W.torch.position.copyFrom(camera.position);
    W.torch.direction.copyFrom(camera.getForwardRay().direction);
    W.torch.intensity = G.torch ? 2.9 : 0;
    if(W.heldRoot){W.heldRoot.position.y=-.55+(G.settings.bob&&len?Math.sin(G.elapsed*8)*.012:0);}

  }
  this.registerFns({ hurt, die, restoreCheckpoint, takeCarry, dropCarry, tryJump, updatePlayer });
  this.update = (dt) => {
    // The prologue drive owns the camera while it runs.
    if (W.prologue?.stage !== "driving") updatePlayer(dt);
  };


  }
};
