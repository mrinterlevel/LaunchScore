import { describe, expect, it } from "vitest";

import { parseInsightResponse } from "./insights";

describe("parseInsightResponse", () => {
  it("returns null for an empty Gemini response", () => {
    expect(parseInsightResponse(undefined)).toBeNull();
    expect(parseInsightResponse("")).toBeNull();
  });

  it("returns a validated JSON insight", () => {
    expect(parseInsightResponse('{"insights":"Stores need richer product descriptions."}')).toBe(
      "Stores need richer product descriptions.",
    );
  });

  it("returns null for malformed model output", () => {
    expect(parseInsightResponse("not json")).toBeNull();
  });
});
