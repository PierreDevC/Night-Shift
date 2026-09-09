/* Every piece of DOM the game touches: HUD text, subtitles, toasts, the
   journal, modal dialogs, character conversations, settings and pause. No
   game rules live here; systems tell the Hud what to display. */
window.NS = window.NS || {};
NS.Hud = class Hud extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus } = ctx;
  const F = ctx.fn;
  const {
    later,
    phase,
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
    updateChores,
    updateTraffic,
    alarm,
    beginNight,
  } = F;

  function show(id, on = true) {
    $(id).classList.toggle("hidden", !on);
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
  function journalView() {
    openModal(
      "NAO MORI / SHIFT NOTES",
      "Night log",
      `<p><b>Current task:</b> ${$("objective-text").textContent}</p>${G.journal.map((e) => `<div class="journal-entry"><b>${e.title}</b><p>${e.text}</p></div>`).join("") || "<p>No evidence collected yet.</p>"}<p style="margin-top:16px">Supplies: ${G.flags.medkit ? "first-aid kit" : "no first aid"} · ${G.flags.flare ? "road flare" : "no flare"} · ${G.flags.key ? "desk key" : "no key"} · ${G.flags.fuse ? "spare fuse" : "no fuse"}</p>`,
    );
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
  this.registerFns({ show, toast, say, journal, objective, openModal, closeModal, focusCharacter, dialogue, held, updateOrder, journalView, settings, pause });

  }
};
