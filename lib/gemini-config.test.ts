import { afterEach, describe, expect, it } from "vitest";

import { getGeminiApiKey } from "./gemini-config.mjs";

const originalGemini = process.env.GEMINI_API_KEY;
const originalGoogle = process.env.GOOGLE_API_KEY;

afterEach(() => {
  if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGemini;
  if (originalGoogle === undefined) delete process.env.GOOGLE_API_KEY;
  else process.env.GOOGLE_API_KEY = originalGoogle;
});

describe("getGeminiApiKey", () => {
  it("uses the documented GOOGLE_API_KEY precedence and removes surrounding whitespace", () => {
    process.env.GEMINI_API_KEY = " gemini-key ";
    process.env.GOOGLE_API_KEY = " google-key ";

    expect(getGeminiApiKey()).toBe("google-key");
  });

  it("returns undefined when neither variable contains a key", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    expect(getGeminiApiKey()).toBeUndefined();
  });
});
