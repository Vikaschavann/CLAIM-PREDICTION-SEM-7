// API base URL and typed client for InsureSight
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PredictRequest {
  age: string;
  driving_experience: string;
  education: string;
  income: string;
  credit_score: number;
  vehicle_ownership: number;
  vehicle_year: string;
  married: number;
  children: number;
  postal_code: string;
  annual_mileage: number;
  vehicle_type: string;
  speeding_violations: number;
  duis: number;
  past_accidents: number;
}

export interface TopFactor {
  feature: string;
  value: string;
  shap_value: number;
  direction: 'increases' | 'decreases';
}

export interface PredictResponse {
  prediction_id?: string;
  prediction: 'Yes' | 'No';
  probability: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  model_used: string;
  top_factors: TopFactor[];
}

export interface ShapFeature {
  feature: string;
  shap_value: number;
  value: string;
}

export interface ShapResponse {
  base_value: number;
  shap_values: ShapFeature[];
  prediction: number;
}

export interface LimeFeature {
  feature: string;
  weight: number;
  direction: 'increases' | 'decreases';
}

export interface LimeResponse {
  features: LimeFeature[];
  prediction: number;
}

export interface GlobalShapFeature {
  feature: string;
  mean_abs_shap: number;
  share_pct: number;
}

export interface DashboardSummary {
  total_policies: number;
  predicted_claimants: number;
  high_risk_count: number;
  best_model_auc: number;
  best_model_name: string;
  claims_by_month: { month: string; predicted_claims: number }[];
  risk_distribution: { level: string; count: number; pct: number; color: string }[];
  highest_risk_policyholders: {
    policy_id: string;
    age: string;
    vehicle_age: string;
    top_driver: string;
    risk_score: number;
    prediction: string;
  }[];
}

export interface ModelMetric {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  is_best: boolean;
}

export interface ModelPerformanceResponse {
  models: ModelMetric[];
  confusion_matrix: { actual: string; predicted: string; value: number }[];
  roc_curve: { fpr: number; tpr: number }[];
  best_model: string;
}

export interface RiskProfileRow {
  policy_id: string;
  age: string;
  driving_experience: string;
  income: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  prediction: 'Yes' | 'No';
  probability: number;
  top_factor: string;
}

export interface EDAClaimRateItem {
  feature: string;
  value: string;
  claim_rate: number;
  customers: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const predictClaim = (body: PredictRequest, model?: string) =>
  api.post<PredictResponse>(`/api/predict${model ? `?model=${model}` : ''}`, body);

export const explainShap = (body: PredictRequest, model?: string) =>
  api.post<ShapResponse>(`/api/explain/shap${model ? `?model=${model}` : ''}`, body);

export const explainLime = (body: PredictRequest, model?: string) =>
  api.post<LimeResponse>(`/api/explain/lime${model ? `?model=${model}` : ''}`, body);

export const getGlobalShap = () =>
  api.get<{ features: GlobalShapFeature[] }>('/api/explain/global');

export const getDashboardSummary = () =>
  api.get<DashboardSummary>('/api/dashboard/summary');

export const getModelPerformance = () =>
  api.get<ModelPerformanceResponse>('/api/models/performance');

export const getRiskProfiles = (params?: {
  risk_level?: string;
  age?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => api.get<RiskProfileRow[]>('/api/profiles', { params });

export const getEDAClaimRates = () =>
  api.get<EDAClaimRateItem[]>('/api/eda/claim-rates');

export const getEDADistributions = () =>
  api.get<Record<string, { bin: string; count: number }[]>>('/api/eda/distributions');

export const getCorrelation = () =>
  api.get<{ x: string; y: string; r: number }[]>('/api/eda/correlation');

export interface HistoryItem {
  id: string;
  created_at: string;
  input_data: PredictRequest;
  model_used: string;
  prediction: 'Yes' | 'No';
  probability: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  top_factors: TopFactor[];
}

export interface HistoryStats {
  total: number;
  by_risk_level: Record<string, number>;
  by_model: Record<string, number>;
}

export const getPredictionHistory = (params?: {
  limit?: number;
  offset?: number;
  risk_level?: string;
  model?: string;
}) => api.get<HistoryItem[]>('/api/history', { params });

export const getPredictionStats = () =>
  api.get<HistoryStats>('/api/history/stats');

export const submitFeedback = (prediction_id: string, is_correct: boolean, comment?: string) =>
  api.post<{ id: string; message: string }>('/api/history/feedback', {
    prediction_id,
    is_correct,
    comment,
  });
