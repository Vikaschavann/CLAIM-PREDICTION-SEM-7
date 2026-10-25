"""FastAPI router: /api/profiles (risk profiles table)"""
from fastapi import APIRouter, Query
from app.schemas import RiskProfileRow
from app.services.model_service import get_registry
from app.services.stats_service import get_risk_profiles
from app.config import DATA_PATH
from typing import Literal, Optional

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

_profiles_cache: dict = {}


@router.get("", response_model=list[RiskProfileRow])
def list_profiles(
    risk_level: Optional[str] = Query(default=None, description="Low | Medium | High"),
    age: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    if "data" not in _profiles_cache:
        registry = get_registry()
        _profiles_cache["data"] = get_risk_profiles(DATA_PATH, registry)
    profiles = _profiles_cache["data"]

    # Filter
    if risk_level:
        profiles = [p for p in profiles if p["risk_level"] == risk_level]
    if age:
        profiles = [p for p in profiles if p["age"] == age]
    if search:
        q = search.lower()
        profiles = [p for p in profiles
                    if q in p["policy_id"].lower() or q in p["age"].lower()
                    or q in p["income"].lower() or q in p["driving_experience"].lower()]

    # Sort by risk_score desc
    profiles = sorted(profiles, key=lambda p: -p["risk_score"])

    return [RiskProfileRow(**p) for p in profiles[offset: offset + limit]]
