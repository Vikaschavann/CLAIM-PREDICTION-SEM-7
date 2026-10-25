"""FastAPI router: /api/eda (exploratory data analysis)"""
from fastapi import APIRouter
from app.schemas import EDAClaimRateItem, EDADistributionResponse, EDADistributionBin, EDACorrelationCell
from app.services.stats_service import get_eda_claim_rates, get_eda_distributions, get_correlation_matrix
from app.config import DATA_PATH

router = APIRouter(prefix="/api/eda", tags=["eda"])

_eda_cache: dict = {}


@router.get("/claim-rates", response_model=list[EDAClaimRateItem])
def eda_claim_rates():
    if "claim_rates" not in _eda_cache:
        _eda_cache["claim_rates"] = [EDAClaimRateItem(**r) for r in get_eda_claim_rates(DATA_PATH)]
    return _eda_cache["claim_rates"]


@router.get("/distributions", response_model=dict)
def eda_distributions():
    if "distributions" not in _eda_cache:
        raw = get_eda_distributions(DATA_PATH)
        _eda_cache["distributions"] = {
            feat: [EDADistributionBin(**b) for b in bins]
            for feat, bins in raw.items()
        }
    return _eda_cache["distributions"]


@router.get("/correlation", response_model=list[EDACorrelationCell])
def eda_correlation():
    if "correlation" not in _eda_cache:
        _eda_cache["correlation"] = [EDACorrelationCell(**c) for c in get_correlation_matrix(DATA_PATH)]
    return _eda_cache["correlation"]
