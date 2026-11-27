import type { DomainMastery } from "@/lib/gamification";
import { DOMAIN_COLOR } from "./ui";

const SHORT: Record<string, string> = {
  "Web Exploitation": "Web",
  "Linux PrivEsc": "Linux",
  "Windows PrivEsc": "Windows",
  "Active Directory": "AD",
  "Pivoting & Tunneling": "Pivot",
  "Exam Chains": "Chains",
};

/** Pure-SVG hexagonal radar of domain mastery (no chart library). */
export function SkillRadar({ data, size = 260 }: { data: DomainMastery[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 34;
  const n = data.length;
  const point = (i: number, frac: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * frac, c + Math.sin(a) * r * frac] as const;
  };
  const ring = (frac: number) => data.map((_, i) => point(i, frac).join(",")).join(" ");
  // Keep a small visible floor so an empty radar still reads as a shape.
  const shape = data.map((d, i) => point(i, Math.max(0.04, d.pct / 100)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label="Domain mastery radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#1f2937" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#1f2937" strokeWidth={1} />;
      })}
      <polygon points={shape} fill="rgba(16,185,129,0.18)" stroke="#10b981" strokeWidth={1.5} strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = point(i, Math.max(0.04, d.pct / 100));
        return <circle key={d.domain} cx={x} cy={y} r={3} fill={DOMAIN_COLOR[d.domain]} />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, 1.2);
        return (
          <text
            key={d.domain}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 font-mono"
            fontSize={10}
          >
            {SHORT[d.domain]} {Math.round(d.pct)}%
          </text>
        );
      })}
    </svg>
  );
}
