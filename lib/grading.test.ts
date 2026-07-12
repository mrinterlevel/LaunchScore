import { describe, expect, it } from "vitest";

import { scoreGrade } from "./grading";

describe("scoreGrade", () => {
  it.each([
    [100, "A"],
    [90, "A"],
    [89, "B"],
    [75, "B"],
    [74, "C"],
    [60, "C"],
    [59, "D"],
    [0, "D"],
  ] as const)("maps %i to %s", (score, grade) => {
    expect(scoreGrade(score)).toBe(grade);
  });
});
