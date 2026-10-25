// Explainability page – global SHAP importance + dependence charts
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getGlobalShap, getEDAClaimRates, type GlobalShapFeature } from '../api/client';
import ToastContainer, { useToasts } from '../components/Toast';

export default function Explainability() {
  const [shapData, setShapData] = useState<GlobalShapFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState('DRIVING_EXPERIENCE');
  const [claimRates, setClaimRates] = useState<Record<string, { value: string; claim_rate: number }[]>>({});
  const { toasts, addToast, dismiss } = useToasts();

  useEffect(() => {
    Promise.all([getGlobalShap(), getEDAClaimRates()])
      .then(([shapRes, claimRes]) => {
        const sorted = [...shapRes.data.features].sort((a, b) => b.mean_abs_shap - a.mean_abs_shap);
        setShapData(sorted);
        // Group claim rates by feature
        const grouped: Record<string, { value: string; claim_rate: number }[]> = {};
        for (const row of claimRes.data) {
          if (!grouped[row.feature]) grouped[row.feature] = [];
          grouped[row.feature].push({ value: row.value, claim_rate: row.claim_rate });
        }
        setClaimRates(grouped);
      })
      .catch(() => addToast('Failed to load explainability data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = shapData.map(f => ({
    name: f.feature.replace(/_/g, ' '),
    value: f.mean_abs_shap,
    share: f.share_pct,
  }));

  const depData = (claimRates[selectedFeature] ?? []).map(d => ({
    name: d.value,
    claim_rate: Math.round(d.claim_rate * 100),
  }));

  const featureOpts = Object.keys(claimRates);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Explainability</h1>
        <p className="page-subtitle">Global feature importance and dependence plots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global SHAP importance */}
        <div className="card p-5">
          <h2 className="section-heading mb-1">Global feature importance (SHAP)</h2>
          <p className="text-xs text-accent mb-4">Mean absolute SHAP value across all policyholders</p>
          {loading ? (
            <div className="skeleton h-64 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData.slice(0, 10)}
                layout="vertical"
                margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category" dataKey="name" width={140}
                  tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [(v as number).toFixed(4), 'Mean |SHAP|']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.slice(0, 10).map((_, i) => (
                    <Cell
                      key={i}
                      fill={`hsl(${168 - i * 8}, ${70 - i * 2}%, ${40 + i * 2}%)`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Share breakdown table */}
        <div className="card p-5">
          <h2 className="section-heading mb-1">Feature contribution share</h2>
          <p className="text-xs text-accent mb-4">% of total mean |SHAP| explained by each feature</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-6 w-full rounded" />)}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
              {shapData.slice(0, 14).map((f, i) => (
                <div key={f.feature} className="flex items-center gap-3 text-sm">
                  <span className="w-40 text-text-primary font-medium text-xs truncate" title={f.feature}>
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${f.share_pct}%`,
                        backgroundColor: `hsl(${168 - i * 8}, 60%, ${42 + i * 2}%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text-primary w-10 text-right">
                    {f.share_pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dependence plot */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-heading">Claim rate by feature (dependence plot)</h2>
            <p className="text-xs text-accent mt-0.5">Actual observed claim rate for each feature value</p>
          </div>
          <div>
            <label className="form-label" htmlFor="dep-feature-select">Feature</label>
            <select
              id="dep-feature-select"
              className="form-select w-52"
              value={selectedFeature}
              onChange={e => setSelectedFeature(e.target.value)}
            >
              {featureOpts.map(f => (
                <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        {loading || depData.length === 0 ? (
          <div className="skeleton h-48 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={depData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={40}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [`${v as number}%`, 'Claim rate']}
              />
              <Bar dataKey="claim_rate" radius={[4, 4, 0, 0]} fill="#0B7A6E" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
