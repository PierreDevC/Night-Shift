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
  // ---------------------------------------------------------------------
  // Shared context. Systems are classes in src/core and src/systems; they
  // receive this object at construction and register their public verbs in
  // ctx.fn. The Proxy makes the verb table late-bound, so systems can hold a
  // reference to a verb before its owner has been constructed.
  // ---------------------------------------------------------------------
  const FZ = {};
  const ctx = {
    $, B, V, canvas, keys, audio, G, EYE,
    bus: new NS.EventBus(),
    fn: new Proxy(FZ, {
      get(t, k) {
        if (k in t || typeof k !== "string") return t[k];
        return (...a) => {
          const f = t[k];
          if (!f) throw new Error("fn." + k + " is not registered");
          return f(...a);
        };
      },
    }),
  };
  // Bridge variables: the bootstrap's own listeners, render loop and debug
  // facade keep calling these by name; they are bound after construction.
  let show,
    toast,
    say,
    journal,
    objective,
    openModal,
    closeModal,
    focusCharacter,
    dialogue,
    held,
    updateOrder,
    journalView,
    settings,
    pause,
    hurt,
    die,
    restoreCheckpoint,
    takeCarry,
    dropCarry,
    tryJump,
    updatePlayer,
    queueCustomer,
    advanceQueue,
    updateTraffic,
    spawnKatagiri,
    spawnWalkIn,
    arriveCustomer,
    customerSpot,
    placeCustomerItems,
    browseCustomer,
    customerAtCounter,
    summon,
    interactCar,
    dismiss,
    total,
    checkout,
    completeSale,
    startChore,
    choreDone,
    updateChores,
    spawnThreat,
    updateThreat,
    canSee,
    watcherStage,
    updateWatcher,
    aimCam,
    setCam,
    cctvCaption,
    cameraView,
    closeCamera,
    phase,
    startIntruder,
    alarm,
    checkEvidence,
    beginRescue,
    rescueEmi,
    beginSiege,
    startSiegeThreat,
    finalRegister,
    finish,
    beginNight,
    interact,
    pick,
    customerPerson,
    findPath;
  // Walking field of view, and the tighter one a conversation pulls in to.
  const BASE_FOV = 1.02, TALK_FOV = 0.74;
  const orders = {
    emi: ["coffee", "rice"],
    daichi: ["noodles", "energy", "gum"],
    hasegawa: ["batteries", "bread", "catfood"],
    ryo: ["water", "tissues"],
    shibata: ["water", "mints"],
    mimic: ["noodles", "energy", "gum"],
  };
  ctx.orders = orders;
  function later(seconds, fn) {
    G.events.push({ at: G.elapsed + seconds, fn, serial: G.serial });
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
  Object.assign(FZ, { later, release, capture });


  // One till, several independently arriving shoppers. Narrative customers
  // retain their identity even when a walk-in is currently being served.
  // -----------------------------------------------------------------------
  // Chores. A petrol station at night is mostly maintenance with customers in
  // between, so the quiet gaps hand out small real jobs: mop what the rain
  // tracked in, refill a shelf from the stockroom, take the counter bag out
  // to the yard. Each one uses the same carry/walk machinery as the story and
  // the trash run walks the player through the rear door on purpose.
  // -----------------------------------------------------------------------
  // Gondola lines only: drinks live in the coolers and have no shelf row.
  // Mr. Katagiri visits the shop exactly once, in person, early in the night.
  // Every appearance after that is on the cameras only. He is deliberately an
  // unremarkable transaction: the player has no reason to remember him until
  // the tape starts insisting on him.
  // Shoppers walk the aisles on the shared navigation grid, so they stop in
  // front of a fixture instead of standing inside it.
  // Where the tape says Katagiri is standing right now. One stage per band of
  // the night, each on a different camera, each a step closer to the player:
  // road edge, then the aisles, then the stockroom. He is never in the room.
  // What the selected camera has to say right now. Story moments override the
  // idle line; they are all tied to specific cameras, which is what makes
  // flipping through the bank an act of looking rather than a menu.
  // Navigation is shared with the customers and lives in the world module, so
  // a route the shoppers can walk is a route the Passenger can walk.
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
      // World and cameras exist: construct the systems in dependency order.
      Object.assign(ctx, { engine, W, scene, camera, securityCamera });
      const systems = [
        new NS.Hud(ctx),
        new NS.PlayerSystem(ctx),
        new NS.CustomerSystem(ctx),
        new NS.ChoreSystem(ctx),
        new NS.ThreatSystem(ctx),
        new NS.StorySystem(ctx),
        new NS.SecuritySystem(ctx),
      ];
      ctx.interactions = new NS.InteractionSystem(ctx);
      // Every system claims the interaction kinds it owns.
      for (const sys of systems) sys.registerInteractions(ctx.interactions.reg);
      // Systems that tick do so through the shared contract, in construction
      // order. The loop no longer names them one by one.
      ctx.systems = systems;
      const tickSystems = (dt, inCctv) => {
        for (const sys of systems) {
          if (inCctv && sys.pausedInCctv !== false) continue;
          sys.update(dt);
        }
      };
      ({ show, toast, say, journal, objective, openModal, closeModal, focusCharacter, dialogue, held, updateOrder, journalView, settings, pause, hurt, die, restoreCheckpoint, takeCarry, dropCarry, tryJump, updatePlayer, queueCustomer, advanceQueue, updateTraffic, spawnKatagiri, spawnWalkIn, arriveCustomer, customerSpot, placeCustomerItems, browseCustomer, customerAtCounter, summon, interactCar, dismiss, total, checkout, completeSale, startChore, choreDone, updateChores, spawnThreat, updateThreat, canSee, watcherStage, updateWatcher, aimCam, setCam, cctvCaption, cameraView, closeCamera, phase, startIntruder, alarm, checkEvidence, beginRescue, rescueEmi, beginSiege, startSiegeThreat, finalRegister, finish, beginNight, interact, pick, customerPerson, findPath } = FZ);
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
            W.prologue.update(dt);
            pick();
          }
          W.update(dt, G.player);
          tickSystems(dt, G.cctv);
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
              for (const sys of ctx.systems) if (sys.pausedInCctv === false) sys.update(0.05);
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
