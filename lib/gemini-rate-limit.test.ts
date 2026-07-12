import { describe, expect, it } from "vitest";

import { createGeminiRateLimiter } from "./gemini-rate-limit.mjs";

describe("Gemini request limiter", () => {
  it("waits for the rolling window before issuing a request above the cap", async () => {
    let clock = 0;
    const requestTimes: number[] = [];
    const limit = createGeminiRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => clock,
      sleep: async (ms: number) => {
        clock += ms;
      },
    });

    await limit(async () => requestTimes.push(clock));
    await limit(async () => requestTimes.push(clock));
    await limit(async () => requestTimes.push(clock));

    expect(requestTimes).toEqual([0, 0, 60_000]);
  });
});
