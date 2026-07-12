import { CATEGORIES, type CategoryScores } from "@/lib/types";
import { gradeColor, scoreGrade } from "@/lib/grading";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/ui";
import { CATEGORY_WEIGHTS } from "@/lib/taxonomy";

// Five horizontal category-score bars. Weight shown so the reader understands
// how each category rolls up into the LaunchScore.
export default function CategoryBars({ scores }: { scores: CategoryScores }) {
  return (
    <div className="flex flex-col gap-3">
      {CATEGORIES.map((cat) => {
        const v = Math.max(0, Math.min(100, scores[cat] ?? 0));
        const grade = scoreGrade(v);
        return (
          <div key={cat} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-sm" style={{ color: "var(--muted)" }}>
              {CATEGORY_LABEL[cat]}
            </div>
            <div
              className="relative h-3 flex-1 overflow-hidden rounded-full"
              style={{ background: "var(--panel-2)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${v}%`, background: CATEGORY_COLOR[cat] }}
              />
            </div>
            <div
              className="w-10 shrink-0 text-right text-sm font-semibold"
              aria-label={`${CATEGORY_LABEL[cat]} grade ${grade}`}
              style={{ color: gradeColor(v) }}
            >
              {grade}
            </div>
            <div className="w-14 shrink-0 text-right text-xs" style={{ color: "var(--muted)" }}>
              w{CATEGORY_WEIGHTS[cat]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
