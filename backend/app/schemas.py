"""Pydantic v2 schemas for all request/response models."""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


# ─── Request ────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    age: str = Field(..., description="Age band: 16-25 | 26-39 | 40-64 | 65+")
    driving_experience: str = Field(..., description="0-9y | 10-19y | 20-29y | 30y+")
    education: str = Field(..., description="none | high school | university")
    income: str = Field(..., description="poverty | working class | middle class | upper class")
    credit_score: float = Field(..., ge=0.0, le=1.0, description="Normalised credit score 0-1")
    vehicle_ownership: int = Field(..., ge=0, le=1, description="1=owns vehicle, 0=does not")
    vehicle_year: str = Field(..., description="before 2015 | after 2015")
    married: int = Field(..., ge=0, le=1)
    children: int = Field(..., ge=0, le=10)
    postal_code: str = Field(..., description="10238 | 21217 | 32765 | 92101")
    annual_mileage: float = Field(..., ge=0, le=50000)
    vehicle_type: str = Field(..., description="sedan | sports car")
    speeding_violations: int = Field(..., ge=0, le=25)
    duis: int = Field(..., ge=0, le=10)
    past_accidents: int = Field(..., ge=0, le=15)

    @field_validator("age")
    @classmethod
    def check_age(cls, v: str) -> str:
        allowed = ["16-25", "26-39", "40-64", "65+"]
        if v not in allowed:
            raise ValueError(f"age must be one of {allowed}")
        return v

    @field_validator("driving_experience")
    @classmethod
    def check_exp(cls, v: str) -> str:
        allowed = ["0-9y", "10-19y", "20-29y", "30y+"]
        if v not in allowed:
            raise ValueError(f"driving_experience must be one of {allowed}")
        return v


# ─── Response ───────────────────────────────────────────────────────────────

class TopFactor(BaseModel):
    feature: str
    value: str
    shap_value: float
    direction: Literal["increases", "decreases"]


class PredictResponse(BaseModel):
    prediction: Literal["Yes", "No"]
    probability: float
    risk_score: int
    risk_level: Literal["Low", "Medium", "High"]
    model_used: str
    top_factors: list[TopFactor]


class ShapFeature(BaseModel):
    feature: str
    shap_value: float
    value: str


class ShapResponse(BaseModel):
    base_value: float
    shap_values: list[ShapFeature]
    prediction: float


class LimeFeature(BaseModel):
    feature: str
    weight: float
    direction: Literal["increases", "decreases"]


class LimeResponse(BaseModel):
    features: list[LimeFeature]
    prediction: float


class GlobalShapFeature(BaseModel):
    feature: str
    mean_abs_shap: float
    share_pct: float


class GlobalShapResponse(BaseModel):
    features: list[GlobalShapFeature]


# ─── Dashboard ──────────────────────────────────────────────────────────────

class MonthlyClaimPoint(BaseModel):
    month: str
    predicted_claims: int


class RiskDistributionItem(BaseModel):
    level: str
    count: int
    pct: float
    color: str


class HighRiskPolicyholder(BaseModel):
    policy_id: str
    age: str
    vehicle_age: str
    top_driver: str
    risk_score: int
    prediction: str


class DashboardSummary(BaseModel):
    total_policies: int
    predicted_claimants: int
    high_risk_count: int
    best_model_auc: float
    best_model_name: str
    claims_by_month: list[MonthlyClaimPoint]
    risk_distribution: list[RiskDistributionItem]
    highest_risk_policyholders: list[HighRiskPolicyholder]


# ─── Model Performance ──────────────────────────────────────────────────────

class ModelMetric(BaseModel):
    model: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    is_best: bool


class ConfusionMatrixCell(BaseModel):
    actual: str
    predicted: str
    value: float


class RocPoint(BaseModel):
    fpr: float
    tpr: float


class ModelPerformanceResponse(BaseModel):
    models: list[ModelMetric]
    confusion_matrix: list[ConfusionMatrixCell]
    roc_curve: list[RocPoint]
    best_model: str


# ─── EDA ────────────────────────────────────────────────────────────────────

class EDAClaimRateItem(BaseModel):
    feature: str
    value: str
    claim_rate: float
    customers: int


class EDADistributionBin(BaseModel):
    bin: str
    count: int


class EDADistributionResponse(BaseModel):
    feature: str
    bins: list[EDADistributionBin]


class EDACorrelationCell(BaseModel):
    x: str
    y: str
    r: float


class RiskProfileRow(BaseModel):
    policy_id: str
    age: str
    driving_experience: str
    income: str
    risk_score: int
    risk_level: Literal["Low", "Medium", "High"]
    prediction: Literal["Yes", "No"]
    probability: float
    top_factor: str
