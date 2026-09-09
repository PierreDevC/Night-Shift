/* The night itself: phases, the intruder, the rescue, the siege, the
   alarm consequences and the endings. */
window.NS = window.NS || {};
NS.StorySystem = class StorySystem extends NS.System {
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
    journalView,
    settings,
    pause,
  } = F;
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
  ctx.phases = phases;

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
  this.registerFns({ phase, startIntruder, alarm, checkEvidence, beginRescue, rescueEmi, beginSiege, startSiegeThreat, finalRegister, finish, beginNight });
  this.registerInteractions = (reg) => {
    reg("timeclock", (o) => { do {

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
    } while (0); });
    reg("note", (o) => { do {

        openModal(
          "STAFF HANDOVER",
          "Before you begin.",
          `<p>Nao — thanks for covering.</p><blockquote>1. Clock in. The machine is on the office wall.<br>2. Coffee delivery is in the stockroom. Fill cooler 01 on the back wall.<br>3. Customers choose their own items. Scan what they bring to the counter.<br>4. For fuel, validate the litres on the employee computer before taking payment.<br>5. Heat noodles if asked.<br>6. Pump Four is disconnected. Cancel it if it lights up.<br>7. Pull the rear door until you hear the latch.<br>8. Leave the carbon copies in the register.</blockquote><p>— Kuroda</p>`,
        );
        break;
    } while (0); });
    reg("carton", (o) => { do {

        if (!G.flags.clocked) {
          toast("Clock in first. The time clock is in the office.");
          break;
        }
        if(G.flags.stocked){toast('The delivery is already stocked.');break;}
        if(!takeCarry('carton',null,'Coffee delivery'))break;
        W.consumeDelivery();
        toast("Carry the carton to the left refrigerator in the shop.");
        break;
    } while (0); });
    reg("restock", (o) => { do {

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
    } while (0); });
    reg("generator", (o) => { do {

        openModal('STANDBY DIESEL / SERVICE LOCK','Emergency generator','<p>Fuel tank: three quarters full. Transfer switch: OFF. A maintenance tag reads: DO NOT START UNDER LOAD.</p><p>This unit is separate from the pump disconnect. Kuroda keeps the service key.</p>');
        break;
    } while (0); });
    reg("phone", (o) => { do {

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
    } while (0); });
    reg("alarm", (o) => { do {

        alarm();
        break;
    } while (0); });
    reg("intercom", (o) => { do {

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
    } while (0); });
    reg("drawer", (o) => { do {

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
    } while (0); });
    reg("photo", (o) => { do {

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
    } while (0); });
    reg("key", (o) => { do {

        G.flags.key = true;
        o.mesh.setEnabled(false);
        o.enabled = false;
        audio.play("switch");
        toast("Desk key acquired.");
        break;
    } while (0); });
    reg("fuse", (o) => { do {

        G.flags.fuse = true;
        o.mesh.setEnabled(false);
        o.enabled = false;
        audio.play("switch");
        toast("Spare fuse acquired.");
        break;
    } while (0); });
    reg("firstaid", (o) => { do {

        if (G.flags.medkitTaken) {
          toast("The first-aid box is empty.");
          break;
        }
        G.flags.medkit = true;
        G.flags.medkitTaken = true;
        toast("First-aid supplies acquired · H to treat injuries.");
        break;
    } while (0); });
    reg("report", (o) => { do {

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
    } while (0); });
    reg("latch", (o) => { do {

        G.flags.latchFixed = true;
        audio.play("switch");
        toast("Rear latch secured. The door will stay closed.");
        journal(
          "Rear latch repaired",
          "You tightened the service-door latch. This can give you a place to shelter.",
        );
        break;
    } while (0); });
    reg("breaker", (o) => { do {

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
    } while (0); });
    reg("receipt", (o) => { do {

        if (G.flags.strangeReceipt)
          openModal(
            "RECEIPT 0004",
            "Attendant required.",
            `<blockquote>17 APRIL 1980<br>KU 17-04 · PUMP 04<br>ATTENDANT REQUIRED</blockquote><p>The original may still be in the office records.</p>`,
          );
        else toast("Only ordinary transactions. So far.");
        break;
    } while (0); });
  };


  }
};
