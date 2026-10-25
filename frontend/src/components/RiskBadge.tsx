// Risk badge component
type RiskLevel = 'Low' | 'Medium' | 'High';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
}

export default function RiskBadge({ level, label }: RiskBadgeProps) {
  const cls = {
    Low: 'risk-badge-low',
    Medium: 'risk-badge-medium',
    High: 'risk-badge-high',
  }[level];

  return (
    <span className={cls} role="status" aria-label={`Risk level: ${level}`}>
      {label ?? `${level} risk`}
    </span>
  );
}
