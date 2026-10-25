// Animated circular risk gauge
interface RiskGaugeProps {
  score: number;  // 0-100
  level: 'Low' | 'Medium' | 'High';
  size?: number;
}

const LEVEL_COLOR: Record<string, string> = {
  Low: '#0B7A6E',
  Medium: '#B7791F',
  High: '#B42318',
};

const LEVEL_TRACK: Record<string, string> = {
  Low: '#D1FAF0',
  Medium: '#FEF3C7',
  High: '#FEE2E2',
};

export default function RiskGauge({ score, level, size = 140 }: RiskGaugeProps) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  // We show a 270-degree arc (start from bottom-left, end at bottom-right)
  const arcLen = circumference * 0.75;
  const fillLen = (score / 100) * arcLen;
  const color = LEVEL_COLOR[level] ?? '#0B7A6E';
  const trackColor = LEVEL_TRACK[level] ?? '#E5E7EB';

  // Rotate so arc starts at 7 o'clock (225deg)
  const rotation = 135;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-label={`Risk gauge: ${score} out of 100, ${level} risk`}
        role="img"
      >
        {/* Track */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth="9"
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
        />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${fillLen} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
          className="gauge-arc"
          style={{ '--gauge-value': `${fillLen} ${circumference}` } as React.CSSProperties}
        />
        {/* Score text */}
        <text
          x="50" y="48"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill={color}
        >
          {score}
        </text>
        <text
          x="50" y="64"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
          fill="#9CA3AF"
        >
          RISK SCORE
        </text>
      </svg>
    </div>
  );
}
