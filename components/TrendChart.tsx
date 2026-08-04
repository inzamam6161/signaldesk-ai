import type { TrendPoint } from "@/types/dashboard";

export function TrendChart({ data, range }: { data: TrendPoint[]; range: string }) {
  const multiplier = range === "7 days" ? 0.92 : range === "90 days" ? 1.06 : 1;
  const points = data.map((point, index) => {
    const x = 16 + index * (568 / (data.length - 1));
    const y = 150 - (point.value * multiplier - 45) * 2.55;
    return `${x},${Math.max(16, Math.min(152, y))}`;
  }).join(" ");

  return (
    <div className="chart" aria-label={`Sentiment trend for ${range}`}>
      <div className="chart__labels"><span>90%</span><span>70%</span><span>50%</span></div>
      <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8ff45" stopOpacity=".28" />
            <stop offset="100%" stopColor="#c8ff45" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="grid-line" d="M0 30H600M0 90H600M0 150H600" />
        <polygon points={`16,170 ${points} 584,170`} fill="url(#area)" />
        <polyline points={points} className="chart__line" />
      </svg>
      <div className="chart__days">
        {data.map((point) => <span key={point.day}>{point.day}</span>)}
      </div>
    </div>
  );
}
