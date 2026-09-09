/* Between-customer maintenance: mopping, shelf refills, the trash run. */
window.NS = window.NS || {};
NS.ChoreSystem = class ChoreSystem extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus, ordinaryPhases } = ctx;
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
    findPath,
    canSee,
    updateWatcher,
    cctvCaption,
    aimCam,
    watcherStage,
    updatePlayer,
    updateThreat,
    updateTraffic,
    alarm,
    beginNight,
    journalView,
    settings,
    pause,
  } = F;
  const CHORE_SPILLS = [[-8.6, 3.0], [0, 0.9], [-2.2, -3.9]];
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
  this.registerFns({ startChore, choreDone, updateChores });
  this.pausedInCctv = false;
  this.update = () => updateChores();

  this.registerInteractions = (reg) => {
    reg("mop", (o) => { do {

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
    } while (0); });
    reg("spill", (o) => { do {
{
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
    } while (0); });
    reg("bin-bag", (o) => { do {

        if (!takeCarry("trashbag", null, "Rubbish bag")) break;
        W.binBag.setEnabled(false);
        W.binBagInteraction.enabled = false;
        break;
    } while (0); });
    reg("yard-bin", (o) => { do {

        if (G.carry?.kind === "trashbag") {
          G.carry = null; G.held = null; held();
          if (G.chore?.type === "trash") choreDone("The bag lands in the yard bin. The rain keeps falling.");
          else toast("The bag lands in the yard bin.");
        } else toast("The yard bin smells of rain and old oil.");
        break;
    } while (0); });
    reg("chore-carton", (o) => { do {

        if (!takeCarry("stockbox", null, "Stock carton")) break;
        W.choreBox.setEnabled(false);
        W.choreBoxInteraction.enabled = false;
        break;
    } while (0); });
    reg("chore-shelf", (o) => { do {
{
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
    } while (0); });
    reg("trash", (o) => { do {

        audio.noise(0.4, 0.03, 800);
        if (!G.flags.trashDone) {
          G.flags.trashDone = true;
          toast("Rubbish cleared. Something scrapes inside the drain.");
          later(2, () => audio.play("knock"));
        } else toast("The rear road ends at a sealed drainage channel.");
        break;
    } while (0); });
  };


  }
};
