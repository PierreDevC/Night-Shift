/* Base class for every game system. A system is constructed once the world
   exists, receives the shared context, and may expose three things:
   - functions registered into ctx.fn (the game's shared verb table),
   - interaction handlers registered by kind (see InteractionSystem),
   - a per-frame update(dt).
   Construction order is the dependency order; anything needed earlier than
   its owner constructs is called late-bound through ctx.fn. */
window.NS = window.NS || {};
NS.System = class System {
  constructor(ctx) {
    this.ctx = ctx;
  }
  /* Add functions to the shared verb table so other systems, the debug
     facade and the tests can call them by name. */
  registerFns(map) {
    for (const [name, fn] of Object.entries(map)) this.ctx.fn[name] = fn;
  }
  /* Override to claim interaction kinds: reg("door", handler). */
  registerInteractions(reg) {}
  update(dt) {}
};
