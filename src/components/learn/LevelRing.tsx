// Circular XP progress with the level number in the middle.
export default function LevelRing({ level, pct, size = 64 }: { level: number; pct: number; size?: number }) {
  const stroke = Math.max(4, size * 0.09);
  const r = size / 2 - stroke / 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#252a47" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#lvl)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(100, pct) / 100) * C} ${C}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
        <defs>
          <linearGradient id="lvl" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-400">lvl</span>
        <span className="font-mono text-lg font-bold text-white">{level}</span>
      </div>
    </div>
  );
}
