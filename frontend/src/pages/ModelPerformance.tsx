// Model Performance page – comparison table, confusion matrix, ROC curve
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getModelPerformance, type ModelPerformanceResponse } from '../api/client';
import ToastContainer, { useToasts } from '../components/Toast';


export default function ModelPerformance() {
  const [data, setData] = useState<ModelPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, dismiss } = useToasts();

  useEffect(() => {
    getModelPerformance()
      .then(r => setData(r.data))
      .catch(() => addToast('Failed to load model performance data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const cm = data?.confusion_matrix ?? [];
  const tn = cm.find(c => c.actual === 'Actual No' && c.predicted === 'Predicted No');
  const fp = cm.find(c => c.actual === 'Actual No' && c.predicted === 'Predicted Yes');
  const fn = cm.find(c => c.actual === 'Actual Yes' && c.predicted === 'Predicted No');
  const tp = cm.find(c => c.actual === 'Actual Yes' && c.predicted === 'Predicted Yes');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Model Performance</h1>
        <p className="page-subtitle">Compare classifiers on the held-out validation set</p>
      </div>

      {/* Metrics table */}
      <div className="card p-5">
        {loading ? (
          <div className="skeleton h-40 w-full rounded-lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" aria-label="Model performance comparison">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Accuracy</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1</th>
                  <th>ROC-AUC</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.models.map(m => (
                  <tr key={m.model} className={m.is_best ? 'font-semibold' : ''}>
                    <td className={m.is_best ? 'text-text-primary font-bold' : 'text-text-secondary'}>
                      {m.model}
                    </td>
                    <td>{m.accuracy.toFixed(2)}</td>
                    <td>{m.precision.toFixed(2)}</td>
                    <td>{m.recall.toFixed(2)}</td>
                    <td>{m.f1.toFixed(2)}</td>
                    <td>{m.roc_auc.toFixed(2)}</td>
                    <td>
                      {m.is_best && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-accent text-white">
                          Best
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global SHAP summary (mirrors data from /api/explain/global) */}
        <div className="card p-5">
          <h2 className="section-heading mb-1">Global feature importance (SHAP)</h2>
          <p className="text-xs text-accent mb-4">Mean absolute SHAP value across all policyholders</p>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <div className="space-y-3">
              {[
                { feature: 'Driving experience', value: 1.32 },
                { feature: 'Vehicle ownership',  value: 0.68 },
                { feature: 'Postal code',         value: 0.58 },
                { feature: 'Vehicle year',        value: 0.56 },
                { feature: 'Annual mileage',      value: 0.21 },
              ].map((f) => {
                const pct = f.value / 1.32;
                return (
                  <div key={f.feature} className="flex items-center gap-3 text-sm">
                    <span className="w-36 text-text-primary text-xs font-medium">{f.feature}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-700"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-primary w-10 text-right">
                      {f.value.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confusion matrix */}
        <div className="card p-5">
          <h2 className="section-heading mb-1">
            Confusion matrix ({data?.best_model ?? '…'})
          </h2>
          <p className="text-xs text-accent mb-4">Share of validation policies</p>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <div className="grid grid-cols-3 gap-2 text-sm" role="table" aria-label="Confusion matrix">
              {/* Header row */}
              <div />
              <div className="text-center text-xs font-semibold text-text-secondary py-1">Predicted No</div>
              <div className="text-center text-xs font-semibold text-text-secondary py-1">Predicted Yes</div>
              {/* Actual No row */}
              <div className="text-xs font-semibold text-text-secondary flex items-center justify-end pr-2">Actual No</div>
              <div className="rounded-xl p-4 text-center font-bold text-white text-xl"
                style={{ backgroundColor: '#0B7A6E' }}>
                {tn?.value ?? 0}%
              </div>
              <div className="rounded-xl p-4 text-center font-bold text-text-secondary text-xl bg-green-50">
                {fp?.value ?? 0}%
              </div>
              {/* Actual Yes row */}
              <div className="text-xs font-semibold text-text-secondary flex items-center justify-end pr-2">Actual Yes</div>
              <div className="rounded-xl p-4 text-center font-bold text-text-secondary text-xl bg-green-50">
                {fn?.value ?? 0}%
              </div>
              <div className="rounded-xl p-4 text-center font-bold text-white text-xl"
                style={{ backgroundColor: '#0B7A6E' }}>
                {tp?.value ?? 0}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROC Curve */}
      <div className="card p-5">
        <h2 className="section-heading mb-1">ROC Curve ({data?.best_model ?? '…'})</h2>
        <p className="text-xs text-accent mb-4">True positive rate vs false positive rate on validation set</p>
        {loading ? (
          <div className="skeleton h-48 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data?.roc_curve}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                dataKey="fpr" type="number" domain={[0, 1]}
                tick={{ fontSize: 11, fill: '#6B7280' }} label={{ value: 'FPR', position: 'insideBottom', offset: -3, fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis
                dataKey="tpr" type="number" domain={[0, 1]}
                tick={{ fontSize: 11, fill: '#6B7280' }} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B7280' }}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #E3E8EF', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [(v as number).toFixed(3)]}
              />
              {/* Diagonal chance line */}
              <Line
                data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]}
                type="linear" dataKey="tpr" stroke="#D1D5DB"
                strokeDasharray="5 5" dot={false} strokeWidth={1}
                name="Random chance"
              />
              <Line
                type="monotone" dataKey="tpr" stroke="#0B7A6E"
                strokeWidth={2.5} dot={false} name="Model"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
