# Night Shift: Pump 4

A playable first-person horror game built with Babylon.js. You are Nao Mori, covering a rainy overnight shift at Kurose Service. Serve ordinary travelers, investigate an impossible fuel transaction, and survive the customer who comes back.

## Play

**Double-click `index.html`.** Keep `src/` and `vendor/` beside it. No installation, web server, account, internet connection, or build step is required. Use a current desktop Chrome, Edge, or Firefox browser with WebGL enabled. Click **Start your shift**, then allow mouse capture. Escape releases the mouse and pauses the game.

The Babylon.js 9.25.0 runtime is included locally. All environment models, labels, rain textures, character meshes, vehicles, sound effects, and the VHS camcorder shader are generated locally. The game makes no network requests.

| Control | Action                                          |
| ------- | ----------------------------------------------- |
| WASD    | Walk                                            |
| Mouse   | Look                                            |
| E       | Interact with the object under the crosshair    |
| Shift   | Hurry (the Passenger can hear you farther away) |
| F       | Flashlight                                      |
| G       | Set down or pick up the item in your hands     |
| Tab     | Evidence journal and supply inventory           |
| H       | Use first-aid supplies                          |
| R       | Use a road flare during an attack               |
| Escape  | Pause / release mouse                           |

Volume, mouse sensitivity, the VHS camcorder look, head movement, render quality, and the FPS counter can be changed in Settings. The FPS readout is saved locally in your browser.

## The station

The site follows ordinary roadside-konbini and forecourt practice rather than an invented plan, because the horror depends on the space being legible:

- **Sales floor.** Entrance at the front-left corner. Magazine rack along the front window. Three low gondola aisles run left to right so the attendant can see down every one of them. Reach-in drink coolers fill the whole back wall — the longest walk from the door — with the open chilled case for rice balls and sandwiches on the left wall and the ice-cream chest at the end of aisle three.
- **Cashier run.** Down the right-hand wall, facing the floor, with the hot-food back counter — microwave, coffee machine, warmer, cigarettes — immediately behind the attendant. From the till you can see the entrance diagonally across the shop and, by turning around, Pump Four through the storefront.
- **Back of house.** A staff lane behind the counter leads to a corridor, the office (time clock, CCTV, records) and the stockroom (delivery, workbench, service exit to the rear yard).
- **Forecourt.** Two pump islands about nine metres apart under a twelve-by-eighteen-metre canopy with roughly five metres of clearance, customer bays in front of the shop, the price tower at the roadside, and air and water on the far side.

Every fixture registers the spot a shopper stands in front of it, and the build fails loudly if any of those spots ends up inside geometry. Customers and the Passenger share one navigation grid, so a route the shoppers can walk is a route the Passenger can walk — there is nowhere in the building that it cannot reach.

## This first playable version

This is a compact, approximately 15–25 minute interpretation of the larger story, depending on exploration. It includes a complete beginning, investigation, confrontation, and three endings; it is not the eventual 35–45 minute production version.

- A textured, procedural service station laid out to real convenience-store practice, with forecourt, four pumps, sales floor, cashier run, back-of-house corridor, office, stockroom, and rear service yard.
- Thirty product types; customers browse the aisles, carry visible products to the counter, scanning, fuel validation on the employee computer, cash left on the pass-through tray, stock counts, coffee restocking, and heating noodles.
- Thirty product types on gondolas, back-wall coolers, an open chilled case and a freezer; customers browse the aisles, carry visible goods to the till, and leave cash on the pass tray.
- Coffee delivery is a physical carton: pick it up in the stockroom, see it held in first-person hands, set it down with **G**, and pick it up again. Cooler 01 on the back wall is the delivery target.
- Cars travel continuously along routes, park, and depart. Customers get out, walk through the entrance, browse for their order, queue at the right-side checkout, leave cash on the counter, and return to their cars.
- Powered sliding entrance with proximity sensor and lock; swinging interior doors; repairable rear latch.
- CCTV camera and live in-world monitor, inspection prompts, journal, telephone, receipts, first aid, and optional chores.
- Emi, Daichi, Mrs. Hasegawa, Ryo, Shibata, and the returning double.
- A hostile Passenger with navigation around walls and shelves, sight/hearing, damage, an alarm stun, a consumable flare, and checkpoint retries.
- Scripted window cracking and breakage that changes collision and creates hazardous glass.
- Original synthesized audio.
- A camcorder presentation: a generated VHS shader with lens barrel, tape wobble and tearing, chroma separation, scanlines, head noise and dropouts, over a graded, bloomed, softened image; a handheld camera that bobs, breathes and drifts; and REC, tape timecode and battery furniture over the frame. The tape degrades while something is inside the building with you. All of it switches off in Settings.

The art is an original stylized procedural prototype. NPCs and vehicles are deliberately simple; there is no imported character animation, full vehicle physics, voice acting, or general-purpose destructive physics. Vehicle and pedestrian routes are scripted. Window breakage is a story event. The intended larger story's restroom, alternate window rescue, flood set pieces, and extended dialogue are not in this slice.

## Source

- `index.html`: entry point and interface.
- `src/style.css`: title, HUD, settings, journal, CCTV, endings.
- `src/world.js`: the single source of truth for the layout — envelope, fixtures, merchandising, forecourt, lighting, collision, shared navigation, cars, characters, doors and windows.
- `src/store.js`: store operations — carried props, first-person hands, cash, delivery and restocking. Installed by `world.js`; it never moves the layout.
- `src/vhs.js`: the camcorder grade and the VHS tape shader.
- `src/game.js`: input, interactions, customers, narrative, pursuit, checkpoints, endings.
- `src/audio.js`: original Web Audio synthesis.
- `vendor/babylon.js`: Babylon.js 9.25.0, Apache-2.0; see `vendor/BABYLON-LICENSE.md`.
- `tests/smoke.cjs`: browser verification, including local-file launch, story progression, and two regressions worth keeping: every interaction must be usable from somewhere a player can physically stand, and the Passenger must be able to path to every standing position.

No paid asset packs or third-party game art were included. Chilla’s Art was a reference for the genre — everyday-work Japanese psychological horror shot as if on a camcorder — not a source of game content, branding, or assets. Every model, texture, sign, sound and shader here is generated by this repository.

## Development

The game uses plain scripts rather than module imports or fetched JSON so `file://` launch works. Browser tests use Playwright (a development dependency only). Run `npm install` and `npx playwright install chromium`, then `npm test`. Set `PLAYWRIGHT_MODULE` to an existing Playwright package path to use a preinstalled copy. `BROWSER_CHANNEL=msedge` uses installed Edge instead of bundled Chromium.

Appending `?debug=1` to the entry URL exposes `window.__nightShift` for repeatable test setup. It is absent during ordinary play.
