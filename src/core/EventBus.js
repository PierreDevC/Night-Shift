/* Tiny publish/subscribe bus. Systems announce what happened ("alarm",
   "phase", "door") instead of reaching into each other; anything that cares
   subscribes. Keeps cross-system knowledge at the level of event names. */
window.NS = window.NS || {};
NS.EventBus = class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const list = this.listeners.get(event);
    if (list) this.listeners.set(event, list.filter((f) => f !== fn));
  }
  emit(event, payload) {
    for (const fn of this.listeners.get(event) || []) fn(payload);
  }
};
