export const SCORE_GRADE_BANDS = {
  A: 90,
  B: 75,
  C: 60,
  D: 0,
} as const;

export type ScoreGrade = keyof typeof SCORE_GRADE_BANDS;

export const GRADE_COLOR: Record<ScoreGrade, string> = {
  A: "#22c55e",
  B: "#0ea5e9",
  C: "#f59e0b",
  D: "#ef4444",
};

export function scoreGrade(score: number): ScoreGrade {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  if (normalized >= SCORE_GRADE_BANDS.A) return "A";
  if (normalized >= SCORE_GRADE_BANDS.B) return "B";
  if (normalized >= SCORE_GRADE_BANDS.C) return "C";
  return "D";
}

export function gradeColor(score: number): string {
  return GRADE_COLOR[scoreGrade(score)];
}
