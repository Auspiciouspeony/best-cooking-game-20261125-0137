// Simmer & Serve — a tiny seeded random number generator (mulberry32).
// One clear job: deterministic randomness, so a seed always replays the same shift.

/** Create a generator from any integer seed. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    /** A float in [0, 1). */
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** An integer in [0, n). */
    int(n) {
      return Math.floor(this.next() * n);
    },
    /** One element of `list`, uniformly. */
    pick(list) {
      return list[this.int(list.length)];
    },
  };
}
