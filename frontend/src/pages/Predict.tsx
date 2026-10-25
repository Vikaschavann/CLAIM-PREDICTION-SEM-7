// Predict Claim page – form + risk gauge + SHAP/LIME explanation
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  predictClaim, explainShap, explainLime, submitFeedback,
  type PredictRequest, type PredictResponse,
  type ShapResponse, type LimeResponse,
} from '../api/client';
import RiskGauge from '../components/RiskGauge';
import ShapBars from '../components/ShapBars';
import RiskBadge from '../components/RiskBadge';
import ToastContainer, { useToasts } from '../components/Toast';

const AGE_OPTIONS       = ['16-25', '26-39', '40-64', '65+'];
const EXP_OPTIONS       = ['0-9y', '10-19y', '20-29y', '30y+'];
const EDU_OPTIONS       = ['none', 'high school', 'university'];
const INC_OPTIONS       = ['poverty', 'working class', 'middle class', 'upper class'];
const VY_OPTIONS        = ['before 2015', 'after 2015'];
const VT_OPTIONS        = ['sedan', 'sports car'];
const PC_OPTIONS        = ['10238', '21217', '32765', '92101'];
const MODEL_OPTIONS     = [
  { value: '', label: 'Auto (Best)' },
  { value: 'catboost', label: 'CatBoost' },
  { value: 'xgboost', label: 'XGBoost' },
  { value: 'lightgbm', label: 'LightGBM' },
  { value: 'neural_network', label: 'Neural Network' },
];

const DEFAULT: PredictRequest = {
  age: '26-39',
  driving_experience: '10-19y',
  education: 'university',
  income: 'middle class',
  credit_score: 0.65,
  vehicle_ownership: 1,
  vehicle_year: 'after 2015',
  married: 1,
  children: 0,
  postal_code: '10238',
  annual_mileage: 12000,
  vehicle_type: 'sedan',
  speeding_violations: 0,
  duis: 0,
  past_accidents: 0,
};

type ExplainTab = 'shap' | 'lime';

