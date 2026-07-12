import { scoreColor, scoreVerdict } from "@/lib/ui";

// A semicircular score gauge (0–100). Pure SVG, no client JS needed.
export default function ScoreDial({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  // Semicircle arc from 180deg to 0deg. r=80, center (100,100).
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circ = Math.PI * r; // half circumference
  const dash = (clamped / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-64 max-w-full">
        {/* track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="40"
          fontWeight="700"
          fill="var(--text)"
        >
          {clamped}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="var(--muted)">
          / 100
        </text>
      </svg>
      <div className="mt-1 text-sm font-medium" style={{ color }}>
        {scoreVerdict(clamped)}
      </div>
    </div>
  );
}
