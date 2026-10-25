// SHAP bar chart component (horizontal bars, red=increases, blue=decreases)
interface ShapBar {
  feature: string;
  value: string;
  shap_value: number;
  direction: 'increases' | 'decreases';
}

interface ShapBarsProps {
  factors: ShapBar[];
  loading?: boolean;
}

export default function ShapBars({ factors, loading }: ShapBarsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (!factors || factors.length === 0) {
    return <p className="text-sm text-text-muted">No explanation available.</p>;
  }

  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.shap_value)), 0.01);

  return (
    <div className="space-y-2.5">
      {factors.map((f, i) => {
        const pct = Math.abs(f.shap_value) / maxAbs;
        const isRed = f.direction === 'increases';
        const color = isRed ? '#B42318' : '#1D4ED8';
        const label = `${f.feature} = ${f.value}`;
        const sign = f.shap_value >= 0 ? '+' : '';

        return (
          <div
            key={i}
            className="flex items-center gap-3 text-sm"
            role="row"
            aria-label={`${label}: SHAP ${sign}${f.shap_value.toFixed(2)}`}
          >
            {/* Feature label */}
            <div className="w-44 text-right text-text-primary text-xs font-medium flex-shrink-0 truncate" title={label}>
              {label}
            </div>
            {/* Bar */}
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>
            {/* Value */}
            <div
              className="w-12 text-right text-xs font-semibold flex-shrink-0"
              style={{ color }}
            >
              {sign}{f.shap_value.toFixed(2)}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-text-muted pt-1">
        Red bars push risk up, blue bars push risk down (SHAP values in log-odds).
      </p>
    </div>
  );
}
