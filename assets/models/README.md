# Character geometry

`human-base.obj` is the MakeHuman Community base mesh, downloaded from
https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj
on 2026-09-08. Its embedded notice explicitly releases the asset as CC0.
See `MAKEHUMAN-LICENSE.md` and https://static.makehumancommunity.org/about/license.html.

`human-head.js` contains the facial portion, scaled and embedded for offline
loading. Rebuild with `python3 scripts/build-human.py`. The game adds original
civilian clothing, hair, eyes, hands and articulated limbs in `src/models.js`.
No character or vehicle geometry was extracted from Chilla's Art games.

Visual direction: grounded proportions, worn civilian clothing and face-focused
dialogue, informed by the official screenshots of *The Convenience Store*:
https://store.steampowered.com/app/1228520/Chillas_Art_The_Convenience_Store/.
Those screenshots are references only and are not bundled game assets.

The vehicles use original shaped body meshes, sloping glass, interior seats,
steering wheels, grille details and alloy wheels.
