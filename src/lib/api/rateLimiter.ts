export type RateLimitedTask<T> = () => Promise<T>;

export interface RateLimiter {
  schedule<T>(task: RateLimitedTask<T>): Promise<T>;
}

export function createRateLimiter(requestsPerSecond: number): RateLimiter {
  const intervalMs = Math.ceil(1000 / Math.max(1, requestsPerSecond));
  let nextAvailableAt = 0;

  return {
    async schedule<T>(task: RateLimitedTask<T>) {
      const now = Date.now();
      const waitMs = Math.max(0, nextAvailableAt - now);
      nextAvailableAt = Math.max(now, nextAvailableAt) + intervalMs;

      if (waitMs > 0) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, waitMs));
      }

      return task();
    }
  };
}