export default function Predict() {
  const [form, setForm] = useState<PredictRequest>(DEFAULT);
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [shapData, setShapData] = useState<ShapResponse | null>(null);
  const [limeData, setLimeData] = useState<LimeResponse | null>(null);
  const [tab, setTab] = useState<ExplainTab>('shap');
  const [feedbackStatus, setFeedbackStatus] = useState<boolean | null>(null);
  const { toasts, addToast, dismiss } = useToasts();

  const set = (k: keyof PredictRequest, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    setShapData(null);
    setLimeData(null);
    setFeedbackStatus(null);
    try {
      const [predRes] = await Promise.all([
        predictClaim(form, model || undefined),
      ]);
      setResult(predRes.data);
      // Load SHAP in background
      setExplainLoading(true);
      explainShap(form, model || undefined)
        .then((r) => setShapData(r.data))
        .catch(() => addToast('SHAP explanation unavailable', 'info'))
        .finally(() => setExplainLoading(false));
    } catch {
      addToast('Prediction failed. Make sure the backend is running on port 8000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLimeTab = async () => {
    setTab('lime');
    if (limeData || !result) return;
    setExplainLoading(true);
    try {
      const r = await explainLime(form, model || undefined);
      setLimeData(r.data);
    } catch {
      addToast('LIME explanation unavailable', 'info');
    } finally {
      setExplainLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT);
    setResult(null);
    setShapData(null);
    setLimeData(null);
    setModel('');
  };

  const predColor = result?.prediction === 'Yes' ? 'text-high-risk' : 'text-accent';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Predict Claim</h1>
        <p className="page-subtitle">Enter policyholder details to estimate claim likelihood and see why</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Form ─────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="section-heading mb-5">Policyholder details</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Age */}
            <div>
              <label className="form-label" htmlFor="age">Age</label>
              <select id="age" className="form-select" value={form.age} onChange={e => set('age', e.target.value)}>
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Gender / Driving Experience */}
            <div>
              <label className="form-label" htmlFor="driving_experience">Driving experience (years)</label>
              <select id="driving_experience" className="form-select" value={form.driving_experience} onChange={e => set('driving_experience', e.target.value)}>
                {EXP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Vehicle year */}
            <div>
              <label className="form-label" htmlFor="vehicle_year">Vehicle year</label>
              <select id="vehicle_year" className="form-select" value={form.vehicle_year} onChange={e => set('vehicle_year', e.target.value)}>
                {VY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Annual mileage */}
            <div>
              <label className="form-label" htmlFor="annual_mileage">Annual mileage (km)</label>
              <input id="annual_mileage" type="number" className="form-input" min={0} max={50000}
                value={form.annual_mileage} onChange={e => set('annual_mileage', Number(e.target.value))} />
            </div>
            {/* Income */}
            <div>
              <label className="form-label" htmlFor="income">Income level</label>
              <select id="income" className="form-select" value={form.income} onChange={e => set('income', e.target.value)}>
                {INC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Credit score */}
            <div>
              <label className="form-label" htmlFor="credit_score">Credit score (0–1)</label>
              <input id="credit_score" type="number" className="form-input" min={0} max={1} step={0.01}
                value={form.credit_score} onChange={e => set('credit_score', Number(e.target.value))} />
            </div>
            {/* Vehicle ownership */}
            <div>
              <label className="form-label" htmlFor="vehicle_ownership">Vehicle ownership</label>
              <select id="vehicle_ownership" className="form-select" value={form.vehicle_ownership} onChange={e => set('vehicle_ownership', Number(e.target.value))}>
                <option value={1}>Owns vehicle</option>
                <option value={0}>Does not own</option>
              </select>
            </div>
            {/* Vehicle type */}
            <div>
              <label className="form-label" htmlFor="vehicle_type">Vehicle type</label>
              <select id="vehicle_type" className="form-select" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                {VT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Region */}
            <div>
              <label className="form-label" htmlFor="postal_code">Region (postal code)</label>
              <select id="postal_code" className="form-select" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}>
                {PC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Education */}
            <div>
              <label className="form-label" htmlFor="education">Education</label>
              <select id="education" className="form-select" value={form.education} onChange={e => set('education', e.target.value)}>
                {EDU_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Married */}
            <div>
              <label className="form-label" htmlFor="married">Married</label>
              <select id="married" className="form-select" value={form.married} onChange={e => set('married', Number(e.target.value))}>
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
            {/* Children */}
            <div>
              <label className="form-label" htmlFor="children">Children</label>
              <input id="children" type="number" className="form-input" min={0} max={10}
                value={form.children} onChange={e => set('children', Number(e.target.value))} />
            </div>
            {/* Speeding violations */}
            <div>
              <label className="form-label" htmlFor="speeding_violations">Speeding violations</label>
              <input id="speeding_violations" type="number" className="form-input" min={0} max={25}
                value={form.speeding_violations} onChange={e => set('speeding_violations', Number(e.target.value))} />
            </div>
            {/* DUIs */}
            <div>
              <label className="form-label" htmlFor="duis">DUIs</label>
              <input id="duis" type="number" className="form-input" min={0} max={10}
                value={form.duis} onChange={e => set('duis', Number(e.target.value))} />
            </div>
            {/* Past accidents */}
            <div className="col-span-2">
              <label className="form-label" htmlFor="past_accidents">Past accidents</label>
              <input id="past_accidents" type="number" className="form-input" min={0} max={15}
                value={form.past_accidents} onChange={e => set('past_accidents', Number(e.target.value))} />
            </div>
          </div>

          {/* Model selector + Buttons */}
          <div className="mt-5 pt-4 border-t border-card-border space-y-3">
            <div>
              <label className="form-label" htmlFor="model-select">Model</label>
              <select id="model-select" className="form-select" value={model} onChange={e => setModel(e.target.value)}>
                {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handlePredict}
                disabled={loading}
                id="predict-btn"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {loading ? 'Predicting…' : 'Predict Claim'}
              </button>
              <button className="btn-secondary" onClick={handleReset} id="reset-btn">Reset</button>
            </div>
            {result && (
              <p className="text-xs text-text-muted">
                Model: {result.model_used} (best validation AUC)
              </p>
            )}
          </div>
        </div>

        {/* ── Results ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Gauge + prediction label */}
          {result ? (
            <div className="card p-6 fade-in-up">
              <div className="flex items-center gap-6">
                <RiskGauge score={result.risk_score} level={result.risk_level} size={140} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Prediction</p>
                  <p className={`text-2xl font-bold ${predColor}`}>
                    {result.prediction === 'Yes' ? 'Claim likely: Yes' : 'No claim expected'}
                  </p>
                  <div className="mt-2">
                    <RiskBadge level={result.risk_level} />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Claim probability {(result.probability * 100).toFixed(0)}%. Portfolio average is ~26%.
                  </p>

                  {/* SQLite Persisted Banner & Feedback */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[11px] inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Saved to DB
                    </span>

                    <div className="flex items-center gap-2">
                      {feedbackStatus === null ? (
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>Accurate?</span>
                          <button
                            onClick={async () => {
                              if (result.prediction_id) {
                                await submitFeedback(result.prediction_id, true);
                                setFeedbackStatus(true);
                                addToast('Marked prediction as accurate', 'success');
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-xs"
                            title="Yes"
                          >
                            👍
                          </button>
                          <button
                            onClick={async () => {
                              if (result.prediction_id) {
                                await submitFeedback(result.prediction_id, false);
                                setFeedbackStatus(false);
                                addToast('Feedback recorded for model review', 'success');
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-xs"
                            title="No"
                          >
                            👎
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">✓ Feedback recorded</span>
                      )}
                      <Link to="/history" className="text-accent hover:underline text-xs ml-1">
                        View Log →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="card p-6 flex items-center justify-center h-36">
                <p className="text-text-muted text-sm">Fill the form and click Predict Claim to see results.</p>
              </div>
            )
          )}

          {/* Explanation card */}
          {result && (
            <div className="card p-6 fade-in-up">
              {/* Tab switcher */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="section-heading">
                    Why this prediction ({tab === 'shap' ? 'SHAP' : 'LIME'})
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Red pushes risk up, blue pushes it down
                  </p>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1" role="tablist">
                  <button
                    role="tab"
                    aria-selected={tab === 'shap'}
                    className={`tab-btn ${tab === 'shap' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                    onClick={() => setTab('shap')}
                    id="shap-tab"
                  >
                    SHAP
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === 'lime'}
                    className={`tab-btn ${tab === 'lime' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                    onClick={handleLimeTab}
                    id="lime-tab"
                  >
                    LIME
                  </button>
                </div>
              </div>

              {/* SHAP view */}
              {tab === 'shap' && (
                <ShapBars
                  factors={shapData?.shap_values.slice(0, 5).map(f => ({
                    feature: f.feature,
                    value: f.value,
                    shap_value: f.shap_value,
                    direction: f.shap_value >= 0 ? 'increases' : 'decreases',
                  })) ?? result.top_factors}
                  loading={explainLoading}
                />
              )}

              {/* LIME view */}
              {tab === 'lime' && (
                explainLoading ? (
                  <ShapBars factors={[]} loading />
                ) : limeData ? (
                  <ShapBars
                    factors={limeData.features.slice(0, 5).map(f => ({
                      feature: f.feature,
                      value: '',
                      shap_value: f.weight,
                      direction: f.direction,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-text-muted">Click LIME tab again to load explanation.</p>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
