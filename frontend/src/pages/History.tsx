// Database Prediction History & Feedback Page (backed by SQLite)
import { useEffect, useState, useCallback } from 'react';
import {
  getPredictionHistory,
  getPredictionStats,
  submitFeedback,
  type HistoryItem,
  type HistoryStats,
} from '../api/client';
import RiskBadge from '../components/RiskBadge';
import ToastContainer, { useToasts } from '../components/Toast';

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('All');
  const [modelFilter, setModelFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const PAGE_SIZE = 15;
  const { toasts, addToast, dismiss } = useToasts();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        getPredictionHistory({
          limit: 100,
          risk_level: riskFilter !== 'All' ? riskFilter : undefined,
          model: modelFilter !== 'All' ? modelFilter : undefined,
        }),
        getPredictionStats(),
      ]);
      setItems(historyRes.data);
      setStats(statsRes.data);
      setPage(0);
    } catch {
      addToast('Failed to load database history', 'error');
    } finally {
      setLoading(false);
    }
  }, [riskFilter, modelFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFeedback = async (id: string, isCorrect: boolean) => {
    try {
      await submitFeedback(id, isCorrect);
      setFeedbackSent(prev => ({ ...prev, [id]: true }));
      addToast(
        isCorrect ? 'Marked prediction as accurate' : 'Feedback logged for model retraining',
        'success'
      );
    } catch {
      addToast('Failed to record feedback', 'error');
    }
  };

  const paginated = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Database Prediction Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time prediction audit trail stored persistently in SQLite (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">backend/data/insuresight.db</code>).
        </p>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Logged Queries</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Risk</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.by_risk_level['High'] || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Medium Risk</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.by_risk_level['Medium'] || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Risk</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.by_risk_level['Low'] || 0}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Risk Level:</span>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {['All', 'Low', 'Medium', 'High'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Model:</span>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {['All', 'xgboost', 'lightgbm', 'catboost', 'neural_network'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          Showing {items.length} records
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading database records…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No prediction logs found yet. Try making a prediction from the{' '}
            <a href="/predict" className="text-accent underline font-medium">
              Predict Claim
            </a>{' '}
            tab to see it appear here!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Profile Summary</th>
                  <th className="py-3 px-4 text-center">Prediction</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Top Influencing Factor</th>
                  <th className="py-3 px-4 text-center">Audit Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginated.map(row => {
                  const dateStr = new Date(row.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const topFactor = row.top_factors && row.top_factors[0]
                    ? `${row.top_factors[0].feature} (${row.top_factors[0].direction})`
                    : '—';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {row.model_used}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.input_data.age} yrs • {row.input_data.driving_experience} exp • {row.input_data.income}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            row.prediction === 'Yes'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {row.prediction} ({(row.probability * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {row.risk_score}
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge level={row.risk_level} />
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={topFactor}>
                        {topFactor}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {feedbackSent[row.id] ? (
                          <span className="text-[11px] text-emerald-600 font-medium">✓ Logged</span>
                        ) : (
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleFeedback(row.id, true)}
                              title="Accurate prediction"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 transition-colors"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleFeedback(row.id, false)}
                              title="Inaccurate / Flag for review"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-colors"
                            >
                              👎
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
            <div>Page {page + 1} of {totalPages}</div>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
