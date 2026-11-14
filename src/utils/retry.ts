export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  shouldRetry?: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 3);
  const baseMs = Math.max(0, options.baseMs ?? 500);
  const maxMs = Math.max(baseMs, options.maxMs ?? 8000);
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !shouldRetry(err)) {
        throw err;
      }

      const expDelay = Math.min(maxMs, baseMs * 2 ** attempt);
      const jittered = Math.round(expDelay * (0.5 + Math.random() * 0.5));
      await sleep(jittered);
    }
  }

  throw lastError;
}
