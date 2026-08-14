type Bucket = { count: number; resetAt: number };

export function createRateLimiter(windowMs: number, max: number, maxKeys = 1000) {
  const buckets = new Map<string, Bucket>();

  return function limit(key: string): boolean {
    const now = Date.now();

    if (buckets.size > maxKeys) {
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) buckets.delete(k);
      }
    }

    const cur = buckets.get(key);
    if (!cur || now >= cur.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    cur.count += 1;
    return cur.count <= max;
  };
}
