"""FastAPI router: /api/dashboard"""
from fastapi import APIRouter
from app.schemas import DashboardSummary, MonthlyClaimPoint, RiskDistributionItem, HighRiskPolicyholder
from app.services.model_service import get_registry
from app.services.stats_service import get_dashboard_summary
from app.config import DATA_PATH

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_summary_cache: dict = {}


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary():
    if "data" not in _summary_cache:
        registry = get_registry()
        data = get_dashboard_summary(DATA_PATH, registry)
        _summary_cache["data"] = data
    d = _summary_cache["data"]
    return DashboardSummary(
        total_policies=d["total_policies"],
        predicted_claimants=d["predicted_claimants"],
        high_risk_count=d["high_risk_count"],
        best_model_auc=d["best_model_auc"],
        best_model_name=d["best_model_name"],
        claims_by_month=[MonthlyClaimPoint(**m) for m in d["claims_by_month"]],
        risk_distribution=[RiskDistributionItem(**r) for r in d["risk_distribution"]],
        highest_risk_policyholders=[HighRiskPolicyholder(**p) for p in d["highest_risk_policyholders"]],
    )
