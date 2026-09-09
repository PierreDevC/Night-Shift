/* Aiming and using things: the crosshair raycast, occlusion, and the
   dispatch from interaction kind to owning system. */
window.NS = window.NS || {};
NS.InteractionSystem = class InteractionSystem extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus } = ctx;
  const F = ctx.fn;
  const { ordinaryPhases, people } = ctx;
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
    setCam,
    cameraView,
    closeCamera,
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
    updateWatcher,
    cctvCaption,
    aimCam,
    watcherStage,
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
  // Registry: systems claim interaction kinds with reg(kind, handler).
  // Anything not claimed falls through to the legacy dispatch below, which
  // is being migrated kind by kind into its owning system.
  const handlers = new Map();
  this.reg = (kind, fn) => handlers.set(kind, fn);
  this.handlers = handlers;

  function interact(o) {
    if (!o || G.mode !== "playing" || G.modal || G.cctv) return;
    if(o.kind==='home'){W.prologue.act(o.id);return;}
    if(o.kind==='boss'){W.prologue.talkBoss();return;}
    if (o.data.fridge) W.openFridge(o.data.fridge, 3);
    const handler = handlers.get(o.kind);
    if (handler) handler(o);
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
  this.registerFns({ interact, pick });
  const reg = this.reg;
    reg("door", (o) => { do {
{
        const d = o.data.door;
        if (d.locked) {
          toast("Locked.");
          break;
        }
        d.target = d.target > 0.5 ? 0 : 1;
        audio.play("door");
        break;
      }
    } while (0); });
    reg("vending", (o) => { do {

        audio.play("switch");
        toast(
          "The vending machine hums. Cold cans clink quietly in the night.",
        );
        break;
    } while (0); });
    reg("restroom-toilet", (o) => { do {

        audio.noise(1.8, 0.05, 550);
        toast("Water echoes through the old ceramic pipes.");
        break;
    } while (0); });
    reg("restroom-tap", (o) => { do {

        audio.noise(1.2, 0.035, 1800);
        toast("Cold mountain water splashes into the porcelain basin.");
        break;
    } while (0); });
    reg("public-phone", (o) => { do {

        audio.play("phone");
        toast("You lift the receiver. A cold dial tone hums against your ear.");
        break;
    } while (0); });
    reg("hot-food", (o) => { do {

        audio.play("switch");
        toast("Steamed buns and fried chicken keep warm under the amber halogen lamp.");
        break;
    } while (0); });


  }
};
