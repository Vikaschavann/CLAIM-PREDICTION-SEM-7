// Data Explorer (EDA) page – histograms, claim rates, correlation heatmap
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  getEDAClaimRates, getEDADistributions, getCorrelation,
  type EDAClaimRateItem,
} from '../api/client';
import ToastContainer, { useToasts } from '../components/Toast';

const FEATURE_OPTIONS = ['AGE', 'DRIVING_EXPERIENCE', 'INCOME', 'VEHICLE_OWNERSHIP', 'VEHICLE_YEAR', 'MARRIED'];

export default function DataExplorer() {
  const [claimRates, setClaimRates] = useState<EDAClaimRateItem[]>([]);
  const [distributions, setDistributions] = useState<Record<string, { bin: string; count: number }[]>>({});
  const [correlation, setCorrelation] = useState<{ x: string; y: string; r: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimFeature, setClaimFeature] = useState('AGE');
  const [distFeature, setDistFeature] = useState('ANNUAL_MILEAGE');
  const { toasts, addToast, dismiss } = useToasts();

  useEffect(() => {
    Promise.all([getEDAClaimRates(), getEDADistributions(), getCorrelation()])
      .then(([cr, dist, corr]) => {
        setClaimRates(cr.data);
        setDistributions(dist.data);
        setCorrelation(corr.data);
      })
      .catch(() => addToast('Failed to load EDA data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Claim rate chart data for selected feature
  const claimData = claimRates
    .filter(r => r.feature === claimFeature)
    .map(r => ({ name: r.value, rate: Math.round(r.claim_rate * 100), customers: r.customers }));

  // Distribution data
  const distData = (distributions[distFeature] ?? []).map(b => ({
    name: b.bin.replace('(', '').replace(']', '').replace(', ', '–'),
    count: b.count,
  }));

  // Correlation matrix – unique axes
  const corrAxes = [...new Set(correlation.map(c => c.x))];
  const corrMap: Record<string, Record<string, number>> = {};
  for (const c of correlation) {
    if (!corrMap[c.y]) corrMap[c.y] = {};
    corrMap[c.y][c.x] = c.r;
  }

  const corrColor = (r: number) => {
    const abs = Math.abs(r);
    if (r > 0) return `rgba(11, 122, 110, ${abs.toFixed(2)})`;
    if (r < 0) return `rgba(180, 35, 24, ${abs.toFixed(2)})`;
    return '#f9fafb';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Data Explorer</h1>
        <p className="page-subtitle">Explore distributions, claim rates, and feature correlations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Claim rate by feature */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="section-heading">Claim rate by category</h2>
              <p className="text-xs text-accent mt-0.5">Observed claim rate per feature value</p>
            </div>
            <select
              className="form-select w-44 text-xs"
              value={claimFeature}
              onChange={e => setClaimFeature(e.target.value)}
              id="claim-feature-select"
              aria-label="Select feature for claim rate chart"
            >
              {FEATURE_OPTIONS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={claimData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} width={36}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown, name: unknown) => name === 'rate' ? [`${v as number}%`, 'Claim rate'] : [(v as number).toLocaleString(), 'Customers']}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {claimData.map((d, i) => (
                    <Cell key={i} fill={d.rate >= 50 ? '#B42318' : d.rate >= 25 ? '#B7791F' : '#0B7A6E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Numeric distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="section-heading">Feature distribution</h2>
              <p className="text-xs text-accent mt-0.5">Histogram of numeric feature values</p>
            </div>
            <select
              className="form-select w-44 text-xs"
              value={distFeature}
              onChange={e => setDistFeature(e.target.value)}
              id="dist-feature-select"
              aria-label="Select numeric feature for distribution"
            >
              {Object.keys(distributions).map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distData} barCategoryGap="5%">
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [(v as number).toLocaleString(), 'Count']}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#0B7A6E" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Correlation heatmap */}
      <div className="card p-5">
        <h2 className="section-heading mb-1">Feature correlation matrix</h2>
        <p className="text-xs text-accent mb-4">Pearson correlation between numeric features (green = positive, red = negative)</p>
        {loading ? (
          <div className="skeleton h-48 w-full rounded-lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0.5" aria-label="Correlation matrix">
              <thead>
                <tr>
                  <th className="w-32" />
                  {corrAxes.map(ax => (
                    <th key={ax} className="text-center text-text-muted font-medium pb-1 max-w-16">
                      <div className="truncate w-20 text-center" title={ax}>{ax.replace(/_/g, ' ')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrAxes.map(rowKey => (
                  <tr key={rowKey}>
                    <td className="text-text-secondary font-medium pr-2 text-right whitespace-nowrap">
                      {rowKey.replace(/_/g, ' ')}
                    </td>
                    {corrAxes.map(colKey => {
                      const r = corrMap[rowKey]?.[colKey] ?? 0;
                      return (
                        <td
                          key={colKey}
                          className="rounded text-center p-2 font-semibold text-xs"
                          style={{
                            backgroundColor: corrColor(r),
                            color: Math.abs(r) > 0.5 ? 'white' : '#374151',
                            minWidth: 64,
                          }}
                          title={`${rowKey} vs ${colKey}: ${r.toFixed(3)}`}
                        >
                          {r.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary statistics */}
      <div className="card p-5">
        <h2 className="section-heading mb-4">Claim rate summary by key segments</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Young drivers (16-25)', rate: '71.8%', color: 'text-high-risk' },
            { label: 'No vehicle ownership', rate: '57.9%', color: 'text-high-risk' },
            { label: 'Experienced drivers (30y+)', rate: '1.9%', color: 'text-accent' },
            { label: 'Upper class income', rate: '13.4%', color: 'text-accent' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.rate}</p>
              <p className="text-xs text-text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
