// Centralized timing service (docs/14: "Centralize timed states ... Do not
// implement important timers in ad-hoc DOM callbacks").
// Uses accumulated simulated seconds so it works identically in tests.

export class Clock {
  constructor() {
    this.elapsed = 0; // seconds of game time
    this.timers = []; // { id, at, fn, oneShot }
    this.nextId = 1;
  }

  now() {
    return this.elapsed;
  }

  after(seconds, fn) {
    const id = this.nextId++;
    this.timers.push({ id, at: this.elapsed + seconds, fn, oneShot: true });
    return id;
  }

  cancel(id) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }

  advance(dt) {
    if (dt <= 0) return;
    this.elapsed += dt;
    const due = this.timers.filter((t) => t.at <= this.elapsed);
    this.timers = this.timers.filter((t) => t.at > this.elapsed);
    for (const t of due.sort((a, b) => a.at - b.at)) t.fn();
  }
}
