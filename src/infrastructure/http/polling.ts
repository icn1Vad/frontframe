export interface PollingOptions {
  readonly signal?: AbortSignal;
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly multiplier?: number;
  readonly timeoutMs?: number;
}

function wait(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(signal?.reason);
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function pollUntil<T>(
  load: (signal?: AbortSignal) => Promise<T>,
  isComplete: (value: T) => boolean,
  options: PollingOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const multiplier = options.multiplier ?? 1.5;
  let delayMs = options.initialDelayMs ?? 1500;

  while (true) {
    options.signal?.throwIfAborted();
    const value = await load(options.signal);
    if (isComplete(value)) return value;
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error("任务状态轮询超时");
    }
    await wait(delayMs, options.signal);
    delayMs = Math.min(maxDelayMs, Math.round(delayMs * multiplier));
  }
}
