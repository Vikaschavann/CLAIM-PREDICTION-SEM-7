// Dashboard page – Portfolio Overview
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getDashboardSummary, type DashboardSummary } from '../api/client';
import KpiCard from '../components/KpiCard';
import { useToasts } from '../components/Toast';
import ToastContainer from '../components/Toast';

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, dismiss } = useToasts();
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardSummary()
      .then((r) => setData(r.data))
      .catch(() => addToast('Failed to load dashboard data. Is the backend running?', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Portfolio Overview</h1>
          <p className="page-subtitle">Claim risk across active policies</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/predict')}
          id="new-prediction-btn"
        >
          New Prediction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Policies"
          value={loading ? '' : fmt(data?.total_policies ?? 0)}
          sub="Policy period 2026"
          loading={loading}
        />
        <KpiCard
          label="Predicted Claimants"
          value={loading ? '' : fmt(data?.predicted_claimants ?? 0)}
          sub={data ? `${((data.predicted_claimants / data.total_policies) * 100).toFixed(1)}% of portfolio` : ''}
          loading={loading}
        />
        <KpiCard
          label="High-Risk Customers"
          value={loading ? '' : fmt(data?.high_risk_count ?? 0)}
          sub="Risk score above 70"
          highlight
          loading={loading}
        />
        <KpiCard
          label="Best Model AUC"
          value={loading ? '' : data?.best_model_auc.toFixed(2) ?? ''}
          sub={data ? `${data.best_model_name}, validation set` : ''}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-heading mb-4">Predicted claims by month</h2>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.claims_by_month} barCategoryGap="25%">
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [(v as number).toLocaleString(), 'Claims']}
                />
                <Bar dataKey="predicted_claims" radius={[4, 4, 0, 0]} fill="#0B7A6E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Risk distribution */}
        <div className="card p-5">
          <h2 className="section-heading mb-4">Risk distribution</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-8 w-full rounded" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.risk_distribution.map((r) => (
                <div key={r.level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-text-primary">
                      {r.level} {r.level === 'Low' ? '(0-40)' : r.level === 'Medium' ? '(40-70)' : '(70-100)'}
                    </span>
                    <span className="font-bold text-text-primary">{r.pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Highest-risk table */}
      <div className="card p-5">
        <h2 className="section-heading mb-4">Highest-risk policyholders</h2>
        {loading ? (
          <div className="skeleton h-40 w-full rounded-lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" aria-label="Highest-risk policyholders">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Age</th>
                  <th>Vehicle Age</th>
                  <th>Top Driver of Risk</th>
                  <th>Risk Score</th>
                  <th>Prediction</th>
                </tr>
              </thead>
              <tbody>
                {data?.highest_risk_policyholders.map((p) => (
                  <tr key={p.policy_id}>
                    <td className="font-mono text-xs font-semibold">{p.policy_id}</td>
                    <td>{p.age}</td>
                    <td>{p.vehicle_age}</td>
                    <td className="text-text-secondary">{p.top_driver}</td>
                    <td>
                      <span className="font-bold text-text-primary">{p.risk_score}</span>
                    </td>
                    <td>
                      <span className="risk-badge-high">{p.prediction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
