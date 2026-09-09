/* Everyone who shops: the story regulars, random walk-ins, Mr. Katagiri,
   queueing, browsing, the till flow and payment. */
window.NS = window.NS || {};
NS.CustomerSystem = class CustomerSystem extends NS.System {
  constructor(ctx) {
  super(ctx);
  const { G, W, $, audio, keys, camera, securityCamera, canvas, engine, scene, B, V, EYE, bus, orders } = ctx;
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
    findPath,
    canSee,
    updateWatcher,
    cctvCaption,
    aimCam,
    watcherStage,
    updatePlayer,
    updateThreat,
    updateChores,
    alarm,
    beginNight,
    journalView,
    settings,
    pause,
  } = F;
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
  const ordinaryPhases = new Set(["emi", "daichi", "hasegawa", "ryo"]);
  ctx.ordinaryPhases = ordinaryPhases;
  ctx.people = people;
  const customerPerson = (c) => c.person || people[c.id];

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
  function updateTraffic() {
    if (!G.ambientEnabled || !ordinaryPhases.has(G.phase) || G.pendingStory === "shibata") return;
    if (G.elapsed < G.nextAmbient) return;
    G.nextAmbient = G.elapsed + 75 + G.trafficRandom() * 105;
    if (G.shoppers.filter(c => c.ambient).length < 2) spawnWalkIn();
  }
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
  this.registerFns({ queueCustomer, advanceQueue, updateTraffic, spawnKatagiri, spawnWalkIn, arriveCustomer, customerSpot, placeCustomerItems, browseCustomer, customerAtCounter, summon, interactCar, dismiss, total, checkout, completeSale, customerPerson });
  this.pausedInCctv = false;
  this.update = () => updateTraffic();

  this.registerInteractions = (reg) => {
    reg("product", (o) => { do {
{
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
    } while (0); });
    reg("pickup", (o) => { do {

        if(takeCarry(o.data.carry.kind,o.data.carry.id,o.data.carry.name)){o.enabled=false;o.data.root.dispose();}
        break;
    } while (0); });
    reg("magazine", (o) => { do {

        openModal('ROUTE MAGAZINE / APRIL 1998','The old mountain road.', '<p>A faded road map shows a bridge behind Kurose Service. The current route bends around it.</p><p>A handwritten note marks the old road: CLOSED SINCE 1980.</p>');
        break;
    } while (0); });
    reg("scanner", (o) => { do {

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
    } while (0); });
    reg("fuel-terminal", (o) => { do {
{
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
    } while (0); });
    reg("register", (o) => { do {

        checkout();
        break;
    } while (0); });
    reg("cash-tray", (o) => { do {

        if (!W.cashPiles || !W.cashPiles.length) {
          toast("The pass-through tray is empty.");
          break;
        }
        W.takeCash();
        audio.play("cash");
        toast("Cash counted and secured in the register.");
        break;
    } while (0); });
    reg("bell", (o) => { do {

        audio.play("bell");
        toast("The bell sounds much louder at night.");
        break;
    } while (0); });
    reg("microwave", (o) => { do {

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
    } while (0); });
    reg("coffee", (o) => { do {

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
    } while (0); });
    reg("pump", (o) => { do {

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
    } while (0); });
    reg("car", (o) => { do {

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
    } while (0); });
    reg("npc", (o) => { do {
{
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
    } while (0); });
  };


  }
};
