import { afterEach, describe, expect, it, vi } from "vitest";
import { pollUntil } from "./polling";

describe("pollUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses bounded backoff until the completion predicate succeeds", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const resultPromise = pollUntil(
      async () => {
        calls += 1;
        return calls;
      },
      (value) => value >= 3,
      {
        initialDelayMs: 100,
        maxDelayMs: 150,
        multiplier: 2,
        timeoutMs: 1000,
      },
    );

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe(3);
    expect(calls).toBe(3);
  });
});
