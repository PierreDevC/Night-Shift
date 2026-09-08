# Night Shift: Pump 4

A playable first-person horror game built with Babylon.js. You are Nao Mori, covering a rainy overnight shift at Kurose Service. Serve ordinary travelers, investigate an impossible fuel transaction, and survive the customer who comes back.

## Play

**Double-click `index.html`.** Keep `src/` and `vendor/` beside it. No installation, web server, account, internet connection, or build step is required. Use a current desktop Chrome, Edge, or Firefox browser with WebGL enabled. Click **Start your shift**, then allow mouse capture. Escape releases the mouse and pauses the game.

The Babylon.js 9.25.0 runtime is included locally. Environment models, labels, rain, characters, vehicles, sound effects, and the VHS camcorder shader are generated locally. Asphalt, concrete and tile surfaces use bundled CC0 color and normal maps from ambientCG (see `assets/textures/LICENSE.md`). The game makes no network requests.

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

- **Sales floor.** A twenty-one metre shop floor. Entrance at the front-left corner. Magazine rack along the front window. Three long gondola aisles run left to right so the attendant can see down every one of them. Eight framed glass-door drink coolers occupy the back wall, with the open chilled case for rice balls and sandwiches on the left wall and the ice-cream chest at the end of aisle three. Shell, slabs, roof and storefront glazing are all set out from the envelope, so the shop is widened by changing its footprint rather than by rematching a dozen box widths.
- **Cashier booth.** Down the right-hand wall, enclosed by framed safety glass with a low payment hatch and an outward-opening staff gate hinged on the east post. The attendant works from a raised deck a step above the sales floor, so they stand visibly higher than the customer across the counter; a half-height tread inside the gate makes the step up. The player camera follows the finished floor, tread and platform heights. Register, keypad, till screen, drawer, scanner, fuel desk, telephone and alarm sit on the staff half of the counter, with the printer between the phone and fuel terminal, clear of the intercom. The till faces the attendant directly opposite the customer, below their sightline. Customers stay on the sales floor even when the gate is open. The microwave, coffee machine and hot-food counter sit behind the attendant; glass at the front preserves the view of the forecourt.
- **Back of house.** One signed STOCKROOM door opens from the sales floor. Inside, a staff-only OFFICE door leads to the nested office (time clock, CCTV, records); the stockroom holds the delivery, a workbench along the east wall and the service exit. Nothing is parked in front of a door: the bench stands clear of the service exit, and no door leaf sweeps through furniture when it opens. There is no public hallway or second exterior office door. The east wall is continuous and the rear exit has a real opening in the shell.
- **Forecourt.** Two pump islands about nine metres apart under a twelve-by-eighteen-metre canopy with roughly five metres of clearance, customer bays in front of the shop, the price tower at the roadside, and air and water on the far side.

Every fixture registers the spot a shopper stands in front of it, and the build fails loudly if any of those spots ends up inside geometry. Customers and the Passenger share one navigation grid with different access permissions: shoppers cannot route through staff doors; the Passenger can pursue through them. Failed routes wait and retry instead of falling back to a straight line through walls.

## This first playable version

This is a compact, approximately 15–25 minute interpretation of the larger story, depending on exploration. It includes a complete beginning, investigation, confrontation, and three endings; it is not the eventual 35–45 minute production version.

- A textured, procedural service station laid out to real convenience-store practice, with forecourt, four pumps, sales floor, glazed cashier booth, office, stockroom, and rear service yard.
- Forty product types, including the motor lines a station shop actually sells — oil, screen wash, work gloves, spare bulbs — merchandised on the household aisle; customers browse the aisles, carry visible products to the counter, scanning, fuel validation on the employee computer, cash left on the pass-through tray, stock counts, coffee restocking, and heating noodles.
- Random walk-in customers overlap the story customers, browse independently and queue for the single till. Up to two walk-ins can be present alongside a story customer. Arrivals and one-to-three-item baskets vary; walk-ins clear out before Shibata’s supernatural sequence so the original plot and endings remain intact.
- Coffee delivery is a physical carton: pick it up in the stockroom, see it held in first-person hands, set it down with **G**, and pick it up again. Cooler 01 on the back wall is the delivery target.
- Non-fuel cars reserve distinct marked parking bays and release them after departure. The entrance has a marked keep-clear pedestrian strip. Fuel customers use the pump lanes; returning Emi also uses a parking bay. Customers get out, browse, queue, pay, and return to their own vehicles.
- Hollow refrigerator cabinets expose stocked shelves, labels and price rails behind clear framed doors. Shoppers open the relevant fridge, collect a product and let the door close. Players can also open the fridges with **E**.
- A roadside bus shelter, shuttered repair shop and diner, sodium lamps, drainage culvert, retaining wall, shrubs and layered trees give the station a surrounding neighborhood.
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
- `tests/store.cjs`: physical door openings, closed wall gaps, staff access, animated fridges, overlapping shoppers, independent checkouts, parking reservations and story gating. It also holds the counter and doorway regressions: no door leaf may sweep through furniture, the staff gate is measured from the swung panel rather than trusted to a sign, every till fixture must be standing on the counter rather than hanging over the lane, the deck rise must equal the height the camera is lifted by, and the attendant must be able to see the customer's face over the till.
- `assets/textures/`: downloaded CC0 surface maps and source/license information; `npm run textures` rebuilds the embedded offline texture bundle.
- `tests/smoke.cjs`: browser verification, including local-file launch, story progression, and two regressions worth keeping: every interaction must be usable from somewhere a player can physically stand, and the Passenger must be able to path to every standing position.

No paid asset packs or third-party game art were included. Chilla’s Art was a reference for the genre — everyday-work Japanese psychological horror shot as if on a camcorder — not a source of game content, branding, or assets. Models, signs, sound and shaders are generated by this repository; the three surface texture sets are licensed CC0 downloads from ambientCG.

## Development

The game uses plain scripts rather than module imports or fetched JSON so `file://` launch works. Browser tests use Playwright (a development dependency only). Run `npm install` and `npx playwright install chromium`, then `npm test`. Set `PLAYWRIGHT_MODULE` to an existing Playwright package path to use a preinstalled copy. `BROWSER_CHANNEL=msedge` uses installed Edge instead of bundled Chromium. Alternatively set `BROWSER_EXECUTABLE` to an installed Chromium-based browser executable. `npm test` runs both story and store regressions; `npm run test:store` runs only the layout/concurrency checks.

Appending `?debug=1` to the entry URL exposes `window.__nightShift` for repeatable test setup. It is absent during ordinary play.
