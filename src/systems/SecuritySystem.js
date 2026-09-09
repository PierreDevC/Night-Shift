/* The four-camera security bank, and Katagiri as the tape sees him. */
window.NS = window.NS || {};
NS.SecuritySystem = class SecuritySystem extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus, phases } = ctx;
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
    spawnThreat,
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
    findPath,
    canSee,
    updatePlayer,
    updateThreat,
    updateChores,
    updateTraffic,
    alarm,
    beginNight,
    journalView,
    settings,
    pause,
  } = F;
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
  this.registerFns({ watcherStage, updateWatcher, aimCam, setCam, cctvCaption, cameraView, closeCamera });
  this.registerInteractions = (reg) => {
    reg("cctv", (o) => { do {

        cameraView();
        break;
    } while (0); });
  };


  }
};
