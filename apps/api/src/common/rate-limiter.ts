// A small in-memory sliding-window limiter: at most `limit` hits per key in
// any `windowMs`. For socket events, which the HTTP throttler doesn't see.
// In memory like the duel queue (ADR-010): one API instance.
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  get size(): number {
    return this.hits.size;
  }

  // Records a hit; false if the key is already at its limit (not recorded).
  hit(key: string, now = Date.now()): boolean {
    // Once a window, drop keys with no recent hit, so users who never come
    // back don't stay in memory forever.
    if (now - this.lastSweep >= this.windowMs) {
      for (const [k, times] of this.hits) {
        if (now - times[times.length - 1] >= this.windowMs) this.hits.delete(k);
      }
      this.lastSweep = now;
    }
    const recent = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
