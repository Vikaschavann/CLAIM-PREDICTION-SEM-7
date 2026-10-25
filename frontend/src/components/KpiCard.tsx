// KPI card component
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  loading?: boolean;
}

export default function KpiCard({ label, value, sub, highlight, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="kpi-card">
        <div className="skeleton h-4 w-28 mb-3" />
        <div className="skeleton h-8 w-20 mb-2" />
        <div className="skeleton h-3 w-32" />
      </div>
    );
  }
  return (
    <div className="kpi-card fade-in-up">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-high-risk' : 'text-text-primary'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
