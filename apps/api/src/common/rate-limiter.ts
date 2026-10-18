// A small in-memory sliding-window limiter: at most `limit` hits per key in
// any `windowMs`. For socket events, which the HTTP throttler doesn't see.
// In memory like the duel queue (ADR-010): one API instance.
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  // Records a hit; false if the key is already at its limit (not recorded).
  hit(key: string, now = Date.now()): boolean {
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
